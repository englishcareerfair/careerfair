// Career Fair 2026 - Service Worker
const CACHE_NAME = 'cf-cache-v21.2-key-pool-promotion-voice-test-fix';

// Critical shell assets to pre-cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/loader.js',
  '/app.js',
  '/voicelab.js',
  '/dopamine-engine.js',
  '/game-completion-detector.js',
  '/dossier-pdf.js',
  '/guide-avatar.js',
  '/qrcode.min.js',
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-512-maskable.png',
  '/favicon.svg',
  '/manifest.json',
  '/audio/greeting/greeting_default.mp3',
  '/audio/greeting/greeting_SAz9YHcvj6GT2YYXdXww.mp3',
  '/audio/greeting/greeting_JBFqnCBsd6RMkjVDRZzb.mp3',
  '/audio/greeting/greeting_EXAVITQu4vr4xnSDxMaL.mp3',
  '/audio/greeting/greeting_Xb7hH8MSUJpSbSDYk0k2.mp3',
  '/audio/greeting/greeting_IKne3meq5aSn9XLyUdCD.mp3',
  '/audio/tutorial/tutorial_default.mp3',
  '/audio/tutorial/tutorial_SAz9YHcvj6GT2YYXdXww.mp3',
  '/audio/tutorial/tutorial_JBFqnCBsd6RMkjVDRZzb.mp3',
  '/audio/tutorial/tutorial_EXAVITQu4vr4xnSDxMaL.mp3',
  '/audio/tutorial/tutorial_Xb7hH8MSUJpSbSDYk0k2.mp3',
  '/audio/tutorial/tutorial_IKne3meq5aSn9XLyUdCD.mp3',
  '/audio/tutorial/tutorial_short_step0.mp3',
  '/audio/tutorial/tutorial_short_step1.mp3',
  '/audio/tutorial/tutorial_short_step2.mp3',
  '/audio/tutorial/tutorial_short_step3.mp3',
  '/audio/tutorial/tutorial_exp_step0.mp3',
  '/audio/tutorial/tutorial_exp_step1.mp3',
  '/audio/tutorial/tutorial_exp_step2.mp3',
  '/audio/tutorial/tutorial_exp_step3.mp3',
  '/audio/tutorial/tutorial_exp_step4.mp3',
  '/audio/tutorial/tutorial_exp_step5.mp3',
  '/audio/tutorial/tutorial_exp_step6.mp3',
  '/audio/tutorial/tutorial_exp_step7.mp3',
  '/audio/tutorial/tutorial_exp_step8.mp3',
  '/audio/tutorial/tutorial_exp_step9.mp3',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // NEVER cache API requests, admin endpoints, or external AI/TTS streaming
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) {
    return;
  }

  const isSameOrigin = (url.origin === location.origin);
  const isNavigation = (event.request.mode === 'navigate');
  const isHtmlAccept = (event.request.headers.get('accept') || '').includes('text/html');
  const isDocumentDest = (event.request.destination === 'document');

  // SPA deep-linking routes: same-origin paths without a file extension (e.g. /games, /careers, /roadmap, /games/wordle)
  const lastSegment = url.pathname.split('/').pop() || '';
  const isExtensionlessPath = isSameOrigin && !lastSegment.includes('.');
  const isHtmlOrJsAsset = url.pathname.endsWith('.html') || url.pathname.endsWith('.js');

  const isSpaOrPageRequest = isNavigation || isDocumentDest || isHtmlAccept || isExtensionlessPath || isHtmlOrJsAsset;

  // 1. Network-first strategy for HTML documents, JS bundles, and SPA page routes
  if (isSpaOrPageRequest) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
            return networkResponse;
          }
          // If server returned 404 for an extensionless SPA path (e.g. /games), fallback to cached SPA shell
          if (networkResponse && networkResponse.status === 404 && isExtensionlessPath) {
            const cachedShell = (await caches.match('/index.html')) || (await caches.match('/'));
            if (cachedShell) return cachedShell;
          }
          if (networkResponse) {
            return networkResponse;
          }
        } catch (err) {
          // Network failed (offline, timeout, or network blip)
        }

        // Cache fallback: exact match -> /index.html -> /
        const cached = (await caches.match(event.request)) ||
                       (await caches.match('/index.html')) ||
                       (await caches.match('/'));
        if (cached) {
          return cached;
        }

        // Guaranteed valid Response object fallback (NEVER undefined)
        return new Response(
          '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Career Fair 2026</title></head><body><script>location.reload();</script></body></html>',
          { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      })()
    );
    return;
  }

  // 2. Stale-while-revalidate for images, icons, and static assets
  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(event.request);

      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
          }
          return networkResponse;
        })
        .catch(() => null);

      if (cachedResponse) {
        // Return cached asset immediately, revalidate in background
        fetchPromise.catch(() => {});
        return cachedResponse;
      }

      // Not in cache: await network response
      const networkResult = await fetchPromise;
      if (networkResult) {
        return networkResult;
      }

      // If both cache and network fail, return a valid 404 Response (NEVER undefined)
      return new Response('', { status: 404, statusText: 'Not Found' });
    })()
  );
});
