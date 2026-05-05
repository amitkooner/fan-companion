# CLAUDE.md — Tentpole Fan Companion

## Project Overview
AI-powered second-screen companion for casual NBA fans watching classic games. React SPA deployed to Vercel with YouTube IFrame API video sync and Claude API chat.

## Tech Stack
- **Frontend**: React 18 + Vite (single-page app, no router needed)
- **Styling**: Inline styles, no CSS framework. "Broadcast Modern" design system (see SPEC.md)
- **Video**: YouTube IFrame Player API for embedded playback + auto-sync
- **AI Chat**: Claude Sonnet API via Vercel serverless function (`/api/chat`)
- **Deploy**: Vercel (vercel.json preconfigured)
- **Data**: Static JSON embedded in source. Kaggle nbadb SQLite for sourcing new games.

## Commands
```bash
npm install          # install deps
npm run dev          # dev server at localhost:3000
npm run build        # production build to dist/
vercel               # deploy to Vercel
```

## Project Structure
```
fan-companion/
├── CLAUDE.md              # You are here
├── SPEC.md                # Full product spec + design system
├── index.html             # Vite entry point
├── package.json
├── vite.config.js
├── vercel.json
├── .env.example           # ANTHROPIC_API_KEY
├── .gitignore
├── src/
│   ├── main.jsx           # React mount point
│   ├── App.jsx            # Full app component (login → selector → companion)
│   └── data/
│       └── curry-record.js  # Game data package (PBP, players, catchup, jargon)
├── api/
│   └── chat.js            # Vercel serverless function (proxies Claude API)
├── tools/
│   ├── timestamp-logger.html  # Standalone tool for mapping video timestamps
│   └── normalize_pbp.py      # Converts Kaggle nbadb SQLite → app JSON
├── docs/
│   └── architecture.md       # Architecture diagram and data flow
└── public/
    └── (empty — static assets go here)
```

## Architecture
See `docs/architecture.md` for the full diagram. Key data flow:

```
YouTube Video → IFrame API → getCurrentTime() → timestamp lookup → playIndex
                                                                      ↓
                                              PLAYS[playIndex] → NOW card + feed
                                                                      ↓
                                              game context → Claude API → Ask AI chat
```

## Key Implementation Notes

### Video → PBP Sync
The app supports TWO sync modes that work together:

1. **Timestamp-based auto-sync** (preferred): `VIDEO_TIMESTAMPS` array maps video seconds to PLAYS[] indices. A 1-second polling loop calls `getCurrentTime()` and finds the matching play. Works when the team has mapped the video using `tools/timestamp-logger.html`.

2. **Proportional fallback** (always works): When no timestamps are mapped, the app distributes plays evenly across the video duration. When the video plays, plays auto-advance. When it pauses, the feed pauses. Not perfectly accurate but ensures the demo always works.

3. **Score-based manual sync** (user-initiated): User enters the score + quarter they see on screen and the app jumps to the matching play. Fallback for DVR/rewind scenarios.

### PBP Auto-Start Rule
When the YouTube player fires `onStateChange` with state PLAYING (1), the companion feed MUST start advancing immediately — no manual "Start Game" button needed. The video IS the start trigger.

### Ask AI (Claude API)
- Client calls `/api/chat` (Vercel serverless function)
- Function reads `ANTHROPIC_API_KEY` from env
- System prompt includes current game state (score, quarter, last play, player roster)
- Claude Sonnet responds with warm, concise, jargon-free explanations
- Never hardcode the API key in client code

### Adding a New Game
Each game is a self-contained data package exported from `src/data/`. To add a game:
1. Pull PBP data from Kaggle nbadb using `tools/normalize_pbp.py`
2. Write catchup content (storyline, rivalry, watch-for items)
3. Add player bios
4. Create a jargon dictionary for terms that appear in the PBP
5. Map video timestamps using `tools/timestamp-logger.html`
6. Export as a new file in `src/data/` and import in `App.jsx`

### Design System — "Broadcast Modern"
- White background (#FFFFFF), light gray surfaces (#F3F4F6)
- Header: gradient blue (#0052CC → #003D99)
- Accent blue: #0052CC (links, active states, tags)
- Accent red: #E5383B (live indicator, team color)
- Accent gold: #FF9F1C (milestones, highlights)
- Text: #111827 primary, #4B5563 secondary, #9CA3AF muted
- Border: #E5E7EB
- Font: Helvetica Neue, sans-serif
- Border radius: 10-14px for cards, 20px for pill buttons
- No dark mode for MVP

### Milestone System
Plays with a `milestone` property trigger a full-screen overlay that pauses the feed. Milestone types: `record_tie`, `record_break`, `final`. Each has a distinct icon and title. The overlay includes the milestone text and a Continue button.

## Environment Variables
```
ANTHROPIC_API_KEY=sk-ant-...   # Required for Ask AI feature
```

Set in Vercel dashboard: Settings → Environment Variables → add `ANTHROPIC_API_KEY`.

## Quality Checks
- [ ] Video plays and PBP feed starts automatically
- [ ] Pausing video pauses the feed
- [ ] Seeking video jumps the feed to the right play
- [ ] Milestone overlays fire at flagged plays
- [ ] Jargon translation cards appear on tap
- [ ] Player buttons navigate to Legacy Lens with correct player selected
- [ ] Ask AI returns contextual responses grounded in current game state
- [ ] Score-based sync modal works as fallback
- [ ] Mobile responsive at 375px-480px viewport
- [ ] Login → selector → companion flow works end to end
