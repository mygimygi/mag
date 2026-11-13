// Boss rigs: Compass King (mid boss) and Magnet Titan (final boss) + parts, and small fx/icon sprites.
const { OUT, f, g, lg, rg, S, C, PI, eye, lerp } = require('./common');
const defs = [
  rg('kBody', [[0, '#fff2b0'], [0.5, '#f5c542'], [1, '#c98a1a']], 0.35, 0.25, 0.9),
  lg('kGold', [[0, '#fff3a6'], [0.5, '#ffc93a'], [1, '#d48a12']]),
  rg('kDial', [[0, '#ffffff'], [1, '#e4eefc']], 0.5, 0.5, 0.7),
  lg('kNavy', [[0, '#5b7be0'], [1, '#2c3f9c']]),
  lg('tBody', [[0, '#9aa6e8'], [0.5, '#6670c4'], [1, '#3c3f8c']]),
  lg('tDark', [[0, '#565ca8'], [1, '#2a2c66']]),
  lg('tSteel', [[0, '#f6f8fc'], [1, '#a2aec4']]),
  lg('tRed', [[0, '#ff8a8a'], [1, '#d92b3c']]), lg('tBlue', [[0, '#7cc4ff'], [1, '#2d62d8']]),
  lg('tCu', [[0, '#ffd39a'], [0.4, '#f09a45'], [1, '#a9521a']]),
  rg('tCore', [[0, '#ffffff'], [0.4, '#fff07a'], [1, '#ff9a2e']], 0.5, 0.5, 0.6),
  rg('tEye', [[0, '#fffbd0'], [1, '#ffd21f']], 0.4, 0.35, 0.8),
  lg('fHeart', [[0, '#ff7a8a'], [1, '#e8203f']]),
  lg('fBolt', [[0, '#f4f8ff'], [0.5, '#b9c6dc'], [1, '#7c8aa6']]),
  lg('fStar', [[0, '#fff7a8'], [1, '#ffc21f']]),
  lg('fBat', [[0, '#ffe66b'], [1, '#e0950a']]),
  `<filter id="tGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter>`,
].join('');
const st = `stroke="${OUT}" stroke-width="3" stroke-linejoin="round"`;
const rivet = (x, y, r = 3, c = '#eef2fa') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="${OUT}" stroke-width="1.8"/>`;

// ---------- Compass King ----------  (needle is a separate sprite drawn at belly centre (0,-66))
function king(p) {
  p = Object.assign({ sq: 1, tilt: 0, step: null, mood: 'angry', arms: 0 }, p);
  let s = '';
  [[-1, 0], [1, .5]].forEach(([sd, off]) => { let lx = 0, ly = 0; if (p.step != null) { const a = (p.step + off) * 2 * PI; lx = C(a) * 7; ly = -Math.max(0, S(a)) * 9; }
    s += `<path d="M${f(sd * 34 - 22 + lx)},${f(-1 + ly)} q0,-18 22,-18 q24,0 24,18Z" fill="url(#kNavy)" ${st}/>`; });
  let b = '';
  const a = p.arms;
  // arms / gloves
  b += `<circle cx="-86" cy="${f(-78 - a * 40)}" r="15" fill="#fff" ${st}/><circle cx="86" cy="${f(-78 - a * 40)}" r="15" fill="#fff" ${st}/>`;
  // body
  b += `<path d="M0,-176 Q84,-176 84,-90 Q84,-10 0,-10 Q-84,-10 -84,-90 Q-84,-176 0,-176Z" fill="url(#kBody)" ${st}/>`;
  b += `<path d="M-56,-144 Q-30,-168 6,-168" stroke="#fff" stroke-width="7" stroke-linecap="round" fill="none" opacity=".65"/>`;
  // belly compass dial
  b += `<circle cx="0" cy="-66" r="47" fill="url(#kNavy)" ${st}/><circle cx="0" cy="-66" r="39" fill="url(#kDial)" stroke="${OUT}" stroke-width="2.4"/>`;
  for (let i = 0; i < 12; i++) { const an = i * PI / 6, r1 = i % 3 === 0 ? 29 : 33; b += `<path d="M${f(S(an) * r1)},${f(-66 - C(an) * r1)} L${f(S(an) * 37)},${f(-66 - C(an) * 37)}" stroke="${i === 0 ? '#e8203f' : '#5a6a8c'}" stroke-width="${i % 3 === 0 ? 3 : 1.8}" stroke-linecap="round"/>`; }
  // face
  const m = p.mood;
  b += eye(-22, -128, 13, m, 1, [2, 1], '#e0a52a') + eye(24, -128, 13, m, -1, [2, 1], '#e0a52a');
  // moustache + mouth
  b += m === 'ko' || m === 'dizzy' || m === 'scared'
    ? `<ellipse cx="1" cy="-104" rx="7" ry="6" fill="#7a1f2e" ${st} stroke-width="2.2"/>` : '';
  b += `<path d="M1,-112 Q-10,-102 -26,-108 Q-20,-98 -8,-100 Q-2,-101 1,-106 Q4,-101 10,-100 Q22,-98 28,-108 Q12,-102 1,-112Z" fill="#fff" ${st} stroke-width="2.4"/>`;
  // crown
  b += `<path d="M-34,-170 L-42,-204 L-20,-188 L0,-212 L20,-188 L42,-204 L34,-170 Q0,-180 -34,-170Z" fill="url(#kGold)" ${st}/>` +
    `<circle cx="0" cy="-212" r="6" fill="#ff4b55" ${st} stroke-width="2.2"/><circle cx="-42" cy="-204" r="5" fill="#4aa8ff" ${st} stroke-width="2.2"/><circle cx="42" cy="-204" r="5" fill="#4aa8ff" ${st} stroke-width="2.2"/>` +
    `<path d="M-33,-172 Q0,-182 33,-172 L32,-164 Q0,-174 -32,-164Z" fill="#e8203f" ${st} stroke-width="2.2"/>`;
  let t = '';
  if (p.tilt) t += `rotate(${f(p.tilt)},0,-90) `;
  if (p.sq !== 1) t += `scale(${f(2 - p.sq)},${f(p.sq)})`;
  return s + (t ? g(t, b) : b);
}
const KING_ANIM = { idle: [0, 4], move: [4, 4], attack: [8, 2], dizzy: [10, 4], hurt: [14, 2], ko: [16, 2] };
function kingFrames() {
  const o = [];
  for (let i = 0; i < 4; i++) o.push(king({ sq: 1 + S(i / 4 * 2 * PI) * .025 }));
  for (let i = 0; i < 4; i++) o.push(king({ step: i / 4, tilt: S(i / 4 * 2 * PI) * 4 }));
  o.push(king({ sq: 0.9, arms: 0.3 })); o.push(king({ sq: 1.08, arms: 1 }));
  for (let i = 0; i < 4; i++) o.push(king({ mood: 'dizzy', tilt: S(i / 4 * 2 * PI) * 9, arms: 0.2 + .2 * C(i / 4 * 2 * PI) }));
  o.push(king({ mood: 'scared', tilt: -10, sq: .95, arms: .8 })); o.push(king({ mood: 'scared', tilt: -5, arms: .5 }));
  o.push(king({ mood: 'ko', tilt: 8, arms: .6 })); o.push(king({ mood: 'ko', tilt: 14, arms: .2, sq: .96 }));
  return o;
}
function needle() { // points up (north = red), centre at origin
  return `<path d="M0,-36 L9,0 L-9,0Z" fill="#ff4b55" ${st} stroke-width="2.4"/><path d="M0,36 L9,0 L-9,0Z" fill="#f4f7fc" ${st} stroke-width="2.4"/><path d="M0,-30 L3,-4 L-3,-4Z" fill="#ffb0b5"/><circle r="6" fill="url(#kGold)" ${st} stroke-width="2.2"/>`;
}

// ---------- Magnet Titan (faces LEFT) ----------
function titan(p) {
  p = Object.assign({ bob: 0, open: 0, mood: 'angry', glow: 0, tilt: 0, charge: 0 }, p);
  let s = '';
  // feet
  s += `<path d="M-150,0 v-22 q0,-26 34,-26 h44 q30,0 30,26 v22Z" fill="url(#tDark)" ${st}/><path d="M42,0 v-22 q0,-26 30,-26 h44 q34,0 34,26 v22Z" fill="url(#tDark)" ${st}/>`;
  s += `<rect x="-112" y="-78" width="40" height="36" fill="#3c3f8c" ${st}/><rect x="72" y="-78" width="40" height="36" fill="#3c3f8c" ${st}/>`;
  let b = '';
  // shoulder coils
  const coil = sd => { let c = `<rect x="${sd * 150 - 44}" y="-306" width="88" height="62" rx="16" fill="url(#tDark)" ${st}/>`; for (let i = 0; i < 6; i++) c += `<rect x="${sd * 150 - 37 + i * 13}" y="-312" width="10" height="74" rx="5" fill="url(#tCu)" stroke="${OUT}" stroke-width="2.2"/>`; return c; };
  b += coil(-1) + coil(1);
  // torso
  b += `<path d="M-128,-320 Q0,-344 128,-320 Q150,-200 118,-76 Q0,-56 -118,-76 Q-150,-200 -128,-320Z" fill="url(#tBody)" ${st}/>`;
  b += `<path d="M-104,-306 Q-40,-324 30,-322" stroke="#e3e8ff" stroke-width="9" stroke-linecap="round" fill="none" opacity=".6"/>`;
  b += rivet(-104, -110, 4) + rivet(104, -110, 4) + rivet(-120, -270, 4) + rivet(120, -270, 4) + rivet(-126, -190, 4) + rivet(126, -190, 4);
  b += `<path d="M-60,-88 h120" stroke="#2a2c66" stroke-width="6" stroke-linecap="round" opacity=".5"/><path d="M-44,-76 h88" stroke="#2a2c66" stroke-width="5" stroke-linecap="round" opacity=".4"/>`;
  // chest hatch / core
  const cy = -196;
  b += `<circle cx="0" cy="${cy}" r="68" fill="#232456" ${st}/>`;
  if (p.open > 0) {
    b += `<circle cx="0" cy="${cy}" r="60" fill="#3a2a5c"/><circle cx="0" cy="${cy}" r="58" fill="#fff07a" opacity="${f(.35 + p.glow * .4)}" filter="url(#tGlow)"/>`;
    b += `<rect x="-14" y="${cy - 50}" width="28" height="100" rx="8" fill="url(#tSteel)" ${st} stroke-width="2.4"/>`;
    for (let i = 0; i < 7; i++) b += `<rect x="-34" y="${cy - 41 + i * 12.2}" width="68" height="10" rx="5" fill="url(#tCu)" stroke="${OUT}" stroke-width="2.2"/>`;
    b += `<circle cx="0" cy="${cy}" r="17" fill="url(#tCore)" ${st} stroke-width="2.4"/><path d="M-6,${cy - 7} l5,-4" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`;
    // hatch doors swung open
    b += `<path d="M-60,${cy - 34} Q-96,${cy} -60,${cy + 34} Q-74,${cy} -60,${cy - 34}Z" fill="url(#tSteel)" ${st} stroke-width="2.4"/><path d="M60,${cy - 34} Q96,${cy} 60,${cy + 34} Q74,${cy} 60,${cy - 34}Z" fill="url(#tSteel)" ${st} stroke-width="2.4"/>`;
  } else {
    b += `<circle cx="0" cy="${cy}" r="58" fill="url(#tSteel)" stroke="${OUT}" stroke-width="2.4"/>`;
    for (let i = 0; i < 8; i++) { const an = i * PI / 4 + PI / 8; b += rivet(f(C(an) * 53), f(cy + S(an) * 53), 2.8, '#c8d2e6'); }
    // compass dial on the hatch (the needle itself is a separate sprite that turns at runtime)
    b += `<circle cx="0" cy="${cy}" r="47" fill="url(#kDial)" stroke="#2c3f9c" stroke-width="5"/>`;
    for (let i = 0; i < 12; i++) { const an = i * PI / 6, r1 = i % 3 === 0 ? 33 : 38; b += `<path d="M${f(S(an) * r1)},${f(cy - C(an) * r1)} L${f(S(an) * 43)},${f(cy - C(an) * 43)}" stroke="${i === 0 ? '#e8203f' : '#5a6a8c'}" stroke-width="${i % 3 === 0 ? 4 : 2.2}" stroke-linecap="round"/>`; }
  }
  // head
  let h = '';
  // horseshoe horns
  const horn = (sd, col) => `<path d="M${sd * 44},-64 Q${sd * 96},-70 ${sd * 86},-124" fill="none" stroke="${OUT}" stroke-width="31" stroke-linecap="butt"/><path d="M${sd * 44},-64 Q${sd * 96},-70 ${sd * 86},-122" fill="none" stroke="${col}" stroke-width="24" stroke-linecap="butt"/>` +
    `<g transform="translate(${sd * 86},-122) rotate(${sd * -10})"><rect x="-14.5" y="-20" width="29" height="22" fill="url(#tSteel)" ${st} stroke-width="2.6"/></g>`;
  h += horn(-1, 'url(#tRed)') + horn(1, 'url(#tBlue)');
  h += `<path d="M-76,0 Q-84,-84 0,-88 Q84,-84 76,0 Q0,12 -76,0Z" fill="url(#tBody)" ${st}/>`;
  h += `<path d="M-52,-66 Q-24,-80 12,-78" stroke="#e3e8ff" stroke-width="7" stroke-linecap="round" fill="none" opacity=".6"/>`;
  h += `<path d="M-62,-52 Q0,-62 62,-52 Q66,-14 0,-10 Q-66,-14 -62,-52Z" fill="#1d1f4a" ${st} stroke-width="2.6"/>`;
  const m = p.mood, ex = [-30, 22];
  ex.forEach((x, i) => {
    const sd = i ? -1 : 1;
    if (m === 'ko') h += eye(x, -34, 13, 'ko').replace(/stroke="#3b2438"/g, 'stroke="#ffe14d"');
    else if (m === 'dizzy') h += eye(x, -34, 13, 'dizzy').replace(/stroke="#3b2438"/g, 'stroke="#ffe14d"').replace('fill="#fff"', 'fill="#1d1f4a"');
    else {
      h += `<ellipse cx="${x}" cy="-34" rx="14" ry="${m === 'scared' ? 16 : 14}" fill="url(#tEye)"/><circle cx="${x - 3}" cy="-33" r="${m === 'scared' ? 4 : 6.5}" fill="#1c1626"/><circle cx="${x - 5.5}" cy="-36" r="2.2" fill="#fff"/>`;
      if (m === 'angry') h += `<path d="M${x - 17 * sd},-51 L${x + 17 * sd},-38 L${x + 17 * sd},-54 L${x - 17 * sd},-54Z" fill="#1d1f4a"/>`;
    }
  });
  // jaw grill
  h += `<rect x="-34" y="-6" width="64" height="${p.charge ? 26 : 18}" rx="7" fill="url(#tSteel)" ${st} stroke-width="2.6"/><path d="M-18,-4 v${p.charge ? 22 : 14} M-2,-4 v${p.charge ? 22 : 14} M14,-4 v${p.charge ? 22 : 14}" stroke="${OUT}" stroke-width="2.4"/>`;
  if (p.charge) h += `<circle cx="-4" cy="-34" r="60" fill="#fff07a" opacity=".28" filter="url(#tGlow)"/>`;
  b += g(`translate(0,${-330 + (p.headY || 0)}) rotate(${f(p.headTilt || 0)})`, h);
  return s + g(`translate(0,${f(p.bob)}) rotate(${f(p.tilt)},0,-80)`, b);
}
const TITAN_ANIM = { idle: [0, 4], attack: [4, 2], hurt: [6, 2], openIdle: [8, 4], openHurt: [12, 2], ko: [14, 2] };
function titanFrames() {
  const o = [];
  for (let i = 0; i < 4; i++) o.push(titan({ bob: S(i / 4 * 2 * PI) * 4, headY: S(i / 4 * 2 * PI + 1) * 2 }));
  o.push(titan({ bob: 4, charge: 1, headTilt: -3 })); o.push(titan({ bob: -4, charge: 1, headTilt: 3, headY: -4 }));
  o.push(titan({ mood: 'scared', tilt: 3, headTilt: 8 })); o.push(titan({ mood: 'scared', tilt: 1.5, headTilt: 4 }));
  for (let i = 0; i < 4; i++) o.push(titan({ open: 1, glow: (S(i / 4 * 2 * PI) + 1) / 2, bob: S(i / 4 * 2 * PI) * 4 }));
  o.push(titan({ open: 1, glow: 1, mood: 'scared', tilt: 3, headTilt: 8 })); o.push(titan({ open: 1, glow: .5, mood: 'scared', tilt: 1.5, headTilt: 4 }));
  o.push(titan({ open: 1, glow: 0, mood: 'ko', tilt: 4, headTilt: 12, bob: 6 })); o.push(titan({ open: 1, glow: 0, mood: 'ko', tilt: 6, headTilt: 16, bob: 12 }));
  return o;
}
// floating fist (points LEFT/down): frame 0 fist, 1 fist with motion lines
function fist(k) {
  let s = `<path d="M-50,-34 Q-62,-34 -62,-20 L-62,22 Q-62,38 -46,38 L10,38 Q28,38 30,20 L30,-18 Q30,-36 12,-36Z" fill="url(#tBody)" ${st}/>` +
    `<path d="M-62,-14 h30 M-62,6 h30 M-62,24 h28" stroke="${OUT}" stroke-width="2.6"/><path d="M-50,-28 h44" stroke="#e3e8ff" stroke-width="6" stroke-linecap="round" opacity=".6"/>` +
    `<path d="M-26,38 q-4,14 10,14 q16,0 14,-14" fill="url(#tBody)" ${st}/>` +
    `<rect x="30" y="-26" width="26" height="54" rx="6" fill="url(#tCu)" ${st}/><path d="M38,-26 v54 M47,-26 v54" stroke="${OUT}" stroke-width="2.2"/>` + rivet(14, -22, 3.4) + rivet(14, 24, 3.4);
  if (k) s += `<path d="M62,-24 h22 M66,0 h28 M62,24 h22" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".8"/>`;
  return s;
}
function shield() { // iron shield plate (absorbable)
  return `<path d="M0,-60 L40,-44 L40,10 Q40,44 0,60 Q-40,44 -40,10 L-40,-44Z" fill="url(#tSteel)" ${st}/><path d="M0,-48 L30,-36 L30,8 Q30,34 0,47 Q-30,34 -30,8 L-30,-36Z" fill="#8f9cc0" stroke="${OUT}" stroke-width="2.2"/>` +
    `<path d="M-12,14 v-16 a12,12 0 0 1 24,0 v16" fill="none" stroke="${OUT}" stroke-width="12"/><path d="M-12,14 v-16 a12,12 0 0 1 12,-12" fill="none" stroke="#e8203f" stroke-width="7.5"/><path d="M0,-14 a12,12 0 0 1 12,12 v16" fill="none" stroke="#2d62d8" stroke-width="7.5"/>` +
    rivet(-30, -38, 3) + rivet(30, -38, 3) + rivet(0, 50, 3) + `<path d="M-30,-44 L-6,-53" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".8"/>`;
}
function pod(on) { // titan's power battery with an iron plug handle
  return `<rect x="-30" y="-40" width="60" height="84" rx="12" fill="url(#fBat)" ${st}/><path d="M-30,-8 h60 v-20 q0,-12 -12,-12 h-36 q-12,0 -12,12Z" fill="#33384a" stroke="${OUT}" stroke-width="2.4"/>` +
    `<rect x="-12" y="-52" width="24" height="14" rx="4" fill="url(#tSteel)" ${st} stroke-width="2.4"/>` +
    `<path d="M-8,18 h16 M0,10 v16" stroke="#b33" stroke-width="5" stroke-linecap="round"/><path d="M-20,-30 v60" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".5"/>` +
    (on ? `<path d="M0,-66 l-9,14 h8 l-5,13 l14,-17 h-8 l5,-10Z" fill="#fff07a" stroke="${OUT}" stroke-width="2"/>` : `<path d="M-10,-66 l20,12 M10,-66 l-20,12" stroke="#ff4b55" stroke-width="5" stroke-linecap="round"/>`);
}

// ---------- small fx / icon sprites (cell 96x96, origin centre) ----------
function fx() {
  const o = [];
  const heart = fill => `<path d="M0,30 C-46,0 -40,-34 -18,-34 C-6,-34 0,-24 0,-20 C0,-24 6,-34 18,-34 C40,-34 46,0 0,30Z" fill="${fill}" stroke="${OUT}" stroke-width="5" stroke-linejoin="round"/>`;
  o.push(heart('url(#fHeart)') + `<path d="M-26,-14 q2,-12 12,-12" stroke="#fff" stroke-width="6" stroke-linecap="round" fill="none" opacity=".85"/>`);
  o.push(heart('#3f3550') + '');
  // material: bolt + nut
  o.push(`<g transform="rotate(-30)"><rect x="-7" y="-10" width="14" height="40" rx="3" fill="url(#fBolt)" ${st}/><path d="M-7,2 h14 M-7,10 h14 M-7,18 h14" stroke="${OUT}" stroke-width="2"/><path d="M-18,-30 h36 l8,10 l-8,10 h-36 l-8,-10Z" fill="url(#fBolt)" ${st}/><path d="M-14,-25 h24" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".8"/></g>`);
  const star = `<path d="M0,-34 L10,-11 L35,-9 L16,7 L22,32 L0,19 L-22,32 L-16,7 L-35,-9 L-10,-11Z" fill="url(#fStar)" ${st}/><path d="M-6,-12 l4,-10" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`;
  o.push(star);
  // dust puffs
  for (let i = 0; i < 3; i++) { const k = 1 - i * .12, op = 1 - i * .28; o.push(`<g opacity="${op}" transform="scale(${0.7 + i * .25})"><circle cx="-16" cy="6" r="${16 * k}" fill="#fff" stroke="#c9d9ea" stroke-width="2.5"/><circle cx="12" cy="8" r="${14 * k}" fill="#fff" stroke="#c9d9ea" stroke-width="2.5"/><circle cx="0" cy="-8" r="${18 * k}" fill="#fff" stroke="#c9d9ea" stroke-width="2.5"/><circle cx="-2" cy="4" r="${14 * k}" fill="#fff"/></g>`); }
  // hit bursts
  for (let i = 0; i < 3; i++) { const R = 22 + i * 9, r = 10 + i * 5; let d = ''; for (let j = 0; j < 16; j++) { const an = j * PI / 8, rr = j % 2 ? r : R; d += (j ? 'L' : 'M') + f(C(an) * rr) + ',' + f(S(an) * rr); } o.push(`<path d="${d}Z" fill="${i === 2 ? '#fff' : '#fff07a'}" stroke="${i === 2 ? '#ffd24a' : '#ff8a1e'}" stroke-width="4" stroke-linejoin="round" opacity="${1 - i * .25}"/>` + (i < 2 ? `<circle r="${8 + i * 3}" fill="#fff"/>` : '')); }
  // ON badge
  o.push(`<rect x="-36" y="-19" width="72" height="38" rx="19" fill="#2fc94a" stroke="#14591f" stroke-width="5"/><rect x="-30" y="-14" width="60" height="12" rx="6" fill="#7df08e" opacity=".7"/><text x="0" y="10" text-anchor="middle" font-size="28" fill="#fff36b" stroke="#14591f" stroke-width="5" paint-order="stroke" stroke-linejoin="round">ON</text>`);
  // '!' and '?' bubbles
  const bub = (ch, col) => `<path d="M-26,-30 h52 q10,0 10,10 v30 q0,10 -10,10 h-18 l-8,12 l-8,-12 h-18 q-10,0 -10,-10 v-30 q0,-10 10,-10Z" fill="#fff" ${st}/><text x="0" y="12" text-anchor="middle" font-size="40" fill="${col}">${ch}</text>`;
  o.push(bub('!', '#ff4b55')); o.push(bub('?', '#3f7fe8'));
  // lock
  o.push(`<path d="M-16,-6 v-12 a16,16 0 0 1 32,0 v12" fill="none" stroke="${OUT}" stroke-width="13"/><path d="M-16,-6 v-12 a16,16 0 0 1 32,0 v12" fill="none" stroke="#c9d3e3" stroke-width="7"/><rect x="-28" y="-8" width="56" height="42" rx="9" fill="url(#fStar)" ${st}/><circle cx="0" cy="10" r="6" fill="${OUT}"/><rect x="-2.5" y="12" width="5" height="12" rx="2" fill="${OUT}"/>`);
  // mini battery icon
  o.push(`<g transform="rotate(-90)"><rect x="-30" y="-17" width="56" height="34" rx="8" fill="url(#fBat)" ${st}/><path d="M-30,-9 q0,-8 8,-8 h12 v34 h-12 q-8,0 -8,-8Z" fill="#33384a"/><rect x="26" y="-8" width="9" height="16" rx="3" fill="#e4eaf2" ${st} stroke-width="2.4"/><path d="M4,0 h12 M10,-6 v12" stroke="#b33" stroke-width="4" stroke-linecap="round"/></g>`);
  // mini coil icon
  { let c = `<rect x="-36" y="-7" width="72" height="14" rx="4" fill="url(#tSteel)" ${st} stroke-width="2.4"/>`; for (let i = 0; i < 6; i++) c += `<rect x="${-27 + i * 9.4}" y="-22" width="8" height="44" rx="4" fill="url(#tCu)" stroke="${OUT}" stroke-width="2.2"/>`; o.push(c); }
  o.push(needle());
  // small scrap chunk (golem projectile)
  o.push(`<path d="M-20,-10 L-6,-24 L16,-18 L24,2 L10,22 L-14,18 L-24,4Z" fill="url(#fBolt)" ${st}/><path d="M-12,-8 l8,-8" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".8"/>` + rivet(6, 4, 3));
  // lightning spark
  o.push(`<path d="M6,-36 L-16,4 H-2 L-8,36 L18,-8 H3Z" fill="#fff07a" stroke="#e68a00" stroke-width="4" stroke-linejoin="round"/>`);
  // shop: coin, electro shield, speed boots, super magnet
  o.push(`<circle r="34" fill="url(#fStar)" stroke="${OUT}" stroke-width="5"/><circle r="24" fill="none" stroke="#d48a12" stroke-width="4"/><path d="M0,-15 L4.5,-5 L15,-4 L7,3 L9.5,14 L0,8.5 L-9.5,14 L-7,3 L-15,-4 L-4.5,-5Z" fill="#fff7c0" stroke="#d48a12" stroke-width="2.5" stroke-linejoin="round"/><path d="M-22,-16 q6,-10 16,-12" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".8"/>`);
  o.push(`<path d="M0,-38 L32,-26 L32,4 Q32,30 0,40 Q-32,30 -32,4 L-32,-26Z" fill="#4ab8ff" stroke="${OUT}" stroke-width="5" stroke-linejoin="round"/><path d="M0,-28 L23,-19 L23,4 Q23,22 0,30 Q-23,22 -23,4 L-23,-19Z" fill="#aee6ff" stroke="#1f6fd0" stroke-width="2.5" stroke-linejoin="round"/><path d="M5,-22 L-12,4 H-1 L-6,24 L13,-4 H2Z" fill="#fff07a" stroke="#e68a00" stroke-width="3" stroke-linejoin="round"/><path d="M-22,-24 L-4,-31" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".85"/>`);
  o.push(`<path d="M-34,-14 q-10,-8 -6,-18 q8,6 16,6 M-36,0 q-10,-4 -9,-14 q9,4 17,2 M-34,12 q-9,-1 -10,-9 q8,1 14,-3" fill="#fff7c0" stroke="#e68a00" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><path d="M-22,-34 h22 v28 q26,2 30,18 v14 h-54 q-6,-30 2,-60Z" fill="url(#fHeart)" stroke="${OUT}" stroke-width="5" stroke-linejoin="round"/><path d="M-26,18 h56 v8 h-56Z" fill="#fff" stroke="${OUT}" stroke-width="3.5" stroke-linejoin="round"/><path d="M-22,-24 h22" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M6,-2 q10,2 14,8" stroke="#ffc0c8" stroke-width="4" stroke-linecap="round" fill="none"/>`);
  o.push(`<path d="M-22,30 v-30 a22,22 0 0 1 44,0 v30" fill="none" stroke="${OUT}" stroke-width="25"/><path d="M-22,30 v-30 a22,22 0 0 1 22,-22" fill="none" stroke="#e8203f" stroke-width="17"/><path d="M0,-22 a22,22 0 0 1 22,22 v30" fill="none" stroke="#2d62d8" stroke-width="17"/><rect x="-33" y="20" width="22" height="14" fill="#f4f7fc" stroke="${OUT}" stroke-width="4"/><rect x="11" y="20" width="22" height="14" fill="#f4f7fc" stroke="${OUT}" stroke-width="4"/>` +
    [[-36, -30, 9], [36, -34, 11], [0, 6, 8], [42, 0, 6]].map(([x, y, r]) => `<path d="M${x},${y - r} L${x + r * .28},${y - r * .28} L${x + r},${y} L${x + r * .28},${y + r * .28} L${x},${y + r} L${x - r * .28},${y + r * .28} L${x - r},${y} L${x - r * .28},${y - r * .28}Z" fill="#fff7a8" stroke="#ff9d1e" stroke-width="2.4" stroke-linejoin="round"/>`).join(''));
  return o;
}
const FX = { heart: 0, heartEmpty: 1, bolt: 2, star: 3, puff: 4, hit: 7, on: 10, bang: 11, ques: 12, lock: 13, battery: 14, coil: 15, needle: 16, scrap: 17, spark: 18, coin: 19, shield: 20, boots: 21, smagnet: 22 };
module.exports = { defs, kingFrames, KING_ANIM, titanFrames, TITAN_ANIM, fist, shield, pod, needle, fx, FX };
