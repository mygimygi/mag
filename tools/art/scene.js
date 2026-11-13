// Backgrounds (one per stage, 1280x720) and grass/stone platform tiles.
const { OUT, f, g, lg, rg, rng, S, C, PI, lerp } = require('./common');

// ---------------- platform tiles ----------------
const THEMES = {
  meadow: { grass: ['#b5f04a', '#6fd03a', '#3f9e2c'], stone: ['#ecd3c2', '#cfa999', '#a57f7a'], gap: '#6b4a52', dirt: '#8a5f4e' },
  factory: { grass: ['#d2ee55', '#93cc3a', '#5d962c'], stone: ['#d5dde8', '#a9b6c9', '#7f8da6'], gap: '#4a5670', dirt: '#66728a' },
  compass: { grass: ['#a8ec5a', '#5cc644', '#2f9440'], stone: ['#f6dfa6', '#e0b76a', '#b98a45'], gap: '#7a5a34', dirt: '#96703f' },
  lab: { grass: ['#b4f7b0', '#62d99a', '#2fa57a'], stone: ['#f4fbff', '#cfe3f2', '#9fbcd6'], gap: '#55708e', dirt: '#7391ad' },
  fortress: { grass: ['#cdea5c', '#86c244', '#4f8f38'], stone: ['#e3c2dc', '#b98bb8', '#8a6193'], gap: '#553a62', dirt: '#6f4c7a' },
};
function themeDefs(k) {
  const t = THEMES[k];
  return lg('pg' + k, [[0, t.grass[0]], [0.55, t.grass[1]], [1, t.grass[2]]]) + lg('ps' + k, [[0, t.stone[0]], [0.6, t.stone[1]], [1, t.stone[2]]]);
}
// one stone block
function stone(k, x, y, w, h, r) {
  const t = THEMES[k], rx = 7;
  let s = `<rect x="${f(x + 1.5)}" y="${f(y + 1.5)}" width="${f(w - 3)}" height="${f(h - 3)}" rx="${rx}" fill="url(#ps${k})" stroke="${t.gap}" stroke-width="2.4"/>`;
  s += `<path d="M${f(x + 9)},${f(y + 6.5)} h${f(Math.max(6, w * .45))}" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".55"/>`;
  if (r() < 0.5 && w > 36) { const cx = x + w * (0.3 + r() * 0.4), cy = y + h * 0.4; s += `<path d="M${f(cx)},${f(cy)} l${f(4 + r() * 4)},${f(5 + r() * 4)} l${f(-3)},${f(6)}" stroke="${t.stone[2]}" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".8"/>`; }
  if (r() < 0.35) s += `<ellipse cx="${f(x + w * .7)}" cy="${f(y + h - 5)}" rx="${f(5 + r() * 5)}" ry="3.5" fill="${THEMES[k].grass[2]}" opacity=".55"/>`;
  return s;
}
// grass strip covering [x0,x1] with top at y; drooping blades at bottom edge; capL/capR round the ends
function grass(k, x0, x1, y, r, capL, capR) {
  const t = THEMES[k]; const top = y, bot = y + 17;
  let d = `M${x0},${bot - 2} `;
  if (capL) d = `M${x0 + 2},${bot - 4} Q${x0 - 5},${top + 8} ${x0 + 7},${top + 1} `; else d += `L${x0},${top} `;
  d += `L${capR ? x1 - 7 : x1},${top + (capR ? 1 : 0)} `;
  if (capR) d += `Q${x1 + 5},${top + 8} ${x1 - 2},${bot - 4} `; else d += `L${x1},${bot - 2} `;
  // scalloped drooping lower edge, right to left
  const n = Math.round((x1 - x0) / 16); const step = (x1 - x0 - (capL ? 2 : 0) - (capR ? 2 : 0)) / n; let x = x1 - (capR ? 2 : 0);
  for (let i = 0; i < n; i++) { const dip = 5 + r() * 8; d += `q${f(-step * .2)},${f(dip)} ${f(-step * .5)},${f(dip * .9)} q${f(-step * .35)},${f(-dip * .2)} ${f(-step * .5)},${f(-dip * .9)} `; x -= step; }
  d += 'Z';
  let s = `<path d="${d}" fill="url(#pg${k})" stroke="${t.grass[2]}" stroke-width="2.4" stroke-linejoin="round"/>`;
  s += `<path d="M${x0 + (capL ? 9 : 0)},${top + 4.5} L${x1 - (capR ? 9 : 0)},${top + 4.5}" stroke="${t.grass[0]}" stroke-width="5" stroke-linecap="round" opacity=".9"/>`;
  // little tufts on top
  for (let xx = x0 + 10; xx < x1 - 10; xx += 20 + r() * 26) { const h = 5 + r() * 5; s += `<path d="M${f(xx - 4)},${top + 2} q1,${-h} 3,${-h - 2} q0,${h * .6} 1,${h + 2} q2,${-h * .9} 5,${-h} q-1,${h * .5} -2,${h}Z" fill="${t.grass[1]}" stroke="${t.grass[2]}" stroke-width="1.6" stroke-linejoin="round"/>`; }
  return s;
}
/** platform strip: [capL 48][mid 96 x3][capR 48], height 72, grass top at y=8 */
function platformSheet(k) {
  const r = rng(k.length * 977 + 13); const H = 72, gy = 8, sy = 20, sh = 44;
  let s = '';
  const body = (x0, x1, capL, capR) => `<path d="M${x0 + (capL ? 14 : 0)},${sy - 4} H${x1 - (capR ? 14 : 0)} ${capR ? `Q${x1 - 2},${sy} ${x1 - 3},${sy + 16} L${x1 - 6},${sy + sh - 8} Q${x1 - 8},${sy + sh + 1} ${x1 - 18},${sy + sh + 1}` : `V${sy + sh + 1}`} H${x0 + (capL ? 18 : 0)} ${capL ? `Q${x0 + 8},${sy + sh + 1} ${x0 + 6},${sy + sh - 8} L${x0 + 3},${sy + 16} Q${x0 + 2},${sy} ${x0 + 14},${sy - 4}` : `V${sy - 4}`}Z" fill="${THEMES[k].gap}"/>`;
  // cap L
  s += body(0, 48, true, false) + stone(k, 5, sy, 43, sh, r) + grass(k, 0, 48, gy, r, true, false);
  const splits = [[52, 44], [34, 62], [96]];
  splits.forEach((sp, i) => { const x0 = 48 + i * 96; let x = x0; s += body(x0, x0 + 96, false, false); sp.forEach(w => { s += stone(k, x, sy, w, sh, r); x += w; }); s += grass(k, x0, x0 + 96, gy, r, false, false); });
  s += body(336, 384, false, true) + stone(k, 336, sy, 43, sh, r) + grass(k, 336, 384, gy, r, false, true);
  return { svg: s, w: 384, h: H };
}
/** ground strip: 3 tiles of 96, height 104, grass top at y=8 */
function groundSheet(k) {
  const r = rng(k.length * 311 + 7); const gy = 8, sy = 20; let s = '';
  const rows = [[[52, 44], [30, 66], [60, 36]], [[40, 56], [66, 30], [48, 48]]];
  for (let i = 0; i < 3; i++) {
    const x0 = i * 96; s += `<rect x="${x0}" y="${sy - 4}" width="96" height="90" fill="${THEMES[k].gap}"/>`;
    let x = x0; rows[0][i].forEach(w => { s += stone(k, x, sy, w, 42, r); x += w; });
    // second row offset by half: draw stones wrapping the tile edge
    const sp = rows[1][i]; x = x0 - sp[1] / 2;
    s += `<svg x="${x0}" y="0" width="96" height="104" viewBox="${x0} 0 96 104">` + stone(k, x0 - sp[1] / 2, sy + 42, sp[1], 46, rng(5)) + stone(k, x0 + sp[1] / 2, sy + 42, sp[0], 46, rng(i + 9)) + stone(k, x0 + sp[1] / 2 + sp[0], sy + 42, sp[1], 46, rng(5)) + `</svg>`;
    s += grass(k, x0, x0 + 96, gy, r, false, false);
  }
  return { svg: s, w: 288, h: 104 };
}

