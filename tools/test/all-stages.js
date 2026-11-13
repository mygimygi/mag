// logic test: an assisted bot (hover + invulnerable) clears every stage through the real absorb / launch / wave / boss code paths
const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message + '\n' + e.stack)); p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto('http://localhost:8765/index.html'); await p.waitForFunction(() => window.MP && MP.ready, null, { timeout: 20000 }); await p.evaluate(() => { MP.Assets.keepAll = true; return MP.Assets.ensure(MP.Assets.all()); });
  const from = +process.argv[2] || 1, to = +process.argv[3] || 16;
  const res = await p.evaluate(async ([from, to]) => {
    const g = MP.game, I = MP.Input, out = [];
    localStorage.clear(); MP.Save.reset(); MP.Save.data.unlocked = from; 
    const hold = (x, y, f) => { const pl = g.player; pl.x = x; pl.y = y; pl.vx = 0; pl.vy = 0; pl.facing = f; pl.inv = 5; pl.onGround = true; };
    const tick = (x, y, f, t) => { const n = Math.round(t * 120); for (let i = 0; i < n; i++) { hold(x, y, f); g.update(MP.DT); } };
    const absorb = (m) => { I.magnet = true; let t = 0, x = 0, y = 0, fx = 1; while (!m.dead && t < 6 && g.state === 'play') { if (m.state !== 'pulled') { const f = m.x > 640 ? 1 : -1; x = Math.max(40, Math.min((g.player.maxX || 1280) - 40, m.x - f * 200)); y = m.cy + 42; fx = m.x >= x ? 1 : -1; } tick(x, y, fx, 1 / 30); t += 1 / 30; } return m.dead; };
    const shoot = (tx, ty) => { const f = tx > 640 ? 1 : -1; const x = Math.max(40, Math.min((g.player.maxX || 1280) - 40, tx - f * 330)); const fx = tx >= x ? 1 : -1; tick(x, ty + 42, fx, 0.05); I.magnet = false; tick(x, ty + 42, fx, 1.3); };
    for (let n = from; n <= to; n++) {
      // spend materials as a real player would
      while (MP.Save.upgrade('batt') || MP.Save.upgrade('coil')) { }
      const before = { mats: MP.Save.data.mats, b: MP.Save.data.batt, c: MP.Save.data.coil };
      MP.App.startStage(n); MP.App.paused = true; I.magnet = false; let sim = 0, notes = [];
      if (g.stage !== n) { out.push({ n, error: 'could not start (locked?)' }); break; }
      while (g.state !== 'clear' && sim < 420) {
        if (g.state !== 'play') { tick(200, 625, 1, 0.25); sim += 0.25; continue; }
        const live = g.monsters.filter(m => ['live', 'hurt', 'stun'].includes(m.state));
        const irons = live.filter(m => m.def.iron && !m.def.part), nons = live.filter(m => !m.def.iron), B = g.boss, held = g.player.held.length;
        if (B && B.kind === 'king') {
          if (B.state === 'stun' && held) { shoot(B.x, B.y - 90); sim += 1.4; }
          else if (!held && irons.length) { absorb(irons[0]); sim += 1; }
          else if (held && B.state !== 'dead' && B.state !== 'intro') { I.magnet = true; const f = B.x > 640 ? 1 : -1; tick(B.x - f * 260, 625, f, 0.25); sim += 0.25; }
          else { tick(200, 625, 1, 0.25); sim += 0.25; }
        } else if (B && B.kind === 'titan') {
          const parts = g.monsters.filter(m => m.def.part && m.state !== 'spawn' && !m.dead);
          if (B.phase === 2 && !notes.includes('p2')) notes.push('p2'); if (B.phase === 3 && !notes.includes('p3')) notes.push('p3');
          if (held && B.vulnerable && !parts.some(s => s.type === 'shield' && Math.abs(s.cy - B.chest.y) < 70)) { const hp0 = B.hp, ph0 = B.phase; shoot(B.chest.x, B.chest.y); sim += 1.4; if (B.hp === hp0 && B.phase === ph0) notes.push('miss'); }
          else if (parts.length && held < 5) { absorb(parts[0]); sim += 1; }
          else if (irons.length && held < 2) { absorb(irons[0]); sim += 1; }
          else if (held && !B.vulnerable && held >= 5) { I.magnet = false; tick(100, 625, -1, 1.2); sim += 1.2; }   // dump a full magnet
          else { tick(300, 625, 1, 0.25); sim += 0.25; }
        } else if (held) { if (nons.length) shoot(nons[0].x, nons[0].cy); else if (irons.length && held < 3) absorb(irons[0]); else shoot(irons.length ? irons[0].x : 1000, irons.length ? irons[0].cy : g.player.y - 42); sim += 1.4; }
        else if (irons.length) { if (!absorb(irons[0])) notes.push('absorb-timeout ' + irons[0].type); sim += 1; }
        else { tick(200, 625, 1, 0.25); sim += 0.25; }
      }
      I.magnet = false; const cleared = g.state === 'clear'; const sc = g.score, kills = g.kills, matsInStage = g.mats;
      tick(g.player.x, 625, 1, 3.2);        // let the clear sequence finish -> save
      out.push({ n, cleared, sim: Math.round(sim), score: g.result ? g.result.score : sc, kills, drops: matsInStage, granted: g.result ? g.result.mats : null, expect: MP.STAGES[n].total, matsNow: MP.Save.data.mats, batt: before.b, coil: before.c, unlocked: MP.Save.data.unlocked, screen: MP.UI.cur, notes: [...new Set(notes)].join(',') });
      if (!cleared) break;
    }
    out.push({ final: MP.Save.data });
    return out;
  }, [from, to]);
  for (const r of res) console.log(JSON.stringify(r));
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
