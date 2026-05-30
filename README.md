# Hue Hunt

A mobile-first daily color scavenger hunt. Every day, everyone gets the same color. Go find it in the real world.

## Local Development

```bash
# Install dependencies
npm install

# Run dev server (local only)
npm run dev

# Run dev server exposed on your LAN (for phone testing)
npm run dev:host
```

**Testing on your phone:**
1. Run `npm run dev:host`
2. Note the `Network:` URL shown in the terminal (e.g. `http://192.168.1.42:5173`)
3. Open that URL on your phone (same WiFi network)
4. For camera: must use HTTPS or localhost — Chrome on Android may require you to enable `chrome://flags/#unsafely-treat-insecure-origin-as-secure` for your laptop's IP during testing, or use `localhost` with USB tethering/port forwarding.

**Camera testing tip:** On iOS Safari, `capture="environment"` works fine over HTTP on LAN. On Android Chrome, you may need HTTPS. Quick solution: `npx serve dist --ssl` after building, or use Ngrok.

## Build

```bash
npm run build
# Output in dist/
```

## Free Deployment

### Option A: Cloudflare Pages (recommended)
1. Push this repo to GitHub
2. Go to [pages.cloudflare.com](https://pages.cloudflare.com)
3. Connect your GitHub repo
4. Build command: `npm run build`
5. Build output: `dist`
6. Deploy → get `your-app.pages.dev` free

### Option B: Vercel
```bash
npm install -g vercel
npm run build
vercel --prod
```

Both are **$0** with a free subdomain.

## Tech Stack

- React 18 + Vite + TypeScript
- IndexedDB (idb-keyval) — all data on device
- No backend, no accounts, no analytics
- PWA — works offline after first load

## Architecture

```
src/
  pages/         Today, Camera (overlay), Streak
  lib/           palette, seed, scorer, white-balance, db, share, utils
  components/    BottomNav, HowToPlay, ScoreRing, Toast
  assets/        palette.json (365 colors)
public/
  manifest.json  PWA
  sw.js          Service worker (offline cache)
```

## Notes for Claude Code

See `CLAUDE.md` for the complete build spec. Key implementation decisions:
- Duplicate photo detection via perceptual hash (8×8 average hash, hamming distance ≤ 10)
- Single button on result screen (Try Again OR Done — not both, except a small secondary retry link)
- Score for the day = number of colors found that day (the score displayed is the match percentage, which must be ≥ 40% to count)
- All dates UTC so everyone worldwide sees the same color
