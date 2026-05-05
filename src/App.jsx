import { useState, useEffect, useRef, useCallback } from "react";
import curryRecord from "./data/curry-record";

// ============================================================
// GAME LIBRARY
// Add new games by importing their data package and adding here
// ============================================================
const GAMES = {
  "curry-record": { ...curryRecord, ready: true },
  "lebron-cavaliers": {
    id: "lebron-cavaliers", ytId: "wgVOgGLtPtc", ready: false,
    title: "LeBron's Game 7 — Cleveland's Promise Fulfilled",
    subtitle: "Cavaliers @ Warriors · Jun 19, 2016",
    hook: "Down 3-1. The Block. The Shot. Cleveland's 52-year drought ends.",
    thumb: "👑",
  },
  "kobe-60": {
    id: "kobe-60", ytId: "GTJwoWHMFjs", ready: false,
    title: "Kobe's 60-Point Finale",
    subtitle: "Jazz @ Lakers · Apr 13, 2016",
    hook: "Kobe's last game. 60 points. The ultimate farewell.",
    thumb: "🐍",
  },
  "dame-buzzer": {
    id: "dame-buzzer", ytId: "a-M3x-eZOl8", ready: false,
    title: "Dame Waves Goodbye to OKC",
    subtitle: "Thunder @ Trail Blazers · Apr 23, 2019",
    hook: "37-foot buzzer-beater to win the series. The iconic wave.",
    thumb: "⌚",
  },
};

// ============================================================
// SYNC HELPERS
// ============================================================
function findPlayByTimestamp(timestamps, sec) {
  if (!timestamps || timestamps.length === 0) return -1;
  let best = timestamps[0].playIdx;
  for (const e of timestamps) {
    if (e.sec <= sec) best = e.playIdx;
    else break;
  }
  return best;
}

function findPlayByProportion(totalPlays, currentTime, duration) {
  if (!duration || duration <= 0 || totalPlays <= 0) return 0;
  const ratio = Math.min(currentTime / duration, 1);
  return Math.min(Math.floor(ratio * totalPlays), totalPlays - 1);
}

function findPlayByScore(plays, a, h, q) {
  let best = 0, bd = Infinity;
  for (let i = 0; i < plays.length; i++) {
    const p = plays[i];
    if (p.q === q) {
      const d = Math.abs(p.away - a) + Math.abs(p.home - h);
      if (d < bd) { bd = d; best = i; }
    }
  }
  return best;
}

function buildSystemPrompt(game, cur, idx) {
  const gs = idx >= 0 && cur
    ? `\nGame state: Q${cur.q} ${cur.time}, ${game.away.abbr} ${cur.away} - ${game.home.abbr} ${cur.home}. Last play: ${cur.desc}`
    : "\nGame hasn't started yet.";
  const roster = game.players
    ? Object.values(game.players).map(p => `${p.name} (${p.team} #${p.number}, ${p.position})`).join(", ")
    : "";
  return `You are the Tentpole Fan Companion AI for ${game.away.abbr} vs ${game.home.abbr}, ${game.date} at ${game.venue}. "${game.title}".

Your job: make basketball fun and accessible for casual fans. Use everyday analogies. Keep answers to 2-3 sentences unless asked for more. Be warm, enthusiastic, never condescending.

Players: ${roster}.${gs}`;
}

// ============================================================
// COLORS
// ============================================================
const C = {
  blue: "#0052CC", blueD: "#003D99", blueL: "#F0F6FF", blueB: "#B5D4F4",
  red: "#E5383B", redL: "#FFF1F2",
  gold: "#FF9F1C", goldL: "#FFF7ED", goldT: "#92400E",
  tx: "#111827", tx2: "#4B5563", txM: "#9CA3AF",
  bg: "#FFF", bg2: "#F3F4F6", bdr: "#E5E7EB",
};

