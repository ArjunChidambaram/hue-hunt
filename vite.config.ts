import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Using vite-plugin-pwa for service worker + manifest generation
// Alternatively, manual sw.js in public/ also works (see public/sw.js)
export default defineConfig({
  plugins: [react()],
  // BASE_PATH is injected by the GitHub Actions workflow as /repo-name/
  // Falls back to / for local dev and Cloudflare Pages
  base: process.env.BASE_PATH ?? '/',
  build: {
    target: 'es2020',
    sourcemap: false,
  },
  server: {
    host: false,
  },
})
