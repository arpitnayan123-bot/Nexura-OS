/* Nexura Hospital OS — service worker (PWA) v2
   v2 CHANGE — navigations are now NETWORK-FIRST.
   v1 precached the app shell and served it CACHE-FIRST, which froze
   previews on whatever build was live at first visit: users kept seeing
   the old UI (old navbar, old features) no matter what shipped later.
   v2 strategy:
   - Navigations (HTML): NETWORK-FIRST. Cache updates on every success;
     the last-good page is served ONLY when the network is unreachable.
   - /_next/static/* (content-hashed, immutable): cache-first — safe.
   - Other same-origin GETs (manifest, icons): network-first w/ fallback.
   - API GETs: network-first with cache fallback (read-only views offline)
   - API writes: NEVER cached — the offline write buffer (IndexedDB)
     handles them via /api/nx/offline/sync on reconnect */
const CACHE = "nexura-shell-v2";
const SHELL = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) =>
        // { cache: "reload" } bypasses the HTTP cache so the shell is
        // always precached from the live origin, never a stale copy
        Promise.all(SHELL.map((path) => c.add(new Request(path, { cache: "reload" })))),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
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
        .catch(() =>
          caches
            .match(e.request)
            .then(
              (hit) =>
                hit ||
                new Response(
                  JSON.stringify({ error: "offline", detail: "Cached view unavailable" }),
                  { status: 503, headers: { "content-type": "application/json" } },
                ),
            ),
        ),
    );
    return;
  }

  if (url.origin !== location.origin) return;

  // Immutable, content-hashed build assets: cache-first is correct here
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.match(e.request).then(
        (hit) =>
          hit ||
          fetch(e.request).then((res) => {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
            return res;
          }),
      ),
    );
    return;
  }

  // Pages and everything else: NETWORK-FIRST so previews always show the
  // latest build; the cache is the offline safety net, not the source of
  // truth. Successful responses refresh the cache for offline fallback.
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() =>
        caches
          .match(e.request)
          .then(
            (hit) =>
              hit ||
              (e.request.mode === "navigate"
                ? caches.match("/").then((shell) => shell || Response.error())
                : Response.error()),
          ),
      ),
  );
});