// ============================================================
// APP
// ============================================================
export default function App() {
  // Navigation
  const [screen, setScreen] = useState("login");
  const [user, setUser] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [loginEmail, setLoginEmail] = useState("");

  // Companion state
  const [tab, setTab] = useState("catchup");
  const [idx, setIdx] = useState(-1);
  const [translation, setTranslation] = useState(null);
  const [milestone, setMilestone] = useState(null);
  const [milestoneHistory, setMilestoneHistory] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // Sync
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncA, setSyncA] = useState("");
  const [syncH, setSyncH] = useState("");
  const [syncQ, setSyncQ] = useState(1);
  const [ytReady, setYtReady] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);

  // Chat
  const [chatMsgs, setChatMsgs] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Refs
  const chatRef = useRef(null);
  const ytPlayer = useRef(null);
  const ytDiv = useRef(null);
  const syncInterval = useRef(null);

  // Derived
  const game = gameId ? GAMES[gameId] : null;
  const plays = game?.plays || [];
  const currentPlay = idx >= 0 && idx < plays.length ? plays[idx] : null;
  const awayScore = currentPlay ? currentPlay.away : 0;
  const homeScore = currentPlay ? currentPlay.home : 0;
  const recentPlays = idx >= 0 ? plays.slice(0, idx + 1) : [];

  // Track previous scores for flash animation
  const prevScores = useRef({ away: 0, home: 0 });
  const [scoreFlash, setScoreFlash] = useState({ away: false, home: false });

  // ---- Game selection ----
  const selectGame = (id) => {
    const g = GAMES[id];
    if (!g || g.ready === false) return;
    setGameId(id);
    setIdx(-1);
    setTab("catchup");
    setMilestone(null);
    setMilestoneHistory([]);
    setTranslation(null);
    setSelectedPlayer(null);
    setVideoPlaying(false);
    setChatMsgs([{
      role: "assistant",
      content: `Welcome to "${g.title}"! I'm your companion for this game. Ask me anything — what a play means, who a player is, or why a moment matters.`,
    }]);
    setYtReady(false);
    ytPlayer.current = null;
    setScreen("companion");
  };

  // ---- YouTube IFrame API ----
  useEffect(() => {
    if (screen !== "companion" || !game) return;
    if (window.YT && window.YT.Player) { initYT(); return; }
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.onerror = () => setYtReady(false);
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = initYT;
    return () => { window.onYouTubeIframeAPIReady = null; };
  }, [screen, gameId]);

  function initYT() {
    if (!ytDiv.current || ytPlayer.current || !game) return;
    try {
      ytPlayer.current = new window.YT.Player(ytDiv.current, {
        videoId: game.ytId,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onReady: () => setYtReady(true),
          onStateChange: (e) => {
            // PLAYING=1, PAUSED=2, ENDED=0, BUFFERING=3
            if (e.data === 1) {
              setVideoPlaying(true);
              startSync();
            } else if (e.data === 2 || e.data === 0) {
              setVideoPlaying(false);
              stopSync();
            }
          },
        },
      });
    } catch {
      setYtReady(false);
    }
  }

  function startSync() {
    stopSync();
    syncInterval.current = setInterval(() => {
      if (!ytPlayer.current?.getCurrentTime) return;
      const sec = ytPlayer.current.getCurrentTime();
      const hasTimestamps = game?.timestamps?.length > 0;

      let newIdx;
      if (hasTimestamps) {
        // Precise: use mapped timestamps
        newIdx = findPlayByTimestamp(game.timestamps, sec);
      } else {
        // Proportional fallback: distribute plays across video duration
        const dur = ytPlayer.current.getDuration ? ytPlayer.current.getDuration() : 0;
        newIdx = findPlayByProportion(plays.length, sec, dur);
      }

      if (newIdx >= 0 && newIdx !== idx) {
        setIdx(newIdx);
      }
    }, 1000);
  }

  function stopSync() {
    if (syncInterval.current) {
      clearInterval(syncInterval.current);
      syncInterval.current = null;
    }
  }

  useEffect(() => () => stopSync(), []);

  // Auto-switch to Live Feed when plays start
  useEffect(() => {
    if (idx >= 0 && tab === "catchup") setTab("live");
  }, [idx]);

  // Milestone detection
  useEffect(() => {
    if (idx >= 0 && plays[idx]?.milestone) {
      const m = plays[idx].milestone;
      setMilestone(m);
      setMilestoneHistory(prev => {
        if (prev.some(h => h.play === plays[idx])) return prev;
        return [...prev, { play: plays[idx], milestone: m }];
      });
    }
  }, [idx]);

  // Score flash animation
  useEffect(() => {
    if (idx >= 0 && currentPlay) {
      if (currentPlay.away !== prevScores.current.away) {
        setScoreFlash(prev => ({ ...prev, away: true }));
        setTimeout(() => setScoreFlash(prev => ({ ...prev, away: false })), 600);
      }
      if (currentPlay.home !== prevScores.current.home) {
        setScoreFlash(prev => ({ ...prev, home: true }));
        setTimeout(() => setScoreFlash(prev => ({ ...prev, home: false })), 600);
      }
      prevScores.current = { away: currentPlay.away, home: currentPlay.home };
    }
  }, [idx, currentPlay]);

  // Chat auto-scroll
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatMsgs]);

  // ---- Actions ----
  const doScoreSync = () => {
    const newIdx = findPlayByScore(plays, parseInt(syncA) || 0, parseInt(syncH) || 0, syncQ);
    setIdx(newIdx);
    setSyncOpen(false);
    setSyncA("");
    setSyncH("");
    setTab("live");
  };

  const handleTranslate = (term) => {
    const explanation = game?.jargon?.[term] || "A basketball term — ask the AI chat for a full explanation!";
    setTranslation({ term, explanation });
  };

  const handleBack = () => {
    stopSync();
    ytPlayer.current = null;
    setScreen("select");
    setGameId(null);
  };

  // ---- Ask AI ----
  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading || !game) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    const newMsgs = [...chatMsgs, { role: "user", content: userMsg }];
    setChatMsgs(newMsgs);
    setChatLoading(true);

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: buildSystemPrompt(game, currentPlay, idx),
          messages: newMsgs.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await resp.json();
      const reply = data.content?.[0]?.text || data.error || "Sorry, couldn't process that.";
      setChatMsgs(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setChatMsgs(prev => [...prev, { role: "assistant", content: "Connection issue — check that ANTHROPIC_API_KEY is set in your Vercel environment variables." }]);
    }
    setChatLoading(false);
  };

  // ============================================================
  // LOGIN SCREEN
  // ============================================================
  if (screen === "login") return (
    <div style={{ fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif", background: C.bg, minHeight: "100vh", maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column" }}>
      <div style={{ background: `linear-gradient(135deg,${C.blue},${C.blueD})`, padding: "48px 24px 40px", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🏀</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: "0 0 6px" }}>Fan Companion</h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,.6)", margin: 0 }}>Your AI-powered second screen for NBA games</p>
      </div>
      <div style={{ padding: "32px 24px", flex: 1 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: C.tx, margin: "0 0 4px" }}>Sign in with NBA ID</h2>
        <p style={{ fontSize: 13, color: C.tx2, margin: "0 0 20px", lineHeight: 1.5 }}>Your NBA ID connects your viewing experience across classic games and live broadcasts.</p>
        <label style={{ fontSize: 12, fontWeight: 600, color: C.tx2, display: "block", marginBottom: 6 }}>Email address</label>
        <input style={{ width: "100%", padding: "12px 14px", border: `1.5px solid ${C.bdr}`, borderRadius: 10, fontSize: 15, outline: "none", background: C.bg2, boxSizing: "border-box", marginBottom: 12 }}
          type="email" placeholder="you@example.com" value={loginEmail}
          onChange={e => setLoginEmail(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && loginEmail.trim()) { setUser({ email: loginEmail.trim(), name: loginEmail.split("@")[0] }); setScreen("select"); } }}
        />
        <label style={{ fontSize: 12, fontWeight: 600, color: C.tx2, display: "block", marginBottom: 6 }}>Password</label>
        <input style={{ width: "100%", padding: "12px 14px", border: `1.5px solid ${C.bdr}`, borderRadius: 10, fontSize: 15, outline: "none", background: C.bg2, boxSizing: "border-box", marginBottom: 20 }}
          type="password" placeholder="••••••••" defaultValue="demo123"
        />
        <button style={{ width: "100%", background: C.blue, color: "#fff", border: "none", borderRadius: 10, padding: "14px 0", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: loginEmail.trim() ? 1 : .5 }}
          onClick={() => { if (loginEmail.trim()) { setUser({ email: loginEmail.trim(), name: loginEmail.split("@")[0] }); setScreen("select"); } }}
        >Sign In</button>
        <p style={{ fontSize: 11, color: C.txM, textAlign: "center", marginTop: 16, lineHeight: 1.5 }}>By signing in you agree to the NBA's Terms of Service.<br />This is a hackathon demo — no real credentials stored.</p>
      </div>
    </div>
  );

  // ============================================================
  // GAME SELECTOR
  // ============================================================
  if (screen === "select") return (
    <div style={{ fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif", background: C.bg, minHeight: "100vh", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ background: `linear-gradient(135deg,${C.blue},${C.blueD})`, padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: C.gold }}>TENTPOLE FAN COMPANION</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.7)" }}>Hi, {user?.name}</span>
        </div>
      </div>
      <div style={{ padding: "20px 16px" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: C.tx, margin: "0 0 4px" }}>Classic Games</h2>
        <p style={{ fontSize: 14, color: C.tx2, margin: "0 0 20px", lineHeight: 1.5 }}>Pick a legendary moment. We'll sync the video with your AI companion in real time.</p>
        {Object.values(GAMES).map(g => (
          <button key={g.id} onClick={() => selectGame(g.id)} style={{
            width: "100%", textAlign: "left", background: C.bg,
            border: `1.5px solid ${g.ready === false ? C.bdr : C.blueB}`,
            borderRadius: 14, padding: 16, marginBottom: 10,
            cursor: g.ready === false ? "default" : "pointer",
            opacity: g.ready === false ? .55 : 1,
            display: "flex", gap: 14, alignItems: "flex-start",
          }}>
            <div style={{ fontSize: 32, lineHeight: 1 }}>{g.thumb}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.tx, marginBottom: 2 }}>{g.title}</div>
              <div style={{ fontSize: 12, color: C.txM, marginBottom: 4 }}>{g.subtitle}</div>
              <div style={{ fontSize: 13, color: C.tx2, lineHeight: 1.4 }}>{g.hook}</div>
              {g.ready === false && <div style={{ fontSize: 11, fontWeight: 600, color: C.txM, marginTop: 6, fontStyle: "italic" }}>Coming soon — data being curated</div>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // ============================================================
  // COMPANION SCREEN
  // ============================================================
  if (!game) return null;
  const hasTs = game.timestamps?.length > 0;

  return (
    <div style={{ fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif", background: C.bg, color: C.tx, minHeight: "100vh", maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column" }}>

      {/* HEADER */}
      <div style={{ background: `linear-gradient(135deg,${C.blue},${C.blueD})` }}>
        <div style={{ padding: "12px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <button onClick={handleBack} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,.7)", fontSize: 13, cursor: "pointer", padding: 0 }}>← Games</button>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: C.gold }}>FAN COMPANION</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>{user?.name}</span>
          </div>
          <div style={{ background: C.bg, borderRadius: 14, padding: "12px 20px", display: "flex", justifyContent: "center", alignItems: "center", gap: 24, boxShadow: "0 2px 12px rgba(0,0,0,.08)" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.blue }}>{game.away.abbr}</div>
              <div style={{ fontSize: 10, color: C.txM, marginTop: 2 }}>{game.away.record}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  fontSize: 34,
                  fontWeight: 800,
                  fontVariantNumeric: "tabular-nums",
                  transition: "background-color 0.6s, transform 0.3s",
                  background: scoreFlash.away ? C.goldL : "transparent",
                  padding: "0 8px",
                  borderRadius: 8,
                  transform: scoreFlash.away ? "scale(1.1)" : "scale(1)"
                }}>{awayScore}</span>
                <span style={{ fontSize: 20, color: C.txM }}>—</span>
                <span style={{
                  fontSize: 34,
                  fontWeight: 800,
                  fontVariantNumeric: "tabular-nums",
                  transition: "background-color 0.6s, transform 0.3s",
                  background: scoreFlash.home ? C.goldL : "transparent",
                  padding: "0 8px",
                  borderRadius: 8,
                  transform: scoreFlash.home ? "scale(1.1)" : "scale(1)"
                }}>{homeScore}</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.txM, letterSpacing: 1, marginTop: 3 }}>
                {idx === -1 ? "PRE-GAME" : idx >= plays.length - 1 ? "FINAL" : `Q${currentPlay.q} · ${currentPlay.time}`}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.red }}>{game.home.abbr}</div>
              <div style={{ fontSize: 10, color: C.txM, marginTop: 2 }}>{game.home.record}</div>
            </div>
          </div>
        </div>
      </div>

      {/* VIDEO */}
      <div style={{ padding: "0 16px 12px", borderBottom: `1px solid ${C.bdr}` }}>
        <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 10, overflow: "hidden", background: "#000", marginTop: 12 }}>
          {!ytReady && <iframe src={`https://www.youtube.com/embed/${game.ytId}?rel=0&modestbranding=1`} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }} allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowFullScreen title="Game" />}
          <div ref={ytDiv} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />
          {/* Embed restriction fallback */}
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.85)", padding: 24, textAlign: "center", pointerEvents: "none" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏀</div>
            <p style={{ fontSize: 14, color: "#fff", marginBottom: 8, fontWeight: 600 }}>Video Embed Restricted</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 16, lineHeight: 1.5 }}>This video can't be embedded due to YouTube restrictions. Watch it on YouTube and use manual sync below.</p>
            <a href={`https://www.youtube.com/watch?v=${game.ytId}`} target="_blank" rel="noopener noreferrer" style={{ background: C.red, color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, textDecoration: "none", pointerEvents: "auto" }}>
              Watch on YouTube ↗
            </a>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 }}>
          {videoPlaying
            ? <div style={{ fontSize: 12, fontWeight: 600, color: "#16a34a", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e50" }} />
                {hasTs ? "Auto-syncing with video" : "Syncing with video"}
              </div>
            : <>
                <p style={{ fontSize: 11, color: C.txM, textAlign: "center", margin: 0 }}>Video restricted? Use manual sync →</p>
                <button style={{ background: C.blue, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }} onClick={() => setSyncOpen(true)}>Manual Sync</button>
              </>
          }
        </div>
      </div>

      {/* SYNC MODAL */}
      {syncOpen && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ background: C.bg, borderRadius: 16, padding: 24, maxWidth: 340, width: "100%", boxShadow: "0 16px 48px rgba(0,0,0,.15)" }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px" }}>Sync to your screen</h3>
          <p style={{ fontSize: 13, color: C.tx2, lineHeight: 1.5, margin: "0 0 18px" }}>Enter the score and quarter you see on screen.</p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, textAlign: "center" }}>
              <label style={{ fontSize: 13, fontWeight: 800, display: "block", marginBottom: 6 }}>{game.away.abbr}</label>
              <input style={{ width: "100%", fontSize: 28, fontWeight: 800, textAlign: "center", padding: "8px 0", border: `2px solid ${C.bdr}`, borderRadius: 10, background: C.bg2, fontVariantNumeric: "tabular-nums", boxSizing: "border-box", outline: "none" }}
                type="number" inputMode="numeric" placeholder="0" value={syncA} onChange={e => setSyncA(e.target.value)} />
            </div>
            <span style={{ fontSize: 24, color: C.txM }}>—</span>
            <div style={{ flex: 1, textAlign: "center" }}>
              <label style={{ fontSize: 13, fontWeight: 800, display: "block", marginBottom: 6 }}>{game.home.abbr}</label>
              <input style={{ width: "100%", fontSize: 28, fontWeight: 800, textAlign: "center", padding: "8px 0", border: `2px solid ${C.bdr}`, borderRadius: 10, background: C.bg2, fontVariantNumeric: "tabular-nums", boxSizing: "border-box", outline: "none" }}
                type="number" inputMode="numeric" placeholder="0" value={syncH} onChange={e => setSyncH(e.target.value)} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
            {[1, 2, 3, 4].map(q => <button key={q} style={{ flex: 1, padding: "8px 0", fontSize: 13, fontWeight: syncQ === q ? 700 : 600, cursor: "pointer", background: syncQ === q ? C.blueL : C.bg2, color: syncQ === q ? C.blue : C.tx2, border: `1.5px solid ${syncQ === q ? C.blue : C.bdr}`, borderRadius: 8 }} onClick={() => setSyncQ(q)}>Q{q}</button>)}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button style={{ background: C.bg, color: C.tx, border: `1.5px solid ${C.bdr}`, borderRadius: 10, padding: "10px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" }} onClick={() => setSyncOpen(false)}>Cancel</button>
            <button style={{ background: C.blue, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" }} onClick={doScoreSync}>Jump to play</button>
          </div>
        </div>
      </div>}

      {/* TABS */}
      <div style={{ display: "flex", borderBottom: `1px solid ${C.bdr}` }}>
        {[["catchup", "Catch-Up"], ["live", "Live Feed"], ["legacy", "Legacy Lens"], ["chat", "Ask AI"]].map(([id, label]) =>
          <button key={id} style={{ flex: 1, background: "transparent", color: tab === id ? C.blue : C.txM, border: "none", borderBottom: tab === id ? `2px solid ${C.blue}` : "2px solid transparent", padding: "11px 0", fontSize: 12, fontWeight: tab === id ? 700 : 500, cursor: "pointer" }} onClick={() => setTab(id)}>{label}</button>
        )}
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

        {/* CATCH-UP */}
        {tab === "catchup" && <div style={{ padding: 16, overflow: "auto", flex: 1 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 10px", lineHeight: 1.3 }}>{game.title}</h2>
          <p style={{ fontSize: 14, lineHeight: 1.65, color: C.tx2, margin: "0 0 6px" }}>{game.catchup.storyline}</p>
          <div style={{ height: 1, background: C.bdr, margin: "16px 0" }} />
          <h3 style={{ fontSize: 15, fontWeight: 700, color: C.tx2, margin: "0 0 8px" }}>The backstory</h3>
          <p style={{ fontSize: 14, lineHeight: 1.65, color: C.tx2, margin: "0 0 6px" }}>{game.catchup.rivalry}</p>
          <div style={{ height: 1, background: C.bdr, margin: "16px 0" }} />
          <h3 style={{ fontSize: 15, fontWeight: 700, color: C.tx2, margin: "0 0 8px" }}>What to watch for</h3>
          {game.catchup.watchFor.map((w, i) => <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10 }}><span style={{ color: C.blue, fontWeight: 700 }}>→</span><span style={{ fontSize: 13, lineHeight: 1.5, color: C.tx2 }}>{w}</span></div>)}
          <p style={{ fontSize: 13, color: C.txM, marginTop: 20, textAlign: "center" }}>Press play on the video above to start the companion.</p>
        </div>}

        {/* LIVE FEED */}
        {tab === "live" && <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
          {/* Milestone overlay */}
          {milestone && <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,.92)", zIndex: 20, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div style={{ background: C.bg, border: `2px solid ${C.gold}`, borderTop: `4px solid ${C.gold}`, borderRadius: 18, padding: 28, textAlign: "center", maxWidth: 340, boxShadow: "0 8px 40px rgba(0,0,0,.12)" }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>{milestone.type === "record_break" ? "🏆" : milestone.type === "final" ? "🏁" : "⭐"}</div>
              <h3 style={{ fontSize: 20, fontWeight: 900, color: C.goldT, margin: "0 0 10px", letterSpacing: 2 }}>{milestone.type === "record_break" ? "HISTORY MADE" : milestone.type === "record_tie" ? "RECORD TIED" : "GAME OVER"}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: C.tx2, margin: "0 0 16px" }}>{milestone.text}</p>
              {milestone.threeCount && <div style={{ fontSize: 28, fontWeight: 900, color: C.blue, margin: "0 0 20px" }}>Career 3PT: {milestone.threeCount}</div>}
              <button style={{ background: C.blue, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" }} onClick={() => setMilestone(null)}>{milestone.type === "final" ? "Review" : "Continue"}</button>
            </div>
          </div>}

          {/* Translation card */}
          {translation && <div style={{ background: C.bg, border: `1.5px solid ${C.blueB}`, borderTop: `3px solid ${C.blue}`, borderRadius: 12, padding: 14, margin: "8px 16px 0", boxShadow: "0 4px 16px rgba(0,0,0,.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.blue }}>"{translation.term}"</span>
              <button style={{ background: "transparent", border: "none", color: C.txM, fontSize: 16, cursor: "pointer" }} onClick={() => setTranslation(null)}>✕</button>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: C.tx2, margin: 0 }}>{translation.explanation}</p>
          </div>}

          {/* Feed */}
          {idx === -1
            ? <div style={{ textAlign: "center", color: C.txM, marginTop: 60, fontSize: 14, padding: "0 24px", lineHeight: 1.6 }}>Press play on the video above — the companion will sync automatically.</div>
            : <>
              {/* NOW card */}
              <div key={idx} style={{
                background: currentPlay?.milestone ? C.goldL : C.blueL,
                border: `1.5px solid ${currentPlay?.milestone ? C.gold : C.blueB}`,
                borderTop: `3px solid ${currentPlay?.milestone ? C.gold : C.blue}`,
                borderRadius: 14,
                padding: 18,
                margin: "12px 16px 0",
                animation: "fadeInUp 0.3s ease-out"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: C.red,
                    boxShadow: `0 0 6px ${C.red}50`,
                    animation: videoPlaying ? "pulseDot 1.5s infinite" : "none"
                  }} />
                  <span style={{ fontSize: 10, fontWeight: 800, color: C.red, letterSpacing: 2 }}>LIVE</span>
                  <span style={{ fontSize: 11, color: C.txM, marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>Q{currentPlay.q} · {currentPlay.time}</span>
                </div>
                <p style={{ fontSize: 16, lineHeight: 1.6, margin: 0, fontWeight: 600 }}>{currentPlay.desc}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                  {currentPlay.jargon && <button style={{ background: "#EEF2FF", color: C.blue, border: "none", borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }} onClick={() => handleTranslate(currentPlay.jargon)}>What's a "{currentPlay.jargon}"?</button>}
                  {currentPlay.player && game.players[currentPlay.player] && <button style={{ background: C.redL, color: C.red, border: "none", borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }} onClick={() => { setSelectedPlayer(currentPlay.player); setTab("legacy"); }}>Who's {game.players[currentPlay.player].name.split(" ")[1]}?</button>}
                </div>
              </div>

              {/* Earlier plays */}
              {recentPlays.length > 1 && <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 16px 6px" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.txM, letterSpacing: 1, textTransform: "uppercase" }}>Earlier plays</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.txM, background: C.bg2, borderRadius: 10, padding: "2px 8px" }}>{recentPlays.length - 1}</span>
              </div>}
              <div style={{ flex: 1, overflow: "auto", padding: "0 16px 40px" }}>
                {recentPlays.slice(0, -1).reverse().map((p, i) => (
                  <div key={idx - 1 - i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.bg2}`, opacity: p.milestone ? 1 : .6, ...(p.milestone ? { borderLeft: `3px solid ${C.gold}`, paddingLeft: 10, borderRadius: 4 } : {}) }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 36, paddingTop: 2 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: C.txM }}>Q{p.q}</span>
                      <span style={{ fontSize: 11, color: C.txM, fontVariantNumeric: "tabular-nums" }}>{p.time}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, lineHeight: 1.45, color: C.tx2, margin: 0 }}>{p.desc}</p>
                      <span style={{ fontSize: 10, fontWeight: 700, color: C.txM }}>{p.away}-{p.home}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          }
        </div>}

        {/* LEGACY LENS */}
        {tab === "legacy" && <div style={{ padding: 16, overflow: "auto", flex: 1 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 10px" }}>Legacy Lens</h2>
          <p style={{ fontSize: 14, color: C.tx2, margin: "0 0 6px" }}>Tap a player to learn who they are.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
            {Object.entries(game.players).map(([k, p]) => (
              <button key={k} style={{ background: selectedPlayer === k ? C.blueL : C.bg, border: `1.5px solid ${selectedPlayer === k ? C.blue : C.bdr}`, borderRadius: 10, padding: 12, cursor: "pointer", textAlign: "left" }} onClick={() => setSelectedPlayer(k)}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.txM }}>#{p.number}</div>
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: C.txM, marginTop: 2 }}>{p.team} · {p.position}</div>
              </button>
            ))}
          </div>
          {selectedPlayer && game.players[selectedPlayer] && (
            <div style={{ marginTop: 16, background: C.bg2, borderRadius: 12, padding: 16, border: `1px solid ${C.bdr}`, borderTop: `3px solid ${C.red}` }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>#{game.players[selectedPlayer].number} {game.players[selectedPlayer].name}</h3>
              <div style={{ fontSize: 12, color: C.txM, marginTop: 4, marginBottom: 12 }}>{game.players[selectedPlayer].team} · {game.players[selectedPlayer].position}</div>
              <p style={{ fontSize: 13, lineHeight: 1.65, color: C.tx2, margin: 0 }}>{game.players[selectedPlayer].bio}</p>
              {game.players[selectedPlayer].careerThrees && (
                <div style={{ marginTop: 14, background: C.bg, borderRadius: 10, overflow: "hidden", border: `1px solid ${C.bdr}` }}>
                  <div style={{ padding: 14, textAlign: "center", borderBottom: `1px solid ${C.bdr}` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.txM, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Career Stats</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1, background: C.bdr }}>
                    <div style={{ background: C.bg, padding: 12, textAlign: "center" }}>
                      <div style={{ fontSize: 28, fontWeight: 900, color: C.blue, lineHeight: 1 }}>{game.players[selectedPlayer].careerThrees.toLocaleString()}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.txM, marginTop: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>Career 3PM</div>
                    </div>
                    <div style={{ background: C.bg, padding: 12, textAlign: "center" }}>
                      <div style={{ fontSize: 28, fontWeight: 900, color: C.txM, lineHeight: 1 }}>{(2973 - game.players[selectedPlayer].careerThrees)}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.txM, marginTop: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>Behind Record</div>
                    </div>
                  </div>
                  <div style={{ padding: 10, background: C.bg2, textAlign: "center", fontSize: 11, color: C.tx2 }}>Ray Allen's record: 2,973</div>
                </div>
              )}
            </div>
          )}
          {milestoneHistory.length > 0 && <>
            <div style={{ height: 1, background: C.bdr, margin: "16px 0" }} />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.tx2, margin: "0 0 8px" }}>Historic moments</h3>
            {milestoneHistory.map((m, i) => (
              <div key={i} style={{ background: C.goldL, borderLeft: `3px solid ${C.gold}`, borderRadius: 8, padding: 12, marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.goldT, marginBottom: 4 }}>Q{m.play.q} · {m.play.time}</div>
                <div style={{ fontSize: 13, lineHeight: 1.55, color: C.tx2 }}>{m.milestone.text}</div>
              </div>
            ))}
          </>}
        </div>}

        {/* ASK AI */}
        {tab === "chat" && <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div ref={chatRef} style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>
            {chatMsgs.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
                <div style={{
                  maxWidth: "80%", padding: "10px 14px", borderRadius: 14,
                  background: m.role === "user" ? C.blue : C.bg2,
                  color: m.role === "user" ? "#fff" : C.tx,
                  fontSize: 14, lineHeight: 1.55,
                  borderBottomRightRadius: m.role === "user" ? 4 : 14,
                  borderBottomLeftRadius: m.role === "assistant" ? 4 : 14,
                }}>{m.content}</div>
              </div>
            ))}
            {chatLoading && <div style={{ display: "flex", marginBottom: 10 }}>
              <div style={{ background: C.bg2, padding: "10px 14px", borderRadius: 14, borderBottomLeftRadius: 4, fontSize: 14, color: C.txM }}>Thinking...</div>
            </div>}
          </div>
          <div style={{ padding: "8px 16px 12px", borderTop: `1px solid ${C.bdr}`, display: "flex", gap: 8, background: C.bg }}>
            <input style={{ flex: 1, padding: "10px 14px", border: `1.5px solid ${C.bdr}`, borderRadius: 12, fontSize: 14, outline: "none", background: C.bg2 }}
              placeholder="Ask about the game, players, rules..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") sendChat(); }}
            />
            <button style={{ background: C.blue, color: "#fff", border: "none", borderRadius: 12, padding: "10px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: chatInput.trim() ? 1 : .5 }} onClick={sendChat}>Send</button>
          </div>
        </div>}
      </div>
    </div>
  );
}
