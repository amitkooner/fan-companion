# BACKLOG.md — Tentpole Fan Companion

Work through tasks in order. Each task is labeled:
- **AUTO** — Claude Code can complete independently
- **HUMAN** — Requires human action (testing on device, watching video, entering credentials, design review)
- **REVIEW** — Claude Code does the work, human reviews the output

When you reach a HUMAN task, pause and tell me what's needed.

---

## Phase 1: Setup

- [x] **1. AUTO** — Install dependencies and start the dev server. Verify the app compiles without errors.
- [x] **2. HUMAN** — Create `.env.local` with `ANTHROPIC_API_KEY=sk-ant-...` (human provides their key). Verify `/api/chat` works locally.
- [ ] **3. AUTO** — Initialize git repo, create `.gitignore`, make initial commit.

## Phase 2: Video sync (critical path)

- [ ] **4. HUMAN** — Open `tools/timestamp-logger.html` in a browser. Watch the Curry game video (J6RT3BHHvPU) and click Map on each play. Copy the JSON output. (This requires a human watching the video — ~30 minutes.)
- [ ] **5. AUTO** — Once human provides the timestamp JSON, paste it into `src/data/curry-record.js` timestamps array.
- [ ] **6. AUTO** — Verify the YouTube IFrame API integration: when `onStateChange` fires with PLAYING (1), the sync polling loop starts. When PAUSED (2) or ENDED (0), polling stops. When no timestamps are mapped, proportional fallback activates using `getCurrentTime() / getDuration() * totalPlays`.
- [ ] **7. AUTO** — Verify the score-based Sync modal: `findPlayByScore()` correctly fuzzy-matches the closest play for a given score + quarter combination. Write a few test cases.

## Phase 3: Core feature verification

- [ ] **8. AUTO** — Verify the full screen flow: login → game selector → companion. Ensure state resets correctly when navigating back to selector and choosing a different game.
- [ ] **9. AUTO** — Verify the Catch-Up tab renders storyline, backstory, and watch-for items. Verify it auto-switches to Live Feed when `idx` goes from -1 to 0.
- [ ] **10. AUTO** — Verify milestone detection: when `idx` changes to a play with a `milestone` property, the overlay state is set and the milestone is added to history (without duplicates).
- [ ] **11. AUTO** — Verify jargon translator: plays with a `jargon` property show a blue pill button. Tapping it sets the translation state with the matching entry from `game.jargon`.
- [ ] **12. AUTO** — Verify player buttons: plays with a `player` property that exists in `game.players` show a red pill button. Tapping it sets `selectedPlayer` and switches to the Legacy Lens tab.
- [ ] **13. AUTO** — Verify Ask AI: POST to `/api/chat` sends the conversation history and a system prompt containing the current game state (score, quarter, last play, player roster). Verify error handling when the API key is missing.
- [ ] **14. HUMAN** — Test the full app on a mobile device (375px viewport). Report any layout issues for Claude Code to fix.

## Phase 4: Design polish

