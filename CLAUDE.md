# HUE HUNT — Claude Code Instructions

You are building **Hue Hunt**, a mobile-first web app where every user sees the same color each day (determined by UTC date, no server). They find the color in the world, snap a photo, and the app scores how well it matches.

## Stack
- React 18 + Vite + TypeScript
- `idb-keyval` for IndexedDB storage
- CSS Modules or plain CSS (no Tailwind — keep bundle small)
- Google Fonts: Fraunces or Lora for serif color name display
- No backend. No accounts. No analytics. Zero network after first load.

## Project Structure (already scaffolded — fill in each file)

```
src/
  pages/
    Today.tsx         # Color swatch + Find It button + share
    Camera.tsx        # Full-screen camera overlay / result screen
    Streak.tsx        # Year grid + stats
  lib/
    palette.ts        # imports palette.json, exports typed Color[]
    seed.ts           # getTodayColor(palette) → Color
    scorer.ts         # scoreImage() + scoreImageGrid()
    white-balance.ts  # estimateWhiteBalance()
    db.ts             # IndexedDB wrappers (idb-keyval)
    share.ts          # generateShareText() + handleShare()
    utils.ts          # utcDateString(), previousDay(), nextDay(), rgbToHsl(), clamp()
  assets/
    palette.json      # 365 named colors (see spec below)
  components/
    BottomNav.tsx     # Two-tab nav (Today | Streak)
    HowToPlay.tsx     # Overlay/modal explaining the game (triggered from top button)
    ScoreRing.tsx     # Animated SVG ring for match score display
    Toast.tsx         # Brief "Copied!" / feedback toast
  App.tsx             # Router (Today / Streak) + HowToPlay overlay
  main.tsx
  index.css           # Global styles, CSS variables
public/
  manifest.json       # PWA manifest
  sw.js               # Service worker (cache-first, offline)
  icon-192.png        # Generate a simple colored square icon
  icon-512.png
```

## Key Decisions Already Made

### Scoring
- Resize captured image to 200×200 on a hidden canvas before scoring
- Sample 500 random pixels for overall score
- 5×5 grid scoring uses 20 samples per cell
- Apply white balance correction before comparing
- Tolerance bands: warm {hue:15, sat:25, light:30}, cool {hue:20, sat:25, light:25}, neutral {hue:30, sat:15, light:20}

### Photo Comparison (CRITICAL - prevents same-photo resubmission)
When user submits a photo, compare it against the stored TodayPhoto (if one exists) to detect re-submission of the same image. Use perceptual hashing:
- Resize both to 8×8 grayscale on canvas
- Compute average pixel value
- Create 64-bit hash: each pixel > average = 1, else = 0
- Hamming distance ≤ 10 (out of 64) = "same photo"
- If same photo detected: show message "That's the same photo! Get outside and find a new one 📸" and re-trigger the camera input
- Store the pHash of TodayPhoto alongside the blob in IndexedDB

### Camera Flow (ONE BUTTON, no complexity)
- Single "Find It" button on Today screen
- Tapping it triggers `<input type="file" accept="image/*" capture="environment">` (hidden input, ref-triggered)
- After photo taken → show result screen (score ring + comparison + feedback)
- If same photo → message + auto-re-trigger camera (no extra button needed)
- Result screen has ONE button: if score < 20% show "Try Again" only; if score ≥ 20% show "Done" (saves) — optionally also show "Try Again" to beat score
- Actually: simplify to ONE button always. If < threshold (40%), button says "Try Again" and re-opens camera. If ≥ threshold, button says "Done ✓" and saves + returns to Today.

### Score Thresholds
| Match % | Feedback | Button |
|---------|----------|--------|
| < 20% | "Keep looking! 👀" | Try Again |
| 20–40% | "Getting warmer — try closer or better lighting" | Try Again |
| 40–60% | "Not bad! Try again to get a better score" | Done / Try Again |
| > 60% | "Found it! 🎉" | Done |

### Data Model
```typescript
interface Find {
  date: string;       // "2026-06-15" UTC
  colorIndex: number;
  colorName: string;
  matchScore: number; // best score of the day
  foundAt: string;    // ISO timestamp
  grid: boolean[][];  // 5×5
  pHash?: string;     // 64-char binary string of last submitted photo hash
}

interface TodayPhoto {
  date: string;
  blob: Blob;
  pHash: string;      // for duplicate detection
}
```

