# Unified Requirements Document — NBA Fan Companion Platform
**Author:** Amit  
**Date:** 2026-05-05  
**Status:** Draft

---

## Executive Summary

This document defines a **dual-mode fan companion platform** that supports:
1. **Classic Mode** — Video-synced replay of historic NBA games with AI companion
2. **Live Mode** — Real-time notifications from live NBA games with AI Q&A

Both modes share the same UI, chat interface, and data model. The architecture uses **mode adapters** to switch between video-driven playback (classic) and event-driven streaming (live).

---

## Product Vision

### The Problem
- **Casual fans** only watch 5-6 tentpole games per season and need context to engage
- **Die-hard fans** want deep stats and the ability to ask questions during live games
- Existing solutions are either too technical (ESPN stats) or too shallow (social media)

### The Solution
A unified second-screen companion that:
- Makes basketball accessible through AI-powered explanations and jargon translation
- Syncs to video for classic games OR to live feeds for current games
- Provides "catch-up" context, player stories, and milestone tracking
- Works on mobile as a true second-screen experience

---

## User Personas

### 1. Casual Fan (Tentpole Viewer)
- **Demographics:** 25-45, watches 5-6 games/year (Christmas, Playoffs, Finals)
- **Pain Points:** Doesn't understand jargon, loses track of storylines, gets lost in stats
- **Use Case:** Watching Curry break the 3-point record on YouTube with the companion explaining context
- **Primary Mode:** Classic Mode

### 2. Die-Hard Fan (Live Viewer)
- **Demographics:** Watches every game, follows stats, engages on social media
- **Pain Points:** Wants deeper context mid-game, misses milestone moments, needs instant answers
- **Use Case:** Watching Warriors vs. Celtics live on TV with companion showing notifications + AI chat
- **Primary Mode:** Live Mode

### 3. Highlight Hunter (Replay Viewer)
- **Demographics:** Can't watch live, catches up via League Pass or YouTube highlights
- **Pain Points:** Wants the "live" feel even when watching replays
- **Use Case:** Watching last night's game on League Pass with companion synced to video
- **Primary Mode:** Classic Mode (but with recent game data)

---

## Architecture Overview

### Unified Data Model
Both modes use the same play-by-play data structure:

```typescript
interface Play {
  q: number;           // Quarter
  time: string;        // Game clock (e.g., "5:58")
  away: number;        // Away team score
  home: number;        // Home team score
  desc: string;        // Play description
  player?: string;     // Player key for "Who's X?" buttons
  type: PlayType;      // jumpball, fg, fg3, ft, miss, foul, etc.
  jargon?: string;     // Term to explain (e.g., "alley-oop")
  milestone?: Milestone; // Record-breaking moments
}

interface GameData {
  id: string;
  ytId?: string;              // YouTube video ID (Classic Mode only)
  liveId?: string;            // NBA API game ID (Live Mode only)
  title: string;
  subtitle: string;
  date: string;
  venue: string;
  away: TeamInfo;
  home: TeamInfo;
  catchup: CatchupContent;    // Storyline, rivalry, watch-for
  players: Record<string, PlayerBio>;
  plays: Play[];
  timestamps?: VideoTimestamp[]; // For Classic Mode video sync
  jargon: Record<string, string>;
}
```

### Mode Adapters

#### Classic Mode Adapter (Current Implementation)
- **Input:** YouTube video via IFrame API
- **Sync:** `getCurrentTime()` polled every 1s → maps to `playIndex` via timestamps or proportional fallback
- **State:** Video playing/paused controls feed advancing/pausing
- **Data Source:** Static JSON imported from `src/data/`
- **Example:** Watching Curry break the record on YouTube

#### Live Mode Adapter (Future)
- **Input:** Real-time events from NBA API feed or WebSocket
- **Sync:** Events pushed to client → appends to `plays[]` in real-time
- **State:** Feed always advancing as events arrive
- **Data Source:** FastAPI backend → Cosmos DB → Azure AI Foundry
- **Example:** Watching Warriors vs. Celtics live on TV with companion showing notifications

