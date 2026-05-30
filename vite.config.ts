import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Using vite-plugin-pwa for service worker + manifest generation
// Alternatively, manual sw.js in public/ also works (see public/sw.js)
export default defineConfig({
  plugins: [react()],
  // Keep it simple — manual PWA files in public/
  // If you want auto-generated SW, install vite-plugin-pwa and configure here
  build: {
    target: 'es2020',
    sourcemap: false,
  },
  server: {
    // Run `npm run dev:host` to expose on LAN for phone testing
    host: false,
  },
})
