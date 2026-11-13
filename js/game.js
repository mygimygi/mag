// MAGNET POP - game logic (no drawing here; see render.js)
(function () {
  const MP = window.MP, W = MP.W, G = MP.GROUND;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), sign = v => (v < 0 ? -1 : v > 0 ? 1 : 0), rand = Math.random;
  const sfx = n => MP.Audio.sfx(n);
  MP.util = { clamp, sign };

  // ---------- platforms ----------
  // kinds: solid | vanish (cloud that fades in/out) | crumble (wooden bridge that drops after the hero steps on it)
  //        spring (bouncy pad) | conveyor (belt carries whatever stands on it). Any kind may also move.
  class Platform {
    constructor(d, theme) {
      this.x = this.bx = d.x; this.y = this.by = d.y; this.w = d.w; this.move = d.move; this.ground = !!d.ground; this.dx = 0; this.dy = 0; this.t = 0; this.theme = theme;
      this.belt = d.belt || 0; this.kind = d.kind || (this.belt ? 'conveyor' : 'solid'); this.o = d; this.active = true; this.alpha = 1; this.state = 'on'; this.st = 0; this.oy = 0; this.bounceT = 0;
    }
    update(dt) {
      this.t += dt; this.bounceT -= dt;
      if (this.move) {
        const m = this.move, k = (1 - Math.cos(this.t / m.period * 2 * Math.PI)) / 2;
        const nx = this.bx + (m.ax === 'x' ? m.range * k : 0), ny = this.by + (m.ax === 'y' ? m.range * k : 0);
        this.dx = nx - this.x; this.dy = ny - this.y; this.x = nx; this.y = ny;
      }
      if (this.kind === 'vanish') {
        const on = this.o.on || 3.2, off = this.o.off || 1.8, t = (this.t + (this.o.phase || 0)) % (on + off);
        if (t < on) { const left = on - t; this.active = true; this.alpha = left < 0.9 ? (Math.floor(left * 9) % 2 ? 0.35 : 0.85) : Math.min(1, 0.25 + t * 4); }
        else { this.active = false; this.alpha = 0; }
      } else if (this.kind === 'crumble') {
        this.st += dt;
        if (this.state === 'shake' && this.st > 0.6) { this.state = 'fall'; this.st = 0; this.active = false; }
        else if (this.state === 'fall') { this.oy += (200 + this.st * 900) * dt; this.alpha = Math.max(0, 1 - this.st * 1.6); if (this.st > 3.4) { this.state = 'in'; this.st = 0; this.oy = 0; } }
        else if (this.state === 'in') { this.alpha = Math.min(1, this.st * 3); if (this.st > 0.35) { this.state = 'on'; this.active = true; this.alpha = 1; } }
      }
    }
    step() { if (this.kind === 'crumble' && this.state === 'on') { this.state = 'shake'; this.st = 0; } }
  }
  // shared body physics: gravity, walls, landing on ground / one-way platforms, riding moving platforms
  function physics(b, dt, world, gScale) {
    if (b.plat) { b.x += b.plat.dx + b.plat.belt * dt; b.y += b.plat.dy; }
    const prevY = b.y;
    b.vy = Math.min(1500, b.vy + 2200 * dt * (gScale == null ? 1 : gScale));
    b.x += b.vx * dt; b.y += b.vy * dt;
    const minX = b.hw, maxX = (b.maxX || W) - b.hw; b.hitWall = 0;
    if (b.x < minX) { b.x = minX; b.hitWall = -1; } else if (b.x > maxX) { b.x = maxX; b.hitWall = 1; }
    let land = null;
    if (b.vy >= 0) for (const p of world.plats) {
      if (!p.active || (b.dropT > 0 && !p.ground)) continue;
      if (b.x > p.x - b.hw * 0.4 && b.x < p.x + p.w + b.hw * 0.4 && prevY <= Math.max(p.y, p.y - p.dy) + 0.5 && b.y >= p.y && (!land || p.y < land.y)) land = p;
    }
    const was = b.onGround;
    if (land && land.kind === 'spring') { b.y = land.y; b.vy = b.isPlayer ? -1150 : -780; b.onGround = false; b.plat = null; b.justLanded = false; b.sprung = true; land.bounceT = 0.3; }
    else if (land) { b.y = land.y; b.vy = 0; b.onGround = true; b.plat = land; b.justLanded = !was; }
    else { b.onGround = false; b.plat = null; b.justLanded = false; }
  }
  MP.physics = physics;

  // ---------- monsters ----------
  class Monster {
    constructor(type, x, y, o) {
      this.type = type; this.def = MP.MON[type]; this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.hw = this.def.w / 2; this.h = this.def.h;
      this.dir = x < W / 2 ? 1 : -1; this.state = 'spawn'; this.t = 0; this.hp = this.def.hp; this.aiT = 1 + rand() * 2; this.anim = 'idle'; this.animT = rand();
      this.rot = 0; this.pv = 0; this.inField = false; this.nopeT = 0; this.anchor = this.def.anchor || 0; this.fly = this.def.ai === 'fly'; this.homeY = y; this.flash = 0;
      this.drop = this.def.drop; this.onGround = false; this.plat = null; this.fallOK = 0;
      Object.assign(this, o || {});
    }
    get cy() { return this.y - this.h / 2; }
    get harmful() { return !this.def.part && (this.state === 'live' || this.state === 'hurt'); }
    walk(speed) {
      if (!this.onGround) return;
      this.fallOK -= MP.DT;
      if (this.hitWall) this.dir = -this.hitWall;
      this.chaseT = (this.chaseT || 1.5) - MP.DT; if (this.chaseT <= 0) { this.chaseT = 1.4 + rand() * 1.6; if (rand() < 0.6 && MP.game) this.dir = sign(MP.game.player.x - this.x) || this.dir; }
      const p = this.plat;
      if (p && !p.ground && this.fallOK <= 0) {
        const ahead = this.x + this.dir * (this.hw * 0.5 + 6);
        if (ahead < p.x || ahead > p.x + p.w) { if (rand() < 0.68) this.dir *= -1; else this.fallOK = 1.2; }
      }
      this.vx = this.dir * speed; this.anim = 'move';
    }
    ai(dt, g) {
      const d = this.def, pl = g.player; this.aiT -= dt;
      const toP = sign(pl.x - this.x) || 1;
      switch (d.ai) {
        case 'walk': this.walk(d.speed * g.speedMul); break;
        case 'jumper':
          this.walk(d.speed * g.speedMul);
          if (this.onGround && this.aiT <= 0) { this.aiT = 1.1 + rand() * 1.6; if (pl.y < this.y - 60 && rand() < 0.75) { this.vy = -900; this.onGround = false; } else if (rand() < 0.4) this.dir = toP; }
          if (!this.onGround) this.anim = 'jump';
          break;
        case 'hop':
          if (this.onGround) {
            this.vx = 0; this.anim = 'idle';
            if (this.aiT <= 0) { this.aiT = 0.45 + rand() * 0.75; if (rand() < 0.65) this.dir = toP; const high = pl.y < this.y - 60 && rand() < 0.6; this.vy = high ? -900 : -560; this.vx = this.dir * d.speed * g.speedMul * (high ? 0.7 : 1.2); this.onGround = false; }
          } else { this.anim = 'jump'; if (this.hitWall) { this.dir = -this.hitWall; this.vx = this.dir * Math.abs(this.vx); } }
          break;
        case 'dash': case 'charger': {
          const fast = d.ai === 'dash' ? 430 : 340, wind = d.ai === 'dash' ? 0.4 : 0.6, dur = d.ai === 'dash' ? 0.9 : 1.3;
          if (this.dashT > 0) { this.dashT -= dt; this.vx = this.dir * fast * g.speedMul; this.anim = 'attack'; if (this.hitWall) { this.dir = -this.hitWall; this.dashT = 0; } }
          else if (this.windT > 0) { this.windT -= dt; this.vx = 0; this.anim = 'attack'; this.animT = 0; if (this.windT <= 0) this.dashT = dur; }
          else { this.walk(d.speed * g.speedMul); if (this.onGround && this.aiT <= 0 && Math.abs(pl.y - this.y) < 50 && Math.abs(pl.x - this.x) < 480) { this.dir = toP; this.windT = wind; this.aiT = 1.6 + rand() * 1.4; this.bang = wind; } }
          break; }
        case 'thrower':
          if (this.atkT > 0) {
            this.atkT -= dt; this.vx = 0; this.anim = 'attack';
            if (this.atkT <= 0.3 && !this.thrown) { this.thrown = true; const T = 0.95, dx = pl.x - this.x, dy = (pl.y - 50) - (this.y - 90); g.hazards.push({ kind: 'scrap', x: this.x + this.dir * 40, y: this.y - 90, w: 36, h: 36, vx: clamp(dx / T, -600, 600), vy: dy / T - 0.5 * 1500 * T, g: 1500, life: 3, rot: 0 }); sfx('shoot'); }
            if (this.atkT <= 0) this.thrown = false;
          } else { this.walk(d.speed * g.speedMul); if (this.onGround && this.aiT <= 0 && Math.abs(pl.x - this.x) < 760) { this.aiT = 1.9 + rand() * 1.3; this.atkT = 0.7; this.animT = 0; this.dir = toP; } }
          break;
        case 'fly': {
          let ty = this.homeY + Math.sin(this.t * 2.2) * 26, tvx = this.dir * d.speed * g.speedMul;
          if (this.swT > 0) { this.swT -= dt; if (this.swT > 1.0) { ty = this.swY; tvx = clamp((this.swX - this.x) * 3.4, -430, 430); this.anim = 'attack'; } }
          else if (this.aiT <= 0) { this.aiT = 2.2 + rand() * 1.8; this.swT = 1.9; this.swX = pl.x; this.swY = pl.y - 30; this.dir = toP; }
          if (!(this.swT > 1.0)) this.anim = 'move';
          this.vx += (tvx - this.vx) * Math.min(1, dt * 4); this.vy = (ty - this.y) * 3.2;
          this.x += this.vx * dt; this.y += this.vy * dt;
          if (this.x < 50) { this.x = 50; this.dir = 1; } else if (this.x > W - 50) { this.x = W - 50; this.dir = -1; }
          break; }
        case 'static': this.anim = 'idle'; this.vx = 0; if (!this.freed) this.vy = 0; break;
      }
    }
    update(dt, g) {
      this.t += dt; this.animT += dt; this.flash -= dt; this.nopeT -= dt; if (this.bang > 0) this.bang -= dt; if (this.shakeT > 0) this.shakeT -= dt;
      const st = this.state, world = g.world, phys = !(this.def.ai === 'static' && !this.freed);
      if (st === 'spawn') { if (!this.fly && phys) physics(this, dt, world); if (this.t > 0.8) { this.state = 'live'; this.t = 0; } return; }
      if (st === 'resist') {            // digs in for a moment before the magnet wins
        this.anim = 'hurt';
        if (!this.inField) { this.state = 'live'; this.t = 0; }
        else if (this.fly) { this.x += this.resDir * 26 * dt; }
        else { this.vx = this.resDir * 26; physics(this, dt, world); }
        this.inField = false; return;
      }
      if (st === 'pulled') {
        if (!this.inField) { this.state = 'stun'; this.t = 0; this.pv = 0; this.vx *= 0.3; this.vy = Math.min(this.vy, 0); this.plat = null; }
        else { this.x += this.vx * dt; this.y += this.vy * dt; this.rot += dt * 9 * (this.vx < 0 ? -1 : 1); this.anim = 'pulled'; }
        this.inField = false; return;
      }
      if (st === 'stun') {
        this.anim = 'hurt'; this.vx *= Math.pow(0.02, dt); physics(this, dt, world); this.rot *= Math.pow(0.001, dt);
        if (this.t > 1.2 && (this.onGround || this.fly)) { this.state = 'live'; this.t = 0; this.rot = 0; if (this.fly) this.homeY = clamp(this.y - 220, 150, 330); }
        return;
      }
      if (st === 'hurt') { this.anim = 'hurt'; if (this.fly) { this.x += this.vx * dt; this.vx *= Math.pow(0.02, dt); } else physics(this, dt, world); if (this.t > 0.45) { this.state = 'live'; this.t = 0; } return; }
      if (st === 'ko') { this.anim = 'ko'; this.vy += 1700 * dt; this.x += this.vx * dt; this.y += this.vy * dt; this.rot += dt * 13 * sign(this.vx || 1); if (this.y > 860 || this.x < -140 || this.x > W + 140 || this.t > 2.5) this.dead = true; return; }
      this.ai(dt, g);
      if (!this.fly && phys) physics(this, dt, world);
    }
  }
  MP.Monster = Monster;

  // ---------- the game ----------
  class Game {
    constructor() { this.buff = { shield: 0, boots: 0, magnet: 0 }; this.maxHearts = MP.HEARTS; this.state = 'idle'; this.stage = 0; this.monsters = []; this.projectiles = []; this.hazards = []; this.fx = []; this.world = { plats: [] }; this.player = this.newPlayer(); this.time = 0; }
    newPlayer() {
      return { x: 200, y: G, vx: 0, vy: 0, hw: 20, h: 100, facing: 1, onGround: true, plat: null, dropT: 0, magnet: false, held: [], hp: MP.HEARTS, isPlayer: true, inv: 0, hurtT: 0, shootT: 0, absorbT: 0, landT: 0, jumpBuf: 0, coyote: 0, anim: 'idle', animT: 0, frame: 0, dead: false, win: false, jumping: false };
    }
    start(n) {
      const s = MP.STAGES[n], sv = MP.Save.data; this.stage = n; this.def = s; this.theme = MP.THEME[s.world];
      this.stat = MP.stats(sv.batt, sv.coil); this.batt = sv.batt; this.coil = sv.coil;
      this.world = { plats: [new Platform({ x: -200, y: G, w: W + 400, ground: true }, this.theme)].concat(s.plats.map(p => new Platform(p, this.theme))) };
      this.monsters = []; this.projectiles = []; this.hazards = []; this.fx = []; this.player = this.newPlayer();
      if (s.boss === 'titan') this.player.maxX = 830;
      // items bought in the shop are used up by this stage
      const it = sv.items || {}; this.maxHearts = MP.HEARTS + (it.heart ? 1 : 0); this.player.hp = this.maxHearts;
      this.buff = { shield: it.shield ? MP.ITEMS.shield.dur : 0, boots: it.boots ? MP.ITEMS.boots.dur : 0, magnet: it.magnet ? MP.ITEMS.magnet.dur : 0 };
      this.usedItems = Object.keys(it); if (this.usedItems.length) { sv.items = {}; MP.Save.save(); }
      this.score = 0; this.mats = 0; this.combo = 0; this.time = 0; this.t = 0; this.state = 'intro'; this.wave = -1; this.queue = []; this.waveGap = 0.4; this.boss = null; this.bossSpawned = false;
      this.dropAcc = 0; this.dropGiven = 0; this.hint = ''; this.hintT = 0; this.tut = s.tutorial ? 0 : -1; this.shake = 0; this.windX = 0; this.banner = { text: 'STAGE ' + n, sub: s.name, t: 0, dur: 2.0 }; this.nopeSeen = false; this.kills = 0;
      this.assist = Math.min(3, (MP.fails && MP.fails[n]) || 0);                 // each failed try slows the monsters a little (max -15%)
      this.shieldHit = 0;
      this.speedMul = (1 + (n - 1) * 0.03) * (1 - this.assist * 0.05); this.nozzle = { x: 318, y: G - 42 }; this.result = null;
      MP.Input.jumpEdge = false; MP.Audio.hum(false);
      MP.Audio.music(s.bgm);
      if (n === 10) this.say('전자석을 강화하면 더 멀리, 더 세게 끌어당겨요!', 5);
      if (s.materials) this.say('철이 아닌 물체는 전자석에 끌려올까요? 직접 확인해 봐요!', 5);
    }
    say(text, dur) { this.hint = text; this.hintT = dur || 4; }
    addFx(o) { o.t = 0; this.fx.push(o); return o; }
    spawn(type, x, y, o) { const m = new Monster(type, x, y, o); if (this.def.noMats) m.drop = 0; this.monsters.push(m); this.addFx({ kind: 'puff', x, y: y - m.h / 2, dur: 0.4, s: 1.2 }); sfx('spawn'); return m; }
    addScore(v, x, y) { this.score += v; if (x != null) this.addFx({ kind: 'text', text: '+' + v, x, y, dur: 0.8 }); }
    addMats(n, x, y) { if (n <= 0) return; this.mats += n; for (let i = 0; i < Math.min(n, 4); i++) this.addFx({ kind: 'bolt', x: x + (rand() - .5) * 40, y: y + (rand() - .5) * 30, dur: 0.7 + i * 0.08 }); sfx('coin'); }

    // called when a monster is destroyed for good (knocked out or popped from the magnet bundle)
    defeated(type, drop, x, y, mult) { const d = MP.MON[type]; this.kills++; this.addScore(d.score * (mult || 1), x, y - 30); this.addMats(drop, x, y); }
    ko(m, dir, mult) {
      m.state = 'ko'; m.t = 0; m.vx = dir * (380 + rand() * 140) * this.stat.shot; m.vy = -640; m.plat = null;
      this.addFx({ kind: 'hit', x: m.x, y: m.cy, dur: 0.25 }); sfx('defeat'); this.defeated(m.type, m.drop, m.x, m.cy, mult);
    }

    update(dt) {
      this.time += dt; this.t += dt; const pl = this.player;
      if (this.shieldHit > 0) this.shieldHit -= dt;
      if (this.shake > 0) this.shake -= dt; if (this.hintT > 0) this.hintT -= dt; if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.dur) this.banner = null; }
      for (const p of this.world.plats) p.update(dt);
      if (this.state === 'intro' && this.t > 1.4) { this.state = 'play'; this.t = 0; }
      if (this.state === 'play') for (const k in this.buff) if (this.buff[k] > 0) { this.buff[k] -= dt; if (this.buff[k] <= 0) { this.buff[k] = 0; sfx('nope'); } }
      this.updatePlayer(dt);
      this.nozzle.x = pl.x + pl.facing * 118; this.nozzle.y = pl.y - 42;
      if (this.state === 'play') this.magnetStep(dt);
      for (const m of this.monsters) m.update(dt, this);
      this.updateProjectiles(dt); this.updateHazards(dt);
      if (this.boss) this.boss.update(dt, this);
      if (this.state === 'play') { this.touchCheck(); this.director(dt); this.tutorial(); }
      this.monsters = this.monsters.filter(m => !m.dead);
      for (const f of this.fx) f.t += dt; this.fx = this.fx.filter(f => f.t < f.dur);
      if (this.state === 'clear' && this.t > 2.8 && !this.result) this.finish();
      if (this.state === 'dying' && this.t > 2.2) { this.state = 'over'; MP.Audio.hum(false); if (MP.onGameOver) MP.onGameOver(this); }
    }

    updatePlayer(dt) {
      const I = MP.Input, p = this.player;
      p.inv -= dt; p.hurtT -= dt; p.shootT -= dt; p.absorbT -= dt; p.landT -= dt; p.dropT -= dt; p.jumpBuf -= dt; p.animT += dt;
      if (p.dead || this.state === 'clear' || this.state === 'over') {
        p.vx *= Math.pow(0.001, dt); if (p.magnet) { p.magnet = false; MP.Audio.hum(false); }
        physics(p, dt, this.world); this.animate(p, dt); return;
      }
      const ctl = p.hurtT <= 0 && this.state === 'play';
      let mv = 0; if (ctl) { if (I.left) mv -= 1; if (I.right) mv += 1; }
      const want = ctl && I.magnet;
      if (want && !p.magnet) { p.magnet = true; sfx('magnetOn'); MP.Audio.hum(true); }
      else if (!want && p.magnet) { p.magnet = false; MP.Audio.hum(false); this.release(); }
      if (mv) p.facing = mv;
      const boost = this.buff.boots > 0 ? 1.45 : 1, max = (p.magnet ? 115 : 275) * boost, target = mv * max, acc = (p.onGround ? 2000 : 1400) * boost * dt;
      if (boost > 1 && p.onGround && Math.abs(p.vx) > 250 && Math.floor(this.time * 12) !== Math.floor((this.time - dt) * 12)) this.addFx({ kind: 'puff', x: p.x - p.facing * 20, y: p.y - 6, dur: 0.28, s: 0.5 });
      if (p.hurtT > 0) p.vx *= Math.pow(0.05, dt); else p.vx = Math.abs(target - p.vx) <= acc ? target : p.vx + sign(target - p.vx) * acc;
      if (I.jumpEdge) { I.jumpEdge = false; if (ctl) p.jumpBuf = 0.13; }
      if (I.padUp && ctl && p.onGround) p.jumpBuf = 0.13;          // joystick held up: jump again as soon as the hero lands
      p.coyote = p.onGround ? 0.09 : p.coyote - dt;
      if (p.jumpBuf > 0 && p.coyote > 0) {
        p.jumpBuf = 0; p.coyote = 0;
        if (I.down && p.plat && !p.plat.ground) { p.dropT = 0.22; p.onGround = false; p.plat = null; }
        else { p.vy = -MP.JUMP; p.onGround = false; p.plat = null; p.jumping = true; sfx('jump'); this.addFx({ kind: 'puff', x: p.x, y: p.y - 6, dur: 0.3, s: 0.7 }); }
      }
      if (p.jumping && !I.jump && p.vy < -320) p.vy = -320;      // short hop when the button is released early
      if (p.vy >= 0) p.jumping = false;
      if (this.windX) p.x += this.windX * dt;
      physics(p, dt, this.world);
      if (p.sprung) { p.sprung = false; p.jumping = false; sfx('jump'); this.addFx({ kind: 'puff', x: p.x, y: p.y - 4, dur: 0.3, s: 0.9 }); }
      if (p.plat && p.plat.kind === 'crumble') p.plat.step();
      if (p.justLanded) { p.landT = 0.13; sfx('land'); this.addFx({ kind: 'puff', x: p.x, y: p.y - 4, dur: 0.3, s: 0.8 }); }
      this.animate(p, dt);
    }
    animate(p) {
      const H = MP.SPR.hero.anims; let a = 'idle', fr = 0; const t = p.animT;
      const loop = (name, fps) => { a = name; fr = Math.floor(t * fps) % H[name][1]; };
      const once = (name, k) => { a = name; fr = Math.min(H[name][1] - 1, Math.floor(k * H[name][1])); };
      if (p.dead) once('death', (this.t) / 0.7);
      else if (p.win) loop('victory', 9);
      else if (p.hurtT > 0) once('hurt', 1 - p.hurtT / 0.45);
      else if (p.shootT > 0) once('shoot', 1 - p.shootT / 0.3);
      else if (p.magnet) { if (p.absorbT > 0) once('absorb', 1 - p.absorbT / 0.22); else loop('magnet', 18); }
      else if (!p.onGround) { a = 'jump'; fr = p.vy < 0 ? 0 : 1; }
      else if (p.landT > 0) once('land', 1 - p.landT / 0.13);
      else if (Math.abs(p.vx) > 180) loop('run', 15);
      else if (Math.abs(p.vx) > 25) loop('walk', 12);
      else loop('idle', 6);
      p.anim = a; p.frame = H[a][0] + fr;
    }

    // ---- electromagnet: current ON -> magnetic field in front of the pole pulls iron monsters ----
    get range() { return this.stat.range * (this.buff.magnet > 0 ? 1.5 : 1); }       // super magnet item widens the field
    inField(x, y) { const pl = this.player, big = this.buff.magnet > 0, dx = (x - this.nozzle.x) * pl.facing, dy = y - this.nozzle.y; return dx > -34 && dx < this.range && Math.abs(dy) < (big ? 70 : 48) + Math.max(0, dx) * (big ? 0.36 : 0.3); }
    magnetStep(dt) {
      const pl = this.player; if (!pl.magnet) return;
      let load = pl.held.length; for (const m of this.monsters) if (m.state === 'pulled' || m.state === 'resist') load++;
      for (const m of this.monsters) {
        if (m.state === 'ko' || m.state === 'spawn' || m.dead) continue;
        if (!this.inField(m.x, m.cy)) continue;
        if (!m.def.iron) { // wood / plastic / aluminium do not react to the electromagnet
          if (m.nopeT <= 0 && !this.nopeSeen) { this.nopeSeen = true; this.say({ wood: '나무는', plastic: '플라스틱은', alu: '알루미늄은' }[m.type] + ' 전자석에 끌려오지 않아요! 철 몬스터를 발사해서 물리쳐요.', 6); sfx('nope'); }
          else if (m.nopeT <= -1.5) sfx('nope');
          m.nopeT = 0.4; continue;
        }
        if (m.anchor > 0) { m.anchor -= dt * this.stat.pull; m.shakeT = 0.1; if (m.anchor <= 0) { m.freed = true; this.addFx({ kind: 'hit', x: m.x, y: m.cy, dur: 0.25 }); sfx('clang'); } continue; }
        if (m.state === 'resist') {   // struggling against the field: skids slowly toward the magnet, then gets yanked in
          m.inField = true; m.resT -= dt; m.resDir = sign(this.nozzle.x - m.x) || 1;
          if (Math.floor(m.resT * 9) !== Math.floor((m.resT + dt) * 9) && !m.fly) this.addFx({ kind: 'puff', x: m.x - m.resDir * m.hw * 0.6, y: m.y - 4, dur: 0.25, s: 0.45 });
          if (m.resT > 0) continue;
          m.state = 'pulled'; m.pv = 120; m.t = 0; m.plat = null; m.onGround = false; m.freed = true; sfx('magnetOn');
        } else if (m.state !== 'pulled') {
          if (load >= MP.HOLD_MAX) continue; load++; m.windT = m.dashT = m.atkT = m.swT = 0; m.freed = true;
          if (m.state === 'stun' || m.def.part) { m.state = 'pulled'; m.pv = 60; m.t = 0; m.plat = null; m.onGround = false; }
          else { m.state = 'resist'; m.t = 0; m.vx = 0; m.resT = (0.3 + 0.2 * m.def.weight) / Math.sqrt(this.stat.pull); m.resDir = sign(this.nozzle.x - m.x) || 1; m.inField = true; continue; }
        }
        m.inField = true;
        const tx = this.nozzle.x + pl.facing * 10 - m.x, ty = this.nozzle.y + m.h * 0.3 - m.y, dist = Math.hypot(tx, ty) || 1;
        m.pv = Math.min(980, m.pv + 1500 * this.stat.pull / m.def.weight * dt);
        m.vx = tx / dist * m.pv + pl.vx; m.vy = ty / dist * m.pv; m.pullDist = dist;
        if (dist < 30) this.absorb(m);
      }
    }
    absorb(m) {
      if (m.dead || m.absorbed) return;                 // a monster can only be absorbed once
      m.absorbed = true; m.dead = true; const pl = this.player;
      pl.held.push({ type: m.type, drop: m.drop }); pl.absorbT = 0.22; pl.animT = 0;
      this.addFx({ kind: 'flash', x: this.nozzle.x, y: this.nozzle.y, dur: 0.18 }); sfx('absorb');
      if (m.onAbsorb) m.onAbsorb(this);
    }
    // current OFF -> the magnetic field collapses and everything held is launched forward
    release() {
      const pl = this.player; if (!pl.held.length || pl.dead) return;
      const n = pl.held.length, st = this.stat;
      this.projectiles.push({ x: this.nozzle.x, y: this.nozzle.y, vx: pl.facing * (600 + 90 * st.shot), items: pl.held, n, r: 22 + n * 6, dmg: n + st.shotBonus, life: 2.4, bounces: 0, hit: new Set(), rot: 0, combo: 0 });
      pl.held = []; pl.shootT = 0.3; pl.vx -= pl.facing * 120; this.shots = (this.shots || 0) + 1;
      this.addFx({ kind: 'flash', x: this.nozzle.x, y: this.nozzle.y, dur: 0.16 }); sfx('shoot');
    }
    // choose where a monster appears: on the ground or a steady platform, never right next to the hero
    pickSlot(type) {
      const pl = this.player, d = MP.MON[type], maxX = (pl.maxX || W) - 60, heavy = d.weight > 2, far = x => Math.abs(x - pl.x) > 300;
      if (d.ai === 'fly') { let x = 0; for (let i = 0; i < 12; i++) { x = 120 + rand() * (maxX - 180); if (far(x)) break; } return { x, y: 170 + rand() * 80 }; }
      const c = [];
      for (const p of this.world.plats) {
        if (!p.ground && (p.kind === 'vanish' || p.kind === 'crumble' || p.kind === 'spring' || (heavy && (p.move || p.w < 288)))) continue;
        for (let x = Math.max(70, p.x + 50); x <= Math.min(maxX, p.x + p.w - 50); x += 64) {
          if (!far(x) && Math.abs(p.y - pl.y) < 210) continue;
          if (this.monsters.some(m => m.state === 'spawn' && Math.abs(m.x - x) < 90 && Math.abs(m.y - p.y) < 60)) continue;
          c.push({ x, y: p.y });
        }
      }
      if (!c.length) return { x: pl.x < W / 2 ? maxX - 40 : 100, y: G };
      return c[Math.floor(rand() * c.length)];
    }
    pop(pr) {
      if (pr.dead) return; pr.dead = true;
      this.addFx({ kind: 'puff', x: pr.x, y: pr.y, dur: 0.4, s: 1 + pr.n * 0.25 });
      pr.items.forEach((it, i) => this.defeated(it.type, it.drop, pr.x + (i - pr.n / 2) * 18, pr.y, 1));
      sfx('defeat');
    }
    updateProjectiles(dt) {
      for (const pr of this.projectiles) {
        pr.x += pr.vx * dt; pr.rot += dt * 14 * sign(pr.vx); pr.life -= dt;
        if (pr.x < pr.r || pr.x > W - pr.r) { pr.bounces++; pr.x = clamp(pr.x, pr.r, W - pr.r); pr.vx = -pr.vx; sfx('clang'); if (pr.bounces >= 2) this.pop(pr); }
        if (pr.life <= 0) this.pop(pr);
        if (pr.dead) continue;
        if (this.boss) { const r = this.boss.hitBy(pr, this); if (r) { this.pop(pr); continue; } }
        for (const m of this.monsters) {
          if (m.dead || m.state === 'ko' || m.state === 'pulled' || pr.hit.has(m)) continue;
          if (Math.abs(m.x - pr.x) < m.hw + pr.r && Math.abs(m.cy - pr.y) < m.h / 2 + pr.r) {
            pr.hit.add(m);
            if (m.def.part) { sfx('clang'); this.addFx({ kind: 'hit', x: pr.x, y: pr.y, dur: 0.2 }); this.pop(pr); break; }
            m.hp -= pr.dmg; this.shake = 0.12;
            if (m.hp <= 0) { pr.combo++; this.ko(m, sign(pr.vx), pr.combo); }
            else { m.state = 'hurt'; m.t = 0; m.flash = 0.3; m.vx = sign(pr.vx) * 260; m.vy = -300; m.onGround = false; m.plat = null; sfx('hit'); this.addFx({ kind: 'hit', x: pr.x, y: pr.y, dur: 0.2 }); this.pop(pr); break; }
          }
        }
      }
      this.projectiles = this.projectiles.filter(p => !p.dead);
    }
    updateHazards(dt) {
      const pl = this.player;
      for (const h of this.hazards) {
        h.life -= dt; if (h.g) h.vy += h.g * dt; h.x += h.vx * dt; h.y += (h.vy || 0) * dt; h.rot = (h.rot || 0) + dt * 8; h.t = (h.t || 0) + dt;
        if (h.g && h.y > G - (h.kind === 'fist' ? 40 : 10)) { h.dead = true; this.addFx({ kind: 'puff', x: h.x, y: G - 10, dur: 0.3, s: 0.7 }); if (h.kind === 'fist') { this.shake = 0.25; sfx('slam'); this.addFx({ kind: 'puff', x: h.x - 50, y: G - 8, dur: 0.35, s: 1 }); this.addFx({ kind: 'puff', x: h.x + 50, y: G - 8, dur: 0.35, s: 1 }); } }
        if (h.life <= 0 || h.x < -80 || h.x > W + 80) h.dead = true;
        if (!h.dead && Math.abs(h.x - pl.x) < h.w / 2 + pl.hw - 4 && h.y - h.h / 2 < pl.y && h.y + h.h / 2 > pl.y - pl.h + 14) { this.hurt(h.x); if (h.kind === 'scrap') h.dead = true; }
      }
      this.hazards = this.hazards.filter(h => !h.dead);
    }
    touchCheck() {
      const pl = this.player; if (pl.inv > 0) return;
      for (const m of this.monsters) if (m.harmful && Math.abs(m.x - pl.x) < m.hw + pl.hw - 10 && m.y - m.h + 10 < pl.y && m.y > pl.y - pl.h + 12) { this.hurt(m.x); break; }
    }
    hurt(fromX) {
      const p = this.player; if (p.inv > 0 || p.dead || this.state !== 'play') return;
      if (this.buff.shield > 0) { p.inv = 0.6; this.shieldHit = 0.3; sfx('clang'); this.addFx({ kind: 'hit', x: (p.x + fromX) / 2, y: p.y - 55, dur: 0.22 }); return; }     // electro shield blocks the hit
      p.hp--; p.inv = 2; p.hurtT = 0.45; p.vx = (p.x < fromX ? -1 : 1) * 280; p.vy = -430; p.onGround = false; p.plat = null; p.jumping = false; this.shake = 0.2; sfx('hurt'); if (MP.haptic) MP.haptic(70);
      if (p.hp <= 0) { MP.fails = MP.fails || {}; MP.fails[this.stage] = (MP.fails[this.stage] || 0) + 1; p.dead = true; p.inv = 99; this.state = 'dying'; this.t = 0; MP.Audio.music(null); MP.Audio.hum(false); p.magnet = false; sfx('gameover'); }
    }

    // ---- waves, boss arrival, clear ----
    director(dt) {
      const s = this.def;
      for (const q of this.queue) if (!q.done && this.t >= q.at) { q.done = true; const sl = this.pickSlot(q.t); const m = this.spawn(q.t, sl.x, sl.y); if (!s.noMats) { this.dropAcc += MP.MON[q.t].drop * s.dropScale; m.drop = Math.floor(this.dropAcc + 1e-6) - this.dropGiven; this.dropGiven += m.drop; } }
      const queued = this.queue.some(q => !q.done);
      const busy = queued || this.monsters.length || this.player.held.length || this.projectiles.length;
      if (this.boss) { if (this.boss.done) this.clear(); return; }
      // materials stage: never leave the player without iron ammunition while non-magnetic monsters remain
      if (s.materials && !queued && this.monsters.length && !this.player.held.length && !this.projectiles.length && !this.monsters.some(m => m.def.iron)) {
        this.supplyT = (this.supplyT || 0) + dt; if (this.supplyT > 1.5) { this.supplyT = 0; this.spawn('ball', 200 + rand() * 880, -30, { drop: 0 }); this.say('철구가 도착했어요! 철구를 흡수해서 발사해요.', 4); }
      } else this.supplyT = 0;
      if (busy) { this.waveGap = 0.9; return; }
      this.waveGap -= dt; if (this.waveGap > 0) return;
      if (this.wave + 1 < s.waves.length) { this.wave++; this.queue = s.waves[this.wave].map((t, i) => ({ t, at: this.t + i * 0.35, done: false })); }
      else if (s.boss && !this.bossSpawned) { this.bossSpawned = true; this.boss = s.boss === 'king' ? new MP.King(this) : new MP.Titan(this); this.banner = { text: 'WARNING!', sub: s.boss === 'king' ? '컴퍼스 킹 등장!' : '마그넷 타이탄 등장!', t: 0, dur: 2.2, warn: true }; sfx('bossIn'); MP.Audio.music('BOSS'); }
      else this.clear();
    }
    clear() {
      if (this.state !== 'play') return;
      this.state = 'clear'; this.t = 0; const p = this.player; p.win = true; p.animT = 0; p.inv = 99; this.hazards = []; this.windX = 0;
      for (const m of this.monsters) { if (!m.def.part) this.defeated(m.type, 0, m.x, m.cy, 1); m.dead = true; this.addFx({ kind: 'puff', x: m.x, y: m.cy, dur: 0.4, s: 1 }); }
      MP.Audio.music(null); MP.Audio.hum(false); sfx('clear');
      this.banner = { text: this.def.final ? 'ALL CLEAR!' : 'STAGE CLEAR!', sub: '', t: 0, dur: 2.8, good: true };
    }
    finish() {
      const s = this.def, heartBonus = this.player.hp * 500; this.score += heartBonus;
      const wasCleared = !!MP.Save.data.cleared[this.stage];
      if (MP.fails) MP.fails[this.stage] = 0;
      if (!s.noMats) this.mats = s.total;             // monster drops + clear bonus = the stage's fixed reward
      const granted = MP.Save.clearStage(this.stage, this.score, s.total);
      const coins = this.kills + 5; MP.Save.data.coins = (MP.Save.data.coins || 0) + coins; MP.Save.save();
      this.result = { stage: this.stage, coins, score: this.score, heartBonus, mats: granted, total: s.total, first: !wasCleared, kills: this.kills };
      if (MP.onStageClear) MP.onStageClear(this.result);
    }
    tutorial() {
      if (this.tut < 0) return; const p = this.player, touch = MP.Input.touch;
      const msg = [touch ? '조이스틱을 좌우로 밀어 움직이고, 위로 밀면 점프해요' : '← → (A D) 키로 움직이고 SPACE (W, ↑) 키로 점프해요',
        touch ? '자석 버튼을 꾹 누르면 전류 ON! 철구 몬스터를 끌어당겨요' : 'Z (또는 J) 키를 꾹 누르면 전류 ON! 철구 몬스터를 끌어당겨요',
        touch ? '버튼에서 손을 떼면 전류 OFF! 흡수한 몬스터가 발사돼요' : 'Z (또는 J) 키를 놓으면 전류 OFF! 흡수한 몬스터가 발사돼요',
        '흡수한 몬스터를 다른 몬스터에게 발사해서 모두 물리쳐요!'][this.tut];
      this.hint = msg; this.hintT = 0.5;
      if (this.tut === 0 && (Math.abs(p.x - 200) > 120 || this.time > 6)) this.tut = 1;
      else if (this.tut === 1 && p.held.length) this.tut = 2;
      else if (this.tut === 2 && this.shots) { this.tut = 3; this.tutT = this.time; }
      else if (this.tut === 3 && this.time - this.tutT > 6) this.tut = -1;
    }
  }
  MP.Game = Game;
})();