### Shared Components
- **UI Layer:** React SPA (login, selector, companion screens)
- **Chat Interface:** Ask AI with game-aware system prompt
- **Feature Cards:** Jargon translator, player bios, milestone overlays
- **Scoreboard:** Live score display
- **Tabs:** Catch-Up, Live Feed, Legacy Lens, Ask AI

---

## Feature Requirements

### Core Features (Both Modes)

#### F-1: Catch-Up Content
**Priority:** P0  
**Status:** ✅ Implemented

Pre-game context that sets up the narrative:
- **Storyline:** What makes this game matter
- **Rivalry/Backstory:** Historical context between teams
- **Watch For:** Key players, records at stake, tactical matchups

**Implementation:**
- Rendered in Catch-Up tab before game starts
- Auto-switches to Live Feed when `playIndex >= 0`

#### F-2: Live Feed with NOW Card
**Priority:** P0  
**Status:** ✅ Implemented

Real-time play-by-play feed with:
- **NOW card:** Current play highlighted with blue background, LIVE badge, game clock
- **Earlier plays:** Reverse chronological history with dimmed opacity
- **Milestone plays:** Full opacity with gold left border
- **Action buttons:** Jargon translation (blue pill), player lookup (red pill)

**Implementation:**
- Feed scrolls automatically as plays advance
- Each play shows: quarter, time, description, score

#### F-3: Jargon Translator
**Priority:** P0  
**Status:** ✅ Implemented

Inline explanations for basketball terms:
- Plays with `jargon` property show blue pill button: `What's a "{term}"?`
- Tapping opens inline card with plain-language explanation
- Examples: alley-oop, pick-and-roll, fadeaway, backdoor cut

**Implementation:**
- Lookup from `game.jargon` dictionary
- Fallback message if term not found

#### F-4: Player Context (Legacy Lens)
**Priority:** P0  
**Status:** ✅ Implemented

Player bios and career stats:
- 2-column grid of all players in the game
- Tappable to show detail card: name, number, position, bio
- Career stat cards for milestone-relevant stats (e.g., career 3PM)
- "Historic moments" section showing milestones that have occurred

**Implementation:**
- Lookup from `game.players` object
- Plays with `player` property show red pill: `Who's {lastName}?`

#### F-5: Milestone Detection
**Priority:** P0  
**Status:** ✅ Implemented

Full-screen overlays for record-breaking moments:
- **Types:** `record_tie`, `record_break`, `final`
- **Icons:** ⭐ (tie), 🏆 (break), 🏁 (final)
- **Content:** Milestone text, stat callout, Continue button
- **History:** Tracked without duplicates, shown in Legacy Lens tab

**Implementation:**
- Plays with `milestone` property trigger overlay
- Overlay pauses feed progression (video keeps playing in Classic Mode)

#### F-6: Ask AI Chat
**Priority:** P0  
**Status:** ✅ Implemented

Conversational AI for questions about the game:
- Text input with Send button
- Message bubbles (user=blue/right, assistant=gray/left)
- System prompt includes: game info, player roster, current score, last play
- Responses: warm, concise (2-3 sentences), jargon-free

**Implementation:**
- POST to `/api/chat` (Vercel serverless function)
- Claude Sonnet 4 via Anthropic API
- Error handling for missing API key

#### F-7: Score-Based Sync (Manual Fallback)
**Priority:** P1  
**Status:** ✅ Implemented

Manual sync for DVR/rewind scenarios:
- Modal with score input (away, home) + quarter picker
- Fuzzy match to find closest play
- Jumps feed to matching play

**Implementation:**
- `findPlayByScore()` uses Manhattan distance
- Works in both modes as a "jump to moment" feature

### Classic Mode Features

#### CM-1: YouTube Video Embed
**Priority:** P0  
**Status:** ✅ Implemented

Embedded video player with IFrame API integration:
- 16:9 aspect ratio, rounded corners
- Auto-initializes YouTube IFrame API
- `onStateChange` handler for PLAYING/PAUSED/ENDED

#### CM-2: Video Sync (Timestamp-Based)
**Priority:** P0  
**Status:** ✅ Implemented

