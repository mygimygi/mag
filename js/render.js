// MAGNET POP - rendering (reads game state, never changes it)
(function () {
  const MP = window.MP, W = MP.W, H = MP.H, G = MP.GROUND, SPR = MP.SPR = window.MP_SPRITES;
  const IMG = {}, pending = {}; let bgLru = [1]; const FONT = '"Jua","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif';
  const A = MP.Assets = {
// Only the images needed right now are downloaded and decoded (phones have little memory):
    // core = menu + hero + platforms; each stage adds its own background and monster sheets when it starts.
    core() { const l = ['hero', 'weapon', 'parts', 'fx', 'bg1', 'm_ball', 'm_robot', 'm_slime', 'm_bug', 'm_bat']; ['meadow', 'factory', 'compass', 'lab', 'fortress'].forEach(k => l.push('plat_' + k, 'ground_' + k)); ['cloud', 'spring', 'conveyor', 'wood'].forEach(k => l.push('plat_' + k)); return l; },
    all() { return [...new Set(this.core().concat(['king', 'titan'], Object.keys(SPR.mon.types).map(t => 'm_' + t), Array.from({ length: 16 }, (_, i) => 'bg' + (i + 1))))]; },
    src(n) { return 'assets/img/' + n + (n.startsWith('bg') ? '.jpg' : '.png') + (window.__ARTIFACT__ ? '' : '?v=' + MP.VERSION); },
    ok(n) { const i = IMG[n]; return !!i && (i.naturalWidth || i.width) > 0; },
    ready(names) { return names.every(n => this.ok(n)); },
    // load whatever is missing; resolves with the names that failed
    ensure(names, onProgress) {
      let done = 0; const failed = [];
      return Promise.all(names.map(n => {
        if (this.ok(n)) { done++; return null; }
        pending[n] = pending[n] || new Promise(res => { const im = new Image(); im.decoding = 'async'; im.onload = () => { IMG[n] = im; delete pending[n]; res(true); }; im.onerror = () => { delete pending[n]; res(false); }; im.src = this.src(n); });
        return pending[n].then(good => { if (!good) failed.push(n); done++; onProgress && onProgress(done / names.length); });
      })).then(() => failed);
    },
    load(onProgress) { return this.ensure(this.core(), onProgress); },
    stageAssets(n) {
      const st = MP.STAGES[n], set = new Set(['bg' + n]); st.waves.forEach(w => w.forEach(t => set.add('m_' + t)));
      if (st.materials) set.add('m_ball'); if (st.boss === 'king') { set.add('king'); set.add('m_ball'); }
      if (st.boss === 'titan') ['titan', 'm_ball', 'm_robot', 'm_slime', 'm_bug'].forEach(x => set.add(x));
      return [...set];
    },
    // keep at most three backgrounds decoded (the title background always stays)
    useBg(n) { if (this.keepAll) return; bgLru = bgLru.filter(x => x !== n); bgLru.push(n); while (bgLru.length > 3) { const o = bgLru.shift(); if (o !== 1) delete IMG['bg' + o]; } },
    img: IMG,
    // Dress-up: the default look uses the pre-rendered PNG sheets; any other look is rasterised from the vector rig.
    applyLook(look) {
      const Art = window.MPArt; IMG.hero0 = IMG.hero0 || IMG.hero; IMG.weapon0 = IMG.weapon0 || IMG.weapon;
      const L = Art.normLook(look), isDefault = Object.keys(Art.DEFAULT_LOOK).every(k => L[k] === Art.DEFAULT_LOOK[k]);
      if (isDefault) { IMG.hero = IMG.hero0; IMG.weapon = IMG.weapon0; return Promise.resolve(true); }
      const raster = (sheet, k) => new Promise((res, rej) => {
        const svg = sheet.svg.replace(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="\d+" height="\d+"/, `<svg xmlns="http://www.w3.org/2000/svg" width="${sheet.w * k}" height="${sheet.h * k}"`);
        const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })), im = new Image();
        im.onload = () => { try { const c = document.createElement('canvas'); c.width = sheet.w * k; c.height = sheet.h * k; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c); } catch (e) { rej(e); } };
        im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('svg')); }; im.src = url;
      });
      const kh = MP.coarse ? 1.5 : SPR.hero.scale, kw = MP.coarse ? 2 : SPR.weapon.scale;       // smaller sheets on phones / tablets
      return Promise.all([raster(Art.heroSheet(L), kh), raster(Art.weaponSheet(L), kw)])
        .then(([h, w]) => { h._k = kh; w._k = kw; IMG.hero = h; IMG.weapon = w; return true; })
        .catch(() => { IMG.hero = IMG.hero0; IMG.weapon = IMG.weapon0; return false; });
    },
  };
  let cv, ctx, rs = 1;
  const R = MP.Render = {
    init(canvas) { cv = canvas; ctx = cv.getContext('2d'); },
    setScale(s) { if (s === rs && cv.width === Math.round(W * rs)) return; rs = s; cv.width = Math.round(W * rs); cv.height = Math.round(H * rs); layers.clear(); },
    get ctx() { return ctx; },
  };
  // draw one frame of a sprite sheet. (x,y) = sprite origin. o: flip, s (scale), rot (radians), py (pivot offset above origin), a (alpha)
  function spr(c, sheet, meta, idx, x, y, o) {
    o = o || {}; const img = IMG[sheet]; if (!img || !(img.naturalWidth || img.width)) return;
    const k = img._k || meta.scale, sx = (idx % meta.cols) * meta.w * k, sy = Math.floor(idx / meta.cols) * meta.h * k, s = o.s == null ? 1 : o.s;
    c.save(); if (o.a != null) c.globalAlpha *= o.a;
    c.translate(x, y - (o.py || 0)); if (o.rot) c.rotate(o.rot); c.scale((o.flip ? -1 : 1) * s * (o.sx || 1), s * (o.sy || 1)); c.translate(0, (o.py || 0) / s);
    c.drawImage(img, sx, sy, meta.w * k, meta.h * k, -meta.ax, -meta.ay, meta.w, meta.h); c.restore();
  }
  R.spr = spr;
  const fx = (c, name, x, y, o, add) => spr(c, 'fx', SPR.fx, SPR.fx.idx[name] + (add || 0), x, y, o);
  function text(c, str, x, y, size, fill, stroke, lw, align) {
    c.font = size + 'px ' + FONT; c.textAlign = align || 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    if (stroke) { c.lineWidth = lw || size * 0.22; c.strokeStyle = stroke; c.strokeText(str, x, y); }
    c.fillStyle = fill; c.fillText(str, x, y);
  }
  R.text = text;
  function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function pill(c, x, y, w, h) {
    rrect(c, x, y, w, h, h / 2); const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#2a66d8'); g.addColorStop(1, '#0f2f8f'); c.fillStyle = g; c.fill();
    c.lineWidth = 7; c.strokeStyle = '#0b1f5c'; c.stroke(); c.lineWidth = 3; c.strokeStyle = '#8fd0ff'; c.stroke();
    rrect(c, x + 10, y + 6, w - 20, h * 0.3, h * 0.15); c.fillStyle = 'rgba(255,255,255,.16)'; c.fill();
  }
  // ---- platform images, cached per (theme, width) ----
  const pcache = {};
  function platImg(theme, w) {
    const key = theme + w; if (pcache[key]) return pcache[key];
    const P = SPR.plat, k = P.scale, c = document.createElement('canvas'); c.width = w * k; c.height = P.h * k; const x = c.getContext('2d'), src = IMG['plat_' + theme];
    const n = Math.max(0, Math.round((w - 96) / 96));
    x.drawImage(src, 0, 0, 48 * k, P.h * k, 0, 0, 48 * k, P.h * k);
    for (let i = 0; i < n; i++) x.drawImage(src, (48 + ((i * 2 + n) % 3) * 96) * k, 0, 96 * k, P.h * k, (48 + i * 96) * k, 0, 96 * k, P.h * k);
    x.drawImage(src, 336 * k, 0, 48 * k, P.h * k, (48 + n * 96) * k, 0, 48 * k, P.h * k);
    return pcache[key] = c;
  }
  function groundImg(theme) {
    const key = 'g' + theme; if (pcache[key]) return pcache[key];
    const P = SPR.plat, k = P.scale, c = document.createElement('canvas'); c.width = 1344 * k; c.height = P.groundH * k; const x = c.getContext('2d'), src = IMG['ground_' + theme];
    for (let i = 0; i < 14; i++) x.drawImage(src, (i % 3) * 96 * k, 0, 96 * k, P.groundH * k, i * 96 * k, 0, 96 * k, P.groundH * k);
    return pcache[key] = c;
  }
  // ---- pre-rendered static layers ----
  // Scaling a full-screen picture every frame is by far the most expensive drawing on phones. The background, ground and
  // platforms that never move are drawn once, at the canvas's exact pixel size, and then copied 1:1 each frame.
  const LM = 8;                                  // margin (game px) so screen shake never shows an empty edge
  const layers = new Map();
  function layer(key, paint) {
    const k = key + '@' + rs; let L = layers.get(k);
    if (!L) {
      L = document.createElement('canvas'); L.width = Math.round((W + LM * 2) * rs); L.height = Math.round((H + LM * 2) * rs);
      const x = L.getContext('2d'); x.imageSmoothingQuality = 'high'; x.setTransform(rs, 0, 0, rs, LM * rs, LM * rs); paint(x);
      if (layers.size > 4) layers.delete(layers.keys().next().value);            // keep a few (menu + current stage + backdrops)
      layers.set(k, L);
    }
    return L;
  }
  function blit(c, L, ox, oy) { c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(L, Math.round((ox - LM) * rs), Math.round((oy - LM) * rs)); c.setTransform(rs, 0, 0, rs, 0, 0); }
  const isStatic = p => p.ground || (!p.move && (p.kind === 'solid' || !p.kind));
  R.layerCount = () => layers.size;
  const KIND_IMG = { vanish: 'cloud', spring: 'spring', conveyor: 'conveyor', crumble: 'wood' };
  function drawPlats(c, plats, theme, time) {
    for (const p of plats) {
      if (isStatic(p)) continue;                                     // already in the pre-rendered layer
      if (p.alpha <= 0.01) continue;
      const img = platImg(KIND_IMG[p.kind] || theme, p.w); let x = p.x, y = p.y - 11 + p.oy;
      c.save(); c.globalAlpha = p.alpha;
      if (p.kind === 'crumble' && p.state === 'shake') { x += Math.sin(time * 70) * 3; y += Math.cos(time * 55) * 2; }
      if (p.kind === 'spring' && p.bounceT > 0) { const k = Math.sin((0.3 - p.bounceT) / 0.3 * Math.PI) * 9; c.drawImage(img, x, y + k, p.w, SPR.plat.h - k); }
      else c.drawImage(img, x, y, p.w, SPR.plat.h);
      if (p.kind === 'conveyor') { // moving chevrons show which way the belt carries you
        const dir = p.belt > 0 ? 1 : -1, off = ((time * Math.abs(p.belt)) % 48) * dir; c.beginPath(); c.rect(p.x + 14, p.y - 4, p.w - 28, 12); c.clip();
        c.strokeStyle = '#ffe36b'; c.lineWidth = 3; c.lineJoin = 'round'; c.lineCap = 'round';
        for (let cx = p.x - 48 + off; cx < p.x + p.w + 48; cx += 48) { c.beginPath(); c.moveTo(cx - dir * 5, p.y - 2); c.lineTo(cx + dir * 3, p.y + 2.5); c.lineTo(cx - dir * 5, p.y + 7); c.stroke(); }
      }
      c.restore();
    }
  }
  // ---- hero + electromagnet ----
  function weaponIdx(b, c, on) { return (on ? 9 : 0) + (b - 1) * 3 + (c - 1); }
  function drawHero(c, x, y, frame, facing, b, co, on, o) {
    o = o || {}; const s = o.s || 1, HM = SPR.hero;
    spr(c, 'hero', HM, frame, x, y, { flip: facing < 0, s, a: o.a });
    const w = HM.wx[frame];
    spr(c, 'weapon', SPR.weapon, weaponIdx(b, co, on), x + facing * w[0] * s, y + w[1] * s, { flip: facing < 0, s: HM.ws * s, rot: facing * w[2] * Math.PI / 180, a: o.a });
  }
  R.drawHero = drawHero;
  R.drawWeapon = (canvas, b, c, on) => { const x = canvas.getContext('2d'), m = SPR.weapon; x.clearRect(0, 0, canvas.width, canvas.height); const s = Math.min(canvas.width / m.w, canvas.height / m.h); spr(x, 'weapon', m, weaponIdx(b, c, on), m.ax * s, m.ay * s, { s }); };
  function monFrame(type, anim, t, fps) { const a = SPR.mon.anims[anim]; return a[0] + Math.floor(t * (fps || 8)) % a[1]; }
  function drawMon(c, type, anim, t, x, y, o) {
    const d = MP.MON[type];
    if (d.part) { spr(c, 'parts', SPR.parts, SPR.parts.idx[d.part], x, y - d.h / 2, Object.assign({ s: type === 'shield' ? 0.85 : 0.8 }, o, { py: 0 })); return; }
    spr(c, 'm_' + type, SPR.mon.types[type], monFrame(type, anim, t, anim === 'move' ? 10 : anim === 'idle' ? 5 : 8), x, y, o);
  }
  R.drawMon = drawMon;

  // Field colours per upgrade tier (0-4): deep outline colour, bright core colour, cone tint. Stronger magnet = bolder field.
  const TIER = [
    { deep: '20,110,235', bright: '225,248,255', cone: '110,200,255', name: '#2f8cf0' },
    { deep: '20,70,250', bright: '210,232,255', cone: '90,150,255', name: '#3a6cff' },
    { deep: '140,40,240', bright: '246,224,255', cone: '185,120,255', name: '#a04cf5' },
    { deep: '245,90,10', bright: '255,242,200', cone: '255,160,70', name: '#ff7a1e' },
    { deep: '235,10,30', bright: '255,246,170', cone: '255,90,50', name: '#f0202e' },
  ];
  R.TIER = TIER;
  // Magnetic field: a light cone plus rings travelling toward the pole. It stays see-through so the monsters remain visible;
  // upgrades only change its colour slightly (blue -> violet -> warm) and add rings with the coil level.
  const FIELD = [['40,140,250', '240,251,255', '150,225,255'], ['60,120,250', '236,244,255', '160,200,255'], ['140,90,245', '246,236,255', '200,170,255'], ['245,110,60', '255,243,214', '255,170,130'], ['240,70,50', '255,238,176', '255,140,90']];
  function drawField(c, g) {
    const pl = g.player; if (!pl.magnet) return; const nz = g.nozzle, f = pl.facing, range = g.range, t = g.time, big = g.buff.magnet > 0;
    const tier = g.batt + g.coil - 2, FC = FIELD[tier], sp = (big ? 70 : 48) + range * (big ? 0.36 : 0.3);
    c.save();
    const grd = c.createLinearGradient(nz.x, 0, nz.x + f * range, 0); grd.addColorStop(0, 'rgba(' + FC[2] + ',.26)'); grd.addColorStop(1, 'rgba(' + FC[2] + ',0)');
    c.fillStyle = grd; c.beginPath(); c.moveTo(nz.x, nz.y - 20); c.lineTo(nz.x + f * range, nz.y - sp); c.lineTo(nz.x + f * range, nz.y + sp); c.lineTo(nz.x, nz.y + 20); c.closePath(); c.fill();
    const n = 5 + g.coil + (big ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const ph = (t * 1.5 + i / n) % 1, d = range * (1 - ph) + 8, a = Math.sin(ph * Math.PI);   // rings travel toward the pole
      const rx = 5 + d * 0.055, ry = (16 + d * 0.27) * (big ? 1.22 : 1);
      c.beginPath(); c.ellipse(nz.x + f * d, nz.y, rx, ry, 0, 0, Math.PI * 2);
      c.lineWidth = 6.5; c.strokeStyle = 'rgba(' + FC[0] + ',' + (a * 0.5).toFixed(3) + ')'; c.stroke();        // thin coloured edge keeps the ring crisp
      c.lineWidth = 2.6; c.strokeStyle = 'rgba(' + FC[1] + ',' + a.toFixed(3) + ')'; c.stroke();
    }
    c.restore();
  }
  // glow around an upgraded magnet, even when it is switched off (tier 1 and up)
  function drawAura(c, g) {
    const pl = g.player, tier = g.batt + g.coil - 2; if (tier < 1 || pl.dead) return;
    const T = TIER[tier], x = pl.x + pl.facing * 78, y = pl.y - 46, pul = 0.8 + Math.sin(g.time * 5) * 0.2, r = 30 + tier * 6;
    const gr = c.createRadialGradient(x, y, 4, x, y, r); gr.addColorStop(0, 'rgba(' + T.bright + ',' + (0.32 * pul).toFixed(2) + ')'); gr.addColorStop(0.5, 'rgba(' + T.cone + ',' + ((0.14 + tier * 0.03) * pul).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(' + T.cone + ',0)');
    c.fillStyle = gr; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  }
  function drawHazard(c, h, g) {
    if (h.kind === 'scrap') { fx(c, 'scrap', h.x, h.y, { rot: h.rot, s: 0.8 }); return; }
    if (h.kind === 'fist') { spr(c, 'parts', SPR.parts, 1, h.x, h.y, { rot: Math.atan2(h.vy, h.vx) - Math.PI }); return; }
    // shock / magnetic wave: bright crescent rolling along the floor
    const dir = h.vx < 0 ? -1 : 1, t = h.t || 0, tall = h.h + 10 + Math.sin(t * 30) * 4;
    c.save(); c.translate(h.x, h.y + h.h / 2);
    const col = h.kind === 'wave' ? ['rgba(190,120,255,.5)', '#f3e0ff', '#b46bff'] : ['rgba(255,220,90,.5)', '#fffbe0', '#ffb02e'];
    for (let i = 0; i < 2; i++) {
      c.beginPath(); c.moveTo(-dir * (22 + i * 16), 0); c.quadraticCurveTo(dir * 26, -tall * 0.55, -dir * (8 + i * 16), -tall * (1 - i * .25)); c.quadraticCurveTo(dir * 2, -tall * 0.5, -dir * (22 + i * 16), 0); c.closePath();
      c.fillStyle = i ? col[0] : col[1]; c.fill(); c.lineWidth = 3; c.strokeStyle = col[2]; c.stroke();
    }
    c.restore();
  }
  function drawFx(c, f, g) {
    const k = f.t / f.dur;
    if (f.kind === 'puff') fx(c, 'puff', f.x, f.y, { s: (f.s || 1) * (0.9 + k * 0.4) }, Math.min(2, Math.floor(k * 3)));
    else if (f.kind === 'hit') fx(c, 'hit', f.x, f.y, { s: 0.9 + k * 0.5, rot: f.x }, Math.min(2, Math.floor(k * 3)));
    else if (f.kind === 'flash') { const r = 54 * (1 - k * 0.5); const gr = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, r); gr.addColorStop(0, 'rgba(255,255,255,' + (1 - k) + ')'); gr.addColorStop(0.5, 'rgba(190,235,255,' + (0.7 * (1 - k)) + ')'); gr.addColorStop(1, 'rgba(120,200,255,0)'); c.fillStyle = gr; c.beginPath(); c.arc(f.x, f.y, r, 0, 7); c.fill(); }
    else if (f.kind === 'text') { c.globalAlpha = 1 - k * k; text(c, f.text, f.x, f.y - k * 46, 26, '#fff36b', '#3b2438', 6); c.globalAlpha = 1; }
    else if (f.kind === 'heart') { c.globalAlpha = 1 - k * k; fx(c, 'heart', f.x, f.y - k * 50, { s: 0.4 + Math.sin(Math.min(1, k * 3) * Math.PI) * 0.12 }); c.globalAlpha = 1; }
    else if (f.kind === 'bolt') { const e = k * k, tx = 1118, ty = 100; fx(c, 'bolt', f.x + (tx - f.x) * e, f.y + (ty - f.y) * e - Math.sin(k * Math.PI) * 60, { s: 0.36, rot: k * 9 }); }
  }
  function hpBar(c, name, hp, max, extra) {
    const w = 380, x = W / 2 - w / 2, y = 96;
    text(c, name, x - 12, y + 9, 22, '#fff', '#3b2438', 6, 'right');
    rrect(c, x, y, w, 18, 9); c.fillStyle = '#2b1c3a'; c.fill(); c.lineWidth = 4; c.strokeStyle = '#fff'; c.stroke();
    if (hp > 0) { rrect(c, x + 3, y + 3, Math.max(12, (w - 6) * hp / max), 12, 6); const gr = c.createLinearGradient(0, y, 0, y + 18); gr.addColorStop(0, '#ff8f8f'); gr.addColorStop(1, '#e8203f'); c.fillStyle = gr; c.fill(); }
    if (extra) text(c, extra, x + w + 12, y + 9, 22, '#ffe14d', '#3b2438', 6, 'left');
  }
  function drawBoss(c, b, g) {
    const sh = b.flash > 0 && Math.floor(b.flash * 30) % 2 ? 0.55 : 1;
    if (b.kind === 'king') {
      const M = SPR.king, a = M.anims[b.anim], fr = a[0] + Math.floor(b.animT * (b.anim === 'attack' ? 3 : 7)) % a[1];
      spr(c, 'king', M, fr, b.x, b.y + 3, { flip: b.dir > 0 ? false : true, a: sh });
      fx(c, 'needle', b.x, b.y - 63, { rot: b.needle });
      if (b.state === 'stun') for (let i = 0; i < 3; i++) { const an = g.time * 4 + i * 2.094; fx(c, 'star', b.x + Math.cos(an) * 62, b.y - 222 + Math.sin(an) * 14, { s: 0.36 }); }
      else if (b.dizzy > 0.02 && b.state !== 'dead') { // dizziness gauge
        const w = 120, x = b.x - w / 2, y = b.y - 250; rrect(c, x, y, w, 14, 7); c.fillStyle = '#2b1c3a'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#fff'; c.stroke(); rrect(c, x + 2, y + 2, Math.max(10, (w - 4) * Math.min(1, b.dizzy)), 10, 5); c.fillStyle = '#7fd0ff'; c.fill(); text(c, '어질어질', b.x, y - 14, 18, '#fff', '#3b2438', 5);
      }
      hpBar(c, b.name, b.hp, b.maxHp);
    } else {
      const M = SPR.titan, a = M.anims[b.anim], fr = a[0] + Math.floor(b.animT * (b.anim === 'attack' ? 10 : 5)) % a[1];
      const iy = b.state === 'intro' ? Math.max(0, 1 - b.t / 1.2) * -620 : 0;
      spr(c, 'titan', M, fr, b.x + (b.flash > 0 ? Math.sin(g.time * 80) * 4 : 0), b.y + 3 + iy, { a: sh });
      fx(c, 'needle', b.x, b.chest.y + 3 + iy, { rot: b.needle, s: b.phase === 3 ? 0.85 : 1.25, a: sh });      // chest compass needle
      if (b.phase === 3 && b.state !== 'dead' && b.state !== 'shift') {
        // power cables from the batteries to the core, and the magnetic barrier they feed
        c.save(); c.lineCap = 'round';
        for (const p of b.pods) if (!p.dead && !p.freed) { c.beginPath(); c.moveTo(p.x + 20, p.cy); c.quadraticCurveTo(p.x + 70, p.cy + 30, b.chest.x - 60, b.chest.y); c.lineWidth = 9; c.strokeStyle = '#3b2438'; c.stroke(); c.lineWidth = 4.5; c.strokeStyle = Math.floor(g.time * 12) % 2 ? '#fff07a' : '#ffb02e'; c.stroke(); }
        if (b.barrier) { const pul = 0.5 + Math.sin(g.time * 6) * 0.15; const gr = c.createRadialGradient(b.chest.x - 30, b.chest.y, 20, b.chest.x - 30, b.chest.y, 150); gr.addColorStop(0, 'rgba(160,240,255,0.05)'); gr.addColorStop(0.75, 'rgba(120,220,255,' + (pul * 0.5).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(255,255,255,' + pul.toFixed(2) + ')'); c.fillStyle = gr; c.beginPath(); c.ellipse(b.chest.x - 30, b.chest.y, 120, 150, 0, 0, 7); c.fill(); c.lineWidth = 4; c.strokeStyle = 'rgba(255,255,255,.9)'; c.stroke(); }
        c.restore();
      }
      if (b.chargeT > 0 || b.pullT > 0) { // telegraph rings converging on the titan
        for (let i = 0; i < 4; i++) { const ph = (g.time * 1.2 + i / 4) % 1, r = 60 + (1 - ph) * (b.pullT > 0 ? 900 : 300); c.beginPath(); c.arc(b.chest.x, b.chest.y, r, Math.PI * 0.6, Math.PI * 1.4); c.lineWidth = 6; c.strokeStyle = 'rgba(200,140,255,' + (Math.sin(ph * Math.PI) * 0.7).toFixed(2) + ')'; c.stroke(); }
      }
      for (const f of b.fists) {
        if (f.st !== 'away') spr(c, 'parts', SPR.parts, 0, f.x, f.y, { rot: f.rot, s: 1, a: f.st === 'back' ? Math.min(1, f.t * 2.5) : 1 });
      }
      hpBar(c, b.name, b.hp, b.maxHp[b.phase], 'PHASE ' + b.phase + '/3');
    }
  }
  function drawHud(c, g) {
    const p = g.player;
    const hn = g.maxHearts || MP.HEARTS, hgap = hn > 5 ? 40 : 47;
    for (let i = 0; i < hn; i++) fx(c, i < p.hp ? 'heart' : 'heartEmpty', 42 + i * hgap, 48, { s: hn > 5 ? 0.44 : 0.5 });
    // active shop items with the seconds left
    let bx = 46; for (const [k, ic] of [['shield', 'shield'], ['boots', 'boots'], ['magnet', 'smagnet']]) if (g.buff[k] > 0) { const left = g.buff[k]; if (!(left < 5 && Math.floor(g.time * 6) % 2)) fx(c, ic, bx, 142, { s: 0.44 }); text(c, String(Math.ceil(left)), bx + 24, 144, 24, '#fff', '#3b2438', 6, 'left'); bx += 92; }
    // upgrade tier stars in the colour of the magnet's field
    { const tier = g.batt + g.coil - 2; if (tier > 0) text(c, '★'.repeat(tier), 44 + 3 * 22 + 132, 101, 22, TIER[tier].name, '#fff', 5, 'left'); }
    pill(c, W / 2 - 205, 20, 410, 56);
    text(c, 'SCORE', W / 2 - 108, 49, 34, '#ffd83d', '#0b1f5c', 7); text(c, String(Math.min(99999999, g.score)).padStart(8, '0'), W / 2 + 72, 49, 36, '#fff', '#0b1f5c', 7);
    pill(c, W - 250, 20, 222, 56);
    text(c, 'STAGE', W - 180, 49, 32, '#ffd83d', '#0b1f5c', 7); text(c, g.def.final ? 'FINAL' : String(g.stage), W - 82, 49, g.def.final ? 28 : 36, '#fff', '#0b1f5c', 7);
    // small magnet status under the hearts: batteries, coil turns
    for (let i = 0; i < g.batt; i++) fx(c, 'battery', 44 + i * 22, 100, { s: 0.34 });
    fx(c, 'coil', 44 + 3 * 22 + 34, 100, { s: 0.42 }); text(c, MP.UPG.coil.turns[g.coil - 1] + '회', 44 + 3 * 22 + 70, 101, 20, '#fff', '#3b2438', 5, 'left');
    // right: materials + held monsters
    fx(c, 'bolt', 1118, 100, { s: 0.36 }); text(c, String(g.mats), 1138, 101, 22, '#fff', '#3b2438', 5, 'left');
    text(c, '흡수 ' + p.held.length + '/' + MP.HOLD_MAX, W - 30, 101, 20, p.held.length >= MP.HOLD_MAX ? '#ffe14d' : '#fff', '#3b2438', 5, 'right');
  }
  R.draw = function (g) {
    const c = ctx; c.setTransform(rs, 0, 0, rs, 0, 0); c.imageSmoothingQuality = MP.coarse ? 'low' : 'high';     // phones: cheaper scaling, looks the same at these ratios
    const sx = g.shake > 0 ? (Math.random() - .5) * 10 * Math.min(1, g.shake * 5) : 0, sy = g.shake > 0 ? (Math.random() - .5) * 8 * Math.min(1, g.shake * 5) : 0;
    if (A.ok('bg' + g.stage)) {
      blit(c, layer('stage' + g.stage, x => { x.drawImage(IMG['bg' + g.stage], -LM, -LM, W + LM * 2, H + LM * 2); x.drawImage(IMG['bg' + g.stage], 0, 0, W, H); for (const p of g.world.plats.filter(isStatic)) { if (p.ground) x.drawImage(groundImg(g.theme), -32, G - 11, 1344, SPR.plat.groundH); else x.drawImage(platImg(g.theme, p.w), p.x, p.y - 11, p.w, SPR.plat.h); } }), sx, sy);
    } else { c.fillStyle = '#8fd0f5'; c.fillRect(0, 0, W, H); }
    c.save(); c.translate(sx, sy);
    if (g.boss && g.boss.kind === 'titan') drawBoss(c, g.boss, g);
    drawPlats(c, g.world.plats, g.theme, g.time);
    if (g.boss && g.boss.kind === 'king') drawBoss(c, g.boss, g);
    const pl = g.player;
    for (const m of g.monsters) {
      let o = { flip: m.dir < 0, py: m.h / 2 }, anim = m.anim, y = m.y + 3, x = m.x;
      if (m.state === 'spawn') { const k = Math.min(1, m.t / 0.7); o.s = 0.3 + 0.7 * k * (1 + Math.sin(k * Math.PI) * 0.25); o.a = Math.min(1, m.t * 4); }
      else if (m.state === 'resist') { const away = m.x > pl.x ? 1 : -1; o.rot = away * (0.26 + Math.sin(g.time * 34) * 0.05); x += Math.sin(g.time * 80) * 2.2; anim = 'hurt'; }
      else if (m.state === 'pulled') { o.rot = m.rot; o.s = Math.max(0.4, Math.min(1, (m.pullDist || 200) / 150)); anim = 'pulled'; }
      else if (m.state === 'ko') { o.rot = m.rot; anim = 'ko'; }
      else if (m.state === 'stun') { o.rot = m.rot; }
      if (m.nopeT > 0) anim = 'pulled';
      if (m.shakeT > 0) x += Math.sin(g.time * 90) * 4;
      if (m.flash > 0) o.s = (o.s || 1) * (1 + Math.sin(m.flash * 40) * 0.06);
      drawMon(c, m.type, anim, m.animT, x, y, o);
      if (m.state === 'stun' && !m.def.part) for (let i = 0; i < 2; i++) { const an = g.time * 6 + i * 3.14; fx(c, 'star', m.x + Math.cos(an) * m.hw * 0.8, m.y - m.h - 8 + Math.sin(an) * 6, { s: 0.22 }); }
      if (m.nopeT > 0) fx(c, 'ques', m.x, m.y - m.h - 34, { s: 0.6 });
      if (m.bang > 0 || m.state === 'resist') fx(c, 'bang', m.x, m.y - m.h - 34, { s: 0.6 });
      if (m.anchor > 0 && m.shakeT > 0) { const k = 1 - m.anchor / m.def.anchor, w = 70; rrect(c, m.x - w / 2, m.y - m.h - 24, w, 12, 6); c.fillStyle = '#2b1c3a'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#fff'; c.stroke(); rrect(c, m.x - w / 2 + 2, m.y - m.h - 22, Math.max(8, (w - 4) * k), 8, 4); c.fillStyle = '#7fe36b'; c.fill(); }
    }
    for (const h of g.hazards) drawHazard(c, h, g);
    // hero
    const blink = pl.inv > 0 && pl.inv < 90 && Math.floor(pl.inv * 14) % 2 ? 0.4 : 1;
    drawAura(c, g);
    drawHero(c, pl.x, pl.y + 3, pl.frame, pl.facing, g.batt, g.coil, pl.magnet, { a: blink });
    if (g.buff.shield > 0 && !pl.dead) {     // electro shield bubble (blinks when about to run out)
      const left = g.buff.shield, a = (left < 5 && Math.floor(g.time * 8) % 2 ? 0.25 : 0.6) + (g.shieldHit > 0 ? 0.35 : 0), cy = pl.y - 62, gr = c.createRadialGradient(pl.x, cy, 30, pl.x, cy, 96);
      gr.addColorStop(0, 'rgba(160,235,255,0.04)'); gr.addColorStop(0.8, 'rgba(110,210,255,' + (a * 0.55).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(255,255,255,' + a.toFixed(2) + ')');
      c.fillStyle = gr; c.beginPath(); c.ellipse(pl.x, cy, 82, 96, 0, 0, 7); c.fill(); c.lineWidth = 4; c.strokeStyle = 'rgba(255,255,255,' + Math.min(1, a + 0.25).toFixed(2) + ')'; c.stroke();
      for (let i = 0; i < 3; i++) { const an = g.time * 2.4 + i * 2.094; fx(c, 'spark', pl.x + Math.cos(an) * 80, cy + Math.sin(an) * 92, { s: 0.2 }); }
    }
    if (pl.magnet && !pl.dead) {
      drawField(c, g);
      fx(c, 'on', pl.x + pl.facing * 84, pl.y - 104 + Math.sin(g.time * 10) * 2, { s: 0.6 });
    }
    // monsters stuck to the magnet
    pl.held.forEach((it, i) => { const an = i * 1.9 + 0.4, r = 14 + (i > 0 ? 12 : 0), d = MP.MON[it.type]; drawMon(c, it.type, 'pulled', g.time + i * 0.3, g.nozzle.x + pl.facing * (16 + Math.cos(an) * r) + Math.sin(g.time * 40 + i) * 1.2, g.nozzle.y + Math.sin(an) * r + d.h * 0.2, { s: 0.42, flip: pl.facing > 0, py: d.h / 2 }); });
    for (const pr of g.projectiles) {
      { const tier = g.batt + g.coil - 2, T = TIER[tier], nT = 3 + tier; c.save(); for (let i = 1; i <= nT; i++) { c.beginPath(); c.arc(pr.x - Math.sign(pr.vx) * i * 15, pr.y, pr.r * (1.05 - i / (nT + 1)) * (1 + tier * 0.12), 0, 7); c.fillStyle = 'rgba(' + (i % 2 ? T.cone : T.bright) + ',' + (0.6 - i * 0.5 / nT).toFixed(2) + ')'; c.fill(); } c.restore(); }
      pr.items.forEach((it, i) => { const an = pr.rot + i * (Math.PI * 2 / pr.n), rr = pr.n > 1 ? pr.r * 0.45 : 0, d = MP.MON[it.type]; drawMon(c, it.type, 'ko', 0, pr.x + Math.cos(an) * rr, pr.y + Math.sin(an) * rr + d.h * 0.3, { s: 0.6, rot: pr.rot, py: d.h / 2 }); });
    }
    for (const f of g.fx) drawFx(c, f, g);
    c.restore();
    drawHud(c, g);
    if (g.hintT > 0 && g.hint && g.state !== 'clear') {
      c.globalAlpha = Math.min(1, g.hintT * 3); c.font = '26px ' + FONT; const w = c.measureText(g.hint).width + 44;
      rrect(c, W / 2 - w / 2, 668, w, 40, 20); c.fillStyle = 'rgba(20,30,70,.55)'; c.fill(); text(c, g.hint, W / 2, 689, 26, '#fff', '#16204a', 5); c.globalAlpha = 1;
    }
    if (g.banner) {
      const b = g.banner, k = b.t / b.dur, inn = Math.min(1, b.t / 0.25), out = Math.max(0, (k - 0.82) / 0.18), s = (0.5 + 0.5 * inn + Math.sin(inn * Math.PI) * 0.12) * (1 - out * 0.2);
      c.save(); c.globalAlpha = 1 - out; c.translate(W / 2, 290); c.scale(s, s);
      text(c, b.text, 0, 0, 96, b.warn ? '#ff5a5a' : b.good ? '#7dff6b' : '#ffd83d', '#16204a', 18); text(c, b.text, 0, 0, 96, b.warn ? '#ff5a5a' : b.good ? '#7dff6b' : '#ffd83d', '#fff', 5);
      if (b.sub) text(c, b.sub, 0, 82, 44, '#fff', '#16204a', 10);
      c.restore();
    }
  };

  // ---- title screen backdrop (canvas part; buttons are DOM) ----
  R.drawMenu = function (t, sv) {
    const c = ctx; c.setTransform(rs, 0, 0, rs, 0, 0); c.imageSmoothingQuality = MP.coarse ? 'low' : 'high';     // phones: cheaper scaling, looks the same at these ratios
    blit(c, layer('menu', x => { x.drawImage(IMG.bg1, -LM, -LM, W + LM * 2, H + LM * 2); x.drawImage(IMG.bg1, 0, 0, W, H); x.drawImage(groundImg('meadow'), -32, G - 11, 1344, SPR.plat.groundH); x.drawImage(platImg('meadow', 288), 930, 440 - 11, 288, SPR.plat.h); }), 0, 0);
    const HM = SPR.hero.anims, fr = HM.magnet[0] + Math.floor(t * 16) % HM.magnet[1];
    // hero with the magnet ON pulling an iron ball
    const hx = 120, hy = G + 3, nzx = hx + 118 * 1.25, nzy = hy - 42 * 1.25;
    drawHero(c, hx, hy, fr, 1, sv.batt, sv.coil, true, { s: 1.25 });
    fx(c, 'on', hx + 96, hy - 120 + Math.sin(t * 10) * 2, { s: 0.7 });
    for (let i = 0; i < 6; i++) { const ph = (t * 1.2 + i / 6) % 1, d = 130 * (1 - ph) + 8, a = Math.sin(ph * Math.PI); c.beginPath(); c.ellipse(nzx + d, nzy, 6 + d * 0.06, 20 + d * 0.3, 0, 0, 7); c.lineWidth = 10; c.strokeStyle = 'rgba(70,170,255,' + (a * 0.3) + ')'; c.stroke(); c.lineWidth = 3.5; c.strokeStyle = 'rgba(235,250,255,' + (a * 0.9) + ')'; c.stroke(); }
    drawMon(c, 'ball', 'pulled', t, nzx + 84 + Math.sin(t * 3) * 10, hy - 18 + Math.sin(t * 7) * 4, { rot: Math.sin(t * 5) * 0.35, py: 33, flip: true, s: 0.9 });
    drawMon(c, 'robot', 'idle', t, 1010, 440 + 3, { flip: true });
    drawMon(c, 'slime', 'move', t, 1140, 440 + 3, { flip: true });
    drawMon(c, 'bat', 'move', t, 1120, 250 + Math.sin(t * 2.4) * 16, { flip: true });
    drawMon(c, 'bug', 'move', t, 980, G + 3, { flip: true });
    // logo
    const word = 'MAGNET POP', size = 128; c.font = size + 'px ' + FONT; let tw = 0; const ws = []; for (const ch of word) { const w = c.measureText(ch).width; ws.push(w); tw += w; }
    let x = W / 2 - tw / 2;
    [...word].forEach((ch, i) => { const y = 150 + Math.sin(t * 2.2 + i * 0.6) * 6, cx = x + ws[i] / 2; if (ch !== ' ') { c.font = size + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = 30; c.strokeStyle = '#16204a'; c.strokeText(ch, cx, y + 6); c.lineWidth = 16; c.strokeStyle = '#fff'; c.strokeText(ch, cx, y); const gr = c.createLinearGradient(0, y - 60, 0, y + 60); if (i < 6) { gr.addColorStop(0, '#ff8f8f'); gr.addColorStop(1, '#e0203a'); } else { gr.addColorStop(0, '#7fc4ff'); gr.addColorStop(1, '#2a5fd6'); } c.fillStyle = gr; c.fillText(ch, cx, y); } x += ws[i]; });
    pill(c, W / 2 - 170, 228, 340, 54); text(c, '전자석 대작전', W / 2, 256, 34, '#ffd83d', '#0b1f5c', 7);
    text(c, 'v' + MP.VERSION, W - 20, 22, 22, '#fff', '#173d96', 5, 'right');
  };
  // generic bright backdrop for sub screens
  R.drawBackdrop = function (n) {
    const c = ctx; c.setTransform(rs, 0, 0, rs, 0, 0); n = n || 1;
    if (!A.ok('bg' + n)) { if (!pending['bg' + n]) A.ensure(['bg' + n]).then(() => A.useBg(n)); n = 1; }
    blit(c, layer('back' + n, x => { x.drawImage(IMG['bg' + n], -LM, -LM, W + LM * 2, H + LM * 2); x.drawImage(IMG['bg' + n], 0, 0, W, H); x.drawImage(groundImg(MP.THEME[MP.STAGES[n].world]), -32, G - 11, 1344, SPR.plat.groundH); x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(-LM, -LM, W + LM * 2, H + LM * 2); }), 0, 0);
  };

  // ---- science classroom illustrations (drawn with the real game sprites) ----
  R.sciencePic = function (canvas, kind, t) {
    const c = canvas.getContext('2d'), w = canvas.width, h = canvas.height, k = w / 300; c.setTransform(k, 0, 0, k, 0, 0); c.clearRect(0, 0, 300, 170);
    const sky = c.createLinearGradient(0, 0, 0, 170); sky.addColorStop(0, '#bfe6ff'); sky.addColorStop(1, '#eefaff'); rrect(c, 0, 0, 300, 170, 16); c.fillStyle = sky; c.fill();
    const wm = SPR.weapon, wp = (b, co, on, x, y, s) => spr(c, 'weapon', wm, weaponIdx(b, co, on), x, y, { s });
    const rings = (x, y, n, len) => { for (let i = 0; i < n; i++) { const ph = (t * 1.2 + i / n) % 1, d = len * (1 - ph) + 4, a = Math.sin(ph * Math.PI); c.beginPath(); c.ellipse(x + d, y, 3 + d * 0.06, 9 + d * 0.28, 0, 0, 7); c.lineWidth = 2.4; c.strokeStyle = 'rgba(40,140,255,' + a * 0.9 + ')'; c.stroke(); } };
    const label = (s, x, y, col) => text(c, s, x, y, 15, col || '#16204a', '#fff', 4);
    if (kind === 'field') { wp(2, 2, true, 70, 98, 1.0); rings(142, 98, 6, 120); label('전류 ON → 자기장 발생', 150, 150, '#1a5fd0'); }
    else if (kind === 'onoff') { wp(1, 2, true, 40, 62, 0.62); rings(86, 62, 4, 40); drawMon(c, 'ball', 'pulled', t, 118, 78, { s: 0.42 }); label('ON: 철이 붙어요', 82, 104, '#1a9a3a'); wp(1, 2, false, 190, 62, 0.62); drawMon(c, 'ball', 'hurt', t, 262, 78 + ((t * 60) % 60), { s: 0.42 }); label('OFF: 떨어져요', 232, 150, '#d0303a'); }
    else if (kind === 'materials') { wp(2, 2, true, 36, 54, 0.6); rings(80, 54, 4, 60); drawMon(c, 'ball', 'pulled', t, 108 + Math.sin(t * 4) * 3, 74, { s: 0.46 }); label('철 ○', 108, 96, '#1a9a3a'); [['wood', 60, '나무 ✕'], ['plastic', 150, '플라스틱 ✕'], ['alu', 240, '알루미늄 ✕']].forEach(([ty, x, l]) => { drawMon(c, ty, 'pulled', t, x, 146, { s: 0.5 }); label(l, x, 158, '#d0303a'); }); }
    else if (kind === 'battery') { [1, 2, 3].forEach((b, i) => { wp(b, 1, false, 22 + i * 98, 96, 0.52); label('건전지 ' + b + '개', 58 + i * 98, 128); label(['전압 ↑', '전압 ↑↑', '전압 ↑↑↑'][i], 58 + i * 98, 148, '#d06a00'); }); }
    else if (kind === 'coil') { [1, 2, 3].forEach((co, i) => { wp(1, co, true, 20 + i * 98, 80, 0.5); rings(56 + i * 98, 80, 2 + co, 16 + co * 10); label(co * 10 + '회 감기', 58 + i * 98, 128); label(['자기장 약', '자기장 중', '자기장 강'][i], 58 + i * 98, 148, '#1a5fd0'); }); }
    else if (kind === 'compass') { const M = SPR.king; wp(2, 2, true, 30, 96, 0.62); rings(76, 96, 5, 90); spr(c, 'king', M, M.anims.dizzy[0] + Math.floor(t * 7) % 4, 222, 162, { s: 0.6 }); fx(c, 'needle', 222, 162 - 63 * 0.6, { rot: t * 6, s: 0.6 }); label('바늘이 빙글빙글!', 222, 20, '#d06a00'); }
  };
})();
