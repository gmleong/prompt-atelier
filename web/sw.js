/* ═══════════════════════════════════════════════════════════════
   Service Worker — Prompt Atelier PWA
   Cache-first strategy for app shell, network-first for data
   ═══════════════════════════════════════════════════════════════ */

const CACHE = "prompt-atelier-v1";
const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./gist-api.js",
  "./manifest.json"
];

/* ── Install: pre-cache app shell ────────────────────────────── */
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

/* ── Activate: clean old caches ──────────────────────────────── */
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* ── Fetch: cache-first for shell, network-first for API ─────── */
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Gist API — always go network
  if (url.hostname === "api.github.com") return;

  // Google Fonts — network-first with cache fallback
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(
      caches.match(e.request).then((cached) => cached || fetch(e.request))
    );
    return;
  }

  // App shell — cache-first
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
