// rede primeiro (sempre a versão nova quando tem internet), cache quando está offline
const CACHE = 'joguinhos-v3';
const CORE = ['./', 'index.html', 'manifest.json', 'icon.svg', 'bolhinhas/', 'bolhinhas/index.html', 'bolhinhas/style.css', 'bolhinhas/game.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // no-cache: revalida com o servidor (o cache HTTP do navegador não segura versão velha)
  const sameOrigin = new URL(e.request.url).origin === location.origin;
  const net = sameOrigin ? fetch(e.request.url, { cache: 'no-cache' }) : fetch(e.request);
  e.respondWith(net.then(res => {
    if (res.ok || res.type === 'opaque') {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
    }
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
