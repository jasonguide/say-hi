// 离线缓存（network-first）：优先网络，失败才用缓存；更新代码无需清缓存
const CACHE = "say-hi-v1";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(["/", "/index.html", "/css/app.css", "/js/app.js", "/icon.svg", "/manifest.json"])).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.pathname.startsWith("/api/")) return;
  // network-first：在线时始终用最新内容，失败时才回退缓存（离线可用）
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      if (res.ok && url.origin === location.origin) caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request).then(hit => hit || caches.match("/index.html")))
  );
});
