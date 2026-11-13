// MAGNET POP - keyboard + multi-touch input
(function () {
  const MP = window.MP;
  // phones / tablets: coarse pointer or a touch screen
  MP.coarse = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
  const I = MP.Input = { left: false, right: false, down: false, jump: false, magnet: false, jumpEdge: false, pauseEdge: false, touch: MP.coarse };
  if (MP.coarse) document.body.classList.add('touch');
  const map = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowDown: 'down', KeyS: 'down', Space: 'jump', ArrowUp: 'jump', KeyW: 'jump', KeyZ: 'magnet', KeyJ: 'magnet' };
  const src = { key: {}, touch: {}, pad: {} };       // pad = the move pad's push-up jump, kept apart from the JUMP button
  function refresh() { for (const a of ['left', 'right', 'down', 'jump', 'magnet']) I[a] = !!(src.key[a] || src.touch[a] || src.pad[a]); }
  function set(kind, a, v) { if (v && !src[kind][a] && a === 'jump') I.jumpEdge = true; src[kind][a] = v; refresh(); }
  addEventListener('keydown', e => {
    if (e.code === 'Escape' || e.code === 'KeyP') { I.pauseEdge = true; e.preventDefault(); return; }
    const a = map[e.code]; if (!a) return;
    if (!e.target.closest || !e.target.closest('input,textarea')) e.preventDefault();
    if (!e.repeat) set('key', a, true);
  });
  addEventListener('keyup', e => { const a = map[e.code]; if (a) set('key', a, false); });
  addEventListener('blur', () => { src.key = {}; src.touch = {}; src.pad = {}; refresh(); });
  I.releaseAll = () => { src.key = {}; src.touch = {}; src.pad = {}; refresh(); document.querySelectorAll('#touch .on, #touch .pl, #touch .pr, #touch .pj').forEach(el => el.classList.remove('on', 'pl', 'pr', 'pj')); };
  // Buttons: each element with data-act. Pointer capture lets every finger work independently (multi-touch).
  I.bindTouch = root => {
    root.querySelectorAll('[data-act]').forEach(el => {
      const a = el.dataset.act, ids = new Set();
      const dn = e => { e.preventDefault(); ids.add(e.pointerId); try { el.setPointerCapture(e.pointerId); } catch (_) {} el.classList.add('on'); if (a === 'pause') I.pauseEdge = true; else set('touch', a, true); };
      const up = e => { e.preventDefault(); ids.delete(e.pointerId); if (!ids.size) { el.classList.remove('on'); if (a !== 'pause') set('touch', a, false); } };
      el.addEventListener('pointerdown', dn); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
      el.addEventListener('contextmenu', e => e.preventDefault());
    });
    // Move pad: one zone for left / right. The thumb can slide across the middle to change direction without lifting.
    root.querySelectorAll('[data-pad]').forEach(el => {
      let id = null, baseY = 0, peakY = 0, jumping = false;
      const th = () => (el.firstElementChild ? el.firstElementChild.clientHeight : 80) * 0.42;      // how far "up" counts as a jump
      const dir = e => { const r = el.clientWidth, x = e.offsetX; const d = x < r / 2 ? 'left' : 'right'; set('touch', 'left', d === 'left'); set('touch', 'right', d === 'right'); el.classList.toggle('pl', d === 'left'); el.classList.toggle('pr', d === 'right'); };
      // Pushing the thumb up from wherever it rests jumps; easing back down ends the jump so the next push up jumps again.
      const lift = e => {
        const y = e.offsetY;
        if (!jumping) { baseY = Math.max(baseY, y); if (baseY - y > th()) { jumping = true; peakY = y; set('pad', 'jump', true); el.classList.add('pj'); } }
        else { peakY = Math.min(peakY, y); if (y - peakY > th() * 0.45) { jumping = false; baseY = y; set('pad', 'jump', false); el.classList.remove('pj'); } }
      };
      const dn = e => { e.preventDefault(); if (id !== null) return; id = e.pointerId; try { el.setPointerCapture(id); } catch (_) {} baseY = e.offsetY; jumping = false; dir(e); };
      const mv = e => { if (e.pointerId === id) { e.preventDefault(); dir(e); lift(e); } };
      const up = e => { if (e.pointerId !== id) return; e.preventDefault(); id = null; jumping = false; set('touch', 'left', false); set('touch', 'right', false); set('pad', 'jump', false); el.classList.remove('pl', 'pr', 'pj'); };
      el.addEventListener('pointerdown', dn); el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
      el.addEventListener('contextmenu', e => e.preventDefault());
    });
  };
  addEventListener('touchstart', () => { if (!I.touch) { I.touch = true; MP.coarse = true; document.body.classList.add('touch'); if (MP.App) MP.App.layout(); } }, { passive: true });
  I.endFrame = () => { I.pauseEdge = false; };
})();
