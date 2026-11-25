// DigiTrackr service worker: makes the app installable and lets it open offline.
// The page itself is always fetched fresh (never from the browser cache), so new versions show up straight away.
// Fonts and Firebase scripts are network-first with a cached fallback.
const CACHE = "digitrackr-v3";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];
const CACHEABLE_HOSTS = ["www.gstatic.com", "fonts.googleapis.com", "fonts.gstatic.com", "cdnjs.cloudflare.com"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: "reload" })))).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !CACHEABLE_HOSTS.includes(url.hostname)) return;
  const isPage = req.mode === "navigate" || (sameOrigin && (url.pathname.endsWith("/") || url.pathname.endsWith(".html")));
  const fresh = isPage ? fetch(req.url, { cache: "no-store", credentials: "same-origin" }) : fetch(req);
  e.respondWith(
    fresh
      .then(res => {
        if (res.ok || res.type === "opaque") {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(isPage ? "./index.html" : req, copy));
        }
        return res;
      })
      .catch(() => caches.match(isPage ? "./index.html" : req).then(hit => hit || (isPage ? caches.match("./") : Response.error())))
  );
});
