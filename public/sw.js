/* Nexura Hospital OS — service worker (PWA)
   Strategy:
   - Static shell: cache-first (app shell boots offline)
   - API GETs: network-first with cache fallback (read-only views offline)
   - API writes: NEVER cached — the offline write buffer (IndexedDB)
     handles them via /api/nx/offline/sync on reconnect */
const CACHE = "nexura-shell-v1";
const SHELL = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.pathname.startsWith("/api/nx/stream")) return;
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok && e.request.headers.get("accept")?.includes("json")) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then((hit) => hit || new Response(JSON.stringify({ error: "offline", detail: "Cached view unavailable" }), { status: 503, headers: { "content-type": "application/json" } })))
    );
    return;
  }
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
        return res;
      }))
    );
  }
});
