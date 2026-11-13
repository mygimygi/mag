// MAGNET POP - persistent progress (localStorage, with in-memory fallback)
(function () {
  const MP = window.MP, KEY = 'magnetpop.save.v1';
  const fresh = () => ({ unlocked: 1, cleared: {}, mats: 0, batt: 1, coil: 1, best: {}, ended: false, quizBest: 0, look: null, lookDone: false, coins: 0, items: {}, shopOpen: false, shopQ: { order: [0, 1, 2, 3, 4], pos: 0 }, settings: { bgm: true, sfx: true, vol: 0.7, autoFs: true } });
  const Save = MP.Save = {
    data: fresh(),
    load() {
      try { const raw = localStorage.getItem(KEY); if (raw) { const d = JSON.parse(raw); this.data = Object.assign(fresh(), d); this.data.settings = Object.assign(fresh().settings, d.settings || {}); } } catch (e) { /* storage unavailable: keep memory copy */ }
      const d = this.data; d.batt = Math.max(1, Math.min(MP.UPG.maxLevel, d.batt | 0)); d.coil = Math.max(1, Math.min(MP.UPG.maxLevel, d.coil | 0)); d.unlocked = Math.max(1, Math.min(16, d.unlocked | 0));
      return d;
    },
    save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); return true; } catch (e) { return false; } },
    reset() { const s = this.data.settings, l = this.data.look, ld = this.data.lookDone; this.data = fresh(); this.data.settings = s; this.data.look = l; this.data.lookDone = ld; this.save(); },
    /** record a stage clear; returns materials actually granted (only the first clear pays out) */
    clearStage(n, score, mats) {
      const d = this.data; let granted = 0;
      if (!d.cleared[n]) { d.cleared[n] = true; d.mats += mats; granted = mats; }
      d.best[n] = Math.max(d.best[n] || 0, score);
      if (n < 16 && d.unlocked < n + 1) d.unlocked = n + 1;   // stage 16 opens only after stage 15
      if (n === 16) d.ended = true;
      d.shopOpen = true;                                        // every clear opens the shop once
      this.save(); return granted;
    },
    /** can `part` ('batt'|'coil') be upgraded? returns {ok, reason, cost, next} */
    canUpgrade(part) {
      const d = this.data, lv = d[part], other = part === 'batt' ? d.coil : d.batt;
      if (lv >= MP.UPG.maxLevel) return { ok: false, reason: 'max' };
      const cost = MP.UPG[part].cost[lv];
      if (lv === 2 && other < 2) return { ok: false, reason: 'balance', cost, next: lv + 1 };
      if (d.mats < cost) return { ok: false, reason: 'mats', cost, next: lv + 1 };
      return { ok: true, cost, next: lv + 1 };
    },
    // Shop questions: numbers 1-5 in order the first time round, then a fresh shuffled round each time all five were asked.
    shopQuestion() { const q = this.data.shopQ; return q.order[q.pos]; },
    shopAnswered() {
      const q = this.data.shopQ; q.pos++;
      if (q.pos >= q.order.length) { const last = q.order[q.order.length - 1], o = [0, 1, 2, 3, 4]; do { for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } } while (o[0] === last); q.order = o; q.pos = 0; }
      this.save();
    },
    buy(k) { const d = this.data, it = MP.ITEMS[k]; if (!it || d.items[k] || d.coins < it.price) return false; d.coins -= it.price; d.items[k] = 1; this.save(); return true; },
    upgrade(part) { const c = this.canUpgrade(part); if (!c.ok) return false; this.data.mats -= c.cost; this.data[part] = c.next; this.save(); return true; },
  };
})();
