# 🏀 Tentpole Fan Companion

AI-powered second-screen companion for casual NBA fans watching classic games. Built for the NBA.

## 🎯 What It Does

Watch legendary NBA moments with an AI companion that:
- **Explains jargon** in plain language ("What's a pick-and-roll?")
- **Tells player stories** (career arcs, biographical context)
- **Tracks milestones** (record-breaking moments with full-screen overlays)
- **Answers questions** with Claude AI (game-aware, contextual responses)
- **Syncs to video** automatically (YouTube IFrame API integration)

## 🎮 Demo

Currently features **Steph Curry breaking Ray Allen's 3-point record** (Dec 14, 2021 @ MSG).

## 🏗️ Tech Stack

- **Frontend:** React 18 + Vite
- **AI:** Claude Sonnet 4 (Anthropic API)
- **Video:** YouTube IFrame Player API
- **Styling:** Inline styles, "Broadcast Modern" design system
- **Deploy:** Vercel

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Add your API key
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY

# Start dev server
npm run dev

# Build for production
npm run build
```

## 📱 Features

### Classic Mode (Current)
- ✅ Video-synced play-by-play feed
- ✅ Jargon translator (tap terms for explanations)
- ✅ Player bios (Legacy Lens)
- ✅ Milestone overlays (record-breaking moments)
- ✅ AI chat (Ask AI with game context)
- ✅ Score-based manual sync (fallback)
- ✅ Mobile-responsive (375px-480px)

### Live Mode (Roadmap)
- Real-time NBA game notifications
- Multi-game switching
- Push notifications for milestones
- Azure AI Foundry integration

## 📂 Project Structure

```
fan-companion/
├── src/
│   ├── App.jsx              # Main app component
│   ├── main.jsx             # React mount point
│   └── data/
│       └── curry-record.js  # Game data (PBP, players, jargon)
├── api/
│   └── chat.js              # Vercel serverless function (Claude API)
├── tools/
│   ├── timestamp-logger.html  # Video timestamp mapper
│   └── normalize_pbp.py      # Kaggle nbadb → JSON converter
├── docs/
│   ├── architecture.md      # Architecture diagram
│   └── ...
├── CLAUDE.md                # Implementation guide
├── SPEC.md                  # Design system + UI spec
├── BACKLOG.md               # Task backlog
├── DEPLOY.md                # Vercel deployment guide
└── unified-requirements_Amit.md  # Full requirements doc
```

## 🎨 Design System

**"Broadcast Modern"** — Clean, accessible, sports-broadcast aesthetic:
- White background, light gray surfaces
- Blue accent (#0052CC), red live indicators, gold milestones
- Helvetica Neue font stack
- 10-14px border radius for cards
- Mobile-first, touch-optimized (44px minimum targets)

## 🔧 Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-...   # Required for Ask AI
```

Set in Vercel: Dashboard → Settings → Environment Variables

## 📦 Deployment

See [DEPLOY.md](./DEPLOY.md) for full guide.

**Quick deploy to Vercel:**
1. Push to GitHub
2. Go to https://vercel.com/new
3. Import repository
4. Add `ANTHROPIC_API_KEY` environment variable
5. Deploy

## 🧪 Testing

```bash
# Run score sync tests
node test-score-sync.js
```

## 📋 Roadmap

- [x] Phase 1: Classic Mode MVP (Curry record game)
- [ ] Phase 1.5: Add 3 more classic games (LeBron, Kobe, Dame)
- [ ] Phase 2: Live Mode backend (FastAPI + Cosmos DB)
- [ ] Phase 3: Push notifications + personalization
- [ ] Phase 4: Premium features (Prime Video integration, voice input)

## 📄 Documentation

- **[CLAUDE.md](./CLAUDE.md)** — Implementation guide for Claude Code
- **[SPEC.md](./SPEC.md)** — Product spec + design system
- **[BACKLOG.md](./BACKLOG.md)** — Task backlog (Phase 1-4)
- **[DEPLOY.md](./DEPLOY.md)** — Deployment guide
- **[unified-requirements_Amit.md](./unified-requirements_Amit.md)** — Dual-mode architecture requirements

## 🤝 Contributing

This is an internal NBA project. See `BACKLOG.md` for planned features.

## 📝 License

© 2026 National Basketball Association. All rights reserved.

---

**Built with Claude Code** | [Report Issues](https://github.com/amitkooner/fan-companion/issues)
