// Feature test: real keyboard / touch events + state assertions.  usage: node tools/test/features.js  (needs a static server on :8765)
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const URL = process.env.URL || 'http://localhost:8765/index.html';
const results = []; const ok = (name, cond, info) => { results.push({ name, pass: !!cond, info }); console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + JSON.stringify(info) : '')); };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, hasTouch: true });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const boot = async () => { await p.goto(URL); await p.waitForFunction(() => window.MP && MP.ready, null, { timeout: 20000 }); await p.evaluate(() => { MP.Assets.keepAll = true; return MP.Assets.ensure(MP.Assets.all()); }); };
  const G = fn => p.evaluate(fn);
  await boot(); await G(() => { localStorage.clear(); MP.Save.reset(); });
  ok('main menu shown', await G(() => MP.UI.cur === 'menu' && MP.App.scene === 'menu'));
  const lazy = await (async () => { const pg = await ctx.newPage(); const reqs = []; pg.on('request', r => { if (/assets\/img\//.test(r.url())) reqs.push(r.url().split('/').pop().split('?')[0]); }); await pg.goto(URL); await pg.waitForFunction(() => window.MP && MP.ready, null, { timeout: 20000 }); const boot = reqs.length; const sync1 = await pg.evaluate(() => { MP.Save.data.unlocked = 16; MP.App.startStage(1); return MP.App.scene === 'game'; }); await pg.evaluate(() => MP.App.startStage(11)); const waiting = await pg.evaluate(() => MP.UI.cur); await pg.waitForFunction(() => MP.game.stage === 11 && MP.App.scene === 'game' && MP.UI.cur === null, null, { timeout: 15000 }); const r = { boot, total: await pg.evaluate(() => MP.Assets.all().length), sync1, waiting, golem: reqs.includes('m_golem.png'), bg11: reqs.includes('bg11.jpg'), titanLoaded: reqs.includes('titan.png') }; await pg.close(); return r; })();
  ok('only core images load at start; a stage loads its own images on demand', lazy.boot < lazy.total - 15 && lazy.sync1 && lazy.waiting === 'loading' && lazy.golem && lazy.bg11 && !lazy.titanLoaded, lazy);
  ok('stage 16 locked at start (cannot start)', await G(() => { MP.App.startStage(16); return MP.App.scene !== 'game'; }));
  await p.click('#menu [data-go=start]', { force: true });
  ok('first start opens the character dress-up screen', await G(() => MP.UI.cur === 'dress'));
  await p.click('.d-chip[data-k=gender][data-v=boy]'); await p.click('.d-sw[data-k=cloth][data-v=green]'); await p.click('.d-chip[data-k=hat][data-v=cap]'); await p.click('.d-sw[data-k=skin][data-v=tan]'); await p.click('.d-chip[data-k=glasses][data-v=true]'); await p.click('.d-chip[data-k=eyes][data-v=large]');
  ok('dress-up choices are applied to the preview look', await G(() => document.querySelector('.d-chip[data-k=hair].sel').dataset.v === 'short' && document.querySelectorAll('.d-svg svg').length === 1));
  await p.click('.d-go', { force: true }); await p.waitForFunction(() => MP.UI.cur === 'stages', null, { timeout: 15000 });
  ok('custom look saved and hero sprite sheet re-rendered', await G(() => { const d = MP.Save.data, im = MP.Assets.img.hero; return d.lookDone && d.look.gender === 'boy' && d.look.cloth === 'green' && d.look.glasses === true && im.tagName === 'CANVAS' && (im.width === 4320 || im.width === 3240); }));
  ok('stage select opens', await G(() => MP.UI.cur === 'stages'));
  ok('only stage 1 unlocked', await G(() => document.querySelectorAll('.sbtn:not(.lock)').length === 1));
  await p.click('.sbtn[data-n="1"]'); await p.waitForTimeout(1900);
  ok('game starts (stage 1, play state)', await G(() => MP.game.stage === 1 && MP.game.state === 'play'));
  // --- movement / jump / platform collision with real key events ---
  let x0 = await G(() => MP.game.player.x);
  await p.keyboard.down('ArrowRight'); await p.waitForTimeout(500); await p.keyboard.up('ArrowRight');
  let x1 = await G(() => MP.game.player.x); ok('move right (ArrowRight)', x1 > x0 + 60, { x0, x1 });
  await p.keyboard.down('KeyA'); await p.waitForTimeout(600); await p.keyboard.up('KeyA');
  ok('move left (A)', (await G(() => MP.game.player.x)) < x1 - 30);
  await G(() => { const pl = MP.game.player; pl.x = 560; pl.inv = 30; MP.game.monsters.forEach(m => { m.x = 1100; m.dir = 1; }); });
  await p.keyboard.down('Space'); await p.waitForTimeout(120);
  const air = await G(() => ({ y: MP.game.player.y, g: MP.game.player.onGround })); await p.waitForTimeout(900); await p.keyboard.up('Space');
  const landed = await G(() => ({ y: MP.game.player.y, g: MP.game.player.onGround }));
  ok('jump (Space) leaves the ground', air.y < 620 && !air.g, air);
  ok('lands on the middle platform (one-way platform collision)', landed.y === 465 && landed.g, landed);
  await G(() => { MP.game.player.x = 300; }); await p.waitForTimeout(700);
  ok('walking off a platform falls to the ground', await G(() => MP.game.player.y === 625));
  // --- electromagnet ---
  await G(() => { const g = MP.game, pl = g.player; pl.inv = 30; pl.x = 300; pl.facing = 1; g.monsters.forEach(m => { m.x = 120; m.dir = -1; m.state = 'live'; }); });
  await p.keyboard.down('KeyZ'); await p.waitForTimeout(350);
  ok('current ON while Z is held', await G(() => MP.game.player.magnet === true));
  ok('monster BEHIND the player is not pulled (field direction)', await G(() => MP.game.monsters.every(m => m.state !== 'pulled' && m.state !== 'resist') && MP.game.player.held.length === 0));
  await G(() => { const g = MP.game; g.monsters.forEach(m => { m.x = 300 + 118 + g.stat.range + 60; m.vx = 0; m.dir = 1; m.aiT = 9; m.def = Object.assign({}, m.def, { speed: 0 }); }); });
  await p.waitForTimeout(300);
  ok('monster beyond the field range is not pulled (absorb distance)', await G(() => MP.game.monsters.every(m => m.state !== 'pulled' && m.state !== 'resist')));
  await G(() => { const g = MP.game; g.monsters.forEach(m => { m.x = 300 + 118 + g.stat.range - 40; }); });
  await p.waitForTimeout(160);
  ok('monster first resists the field (struggle motion) before being pulled', await G(() => MP.game.monsters.some(m => m.state === 'resist') && MP.game.player.held.length === 0), await G(() => MP.game.monsters.map(m => m.state)));
  await p.waitForTimeout(1500);
  ok('monster inside the field is pulled in and absorbed', await G(() => MP.game.player.held.length === 1 && MP.game.monsters.length === 0));
  ok('absorbed monster is counted exactly once (no duplicate absorb)', await G(() => MP.game.player.held.length === 1));
  await p.keyboard.up('KeyZ'); await p.waitForTimeout(80);
  ok('current OFF on release launches the bundle', await G(() => MP.game.player.magnet === false && MP.game.projectiles.length === 1 && MP.game.player.held.length === 0));
  await p.waitForTimeout(3000);
  ok('launched monster is removed and scored', await G(() => MP.game.score >= 100 && MP.game.kills === 1), await G(() => MP.game.score));
  // launched bundle damages another monster
  await p.waitForTimeout(2500);
  const hitTest = await G(() => { const g = MP.game, pl = g.player; MP.App.paused = true; pl.inv = 30; pl.x = 200; pl.y = 625; pl.facing = 1; const ms = g.monsters.filter(m => m.state === 'live' || m.state === 'spawn'); if (ms.length < 2) return { n: ms.length };
    ms.forEach((m, i) => { m.state = 'live'; m.y = 625; m.x = 420 + i * 260; m.vx = 0; m.def = Object.assign({}, m.def, { speed: 0 }); }); const k0 = g.kills; MP.Input.magnet = true; for (let i = 0; i < 200 && !pl.held.length; i++) { pl.x = 200; g.update(MP.DT); } const held = pl.held.length; MP.Input.magnet = false; for (let i = 0; i < 400; i++) { pl.x = 200; pl.inv = 30; g.update(MP.DT); } MP.App.paused = false; return { n: ms.length, held, kills: g.kills - k0, ko: g.monsters.filter(m => m.state === 'ko').length }; });
  ok('launched monster hits and knocks out other monsters', hitTest.held >= 1 && hitTest.kills >= 2, hitTest);
  // --- pull speed / range scale with upgrades ---
  const scale = await G(() => { const s11 = MP.stats(1, 1), s31 = MP.stats(3, 1), s13 = MP.stats(1, 3), s33 = MP.stats(3, 3); return { r1: s11.range, r3: s13.range, p1: s11.pull, pB: s31.pull, pC: s13.pull, p33: s33.pull, shot1: s11.shot, shot33: s33.shot }; });
  ok('battery upgrade raises pull strength', scale.pB > scale.p1, scale);
  ok('coil upgrade raises field range and strength', scale.r3 > scale.r1 && scale.pC > scale.p1);
  const pullTime = await G(() => { const out = {}; for (const [b, c] of [[1, 1], [3, 1], [1, 3], [3, 3]]) { MP.Save.data.unlocked = 2; MP.Save.data.batt = b; MP.Save.data.coil = c; MP.App.startStage(1); MP.App.paused = true; const g = MP.game; for (let i = 0; i < 300; i++) g.update(MP.DT); const m = g.monsters[0], pl = g.player; pl.x = 200; pl.inv = 30; m.x = 200 + 118 + 200; m.y = 625; m.plat = null; m.state = 'live'; m.def = Object.assign({}, m.def, { speed: 0 }); MP.Input.magnet = true; let t = 0; while (!pl.held.length && t < 5) { pl.x = 200; g.update(MP.DT); t += MP.DT; } MP.Input.magnet = false; out[b + '-' + c] = +t.toFixed(3); } MP.Save.data.batt = 1; MP.Save.data.coil = 1; MP.Save.data.unlocked = 1; MP.App.paused = false; return out; });
  ok('absorb time gets shorter with upgrades (absorb speed)', pullTime['3-3'] < pullTime['3-1'] && pullTime['3-1'] < pullTime['1-1'] && pullTime['1-3'] < pullTime['1-1'], pullTime);
  // --- damage, game over, retry ---
  await G(() => MP.App.startStage(1)); await p.waitForTimeout(2600);
  const hp = await G(() => { const g = MP.game, pl = g.player; MP.App.paused = true; const m = g.monsters[0]; const h0 = pl.hp; m.state = 'live'; m.x = pl.x + 10; m.y = pl.y; g.update(MP.DT); const h1 = pl.hp; for (let i = 0; i < 30; i++) g.update(MP.DT); const h2 = pl.hp; return { h0, h1, h2, inv: pl.inv }; });
  ok('touching a monster costs one heart, then brief invincibility', hp.h1 === hp.h0 - 1 && hp.h2 === hp.h1, hp);
  await G(() => { const g = MP.game, pl = g.player; for (let k = 0; k < 9 && pl.hp > 0; k++) { pl.inv = 0; const m = g.monsters[0] || g.spawn('ball', pl.x, pl.y); m.state = 'live'; m.x = pl.x; m.y = pl.y; g.update(MP.DT); } for (let i = 0; i < 300; i++) g.update(MP.DT); MP.App.paused = false; });
  await p.waitForTimeout(300);
  ok('losing all hearts -> GAME OVER screen', await G(() => MP.game.state === 'over' && MP.UI.cur === 'over'));
  await p.click('#over [data-a=retry]'); await p.waitForTimeout(400);
  ok('retry restarts the stage with 5 hearts', await G(() => MP.game.stage === 1 && MP.game.player.hp === 5 && MP.HEARTS === 5 && MP.UI.cur === null));
  // --- alternative keys: J = magnet, W / ArrowUp = jump ---
  await p.waitForTimeout(1700); await G(() => { MP.game.player.inv = 30; });
  await p.keyboard.down('KeyJ'); await p.waitForTimeout(120); const jOn = await G(() => MP.game.player.magnet); await p.keyboard.up('KeyJ'); await p.waitForTimeout(60);
  ok('J key also drives the electromagnet', jOn && await G(() => !MP.game.player.magnet));
  await p.keyboard.down('KeyW'); await p.waitForTimeout(150); const wAir = await G(() => !MP.game.player.onGround); await p.keyboard.up('KeyW'); await p.waitForTimeout(900);
  await p.keyboard.down('ArrowUp'); await p.waitForTimeout(150); const uAir = await G(() => !MP.game.player.onGround); await p.keyboard.up('ArrowUp'); await p.waitForTimeout(700);
  ok('W and ArrowUp also jump', wAir && uAir);
  // --- special platforms ---
  const plats = await G(() => { MP.App.paused = true; MP.Save.data.unlocked = 16; const g = MP.game, out = {};
    const run = (n, kind, fn) => { MP.App.startStage(n); MP.App.paused = true; for (let i = 0; i < 200; i++) g.update(MP.DT); const p = g.world.plats.find(q => q.kind === kind); g.queue.forEach(q => q.done = true); g.monsters.length = 0; return fn(p, g.player); };
    const stand = (p, pl) => { pl.x = p.x + p.w / 2; pl.y = p.y - 4; pl.vy = 0; pl.vx = 0; pl.inv = 60; };
    out.spring = run(5, 'spring', (p, pl) => { stand(p, pl); let top = 999; for (let i = 0; i < 150; i++) { g.update(MP.DT); top = Math.min(top, pl.y); } return Math.round(p.y - top); });
    out.conveyor = run(5, 'conveyor', (p, pl) => { stand(p, pl); const x0 = pl.x; for (let i = 0; i < 120; i++) g.update(MP.DT); return Math.round(pl.x - x0); });
    out.crumble = run(6, 'crumble', (p, pl) => { stand(p, pl); for (let i = 0; i < 20; i++) g.update(MP.DT); const on = pl.onGround && pl.plat === p; for (let i = 0; i < 160; i++) g.update(MP.DT); const fell = pl.y > p.y + 50 && !p.active; for (let i = 0; i < 500; i++) g.update(MP.DT); return { on, fell, back: p.active }; });
    out.vanish = run(2, 'vanish', (p, pl) => { let seenOn = false, seenOff = false, fellWhenOff = false; for (let i = 0; i < 1400; i++) { g.update(MP.DT); if (p.active) seenOn = true; else { seenOff = true; if (!fellWhenOff) { stand(p, pl); for (let k = 0; k < 40; k++) g.update(MP.DT); fellWhenOff = pl.y > p.y + 20; } } } return { seenOn, seenOff, fellWhenOff }; });
    out.moving = run(5, 'solid', () => g.world.plats.filter(q => q.move).length);
    out.kinds = [...new Set(MP.STAGES.slice(1).flatMap(s => s.plats.map(q => q.kind || (q.belt ? 'conveyor' : q.move ? 'moving' : 'solid'))))];
    out.counts = MP.STAGES.slice(1, 16).map(s => s.count); MP.App.paused = false; return out; });
  ok('spring platform launches the hero high', plats.spring > 250, plats.spring);
  ok('conveyor belt carries the hero', Math.abs(plats.conveyor) > 60, plats.conveyor);
  ok('crumbling bridge drops after being stepped on, then comes back', plats.crumble.on && plats.crumble.fell && plats.crumble.back, plats.crumble);
  ok('vanishing cloud turns solid and non-solid in turn', plats.vanish.seenOn && plats.vanish.seenOff && plats.vanish.fellWhenOff, plats.vanish);
  ok('moving platforms present; 5 platform kinds used across stages', plats.moving >= 2 && plats.kinds.length >= 5, plats.kinds);
  ok('every stage has at least twice as many monsters as before', plats.counts.every((c, i) => c >= 2 * [4, 5, 7, 7, 7, 9, 8, 9, 6, 10, 9, 11, 9, 12, 17][i]), plats.counts);
  // --- Compass King no longer sends shock waves when he lands ---
  const kingShock = await G(() => { MP.App.startStage(9); MP.App.paused = true; const g = MP.game; g.def = Object.assign({}, g.def, { waves: [] }); let shock = 0, jumps = 0, prev = ''; for (let i = 0; i < 120 * 22; i++) { g.player.inv = 30; g.player.x = 150; g.update(MP.DT); if (g.boss) { if (g.boss.state === 'jump' && prev !== 'jump') jumps++; prev = g.boss.state; } shock += g.hazards.filter(h => h.kind === 'shock').length; } MP.App.paused = false; return { shock, jumps }; });
  ok('Compass King jumps without the sideways shock attack', kingShock.jumps >= 2 && kingShock.shock === 0, kingShock);
  // --- clear panel: upgrade button instead of stage select ---
  const clearUi = await G(() => { MP.Save.data.mats = 0; MP.Save.data.batt = 1; MP.Save.data.coil = 1; MP.UI.clear({ stage: 2, score: 1000, mats: 12, first: true }); const p = document.querySelector('#clear .panel'); const btns = [...p.querySelectorAll('button')].map(b => b.textContent.trim()); p.querySelector('[data-a=up]').click(); const warn = p.querySelector('.warn'); return { btns, warn: !warn.hidden && warn.textContent, cur: MP.UI.cur }; });
  ok('result pop-up: [next stage] + [upgrade] only; short of materials -> notice', clearUi.btns.length === 2 && !clearUi.btns.some(t => t.includes('상점')) && clearUi.btns.some(t => t.includes('전자석 강화')) && !clearUi.btns.some(t => t.includes('스테이지 선택')) && /부족/.test(clearUi.warn || '') && clearUi.cur === 'clear', clearUi);
  ok('clear panel: upgrade button opens the upgrade screen once materials are enough', await G(() => { MP.Save.data.mats = 100; MP.UI.clear({ stage: 2, score: 1000, mats: 12, first: true }); document.querySelector('#clear [data-a=up]').click(); const ok2 = MP.UI.cur === 'upgrade'; MP.Save.data.mats = 0; return ok2; }));
  await G(() => MP.App.startStage(1)); await p.waitForTimeout(300);
  // --- jump is 10% stronger than the original take-off speed ---
  const jump = await G(() => { MP.App.startStage(1); MP.App.paused = true; const g = MP.game, pl = g.player; for (let i = 0; i < 200; i++) g.update(MP.DT); g.queue.forEach(q => q.done = true); g.monsters.length = 0; MP.Input.jumpEdge = true; MP.Input.jump = true; let top = 625; for (let i = 0; i < 150; i++) { g.update(MP.DT); top = Math.min(top, pl.y); } MP.Input.jump = false; MP.App.paused = false; return { speed: MP.JUMP, height: Math.round(625 - top) }; });
  ok('jump take-off speed raised 10% (885 -> 974), apex about 215 px', Math.abs(jump.speed - 885 * 1.1) < 1 && jump.height > 205 && jump.height < 225, jump);
  // --- Magnet Titan: chest compass + lobbed fists ---
  const titan = await G(() => { MP.Save.data.unlocked = 16; MP.App.startStage(16); MP.App.paused = true; const g = MP.game, pl = g.player; const run = n => { for (let i = 0; i < n; i++) { pl.inv = 30; g.update(MP.DT); } };
    run(120 * 4); const B = g.boss, out = { boss: !!B };
    // needle rests near north, swings toward the electromagnet, settles back
    run(240); out.rest = +Math.abs(B.needle % (2 * Math.PI)).toFixed(2);
    pl.x = 700; pl.y = 625; pl.facing = 1; MP.Input.magnet = true; let maxDev = 0; for (let i = 0; i < 90; i++) { pl.x = 700; pl.inv = 30; g.update(MP.DT); maxDev = Math.max(maxDev, Math.abs(B.needle)); } out.swing = +maxDev.toFixed(2); out.near = B.needleNear; MP.Input.magnet = false;
    // fists: wait for a volley, then check count and that each fist keeps its horizontal speed while the hero runs away
    let seen = new Map(), steer = 0, maxAtOnce = 0, landed = 0, t = 0;
    while (t < 30 && seen.size < 2) { pl.x = 200; pl.inv = 30; g.update(MP.DT); t += MP.DT; for (const h of g.hazards) if (h.kind === 'fist') { if (!seen.has(h)) seen.set(h, { vx: h.vx, y0: h.y, top: h.y }); } }
    const t1 = t; while (t < t1 + 3) { pl.x = 800; pl.inv = 30; g.update(MP.DT); t += MP.DT; const fl = g.hazards.filter(h => h.kind === 'fist'); maxAtOnce = Math.max(maxAtOnce, fl.length); for (const h of fl) { if (!seen.has(h)) seen.set(h, { vx: h.vx, y0: h.y, top: h.y }); const r = seen.get(h); r.top = Math.min(r.top, h.y); steer = Math.max(steer, Math.abs(h.vx - r.vx)); } }
    out.fists = seen.size; out.steer = steer; out.arc = Math.round(Math.max(...[...seen.values()].map(r => r.y0 - r.top))); out.left = g.hazards.filter(h => h.kind === 'fist').length; out.phase = B.phase; MP.App.paused = false; return out; });
  ok('titan chest compass needle swings toward the electromagnet', titan.boss && titan.near && titan.swing > 0.6 && titan.rest < 0.3, { rest: titan.rest, swing: titan.swing });
  ok('titan throws 2-3 fists in an arc, aimed once and never steering', titan.fists >= 2 && titan.fists <= 3 && titan.steer === 0 && titan.arc > 40 && titan.left === 0, titan);
  ok('weapon art differs for every battery/coil combination incl. colour tier', await G(() => { const A = MPArt; A.setLook(null); const set = new Set(); for (let b = 1; b <= 3; b++) for (let c = 1; c <= 3; c++) set.add(A.weapon(b, c, 0)); return set.size === 9 && A.weapon(1, 1, 0).includes('wBody0') && A.weapon(3, 3, 0).includes('wBody4') && A.weapon(2, 2, 0).includes('wBody2'); }));
  // --- shop: question order, buying, items in the next stage only ---
  const qOrder = await G(() => { const S = MP.Save; S.data.shopQ = { order: [0, 1, 2, 3, 4], pos: 0 }; const seq = []; for (let i = 0; i < 20; i++) { seq.push(S.shopQuestion()); S.shopAnswered(); } S.data.shopQ = { order: [0, 1, 2, 3, 4], pos: 0 }; return seq; });
  const rounds = [0, 5, 10, 15].map(i => qOrder.slice(i, i + 5));
  ok('shop questions: 1-5 in order first, then shuffled rounds that each contain all five', rounds[0].join() === '0,1,2,3,4' && rounds.every(r => [...r].sort().join() === '0,1,2,3,4') && rounds.slice(1).some(r => r.join() !== '0,1,2,3,4') && MP_Q5(), qOrder);
  function MP_Q5() { return true; }
  ok('the five shop questions carry the given answers (1,2,4,3,3)', await G(() => MP.SHOP_Q.length === 5 && MP.SHOP_Q.map(q => q.c + 1).join() === '1,2,4,3,3' && MP.SHOP_Q.every(q => q.a.length === 4)));
  const forced = await G(() => { const d = MP.Save.data; d.coins = 40; d.items = {}; d.mats = 0; d.batt = 1; d.coil = 1; const r = { stage: 2, score: 1000, mats: 12, first: true, coins: 17 }; MP.onStageClear(r);
    const o = { afterClear: MP.UI.cur, exitHiddenBeforeAnswer: document.querySelector('#shop .sh-exit').hidden }; const q = MP.SHOP_Q[MP.Save.shopQuestion()]; document.querySelector(`#shop .sh-ans button[data-i="${q.c}"]`).click(); o.exitHiddenAfterRight = document.querySelector('#shop .sh-exit').hidden; document.querySelector('#shop [data-open]').click(); o.cards = document.querySelectorAll('#shop .sh-item').length; o.exitShown = !document.querySelector('#shop .sh-exit').hidden;
    document.querySelector('#shop .sh-exit').click(); o.afterShop = MP.UI.cur; o.btns = [...document.querySelectorAll('#clear .panel button')].map(b => b.textContent.trim());
    MP.onStageClear(r); const q2 = MP.SHOP_Q[MP.Save.shopQuestion()]; document.querySelector(`#shop .sh-ans button[data-i="${(q2.c + 1) % 4}"]`).click(); o.wrongExit = !document.querySelector('#shop .sh-exit').hidden; document.querySelector('#shop .sh-exit').click(); o.afterWrong = MP.UI.cur;
    MP.onStageClear({ stage: 16, score: 1, mats: 0, first: true, coins: 5 }); o.final = MP.UI.cur; return o; });
  ok('every stage clear opens the shop question first; it cannot be skipped', forced.afterClear === 'shop' && forced.exitHiddenBeforeAnswer && forced.exitHiddenAfterRight && forced.cards === 4 && forced.exitShown, forced);
  ok('after the shop the result pop-up shows [next stage] and [upgrade] (right or wrong answer); the final stage goes to the ending', forced.afterShop === 'clear' && forced.btns.length === 2 && forced.btns[0].includes('다음 스테이지') && forced.btns[1].includes('전자석 강화') && forced.wrongExit && forced.afterWrong === 'clear' && forced.final === 'ending', forced);
  const wrong = await G(() => { const d = MP.Save.data; d.shopOpen = true; d.coins = 40; d.items = {}; MP.UI.shop('stages'); const q = MP.SHOP_Q[MP.Save.shopQuestion()]; document.querySelector(`#shop .sh-ans button[data-i="${(q.c + 1) % 4}"]`).click(); return { open: d.shopOpen, items: document.querySelectorAll('#shop .sh-item').length, enter: !!document.querySelector('#shop [data-open]') }; });
  ok('wrong answer: shop stays closed until the next clear', wrong.open === false && wrong.items === 0 && !wrong.enter, wrong);
  const buy = await G(() => { const d = MP.Save.data; d.shopOpen = true; d.coins = 0; d.items = {}; MP.UI.shop('stages'); const q = MP.SHOP_Q[MP.Save.shopQuestion()]; document.querySelector(`#shop .sh-ans button[data-i="${q.c}"]`).click(); document.querySelector('#shop [data-open]').click(); const cards = document.querySelectorAll('#shop .sh-item').length;
    document.querySelector('#shop .sh-buy[data-k=shield]').click(); const first = Object.keys(d.items).join(); document.querySelector('#shop .sh-buy[data-k=boots]').click(); const msg = document.querySelector('#shop .sh-why').textContent;
    document.querySelector('#shop .sh-exit').click(); return { cards, first, items: Object.keys(d.items).join(), msg, open: d.shopOpen, cur: MP.UI.cur }; });
  ok('right answer = reward: pick exactly one of the 4 items for free (no coins needed)', buy.cards === 4 && buy.first === 'shield' && buy.items === 'shield' && /하나만/.test(buy.msg) && buy.open === false && buy.cur === 'stages', buy);
  const use = await G(() => { const d = MP.Save.data, g = MP.game; d.items = { heart: 1, shield: 1, boots: 1, magnet: 1 }; d.unlocked = 16; MP.App.startStage(2); MP.App.paused = true; const pl = g.player; const o = { hp: pl.hp, max: g.maxHearts, buff: Object.assign({}, g.buff), left: Object.keys(d.items).length, range: g.range, base: g.stat.range };
    for (let i = 0; i < 260; i++) g.update(MP.DT); g.queue.forEach(q => q.done = true); g.monsters.length = 0;
    MP.Input.right = true; for (let i = 0; i < 120; i++) g.update(MP.DT); o.speed = Math.round(pl.vx); MP.Input.right = false;
    pl.inv = 0; g.hurt(pl.x + 10); o.hpAfterHit = pl.hp; o.shieldLeft = +g.buff.shield.toFixed(1);
    g.buff.shield = 0; pl.inv = 0; g.hurt(pl.x + 10); o.hpNoShield = pl.hp;
    MP.App.startStage(2); MP.App.paused = true; o.second = { hp: g.player.hp, buff: Object.assign({}, g.buff), range: g.range }; MP.App.paused = false; return o; });
  ok('items work in the next stage: +1 heart, shield blocks a hit, boots are faster, super magnet widens the field', use.hp === 6 && use.max === 6 && use.buff.shield === 25 && use.buff.boots === 25 && use.buff.magnet === 25 && use.left === 0 && use.range === use.base * 1.5 && use.speed > 380 && use.hpAfterHit === 6 && use.hpNoShield === 5, use);
  ok('items are used up: the stage after that starts without them', use.second.hp === 5 && use.second.buff.shield === 0 && use.second.buff.boots === 0 && use.second.range === use.base, use.second);
  // --- titan fists 25% slower (flight time 1.2 s -> 1.6 s) ---
  const fistSpeed = await G(() => { MP.Save.data.unlocked = 16; MP.App.startStage(16); MP.App.paused = true; const g = MP.game, pl = g.player; let h = null, t = 0; while (!h && t < 30) { pl.inv = 30; pl.x = 300; g.update(MP.DT); t += MP.DT; h = g.hazards.find(q => q.kind === 'fist'); } if (!h) return null; const vx = h.vx, x0 = h.x; let fl = 0; while (!h.dead && fl < 5) { pl.inv = 30; g.update(MP.DT); fl += MP.DT; if (!g.hazards.includes(h)) break; } MP.App.paused = false; return { flight: +fl.toFixed(2), grav: h.g, ratio: +(1.2 / fl).toFixed(2) }; });
  ok('titan fist flies 25% slower than before', fistSpeed && fistSpeed.flight > 1.45 && fistSpeed.flight < 1.75 && Math.abs(fistSpeed.ratio - 0.75) < 0.07, fistSpeed);
  // --- upgraded magnet: the field is drawn bolder at every tier ---
  const fieldInk = await G(() => { MP.Save.data.unlocked = 16; const g = MP.game, out = []; for (const [b, c] of [[1, 1], [2, 1], [2, 2], [3, 2], [3, 3]]) { MP.Save.data.batt = b; MP.Save.data.coil = c; MP.App.startStage(1); MP.App.paused = true; for (let i = 0; i < 200; i++) g.update(MP.DT); g.queue.forEach(q => q.done = true); g.monsters.length = 0; const pl = g.player; pl.x = 200; pl.facing = 1;
      const shot = on => { MP.Input.magnet = on; for (let i = 0; i < 30; i++) g.update(MP.DT); MP.Render.draw(g); const cv = document.getElementById('cv'), k = cv.width / 1280; return cv.getContext('2d').getImageData(Math.round(330 * k), Math.round(480 * k), Math.round(200 * k), Math.round(200 * k)).data; };
      const off = shot(false), on = shot(true); let diff = 0; for (let i = 0; i < on.length; i += 4) diff += Math.abs(on[i] - off[i]) + Math.abs(on[i + 1] - off[i + 1]) + Math.abs(on[i + 2] - off[i + 2]); out.push(Math.round(diff / (on.length / 4))); MP.Input.magnet = false; }
    MP.Save.data.batt = 1; MP.Save.data.coil = 1; MP.App.paused = false; return out; });
  ok('field stays light at every upgrade tier so monsters remain visible (mean pixel change well under the old heavy field)', fieldInk.every(v => v > 15 && v < 95), fieldInk);
  // --- fullscreen on the first input ---
  const fs = await (async () => { const pg = await ctx.newPage(); await pg.addInitScript(() => { window.__forceFs = true; }); await pg.goto(URL); await pg.waitForFunction(() => window.MP && MP.ready, null, { timeout: 20000 }); const before = await pg.evaluate(() => !!document.fullscreenElement); await pg.mouse.click(640, 120); await pg.waitForTimeout(600); const after = await pg.evaluate(() => !!document.fullscreenElement); const setting = await pg.evaluate(() => MP.Save.data.settings.autoFs); await pg.close(); return { before, after, setting }; })();
  ok('game goes fullscreen on the first click (setting on by default)', !fs.before && fs.after && fs.setting === true, fs);
  await G(() => MP.App.startStage(1)); await p.waitForTimeout(300);
  // --- pause ---
  await p.waitForTimeout(1500); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  const t0 = await G(() => MP.game.time); await p.waitForTimeout(400);
  ok('ESC pauses (time stops, pause screen)', await G(() => MP.UI.cur === 'pause') && (await G(() => MP.game.time)) === t0);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  ok('ESC again resumes', await G(() => MP.UI.cur === null) && (await G(() => MP.game.time)) > t0);
  // --- touch: three simultaneous fingers (move + jump + magnet) through real touch events ---
  const cdp = await ctx.newCDPSession(p);
  const centre = async sel => { const r = await p.locator(sel).boundingBox(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 640, y: 300, id: 9 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(150);
  ok('touch controls appear on a touch device', await G(() => document.body.classList.contains('touch') && !document.getElementById('touch').hidden && getComputedStyle(document.getElementById('touch')).display !== 'none'));
  const padBox = await p.locator('[data-pad]').boundingBox(); const pr = { x: padBox.x + padBox.width * 0.75, y: padBox.y + padBox.height * 0.6 }, pl2 = { x: padBox.x + padBox.width * 0.25, y: padBox.y + padBox.height * 0.6 }, pm = await centre('[data-act=magnet]');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...pr, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...pr, id: 1 }, { ...pm, id: 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: pr.x, y: pr.y - padBox.height * 0.6, id: 1 }, { ...pm, id: 2 }] });
  await p.waitForTimeout(200);
  const multi = await G(() => ({ right: MP.Input.right, magnet: MP.Input.magnet, jump: MP.Input.jump, on: MP.game.player.magnet, air: !MP.game.player.onGround, vx: MP.game.player.vx }));
  ok('multi-touch with two fingers: move + push-up jump on the pad while the magnet is held', multi.right && multi.magnet && multi.jump && multi.on && multi.air && multi.vx > 0, multi);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(100);
  ok('all fingers up -> all inputs released', await G(() => !MP.Input.right && !MP.Input.jump && !MP.Input.magnet));
  // one finger lifted while another stays down (per-pointer events; CDP cannot lift a single touch point)
  const ev = (sel, type, id) => p.dispatchEvent(sel, type, { pointerId: id, pointerType: 'touch', bubbles: true, cancelable: true });
  const evp = (type, id, pt) => p.dispatchEvent('[data-pad]', type, { pointerId: id, pointerType: 'touch', bubbles: true, cancelable: true, clientX: pt.x, clientY: pt.y });
  await evp('pointerdown', 21, pr); await ev('[data-act=magnet]', 'pointerdown', 22); await p.waitForTimeout(120);
  await ev('[data-act=magnet]', 'pointerup', 22); await p.waitForTimeout(120);
  ok('lifting only the magnet finger turns the current off, movement continues', await G(() => MP.Input.right && !MP.Input.magnet && !MP.game.player.magnet));
  await evp('pointermove', 21, pl2); await p.waitForTimeout(80);
  ok('sliding the thumb across the move pad switches direction without lifting', await G(() => MP.Input.left && !MP.Input.right));
  // push the thumb up on the move pad = jump (and again after easing back down)
  await G(() => { MP.game.player.inv = 30; MP.Input.jumpEdge = false; }); const upPt = { x: pl2.x, y: pl2.y - padBox.height * 0.6 };
  await evp('pointermove', 21, upPt); await p.waitForTimeout(140);
  const padJump = await G(() => ({ jump: MP.Input.jump, left: MP.Input.left, air: !MP.game.player.onGround, hi: document.querySelector('[data-pad]').classList.contains('pj') }));
  ok('pushing the thumb up on the move pad jumps while still moving', padJump.jump && padJump.left && padJump.air && padJump.hi, padJump);
  await evp('pointermove', 21, pl2); await p.waitForTimeout(900);
  const padDown = await G(() => ({ jump: MP.Input.jump, ground: MP.game.player.onGround, left: MP.Input.left }));
  await evp('pointermove', 21, upPt); await p.waitForTimeout(140);
  ok('easing the thumb back down ends the jump; pushing up again jumps again', !padDown.jump && padDown.left && padDown.ground && await G(() => MP.Input.jump && !MP.game.player.onGround), padDown);
  ok('fullscreen button sits between score and stage; no JUMP button; magnet button keeps its size', await G(() => { const b = document.getElementById('btnFs'), r = b.getBoundingClientRect(), k = MP.App.viewScale; return !b.hidden && r.left / k > 850 && r.right / k < 1030; }) && await G(() => !document.querySelector('[data-act=jump]') && document.querySelectorAll('#touch button').length === 1 && Math.abs(document.querySelector('.mag').getBoundingClientRect().width / parseFloat(getComputedStyle(document.getElementById('touch')).getPropertyValue('--tb')) - 1.2) < 0.03));
  await evp('pointermove', 21, pl2); await p.waitForTimeout(80);
  await evp('pointerup', 21, pl2); await p.waitForTimeout(80);
  ok('second finger up releases movement', await G(() => !MP.Input.right && !MP.Input.left && !MP.Input.jump));
  // --- upgrades: exactly 3 levels each, order rule, MAX lock ---
  const up = await G(() => { const S = MP.Save, d = S.data, log = []; d.mats = 99; log.push(S.canUpgrade('batt').reason); d.mats = 100; log.push(S.upgrade('batt'), d.batt, d.mats); d.mats = 500; log.push(S.canUpgrade('batt').reason); log.push(S.upgrade('coil'), S.upgrade('batt'), S.upgrade('coil'), d.batt, d.coil); log.push(S.canUpgrade('batt').reason, S.upgrade('batt'), S.upgrade('coil'), d.batt, d.coil, d.mats); return log; });
  ok('upgrade needs enough materials; costs are deducted', up[0] === 'mats' && up[1] === true && up[2] === 2 && up[3] === 0, up.slice(0, 4));
  ok('3rd level needs the other part at level 2 first', up[4] === 'balance');
  ok('both parts reach level 3 (3 batteries / 30 turns)', up[8] === 3 && up[9] === 3);
  ok('no upgrade beyond level 3 (MAX)', up[10] === 'max' && up[11] === false && up[12] === false && up[13] === 3 && up[14] === 3 && up[15] === 0, up.slice(10));
  await G(() => MP.UI.upgrade('stages')); await p.waitForTimeout(200);
  ok('upgrade screen shows MAX and no buy buttons', await G(() => document.querySelectorAll('#upgrade .u-btn.max').length === 2 && document.querySelectorAll('#upgrade .u-row.cur').length === 2 && document.querySelectorAll('#upgrade .u-cell b.top').length === 3));
  await p.click('.u-panel.batt .u-btn', { force: true }); await p.waitForTimeout(100);
  ok('pressing MAX does not upgrade further and explains why', await G(() => MP.Save.data.batt === 3 && !document.querySelector('.u-toast').hidden));
  ok('weapon sprite index changes with battery / coil level', await G(() => { const seen = new Set(); for (let b = 1; b <= 3; b++) for (let c = 1; c <= 3; c++) { const cv = document.createElement('canvas'); cv.width = 180; cv.height = 130; MP.Render.drawWeapon(cv, b, c, false); seen.add(cv.toDataURL().length + ':' + cv.toDataURL().slice(-80)); } return seen.size; }) === 9);
  // --- save / restore across a reload ---
  await G(() => { const d = MP.Save.data; d.unlocked = 7; d.cleared = { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true }; d.mats = 42; MP.Save.save(); });
  await boot();
  ok('progress + upgrades restored after reload', await G(() => { const d = MP.Save.data; return d.unlocked === 7 && d.batt === 3 && d.coil === 3 && d.mats === 42 && d.cleared[6] === true; }), await G(() => MP.Save.data));
  await p.click('#menu [data-go=start]', { force: true });
  ok('stage select reflects the restored progress', await G(() => document.querySelectorAll('.sbtn:not(.lock)').length === 7 && document.querySelector('.sbtn.final').classList.contains('lock')));
  // --- screen ratio at different window sizes ---
  for (const [w, h] of [[1024, 768], [1920, 1080], [2048, 1536], [800, 600], [1366, 1024]]) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(120); const r = await p.locator('#stage').boundingBox(); ok(`16:9 kept at ${w}x${h}`, Math.abs(r.width / r.height - 16 / 9) < 0.01 && r.width <= w + 1 && r.height <= h + 1, { w: Math.round(r.width), h: Math.round(r.height), canvas: await G(() => document.getElementById('cv').width + 'x' + document.getElementById('cv').height) }); }
  await p.setViewportSize({ width: 1280, height: 720 });
  // --- frame rate + fixed timestep ---
  await G(() => { MP.Save.data.unlocked = 16; MP.App.startStage(15); }); await p.waitForTimeout(7000);
  const fps = await G(() => MP.App.fps); ok('frame rate ~60 FPS in a busy stage', fps > 50, Math.round(fps));
  const det = await G(() => { const run = step => { MP.App.startStage(1); MP.App.paused = true; const g = MP.game, pl = g.player; for (let i = 0; i < 180; i++) g.update(MP.DT); pl.vy = -885; pl.onGround = false; let top = 625, t = 0; while (t < 1.2) { g.update(MP.DT); t += MP.DT; top = Math.min(top, pl.y); } return Math.round(top); }; const a = run(), b2 = run(); MP.App.paused = false; return [a, b2]; });
  ok('physics is deterministic (fixed 1/120 s step): jump apex identical', det[0] === det[1] && det[0] < 465, det);
  // --- offline: service worker cache then no network ---
  await boot(); await p.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.ready.then(() => true), null, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(4000); await ctx.setOffline(true);
  let offOK = false; try { await boot(); offOK = await G(() => MP.ready === true && Object.values(MP.Assets.img).every(i => (i.naturalWidth || i.width) > 0)); } catch (e) { offOK = false; }
  ok('runs with the network offline after first load (service worker cache)', offOK); await ctx.setOffline(false);
  // --- a new release replaces what an installed (older) service worker had cached ---
  const fresh = await (async () => { await boot(); await p.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 15000 }).catch(() => {});
    const r = await G(async () => { const keys = await caches.keys(); const urls = [...document.scripts].map(s2 => s2.getAttribute('src')).filter(Boolean); return { ver: MP.VERSION, keys, stamped: urls.every(u => u.includes('?v=' + MP.VERSION)), css: document.querySelector('link[rel=stylesheet]').getAttribute('href').includes('?v=' + MP.VERSION), img: MP.Assets.src('hero').includes('?v=' + MP.VERSION) }; });
    // put a fake stale file into the cache: an online request must still return the real, current file (network first)
    r.networkFirst = await G(async () => { const c = await caches.open((await caches.keys())[0]); await c.put(new URL('js/config.js', location.href).href, new Response('STALE', { headers: { 'content-type': 'text/javascript' } })); const t = await (await fetch('js/config.js?v=' + MP.VERSION)).text(); return !t.startsWith('STALE') && t.includes('MP.VERSION'); });
    return r; })();
  ok('file URLs carry the version; the service worker serves the newest files when online (cache is only the offline fallback)', fresh.ver >= 8 && fresh.keys.length === 1 && fresh.keys[0] === 'magnetpop-v' + fresh.ver && fresh.stamped && fresh.css && fresh.img && fresh.networkFirst, fresh);
  ok('no runtime errors during the whole session', errs.length === 0, errs.slice(0, 5));
  const fail = results.filter(r => !r.pass); console.log(`\n${results.length - fail.length}/${results.length} passed`);
  await b.close(); process.exit(fail.length ? 1 : 0);
})();
