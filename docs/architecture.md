# Architecture — Tentpole Fan Companion

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA SOURCES                             │
│                                                                 │
│  ┌──────────────┐  ┌───────────┐  ┌──────────┐  ┌───────────┐ │
│  │ Kaggle nbadb │  │  nba_api  │  │ Curated  │  │  Jargon   │ │
│  │   SQLite     │  │  Python   │  │ Content  │  │Dictionary │ │
│  │ PBP, stats   │  │ live API  │  │storylines│  │ terms +   │ │
│  │ since 1946   │  │ endpoint  │  │  bios    │  │ analogies │ │
│  └──────┬───────┘  └─────┬─────┘  └────┬─────┘  └─────┬─────┘ │
│         │                │              │              │        │
│         └────────────────┼──────────────┼──────────────┘        │
│                          ▼              ▼                       │
│              ┌─────────────────────────────────┐               │
│              │   normalize_pbp.py              │               │
│              │   SQLite → App JSON schema      │               │
│              └──────────────┬──────────────────┘               │
└─────────────────────────────┼───────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GAME DATA PACKAGE                            │
│                                                                 │
│  {                                                              │
│    meta: { title, date, venue, teams },                        │
│    catchup: { storyline, rivalry, watchFor },                  │
│    players: { key: { name, bio, stats } },                     │
│    plays: [{ q, time, score, desc, jargon?, milestone? }],     │
│    timestamps: [{ sec: videoSecond, playIdx: index }],          │
│    jargon: { "term": "explanation" }                            │
│  }                                                              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
┌─────────────────┐ ┌────────────┐ ┌────────────────┐
│  Game Simulator │ │  Milestone │ │   Translator   │
│                 │ │  Detector  │ │                │
│ YouTube IFrame  │ │            │ │ Jargon dict →  │
│ API polls       │ │ Flagged    │ │ Claude API     │
│ getCurrentTime()│ │ plays in   │ │ fallback       │
│ every 1 second  │ │ data       │ │                │
│                 │ │            │ │                │
│ Proportional    │ │ Triggers   │ │ Inline cards   │
│ fallback if no  │ │ overlay on │ │ in Live Feed   │
│ timestamps      │ │ idx change │ │                │
└────────┬────────┘ └──────┬─────┘ └───────┬────────┘
         │                 │               │
         └─────────────────┼───────────────┘
                           ▼
              ┌──────────────────────┐
              │     playIndex        │
              │  (single source of   │
              │   truth for game     │
              │   state)             │
              └──────────┬───────────┘
                         │
    ┌────────────────────┼─────────────────────┐
    ▼                    ▼                     ▼
┌─────────┐    ┌──────────────┐    ┌────────────────┐
│Catch-Up │    │  Live Feed   │    │  Legacy Lens   │
│         │    │              │    │                │
│Storyline│    │ NOW card     │    │ Player grid    │
│Rivalry  │    │ History feed │    │ Player detail  │
│Watch-for│    │ Jargon btns  │    │ Career stats   │
│         │    │ Player btns  │    │ Historic       │
│         │    │              │    │ moments log    │
└─────────┘    └──────────────┘    └────────────────┘

                    ┌────────────────┐
                    │    Ask AI      │
                    │                │
                    │ Chat interface │
                    │ Claude Sonnet  │
                    │ via /api/chat  │
                    │                │
                    │ System prompt  │
                    │ includes game  │
                    │ state + roster │
                    └───────┬────────┘
                            │
                            ▼
                ┌────────────────────┐
                │  /api/chat.js      │
                │  Vercel serverless │
                │  ANTHROPIC_API_KEY │
                │  from env          │
                └────────────────────┘
```

## Video Sync Flow

```
User presses play on YouTube video
            │
            ▼
YouTube IFrame API fires onStateChange(PLAYING)
            │
            ├─── timestamps[] has entries?
            │         │
            │    YES: start 1-second polling loop
            │         │
            │         ├──► getCurrentTime() → 245 seconds
            │         ├──► findPlayByTimestamp(245) → playIdx 12
            │         └──► setIdx(12) → NOW card updates
            │
            │    NO: start proportional fallback
            │         │
            │         ├──► getCurrentTime() → 245 seconds
            │         ├──► getDuration() → 7200 seconds
            │         ├──► ratio = 245/7200 = 0.034
            │         ├──► playIdx = floor(0.034 × 40) = 1
            │         └──► setIdx(1) → NOW card updates
            │
            ▼
User pauses video
            │
            ▼
onStateChange(PAUSED) → stop polling → feed freezes
            │
            ▼
User seeks to 1:30:00
            │
            ▼
Next poll picks up new time → feed jumps to matching play
```

## Score-Based Sync (Fallback)

```
User taps "Sync" button
        │
        ▼
Modal: enter score (GSW __ — NYK __) + quarter (Q1-Q4)
        │
        ▼
findPlayByScore(away, home, quarter)
        │
        ├──► exact match? → return last play at that score in that quarter
        │
        └──► no match? → fuzzy: minimize |play.away - input.away| + |play.home - input.home|
                          within the correct quarter
        │
        ▼
setIdx(result) → feed jumps, NOW card updates
```

## Ask AI Data Flow

```
User types "Why is MSG special for this?" in Ask AI tab
        │
        ▼
Client POST /api/chat
  body: { messages: [...conversationHistory], gameContext: { score, quarter, lastPlay, players } }
        │
        ▼
Vercel serverless function (api/chat.js)
  ├──► reads ANTHROPIC_API_KEY from process.env
  ├──► builds system prompt with game context
  ├──► calls Anthropic Messages API (claude-sonnet-4-20250514)
  └──► returns response to client
        │
        ▼
Chat bubble appears with contextual answer
```