Precise sync using pre-mapped timestamps:
- `VIDEO_TIMESTAMPS` array: `[{ sec: videoSecond, playIdx: index }]`
- Polling loop: `getCurrentTime()` → `findPlayByTimestamp()` → `setPlayIndex()`
- 1-second polling interval

**Tooling:**
- `tools/timestamp-logger.html` for manual mapping

#### CM-3: Video Sync (Proportional Fallback)
**Priority:** P0  
**Status:** ✅ Implemented

Automatic sync when no timestamps mapped:
- Formula: `playIndex = (currentTime / duration) * totalPlays`
- Always works without manual timestamp mapping
- Less accurate but ensures demo works

#### CM-4: Video Controls Pause Feed
**Priority:** P0  
**Status:** ✅ Implemented

Feed pauses when video pauses:
- PLAYING (1) → starts sync polling
- PAUSED (2) / ENDED (0) → stops polling, feed freezes

### Live Mode Features (Future)

#### LM-1: Real-Time Event Stream
**Priority:** P0  
**Status:** ❌ Not Implemented

WebSocket or Server-Sent Events for live game updates:
- Client connects to `/api/live/{gameId}/stream`
- Server pushes events as they occur: `{ type: "play", data: Play }`
- Client appends to `plays[]` and auto-advances feed

**Technical:**
- FastAPI backend with WebSocket endpoint
- NBA API polling or webhook integration
- Event queue with Redis for buffering

#### LM-2: Multi-Game Switching
**Priority:** P1  
**Status:** ⚠️ Partial (UI only)

Switch between concurrent live games:
- Game selector shows "LIVE" badge for active games
- Selecting switches WebSocket connection and data context
- Chat history preserved per game

#### LM-3: Push Notifications (Mobile)
**Priority:** P2  
**Status:** ❌ Not Implemented

Push notifications for milestones and key moments:
- User subscribes to favorite teams
- Server sends push when milestone detected
- Notification deep-links to companion with game pre-loaded

---

## Technical Stack

### Current (Phase 1 — Classic Mode)
- **Frontend:** React 18 + Vite, single-page app
- **Styling:** Inline styles, "Broadcast Modern" design system
- **Video:** YouTube IFrame Player API
- **AI:** Claude Sonnet 4 via Anthropic API
- **Deploy:** Vercel (vercel.json configured)
- **Data:** Static JSON in `src/data/`

### Future (Phase 2 — Live Mode)
- **Backend:** Python FastAPI
- **Database:** Azure Cosmos DB (game data, chat history)
- **Auth:** Microsoft Entra ID (OAuth 2.0 + PKCE)
- **Agent:** Azure AI Foundry GPT with function calling
- **Real-Time:** WebSocket or Server-Sent Events
- **Infrastructure:** Azure App Service / Container Apps
- **IaC:** Terraform
- **CI/CD:** GitHub Actions

### Shared (Both Phases)
- **Data Model:** Unified Play/GameData interface
- **UI Components:** React components for all screens
- **Design System:** "Broadcast Modern" color palette and typography

---

## Data Pipeline

### Classic Mode Pipeline (Current)
```
Kaggle nbadb SQLite → tools/normalize_pbp.py → JSON
                                ↓
                    Manual curation (catchup, jargon, bios)
                                ↓
                    Video mapping (tools/timestamp-logger.html)
                                ↓
                    Export to src/data/{game-id}.js
                                ↓
                    Import in App.jsx
```

### Live Mode Pipeline (Future)
```
NBA Live API → FastAPI ETL → Cosmos DB (plays, events)
                    ↓
            AI-generated catchup content (Claude API)
                    ↓
            WebSocket push to connected clients
                    ↓
            React app renders in real-time
```

---

## Authentication & Authorization

### Phase 1 (Classic Mode — Current)
- **Type:** Mock authentication
- **Login:** Email input, no password validation
- **State:** Local state only, no persistence
- **Reason:** Hackathon/demo simplicity

### Phase 2 (Live Mode — Future)
- **Type:** Microsoft Entra ID (Azure AD)
- **Flow:** OAuth 2.0 Authorization Code with PKCE
- **Tokens:** JWT bearer tokens validated on API endpoints
- **Roles:** `Fan` (read), `Admin` (write/manage)
- **Managed Identity:** Service-to-service calls (API → Cosmos DB, API → AI Foundry)
- **No Secrets:** Zero API keys in config, all via managed identity

