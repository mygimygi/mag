// Shared helpers for the vector art rigs. All art is authored facing RIGHT.
const OUT = '#3b2438'; // warm dark outline
const f = n => Math.round(n * 100) / 100;
const rad = d => d * Math.PI / 180;
function rot(x, y, deg) { const a = rad(deg); return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]; }
// two-bone IK: returns the joint position. dir = +1 / -1 chooses bend side
function ik(ax, ay, bx, by, l1, l2, dir) {
  let dx = bx - ax, dy = by - ay; let d = Math.hypot(dx, dy) || 0.001; const max = l1 + l2 - 0.01;
  if (d > max) d = max;
  const a = Math.atan2(dy, dx);
  const A = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const ang = a + dir * A; return [ax + Math.cos(ang) * l1, ay + Math.sin(ang) * l1];
}
// outlined rounded limb through 3 points (start, joint, end)
function limb(a, j, b, w, col, ow = 2.5, extra = '') {
  const c = [j[0] * 2 - (a[0] + b[0]) / 2, j[1] * 2 - (a[1] + b[1]) / 2];
  const d = `M${f(a[0])},${f(a[1])} Q${f(c[0])},${f(c[1])} ${f(b[0])},${f(b[1])}`;
  return `<path d="${d}" fill="none" stroke="${OUT}" stroke-width="${w + ow * 2}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`;
}
function line(a, b, w, col, ow = 2.5) {
  const d = `M${f(a[0])},${f(a[1])} L${f(b[0])},${f(b[1])}`;
  return `<path d="${d}" fill="none" stroke="${OUT}" stroke-width="${w + ow * 2}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
}
const g = (t, s) => `<g transform="${t}">${s}</g>`;
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * (3 - 2 * t);
const S = Math.sin, C = Math.cos, PI = Math.PI;
// linear gradient helper
function lg(id, stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) {
  return `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(s => `<stop offset="${s[0]}" stop-color="${s[1]}"${s[2] != null ? ` stop-opacity="${s[2]}"` : ''}/>`).join('')}</linearGradient>`;
}
function rg(id, stops, cx = 0.35, cy = 0.3, r = 0.8) {
  return `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(s => `<stop offset="${s[0]}" stop-color="${s[1]}"${s[2] != null ? ` stop-opacity="${s[2]}"` : ''}/>`).join('')}</radialGradient>`;
}
// seeded random
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// cute angry/normal eye used by monsters. (x,y) centre, r radius, look = pupil offset, mood: 'angry','scared','ko','dizzy','happy'
function eye(x, y, r, mood = 'angry', side = 1, look = [1.5, 0.5], lid = '#555') {
  if (mood === 'ko') return `<path d="M${x - r * .7},${y - r * .7} L${x + r * .7},${y + r * .7} M${x + r * .7},${y - r * .7} L${x - r * .7},${y + r * .7}" stroke="${OUT}" stroke-width="${r * .38}" stroke-linecap="round" fill="none"/>`;
  if (mood === 'dizzy') return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="${OUT}" stroke-width="2.2"/><path d="M${x},${y} m0,${-r * .1} a${r * .2},${r * .2} 0 1 1 ${-r * .01},0 m${r * .01},${-r * .25} a${r * .45},${r * .45} 0 1 1 ${-r * .45},${r * .45} a${r * .7},${r * .7} 0 0 1 ${r * .7},${-r * .7}" fill="none" stroke="${OUT}" stroke-width="${r * .2}" stroke-linecap="round"/>`;
  if (mood === 'happy') return `<path d="M${x - r * .8},${y + r * .2} Q${x},${y - r * 1.1} ${x + r * .8},${y + r * .2}" stroke="${OUT}" stroke-width="${r * .4}" stroke-linecap="round" fill="none"/>`;
  const pr = mood === 'scared' ? r * .32 : r * .5;
  let s = `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 1.08}" fill="#fff" stroke="${OUT}" stroke-width="2.2"/>` +
    `<circle cx="${x + look[0]}" cy="${y + look[1]}" r="${pr}" fill="#1c1626"/>` +
    `<circle cx="${x + look[0] - pr * .35}" cy="${y + look[1] - pr * .4}" r="${pr * .34}" fill="#fff"/>`;
  if (mood === 'angry') { // slanted lid
    s += `<path d="M${x - r * 1.25 * side},${y - r * 1.25} L${x + r * 1.3 * side},${y - r * .25} L${x + r * 1.3 * side},${y - r * 1.5} L${x - r * 1.25 * side},${y - r * 1.5} Z" fill="${lid}"/>` +
      `<path d="M${x - r * 1.25 * side},${y - r * 1.22} L${x + r * 1.3 * side},${y - r * .22}" stroke="${OUT}" stroke-width="3.2" stroke-linecap="round"/>`;
  }
  if (mood === 'scared') s += `<path d="M${x - r * 1.1 * side},${y - r * 1.0} Q${x},${y - r * 1.9} ${x + r * 1.1 * side},${y - r * 1.5}" stroke="${OUT}" stroke-width="2.6" stroke-linecap="round" fill="none"/>`;
  return s;
}
module.exports = { OUT, f, rad, rot, ik, limb, line, g, lerp, ease, S, C, PI, lg, rg, rng, eye };
