// MAGNET POP offline support (used when the game is served over http/https).
// Network first: the newest files are always used when online; the cache is only the fallback when there is no connection.
const CACHE = 'magnetpop-v19';
const FILES = ['./', 'index.html', 'css/style.css', 'manifest.webmanifest', 'assets/fonts/Jua-Regular.woff2',
  'js/sprites.js', 'js/heroart.js', 'js/config.js', 'js/save.js', 'js/input.js', 'js/audio.js', 'js/game.js', 'js/bosses.js', 'js/render.js', 'js/ui.js', 'js/main.js',
  'assets/img/icon.png', 'assets/img/hero.png', 'assets/img/weapon.png', 'assets/img/king.png', 'assets/img/titan.png', 'assets/img/parts.png', 'assets/img/fx.png']
  .concat(['ball', 'robot', 'slime', 'bug', 'bat', 'golem', 'bigbot', 'wood', 'plastic', 'alu'].map(n => `assets/img/m_${n}.png`))
  .concat(['meadow', 'factory', 'compass', 'lab', 'fortress'].flatMap(n => [`assets/img/plat_${n}.png`, `assets/img/ground_${n}.png`]))
  .concat(['cloud', 'spring', 'conveyor', 'wood'].map(n => `assets/img/plat_${n}.png`))
  .concat(Array.from({ length: 16 }, (_, i) => `assets/img/bg${i + 1}.jpg`));
// 'reload' skips the browser's HTTP cache, so a new version never stores stale copies
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(u => new Request(u, { cache: 'reload' })))).catch(() => {}).then(() => self.skipWaiting())));
// take over at once and drop old caches. Never reload open pages: that would throw a player out of a running game.
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(fetch(req.url, { cache: 'no-cache' }).then(res => { if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req.url.split('?')[0], cp)); } return res; })
    .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