- [ ] **15. AUTO** — Add a CSS entrance animation to the NOW card: fade-in + slight slide-up (opacity 0→1, translateY 8px→0, 300ms ease-out) when the `key={idx}` prop changes.
- [ ] **16. AUTO** — Add a pulsing animation to the red LIVE dot when `videoPlaying` is true: scale 1→1.3→1, opacity 1→0.6→1, 1.5s infinite.
- [ ] **17. AUTO** — Add a brief color flash to the score numbers when the score changes: background highlight (#FFF7ED) that fades over 600ms.
- [ ] **18. AUTO** — Add a loading state for the companion screen: show a skeleton placeholder for the video area and scoreboard while the YouTube IFrame API initializes (before `ytReady` is true).
- [ ] **19. AUTO** — Audit all interactive elements (buttons, tabs, inputs, cards) and ensure minimum 44px touch target height. Fix any that are smaller.
- [ ] **20. REVIEW** — Review all animations and polish on a mobile device. Approve or request changes.

## Phase 5: Data expansion

- [ ] **21. AUTO** — Download the Kaggle nbadb SQLite file. Use `tools/normalize_pbp.py` to extract PBP for LeBron's Game 7 (game ID 0041500407, Cavaliers @ Warriors, June 19, 2016). Create `src/data/lebron-game7.js` with plays, player bios (LeBron, Kyrie, Love, Curry, Draymond, Iguodala), catchup content (down 3-1, The Block, The Shot, 52-year drought), and jargon dictionary.
- [ ] **22. AUTO** — Same for Kobe's 60-point finale (game ID 0021501228, Jazz @ Lakers, April 13, 2016). Create `src/data/kobe-60.js`. Players: Kobe, D'Angelo Russell, Jordan Clarkson, Hayward, Favors.
- [ ] **23. AUTO** — Same for Dame's buzzer-beater (game ID 0041800174, Thunder @ Trail Blazers, April 23, 2019). Create `src/data/dame-buzzer.js`. Players: Lillard, McCollum, Westbrook, PG13, Kanter.
- [ ] **24. AUTO** — Import all three new game data packages into App.jsx. Set `ready: true` in the GAMES object. Verify the game selector shows all four games as playable.
- [ ] **25. HUMAN** — Use the timestamp logger tool to map video timestamps for whichever additional game we want to demo live. (~30 min per game.)
- [ ] **26. AUTO** — Once human provides timestamp JSON for new games, paste into the corresponding data files.

## Phase 6: PBP data quality

- [ ] **27. AUTO** — Replace the hand-curated Curry game PBP with real data from nbadb using `normalize_pbp.py --scoring-only`. Preserve the milestone flags on plays matching career three #2,973 and #2,974. Verify play count is between 50-80 for demo length.
- [ ] **28. AUTO** — Scan all play descriptions across all games for basketball terms that should have translator buttons. Cross-reference against each game's jargon dictionary. Add any missing terms with plain-language explanations.
- [ ] **29. AUTO** — Verify every player name that appears in PBP descriptions maps to a player key in the game's players object. Add any missing players with short bios.

## Phase 7: Ask AI enhancements

- [ ] **30. AUTO** — Add suggested question chips above the chat input: 3-4 tappable pills that change based on game state. Pre-game: "What's the storyline?", "Who should I watch?". During game: "What just happened?", "Why does this matter?". After milestones: "How does this compare to other records?", "What's next?".
- [ ] **31. AUTO** — When the user taps a jargon translation button, add a secondary action: "Ask AI for more" that opens the chat tab with the question pre-filled (e.g., "Tell me more about what an alley-oop is and when teams use it").
- [ ] **32. AUTO** — Improve the system prompt: include the last 3 plays (not just the most recent one) for better conversational context. Include which milestones have already occurred in the game.
- [ ] **33. REVIEW** — Test Ask AI with 5 different question types: jargon ("what's a pick-and-roll?"), player ("who is Curry?"), context ("why is this game important?"), strategy ("why did the Warriors come back?"), and opinion ("who's playing better?"). Verify responses are warm, concise, and grounded in the game state.

## Phase 8: Deployment

- [ ] **34. AUTO** — Run `npm run build` and verify no build errors. Check that the output in `dist/` is correct.
- [ ] **35. HUMAN** — Deploy to Vercel. Set `ANTHROPIC_API_KEY` in Vercel dashboard → Settings → Environment Variables. Share the deployed URL.
- [ ] **36. HUMAN** — Test the deployed app on iPhone and Android. Verify: YouTube embed loads, video sync works, Ask AI returns responses, milestone overlays fire.
- [ ] **37. AUTO** — Add Open Graph meta tags to `index.html`: title ("NBA Fan Companion"), description ("AI-powered second screen for classic NBA games"), and a placeholder OG image.

## Phase 9: Demo prep

- [ ] **38. AUTO** — Write a 3-minute demo script in `docs/demo-script.md` that walks through: login → Curry game → Catch-Up → play video → Live Feed syncs → milestone overlay → jargon translation → Ask AI question → Legacy Lens → pause video → Sync button → back to selector → show future games. Include timestamps and talking points for each beat.
- [ ] **39. HUMAN** — Record a screen capture of the demo flow on a phone for the hackathon submission.
- [ ] **40. REVIEW** — Final review of the deployed app. Fix any last issues.

## Phase 10: Future architecture (post-hackathon)

- [ ] **41. AUTO** — Write `docs/future-architecture.md` documenting: Amazon Prime Video second-screen API integration requirements, auto-generated catchup content pipeline using Claude, real NBA ID OAuth integration, "continue watching" feature design, and audio-based sync exploration.
- [ ] **42. AUTO** — Design the data pipeline for auto-generating catchup content: given a game ID, pull stats from nbadb, generate storyline/rivalry/watch-for using Claude API, output a complete game data package. Write the pipeline script as `tools/generate-game-package.py`.
- [ ] **43. AUTO** — Write a technical one-pager (`docs/amazon-integration.md`) explaining how the sync architecture would work with Amazon Prime: what API access is needed, the partnership ask, and how the existing `playIndex` state model stays the same regardless of video source.
- [ ] **44. AUTO** — Add localStorage-based "continue watching" feature: save `{ gameId, playIndex, timestamp }` when the user leaves the companion screen. On return, offer to resume from where they left off.
- [ ] **45. AUTO** — Research and document audio fingerprinting options for broadcast sync in `docs/audio-sync-research.md`. Cover: Web Audio API, Chromaprint/AcoustID, feasibility for live NBA broadcasts, latency considerations.

---

## How to use this with Claude Code

Start Claude Code in the project directory:
```bash
cd fan-companion
claude
```

Then say:
```
Read BACKLOG.md and do task 1
```

For each subsequent task:
```
Do the next task in BACKLOG.md
```

Claude Code will check the task label:
- **AUTO**: does the work and reports completion
- **HUMAN**: tells you what it needs from you and waits
- **REVIEW**: does the work and asks you to review before moving on

After each completed task, Claude Code should check the box in this file:
```
Mark task N as done in BACKLOG.md
```
