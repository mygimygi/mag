// MAGNET POP - bootstrap, screen layout (16:9, phone rotation), fixed-timestep main loop
(function () {
  const MP = window.MP, R = MP.Render, UI = MP.UI, I = MP.Input, A = MP.Assets, $ = id => document.getElementById(id);
  const frameEl = $('frame'), stage = $('stage'), cv = $('cv'), touch = $('touch'), btnPause = $('btnPause'), safe = $('safe'), turn = $('turn');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const game = MP.game = new MP.Game();
  let rsCap = MP.coarse ? 2 : 2.5, slowT = 0, wake = null, startTok = 0, turnShown = false;
  const App = MP.App = {
    scene: 'load', paused: false, screen: 'loading', fps: 60, bgN: 1, rotated: false, viewScale: 1,
    onScreen(id) {
      this.screen = id;
      if (id === 'menu') this.scene = 'menu';
      else if (id && !['pause', 'over', 'clear', 'loading'].includes(id) && !(id === 'ending' || id === 'quiz')) { this.scene = 'sub'; this.bgN = id === 'upgrade' ? 1 : id === 'science' ? 12 : id === 'stages' ? 3 : id === 'dress' ? 7 : 2; }
      else if (id === 'ending' || id === 'quiz') { this.scene = 'ending'; }
      this.syncHud();
    },
    syncHud() { const playing = this.scene === 'game' && !this.screen; btnPause.hidden = !playing; touch.hidden = !playing; if (!playing) I.releaseAll(); wakeLock(this.scene === 'game'); },
    // Starts at once when the stage's images are already in memory; otherwise shows a short loading screen first.
    startStage(n) {
      if (n > MP.Save.data.unlocked || n < 1 || n > 16) return;       // locked stages can never be started
      MP.Audio.unlock(); const need = A.stageAssets(n), tok = ++startTok;
      const go = () => { A.useBg(n); this.scene = 'game'; this.paused = false; acc = 0; UI.hideAll(); this.scene = 'game'; game.start(n); this.syncHud(); };
      if (A.ready(need)) return go();
      UI.wait('STAGE ' + n + ' 불러오는 중...');
      A.ensure(need, p => UI.progress(p)).then(failed => { if (tok !== startTok) return; if (failed.length) UI.wait('불러오지 못했어요. 인터넷 연결을 확인해 주세요.', true); else go(); });
    },
    pause(v) { if (this.scene !== 'game' || (game.state !== 'play' && game.state !== 'intro')) return; this.paused = v; MP.Audio.hum(false); if (v) { UI.show('pause'); this.scene = 'game'; } else UI.hideAll(); this.syncHud(); },
    quit() { this.paused = false; MP.Audio.hum(false); UI.stages(); },
    layout,
    // Browsers only allow fullscreen from a tap, click or key press, so the game enters it on the player's first input.
    fullscreen(force) {
      const el = document.documentElement, rq = el.requestFullscreen || el.webkitRequestFullscreen;
      if (!rq || document.fullscreenElement || document.webkitFullscreenElement) return;
      if (!force && (!MP.Save.data.settings.autoFs || (navigator.webdriver && !window.__forceFs))) return;
      try { const pr = rq.call(el, { navigationUI: 'hide' }); if (pr && pr.then) pr.then(() => { App.fsOk = true; if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); }).catch(() => { App.fsOk = false; }); } catch (e) {}
    },
  };
  let fsTried = false;
  for (const ev of ['click', 'touchend', 'keydown']) addEventListener(ev, e => { if (fsTried || e.code === 'Escape') return; fsTried = true; App.fullscreen(false); }, { capture: true });
  MP.onStageClear = r => { if (r.stage === 16) UI.ending(r); else { UI.clear(r); App.scene = 'game'; App.syncHud(); } };
  MP.onGameOver = () => { UI.show('over'); App.scene = 'game'; App.syncHud(); };
  MP.haptic = ms => { try { if (MP.coarse && navigator.vibrate) navigator.vibrate(ms); } catch (e) {} };
  function wakeLock(on) {          // keep the screen awake while playing (ignored where unsupported)
    try {
      if (on && !wake && navigator.wakeLock && !document.hidden) navigator.wakeLock.request('screen').then(w => { wake = w; w.addEventListener('release', () => { wake = null; }); }).catch(() => {});
      else if (!on && wake) { wake.release().catch(() => {}); wake = null; }
    } catch (e) {}
  }

  // Fit the 16:9 stage into the safe area. A phone held upright gets the whole game turned 90 degrees so it fills the screen.
  function layout() {
    const r = safe.getBoundingClientRect(), W0 = r.width || innerWidth, H0 = r.height || innerHeight;
    const rot = MP.coarse && H0 > W0 * 1.15, fw = rot ? H0 : W0, fh = rot ? W0 : H0;
    frameEl.style.left = r.left + 'px'; frameEl.style.top = r.top + 'px'; frameEl.style.width = fw + 'px'; frameEl.style.height = fh + 'px';
    frameEl.style.transform = rot ? `translate(${W0}px,0) rotate(90deg)` : 'none';
    const s = Math.min(fw / MP.W, fh / MP.H);
    stage.style.transform = `translate(${Math.round((fw - MP.W * s) / 2)}px,${Math.round((fh - MP.H * s) / 2)}px) scale(${s})`;
    const rs = clamp(s * (window.devicePixelRatio || 1), 1, rsCap);
    R.setScale(Math.round(rs * 4) / 4); App.viewScale = s; App.rotated = rot; App.renderScale = Math.round(rs * 4) / 4;
    document.body.classList.toggle('small', s < 0.72);
    touch.style.setProperty('--tb', Math.round(clamp(fh * 0.2, 58, 108)) + 'px');
    stage.style.setProperty('--boost', clamp(46 / (48 * s), 1, 2.2).toFixed(2));
    if (rot && !turnShown) { turnShown = true; turn.hidden = false; setTimeout(() => { turn.hidden = true; }, 5200); } else if (!rot) turn.hidden = true;
  }
  document.addEventListener('fullscreenchange', () => setTimeout(layout, 60));
  addEventListener('resize', layout); addEventListener('orientationchange', () => setTimeout(layout, 250));
  if (window.visualViewport) visualViewport.addEventListener('resize', layout);
  const unlock = () => { MP.Audio.unlock(); MP.Audio.resumeMusic(); };
  for (const ev of ['pointerdown', 'touchend', 'click', 'keydown']) addEventListener(ev, unlock, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (App.scene === 'game' && !App.screen) App.pause(true); } else wakeLock(App.scene === 'game'); });
  btnPause.addEventListener('click', () => App.pause(true));
  I.bindTouch(touch);
  document.addEventListener('contextmenu', e => e.preventDefault());
  for (const ev of ['gesturestart', 'gesturechange', 'dblclick']) document.addEventListener(ev, e => e.preventDefault());
  document.addEventListener('touchmove', e => { if (!e.target.closest || !e.target.closest('input[type=range]')) e.preventDefault(); }, { passive: false });

  let last = performance.now(), acc = 0, fpsT = 0, fpsN = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now; const t = now / 1000;
    fpsT += dt; fpsN++;
    if (fpsT >= 0.5) {
      App.fps = fpsN / fpsT; fpsT = 0; fpsN = 0;
      // slow device: after 2 s below 45 FPS in a stage, render at a lower resolution (never below 1x)
      if (App.scene === 'game' && !App.paused && App.fps < 45) { slowT += 0.5; if (slowT >= 2 && rsCap > 1) { rsCap = Math.max(1, Math.min(rsCap, App.renderScale) - 0.25); slowT = 0; layout(); } } else slowT = 0;
    }
    if (I.pauseEdge) { if (App.scene === 'game') { if (App.screen === 'pause') App.pause(false); else if (!App.screen) App.pause(true); } }
    if (App.scene === 'game') {
      if (!App.paused) { acc += dt; let n = 0; while (acc >= MP.DT && n < 24) { game.update(MP.DT); acc -= MP.DT; n++; } if (n === 24) acc = 0; }
      R.draw(game);
    } else if (App.scene === 'menu') R.drawMenu(t, MP.Save.data);
    else if (App.scene === 'ending') { R.drawBackdrop(1); const H = MP.SPR.hero.anims.victory; R.drawHero(R.ctx, 230, MP.GROUND + 3, H[0] + Math.floor(t * 9) % H[1], 1, MP.Save.data.batt, MP.Save.data.coil, false, { s: 1.5 }); ['ball', 'robot', 'slime'].forEach((m, i) => R.drawMon(R.ctx, m, 'ko', t + i, 430 + i * 130, MP.GROUND + 3, { s: 0.7, flip: i % 2 })); }
    else if (App.scene === 'sub') { R.drawBackdrop(App.bgN); if (App.screen === 'science') for (const c of UI.sciCanvases) if (c.offsetParent) R.sciencePic(c, c.dataset.pic, t); }
    I.endFrame();
    requestAnimationFrame(frame);
  }
  // deterministic stepping for automated tests
  MP.step = (seconds) => { const n = Math.round(seconds / MP.DT); for (let i = 0; i < n; i++) game.update(MP.DT); };

  // boot
  MP.Save.load(); R.init(cv); layout(); UI.show('loading');
  const fontReady = document.fonts && document.fonts.load ? document.fonts.load('30px Jua').catch(() => {}) : Promise.resolve();
  Promise.all([A.load(p => UI.progress(p)), fontReady]).then(([failed]) => {
    if (failed.length) { UI.loadError(failed); return; }
    A.applyLook(MP.Save.data.look).then(() => { MP.ready = true; UI.menu(); requestAnimationFrame(frame); });
  });
  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !window.__ARTIFACT__) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