### How to Play
- Small "?" button in top-right corner of Today screen (or top bar)
- Tapping opens a full-screen overlay (not a new route)
- Content: "Every day, everyone gets the same color. Go find it in the real world. Snap a photo. The app scores how well it matches. Build your streak." + simple example
- One "Got it!" button to dismiss

### Today Screen Layout (top → bottom)
1. Top bar: app name left, "?" how-to-play right
2. Streak badge ("🔥 12" or "Start your streak!")
3. Large circular color swatch (≥200px, centered)
4. Color name (serif, large)
5. Hex value (small mono)
6. "Find It" button (large, full-width-ish, primary)
7. If found today: small photo thumbnail + score + "Share" button + "Try to beat it?" link

### Streak Screen
- Year grid: 52 columns × 7 rows, CSS Grid
- Each cell 12×12px, 2px gap
- Found days: filled with that day's color
- Missed past days: faint gray (#E5E5E5) outline only
- Future days: completely invisible (opacity: 0 or display:none)
- Today not-yet-found: pulsing outline animation in today's color
- Tap filled cell → small tooltip (color name, score%, date)
- Stats below: Current Streak (big), Longest Streak, Colors Found (X/365), Best Match

### Sharing
```
🎨 Color of the Day

🟫 Burnt Sienna

🔥 Day 12
🎯 78%

⬜⬜🟫⬜⬜
⬜🟫🟫🟫⬜
🟫🟫🟫🟫🟫
⬜🟫🟫🟫⬜
⬜⬜🟫⬜⬜

coloroftheday.app
```
- Copy to clipboard first, then try navigator.share
- Show "Copied!" toast either way

### Design Tokens (use CSS variables in index.css)
```css
--bg: #FAFAF8;
--fg: #1A1A1A;
--muted: #888;
--border: #E5E5E5;
--radius: 12px;
--font-serif: 'Fraunces', Georgia, serif;
--font-sans: system-ui, -apple-system, sans-serif;
```

### PWA
- manifest.json already scaffolded
- sw.js: cache-first for all app assets, no network requests needed
- Register service worker in main.tsx

### Local Testing
Run `npm run dev -- --host` to expose on local network. Access from phone via `http://<laptop-ip>:5173`. The `--host` flag is important for mobile testing.

### Free Deployment
Use **Cloudflare Pages** (free tier):
1. `npm run build` → `dist/` folder
2. Push to GitHub → connect to Cloudflare Pages → auto-deploys on push
3. Custom domain optional; get `<name>.pages.dev` free
Alternative: Vercel (`vercel --prod` from dist)

## palette.json Spec
365 objects, format:
```json
{"index": 0, "name": "Cobalt", "hex": "#0047AB", "hsl": [215, 100, 34], "category": "cool"}
```
Categories: "warm" | "cool" | "neutral"
All 365 names must be real evocative color words (no "Blue #4"). HSL must match hex.
Generate all 365 before implementing other files — everything depends on this.

## Implementation Order
1. `palette.json` (all 365 colors)
2. `src/lib/utils.ts`
3. `src/lib/palette.ts`
4. `src/lib/seed.ts`
5. `src/lib/white-balance.ts`
6. `src/lib/scorer.ts`
7. `src/lib/db.ts`
8. `src/lib/share.ts`
9. `src/index.css`
10. `src/components/ScoreRing.tsx`
11. `src/components/Toast.tsx`
12. `src/components/HowToPlay.tsx`
13. `src/components/BottomNav.tsx`
14. `src/pages/Camera.tsx`
15. `src/pages/Today.tsx`
16. `src/pages/Streak.tsx`
17. `src/App.tsx`
18. `src/main.tsx`
19. `public/manifest.json`
20. `public/sw.js`

## Non-Negotiables
- All dates UTC
- Camera only (no file picker / gallery) — `capture="environment"`
- ONE button on camera result screen
- Duplicate photo detection via perceptual hash
- Today's photo only — purge on day rollover
- Zero network after first load
- Works offline
- Mobile-first (375px viewport primary)
- No dark mode in v1
