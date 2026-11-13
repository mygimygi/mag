// MAGNET POP - Web Audio synthesised sound effects and original chiptune-style music
(function () {
  const MP = window.MP;
  let ctx = null, master, sfxG, bgmG, noiseBuf;
  const A = MP.Audio = { ready: false, track: null, humOn: false };
  function init() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    try { ctx = new AC(); } catch (e) { return false; }
    master = ctx.createGain(); master.connect(ctx.destination);
    sfxG = ctx.createGain(); sfxG.connect(master); bgmG = ctx.createGain(); bgmG.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    A.ready = true; A.applySettings(); return true;
  }
  A.unlock = () => { if (init() && ctx.state === 'suspended') ctx.resume(); };
  A.applySettings = () => { if (!ctx) return; const s = MP.Save.data.settings; master.gain.value = s.vol; sfxG.gain.value = s.sfx ? 0.9 : 0; bgmG.gain.value = s.bgm ? 0.34 : 0; };
  function tone(type, f0, f1, dur, vol, when = 0, dest) {
    if (!ctx) return; const t = ctx.currentTime + when, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || sfxG); o.start(t); o.stop(t + dur + 0.03);
  }
  function noise(dur, vol, freq, when = 0, q = 1, type = 'bandpass', dest) {
    if (!ctx) return; const t = ctx.currentTime + when, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; fl.type = type; fl.frequency.value = freq; fl.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(dest || sfxG); s.start(t); s.stop(t + dur + 0.02);
  }
  const seq = (type, notes, step, vol) => notes.forEach((n, i) => n && tone(type, n, n, step * 1.6, vol, i * step));
  const SFX = {
    start() { seq('square', [523, 659, 784, 1047, 0, 1319], 0.09, 0.18); },
    click() { tone('square', 660, 880, 0.07, 0.12); },
    jump() { tone('square', 300, 720, 0.16, 0.13); },
    land() { noise(0.09, 0.2, 240, 0, 0.8, 'lowpass'); },
    magnetOn() { tone('sawtooth', 110, 240, 0.18, 0.1); tone('square', 880, 1320, 0.08, 0.05, 0.03); },
    absorb() { tone('sine', 300, 1300, 0.14, 0.2); tone('triangle', 1300, 1700, 0.07, 0.12, 0.12); noise(0.06, 0.12, 2400, 0.12, 2); },
    shoot() { tone('square', 900, 180, 0.2, 0.16); noise(0.12, 0.2, 900, 0, 0.7); },
    hit() { tone('square', 240, 90, 0.12, 0.2); noise(0.1, 0.25, 500, 0, 0.8); },
    clang() { tone('triangle', 1400, 1100, 0.18, 0.16); tone('square', 2100, 1800, 0.08, 0.06); },
    defeat() { tone('square', 660, 990, 0.08, 0.13); tone('square', 990, 1480, 0.12, 0.13, 0.07); noise(0.12, 0.12, 1800, 0.02, 1.5); },
    hurt() { tone('sawtooth', 420, 110, 0.3, 0.2); },
    nope() { tone('square', 220, 180, 0.12, 0.1); tone('square', 180, 150, 0.14, 0.1, 0.12); },
    coin() { tone('square', 1320, 1320, 0.05, 0.08); tone('square', 1760, 1760, 0.09, 0.08, 0.05); },
    spawn() { tone('sine', 900, 400, 0.12, 0.08); },
    bossIn() { [0, 0.28, 0.56].forEach(w => { tone('sawtooth', 110, 98, 0.24, 0.24, w); tone('square', 220, 196, 0.24, 0.1, w); }); noise(0.6, 0.2, 120, 0.56, 0.6, 'lowpass'); },
    bossStun() { seq('triangle', [1568, 1319, 1568, 1319, 1568, 1319, 1047], 0.06, 0.15); },
    bossHit() { tone('square', 180, 60, 0.3, 0.25); noise(0.25, 0.3, 300, 0, 0.6, 'lowpass'); },
    slam() { noise(0.3, 0.4, 110, 0, 0.6, 'lowpass'); tone('sine', 120, 40, 0.3, 0.3); },
    wave() { tone('sawtooth', 600, 100, 0.5, 0.12); noise(0.4, 0.12, 700, 0, 0.5); },
    upgrade() { seq('square', [523, 659, 784, 1047, 1319, 1568], 0.07, 0.16); tone('triangle', 2093, 2093, 0.5, 0.12, 0.42); },
    clear() { seq('square', [784, 0, 784, 784, 1047, 0, 988, 1047, 1319, 0, 1568], 0.1, 0.16); seq('triangle', [392, 0, 392, 392, 523, 0, 494, 523, 659, 0, 784], 0.1, 0.14); },
    bossDown() { for (let i = 0; i < 7; i++) { noise(0.3, 0.3, 200 + i * 60, i * 0.22, 0.6, 'lowpass'); tone('square', 200 - i * 14, 60, 0.25, 0.14, i * 0.22); } seq('square', [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 523, 659, 784, 1047, 1319, 1568, 2093], 0.1, 0.16); },
    gameover() { seq('square', [523, 494, 440, 392, 349, 330, 262], 0.16, 0.16); seq('triangle', [262, 247, 220, 196, 175, 165, 131], 0.16, 0.14); },
    quizOk() { seq('square', [784, 1047, 1319], 0.08, 0.14); },
    quizNo() { seq('square', [330, 262], 0.14, 0.12); },
  };
  A.sfx = name => { if (!A.ready || !MP.Save.data.settings.sfx) return; const f = SFX[name]; if (f) f(); };
  // continuous hum while the current flows
  let hum = null;
  A.hum = on => {
    if (!A.ready) return; if (on === A.humOn) return; A.humOn = on;
    if (on) { const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = 96; o2.type = 'square'; o2.frequency.value = 193; l.frequency.value = 17; lg.gain.value = 0.02; l.connect(lg); lg.connect(g.gain); g.gain.value = 0.045; o.connect(g); o2.connect(g); g.connect(sfxG); o.start(); o2.start(); l.start(); hum = { o, o2, l, g }; }
    else if (hum) { const h = hum; hum = null; try { h.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.03); h.o.stop(ctx.currentTime + 0.15); h.o2.stop(ctx.currentTime + 0.15); h.l.stop(ctx.currentTime + 0.15); } catch (e) {} }
  };
  // ---- music: tiny step sequencer. Notes are semitone offsets from the track root; '-' = rest ----
  const N = (root, semi) => root * Math.pow(2, semi / 12);
  const TRACKS = {
    MENU: { bpm: 126, root: 261.63, lead: [0, 4, 7, 12, 11, 7, 4, 7, 9, 5, 9, 12, 11, 7, 2, 7, 5, 9, 12, 17, 16, 12, 9, 12, 7, 11, 14, 11, 12, null, 12, null], bass: [0, 0, -3, -3, -7, -7, -5, -5], chordStep: 4 },
    A: { bpm: 138, root: 293.66, lead: [0, null, 4, 7, 9, 7, 4, null, 5, null, 9, 12, 14, 12, 9, null, 7, null, 11, 14, 16, 14, 11, 7, 12, 11, 9, 7, 4, 2, 0, null, 12, null, 12, 9, 7, null, 4, 7, 9, null, 9, 5, 2, null, 5, 9, 7, 11, 14, 11, 7, 4, 2, 4, 0, null, 4, 7, 12, null, null, null], bass: [0, 0, 5, 5, 7, 7, 0, 0, -3, -3, 5, 5, 7, 7, 0, 0], chordStep: 4 },
    B: { bpm: 132, root: 220, lead: [0, 3, 7, 3, 10, 7, 3, 7, 8, 12, 15, 12, 10, 7, 5, 3, 0, 3, 7, 12, 10, 7, 8, 7, 5, 3, 2, 3, 5, 7, 0, null, 12, null, 10, 12, 15, null, 12, 10, 8, null, 7, 8, 12, null, 8, 7, 5, 7, 8, 10, 12, 10, 8, 7, 3, 5, 7, 10, 12, null, null, null], bass: [0, 0, -4, -4, -2, -2, 0, 0, -4, -4, -2, -2, -5, -5, 0, 0], chordStep: 4, wave: 'triangle' },
    BOSS: { bpm: 152, root: 196, lead: [0, 0, 12, 0, 10, 0, 8, 7, 0, 0, 12, 0, 13, 12, 10, 8, 3, 3, 15, 3, 13, 3, 12, 10, 8, 7, 8, 10, 12, 10, 8, 7], bass: [0, 0, 0, 0, -4, -4, -2, -2], chordStep: 4, minor: true },
    WIN: { bpm: 120, root: 261.63, lead: [0, 4, 7, 12, 16, 12, 7, 12, 5, 9, 12, 17, 21, 17, 12, 17, 7, 11, 14, 19, 23, 19, 14, 19, 12, 16, 19, 24, null, 24, null, null], bass: [0, 0, 5, 5, 7, 7, 0, 0], chordStep: 4 },
  };
  let timer = null, step = 0, nextT = 0;
  function schedule() {
    const tr = TRACKS[A.track]; if (!tr || !ctx) return;
    const st = 60 / tr.bpm / 2;
    while (nextT < ctx.currentTime + 0.25) {
      const when = Math.max(0, nextT - ctx.currentTime);
      const l = tr.lead[step % tr.lead.length];
      if (l != null) { tone(tr.wave || 'square', N(tr.root, l), N(tr.root, l), st * 0.95, 0.11, when, bgmG); tone('triangle', N(tr.root, l + 12), N(tr.root, l + 12), st * 0.5, 0.03, when, bgmG); }
      const bs = tr.bass[Math.floor(step / tr.chordStep) % tr.bass.length];
      if (step % 2 === 0) tone('triangle', N(tr.root / 2, bs), N(tr.root / 2, bs), st * 1.5, 0.2, when, bgmG);
      if (step % 4 === 2) tone('square', N(tr.root, bs + (tr.minor ? 3 : 4)), N(tr.root, bs + (tr.minor ? 3 : 4)), st * 0.6, 0.035, when, bgmG);
      if (step % 4 === 0) noise(0.07, 0.16, 140, when, 0.7, 'lowpass', bgmG); else if (step % 2 === 0) noise(0.05, 0.1, 1800, when, 1, 'bandpass', bgmG);
      if (step % 2 === 1) noise(0.02, 0.04, 6000, when, 1, 'highpass', bgmG);
      nextT += st; step++;
    }
  }
  A.music = name => {
    if (A.track === name) return; A.track = name; step = 0;
    if (timer) { clearInterval(timer); timer = null; }
    if (!name || !ctx) return; nextT = ctx.currentTime + 0.08; timer = setInterval(schedule, 80);
  };
  A.resumeMusic = () => { const t = A.track; if (t && ctx && !timer) { A.track = null; A.music(t); } };
  addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });
})();
