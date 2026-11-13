const R = require('./render'), sc = require('./art/scene');
const out = '/tmp/claude-0/-home-user/c38618cf-0a2e-5dbf-b898-b88da4e82996/scratchpad';
(async () => {
  for (const n of process.argv.slice(2).map(Number)) {
    const k = sc.STAGES[n].world; const p = sc.platformSheet(k), gr = sc.groundSheet(k);
    let ground = ''; for (let i = 0; i < 14; i++) ground += `<svg x="${i * 96 - 20}" y="617" width="96" height="104" viewBox="${(i % 3) * 96} 0 96 104">${gr.svg}</svg>`;
    const svg = sc.background(n).replace('</svg>', `<defs>${sc.themeDefs(k)}</defs>${ground}<g transform="translate(450,372)">${p.svg}</g></svg>`);
    await R.shot(`${out}/prev_bg${n}.jpg`, svg, 1280, 720, 1, '#fff', 85);
  }
  await R.close();
})();
