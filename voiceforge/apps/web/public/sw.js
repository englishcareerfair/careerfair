/**
 * VoiceForge Service Worker (Application Shell & Offline Cache)
 * Notice: Service worker caching caches application UI assets for offline launch.
 * It does NOT install multi-gigabyte PyTorch AI models or execute heavy GPU models in the browser.
 * Heavy inference runs in the local Python inference engine (localhost:8765) or configured cloud providers.
 */

const CACHE_NAME = 'voiceforge-shell-v1';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Do not intercept or cache local Python API requests or audio generation streams
  if (url.port === '8765' || url.pathname.startsWith('/api/') || url.pathname.startsWith('/tts/')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).catch(() => caches.match('/index.html')))
  );
});