---

## Deployment Strategy

### Phase 1: Classic Mode (Vercel)
**Status:** Ready to deploy

```bash
npm run build        # Build to dist/
vercel               # Deploy to Vercel
```

**Environment Variables:**
```
ANTHROPIC_API_KEY=sk-ant-...   # Set in Vercel dashboard
```

**URL Structure:**
- `app.example.com` → Login
- `app.example.com` → Game selector
- `app.example.com` → Companion (no routing, SPA state)

### Phase 2: Live Mode (Azure)
**Status:** Not implemented

**Infrastructure:**
- Azure App Service for FastAPI backend
- Cosmos DB for data storage
- Azure AI Foundry for agent
- Azure CDN for React SPA
- Terraform for IaC

**URL Structure:**
- `app.example.com` → React SPA
- `api.example.com/live/{gameId}` → Live game endpoint
- `api.example.com/chat` → AI chat endpoint
- `api.example.com/health` → Health check

---

## Development Workflow

### Adding a New Classic Game
1. Pull PBP data from Kaggle nbadb using `tools/normalize_pbp.py`
2. Write catchup content (storyline, rivalry, watch-for)
3. Add player bios (key players from roster)
4. Create jargon dictionary for terms in PBP
5. Find embeddable YouTube video, get video ID
6. (Optional) Map timestamps using `tools/timestamp-logger.html`
7. Export as `src/data/{game-id}.js`
8. Import in `App.jsx` and add to `GAMES` object with `ready: true`

### Adding a Live Game (Future)
1. Register game in Cosmos DB via admin API
2. AI generates catchup content from historical data
3. ETL pipeline starts polling NBA API for live events
4. Events stream to connected clients via WebSocket
5. Companion renders in real-time

---

## Testing Strategy

### Phase 1 Testing
- **Unit:** Test sync functions (`findPlayByScore`, `findPlayByTimestamp`, `findPlayByProportion`)
- **Integration:** Test video sync with sample timestamps
- **Manual:** Test on mobile device (375px viewport)
- **E2E:** Test login → selector → companion flow

### Phase 2 Testing (Future)
- **Unit:** Test ETL transformations, AI tool calls
- **Integration:** Test WebSocket connection, auth flow
- **Load:** Test 10,000+ concurrent users per game
- **Chaos:** Test failover, rate limiting, replay scenarios

---

## Success Metrics

### Phase 1 (Classic Mode)
- **Engagement:** Time spent per session (target: 15+ min)
- **Chat Usage:** Questions per session (target: 3+)
- **Feature Adoption:** % users who tap jargon/player buttons (target: 60%+)
- **Mobile:** % sessions on mobile (target: 70%+)

### Phase 2 (Live Mode)
- **Latency:** Notification delivery < 5 seconds
- **Accuracy:** AI response accuracy > 90%
- **Scale:** Support 10,000+ concurrent users per game
- **Uptime:** 99.9% during live game windows

---

## Roadmap

### ✅ Phase 1: Classic Mode MVP (Current)
- Single classic game (Curry record)
- Video sync (proportional fallback)
- Ask AI chat with Claude API
- Jargon translator + player bios
- Milestone overlays
- Mobile-responsive UI
- Deployed to Vercel

### 🚧 Phase 1.5: Classic Mode Expansion (In Progress)
- Add 3 more classic games (LeBron Game 7, Kobe 60, Dame buzzer)
- Timestamp mapping for precise sync
- Design polish (animations, stat grids)
- Score flash animation
- Improved "Earlier plays" layout

### 📋 Phase 2: Live Mode Backend
- FastAPI backend with Cosmos DB
- NBA API integration (live event stream)
- Azure AI Foundry agent with function calling
- WebSocket/SSE for real-time updates
- Multi-game support (switch between live games)
- Microsoft Entra ID authentication

