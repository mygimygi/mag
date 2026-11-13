// quick look: node preview.js hero|weapon|...
const R = require('./render'), hero = require('./art/hero'), weapon = require('./art/weapon');
const out = process.env.OUT || '/tmp/claude-0/-home-user/c38618cf-0a2e-5dbf-b898-b88da4e82996/scratchpad';
(async () => {
  const what = process.argv[2] || 'hero';
  if (what === 'hero') {
    const A = hero.anims(); const frames = [];
    const pick = process.argv[3] ? process.argv[3].split(',') : Object.keys(A);
    for (const k of pick) for (const p of A[k]) { const w = hero.weaponXform(p); frames.push(hero.frame(p) + `<g transform="translate(${w[0]},${w[1]}) rotate(${w[2]}) scale(0.85)">${weapon.weapon(2, 2, k === 'magnet' || k === 'absorb')}</g>`); }
    await R.sheet(out + '/prev_hero.png', hero.defs + weapon.defs, frames, { w: 240, h: 230, ax: 100, ay: 210 }, +process.argv[4] || 8, +process.argv[5] || 1, '#8fd0f5');
  } else if (what === 'weapon') {
    const frames = []; for (let on = 0; on < 2; on++) for (let b = 1; b <= 3; b++) for (let c = 1; c <= 3; c++) frames.push(weapon.weapon(b, c, on));
    await R.sheet(out + '/prev_weapon.png', weapon.defs, frames, { w: 170, h: 120, ax: 60, ay: 84 }, 6, 2, '#8fd0f5');
  }
  if (what === 'mon') { const mon = require('./art/monsters'); const types = (process.argv[3] || Object.keys(mon.M).join(',')).split(','); const frames = [];
    for (const t of types) { const fr = mon.frames(t); [0, 5, 10, 13, 15, 17, 19].forEach(i => frames.push(fr[i])); }
    await R.sheet(out + '/prev_mon.png', mon.defs, frames, { w: 200, h: 190, ax: 100, ay: 180 }, 7, 1, '#8fd0f5'); }
  if (what === 'boss') { const B = require('./art/bosses');
    const kf = B.kingFrames(); await R.sheet(out + '/prev_king.png', B.defs, [kf[0], kf[5], kf[9], kf[10], kf[14], kf[16]].map(x => x + '<g transform="translate(0,-66) rotate(40)">' + B.needle() + '</g>'), { w: 240, h: 240, ax: 120, ay: 232 }, 6, 1, '#8fd0f5');
    const tf = B.titanFrames(); await R.sheet(out + '/prev_titan.png', B.defs, [tf[0], tf[4], tf[6], tf[8], tf[14]], { w: 440, h: 500, ax: 220, ay: 490 }, 5, 0.75, '#8fd0f5');
    await R.sheet(out + '/prev_fx.png', B.defs, B.fx().concat([B.fist(0), B.fist(1), B.shield(), B.pod(1), B.pod(0)].map(x => '<g transform="scale(.55)">' + x + '</g>')), { w: 96, h: 96, ax: 48, ay: 48 }, 12, 1, '#8fd0f5'); }
  await R.close();
})();
