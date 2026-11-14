// MAGNET POP - keyboard + multi-touch input
(function () {
  const MP = window.MP;
  // phones / tablets: coarse pointer or a touch screen
  MP.coarse = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
  const I = MP.Input = { left: false, right: false, down: false, jump: false, magnet: false, jumpEdge: false, pauseEdge: false, touch: MP.coarse };
  if (MP.coarse) document.body.classList.add('touch');
  const map = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowDown: 'down', KeyS: 'down', Space: 'jump', ArrowUp: 'jump', KeyW: 'jump', KeyZ: 'magnet', KeyJ: 'magnet' };
  const src = { key: {}, touch: {}, pad: {} };       // pad = the move pad's push-up jump
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
  I.releaseAll = () => { src.key = {}; src.touch = {}; src.pad = {}; I.padUp = false; I.padDown = false; I.padDrop = false; refresh(); document.querySelectorAll('#touch .on, #touch .pl, #touch .pr, #touch .pj').forEach(el => el.classList.remove('on', 'pl', 'pr', 'pj')); };
  // Buttons: each element with data-act. Pointer capture lets every finger work independently (multi-touch).
  I.bindTouch = root => {
    root.querySelectorAll('[data-act]').forEach(el => {
      const a = el.dataset.act, ids = new Set();
      const dn = e => { e.preventDefault(); ids.add(e.pointerId); try { el.setPointerCapture(e.pointerId); } catch (_) {} el.classList.add('on'); if (a === 'pause') I.pauseEdge = true; else set('touch', a, true); };
      const up = e => { e.preventDefault(); ids.delete(e.pointerId); if (!ids.size) { el.classList.remove('on'); if (a !== 'pause') set('touch', a, false); } };
      el.addEventListener('pointerdown', dn); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
      el.addEventListener('contextmenu', e => e.preventDefault());
    });
    // Round joystick, 8 directions: left / right move, up (also up-left / up-right) jumps, down drops through a platform.
    root.querySelectorAll('[data-pad]').forEach(el => {
      let id = null; const base = el.firstElementChild, knob = base.querySelector('.joy-knob');
      const apply = e => {
        const r = base.getBoundingClientRect(), rot = MP.App && MP.App.rotated, sx = e.clientX - (r.left + r.width / 2), sy = e.clientY - (r.top + r.height / 2);
        const dx = rot ? sy : sx, dy = rot ? -sx : sy, R = r.width / 2, dead = R * 0.3, len = Math.hypot(dx, dy) || 1, k = Math.min(1, R * 0.62 / len);
        knob.style.transform = `translate(${(dx * k).toFixed(1)}px,${(dy * k).toFixed(1)}px)`;
        const h = Math.abs(dx) > dead && Math.abs(dx) > Math.abs(dy) * 0.41, v = Math.abs(dy) > dead && Math.abs(dy) > Math.abs(dx) * 0.41;
        const L = h && dx < 0, Rt = h && dx > 0, U = v && dy < 0, D = v && dy > 0;
        set('touch', 'left', L); set('touch', 'right', Rt); if (D && !I.padDown) I.padDrop = true; I.padDown = D; set('pad', 'jump', U);      // down never jumps; it only drops through a platform
        I.padUp = U; el.classList.toggle('pl', L); el.classList.toggle('pr', Rt); el.classList.toggle('pj', U);
      };
      const dn = e => { e.preventDefault(); if (id !== null) return; id = e.pointerId; try { el.setPointerCapture(id); } catch (_) {} apply(e); };
      const mv = e => { if (e.pointerId === id) { e.preventDefault(); apply(e); } };
      const up = e => { if (e.pointerId !== id) return; e.preventDefault(); id = null; I.padUp = false; I.padDown = false; knob.style.transform = ''; set('touch', 'left', false); set('touch', 'right', false); set('pad', 'jump', false); set('pad', 'down', false); el.classList.remove('pl', 'pr', 'pj'); };
      el.addEventListener('pointerdown', dn); el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
      el.addEventListener('contextmenu', e => e.preventDefault());
    });
  };
  addEventListener('touchstart', () => { if (!I.touch) { I.touch = true; MP.coarse = true; document.body.classList.add('touch'); if (MP.App) MP.App.layout(); } }, { passive: true });
  I.endFrame = () => { I.pauseEdge = false; };
})();
