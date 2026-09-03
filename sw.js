"use strict";

const CACHE = "interval-coach-v9";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // reload bypasses the HTTP cache so a fresh worker never installs stale files
      .then((c) => Promise.all(ASSETS.map((url) =>
        fetch(new Request(url, { cache: "reload" }))
          .then((res) => (res.ok ? c.put(url, res) : null))
          .catch(() => null)
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network first (and update the cache); fall back to the cache when offline.
// HTML is fetched with cache: "reload" so GitHub Pages' 10-minute HTTP cache
// can't keep serving an old build to a home-screen PWA.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const isDoc = req.mode === "navigate" || (req.destination === "document");
  const fetchReq = isDoc ? new Request(req.url, { cache: "reload" }) : req;
  e.respondWith(
    fetch(fetchReq)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })
        .then((hit) => hit || caches.match("./index.html")))
  );
});