// ---------------- backgrounds ----------------
function cloud(x, y, s, r, tint = '#d5e6fb') {
  const parts = [[0, 0, 34], [-38, 10, 24], [36, 12, 26], [-70, 20, 15], [68, 22, 16], [14, -22, 24], [-18, -14, 22]];
  let a = '', b = '';
  parts.forEach(([px, py, pr]) => { const jr = pr * (0.9 + r() * 0.25); a += `<circle cx="${f(px)}" cy="${f(py + 7)}" r="${f(jr)}"/>`; b += `<circle cx="${f(px)}" cy="${f(py)}" r="${f(jr)}"/>`; });
  return g(`translate(${f(x)},${f(y)}) scale(${f(s)})`, `<g fill="${tint}">${a}<rect x="-80" y="14" width="160" height="22" rx="11"/></g><g fill="#fff">${b}<rect x="-78" y="8" width="156" height="20" rx="10"/></g>`);
}
function ridge(r, y, amp, n, x0 = -40, x1 = 1320) {
  let d = `M${x0},720 L${x0},${f(y)} `; const step = (x1 - x0) / n; let px = x0, py = y;
  for (let i = 1; i <= n; i++) { const nx = x0 + step * i, ny = y - amp * (0.2 + r() * 0.8) * (i % 2 ? 1 : 0.15); d += `Q${f(px + step * .5)},${f(Math.min(py, ny) - amp * .25)} ${f(nx)},${f(ny)} `; px = nx; py = ny; }
  return d + `L${x1},720Z`;
}
function tree(x, y, s, pal, r) {
  // round fluffy tree; (x,y) = base of trunk
  const [c0, c1, c2, trunk] = pal; let k = '';
  k += `<path d="M-7,0 Q-4,-30 -6,-52 L6,-52 Q4,-30 8,0Z" fill="${trunk}"/><path d="M-1,-38 Q-14,-48 -18,-58 M1,-34 Q12,-46 18,-54" stroke="${trunk}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  const blobs = [[0, -92, 34], [-30, -72, 27], [30, -72, 28], [-14, -108, 22], [16, -112, 24], [0, -66, 28], [-44, -54, 17], [44, -56, 17]];
  blobs.forEach(([bx, by, br]) => { k += `<circle cx="${bx}" cy="${by}" r="${br}" fill="${c2}"/>`; });
  blobs.forEach(([bx, by, br]) => { k += `<circle cx="${bx - 3}" cy="${by - 4}" r="${br * .86}" fill="${c1}"/>`; });
  [[-12, -112, 13], [-34, -80, 12], [10, -98, 14], [26, -84, 10], [-4, -74, 9]].forEach(([bx, by, br]) => { k += `<circle cx="${bx - 4}" cy="${by - 4}" r="${br}" fill="${c0}" opacity=".85"/>`; });
  return g(`translate(${f(x)},${f(y)}) scale(${f(s)})`, k);
}
function pine(x, y, s, pal) {
  const [c0, c1, c2, trunk] = pal;
  return g(`translate(${f(x)},${f(y)}) scale(${f(s)})`, `<rect x="-4" y="-22" width="8" height="24" fill="${trunk}"/><path d="M0,-120 L26,-70 L14,-72 L34,-36 L-34,-36 L-14,-72 L-26,-70Z" fill="${c2}"/><path d="M0,-120 L18,-76 L4,-78 L20,-44 L-28,-40 L-12,-74 L-22,-72Z" fill="${c1}"/><path d="M0,-114 L-12,-82 L-2,-84Z" fill="${c0}" opacity=".8"/>`);
}
function bush(x, y, s, pal) {
  const [c0, c1, c2] = pal;
  return g(`translate(${f(x)},${f(y)}) scale(${f(s)})`, `<g fill="${c2}"><circle cx="-26" cy="-14" r="20"/><circle cx="0" cy="-24" r="26"/><circle cx="28" cy="-14" r="20"/><rect x="-46" y="-14" width="94" height="16"/></g><g fill="${c1}"><circle cx="-28" cy="-17" r="16"/><circle cx="-2" cy="-28" r="21"/><circle cx="26" cy="-17" r="16"/></g><circle cx="-8" cy="-34" r="9" fill="${c0}" opacity=".8"/><circle cx="-32" cy="-22" r="6" fill="${c0}" opacity=".8"/>`);
}
function flowers(x, y, r, n = 3) { let s = ''; for (let i = 0; i < n; i++) { const fx = x + i * 16 + r() * 8, fy = y - r() * 10; const col = ['#fff', '#ffe36b', '#ffb3d0'][Math.floor(r() * 3)]; s += `<path d="M${f(fx)},${f(fy)} v10" stroke="#3f9e2c" stroke-width="2"/>`; for (let j = 0; j < 5; j++) s += `<circle cx="${f(fx + C(j * 1.257) * 4)}" cy="${f(fy + S(j * 1.257) * 4)}" r="3.2" fill="${col}"/>`; s += `<circle cx="${f(fx)}" cy="${f(fy)}" r="2.4" fill="#ffb02e"/>`; } return s; }
function fence(x, y) { let s = ''; for (let i = 0; i < 3; i++) s += `<rect x="${x + i * 44}" y="${y - 64}" width="18" height="66" rx="5" fill="#d9a066" stroke="#9a6a3c" stroke-width="2.5"/>`; s = `<rect x="${x - 10}" y="${y - 50}" width="130" height="12" rx="4" fill="#c58b52" stroke="#9a6a3c" stroke-width="2.5"/><rect x="${x - 10}" y="${y - 24}" width="130" height="12" rx="4" fill="#c58b52" stroke="#9a6a3c" stroke-width="2.5"/>` + s; return s; }
// ---- landmarks (drawn hazy, in the distance) ----
function castle(x, y, s, roof = '#6d6fd6', wall = '#f3ead8', flag = '#ff6b6b') {
  const tower = (tx, w, h, rh) => `<rect x="${tx - w / 2}" y="${-h}" width="${w}" height="${h}" fill="${wall}"/><rect x="${tx - w / 2}" y="${-h}" width="${w * .35}" height="${h}" fill="#fff" opacity=".35"/><path d="M${tx - w / 2 - 5},${-h} L${tx},${-h - rh} L${tx + w / 2 + 5},${-h}Z" fill="${roof}"/><path d="M${tx - w / 2 - 5},${-h} L${tx},${-h - rh} L${tx - 2},${-h}Z" fill="#fff" opacity=".22"/><rect x="${tx - 4}" y="${-h * .75}" width="8" height="13" rx="4" fill="#8f86b8" opacity=".8"/>`;
  let k = tower(-52, 26, 70, 34) + tower(52, 26, 76, 36) + `<rect x="-44" y="-52" width="88" height="52" fill="${wall}"/><path d="M-44,-52 h12 v-8 h10 v8 h12 v-8 h10 v8 h12 v-8 h10 v8 h12 v-8 h10 v8Z" fill="${wall}"/><path d="M-10,0 v-20 a10,10 0 0 1 20,0 v20Z" fill="#9a86a8"/>` + tower(0, 34, 104, 46) +
    `<path d="M0,-150 v-24" stroke="#8f86b8" stroke-width="2.5"/><path d="M0,-174 l20,6 l-20,7Z" fill="${flag}"/>`;
  return g(`translate(${x},${y}) scale(${s})`, k);
}
function factory(x, y, s, r, wall = '#f2c9a0', roof = '#e58f6a') {
  let k = `<rect x="-120" y="-70" width="240" height="70" fill="${wall}"/><path d="M-120,-70 l40,-28 v28 l40,-28 v28 l40,-28 v28 l40,-28 v28 l40,-28 v28Z" fill="${roof}"/>`;
  for (let i = 0; i < 5; i++) k += `<rect x="${-104 + i * 44}" y="-50" width="26" height="20" rx="3" fill="#bfe8ff"/>`;
  k += `<rect x="60" y="-170" width="26" height="100" fill="#dba27d"/><rect x="56" y="-176" width="34" height="10" fill="${roof}"/><rect x="-96" y="-140" width="22" height="70" fill="#dba27d"/><rect x="-100" y="-146" width="30" height="10" fill="${roof}"/>`;
  k += `<g fill="#fff" opacity=".9"><circle cx="76" cy="-196" r="14"/><circle cx="92" cy="-214" r="18"/><circle cx="114" cy="-236" r="22"/><circle cx="-84" cy="-164" r="12"/><circle cx="-70" cy="-182" r="16"/></g>`;
  k += `<path d="M-160,-18 h60 M120,-30 h70 v30" stroke="#9fb2c8" stroke-width="10" fill="none" stroke-linecap="round"/>`;
  return g(`translate(${x},${y}) scale(${s})`, k);
}
function gear(x, y, R, col, op = 1) { let d = ''; const n = 10; for (let i = 0; i < n * 2; i++) { const a0 = i * PI / n, rr = i % 2 ? R : R * .8; d += `${i ? 'L' : 'M'}${f(C(a0 - .1) * rr)},${f(S(a0 - .1) * rr)} L${f(C(a0 + .1) * rr)},${f(S(a0 + .1) * rr)} `; } return `<g transform="translate(${x},${y})" opacity="${op}"><path d="${d}Z" fill="${col}"/><circle r="${R * .35}" fill="#fff" opacity=".5"/></g>`; }
function clockTower(x, y, s) {
  return g(`translate(${x},${y}) scale(${s})`, `<rect x="-36" y="-240" width="72" height="240" fill="#f6e3b8"/><rect x="-36" y="-240" width="24" height="240" fill="#fff" opacity=".35"/><path d="M-46,-240 L0,-310 L46,-240Z" fill="#e0734f"/><path d="M-46,-240 L0,-310 L-4,-240Z" fill="#fff" opacity=".2"/><circle cx="0" cy="-190" r="28" fill="#fff" stroke="#c9a15e" stroke-width="5"/><path d="M0,-190 v-18 M0,-190 l12,8" stroke="#7a5a34" stroke-width="4" stroke-linecap="round"/><rect x="-10" y="-130" width="20" height="30" rx="10" fill="#c9a15e"/><rect x="-10" y="-70" width="20" height="30" rx="10" fill="#c9a15e"/><path d="M0,-310 v-22" stroke="#c9a15e" stroke-width="3"/><circle cx="0" cy="-334" r="5" fill="#ffd24a"/>`);
}
function compassSign(x, y, s) {
  return g(`translate(${x},${y}) scale(${s})`, `<rect x="-5" y="-60" width="10" height="60" fill="#c9a15e"/><circle cx="0" cy="-86" r="34" fill="#ffe9a8" stroke="#d9a53a" stroke-width="7"/><path d="M0,-112 L9,-86 L-9,-86Z" fill="#ff6b6b"/><path d="M0,-60 L9,-86 L-9,-86Z" fill="#fff"/><circle cx="0" cy="-86" r="4" fill="#d9a53a"/>`);
}
function labDome(x, y, s, col = '#eaf6ff') {
  return g(`translate(${x},${y}) scale(${s})`, `<rect x="-110" y="-56" width="220" height="56" rx="6" fill="${col}"/><path d="M-70,-56 a70,66 0 0 1 140,0Z" fill="${col}"/><path d="M-58,-58 a60,56 0 0 1 60,-56" stroke="#fff" stroke-width="10" fill="none" opacity=".7"/><path d="M-40,-56 a40,40 0 0 1 80,0Z" fill="#a8e4ff"/><rect x="-96" y="-40" width="34" height="18" rx="4" fill="#a8e4ff"/><rect x="62" y="-40" width="34" height="18" rx="4" fill="#a8e4ff"/><path d="M0,-122 v-34" stroke="#b7c9da" stroke-width="5"/><circle cx="0" cy="-160" r="8" fill="#ff8f8f"/><rect x="-14" y="-24" width="28" height="24" rx="4" fill="#8fb4d6"/>`);
}
function coilTower(x, y, s) {
  let k = `<rect x="-10" y="-150" width="20" height="150" fill="#cfd9e6"/>`; for (let i = 0; i < 8; i++) k += `<rect x="-22" y="${-132 + i * 14}" width="44" height="10" rx="5" fill="#f2a55a"/>`;
  k += `<circle cx="0" cy="-166" r="18" fill="#fff3a8"/><circle cx="0" cy="-166" r="10" fill="#ffd24a"/><rect x="-30" y="-10" width="60" height="10" fill="#b7c9da"/>`;
  return g(`translate(${x},${y}) scale(${s})`, k);
}
function batteryTank(x, y, s) {
  return g(`translate(${x},${y}) scale(${s})`, `<rect x="-26" y="-110" width="52" height="110" rx="10" fill="#ffe27a"/><rect x="-26" y="-110" width="52" height="34" rx="10" fill="#7f8aa3"/><rect x="-10" y="-122" width="20" height="14" rx="4" fill="#dfe6ee"/><path d="M-9,-40 h18 M0,-49 v18" stroke="#e0734f" stroke-width="5" stroke-linecap="round"/><rect x="-20" y="-104" width="9" height="96" rx="4" fill="#fff" opacity=".4"/>`);
}
function mesa(x, y, w, h, col, col2) {
  return `<path d="M${x - w / 2 - 30},${y} Q${x - w / 2 - 6},${y - h * .5} ${x - w / 2 + 8},${y - h} L${x + w / 2 - 8},${y - h} Q${x + w / 2 + 6},${y - h * .5} ${x + w / 2 + 30},${y}Z" fill="${col}"/><path d="M${x - w / 2 + 8},${y - h} L${x + w / 2 - 8},${y - h} l-6,12 L${x - w / 2 + 12},${y - h + 14}Z" fill="${col2}"/><path d="M${x - w / 4},${y - h + 14} l-8,${h * .6} M${x + w / 5},${y - h + 12} l10,${h * .5}" stroke="${col2}" stroke-width="4" opacity=".5" stroke-linecap="round"/>`;
}
function fortress(x, y, s, wall = '#b7a2d6', dark = '#8f7ab8') {
  const horn = (tx, ty) => `<path d="M${tx - 16},${ty} v-16 a16,16 0 0 1 32,0 v16" fill="none" stroke="#ff8f8f" stroke-width="10"/><path d="M${tx},${ty - 32} a16,16 0 0 1 16,16 v16" fill="none" stroke="#7fb4ff" stroke-width="10"/><rect x="${tx - 21}" y="${ty - 4}" width="10" height="8" fill="#fff"/><rect x="${tx + 11}" y="${ty - 4}" width="10" height="8" fill="#fff"/>`;
  let k = `<rect x="-150" y="-90" width="300" height="90" fill="${wall}"/><path d="M-150,-90 h20 v-12 h20 v12 h20 v-12 h20 v12 h20 v-12 h20 v12 h20 v-12 h20 v12 h20 v-12 h20 v12 h20 v-12 h20 v12 h20 v-12 h20 v12 h20 v-12 h20 v12Z" fill="${wall}"/>` +
    `<rect x="-130" y="-170" width="56" height="170" fill="${dark}"/><rect x="74" y="-170" width="56" height="170" fill="${dark}"/><rect x="-44" y="-210" width="88" height="210" fill="${wall}"/><rect x="-44" y="-210" width="28" height="210" fill="#fff" opacity=".25"/>` +
    `<path d="M-22,0 v-46 a22,22 0 0 1 44,0 v46Z" fill="#6a568f"/><circle cx="0" cy="-140" r="22" fill="#ffe9a8"/><circle cx="0" cy="-140" r="12" fill="#ffc94a"/>` +
    g('rotate(180,-102,-188)', horn(-102, -188)) + g('rotate(180,102,-188)', horn(102, -188)) + g('rotate(180,0,-232)', horn(0, -232));
  return g(`translate(${x},${y}) scale(${s})`, k);
}
function windmill(x, y, s) {
  let k = `<path d="M-22,0 L-12,-90 L12,-90 L22,0Z" fill="#f6e9d0"/><path d="M-16,-90 L0,-112 L16,-90Z" fill="#e0734f"/><rect x="-6" y="-26" width="12" height="26" rx="6" fill="#b78a5e"/>`;
  for (let i = 0; i < 4; i++) k += `<g transform="rotate(${i * 90 + 20},0,-92)"><rect x="-3" y="-164" width="6" height="72" fill="#b78a5e"/><rect x="2" y="-162" width="20" height="50" fill="#fff" opacity=".9"/></g>`;
  return g(`translate(${x},${y}) scale(${s})`, k + `<circle cx="0" cy="-92" r="6" fill="#b78a5e"/>`);
}
function scrapHeap(x, y, s) {
  return g(`translate(${x},${y}) scale(${s})`, `<path d="M-120,0 Q-80,-70 -20,-84 Q40,-96 80,-50 Q110,-30 130,0Z" fill="#b9c4d4"/><path d="M-70,-30 l30,-30 l26,18 Z M10,-70 l34,6 l-12,30Z M50,-30 l40,10 l-30,16Z" fill="#dfe6ef"/>` + gear(-30, -36, 22, '#9fb0c6') + gear(64, -14, 16, '#a9b9cd') + `<rect x="-6" y="-104" width="10" height="34" fill="#9fb0c6" transform="rotate(20,-1,-87)"/>`);
}

const GREEN = ['#c9f27a', '#7fd65a', '#4fae4a', '#a5714a'];
const GREEN_FAR = ['#b7e6a0', '#8fd08f', '#6fba8a', '#9c8a78'];
const STAGES = {
  // sky: [top, mid, bottom]; mount: far mountain colours; hill: mid hills; items: landmark list
  1: { world: 'meadow', sky: ['#2f86ea', '#62b4f6', '#c9ecff'], mount: ['#8ebcf0', '#a9d3f4'], hills: ['#9fe08a', '#7cd06c', '#5fbe5a'], lake: 1, lm: s => `<path d="M120,480 Q300,400 480,480Z" fill="#a6e290"/>` + castle(300, 446, 1.15), side: 'tree', fence: 1 },
  2: { world: 'meadow', sky: ['#2a8fe6', '#6cc0f5', '#d6f3ff'], mount: ['#86c2e6', '#a5dbec'], hills: ['#8fdc8a', '#6cc878', '#4fb268'], forest: 2, lm: s => '', side: 'tree', dense: 1 },
  3: { world: 'meadow', sky: ['#3d96ee', '#7cc6f8', '#e0f6ff'], mount: ['#9ac4f2', '#b6dcf6'], hills: ['#b4e88a', '#8fd870', '#6cc45c'], bigHills: 1, lm: s => windmill(930, 392, 1.0), side: 'bush', lake: 1 },
  4: { world: 'factory', sky: ['#3aa0e0', '#84d0f0', '#e4f8f4'], mount: ['#a0c8e0', '#bcdcea'], hills: ['#c6e08a', '#a8cf72', '#8bbb60'], lm: (s, r) => factory(360, 420, 1.0, r) + gear(900, 330, 46, '#c9d6e4', .7), side: 'pipe' },
  5: { world: 'factory', sky: ['#42a6de', '#90d6ee', '#f0faea'], mount: ['#a8cce0', '#c4e0ea'], hills: ['#cfe494', '#b0d27a', '#92bd66'], lm: (s, r) => factory(860, 430, 1.15, r, '#f0d6a6', '#d9825a') + gear(260, 360, 38, '#c9d6e4', .7) + gear(318, 410, 26, '#d6e0ea', .7), side: 'pipe' },
  6: { world: 'factory', sky: ['#4a9ed8', '#98d2ea', '#f6f4e0'], mount: ['#aac6da', '#c6dce6'], hills: ['#d2de92', '#b4cb7a', '#98b668'], lm: (s, r) => scrapHeap(330, 440, 1.3) + scrapHeap(960, 450, 1.0) + factory(660, 400, 0.7, r), side: 'pipe' },
  7: { world: 'compass', sky: ['#4aa2ee', '#9ad4f6', '#fff3cc'], mount: ['#a8c8ee', '#c9e0f2'], hills: ['#a6e07a', '#84cd66', '#62b858'], forest: 2, lm: s => compassSign(250, 440, 1.2) + compassSign(1010, 430, 0.9), side: 'tree', dense: 1 },
  8: { world: 'compass', sky: ['#5aa8ee', '#a6d8f4', '#ffeec0'], mount: ['#b0cbee', '#d0e2f2'], hills: ['#b0e284', '#8ed06e', '#6cbc5e'], lm: s => clockTower(640, 470, 1.0) + castle(1010, 420, 0.8, '#e0734f', '#f6e3b8'), side: 'bush' },
  9: { world: 'compass', sky: ['#62a6ea', '#b0d8f2', '#ffe8b4'], mount: ['#b4c8ea', '#d4e0f0'], hills: ['#b6e088', '#94ce72', '#72ba62'], lm: s => castle(640, 450, 1.9, '#e0734f', '#f8e6bc', '#ffd24a') + compassSign(210, 450, 1.0) + compassSign(1070, 450, 1.0), side: 'bush' },
  10: { world: 'lab', sky: ['#28a8e0', '#7cdcf0', '#e6fff6'], mount: ['#9ad6e6', '#bceaf0'], hills: ['#a8ecc0', '#84dca8', '#62c890'], lm: s => labDome(380, 430, 1.1) + coilTower(820, 440, 1.0) + batteryTank(960, 440, 0.9), side: 'bush' },
  11: { world: 'lab', sky: ['#30a0e2', '#84d8f2', '#eafff2'], mount: ['#a0d2e8', '#c0e8f0'], hills: ['#b0eec4', '#8cdeac', '#6aca94'], lm: s => coilTower(300, 440, 1.3) + coilTower(980, 440, 1.3) + labDome(640, 420, 0.8), side: 'bush' },
  12: { world: 'lab', sky: ['#38a6e6', '#8edcf4', '#f0fff0'], mount: ['#a4d6ea', '#c4eaf2'], hills: ['#b6f0c8', '#92e0b0', '#70cc98'], lm: s => labDome(900, 430, 1.2) + batteryTank(260, 440, 1.0) + batteryTank(340, 440, 0.8) + coilTower(520, 440, 0.8), side: 'bush', lake: 1 },
  13: { world: 'fortress', sky: ['#5a8ee8', '#f6b8c8', '#ffe6b0'], mount: ['#e0a8b4', '#f0c4b8'], hills: ['#e8b888', '#dba070', '#c88a5c'], canyon: 1, lm: s => mesa(260, 470, 220, 190, '#e89a78', '#f6c09a') + mesa(980, 470, 260, 230, '#e08e70', '#f2b690') + mesa(640, 470, 160, 110, '#eeaa84', '#f8ccaa'), side: 'rock' },
  14: { world: 'fortress', sky: ['#6a86e6', '#f4a8c4', '#ffdca8'], mount: ['#dca0b8', '#eebcb8'], hills: ['#e2b08c', '#d49a74', '#c08460'], canyon: 1, lm: s => fortress(880, 460, 0.9) + mesa(240, 470, 240, 150, '#e69678', '#f4be9c'), side: 'rock' },
  15: { world: 'fortress', sky: ['#7480e4', '#f29cc0', '#ffd4a0'], mount: ['#d89abc', '#ecb6b8'], hills: ['#dcaa90', '#ce9478', '#ba7e64'], canyon: 1, lm: s => fortress(640, 465, 1.35), side: 'rock' },
  16: { world: 'fortress', sky: ['#7a6ee0', '#e88ccc', '#ffc8a8'], mount: ['#c890c8', '#e0a8c4'], hills: ['#c89ab8', '#b684a8', '#a07098'], canyon: 1, final: 1, lm: s => fortress(250, 470, 0.9, '#c0a6e0', '#9a80c4') + mesa(1100, 470, 300, 260, '#c88ab0', '#e0a8c8'), side: 'rock' },
};

function background(n) {
  const c = STAGES[n], r = rng(n * 7919 + 3);
  let s = '<defs>' + lg('sky', [[0, c.sky[0]], [0.55, c.sky[1]], [1, c.sky[2]]]) + lg('mnt', [[0, c.mount[0]], [1, c.mount[1]]]) +
    lg('h0', [[0, c.hills[0]], [1, c.hills[1]]]) + lg('h1', [[0, c.hills[1]], [1, c.hills[2]]]) + lg('lake', [[0, '#8fd8ff'], [1, '#4aa8ee']]) +
    lg('haze', [[0, '#fff', 0], [0.6, '#fff', 0.38], [1, '#fff', 0.1]]) +
    `<radialGradient id="sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".3" stop-color="#fff6c8" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>` +
    `<filter id="b2"><feGaussianBlur stdDeviation="1.6"/></filter><filter id="b1"><feGaussianBlur stdDeviation="0.8"/></filter></defs>`;
  s += `<rect width="1280" height="720" fill="url(#sky)"/>`;
  const warm = c.world === 'fortress';
  s += `<circle cx="${warm ? 640 : 1040}" cy="${warm ? 400 : 150}" r="${warm ? 300 : 200}" fill="url(#sun)"/>`;
  if (warm) s += `<circle cx="640" cy="400" r="74" fill="#fff6d8" opacity=".9"/>`;
  // clouds
  const tint = warm ? '#ffd9d0' : '#d5e6fb';
  let cl = ''; const cn = 6; for (let i = 0; i < cn; i++) cl += cloud(90 + i * 215 + r() * 90, 110 + r() * 170 + (i % 2) * 40, 0.55 + r() * 0.75, r, tint);
  s += `<g opacity=".95">${cl}</g>`;
  // far mountains
  s += `<g filter="url(#b2)"><path d="${ridge(r, 420, 150, 7)}" fill="url(#mnt)" opacity=".85"/><path d="${ridge(r, 450, 90, 9)}" fill="${c.mount[1]}" opacity=".9"/></g>`;
  // far hills + landmark
  const far = warm ? ['#f0c098', '#e0a880', '#cc9068', '#b07a5a'] : GREEN_FAR;
  s += `<g filter="url(#b1)"><path d="${ridge(r, 470, c.bigHills ? 120 : 60, 5)}" fill="url(#h0)" opacity=".95"/>`;
  s += c.lm(s, r);
  // distant tree line
  if (!c.canyon) { let t = ''; for (let x = -20; x < 1300; x += 34 + r() * 30) { const yy = 478 + r() * 14; t += r() < (c.forest ? 0.5 : 0.25) ? pine(x, yy, 0.42 + r() * .2, far) : tree(x, yy, 0.3 + r() * .16, far, r); } s += t; }
  s += `</g>`;
  s += `<rect y="300" width="1280" height="260" fill="url(#haze)"/>`;
  // mid hills
  s += `<path d="${ridge(r, 520, 46, 6)}" fill="url(#h1)"/>`;
  // lake / river
  if (c.lake) s += `<path d="M700,560 Q860,538 1010,548 Q1160,556 1290,540 L1290,640 L640,640 Q640,584 700,560Z" fill="url(#lake)"/><path d="M760,574 h90 M900,590 h140 M1080,570 h80 M820,606 h70" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".6"/>`;
  // mid trees
  const midPal = warm ? ['#f6d0a0', '#e8b07a', '#d09060', '#a5714a'] : ['#c4f08a', '#86d868', '#58b858', '#a5714a'];
  if (!c.canyon) {
    const n = c.dense ? 9 : 5;
    for (let i = 0; i < n; i++) { const x = 160 + (i + r() * .6) * (960 / n); const yy = 560 + r() * 30; s += (c.forest && r() < .4) ? pine(x, yy, 0.8 + r() * .3, midPal) : tree(x, yy, 0.62 + r() * .3, midPal, r); }
  } else { for (let i = 0; i < 4; i++) { const x = 200 + i * 300 + r() * 80; s += `<path d="M${x - 40},600 Q${x - 20},${560 - r() * 30} ${x},${556 - r() * 20} Q${x + 26},562 ${x + 46},600Z" fill="${c.hills[2]}"/><path d="M${x - 14},566 q10,-8 20,-4" stroke="#fff" stroke-width="4" opacity=".35" fill="none" stroke-linecap="round"/>`; } }
  // near ground band (behind the ground platform)
  s += `<path d="${ridge(r, 600, 22, 5)}" fill="${c.hills[2]}"/>`;
  s += `<rect width="1280" height="720" fill="#fff" opacity="${c.final ? 0.06 : 0.1}"/>`;
  // side framing
  const nearPal = warm ? ['#f2c090', '#dc9a68', '#b87850', '#8a5a40'] : ['#b6ec6a', '#6cc84a', '#3f9e3c', '#8a5a3c'];
  if (c.side === 'tree') { s += tree(40, 640, 2.3, nearPal, r) + tree(1250, 640, 2.1, nearPal, r) + bush(170, 632, 1.0, nearPal) + bush(1130, 632, 1.1, nearPal); }
  else if (c.side === 'bush') { s += bush(60, 634, 1.7, nearPal) + bush(1220, 634, 1.8, nearPal) + tree(1262, 640, 1.5, nearPal, r) + tree(14, 640, 1.4, nearPal, r); }
  else if (c.side === 'pipe') { s += `<path d="M-10,470 h70 v170" stroke="#aab8cc" stroke-width="34" fill="none"/><path d="M-10,462 h70" stroke="#fff" stroke-width="8" opacity=".5"/><rect x="34" y="520" width="52" height="16" rx="4" fill="#8fa0b8"/><path d="M1290,500 h-60 v140" stroke="#aab8cc" stroke-width="34" fill="none"/><rect x="1204" y="560" width="52" height="16" rx="4" fill="#8fa0b8"/>` + bush(150, 634, 1.1, nearPal) + bush(1120, 634, 1.2, nearPal); }
  else if (c.side === 'rock') { s += `<path d="M-20,640 L-10,470 Q30,440 70,480 L110,640Z" fill="${nearPal[2]}"/><path d="M-10,470 Q30,440 70,480 L50,500 Q20,470 0,492Z" fill="${nearPal[0]}"/><path d="M1300,640 L1290,450 Q1240,420 1200,470 L1170,640Z" fill="${nearPal[2]}"/><path d="M1290,450 Q1240,420 1200,470 L1222,490 Q1250,452 1284,474Z" fill="${nearPal[0]}"/>` + bush(180, 634, 0.9, ['#d6e87a', '#a8c85a', '#7fa048']) + bush(1090, 634, 1.0, ['#d6e87a', '#a8c85a', '#7fa048']); }
  if (c.fence) s += fence(0, 640);
  s += flowers(250, 624, r, 3) + flowers(520, 626, r, 2) + flowers(840, 624, r, 3) + flowers(1040, 626, r, 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">${s}</svg>`;
}
module.exports = { THEMES, themeDefs, platformSheet, groundSheet, background, STAGES };

// ---------------- special platforms (same strip layout as platformSheet: [48][96 x3][48], top surface at y=8) ----------------
function specialSheet(kind) {
  const O = '#3b2438'; let s = '';
  if (kind === 'cloud') { // fluffy cloud that fades in and out
    let shapes = `<rect x="8" y="14" width="368" height="30" rx="15"/>`;
    for (let x = 24; x <= 360; x += 24) shapes += `<circle cx="${x}" cy="${(x / 24) % 2 ? 44 : 40}" r="14"/><circle cx="${x}" cy="${(x / 24) % 2 ? 19 : 17}" r="11"/>`;
    s += `<g fill="#8fbdee" stroke="#8fbdee" stroke-width="6" stroke-linejoin="round">${shapes}</g><g fill="#dcecfc">${shapes}</g>`;
    let top = `<rect x="10" y="12" width="364" height="22" rx="11"/>`; for (let x = 24; x <= 360; x += 24) top += `<circle cx="${x}" cy="${(x / 24) % 2 ? 19 : 17}" r="10.5"/>`;
    s += `<g fill="#fff">${top}</g>`;
  } else if (kind === 'spring') { // bouncy pad on springs
    s += `<rect x="4" y="52" width="376" height="14" rx="6" fill="#5a6a94" stroke="${O}" stroke-width="2.5"/>`;
    for (let x = 24; x <= 360; x += 48) { const d = `M${x - 11},27 l22,5 l-22,5 l22,5 l-22,5 l22,5`; s += `<path d="${d}" fill="none" stroke="${O}" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#ffd34d" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>`; }
    s += `<rect x="2" y="8" width="380" height="20" rx="10" fill="#ff5a6a" stroke="${O}" stroke-width="2.5"/>`;
    for (let x = 12; x < 372; x += 24) s += `<path d="M${x + 6},10 l-7,16 h9 l7,-16Z" fill="#fff" opacity=".9"/>`;
    s += `<rect x="2" y="8" width="380" height="20" rx="10" fill="none" stroke="${O}" stroke-width="2.5"/><path d="M12,13 h360" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".5"/>`;
  } else if (kind === 'conveyor') { // conveyor belt with rollers
    s += `<rect x="2" y="8" width="380" height="40" rx="20" fill="#4a5670" stroke="${O}" stroke-width="2.5"/><rect x="6" y="10" width="372" height="9" rx="4.5" fill="#8f9db8"/>`;
    for (let x = 24; x <= 360; x += 48) s += `<circle cx="${x}" cy="31" r="11" fill="#aab8cc" stroke="${O}" stroke-width="2.2"/><circle cx="${x}" cy="31" r="3.5" fill="#4a5670"/>`;
    s += `<rect x="2" y="8" width="380" height="40" rx="20" fill="none" stroke="${O}" stroke-width="2.5"/>`;
  } else if (kind === 'wood') { // wooden bridge that crumbles when stepped on
    s += `<rect x="6" y="26" width="372" height="12" rx="4" fill="#a8703c" stroke="#6b4423" stroke-width="2.4"/>`;
    for (let x = 0; x < 384; x += 48) s += `<rect x="${x + 2}" y="8" width="44" height="21" rx="4" fill="#e0aa6c" stroke="#6b4423" stroke-width="2.4"/><path d="M${x + 8},13 h30" stroke="#f6d3a0" stroke-width="2.6" stroke-linecap="round"/><path d="M${x + 14},20 l8,3 l6,-4" stroke="#b07a45" stroke-width="1.8" fill="none" stroke-linecap="round"/><circle cx="${x + 9}" cy="23" r="1.8" fill="#6b4423"/><circle cx="${x + 39}" cy="23" r="1.8" fill="#6b4423"/>`;
  }
  return { svg: s, w: 384, h: 72 };
}
module.exports.specialSheet = specialSheet;
