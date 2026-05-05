# Deployment Guide — Vercel

## Quick Deploy (Recommended)

### Option 1: Vercel Dashboard (No CLI needed)

1. **Go to:** https://vercel.com/new
2. **Import Git Repository:**
   - Click "Add New..." → "Project"
   - Connect your GitHub account (if not already)
   - Import this repository
3. **Configure Project:**
   - Framework Preset: **Vite** (auto-detected)
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
4. **Add Environment Variable:**
   - Go to Settings → Environment Variables
   - Add: `ANTHROPIC_API_KEY` = `your-api-key-here`
   - Make sure it's available for **Production**, **Preview**, and **Development**
5. **Deploy:**
   - Click "Deploy"
   - Wait ~1-2 minutes for build
   - Get your URL: `https://your-project.vercel.app`

---

## Option 2: Vercel CLI

If you want to deploy from the command line:

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (first time)
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name? tentpole-fan-companion
# - Directory? ./
# - Override settings? No

# After first deploy, set environment variable:
vercel env add ANTHROPIC_API_KEY

# Paste your API key when prompted
# Select: Production, Preview, Development (all three)

# Deploy to production
vercel --prod
```

---

## Post-Deployment Checklist

After deployment, test these features:

### ✅ Basic Flow
- [ ] Login screen loads
- [ ] Can enter email and proceed to game selector
- [ ] Game selector shows 4 games (1 ready, 3 coming soon)
- [ ] Clicking Curry game loads companion screen

### ✅ Video
- [ ] YouTube video embed loads and plays
- [ ] Video controls work (play, pause, seek)
- [ ] Pausing video pauses the feed
- [ ] Feed syncs to video (proportional mode)

### ✅ Features
- [ ] Catch-Up tab shows storyline, backstory, watch-for
- [ ] Auto-switches to Live Feed when video plays
- [ ] NOW card updates as video plays
- [ ] Jargon translator works (blue pill → explanation card)
- [ ] Player buttons work (red pill → Legacy Lens with player selected)
- [ ] Milestone overlay appears at record-breaking plays
- [ ] Score flash animation triggers on score changes

### ✅ Ask AI
- [ ] Chat input works
- [ ] Sends message to `/api/chat`
- [ ] Returns AI response from Claude
- [ ] Error handling if API key is missing

### ✅ Mobile
- [ ] Responsive layout at 375px-480px viewport
- [ ] Touch targets are at least 44px
- [ ] Scrolling works smoothly
- [ ] No horizontal overflow

---

## Troubleshooting

### Video won't load / "Video unavailable"
**Issue:** YouTube video has embed restrictions

**Fix:**
1. Open `src/data/curry-record.js`
2. Change `ytId` to a different embeddable video
3. Test videos known to work:
   - `Sz0VJE7gAYU` (Curry highlights - currently set)
   - Try searching YouTube for "steph curry record embeddable"
4. Rebuild: `npm run build`
5. Redeploy: `vercel --prod`

### API Chat not working / "ANTHROPIC_API_KEY not configured"
**Issue:** Environment variable not set in Vercel

**Fix:**
1. Go to Vercel Dashboard → Your Project → Settings
2. Click "Environment Variables"
3. Add `ANTHROPIC_API_KEY` with your key
4. Make sure it's checked for: Production, Preview, Development
5. Redeploy (or trigger a new build from Dashboard)

### Build fails with "Module not found"
**Issue:** Missing dependencies

**Fix:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Rebuild locally to test
npm run build

# If successful, push and redeploy
git add package-lock.json
git commit -m "Fix dependencies"
git push
```

### /api/chat returns 404
**Issue:** Vercel isn't recognizing the API route

**Fix:**
- Make sure `api/chat.js` exists in the repo
- Check `vercel.json` is present
- In Vercel Dashboard → Settings → Functions, verify:
  - Functions are enabled
  - Region is set (auto is fine)

---

## Custom Domain (Optional)

To add a custom domain:

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your domain (e.g., `nba-companion.example.com`)
3. Follow DNS configuration instructions
4. Wait for DNS propagation (~5-10 minutes)

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key for Ask AI feature (starts with `sk-ant-`) |

---

## URLs After Deployment

After deploying, you'll get:

- **Production:** `https://your-project.vercel.app`
- **Preview (per commit):** `https://your-project-git-branch.vercel.app`
- **API endpoint:** `https://your-project.vercel.app/api/chat`

Share the production URL to test on your phone!

---

## Monitoring

Vercel provides:

- **Analytics:** Dashboard → Analytics (page views, unique visitors)
- **Logs:** Dashboard → Deployments → Click deployment → View Function Logs
- **Usage:** Dashboard → Usage (API calls, bandwidth, build minutes)

---

## Redeploying

To redeploy after code changes:

```bash
# Commit your changes
git add .
git commit -m "Your changes"
git push

# Vercel auto-deploys from git pushes!
# Or manually trigger:
vercel --prod
```

---

**Ready to deploy!** Follow Option 1 (Dashboard) for the easiest experience.
