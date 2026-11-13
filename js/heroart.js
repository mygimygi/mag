// MAGNET POP - hero + electromagnet vector rig (shared by the game and by tools/build.js).
// The default look is pre-rendered to assets/img/hero.png; a customised look is rasterised from this rig at runtime.
(function (root) {
  const OUT = '#3b2438';
  const f = n => Math.round(n * 100) / 100, S = Math.sin, C = Math.cos, PI = Math.PI;
  const lerp = (a, b, t) => a + (b - a) * t;
  function rot(x, y, deg) { const a = deg * PI / 180; return [x * C(a) - y * S(a), x * S(a) + y * C(a)]; }
  function ik(ax, ay, bx, by, l1, l2, dir) {
    let dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 0.001; const max = l1 + l2 - 0.01; if (d > max) d = max;
    const a = Math.atan2(dy, dx), A = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)))), ang = a + dir * A;
    return [ax + C(ang) * l1, ay + S(ang) * l1];
  }
  function limb(a, j, b, w, col, ow = 2.5) {
    const c = [j[0] * 2 - (a[0] + b[0]) / 2, j[1] * 2 - (a[1] + b[1]) / 2], d = `M${f(a[0])},${f(a[1])} Q${f(c[0])},${f(c[1])} ${f(b[0])},${f(b[1])}`;
    return `<path d="${d}" fill="none" stroke="${OUT}" stroke-width="${w + ow * 2}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
  }
  const g = (t, s) => `<g transform="${t}">${s}</g>`;
  const lg = (id, stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(s => `<stop offset="${s[0]}" stop-color="${s[1]}"/>`).join('')}</linearGradient>`;
  const rg = (id, stops, cx = 0.35, cy = 0.3, r = 0.8) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(s => `<stop offset="${s[0]}" stop-color="${s[1]}"/>`).join('')}</radialGradient>`;

  // ---------------- look options ----------------
  const OPTIONS = {
    gender: [['girl', '여자'], ['boy', '남자']],
    hair: [['pony', '포니테일'], ['twin', '양갈래'], ['bob', '단발'], ['long', '긴 머리'], ['short', '짧은 머리']],
    hairColor: [['brown', '#a2572a'], ['black', '#3a3340'], ['blonde', '#f2c04a'], ['red', '#e2553a'], ['blue', '#4a8fe8'], ['pink', '#f28ab8']],
    eyes: [['small', '작게'], ['medium', '보통'], ['large', '크게']],
    skin: [['light', '#ffd9b8'], ['fair', '#f7c9a0'], ['tan', '#dba677'], ['brown', '#b47a52'], ['dark', '#8a573a']],
    cloth: [['blue', '#4f86ea'], ['red', '#f25a5a'], ['green', '#4fc46e'], ['purple', '#9a6ce8'], ['orange', '#ff9a3d'], ['pink', '#ff86bd'], ['black', '#3d4258']],
    hat: [['goggles', '고글'], ['cap', '야구 모자'], ['explorer', '탐험 모자'], ['ribbon', '리본'], ['none', '없음']],
    glasses: [[false, '없음'], [true, '선글라스']],
  };
  const DEFAULT_LOOK = { gender: 'girl', hair: 'pony', hairColor: 'brown', eyes: 'medium', skin: 'light', cloth: 'blue', hat: 'goggles', glasses: false };
  const HAIRS = { brown: ['#b96a33', '#7c3f1c', '#733a1a', '#d08a46'], black: ['#4a4352', '#25202c', '#1c1822', '#7a7186'], blonde: ['#ffd866', '#e0a02a', '#b97a18', '#fff0a8'], red: ['#f06a4a', '#b8361f', '#9a2a18', '#ff9a78'], blue: ['#62a8f5', '#2f68c8', '#2552a8', '#a8d4ff'], pink: ['#ff9ec8', '#e0629a', '#c04a80', '#ffd0e4'] };
  const SKINS = { light: ['#ffd9b8', '#f4b48f', '#ffe3c8', '#f9c19c'], fair: ['#f7c9a0', '#e3a479', '#fbd5b2', '#eeb48a'], tan: ['#dba677', '#bf8454', '#e6b68a', '#cf9565'], brown: ['#b47a52', '#955d3a', '#c48a62', '#a56b45'], dark: ['#8a573a', '#6c4029', '#9a6648', '#7a4a31'] };
  const CLOTHS = {
    blue: { shirt: ['#ffffff', '#d9e4f5'], short: ['#4f86ea', '#2f58bb'], cuff: '#bcd4ff', scarf: '#ff4b55' },
    red: { shirt: ['#fff4f0', '#ffd2cc'], short: ['#f66a6a', '#c9303f'], cuff: '#ffc9c9', scarf: '#ffd34d' },
    green: { shirt: ['#f6fff2', '#d2f2cf'], short: ['#5fd07a', '#2f9a4c'], cuff: '#c9f5d2', scarf: '#ff8a3d' },
    purple: { shirt: ['#faf5ff', '#e2d4fb'], short: ['#a77bf0', '#6c3fc4'], cuff: '#e0d0ff', scarf: '#ffd34d' },
    orange: { shirt: ['#fff8ee', '#ffe2bd'], short: ['#ffa94d', '#e0701a'], cuff: '#ffe0b8', scarf: '#3f7fe8' },
    pink: { shirt: ['#fff5fa', '#ffd6e8'], short: ['#ff8fc0', '#e0508f'], cuff: '#ffd6e8', scarf: '#7fd0ff' },
    black: { shirt: ['#5a6078', '#3a3f55'], short: ['#3d4258', '#22263a'], cuff: '#8a90a8', scarf: '#ff4b55' },
  };
  let L = DEFAULT_LOOK, ES = 1, LASH = true, SKIN = '#ffd9b8', SKIN_SH = '#f4b48f', HAIR_SH = '#733a1a', HAIR_HI = '#d08a46', CL = CLOTHS.blue;
  function normLook(look) { const o = Object.assign({}, DEFAULT_LOOK, look || {}); for (const k in OPTIONS) if (!OPTIONS[k].some(v => v[0] === o[k])) o[k] = DEFAULT_LOOK[k]; return o; }
  function setLook(look) {
    L = normLook(look); ES = { small: 0.82, medium: 1, large: 1.17 }[L.eyes]; LASH = L.gender === 'girl';
    const sk = SKINS[L.skin], hr = HAIRS[L.hairColor]; SKIN = sk[0]; SKIN_SH = sk[1]; HAIR_SH = hr[2]; HAIR_HI = hr[3]; CL = CLOTHS[L.cloth]; return L;
  }
  function heroDefs() {
    const sk = SKINS[L.skin], hr = HAIRS[L.hairColor];
    return [lg('hHair', [[0, hr[0]], [1, hr[1]]]), lg('hSkin', [[0, sk[2]], [1, sk[3]]]), lg('hShirt', [[0, CL.shirt[0]], [1, CL.shirt[1]]]), lg('hShort', [[0, CL.short[0]], [1, CL.short[1]]]),
      lg('hPack', [[0, '#f0c55e'], [1, '#c98f33']]), lg('hShoe', [[0, '#ff5a5a'], [1, '#d42d3f']]), rg('hLens', [[0, '#d9fbff'], [0.6, '#63c8f5'], [1, '#2f86d8']], 0.3, 0.25, 0.9), lg('hIris', [[0, '#1d3f94'], [0.55, '#3d86ea'], [1, '#7fd0ff']])].join('');
  }
  const WS = 0.85; // in-game weapon scale

  function shoe(x, y, r) {
    // sneaker, heel at (0,0) local, toe to +x
    return g(`translate(${f(x)},${f(y)}) rotate(${f(r)})`,
      `<path d="M-9,-9 Q-11,2 -8,4 L15,4 Q19,3 18,-2 Q16,-7 8,-8 L3,-12 Z" fill="url(#hShoe)" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>` +
      `<path d="M9,-7.2 Q16,-6 17.5,-1.5 Q18,2.5 15,3 L8,3 Q7,-3 9,-7.2Z" fill="#fff"/>` +
      `<path d="M-9,1.2 L17.5,1.2 L16,4 L-8,4 Z" fill="#fff" stroke="${OUT}" stroke-width="1.6" stroke-linejoin="round"/>` +
      `<path d="M-1,-9 L4,-5 M2.5,-10.5 L7,-6.5" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>`);
  }

  function face(kind) {
    let s = '';
    const brow = (x, y, w, tilt) => `<path d="M${x - w},${y + tilt} Q${x},${y - 2.5} ${x + w},${y - tilt}" stroke="${HAIR_SH}" stroke-width="${LASH ? 2.2 : 3}" fill="none" stroke-linecap="round"/>`;
    const openEye = (x, y, rx0, ry0, lx = 0, rx = rx0 * ES, ry = ry0 * ES) =>
      `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff"/>` +
      `<ellipse cx="${x + 1 + lx}" cy="${y + .8}" rx="${rx * .82}" ry="${ry * .9}" fill="url(#hIris)"/>` +
      `<ellipse cx="${x + 1.2 + lx}" cy="${y + 1}" rx="${rx * .42}" ry="${ry * .5}" fill="#12204a"/>` +
      `<ellipse cx="${x - rx * .28 + lx}" cy="${y - ry * .42}" rx="${rx * .36}" ry="${ry * .3}" fill="#fff"/>` +
      `<circle cx="${x + rx * .45 + lx}" cy="${y + ry * .45}" r="${rx * .17}" fill="#fff" opacity=".9"/>` +
      `<path d="M${x - rx - 1.5},${y - ry * .35} Q${x - rx * .3},${y - ry - 2.6} ${x + rx + 1},${y - ry * .5}" stroke="${OUT}" stroke-width="2.8" fill="none" stroke-linecap="round"/>` +
      (LASH ? `<path d="M${x - rx - 1.5},${y - ry * .35} l-2.6,-1.8" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>` : '');
    const blush = `<ellipse cx="-4" cy="13" rx="6" ry="3.4" fill="#ff8f8f" opacity=".5"/><ellipse cx="26" cy="12.5" rx="4.5" ry="3" fill="#ff8f8f" opacity=".5"/>`;
    if (kind === 'normal' || kind === 'smile') {
      s += openEye(3.5, 3, 6.6, 9) + openEye(22.5, 3, 5.4, 8.6) + brow(3, -11, 6, 0.6) + brow(22.5, -11, 5, -0.6) + blush;
      s += kind === 'smile'
        ? `<path d="M7.5,15 Q14,25.5 20.5,15 Q14,17.3 7.5,15Z" fill="#b83a4a" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/><path d="M10.5,19.6 Q14,22.8 17.6,19.6 Q14,18.2 10.5,19.6Z" fill="#ff8d94"/>`
        : `<path d="M9,16 Q14,20.5 19,16" stroke="${OUT}" stroke-width="2.3" fill="none" stroke-linecap="round"/>`;
    } else if (kind === 'blink') {
      s += `<path d="M-3,4 Q3.5,9 10,4" stroke="${OUT}" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M17.5,4 Q22.5,9 28,4" stroke="${OUT}" stroke-width="2.6" fill="none" stroke-linecap="round"/>` + brow(3, -9, 6, 0.6) + brow(22.5, -9, 5, -0.6) + blush +
        `<path d="M9,16 Q14,20.5 19,16" stroke="${OUT}" stroke-width="2.3" fill="none" stroke-linecap="round"/>`;
    } else if (kind === 'effort') { // determined: brows down, open shout
      s += openEye(3.5, 3.5, 6.6, 8.4, 1) + openEye(22.5, 3.5, 5.4, 8, 1) + brow(3, -9.5, 6.4, -2.6) + brow(22.5, -9.5, 5.2, 2.6) + blush +
        `<path d="M8,14.5 Q14,13 20,14.5 Q20.5,24 14,24 Q7.5,24 8,14.5Z" fill="#b83a4a" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/><path d="M9.5,15.4 L18.6,15.4 L18.3,17.6 L9.8,17.6Z" fill="#fff"/><path d="M10.6,21.3 Q14,19.4 17.6,21.3 Q14,23.6 10.6,21.3Z" fill="#ff8d94"/>`;
    } else if (kind === 'happy') { // ^ ^ eyes, big open mouth
      s += `<path d="M-3,5 Q3.5,-5 10,5" stroke="${OUT}" stroke-width="2.8" fill="none" stroke-linecap="round"/><path d="M17.5,5 Q22.5,-5 28,5" stroke="${OUT}" stroke-width="2.8" fill="none" stroke-linecap="round"/>` + brow(3, -11.5, 6, 0.6) + brow(22.5, -11.5, 5, -0.6) + blush +
        `<path d="M6,13.5 Q14,28 22,13.5 Q14,16 6,13.5Z" fill="#b83a4a" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/><path d="M9.6,19.5 Q14,24 18.6,19.5 Q14,17.6 9.6,19.5Z" fill="#ff8d94"/>`;
    } else if (kind === 'hurt') { // > < eyes
      s += `<path d="M-2,-2 L8,3.5 L-2,9" stroke="${OUT}" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M28,-2 L18.5,3.5 L28,9" stroke="${OUT}" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` + blush +
        `<path d="M8.5,17 Q14,13.5 19.5,17 Q19.5,23.5 14,23.5 Q8.5,23.5 8.5,17Z" fill="#b83a4a" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/>` +
        `<path d="M31,-14 q3,-5 6,0 q-1,5 -3,5 q-3,0 -3,-5Z" fill="#8fd8ff" stroke="${OUT}" stroke-width="1.5"/>`;
    } else if (kind === 'ko') { // swirly eyes
      const sw = (x, y) => `<path d="M${x},${y} m0,-1 a1.5,1.5 0 1 1 -0.1,0 m0.1,-2.2 a3.7,3.7 0 1 1 -3.7,3.7 a6,6 0 0 1 6,-6" fill="none" stroke="${OUT}" stroke-width="2" stroke-linecap="round"/>`;
      s += sw(3.5, 3.5) + sw(22.5, 3.5) + blush + `<path d="M8.5,18 Q11,15 14,18 Q17,21 19.5,18" stroke="${OUT}" stroke-width="2.3" fill="none" stroke-linecap="round"/>`;
    }
    if (L.glasses) s += `<path d="M-7,1 L-19,5" stroke="${OUT}" stroke-width="3" stroke-linecap="round"/><path d="M13,1 h3" stroke="${OUT}" stroke-width="3"/>` +
      `<ellipse cx="3.5" cy="3.5" rx="10.5" ry="10" fill="#262a40" stroke="${OUT}" stroke-width="2.4"/><ellipse cx="23.5" cy="3.5" rx="8.6" ry="9.4" fill="#262a40" stroke="${OUT}" stroke-width="2.4"/>` +
      `<path d="M-2,-1 l5,-5 M1,2 l3,-3 M19,-1 l4,-4" stroke="#8fd0ff" stroke-width="2.2" stroke-linecap="round" opacity=".9"/>`;
    return s;
  }
  function head(p) {
    // local origin = head centre
    let s = ''; const hs = L.hair, sway = p.pony;
    const HF = `fill="url(#hHair)" stroke="${OUT}" stroke-width="2.6" stroke-linejoin="round"`;
    const tail = `<path d="M2,2 Q-8,-22 -30,-20 Q-50,-16 -50,6 Q-50,24 -36,34 Q-40,22 -34,14 Q-30,26 -18,30 Q-24,18 -18,8 Q-12,12 -2,10 Z" ${HF}/>` +
      `<path d="M-10,-10 Q-28,-16 -40,-4" stroke="${HAIR_HI}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".75"/><path d="M-26,2 Q-34,8 -32,18" stroke="${HAIR_SH}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".6"/>`;
    const tie = (x, y) => `<path d="M${x},${y} q5,-6 10,-1 q2,5 -3,9 q-7,0 -7,-8Z" fill="${CL.scarf}" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/>`;
    // hair behind the head
    if (hs === 'pony') s += `<g transform="translate(-22,-20) rotate(${f(sway)})">${tail}</g>`;
    if (hs === 'twin') s += `<g transform="translate(-25,-2) rotate(${f(-58 + sway * 0.5)}) scale(0.8)">${tail}</g>`;
    if (hs === 'long') s += `<g transform="rotate(${f(sway * 0.3)},-22,-12)"><path d="M-33,-10 Q-49,24 -44,62 Q-37,75 -24,70 Q-13,66 -15,52 Q-18,24 -13,6Z" ${HF}/><path d="M-37,14 Q-41,40 -35,60" stroke="${HAIR_HI}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/></g>`;
    s += hs === 'bob' ? `<path d="M-36,4 Q-40,-36 0,-37 Q39,-37 36,-2 Q30,-20 6,-20 Q-18,-20 -24,6 Q-24,24 -14,33 Q-30,41 -39,28 Q-42,14 -36,4Z" ${HF}/>`
      : `<path d="M-35,4 Q-40,-36 0,-37 Q39,-37 36,-2 Q30,-20 6,-20 Q-18,-20 -24,6 Q-26,20 -22,26 Q-34,22 -35,4Z" ${HF}/>`;
    // ear
    s += `<ellipse cx="-17" cy="8" rx="5.5" ry="7" fill="${SKIN}" stroke="${OUT}" stroke-width="2.2"/><path d="M-18.5,6 q2,2 0.5,5" stroke="${SKIN_SH}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    // face shape
    s += `<path d="M-19,-6 Q-21,16 -8,25 Q6,33 22,27 Q35,21 35,2 Q35,-24 8,-26 Q-16,-26 -19,-6Z" fill="url(#hSkin)" stroke="${OUT}" stroke-width="2.6" stroke-linejoin="round"/>`;
    s += face(p.face);
    if (hs === 'twin') s += `<g transform="rotate(${f(sway * 0.35)},-18,6)"><path d="M-23,2 Q-35,18 -30,40 Q-26,51 -17,46 Q-9,32 -13,8Z" ${HF}/><path d="M-26,14 Q-29,28 -25,40" stroke="${HAIR_HI}" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".6"/></g>` + tie(-27, 2);
    if (hs === 'pony') s += tie(-27, -26);
    // fringe
    s += hs === 'short'
      ? `<path d="M-24,8 Q-31,-12 -23,-26 L-29,-38 L-15,-33 L-12,-46 L-1,-37 L7,-49 L15,-37 L27,-44 L28,-31 L40,-31 L34,-18 Q38,-10 37,-4 Q33,-13 27,-16 Q28,-9 25,-5 Q21,-14 13,-18 Q13,-10 8,-5 Q5,-14 -3,-19 Q-3,-10 -9,-4 Q-12,-10 -14,-14 Q-19,-6 -18,6 Q-20,12 -24,8Z" ${HF}/>`
      : `<path d="M-24,8 Q-30,-14 -18,-28 Q-4,-40 16,-36 Q38,-32 37,-4 Q33,-13 27,-16 Q28,-9 25,-5 Q21,-14 13,-18 Q13,-10 8,-5 Q5,-14 -3,-19 Q-3,-10 -9,-4 Q-12,-10 -14,-14 Q-19,-6 -18,6 Q-20,12 -24,8Z" ${HF}/>`;
    s += `<path d="M-14,-27 Q0,-34 16,-31" stroke="${HAIR_HI}" stroke-width="3.4" fill="none" stroke-linecap="round" opacity=".8"/>`;
    s += `<path d="M-20,-8 Q-20,2 -21,7" stroke="${HAIR_SH}" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".6"/>`;
    // head wear
    const st = `stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"`;
    if (L.hat === 'goggles') s += `<g transform="translate(6,-30) rotate(8)">` +
      `<path d="M-30,3 Q-4,-12 28,2 L28,8 Q-4,-5 -30,9Z" fill="#6b4530" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/>` +
      `<ellipse cx="-7" cy="0" rx="10.5" ry="8.5" fill="#ffc83d" stroke="${OUT}" stroke-width="2.4"/><ellipse cx="-7" cy="0" rx="7" ry="5.6" fill="url(#hLens)" stroke="${OUT}" stroke-width="1.6"/>` +
      `<ellipse cx="14" cy="1.5" rx="9.5" ry="8" fill="#ffc83d" stroke="${OUT}" stroke-width="2.4"/><ellipse cx="14" cy="1.5" rx="6.2" ry="5.2" fill="url(#hLens)" stroke="${OUT}" stroke-width="1.6"/>` +
      `<path d="M-10.5,-2.5 q2.5,-2.5 5,-1.4" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M10.8,-0.8 q2.2,-2.4 4.6,-1.4" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/></g>`;
    else if (L.hat === 'cap') s += `<path d="M33,-22 Q56,-25 64,-12 Q49,-6 34,-11Z" fill="${CL.short[1]}" ${st}/><path d="M-32,-12 Q-36,-47 4,-47 Q40,-47 39,-15 Q4,-26 -32,-12Z" fill="${CL.short[0]}" ${st}/>` +
      `<path d="M12,-46 Q34,-44 37,-18 Q26,-21 14,-22Z" fill="#fff" opacity=".9"/><path d="M-22,-36 Q-10,-44 4,-43" stroke="#fff" stroke-width="3.4" fill="none" stroke-linecap="round" opacity=".6"/><circle cx="3" cy="-47" r="3.6" fill="#fff" stroke="${OUT}" stroke-width="2"/>`;
    else if (L.hat === 'explorer') s += `<path d="M-48,-17 Q4,-36 54,-15 Q54,-7 4,-13 Q-48,-7 -48,-17Z" fill="#d9ad5c" ${st}/><path d="M-26,-20 Q-29,-51 4,-51 Q34,-51 31,-20 Q4,-29 -26,-20Z" fill="#f0cf86" ${st}/>` +
      `<path d="M-26.5,-24 Q4,-33 31.5,-24 L31,-19 Q4,-28 -26,-19Z" fill="#8a5a34" stroke="${OUT}" stroke-width="1.8"/><path d="M-16,-40 Q-6,-47 6,-46" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/>`;
    else if (L.hat === 'ribbon') s += `<path d="M-14,-36 Q-36,-58 -42,-38 Q-40,-22 -14,-36Z" fill="${CL.scarf}" ${st}/><path d="M-14,-36 Q4,-60 12,-42 Q10,-26 -14,-36Z" fill="${CL.scarf}" ${st}/><circle cx="-14" cy="-36" r="5.5" fill="${CL.scarf}" ${st}/><path d="M-34,-44 q4,-4 8,-1" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/>`;
    return s;
  }
  /**
   * pose fields:
   *  bob (body y offset), lean (deg), headTilt, face, pony,
   *  footF/footB: [x, y, rot] ankle targets relative to ground,
   *  w: [x, y, rot] weapon grip transform (relative to ground origin),
   *  freeArm: [x,y] optional override for the near hand, backArm: [x,y] optional override far hand
   *  rotAll: whole body rotation around (0,-45), sy: vertical squash
   */
  function hero(pp) {
    const p = Object.assign({ bob: 0, lean: 0, headTilt: 0, face: 'normal', pony: 0, footF: [9, 0, 0], footB: [-9, 0, 0], w: [39, -43, -8], rotAll: 0, sy: 1, hx: 0 }, pp);
    const hip = [p.hx, -46 + p.bob];
    const up = (x, y) => { const r = rot(x, y, p.lean); return [hip[0] + r[0], hip[1] + r[1]]; };
    const shF = up(4, -27), shB = up(-2, -27), neck = up(2, -31);
    // weapon hand targets (rear grip & fore grip in weapon local space)
    const wr = (x, y) => { const r = rot(x, y, p.w[2]); return [p.w[0] + r[0], p.w[1] + r[1]]; };
    const handF = p.freeArm || wr(-36 * WS, 17 * WS), handB = p.backArm || wr(9 * WS, 14 * WS);
    let s = '';
    const leg = (hx, foot, shade) => {
      const hipP = [hip[0] + hx, hip[1] + 2], an = [foot[0], foot[1] - 9];
      const knee = ik(hipP[0], hipP[1], an[0], an[1], 20, 20, -1);
      return limb(hipP, knee, an, 10.5, shade ? SKIN_SH : SKIN) +
        // sock
        `<path d="M${f(an[0] - 5)},${f(an[1] - 2.5)} h10.5 v5 h-10.5Z" fill="#fff" stroke="${OUT}" stroke-width="1.8" stroke-linejoin="round"/>` +
        shoe(foot[0], foot[1] - 4, foot[2]);
    };
    // far arm (behind body)
    const elB = ik(shB[0], shB[1], handB[0], handB[1], 14, 14, 1);
    s += limb(shB, elB, handB, 8.5, SKIN_SH);
    // far leg
    s += leg(-4, p.footB, true);
    // backpack
    s += g(`translate(${f(hip[0])},${f(hip[1])}) rotate(${f(p.lean)})`,
      `<path d="M-13,-31 Q-29,-33 -30,-18 L-29,-6 Q-28,0 -19,-1 L-11,-2 Z" fill="url(#hPack)" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>` +
      `<path d="M-29.5,-20 Q-21,-15 -12.5,-20" stroke="${OUT}" stroke-width="2" fill="none"/><rect x="-23.5" y="-19" width="5" height="6.5" rx="1.5" fill="#fff3c4" stroke="${OUT}" stroke-width="1.6"/>` +
      `<path d="M-27,-9 h10" stroke="#a3722a" stroke-width="2" stroke-linecap="round"/>`);
    // torso
    s += g(`translate(${f(hip[0])},${f(hip[1])}) rotate(${f(p.lean)})`,
      // shorts
      `<path d="M-13.5,-9 L14,-9 Q17,2 15.5,9 L3.5,9.5 L1,3 L-2,9.5 L-14,9 Q-16,0 -13.5,-9Z" fill="url(#hShort)" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>` +
      `<path d="M-13.6,6 L-2.6,6.5 M4,6.5 L15.4,6" stroke="${CL.cuff}" stroke-width="2.2" stroke-linecap="round"/>` +
      // shirt
      `<path d="M-12,-31 Q1,-35 13,-30 Q17,-20 14.5,-8 L-13.5,-8 Q-15.5,-20 -12,-31Z" fill="url(#hShirt)" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>` +
      // pack strap
      `<path d="M-6,-32 Q-2,-20 -9,-9" stroke="${OUT}" stroke-width="6.5" fill="none" stroke-linecap="round"/><path d="M-6,-32 Q-2,-20 -9,-9" stroke="#e0a644" stroke-width="3.6" fill="none" stroke-linecap="round"/>` +
      // belt
      `<path d="M-13.8,-10.5 L14.6,-10.5 L14.8,-6.5 L-13.8,-6.5Z" fill="#8a5a34" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/><rect x="2" y="-11.5" width="6.5" height="6" rx="1.5" fill="#ffd34d" stroke="${OUT}" stroke-width="1.6"/>` +
      // neckerchief
      `<path d="M-8,-32 Q2,-27 12,-31 Q13,-26 9,-24 L11,-17 L4,-21 Q-3,-23 -8,-32Z" fill="${CL.scarf}" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/>`);
    // near leg
    s += leg(4, p.footF, false);
    // head
    const hc = [neck[0] + 3, neck[1] - 27];
    s += g(`translate(${f(hc[0])},${f(hc[1])}) rotate(${f(p.headTilt + p.lean * 0.4)})`, head(p));
    // near arm (in front of body) with sleeve
    const elF = ik(shF[0], shF[1], handF[0], handF[1], 14, 14, 1);
    s += limb(shF, elF, handF, 8.5, SKIN);
    const sl = [lerp(shF[0], elF[0], .42), lerp(shF[1], elF[1], .42)];
    s += `<path d="M${f(shF[0])},${f(shF[1])} L${f(sl[0])},${f(sl[1])}" stroke="${OUT}" stroke-width="15" stroke-linecap="round"/><path d="M${f(shF[0])},${f(shF[1])} L${f(sl[0])},${f(sl[1])}" stroke="${CL.shirt[0]}" stroke-width="10.5" stroke-linecap="round"/>` +
      `<path d="M${f(sl[0])},${f(sl[1])} l0.01,0" stroke="${CL.scarf}" stroke-width="10.5" stroke-linecap="round"/>`;
    if (p.freeArm) s += `<circle cx="${f(handF[0])}" cy="${f(handF[1])}" r="6" fill="${SKIN}" stroke="${OUT}" stroke-width="2.4"/>`;
    if (p.backArm) s = `<circle cx="${f(handB[0])}" cy="${f(handB[1])}" r="5.6" fill="${SKIN_SH}" stroke="${OUT}" stroke-width="2.4"/>` + s;
    let t = '';
    if (p.rotAll) t += `rotate(${f(p.rotAll)},0,-50) `;
    if (p.sy !== 1) t += `scale(${f(2 - p.sy)},${f(p.sy)})`;
    return t ? g(t, s) : s;
  }

  // ---- animations: each returns list of {pose} ; weapon transform is exported as metadata
  function anims() {
    const A = {};
    const N = (n, fn) => Array.from({ length: n }, (_, i) => fn(i / n, i));
    A.idle = N(6, t => { const b = S(t * 2 * PI); return { bob: b * 1.2, pony: b * 3, w: [30, -52 + b * 1.6, -8 + b * 1.5], face: t > 0.82 ? 'blink' : 'normal', headTilt: b * .8 }; });
    const gait = (n, stride, lift, lean, speedFace) => N(n, t => {
      const ph = t * 2 * PI;
      const foot = (o) => { const a = ph + o; const sw = S(a) > 0; return [C(a) * -stride + 2, sw ? -S(a) * lift : 0, sw ? lerp(-8, 14, (1 - C(a)) / 2) * S(a) : 0]; };
      const b = -Math.abs(S(ph)) * 2.4 + 1;
      return { bob: b - (lean > 10 ? 2 : 0), lean, footF: foot(0), footB: foot(PI), pony: S(ph * 2) * 6 + lean * 1.2, w: [31 + lean * .25, -52 + b + S(ph * 2) * 1.2, -8 + lean * .2], face: speedFace, headTilt: -lean * .25 };
    });
    A.walk = gait(8, 11, 8, 4, 'normal');
    A.run = gait(8, 17, 13, 13, 'smile');
    A.jump = [
      { bob: -4, lean: -4, footF: [4, -8, 18], footB: [-10, -3, 28], pony: 22, w: [31, -60, -16], face: 'smile', headTilt: -6 },
      { bob: -2, lean: 2, footF: [10, -6, -6], footB: [-8, -9, 12], pony: -24, w: [32, -54, -2], face: 'normal', headTilt: 4 },
    ];
    A.land = [
      { bob: 9, lean: 8, footF: [13, 0, 0], footB: [-13, 0, 0], pony: -16, w: [33, -42, 2], face: 'blink' },
      { bob: 4, lean: 4, footF: [11, 0, 0], footB: [-11, 0, 0], pony: -6, w: [31, -48, -4], face: 'normal' },
    ];
    // magnet ON: braced wide stance, weapon thrust forward, slight vibration
    A.magnet = N(4, (t, i) => { const v = i % 2 ? 1 : -1; return { bob: 5, lean: 12, footF: [19, 0, 0], footB: [-17, 0, -4], pony: 10 + v * 3, w: [40 + v * .8, -50 + v * .6, 0], face: 'effort', headTilt: -5 }; });
    // absorbing: recoil as monsters slam into the magnet
    A.absorb = [
      { bob: 6, lean: 6, footF: [17, 0, 0], footB: [-18, 0, -4], pony: 18, w: [35, -50, -5], face: 'effort', headTilt: -3 },
      { bob: 5, lean: 9, footF: [18, 0, 0], footB: [-17, 0, -4], pony: 12, w: [38, -50, -2], face: 'effort', headTilt: -4 },
      { bob: 5, lean: 12, footF: [19, 0, 0], footB: [-17, 0, -4], pony: 8, w: [40, -50, 0], face: 'effort', headTilt: -5 },
    ];
    A.shoot = [
      { bob: 4, lean: 16, footF: [21, 0, 0], footB: [-17, 0, -6], pony: 4, w: [45, -51, 0], face: 'effort', headTilt: -6 },
      { bob: 5, lean: -6, footF: [15, 0, 0], footB: [-20, 0, 0], pony: 26, w: [27, -54, -14], face: 'effort', headTilt: 4 },
      { bob: 3, lean: -2, footF: [13, 0, 0], footB: [-15, 0, 0], pony: 14, w: [29, -54, -11], face: 'smile', headTilt: 2 },
      { bob: 1, lean: 0, footF: [10, 0, 0], footB: [-11, 0, 0], pony: 4, w: [30, -53, -9], face: 'smile' },
    ];
    A.hurt = [
      { bob: -3, lean: -16, footF: [8, -7, -20], footB: [-12, -2, -10], pony: 30, w: [22, -62, -34], face: 'hurt', headTilt: -8 },
      { bob: -1, lean: -12, footF: [6, -3, -12], footB: [-13, 0, 0], pony: 20, w: [23, -58, -28], face: 'hurt', headTilt: -6 },
    ];
    A.victory = N(6, t => { const b = S(t * 2 * PI); const up = Math.max(0, b); return { bob: -up * 9, footF: [9, -up * 9, up * 10], footB: [-9, -up * 9, up * 14], pony: -b * 14, w: [-2, -152 - up * 9, -78], backArm: null, freeArm: null, face: 'happy', headTilt: -4 + b * 2, lean: -3, victory: true }; });
    A.death = [
      { bob: -4, lean: -18, footF: [6, -8, -20], footB: [-12, -3, -10], pony: 30, w: [20, -64, -40], face: 'hurt', rotAll: -10, drop: 0 },
      { bob: -2, lean: -24, footF: [4, -6, -20], footB: [-10, -2, -10], pony: 34, w: [14, -66, -60], face: 'ko', rotAll: -32, drop: 8 },
      { bob: 0, lean: -20, footF: [8, -4, -10], footB: [-8, -2, -10], pony: 20, w: [6, -60, -80], face: 'ko', rotAll: -62, drop: 20 },
      { bob: 0, lean: -10, footF: [10, -2, 0], footB: [-8, -2, 0], pony: 6, w: [0, -56, -86], face: 'ko', rotAll: -84, drop: 30 },
      { bob: 0, lean: -10, footF: [10, -2, 0], footB: [-8, -2, 0], pony: 0, w: [0, -56, -86], face: 'ko', rotAll: -88, drop: 31 },
    ];
    return A;
  }
  // victory: weapon held overhead in near hand, far hand makes a fist pump
  function finalize(p) {
    const q = Object.assign({}, p);
    if (p.victory) { q.backArm = [-24, -92 + (p.bob || 0)]; } else if (q.w) { q.w = [q.w[0] + 9, q.w[1] + 9, q.w[2]]; }
    return q;
  }
  // world-space weapon transform for a pose (accounts for rotAll)
  function weaponXform(p0) {
    const p = finalize(p0);
    let [x, y, r] = p.w || [39, -43, -8];
    if (p.rotAll) { const v = rot(x, y + 50, p.rotAll); x = v[0]; y = v[1] - 50; r += p.rotAll; }
    if (p.drop) y += p.drop;
    return [f(x), f(y), f(r)];
  }
  function frame(p) { const q = finalize(p); let s = hero(q); if (p.drop) s = g(`translate(0,${p.drop})`, s); return s; }

  // ---------------- electromagnet ----------------
  const weaponDefs = [
    lg('wBody0', [[0, '#8fa6c9'], [1, '#52648c']]), lg('wBody1', [[0, '#7fc0f5'], [1, '#2f6fd0']]), lg('wBody2', [[0, '#c09af5'], [1, '#6f3fca']]), lg('wBody3', [[0, '#ff9a8a'], [1, '#d83a3a']]), lg('wBody4', [[0, '#ff6a5a'], [1, '#9c0f24']]),
    lg('wGold', [[0, '#fff3a6'], [0.5, '#ffc93a'], [1, '#d48a12']]), lg('wRedT', [[0, '#ff5a5a'], [1, '#b0101f']]), lg('wBlueT', [[0, '#5aa8ff'], [1, '#1a3fb8']]),
    lg('wCu1', [[0, '#ffd39a'], [0.35, '#f09a45'], [1, '#a9521a']]), lg('wCu2', [[0, '#ffe6a0'], [0.35, '#ffa42e'], [1, '#c85a12']]), lg('wCu3', [[0, '#fff0a8'], [0.35, '#ff7a3a'], [1, '#c4261a']]),
    lg('wBat1', [[0, '#ffe66b'], [0.6, '#ffc21f'], [1, '#d98b00']]), lg('wBat2', [[0, '#ffcf7a'], [0.6, '#ff8f1f'], [1, '#d95a00']]), lg('wBat3', [[0, '#ffa08a'], [0.6, '#f2452e'], [1, '#a81515']]),
    lg('wCore', [[0, '#eef2f7'], [0.5, '#aab4c4'], [1, '#6f7a8e']]),
    lg('wCu', [[0, '#ffd39a'], [0.35, '#f09a45'], [1, '#a9521a']]),
    lg('wCuOn', [[0, '#fffbe0'], [0.4, '#ffd257'], [1, '#f08a2a']]),
    lg('wRed', [[0, '#ff7a7a'], [1, '#d92638']]),
    lg('wBlue', [[0, '#6fb6ff'], [1, '#2a5fd6']]),
    lg('wTip', [[0, '#ffffff'], [1, '#aab6c8']]),
    lg('wBat', [[0, '#ffe66b'], [0.6, '#ffc21f'], [1, '#d98b00']]),
    lg('wBatK', [[0, '#5a5f6e'], [1, '#22252e']]),
    `<filter id="wGlow" x="-60%" y="-120%" width="220%" height="340%"><feGaussianBlur stdDeviation="5"/></filter>`,
  ].join('');
  const TURNS = [0, 5, 9, 13]; // visible windings for 10 / 20 / 30 turns

  function battery(x, y, lv) {
    // one cell 30x11 lying horizontally, + terminal to the right
    return g(`translate(${x},${y})`,
      `<rect x="-15" y="-5" width="28" height="10" rx="3" fill="url(#wBat${lv})" stroke="${OUT}" stroke-width="2.2"/>` +
      `<path d="M-15,-2 q0,-3 3,-3 h7 v10 h-7 q-3,0 -3,-3Z" fill="url(#wBatK)"/>` +
      `<rect x="13" y="-2.6" width="4" height="5.2" rx="1.2" fill="#dfe6ee" stroke="${OUT}" stroke-width="1.8"/>` +
      `<path d="M3.5,0 h5 M6,-2.5 v5" stroke="#b33" stroke-width="1.7" stroke-linecap="round"/>` +
      `<path d="M-12,-3.2 h22" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>`);
  }

  function weapon(batt, coil, on) {
    let s = '';
    const tier = batt + coil - 2;      // 0..4: overall upgrade tier drives the body colour and the decorations
    const spark = (x, y, r) => `<path d="M${x},${y - r} L${x + r * .28},${y - r * .28} L${x + r},${y} L${x + r * .28},${y + r * .28} L${x},${y + r} L${x - r * .28},${y + r * .28} L${x - r},${y} L${x - r * .28},${y - r * .28}Z" fill="#fff7a8" stroke="#ff9d1e" stroke-width="1.4" stroke-linejoin="round"/>`;
    if (tier >= 3) s += `<ellipse cx="26" cy="-6" rx="${74 + tier * 3}" ry="${34 + tier * 3}" fill="${tier === 4 ? '#ff4a2e' : '#ff8a5a'}" opacity="${tier === 4 ? 0.5 : 0.3}" filter="url(#wGlow)"/>`;
    // glow behind coil when current flows
    const n = TURNS[coil], x0 = 6, pitch = 4.3, coilR = 9 + coil * 1.3;
    if (on) s += `<ellipse cx="${x0 + n * pitch / 2}" cy="0" rx="${n * pitch / 2 + 12}" ry="${coilR + 9}" fill="#ffe46b" opacity=".85" filter="url(#wGlow)"/>`;
    // battery pack on a bracket above the coil: cells are stacked and wired in series
    const by = i => -27 - i * 11;
    const topY = by(batt - 1), px0 = 2, px1 = 40, pcx = 21;
    // wires: red (+) from pack to the front end of the coil, dark (-) to the rear end
    const wire = (d, col) => `<path d="${d}" fill="none" stroke="${OUT}" stroke-width="4.6" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="2.2" stroke-linecap="round"/>`;
    s += wire(`M${px1 - 1},${by(0)} Q${px1 + 12},${by(0) + 2} ${x0 + n * pitch + 11},${-coilR + 1}`, '#ff5252');
    s += wire(`M${px0 + 1},${topY} Q${px0 - 13},${topY + 6} ${x0 + 11},${-coilR + 1}`, '#3d4455');
    for (let i = 0; i < batt - 1; i++) { const xj = i % 2 === 0 ? px0 + 1 : px1 - 1, dir = i % 2 === 0 ? -1 : 1; s += wire(`M${xj},${by(i)} q${dir * 7},-5.5 0,-11`, '#ffb02e'); }
    // bracket + holder plate
    s += `<path d="M-3,-10 v-9 h8" fill="none" stroke="${OUT}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/><path d="M-3,-10 v-9 h8" fill="none" stroke="#52648c" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round"/>`;
    s += `<rect x="${px0}" y="${topY - 8}" width="${px1 - px0}" height="${-19 - (topY - 8)}" rx="3" fill="#3e4a66" stroke="${OUT}" stroke-width="2.4"/>`;
    for (let i = 0; i < batt; i++) s += g(i % 2 ? `translate(${pcx * 2},0) scale(-1,1)` : '', battery(pcx, by(i), batt));
    // iron core rod
    s += `<rect x="0" y="-5" width="66" height="10" rx="3" fill="url(#wCore)" stroke="${OUT}" stroke-width="2.4"/>`;
    // stock / handle body
    s += `<path d="M-40,-11 L2,-11 Q7,-11 7,-6 L7,5 Q7,10 2,10 L-26,10 L-30,22 Q-31.5,26 -36,25 L-40,24 Q-43,23 -42,19 L-39,9 Q-44,7 -44,1 L-44,-7 Q-44,-11 -40,-11Z" fill="url(#wBody${tier})" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>`;
    if (tier >= 2) s += `<path d="M-30,-11 l-6,21 M-22,-11 l-6,21" stroke="url(#wGold)" stroke-width="3.4" stroke-linecap="butt"/>`;
    if (tier >= 4) s += `<path d="M-41,-11 l-12,-13 l19,5 l8,8Z" fill="url(#wGold)" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/><path d="M-12,-8 l6,6.5 l-6,6.5 l-6,-6.5Z" fill="#7ff0ff" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/><path d="M-14,-3 l2,-2" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`;
    s += `<path d="M-38,-7 h38" stroke="#c9d6ee" stroke-width="2" stroke-linecap="round" opacity=".8"/>`;
    s += `<circle cx="-33" cy="1" r="3" fill="${on ? '#7dff6b' : '#34435f'}" stroke="${OUT}" stroke-width="1.6"/>`;
    // fore grip under the core
    s += `<path d="M3,6 h12 l-1,11 q-0.5,3 -3.5,3 h-3 q-3,0 -3.5,-3Z" fill="${tier >= 3 ? 'url(#wGold)' : '#46567a'}" stroke="${OUT}" stroke-width="2.3" stroke-linejoin="round"/>`;
    // copper enamel wire coil (each visible winding = one ring)
    for (let i = 0; i < n; i++) {
      const cx = x0 + pitch / 2 + i * pitch + 12;
      s += `<rect x="${f(cx - 2.6)}" y="${f(-coilR)}" width="5.2" height="${f(coilR * 2)}" rx="2.6" fill="url(#${on ? 'wCuOn' : 'wCu' + coil})" stroke="${OUT}" stroke-width="1.7"/>`;
    }
    if (coil >= 2) for (const cx of [x0 + 12 - 3.4, x0 + 12 + n * pitch + 0.2]) s += `<rect x="${f(cx)}" y="${f(-coilR - 2.5)}" width="3.4" height="${f(coilR * 2 + 5)}" rx="1.5" fill="url(#wGold)" stroke="${OUT}" stroke-width="1.5"/>`;
    if (coil === 3) { // extra outer layer bumps for the densest coil
      for (let i = 0; i < n - 1; i++) { const cx = x0 + pitch + i * pitch + 12; s += `<path d="M${f(cx - 1.6)},${f(-coilR - 1.6)} h3.2 M${f(cx - 1.6)},${f(coilR + 1.6)} h3.2" stroke="${OUT}" stroke-width="3.6" stroke-linecap="round"/><path d="M${f(cx - 1.4)},${f(-coilR - 1.6)} h2.8 M${f(cx - 1.4)},${f(coilR + 1.6)} h2.8" stroke="${on ? '#fff3a8' : '#ffb869'}" stroke-width="1.6" stroke-linecap="round"/>`; }
    }
    // horseshoe pole piece: red (N) on top, blue (S) below, bright steel tips
    const uw = 10.5 + tier * 0.9, U = (d, col) => `<path d="${d}" fill="none" stroke="${OUT}" stroke-width="${uw + 5}" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${uw}" stroke-linejoin="round"/>`;
    s += U('M84,-15 H70 A15,15 0 0 0 55,0', tier >= 2 ? 'url(#wRedT)' : 'url(#wRed)');
    s += U('M55,0 A15,15 0 0 0 70,15 H84', tier >= 2 ? 'url(#wBlueT)' : 'url(#wBlue)');
    if (tier >= 2) s += `<rect x="66" y="${f(-15 - uw / 2 - 0.6)}" width="4.6" height="${f(uw + 1.2)}" fill="url(#wGold)" stroke="${OUT}" stroke-width="1.5"/><rect x="66" y="${f(15 - uw / 2 - 0.6)}" width="4.6" height="${f(uw + 1.2)}" fill="url(#wGold)" stroke="${OUT}" stroke-width="1.5"/>`;
    s += `<rect x="75.5" y="${f(-15 - uw / 2)}" width="10" height="${f(uw)}" fill="url(#${tier >= 4 ? 'wGold' : 'wTip'})" stroke="${OUT}" stroke-width="2.4"/><rect x="75.5" y="${f(15 - uw / 2)}" width="10" height="${f(uw)}" fill="url(#${tier >= 4 ? 'wGold' : 'wTip'})" stroke="${OUT}" stroke-width="2.4"/>`;
    if (tier >= 3) s += spark(94, -27, 6) + spark(-50, -30, 5);
    if (tier >= 4) s += spark(98, 6, 7) + spark(48, -36 - batt * 9, 6) + spark(-58, 8, 5);
    s += `<path d="M61,-12 Q66,-18 74,-17.5" stroke="#ffd0d0" stroke-width="2" fill="none" stroke-linecap="round" opacity=".9"/>`;
    if (on) s += `<path d="M90,-22 l5,-4 M92,-15 l7,-1 M90,22 l5,4 M92,15 l7,1" stroke="#fff7a0" stroke-width="2.6" stroke-linecap="round"/>`;
    // hands gripping (rear grip + fore grip)
    const hand = (x, y) => `<path d="M${x - 6},${y - 3} q0,-4.5 6,-4.5 q6.5,0 6.5,5 q0,6 -6.5,6 q-6,0 -6,-6.5Z" fill="${SKIN}" stroke="${OUT}" stroke-width="2.3"/><path d="M${x - 3.5},${y - 2} h7 M${x - 3.5},${y + 1} h7" stroke="${SKIN_SH}" stroke-width="1.4" stroke-linecap="round"/>`;
    s += hand(-36, 17) + hand(9, 14);
    return s;
  }

  // ---------------- sprite sheets ----------------
  const HERO_CELL = { w: 240, h: 200, ax: 140, ay: 190, cols: 9 }, WEAPON_CELL = { w: 180, h: 130, ax: 64, ay: 94, cols: 6 };
  function sheetSVG(defs, frames, cell) {
    const rows = Math.ceil(frames.length / cell.cols), W = cell.cols * cell.w, Hh = rows * cell.h; let b = '';
    frames.forEach((fr, i) => { b += `<svg x="${(i % cell.cols) * cell.w}" y="${Math.floor(i / cell.cols) * cell.h}" width="${cell.w}" height="${cell.h}" viewBox="0 0 ${cell.w} ${cell.h}" overflow="hidden"><g transform="translate(${cell.ax},${cell.ay})">${fr}</g></svg>`; });
    return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Hh}" viewBox="0 0 ${W} ${Hh}"><defs>${defs}</defs>${b}</svg>`, w: W, h: Hh };
  }
  function heroFrames() { const A = anims(), out = []; for (const k of Object.keys(A)) for (const p of A[k]) out.push(frame(p)); return out; }
  function weaponFrames() { const out = []; for (let on = 0; on < 2; on++) for (let b = 1; b <= 3; b++) for (let c = 1; c <= 3; c++) out.push(weapon(b, c, on)); return out; }
  function heroSheet(look) { setLook(look); return sheetSVG(heroDefs(), heroFrames(), HERO_CELL); }
  function weaponSheet(look) { setLook(look); return sheetSVG(weaponDefs, weaponFrames(), WEAPON_CELL); }
  // one standing frame with the electromagnet, for the dress-up preview
  function previewSVG(look, batt, coil) {
    setLook(look); const p = anims().idle[0], w = weaponXform(p);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-70 -175 220 190"><defs>${heroDefs()}${weaponDefs}</defs>${frame(p)}<g transform="translate(${w[0]},${w[1]}) rotate(${w[2]}) scale(${WS})">${weapon(batt || 1, coil || 1, 0)}</g></svg>`;
  }
  const api = { OPTIONS, DEFAULT_LOOK, normLook, setLook, heroDefs, weaponDefs, hero, anims, frame, weaponXform, weapon, TURNS, WS, HERO_CELL, WEAPON_CELL, sheetSVG, heroFrames, weaponFrames, heroSheet, weaponSheet, previewSVG };
  root.MPArt = api; if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
