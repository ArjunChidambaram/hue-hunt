// Service Worker — hybrid strategy:
//   index.html  → network-first (so app updates reach users)
//   all assets  → cache-first  (Vite adds content hashes, so stale is never an issue)
// IndexedDB (streaks/finds) is a completely separate storage system —
// this cache is never touched by SW cache management.

const CACHE = 'hue-hunt-v2'

const PRECACHE = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  if (!event.request.url.startsWith(self.location.origin)) return

  const url = new URL(event.request.url)
  const isNavigation = event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')

  if (isNavigation) {
    // Network-first for HTML — ensures users get app updates immediately.
    // Falls back to cache if offline.
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.status === 200) {
            const clone = response.clone()
            caches.open(CACHE).then(cache => cache.put(event.request, clone))
          }
          return response
        })
        .catch(() => caches.match(event.request))
    )
    return
  }

  // Cache-first for all other assets (JS, CSS, images, fonts).
  // Vite fingerprints asset filenames with content hashes, so a new
  // deployment produces new URLs — stale cache entries are harmless.
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached
      return fetch(event.request).then(response => {
        if (response.status === 200) {
          const clone = response.clone()
          caches.open(CACHE).then(cache => cache.put(event.request, clone))
        }
        return response
      })
    })
  )
})