### 📋 Phase 3: Live Mode Features
- Push notifications for milestones
- Personalization (favorite teams, notification preferences)
- "Continue watching" feature (resume from last play)
- Audio-based sync (Chromaprint for broadcast matching)
- Social features (share moments, emoji reactions)

### 📋 Phase 4: Premium Features
- Amazon Prime Video integration (official second-screen API)
- Auto-generated catchup content via Claude API
- Advanced agent tools (player comparison, trend analysis, "What if?" scenarios)
- Mobile native apps (iOS/Android)
- Voice input for Ask AI

---

## Constraints & Assumptions

### Constraints
- **NBA Data:** Must use NBA-approved data feeds (nba.com API, official partners)
- **Licensing:** Comply with NBA data usage and licensing agreements
- **Accessibility:** Meet WCAG 2.1 AA standards
- **Embedding:** YouTube embed restrictions may block some videos

### Assumptions
- Casual fans prefer classic games for learning (tentpole moments are rewatchable)
- Die-hard fans will use Live Mode during actual games
- Mobile is the primary device (70%+ of traffic)
- Fans are comfortable with AI chat interfaces
- Video sync "good enough" threshold: ±5 seconds for demos

### Out of Scope (All Phases)
- Betting or wagering features
- Video/audio streaming (we're a companion, not a broadcaster)
- Live chat between users (social features in Phase 3+)
- Game highlights generation
- Fantasy sports integration

---

## Open Questions

1. **NBA API Access:** Do we have partnership access to live feeds, or use unofficial scrapers?
2. **Azure AI Foundry vs. Anthropic:** Should Live Mode switch to Azure AI Foundry (per original PRD) or continue with Claude API?
3. **Monetization:** Free tier vs. premium? Ads? Subscription?
4. **Classic Mode Value:** Is Classic Mode just a prototype, or a standalone product?
5. **Video Licensing:** Can we embed NBA videos legally, or only link to YouTube/League Pass?

---

## Appendix: File Structure

```
fan-companion/
├── business-requirements.md           # Original live-game requirements
├── product-requirements.md            # Original technical requirements
├── unified-requirements_Amit.md       # This document (dual-mode)
├── CLAUDE.md                          # Implementation guide for Claude Code
├── SPEC.md                            # Design system + UI spec
├── BACKLOG.md                         # Task backlog (Phase 1 → Phase 4)
├── README.md                          # Quick start guide
├── index.html                         # Vite entry point
├── package.json
├── vite.config.js
├── vercel.json
├── .env.example
├── .gitignore
├── src/
│   ├── main.jsx                       # React mount point
│   ├── App.jsx                        # Full app (login, selector, companion)
│   └── data/
│       ├── curry-record.js            # Classic game: Curry breaks record
│       ├── lebron-game7.js            # (Future) Classic game: Cavs Game 7
│       ├── kobe-60.js                 # (Future) Classic game: Kobe 60
│       └── dame-buzzer.js             # (Future) Classic game: Dame buzzer
├── api/
│   └── chat.js                        # Vercel serverless function (Claude API)
├── tools/
│   ├── timestamp-logger.html          # Tool for mapping video timestamps
│   └── normalize_pbp.py               # Kaggle nbadb → JSON converter
├── docs/
│   └── architecture.md                # Architecture diagram + data flow
└── public/
    └── (empty)
```

---

## Decision Log

### 2026-05-05: Unified Architecture Decision
**Decision:** Build a dual-mode platform with shared UI and mode-specific adapters  
**Rationale:**
- Maximizes code reuse (80% shared between modes)
- Allows Classic Mode to ship immediately while Live Mode is built
- Validates UX patterns with users before investing in real-time infrastructure
- De-risks Azure/NBA API integration by proving product-market fit first

**Trade-offs:**
- More complex architecture than single-mode
- Potential refactoring when Live Mode ships
- Need to maintain two sync mechanisms

**Alternatives Considered:**
1. **Build Live Only:** Higher risk, longer time-to-market, can't demo without live games
2. **Build Classic Only:** Lower ceiling, can't pivot to real-time later
3. **Separate Apps:** No code reuse, confusing for users

**Outcome:** Proceed with unified architecture, ship Classic Mode as Phase 1 MVP

---

**End of Document**
