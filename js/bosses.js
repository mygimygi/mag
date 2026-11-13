// MAGNET POP - bosses: Compass King (stage 9) and Magnet Titan (stage 16)
(function () {
  const MP = window.MP, W = MP.W, G = MP.GROUND, { clamp, sign } = MP.util, rand = Math.random;
  const sfx = n => MP.Audio.sfx(n);
  const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

  // ---------------------------------------------------------------- Compass King
  // His compass needle follows the player's electromagnet. Keeping the field near him makes him dizzy;
  // only while he is stunned do launched monsters hurt him.
  class King {
    constructor(g) {
      this.kind = 'king'; this.name = '컴퍼스 킹'; this.x = 980; this.y = -60; this.vx = 0; this.vy = 0; this.hw = 72; this.h = 176; this.hp = this.maxHp = 8;
      this.state = 'intro'; this.t = 0; this.animT = 0; this.anim = 'idle'; this.needle = 0; this.nv = 0; this.dizzy = 0; this.dir = -1; this.jumpT = 3; this.summonT = 3; this.flash = 0; this.done = false; this.onGround = false; this.plat = null; this.landed = false;
      g.say('전자석을 켜고 가까이 가면 나침반 바늘이 흔들려요!', 6);
    }
    update(dt, g) {
      this.t += dt; this.animT += dt; this.flash -= dt; const pl = g.player, nz = g.nozzle, cx = this.x, cy = this.y - 66;
      // --- needle: a small magnet that turns toward the electromagnet's field ---
      const d = Math.hypot(nz.x - cx, nz.y - cy);
      this.infl = pl.magnet && d < g.stat.range * 1.2 + 150 && this.state !== 'dead' && this.state !== 'intro';
      if (this.state === 'stun' || this.state === 'dead') { this.nv += (15 - this.nv) * dt * 3; this.needle += this.nv * dt; }
      else {
        let target = 0, k = 16, damp = 3;
        if (this.infl) { target = Math.atan2(nz.x - cx, -(nz.y - cy)); k = 80; damp = 3.2; }
        this.nv += (wrap(target - this.needle) * k - this.nv * damp) * dt; this.needle += this.nv * dt;
        if (this.infl) this.dizzy += dt * 0.3 * Math.sqrt(g.stat.pull) + Math.abs(this.nv) * dt * 0.02; else this.dizzy = Math.max(0, this.dizzy - dt * 0.1);
        if (this.dizzy >= 1 && this.onGround && (this.state === 'walk' || this.state === 'jump')) { this.state = 'stun'; this.t = 0; this.vx = 0; this.jumped = false; sfx('bossStun'); g.say('컴퍼스 킹이 어지러워해요! 지금 몬스터를 발사해요!', 4); }
      }
      MP.physics(this, dt, g.world);
      if (this.hitWall) this.vx = 0;
      switch (this.state) {
        case 'intro': this.anim = 'idle'; if (this.onGround && !this.landed) { this.landed = true; g.shake = 0.3; sfx('slam'); } if (this.t > 1.8) { this.state = 'walk'; this.t = 0; } break;
        case 'walk':
          this.dir = sign(pl.x - this.x) || 1; this.vx = Math.abs(pl.x - this.x) > 40 ? this.dir * 95 : 0; this.anim = 'move'; this.jumpT -= dt;
          if (this.jumpT <= 0 && this.onGround) { this.state = 'jump'; this.t = 0; this.jumped = false; }
          break;
        case 'jump':
          this.anim = 'attack';
          if (this.t < 0.5) { this.vx = 0; this.animT = 0; }
          else if (!this.jumped) { this.jumped = true; this.vy = -1050; this.vx = clamp((pl.x - this.x) / 0.95, -430, 430); this.onGround = false; this.animT = 0.3; sfx('jump'); }
          else if (this.onGround) {
            g.shake = 0.3; sfx('slam'); this.vx = 0;
            g.addFx({ kind: 'puff', x: this.x - 60, y: this.y - 8, dur: 0.35, s: 1 }); g.addFx({ kind: 'puff', x: this.x + 60, y: this.y - 8, dur: 0.35, s: 1 });
            this.state = 'walk'; this.jumpT = 2.6; this.jumped = false;
          }
          break;
        case 'stun': this.anim = 'dizzy'; this.vx = 0; if (this.t > 5) { this.state = 'walk'; this.t = 0; this.dizzy = 0; this.jumpT = 2; } break;
        case 'dead':
          this.anim = 'ko'; this.vx = 0;
          if (Math.floor(this.t * 6) !== Math.floor((this.t - dt) * 6)) g.addFx({ kind: 'hit', x: this.x + (rand() - .5) * 140, y: this.y - 30 - rand() * 150, dur: 0.3 });
          if (this.t > 2.2) this.done = true;
          break;
      }
      // keeps a couple of iron minions around so the player always has something to launch
      this.summonT -= dt;
      if (this.summonT <= 0 && this.state !== 'dead' && this.state !== 'intro') { this.summonT = 5; if (g.monsters.length + g.player.held.length < 2) g.spawn('ball', 140 + rand() * 1000, -30, { drop: 0 }); }
      if (this.state !== 'stun' && this.state !== 'dead' && this.state !== 'intro' && Math.abs(pl.x - this.x) < this.hw + pl.hw - 8 && this.y - this.h + 20 < pl.y && this.y > pl.y - pl.h + 12) g.hurt(this.x);
    }
    hitBy(pr, g) {
      if (this.state === 'dead' || this.state === 'intro') return false;
      if (Math.abs(pr.x - this.x) > this.hw + pr.r || Math.abs(pr.y - (this.y - this.h / 2)) > this.h / 2 + pr.r) return false;
      if (this.state !== 'stun') { sfx('clang'); g.addFx({ kind: 'hit', x: pr.x, y: pr.y, dur: 0.2 }); g.say('튕겨 나갔어요! 전자석을 켜서 나침반 바늘을 어지럽혀요!', 4); return true; }
      this.hp -= Math.min(pr.n, 3); this.flash = 0.35; g.shake = 0.25; sfx('bossHit'); g.addFx({ kind: 'hit', x: pr.x, y: pr.y, dur: 0.3 }); g.addScore(500 * pr.n, this.x, this.y - this.h);
      if (this.hp <= 0) { this.hp = 0; this.state = 'dead'; this.t = 0; g.addScore(5000, this.x, this.y - this.h - 30); g.addMats(10, this.x, this.y - 90); sfx('bossDown'); g.say('', 0); }
      return true;
    }
  }
  MP.King = King;

  // ---------------------------------------------------------------- Magnet Titan
  // Phase 1: fists + summons, chest takes hits. Phase 2: iron shields guard the chest - pull them off with the magnet.
  // Phase 3: the core coil is open but shielded by a magnetic barrier powered by two batteries - unplug them (cut the current!).
  class Titan {
    constructor(g) {
      this.kind = 'titan'; this.name = '마그넷 타이탄'; this.x = 1040; this.y = G; this.phase = 1; this.maxHp = [0, 6, 6, 6]; this.hp = 6;
      this.state = 'intro'; this.t = 0; this.animT = 0; this.anim = 'idle'; this.atkT = 2.6; this.atkIdx = 0; this.flash = 0; this.done = false;
      this.fists = [{ hx: 905, hy: 215, x: 905, y: -150, st: 'home', t: 0, rot: 0 }, { hx: 1190, hy: 330, x: 1190, y: -150, st: 'home', t: 0, rot: 0 }]; this.fistN = 0;
      this.needle = 0; this.nv = 0; this.volley = null; this.shields = []; this.pods = []; this.barrier = false; this.barrierT = 0; this.pullT = 0; this.chargeT = 0; this.pending = null; this.chest = { x: this.x, y: G - 196 };
      g.say('타이탄의 가슴을 노려요! 발판 위에서 발사하면 가슴에 맞아요.', 6);
    }
    minions(g) { return g.monsters.filter(m => !m.def.part).length; }
    update(dt, g) {
      this.t += dt; this.animT += dt; this.flash -= dt; const pl = g.player;
      this.updateFists(dt, g);
      // chest compass: the needle is a small magnet, so it swings toward the hero's electromagnet (and spins in the titan's own field)
      { const nz = g.nozzle, cx = this.chest.x, cy = this.chest.y, near = pl.magnet && Math.hypot(nz.x - cx, nz.y - cy) < g.stat.range * 1.2 + 260;
        if (this.state === 'dead' || this.pullT > 0 || this.chargeT > 0 || this.state === 'shift') { this.nv += (14 - this.nv) * dt * 3; this.needle += this.nv * dt; }
        else { let target = 0, k = 16, damp = 3; if (near) { target = Math.atan2(nz.x - cx, -(nz.y - cy)); k = 80; damp = 3.2; } this.nv += (wrap(target - this.needle) * k - this.nv * damp) * dt; this.needle += this.nv * dt; }
        this.needleNear = near; }
      if (this.state === 'intro') { if (this.t > 2.2) { this.state = 'fight'; this.t = 0; } return; }
      if (this.state === 'dead') {
        this.anim = 'ko'; g.windX = 0;
        if (Math.floor(this.t * 7) !== Math.floor((this.t - dt) * 7)) { g.addFx({ kind: 'hit', x: this.x + (rand() - .5) * 280, y: G - 40 - rand() * 380, dur: 0.35 }); g.shake = 0.15; }
        if (this.t > 3.4) this.done = true; return;
      }
      if (this.state === 'shift') { // phase change
        this.anim = this.phase === 3 ? 'openHurt' : 'hurt'; g.windX = 0;
        if (this.t > 1.8) { this.state = 'fight'; this.t = 0; this.atkT = 1.2; if (this.phase === 2) this.makeShields(g); if (this.phase === 3) this.makePods(g); }
        return;
      }
      // body contact
      if (pl.x > this.x - 178 && pl.y > G - 420) { g.hurt(this.x); pl.x = Math.min(pl.x, this.x - 180); }
      // phase 3 barrier bookkeeping: both batteries unplugged -> current cut -> barrier collapses for a while
      if (this.phase === 3) {
        if (this.barrier && this.pods.every(p => p.freed || p.dead)) { this.barrier = false; this.barrierT = 8; sfx('bossStun'); g.shake = 0.3; g.say('전류가 끊겨 자기장 방어막이 사라졌어요! 핵심 코일을 공격해요!', 5); }
        if (!this.barrier) { this.barrierT -= dt; if (this.barrierT <= 0) this.makePods(g); }
      }
      // attack telegraph / execution
      if (this.chargeT > 0) {
        this.chargeT -= dt; this.anim = 'attack';
        if (this.chargeT <= 0 && this.pending) { const p = this.pending; this.pending = null; p(); }
      } else if (this.pullT > 0) {
        this.pullT -= dt; this.anim = 'attack'; g.windX = 180; if (this.pullT <= 0) g.windX = 0;
      } else if (this.volley) {     // fists are thrown one after another
        const v = this.volley; v.t += dt; this.anim = 'attack';
        while (v.shot < v.n && v.t >= v.shot * 0.45) this.throwFist(g, v.shot++);
        if (v.shot >= v.n && v.t > v.n * 0.45 + 0.35) this.volley = null;
      } else {
        this.anim = this.flash > 0 ? (this.phase === 3 ? 'openHurt' : 'hurt') : (this.phase === 3 ? 'openIdle' : 'idle');
        this.atkT -= dt; if (this.atkT <= 0) this.attack(g);
      }
    }
    attack(g) {
      const lists = [null, ['fist', 'summon', 'fist', 'fist', 'summon'], ['wave', 'fist', 'summon', 'wave', 'fist', 'shield'], ['pull', 'fist', 'wave', 'summon', 'fist', 'wave']];
      const list = lists[this.phase], a = list[this.atkIdx++ % list.length];
      this.atkT = [0, 2.1, 1.8, 1.5][this.phase];
      if (a === 'fist') { this.chargeT = 0.45; this.pending = () => { this.volley = { n: this.phase === 1 ? 2 : 3, shot: 0, t: 0 }; }; }
      else if (a === 'summon') {
        const n = Math.min(2, 4 - this.minions(g) - g.player.held.length); const types = [null, ['ball', 'robot'], ['ball', 'slime'], ['ball', 'bug']][this.phase];
        this.chargeT = 0.5; this.pending = () => { for (let i = 0; i < n; i++) g.spawn(types[i % 2], 140 + rand() * 620, -30 - i * 60, { drop: 0 }); };
        if (this.minions(g) + g.player.held.length === 0 && n <= 0) this.atkT = 0.5;
      }
      else if (a === 'wave') {
        this.chargeT = 0.8; sfx('magnetOn');
        this.pending = () => { sfx('wave'); g.shake = 0.2; const fire = (delay) => g.hazards.push({ kind: 'wave', x: this.x - 150 + delay * 400, y: G - 28, w: 46, h: 56, vx: -400, life: 2.8 + delay }); fire(0); if (this.phase === 3) fire(0.75); };
      }
      else if (a === 'shield') { if (!this.shields.some(s => !s.dead && !s.freed)) { this.chargeT = 0.6; this.pending = () => this.makeShields(g); } else this.atkT = 0.6; }
      else if (a === 'pull') { this.chargeT = 1.0; sfx('magnetOn'); g.say('광역 자기장! 반대쪽으로 달려요!', 3); this.pending = () => { this.pullT = 2.4; sfx('wave'); }; }
    }
    makeShields(g) { sfx('clang'); this.shields = [-85, 0, 85].map(dy => g.spawn('shield', this.x - 190, this.chest.y + dy + 50, { drop: 0 })); if (this.phase === 2) g.say('철제 방패가 가슴을 막고 있어요! 전자석으로 방패를 끌어당겨 떼어 내요!', 6); }
    makePods(g) { this.barrier = true; this.pods = [[-160, 400 + 45], [-160, 560 + 45]].map(([dx, y]) => g.spawn('pod', this.x + dx, y, { drop: 0 })); g.say('방어막의 전원 건전지 2개를 전자석으로 뽑아서 전류를 끊어요!', 6); }
    // A fist is lobbed in an arc at the spot where the hero is standing when it is thrown. It does not steer afterwards.
    throwFist(g, i) {
      const pl = g.player, f = this.fists[i % 2], x0 = f.st === 'home' ? f.x : f.hx, y0 = f.st === 'home' ? f.y : f.hy, T = 1.6, grav = 844;     // 25% slower than before (was T 1.2 / gravity 1500), same arc
      const tx = clamp(pl.x, 60, 830), ty = pl.y - 45;
      g.hazards.push({ kind: 'fist', x: x0, y: y0, w: 96, h: 70, vx: (tx - x0) / T, vy: (ty - y0) / T - 0.5 * grav * T, g: grav, life: 4 });
      f.st = 'away'; f.t = 0; sfx('shoot');
    }
    updateFists(dt, g) {
      for (const f of this.fists) {
        f.t += dt;
        if (this.state === 'dead') { f.y += 500 * dt; f.rot += dt * 3; continue; }
        if (f.st === 'home') { const ty = f.hy + Math.sin(this.t * 2 + f.hx) * 10; f.x += (f.hx - f.x) * Math.min(1, dt * 5); f.y += (ty - f.y) * Math.min(1, dt * 5); f.rot *= Math.pow(0.001, dt); }
        else if (f.st === 'away') { if (f.t > 1.5) { f.st = 'back'; f.t = 0; f.x = f.hx; f.y = -120; } }      // a new fist floats back into place
        else if (f.st === 'back') { f.x += (f.hx - f.x) * Math.min(1, dt * 4); f.y += (f.hy - f.y) * Math.min(1, dt * 4); if (f.t > 0.8) f.st = 'home'; }
      }
    }
    get vulnerable() { return this.state === 'fight' && (this.phase < 3 || !this.barrier); }
    hitBy(pr, g) {
      if (this.state === 'dead' || this.state === 'intro') return false;
      if (pr.x + pr.r < this.x - 132) return false;
      const inChest = pr.y > this.chest.y - 100 && pr.y < this.chest.y + 100;
      if (!inChest || !this.vulnerable) {
        sfx('clang'); g.addFx({ kind: 'hit', x: pr.x, y: pr.y, dur: 0.2 });
        if (this.state === 'fight') g.say(!inChest ? '몸통은 단단해요! 발판 위에서 가슴을 노려요!' : '자기장 방어막에 막혔어요! 전원 건전지를 전자석으로 뽑아요!', 4);
        return true;
      }
      this.hp -= Math.min(pr.n, 3); this.flash = 0.4; g.shake = 0.3; sfx('bossHit'); g.addFx({ kind: 'hit', x: pr.x, y: pr.y, dur: 0.3 }); g.addScore(800 * pr.n, this.x - 60, this.chest.y - 120);
      if (this.hp <= 0) {
        g.windX = 0; this.pullT = 0; this.chargeT = 0; this.pending = null; this.volley = null; g.hazards = [];
        for (const s of this.shields.concat(this.pods)) if (!s.dead) { s.dead = true; g.addFx({ kind: 'puff', x: s.x, y: s.cy, dur: 0.4, s: 1 }); }
        if (this.phase < 3) { this.phase++; this.hp = this.maxHp[this.phase]; this.state = 'shift'; this.t = 0; g.banner = { text: 'PHASE ' + this.phase, sub: this.phase === 2 ? '철제 방패와 자기장 충격파!' : '핵심 코일이 드러났다!', t: 0, dur: 1.8, warn: true }; sfx('bossIn'); }
        else { this.hp = 0; this.state = 'dead'; this.t = 0; g.addScore(20000, this.x - 60, this.chest.y - 160); g.say('', 0); for (const m of g.monsters) { m.dead = true; g.addFx({ kind: 'puff', x: m.x, y: m.cy, dur: 0.4, s: 1 }); } MP.Audio.music(null); sfx('bossDown'); }
      }
      return true;
    }
  }
  MP.Titan = Titan;
})();
