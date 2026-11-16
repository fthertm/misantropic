// misantropic service worker — offline shell + background refresh (stale-while-revalidate).
//
// Shell files are served from the cache first (instant load, works offline) and refreshed from
// the network in the background; a new version shows up on the next visit.
// NOT cached: /.well-known/*, /uno/* (own Worker + Durable Objects), other origins.
//
// If you add or remove shell files, or want to reset the cache, bump the version in CACHE.

const CACHE = "misantropic-v1";

const SHELL = [
  "/",
  "/flap",
  "/assets/app.js",
  "/assets/app.css",
  "/assets/icons.js",
  "/assets/fonts/noto-sans-latin.woff2",
  "/content.json",
  "/manifest.webmanifest",
  "/assets/icons/favicon.svg",
  "/assets/icons/favicon.ico",
  "/assets/icons/apple-touch-icon.png",
  "/assets/icons/icon-192.png",
  "/assets/icons/icon-512.png",
  "/assets/icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const BYPASS = [/^\/\.well-known\//, /^\/sw\.js$/, /^\/uno(?:\/|$)/];

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Matrix etc. go straight to the network
  if (BYPASS.some((re) => re.test(url.pathname))) return; // straight to the network

  // Page navigations: only the home page shell and /flap come from the cache; other paths (404 etc.) hit the network.
  let key = req;
  if (req.mode === "navigate") {
    if (url.pathname === "/" || url.pathname === "/index.html") {
      key = "/";
    } else if (url.pathname === "/flap") {
      key = "/flap";
    } else {
      return;
    }
  }

  event.respondWith(staleWhileRevalidate(event, key, req));
});

async function staleWhileRevalidate(event, key, req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(key, { ignoreSearch: true });

  const refresh = fetch(req.mode === "navigate" ? key : req, { cache: "no-cache" })
    .then((res) => {
      if (res.ok && res.type === "basic") cache.put(key, res.clone());
      return res;
    })
    .catch(() => null);

  if (cached) {
    event.waitUntil(refresh);
    return cached;
  }
  const res = await refresh;
  return res || Response.error();
}
