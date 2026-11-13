// Difficulty check: a simple bot that only uses the normal inputs (left/right/jump/magnet) - no teleport, no invincibility.
const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', e => console.log('PAGEERR ' + e.message));
  await p.goto(process.env.URL || 'http://localhost:8765/index.html'); await p.waitForFunction(() => window.MP && MP.ready, null, { timeout: 20000 }); await p.evaluate(() => { MP.Assets.keepAll = true; return MP.Assets.ensure(MP.Assets.all()); });
  const from = +process.argv[2] || 1, to = +process.argv[3] || 8, tries = +process.argv[4] || 3;
  const res = await p.evaluate(([from, to, tries]) => {
    const g = MP.game, I = MP.Input, out = [];
    const think = () => {
      const pl = g.player; I.left = I.right = I.jump = I.down = false; let mag = false;
      const act = g.monsters.filter(m => ['live', 'hurt', 'stun', 'pulled', 'resist'].includes(m.state) && !m.def.part);
      const irons = act.filter(m => m.def.iron);
      const danger = act.find(m => m.harmful && Math.abs(m.x - pl.x) < 105 && Math.abs(m.y - pl.y) < 70 && m.state !== 'pulled' && m.state !== 'resist');
      const go = x => { if (x > pl.x + 8) I.right = true; else if (x < pl.x - 8) I.left = true; };
      const face = x => { if ((x > pl.x) !== (pl.facing > 0)) { if (x > pl.x) I.right = true; else I.left = true; } };
      const pulled = act.some(m => m.state === 'pulled' || m.state === 'resist');
      if (pl.held.length && !pulled) {
        const tgt = act.filter(m => Math.abs(m.cy - (pl.y - 42)) < 50).sort((a, c) => Math.abs(a.x - pl.x) - Math.abs(c.x - pl.x))[0];
        if (tgt) { face(tgt.x); if ((tgt.x > pl.x) === (pl.facing > 0)) { I.magnet = false; return; } mag = true; }
        else if (!irons.length || pl.held.length >= 3) { I.magnet = false; return; } else mag = true;
      }
      const t = irons.sort((a, c) => (Math.abs(a.x - pl.x) + 2.5 * Math.abs(a.y - pl.y)) - (Math.abs(c.x - pl.x) + 2.5 * Math.abs(c.y - pl.y)))[0];
      if (t) {
        const lvl = Math.abs(t.cy - (pl.y - 42)) < 46 + Math.min(g.stat.range, Math.abs(t.x - pl.x)) * 0.25;
        if (lvl) { const d = Math.abs(t.x - pl.x) - 118; if (d > g.stat.range - 30) go(t.x); else { face(t.x); mag = true; } }
        else if (t.y < pl.y - 40) { const ps = g.world.plats.filter(q => !q.ground && q.y < pl.y - 30 && q.y > pl.y - 175).sort((a, c) => Math.abs(a.x + a.w / 2 - t.x) - Math.abs(c.x + c.w / 2 - t.x))[0];
          if (ps) { const tx = Math.max(ps.x + 36, Math.min(ps.x + ps.w - 36, pl.x)); go(tx); if (Math.abs(tx - pl.x) < 30 && pl.onGround) { I.jump = true; I.jumpEdge = true; } else if (!pl.onGround) I.jump = true; }
          else if (pl.onGround) { I.jump = true; I.jumpEdge = true; face(t.x); mag = true; } }
        else { const pp = pl.plat; if (pp && !pp.ground) go(t.x < pl.x ? pp.x - 40 : pp.x + pp.w + 40); else go(t.x); }
      }
      if (danger && !mag && pl.onGround) { I.jump = true; I.jumpEdge = true; go(pl.x + (danger.x > pl.x ? -200 : 200)); }
      I.magnet = mag;
    };
    for (let n = from; n <= to; n++) {
      const runs = [];
      for (let k = 0; k < tries; k++) {
        MP.Save.data.unlocked = 16; const lv = n <= 6 ? [1, 1] : n <= 9 ? [2, 1] : n <= 12 ? [2, 2] : [3, 3]; MP.Save.data.batt = lv[0]; MP.Save.data.coil = lv[1];
        MP.App.startStage(n); MP.App.paused = true; let t = 0, i = 0;
        while (t < 240 && g.state !== 'clear' && g.state !== 'over') { if (i++ % 6 === 0 && g.state === 'play') think(); g.update(MP.DT); t += MP.DT; }
        runs.push((g.state === 'clear' ? 'CLEAR' : g.state === 'over' ? 'dead' : 'timeout') + ' hp' + g.player.hp + ' ' + Math.round(t) + 's');
        I.magnet = I.left = I.right = I.jump = false;
      }
      out.push('stage ' + n + ': ' + runs.join(' | '));
    }
    return out;
  }, [from, to, tries]);
  console.log(res.join('\n')); await b.close();
})();
