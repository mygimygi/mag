// MAGNET POP offline cache (used when the game is served over http/https; opening index.html directly also works offline)
const CACHE = 'magnetpop-v7';
const FILES = ['./', 'index.html', 'css/style.css', 'manifest.webmanifest', 'assets/fonts/Jua-Regular.woff2',
  'js/sprites.js', 'js/heroart.js', 'js/config.js', 'js/save.js', 'js/input.js', 'js/audio.js', 'js/game.js', 'js/bosses.js', 'js/render.js', 'js/ui.js', 'js/main.js',
  'assets/img/icon.png', 'assets/img/hero.png', 'assets/img/weapon.png', 'assets/img/king.png', 'assets/img/titan.png', 'assets/img/parts.png', 'assets/img/fx.png']
  .concat(['ball', 'robot', 'slime', 'bug', 'bat', 'golem', 'bigbot', 'wood', 'plastic', 'alu'].map(n => `assets/img/m_${n}.png`))
  .concat(['meadow', 'factory', 'compass', 'lab', 'fortress'].flatMap(n => [`assets/img/plat_${n}.png`, `assets/img/ground_${n}.png`]))
  .concat(['cloud', 'spring', 'conveyor', 'wood'].map(n => `assets/img/plat_${n}.png`))
  .concat(Array.from({ length: 16 }, (_, i) => `assets/img/bg${i + 1}.jpg`));
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => { if (e.request.method !== 'GET') return; e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return res; }))); });
