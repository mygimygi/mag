// Monster rigs. Origin = ground centre, facing right. Generic pose:
// { sq, tilt, step (0..1|null), mood, arms (0..1), mouth ('closed'|'open'), wing (0..1) }
const { OUT, f, g, lg, rg, S, C, PI, eye, lerp } = require('./common');
const defs = [
  rg('mBall', [[0, '#b9c8e6'], [0.45, '#6c7fb0'], [1, '#3a4570']]),
  lg('mBot', [[0, '#d4ecff'], [0.5, '#9cc4ea'], [1, '#6a8fc2']]),
  lg('mBotD', [[0, '#7f95b8'], [1, '#4a5b7e']]),
  rg('mSlime', [[0, '#d9f5e6'], [0.5, '#7fc7a8'], [1, '#3f8f7a']], 0.35, 0.25, 0.9),
  lg('mRed', [[0, '#ff8080'], [1, '#d92b3c']]), lg('mBlue', [[0, '#7cc0ff'], [1, '#2d62d8']]),
  lg('mSteel', [[0, '#f4f7fb'], [1, '#a4b0c4']]),
  rg('mBat', [[0, '#c9a8ff'], [0.5, '#8a62d8'], [1, '#55359c']]),
  lg('mWing', [[0, '#b58cf5'], [1, '#6a45b8']]),
  lg('mGolem', [[0, '#f0b070'], [0.5, '#c97a3e'], [1, '#8c4a26']]),
  lg('mGolemD', [[0, '#a8643a'], [1, '#6c3a22']]),
  lg('mBig', [[0, '#7fe0d0'], [0.5, '#3fa7a8'], [1, '#226a80']]),
  lg('mBigD', [[0, '#3c6f8c'], [1, '#22405e']]),
  rg('mCore', [[0, '#fffbd0'], [0.5, '#ffd24a'], [1, '#ff8a1e']], 0.5, 0.5, 0.6),
  lg('mWood', [[0, '#e9b877'], [1, '#b8793c']]),
  rg('mDuck', [[0, '#fff6a0'], [0.6, '#ffd62e'], [1, '#f0a400']]),
  lg('mAlu', [[0, '#b9c2cc'], [0.25, '#f7fafc'], [0.55, '#c4ccd6'], [1, '#8e98a6']], 0, 0, 1, 0),
].join('');
const SW = 2.6;
const st = `stroke="${OUT}" stroke-width="${SW}" stroke-linejoin="round"`;
function mouth(x, y, w, kind, col = '#7a1f2e') {
  if (kind === 'open') return `<path d="M${x - w},${y - w * .35} Q${x},${y - w * .7} ${x + w},${y - w * .35} Q${x + w * .9},${y + w * .9} ${x},${y + w * .9} Q${x - w * .9},${y + w * .9} ${x - w},${y - w * .35}Z" fill="${col}" ${st} stroke-width="2.2"/><path d="M${x - w * .55},${y + w * .5} Q${x},${y + w * .1} ${x + w * .55},${y + w * .5} Q${x},${y + w * .95} ${x - w * .55},${y + w * .5}Z" fill="#ff8d94"/>`;
  if (kind === 'smile') return `<path d="M${x - w},${y - w * .2} Q${x},${y + w * .8} ${x + w},${y - w * .2}" fill="none" ${st} stroke-linecap="round"/>`;
  return `<path d="M${x - w},${y + w * .3} Q${x},${y - w * .5} ${x + w},${y + w * .3}" fill="none" ${st} stroke-linecap="round"/>`;
}
const rivet = (x, y, r = 2.4, c = '#e8eef8') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="${OUT}" stroke-width="1.5"/>`;
function feet(p, dx, col, rx = 11, ry = 7, y0 = -5) {
  let s = '';
  [[-1, 0], [1, 0.5]].forEach(([sd, off]) => {
    let lx = 0, ly = 0;
    if (p.step != null) { const a = (p.step + off) * 2 * PI; lx = C(a) * 5; ly = -Math.max(0, S(a)) * 6; }
    if (p.dangle) { ly = 2; lx = sd * 3; }
    s += `<ellipse cx="${f(sd * dx + lx + 2)}" cy="${f(y0 + ly)}" rx="${rx}" ry="${ry}" fill="${col}" ${st}/>`;
  });
  return s;
}
function wrap(p, h, s) {
  let t = '';
  if (p.tilt) t += `rotate(${f(p.tilt)},0,${-h / 2}) `;
  if (p.sq && p.sq !== 1) t += `scale(${f(2 - p.sq)},${f(p.sq)})`;
  return t ? g(t, s) : s;
}
const E = (p, x, y, r, side, lid) => eye(x, y, r, p.mood, side, p.mood === 'scared' ? [0, 0] : [1.8, 0.6], lid);

const M = {};
// 1. Iron ball
M.ball = { h: 80, cell: [130, 120], draw(p) {
  const a = p.arms || 0;
  let s = feet(p, 15, '#3a4570');
  let b = `<circle cx="0" cy="-41" r="35" fill="url(#mBall)" ${st}/>` +
    `<path d="M-33,-52 Q0,-66 33,-52" fill="none" stroke="#2f3960" stroke-width="2" opacity=".55"/><path d="M-34,-33 Q0,-18 34,-33" fill="none" stroke="#2f3960" stroke-width="2" opacity=".55"/>` +
    rivet(-24, -61) + rivet(0, -68.5) + rivet(24, -61) + rivet(-27, -22) + rivet(27, -22) + rivet(0, -12) +
    `<path d="M-22,-62 Q-10,-72 6,-71" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".55"/>` +
    // nub hands
    `<circle cx="-35" cy="${f(-36 - a * 16)}" r="7.5" fill="#55638f" ${st}/><circle cx="36" cy="${f(-36 - a * 16)}" r="7.5" fill="#55638f" ${st}/>` +
    E(p, -6, -44, 9.5, 1, '#55638f') + E(p, 17, -44, 9.5, -1, '#55638f') + mouth(6, -26, 6, p.mouth);
  return s + wrap(p, 80, b);
} };
// 2. Armor robot
M.robot = { h: 100, cell: [140, 140], draw(p) {
  const a = p.arms || 0;
  let s = '';
  // legs
  [[-1, 0], [1, .5]].forEach(([sd, off]) => { let lx = 0, ly = 0; if (p.step != null) { const an = (p.step + off) * 2 * PI; lx = C(an) * 6; ly = -Math.max(0, S(an)) * 7; } if (p.dangle) ly = 3;
    s += `<rect x="${f(sd * 15 - 4 + lx * .5)}" y="-24" width="8" height="${f(17 + ly)}" fill="#6a7fa6" ${st}/><path d="M${f(sd * 15 - 12 + lx)},${f(-1 + ly)} q0,-11 12,-11 q13,0 13,11Z" fill="url(#mBotD)" ${st}/>`; });
  let b = '';
  // antenna
  b += `<path d="M0,-80 v-12" ${st} stroke-width="4.5" stroke-linecap="round"/><circle cx="0" cy="-97" r="7" fill="#ff4b55" ${st}/><circle cx="-2.2" cy="-99.5" r="2.2" fill="#fff" opacity=".85"/>`;
  // ears
  b += `<rect x="-45" y="-61" width="12" height="22" rx="4" fill="url(#mBotD)" ${st}/><rect x="33" y="-61" width="12" height="22" rx="4" fill="url(#mBotD)" ${st}/>`;
  // arms
  b += `<circle cx="-42" cy="${f(-30 - a * 22)}" r="7.5" fill="#8fb0d8" ${st}/><circle cx="43" cy="${f(-30 - a * 22)}" r="7.5" fill="#8fb0d8" ${st}/>`;
  // head/body box
  b += `<rect x="-36" y="-82" width="72" height="62" rx="13" fill="url(#mBot)" ${st}/>` +
    `<path d="M-28,-76 h44" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7"/>` +
    `<rect x="-27" y="-67" width="58" height="34" rx="9" fill="#27304a" ${st} stroke-width="2.2"/>` +
    rivet(-30, -26, 2.2) + rivet(30, -26, 2.2);
  // face on visor
  const ey = (x, sd) => p.mood === 'ko' || p.mood === 'dizzy' ? eye(x, -51, 8, p.mood).replace(/stroke="#3b2438"/g, 'stroke="#bfe6ff"').replace('fill="#fff"', 'fill="#27304a"')
    : `<ellipse cx="${x}" cy="-50" rx="8" ry="${p.mood === 'scared' ? 10 : 8.5}" fill="#fff"/><circle cx="${x + (p.mood === 'scared' ? 0 : 2)}" cy="-49" r="${p.mood === 'scared' ? 2.6 : 4.2}" fill="#1c1626"/>` + (p.mood === 'angry' ? `<path d="M${x - 10 * sd},-59 L${x + 10 * sd},-50.5 L${x + 10 * sd},-62 L${x - 10 * sd},-62Z" fill="#27304a"/>` : '');
  b += ey(-9, 1) + ey(15, -1);
  b += p.mouth === 'open' ? `<rect x="-3" y="-40" width="12" height="6" rx="2" fill="#ff6b6b"/>` : `<path d="M-2,-37.5 h10" stroke="#bfe6ff" stroke-width="2.4" stroke-linecap="round"/>`;
  return s + wrap(p, 100, b);
} };
// 3. Scrap slime
M.slime = { h: 70, cell: [140, 120], draw(p) {
  const k = p.sq || 1;
  let b = `<path d="M-42,-2 Q-48,-30 -28,-52 Q-8,-72 14,-62 Q40,-50 44,-22 Q46,-6 40,-2 Q20,3 0,1 Q-22,3 -42,-2Z" fill="url(#mSlime)" ${st}/>` +
    `<path d="M-26,-44 Q-14,-60 4,-58" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".7"/>` +
    // embedded gear
    `<g transform="translate(-24,-20) rotate(${p.step != null ? p.step * 60 : 12})"><path d="M-9,-2.2 h-3 v4.4 h3 M9,-2.2 h3 v4.4 h-3 M-2.2,-9 v-3 h4.4 v3 M-2.2,9 v3 h4.4 v-3" fill="#c9d3e0" ${st} stroke-width="1.8"/><circle r="8.5" fill="#c9d3e0" ${st} stroke-width="2"/><circle r="3" fill="#5f8f86" ${st} stroke-width="1.6"/></g>` +
    // bolt
    `<g transform="translate(26,-44) rotate(35)"><rect x="-2.6" y="-2" width="5.2" height="13" fill="#b8c2d0" ${st} stroke-width="1.8"/><rect x="-6" y="-6.5" width="12" height="6" rx="1.5" fill="#dfe6ee" ${st} stroke-width="1.8"/></g>` +
    // nut
    `<path d="M30,-17 l5,-3 l5,3 v6 l-5,3 l-5,-3Z" fill="#ffd27a" ${st} stroke-width="1.8"/><circle cx="35" cy="-14" r="2" fill="#5f8f86"/>` +
    E(p, -4, -34, 9, 1, '#5fae96') + E(p, 17, -34, 9, -1, '#5fae96') + mouth(7, -17, 6.5, p.mouth);
  if (p.arms) b += `<path d="M-40,-30 q-10,-12 -4,-22 M42,-28 q10,-12 4,-22" stroke="${OUT}" stroke-width="10" stroke-linecap="round" fill="none"/><path d="M-40,-30 q-10,-12 -4,-22 M42,-28 q10,-12 4,-22" stroke="#7fc7a8" stroke-width="5" stroke-linecap="round" fill="none"/>`;
  return wrap(p, 70, b);
} };
// 4. Magnet bug
M.bug = { h: 56, cell: [150, 110], draw(p) {
  let s = '';
  const ph = p.step != null ? p.step * 2 * PI : 0;
  // legs (three per side visible)
  for (let i = 0; i < 3; i++) { const a = ph + i * 2.1; const lx = p.step != null ? C(a) * 4 : 0, ly = p.step != null ? -Math.max(0, S(a)) * 4 : (p.dangle ? 3 : 0);
    s += `<path d="M${-22 + i * 20},-14 l${f(-4 + lx)},${f(12 + ly)}" stroke="${OUT}" stroke-width="7.5" stroke-linecap="round"/><path d="M${-22 + i * 20},-14 l${f(-4 + lx)},${f(12 + ly)}" stroke="#4a4f66" stroke-width="3" stroke-linecap="round"/>`; }
  const wob = i => p.step != null ? S(ph + i * 1.3) * 2.2 : 0;
  let b = '';
  // tail segments (blue -> white -> red head), drawn back to front
  b += `<ellipse cx="-33" cy="${f(-22 + wob(0))}" rx="15" ry="14" fill="url(#mBlue)" ${st}/>`;
  b += `<ellipse cx="-13" cy="${f(-26 + wob(1))}" rx="17" ry="17" fill="url(#mSteel)" ${st}/>`;
  b += `<path d="M-20,-38 q7,-4 14,0" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/>`;
  // horseshoe pincers
  const pa = (p.arms || 0) * 14;
  const pin = (sd) => `<g transform="translate(28,-30) rotate(${sd * (22 - pa)})"><path d="M2,${sd * 2} q22,${sd * -2} 26,${sd * 10}" fill="none" stroke="${OUT}" stroke-width="11" stroke-linecap="round"/><path d="M2,${sd * 2} q22,${sd * -2} 26,${sd * 10}" fill="none" stroke="${sd < 0 ? '#ff5a5a' : '#3f7fe8'}" stroke-width="6" stroke-linecap="round"/><path d="M25.5,${sd * 6.5} l2.5,${sd * 5.5}" stroke="#eef2f7" stroke-width="6" stroke-linecap="round"/></g>`;
  b += pin(-1) + pin(1);
  b += `<circle cx="14" cy="${f(-30 + wob(2))}" r="22" fill="url(#mRed)" ${st}/>` +
    `<path d="M2,-45 q8,-6 18,-4" stroke="#ffd0d0" stroke-width="3.5" stroke-linecap="round" fill="none"/>` +
    E(p, 10, -33, 8, 1, '#e23a48') + E(p, 27, -33, 7, -1, '#e23a48') + mouth(20, -18, 5, p.mouth);
  return s + wrap(p, 56, b);
} };
// 5. Iron bat (origin under the body; hovers)
M.bat = { h: 90, cell: [180, 130], draw(p) {
  const w = p.wing != null ? p.wing : 0.5; const up = lerp(-30, 26, (S(w * 2 * PI) + 1) / 2);
  const wing = sd => `<g transform="translate(${sd * 20},-50) scale(${sd},1) rotate(${f(up)})"><path d="M0,0 Q22,-34 62,-26 Q56,-14 60,-2 Q48,-6 42,6 Q34,0 26,10 Q18,2 4,10Z" fill="url(#mWing)" ${st}/><path d="M4,2 Q26,-18 58,-24 M8,3 Q28,-6 44,2" stroke="${OUT}" stroke-width="1.8" fill="none" opacity=".7"/><circle cx="60" cy="-25" r="3" fill="#e8eef8" stroke="${OUT}" stroke-width="1.5"/></g>`;
  let b = wing(-1) + wing(1);
  // ears
  b += `<path d="M-22,-62 L-28,-90 L-6,-72Z" fill="url(#mWing)" ${st}/><path d="M22,-62 L28,-90 L6,-72Z" fill="url(#mWing)" ${st}/><path d="M-20,-70 L-23,-82 L-12,-73Z" fill="#ffb3d0"/><path d="M20,-70 L23,-82 L12,-73Z" fill="#ffb3d0"/>`;
  // feet
  b += `<path d="M-10,-22 v8 M10,-22 v8" stroke="${OUT}" stroke-width="7" stroke-linecap="round"/><path d="M-10,-22 v8 M10,-22 v8" stroke="#55359c" stroke-width="2.6" stroke-linecap="round"/>`;
  b += `<circle cx="0" cy="-48" r="28" fill="url(#mBat)" ${st}/><path d="M-17,-64 Q-6,-73 8,-71" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".6"/>` +
    rivet(-22, -40, 2.1) + rivet(22, -40, 2.1) +
    E(p, -8, -51, 8.5, 1, '#7a52c8') + E(p, 13, -51, 8.5, -1, '#7a52c8');
  b += p.mouth === 'open' ? mouth(3, -35, 6, 'open') + `<path d="M-2,-38 l2,5 l2,-5Z M5,-38 l2,5 l2,-5Z" fill="#fff"/>` : `<path d="M-5,-35 Q3,-31 11,-35" fill="none" ${st} stroke-linecap="round"/><path d="M-2,-34.5 l2,5 l2,-4.4Z M5,-33.8 l2,4.6 l2,-5Z" fill="#fff" stroke="${OUT}" stroke-width="1.2" stroke-linejoin="round"/>`;
  return wrap(p, 90, b);
} };
// 6. Plate golem
M.golem = { h: 124, cell: [180, 160], draw(p) {
  const a = p.arms || 0; let s = '';
  [[-1, 0], [1, .5]].forEach(([sd, off]) => { let lx = 0, ly = 0; if (p.step != null) { const an = (p.step + off) * 2 * PI; lx = C(an) * 5; ly = -Math.max(0, S(an)) * 6; } if (p.dangle) ly = 3;
    s += `<rect x="${f(sd * 22 - 14 + lx)}" y="${f(-24 + ly)}" width="28" height="23" rx="5" fill="url(#mGolemD)" ${st}/>` + rivet(sd * 22 + lx, -12 + ly, 2.2, '#ffd9a8'); });
  let b = '';
  const arm = (sd) => { const ay = -70 - a * 26; return `<path d="M${sd * 40},-78 Q${sd * 62},-74 ${sd * 60},${f(ay + 18)}" fill="none" stroke="${OUT}" stroke-width="19" stroke-linecap="round"/><path d="M${sd * 40},-78 Q${sd * 62},-74 ${sd * 60},${f(ay + 18)}" fill="none" stroke="#b56a34" stroke-width="13.5" stroke-linecap="round"/><rect x="${sd * 60 - 15}" y="${f(ay + 12)}" width="30" height="28" rx="6" fill="url(#mGolem)" ${st}/>` + rivet(sd * 60 - 7, ay + 20, 2.2, '#ffd9a8') + rivet(sd * 60 + 7, ay + 20, 2.2, '#ffd9a8'); };
  b += arm(-1);
  // torso plates
  b += `<rect x="-42" y="-88" width="84" height="66" rx="9" fill="url(#mGolem)" ${st}/>` +
    `<path d="M-42,-54 h84" stroke="${OUT}" stroke-width="2.2"/><path d="M-34,-82 h52" stroke="#ffe0b8" stroke-width="4" stroke-linecap="round" opacity=".7"/>` +
    rivet(-34, -62, 2.6, '#ffd9a8') + rivet(34, -62, 2.6, '#ffd9a8') + rivet(-34, -30, 2.6, '#ffd9a8') + rivet(34, -30, 2.6, '#ffd9a8') +
    `<path d="M-12,-44 l8,-6 l8,6 l8,-6" stroke="#8c4a26" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  // head plate
  b += `<rect x="-32" y="-124" width="66" height="42" rx="9" fill="url(#mGolem)" ${st}/><path d="M-24,-118 h36" stroke="#ffe0b8" stroke-width="4" stroke-linecap="round" opacity=".7"/>` +
    E(p, -8, -103, 9, 1, '#b56a34') + E(p, 15, -103, 9, -1, '#b56a34') + mouth(4, -88.5, 5, p.mouth === 'open' ? 'open' : 'closed');
  b += arm(1);
  return s + wrap(p, 124, b);
} };
// 7. Big iron robot
M.bigbot = { h: 150, cell: [200, 190], draw(p) {
  const a = p.arms || 0; let s = '';
  [[-1, 0], [1, .5]].forEach(([sd, off]) => { let lx = 0, ly = 0; if (p.step != null) { const an = (p.step + off) * 2 * PI; lx = C(an) * 7; ly = -Math.max(0, S(an)) * 8; } if (p.dangle) ly = 4;
    s += `<rect x="${f(sd * 24 - 7 + lx * .5)}" y="-40" width="14" height="${f(28 + ly)}" fill="#3c6f8c" ${st}/><path d="M${f(sd * 24 - 20 + lx)},${f(-1 + ly)} v-8 q0,-10 12,-10 h14 q14,0 14,10 v8Z" fill="url(#mBigD)" ${st}/>`; });
  let b = '';
  const arm = (sd) => { const hy = -62 - a * 40, hx = sd * (66 + a * 4); return `<path d="M${sd * 48},-104 Q${sd * 72},-100 ${f(hx)},${f(hy)}" fill="none" stroke="${OUT}" stroke-width="20" stroke-linecap="round"/><path d="M${sd * 48},-104 Q${sd * 72},-100 ${f(hx)},${f(hy)}" fill="none" stroke="#3c6f8c" stroke-width="14.5" stroke-linecap="round"/>` +
      `<g transform="translate(${f(hx)},${f(hy)})"><path d="M-13,-6 Q-18,16 -8,22 L-3,10 L3,10 L8,22 Q18,16 13,-6Z" fill="url(#mSteel)" ${st}/><circle r="11" cy="-4" fill="url(#mBig)" ${st}/></g>`; };
  b += arm(-1);
  // shoulders
  b += `<circle cx="-50" cy="-106" r="16" fill="url(#mBigD)" ${st}/><circle cx="50" cy="-106" r="16" fill="url(#mBigD)" ${st}/>`;
  // torso
  b += `<path d="M-46,-118 Q0,-128 46,-118 Q52,-80 40,-40 Q0,-32 -40,-40 Q-52,-80 -46,-118Z" fill="url(#mBig)" ${st}/>` +
    `<path d="M-34,-112 Q-6,-120 20,-116" stroke="#d6fff6" stroke-width="5" stroke-linecap="round" fill="none" opacity=".7"/>` +
    `<circle cx="2" cy="-74" r="17" fill="#22405e" ${st}/><circle cx="2" cy="-74" r="11.5" fill="url(#mCore)" stroke="${OUT}" stroke-width="2"/>` +
    `<path d="M-4,-80 l4,-3 M-6,-74 h5" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>` +
    rivet(-34, -58, 2.6) + rivet(36, -58, 2.6) + rivet(-38, -98, 2.6) + rivet(40, -98, 2.6);
  // head dome
  b += `<path d="M-30,-118 Q-32,-152 2,-152 Q36,-152 34,-118Z" fill="url(#mBig)" ${st}/><path d="M2,-152 v-12" ${st} stroke-width="4.5" stroke-linecap="round"/><path d="M-8,-170 h20 l-4,8 h-12Z" fill="#ffd24a" ${st} stroke-width="2.2"/>` +
    `<rect x="-22" y="-144" width="52" height="24" rx="10" fill="#1d2b44" ${st} stroke-width="2.2"/>`;
  const ey = (x, sd) => p.mood === 'ko' || p.mood === 'dizzy' ? eye(x, -132, 7, p.mood).replace(/stroke="#3b2438"/g, 'stroke="#aef5ff"').replace('fill="#fff"', 'fill="#1d2b44"')
    : `<ellipse cx="${x}" cy="-132" rx="7.5" ry="${p.mood === 'scared' ? 9 : 7.5}" fill="${p.mood === 'scared' ? '#fff' : '#ffe14d'}"/><circle cx="${x + (p.mood === 'scared' ? 0 : 2)}" cy="-131" r="${p.mood === 'scared' ? 2.4 : 3.6}" fill="#1c1626"/>` + (p.mood === 'angry' ? `<path d="M${x - 9.5 * sd},-140 L${x + 9.5 * sd},-132.5 L${x + 9.5 * sd},-142 L${x - 9.5 * sd},-142Z" fill="#1d2b44"/>` : '');
  b += ey(-6, 1) + ey(15, -1);
  b += arm(1);
  return s + wrap(p, 150, b);
} };
// ---- non-magnetic material creatures (stage 12) ----
M.wood = { h: 78, cell: [130, 120], material: 'wood', draw(p) {
  let s = feet(p, 16, '#8a5a2c');
  let b = `<rect x="-34" y="-74" width="68" height="66" rx="8" fill="url(#mWood)" ${st}/>` +
    `<path d="M-34,-52 h68 M-34,-30 h68" stroke="#9a6430" stroke-width="2.2"/><path d="M-12,-74 v22 M14,-52 v22 M-6,-30 v22" stroke="#9a6430" stroke-width="2"/>` +
    `<path d="M-26,-66 q8,-3 16,0 M20,-22 q5,3 10,0 M-28,-18 q6,2 12,0" stroke="#fbd9a6" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".8"/>` +
    `<path d="M0,-74 q-2,-10 -14,-14 q-2,12 14,14 M0,-74 q2,-12 16,-14 q0,12 -16,14" fill="#7ed957" ${st} stroke-width="2.2"/>` +
    E(p, -8, -46, 9, 1, '#c98c4a') + E(p, 14, -46, 9, -1, '#c98c4a') + mouth(4, -27, 6, p.mouth === 'open' ? 'open' : p.mood === 'happy' ? 'smile' : 'closed');
  return s + wrap(p, 78, b);
} };
M.plastic = { h: 80, cell: [130, 120], material: 'plastic', draw(p) {
  let s = feet(p, 14, '#ff9a3d', 10, 6);
  let b = `<path d="M-36,-30 Q-44,-52 -30,-50 Q-22,-52 -18,-44 Q-10,-78 18,-76 Q40,-74 40,-52 Q40,-40 32,-36 Q40,-8 6,-6 Q-30,-4 -36,-30Z" fill="url(#mDuck)" ${st}/>` +
    `<path d="M4,-70 Q14,-74 24,-70" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".8"/><path d="M-24,-26 q6,10 22,10" stroke="#f0a400" stroke-width="3" fill="none" stroke-linecap="round"/>` +
    `<path d="M36,-56 Q54,-56 54,-49 Q54,-43 37,-44Z" fill="#ff8a2e" ${st}/>` + (p.mouth === 'open' ? `<path d="M37,-45 Q50,-40 50,-37 Q44,-34 36,-38Z" fill="#ff8a2e" ${st}/>` : '') +
    E(p, 14, -58, 8, 1, '#f0b400') + E(p, 31, -58, 6.5, -1, '#f0b400');
  return s + wrap(p, 80, b);
} };
M.alu = { h: 86, cell: [130, 120], material: 'alu', draw(p) {
  let s = feet(p, 14, '#6f7a8c');
  let b = `<path d="M-26,-74 L-28,-14 Q0,-4 28,-14 L26,-74Z" fill="url(#mAlu)" ${st}/>` +
    `<ellipse cx="0" cy="-74" rx="26" ry="8" fill="#e9eef3" ${st}/><ellipse cx="0" cy="-74.5" rx="19" ry="5" fill="#aab4c0" stroke="${OUT}" stroke-width="1.6"/><ellipse cx="5" cy="-75" rx="6" ry="2.6" fill="#e9eef3" stroke="${OUT}" stroke-width="1.4"/>` +
    `<path d="M-27.3,-36 Q0,-27 27.3,-36 L27.8,-20 Q0,-11 -27.8,-20Z" fill="#4aa8ff" stroke="${OUT}" stroke-width="2"/><text x="0" y="-17" text-anchor="middle" font-size="12" fill="#fff" font-weight="bold">Al</text>` +
    E(p, -8, -50, 8.5, 1, '#aeb8c4') + E(p, 12, -50, 8.5, -1, '#aeb8c4') + mouth(2, -40.5, 4, p.mouth === 'open' ? 'open' : p.mood === 'happy' ? 'smile' : 'closed');
  return s + wrap(p, 86, b);
} };

// ---- generic animation table (same layout for every monster) ----
const ANIM = { idle: [0, 4], move: [4, 6], jump: [10, 2], attack: [12, 3], hurt: [15, 2], pulled: [17, 2], ko: [19, 2] };
function frames(type) {
  const m = M[type], nonMag = !!m.material, out = [];
  const D = (p) => out.push(m.draw(Object.assign({ sq: 1, tilt: 0, step: null, mood: 'angry', arms: 0, mouth: 'closed', wing: 0.3 }, p)));
  for (let i = 0; i < 4; i++) D({ sq: 1 + S(i / 4 * 2 * PI) * 0.035, wing: i / 4 });
  for (let i = 0; i < 6; i++) D({ step: i / 6, tilt: S(i / 6 * 2 * PI) * 4, sq: type === 'slime' ? 1 + S(i / 6 * 2 * PI) * 0.12 : 1, wing: i / 6 });
  D({ sq: 1.1, arms: 0.8, wing: 0.25, dangle: true }); D({ sq: 0.96, arms: 0.4, wing: 0.75, dangle: true });
  D({ tilt: -9, mouth: 'open', arms: 0.5, wing: 0.2 }); D({ tilt: 13, mouth: 'open', arms: 1, wing: 0.5 }); D({ tilt: 7, arms: 0.6, wing: 0.8 });
  D({ mood: 'scared', tilt: -14, sq: 0.93, mouth: 'open', wing: 0.1 }); D({ mood: 'scared', tilt: -7, mouth: 'open', wing: 0.6 });
  if (nonMag) { D({ mood: 'happy', sq: 1.03, mouth: 'smile' }); D({ mood: 'happy', sq: 0.98, tilt: 4, mouth: 'smile' }); }
  else { D({ mood: 'scared', arms: 1, mouth: 'open', dangle: true, tilt: 6, wing: 0.2 }); D({ mood: 'scared', arms: 0.7, mouth: 'open', dangle: true, tilt: -6, wing: 0.7 }); }
  D({ mood: 'ko', mouth: 'open', arms: 0.6, dangle: true, wing: 0.3 }); D({ mood: 'ko', mouth: 'open', tilt: 10, arms: 0.3, dangle: true, wing: 0.8 });
  return out;
}
module.exports = { defs, M, ANIM, frames };
