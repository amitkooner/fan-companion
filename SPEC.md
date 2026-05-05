# SPEC.md — Tentpole Fan Companion

## Product Vision
An AI-powered second-screen companion for casual NBA fans who only engage during major moments. The user watches a classic NBA game video inside the app, and the companion syncs in real-time to provide context, translations, player stories, and an AI chat — all without requiring basketball knowledge.

## Target User
- Casual fan with LOW basketball literacy but HIGH cultural engagement
- Watches 5-6 tentpole games per season (Christmas, Playoffs, All-Star)
- Needs context ("why does this matter?"), translation ("what's a pick-and-roll?"), and narrative ("who is this player?")
- Uses a phone as their second screen

## Screens

### 1. NBA ID Login
- Email + password form (mock auth for hackathon)
- Username extracted from email for personalization
- Branding: basketball emoji, app name, tagline
- Bottom disclaimer: "hackathon demo — no real credentials stored"

### 2. Classic Games Selector
- Header with user greeting
- Grid/list of classic game cards, each showing:
  - Emoji thumbnail
  - Game title (the narrative hook)
  - Matchup + date subtitle
  - One-line hook sentence
- Available games show blue border, clickable
- Unavailable games ("Coming soon") show gray border, 55% opacity, non-clickable
- Selecting a game loads its full data package and navigates to companion

### 3. Companion (main experience)
Split into: Header, Video, Tabs, Content

#### Header
- Gradient blue background (#0052CC → #003D99)
- "← Games" back button (top left)
- "FAN COMPANION" badge in gold (top center)
- Username (top right)
- White scoreboard card with:
  - Away team abbreviation (blue) + record
  - Score (large, tabular-nums) with dash separator
  - Home team abbreviation (red) + record
  - Game clock or status (PRE-GAME / Q1 · 5:58 / FINAL)

#### Video Panel
- YouTube video embedded via IFrame API (16:9 aspect ratio, rounded corners)
- Below video: sync status indicator
  - Auto-sync active: green dot + "Auto-syncing with video"
  - Manual sync: helper text + "Sync" button
- Video is always visible (no toggle) — it IS the primary experience

#### Tabs
Four tabs: **Catch-Up** | **Live Feed** | **Legacy Lens** | **Ask AI**
- Active tab: blue text + blue bottom border
- Inactive: gray text

#### Tab: Catch-Up
- Game title (h2)
- Storyline paragraph
- Divider
- "The backstory" section
- Divider
- "What to watch for" — arrow-prefixed list items
- Pre-game only: no start button needed (video is the trigger)

#### Tab: Live Feed
- **NOW card** (top, prominent):
  - Blue background (#F0F6FF) with blue border, or gold for milestones
  - Red dot + "LIVE" badge + game clock (right-aligned)
  - Play description (16px, bold)
  - Action buttons: jargon translation pill (blue), player lookup pill (red)
- **Earlier plays** section header with count badge
- **Scrolling history**: reverse chronological, dimmed to 60% opacity
  - Milestone plays at full opacity with gold left border
  - Each row: quarter + clock | description | score

**Milestone overlays**: Full-screen semi-transparent overlay (white 92% opacity) with centered card:
  - Icon (emoji), title (gold text, letterspaced), description, stat callout, Continue button
  - Types: record_tie (⭐), record_break (🏆), final (🏁)

**Translation cards**: Inline card below tabs with term in blue, explanation text, close button

#### Tab: Legacy Lens
- 2-column player grid (name, number, team, position)
- Selected player detail card:
  - Name, number, team, position
  - Bio paragraph
  - Career stat card (if applicable)
- "Historic moments" section showing milestones that have occurred so far

#### Tab: Ask AI
- Chat interface (message bubbles)
- User messages: blue background, right-aligned, rounded (bottom-right sharp)
- Assistant messages: gray background, left-aligned, rounded (bottom-left sharp)
- "Thinking..." indicator during API call
- Input bar: text input + Send button, pinned to bottom
- System prompt includes current game state for contextual responses

## Data Architecture

### Game Data Package
Each classic game is a self-contained object:
```
{
  id, ytId, title, subtitle, hook, thumb, date, venue,
  away: { abbr, record },
  home: { abbr, record },
  catchup: { storyline, rivalry, watchFor[] },
  players: { key: { name, number, team, position, bio, careerThrees? } },
  plays: [{ q, time, away, home, desc, player?, type, jargon?, milestone? }],
  timestamps: [{ sec, playIdx }],
  jargon: { term: explanation }
}
```

### Play Types
`jumpball`, `fg`, `fg3`, `ft`, `miss`, `miss3`, `foul`, `rebound`, `turnover`, `timeout`, `quarter_end`, `period_start`

### Video Sync Logic
1. YouTube IFrame API `onStateChange` detects PLAYING (1), PAUSED (2), ENDED (0)
2. When PLAYING:
   - If `timestamps[]` has entries: poll `getCurrentTime()` every 1s, lookup nearest play via `findPlayByTimestamp()`
   - If `timestamps[]` is empty: use proportional fallback — estimate play position as `(currentTime / duration) * totalPlays`
3. When PAUSED: stop polling, feed freezes
4. When user seeks: next poll picks up new position automatically
5. Score-based sync: fuzzy-match `(awayScore, homeScore, quarter)` against PLAYS[]

### Claude API Integration
- Client POST to `/api/chat` with messages array
- Serverless function adds API key from env, forwards to Anthropic API
- System prompt template:
  ```
  You are the Fan Companion AI for {away} vs {home}, {date} at {venue}.
  "{title}". Be warm, concise (2-3 sentences), use everyday analogies.
  Never condescending. Players: {roster}.
  Current game: Q{q} {time}, {away} {awayScore} - {home} {homeScore}.
  Last play: {desc}
  ```

## Design System — "Broadcast Modern"

### Colors
| Token | Hex | Usage |
|-------|-----|-------|
| blue | #0052CC | Primary accent, links, active states |
| blueD | #003D99 | Header gradient end |
| blueL | #F0F6FF | NOW card bg, active tag bg |
| blueB | #B5D4F4 | Card borders, sync button border |
| red | #E5383B | Live dot, home team, player tags |
| redL | #FFF1F2 | Player tag bg |
| gold | #FF9F1C | Milestones, highlights |
| goldL | #FFF7ED | Milestone card/overlay bg |
| goldT | #92400E | Milestone text |
| tx | #111827 | Primary text |
| tx2 | #4B5563 | Secondary text |
| txM | #9CA3AF | Muted text, labels |
| bg | #FFFFFF | Page background |
| bg2 | #F3F4F6 | Surface, input backgrounds |
| bdr | #E5E7EB | Borders |

### Typography
- Font: `'Helvetica Neue', Helvetica, Arial, sans-serif`
- Scores: 34px, weight 800, tabular-nums
- Team abbreviations: 20px, weight 800
- NOW card description: 16px, weight 600
- Body text: 14px, weight 400, line-height 1.65
- Labels/badges: 9-11px, weight 700, letterspaced

### Components
- Cards: border-radius 14px, 1.5px border, optional box-shadow
- Pills/tags: border-radius 20px, 5px 14px padding, 12px font
- Buttons: border-radius 10px, 10px 18px padding, weight 700
- Inputs: border-radius 10-12px, 1.5-2px border, bg2 background
- Modals: fixed overlay (black 35%), centered card with 16px border-radius, box-shadow

### Mobile
- Max-width: 480px, centered
- Touch targets: minimum 44px height for all interactive elements
- Video: 16:9 aspect ratio, 10px border-radius
