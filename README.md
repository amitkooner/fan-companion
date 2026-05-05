# Tentpole Fan Companion

AI-powered second-screen experience for casual NBA fans.

## Quick Start

```bash
npm install
npm run dev          # localhost:3000
```

## Deploy

```bash
# Set your API key in Vercel dashboard → Settings → Environment Variables
# ANTHROPIC_API_KEY=sk-ant-...

vercel
```

## Map Video Timestamps

```bash
open tools/timestamp-logger.html
# Watch video, click Map on each play, Copy JSON, paste into src/data/curry-record.js
```

See CLAUDE.md for full architecture and SPEC.md for product requirements.
