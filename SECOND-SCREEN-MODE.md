# 📺 Second-Screen Mode

The Fan Companion is designed as a **true second-screen experience** — users watch the game on TV, YouTube, or League Pass, and use the companion on their phone for context.

## 🎯 Why Second-Screen?

### ❌ Embedded Video Problems:
- YouTube restricts NBA video embeds
- Small mobile video player is hard to watch
- Users want to watch on **TV** anyway

### ✅ Second-Screen Benefits:
- Works with **any video source** (TV, YouTube, League Pass, broadcast)
- No embed restrictions
- Natural use case: phone as companion while watching big screen
- Matches how fans actually watch games

---

## 🚀 How It Works

### User Flow:

1. **User opens companion** on phone
2. **Starts watching game** on TV/YouTube/League Pass
3. **Clicks "Start Watching"** in companion
4. **Enters current score** they see on screen (e.g., Warriors 45, Celtics 42, Q2)
5. **Companion syncs** and auto-advances plays every 8 seconds
6. **User enjoys** contextual explanations, jargon translations, player bios, AI chat

### Auto-Advance:
- Plays advance every **8 seconds** (average NBA play duration)
- Users can **pause** if they need to catch up
- Users can **re-sync** if they drift out of sync
- **Natural feel** — keeps pace with live game

---

## 🎮 Features in Second-Screen Mode

### ✅ What Works:
- **Manual sync** via score entry (one time at start)
- **Auto-advance** — plays move forward automatically
- **All companion features:**
  - Jargon translator
  - Player bios (Legacy Lens)
  - Milestone overlays
  - Ask AI chat
  - Score flash animations
  - Live feed with NOW card

### 🔄 Sync Controls:
- **Pause button** — stops auto-advance (user can manually browse plays)
- **Re-sync button** — opens sync modal if user drifts out of sync
- **Watch on YouTube link** — opens video in new tab for easy access

---

## 🏗️ Technical Implementation

### State Management:
```javascript
const [secondScreenMode, setSecondScreenMode] = useState(false);
const [autoAdvanceTimer, setAutoAdvanceTimer] = useState(null);
```

### Auto-Advance Logic:
```javascript
const startAutoAdvance = () => {
  const timer = setInterval(() => {
    setIdx(prev => {
      if (prev >= plays.length - 1) {
        clearInterval(timer);
        return prev;
      }
      return prev + 1;
    });
  }, 8000); // 8 seconds per play
  setAutoAdvanceTimer(timer);
};
```

### Sync Trigger:
- User clicks "Start Watching"
- Enters score + quarter in modal
- `doScoreSync()` finds matching play via fuzzy match
- Enables `secondScreenMode` and starts auto-advance

---

## ⚙️ Configuration

### Auto-Advance Speed:
Adjust in `startAutoAdvance()`:
```javascript
}, 8000); // milliseconds (8 seconds default)
```

**Recommendations:**
- **8-10 seconds** for regular game flow
- **5-6 seconds** for fast-paced highlights
- **12-15 seconds** for slow, deliberate games

### Sync Accuracy:
The `findPlayByScore()` function uses **Manhattan distance** for fuzzy matching:
- Finds closest play when exact match doesn't exist
- Handles score entry errors (off by 1-2 points)
- Works across all quarters

---

## 📱 UI Design

### Second-Screen Panel:
- **Gradient background** (blue to white)
- **📺 Icon** — reinforces TV watching metaphor
- **Clear instructions** — "Watch on TV, YouTube, or League Pass"
- **Prominent CTA** — "Start Watching" button (blue, shadowed)
- **Status indicator** — Green pulsing dot when following game
- **Controls row** — Pause / Re-sync buttons

### States:
1. **Pre-sync:** Shows "Start Watching" button
2. **Active:** Shows status + Pause/Re-sync controls
3. **Paused:** Auto-advance stopped, user can resume

---

## 🔮 Future Enhancements

### Phase 2: Smart Sync
- **Audio fingerprinting** — Chromaprint/AcoustID to detect broadcast audio
- **Automatic sync** — No manual score entry needed
- **Works with live TV** — Companion listens to broadcast and syncs automatically

### Phase 3: Multi-Source Support
- **League Pass integration** — Official API for exact sync
- **Amazon Prime Video** — Second-screen API partnership
- **Cable/Streaming** — HDMI audio detection for local sync

### Phase 4: Predictive Sync
- **Machine learning** — Predicts next play based on game flow
- **Adaptive timing** — Auto-advance speed adjusts to game pace
- **Score validation** — Checks if displayed score matches expected score

---

## 🧪 Testing Second-Screen Mode

### Test Flow:
1. Open companion on phone: https://your-app.vercel.app
2. Open YouTube on laptop: https://youtube.com/watch?v=VIDEO_ID
3. Play video, note the score at ~2 minutes in
4. In companion: click "Start Watching"
5. Enter the score you see
6. Verify: companion jumps to matching play
7. Wait 8 seconds, verify: next play appears
8. Test controls: Pause, Re-sync

### Expected Behavior:
- ✅ Companion advances every 8 seconds
- ✅ NOW card shows current play matching video
- ✅ Pause stops advancement
- ✅ Re-sync allows manual correction
- ✅ All features work (jargon, players, chat)

---

## 💡 Use Cases

### 1. Watching Live Game on TV
User watching Christmas Day game on ABC:
- Opens companion on phone
- Enters current score during timeout
- Companion follows along with context

### 2. Watching Replay on League Pass
User watching classic game on League Pass:
- Opens companion
- Syncs to current score
- Gets milestone alerts, jargon explanations

### 3. Watching YouTube Highlights
User watching condensed game on YouTube:
- Opens YouTube on laptop
- Opens companion on phone
- Syncs and follows along

### 4. Watching with Friends (Split Attention)
User watching game at a bar, half-paying attention:
- Companion keeps them caught up
- Can pause when distracted
- Re-sync when they tune back in

---

## 📊 Metrics to Track

### Engagement:
- **Sync rate** — % users who click "Start Watching"
- **Re-sync rate** — % users who need to re-sync (indicates drift)
- **Pause rate** — % users who pause auto-advance
- **Session duration** — Average time in second-screen mode

### Quality:
- **Sync accuracy** — % of syncs that land within 2 plays of correct position
- **Drift rate** — Average number of plays off-sync after 10 minutes
- **Feature usage** — % users who tap jargon/player buttons in second-screen mode

---

## 🤝 NBA Partnership Opportunities

### What We Need:
1. **Official video embed permissions** — Whitelist our domain for YouTube embeds
2. **League Pass API** — Direct sync with official video player
3. **Amazon Prime Video partnership** — Second-screen API for TNT games

### What We Offer:
- **Increased engagement** — Fans stay tuned longer with companion
- **Accessibility** — Casual fans learn the game
- **Monetization** — Premium features, sponsored content

---

## ✅ Advantages Over Embedded Video

| Feature | Embedded Video | Second-Screen Mode |
|---------|----------------|-------------------|
| **Works with YouTube** | ❌ Often blocked | ✅ Always works |
| **Works with TV** | ❌ No | ✅ Yes |
| **Works with League Pass** | ❌ No | ✅ Yes |
| **Mobile-friendly** | ⚠️ Small player | ✅ Full-screen on TV |
| **Real-world use case** | ⚠️ Awkward on phone | ✅ Natural second screen |
| **No permissions needed** | ❌ Requires embed rights | ✅ Works anywhere |

---

**Second-Screen Mode turns the "YouTube embed problem" into a feature** — it's how fans actually watch games anyway!
