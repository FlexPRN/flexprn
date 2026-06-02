// Flexprn Service Worker — handles offline caching and install
// Bump these version numbers any time you change cached assets, to force a refresh.
const CACHE_NAME = 'flexprn-v2'
const RUNTIME_CACHE = 'flexprn-runtime-v2'

// Files cached at install time
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
]

// Install: cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  )
})

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map(name => caches.delete(name))
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch: network-first for navigation/API, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Never cache API calls (Supabase, Mapbox, Resend, etc)
  if (
    url.hostname.includes('supabase') ||
    url.hostname.includes('mapbox') ||
    url.hostname.includes('resend') ||
    url.pathname.includes('/auth/') ||
    request.method !== 'GET'
  ) {
    return  // let it pass through normally
  }

  // For navigation requests, try network first, fall back to cached homepage
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    )
    return
  }

  // For static assets (images, fonts, etc), cache first
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached
      return fetch(request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone()
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, responseClone))
        }
        return response
      }).catch(() => cached)
    })
  )
})