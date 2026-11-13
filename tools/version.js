// Sets the game version in the three places that carry it.  usage: node tools/version.js 9
const fs = require('fs'), path = require('path'), v = parseInt(process.argv[2], 10), root = path.resolve(__dirname, '..');
if (!v) { console.error('usage: node tools/version.js <number>'); process.exit(1); }
const edit = (f, fn) => { const p = path.join(root, f); fs.writeFileSync(p, fn(fs.readFileSync(p, 'utf8'))); };
edit('js/config.js', s => s.replace(/MP\.VERSION = \d+;/, `MP.VERSION = ${v};`));
edit('sw.js', s => s.replace(/magnetpop-v\d+/, `magnetpop-v${v}`));
edit('index.html', s => s.replace(/(\.(?:js|css))\?v=\d+"/g, `$1?v=${v}"`));
console.log('version set to', v);
