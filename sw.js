// rede primeiro (sempre a versão nova quando tem internet), cache quando está offline
const CACHE = 'joguinhos-v23';
const CORE = ['./', 'index.html', 'manifest.json', 'icon.svg', 'comum/ui.css', 'comum/base.js', 'comum/efeitos.js', 'comum/som.js', 'comum/cenario.js', 'comum/medidor.js', 'comum/ui.js', 'bolhinhas/', 'bolhinhas/game.js', 'esconde/', 'esconde/game.js', 'cuidar/', 'cuidar/bebe.js', 'cuidar/quarto.js', 'cuidar/cuidados.js', 'cuidar/roupas.js', 'cuidar/parque.js', 'cuidar/game.js', 'bolo/', 'bolo/game.js', 'colorir/', 'colorir/desenhos.js', 'colorir/vida.js', 'colorir/game.js', 'fazenda/', 'fazenda/mundo.js', 'fazenda/bichos.js', 'fazenda/game.js', 'lavajato/', 'lavajato/veiculos.js', 'lavajato/lavagem.js', 'lavajato/game.js', 'aquario/', 'aquario/mar.js', 'aquario/bichos.js', 'aquario/peixes.js', 'aquario/game.js', 'sorveteria/', 'sorveteria/sorvete.js', 'sorveteria/loja.js', 'sorveteria/game.js', 'dormir/', 'dormir/quarto.js', 'dormir/bicho.js', 'dormir/rotina.js', 'dormir/game.js',
  'horta/', 'horta/plantas.js', 'horta/horta.js', 'horta/bichos.js', 'horta/game.js',
  'pizzaria/', 'pizzaria/pizza.js', 'pizzaria/cozinha.js', 'pizzaria/game.js',
  'banho/', 'banho/banheiro.js', 'banho/espuma.js', 'banho/brinquedos.js', 'banho/game.js'];

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
