// MAGNET POP - DOM screens (menu, stage select, upgrade, science classroom, quiz, overlays)
(function () {
  const MP = window.MP, root = document.getElementById('ui'), S = () => MP.Save.data, sfx = n => MP.Audio.sfx(n);
  const el = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; };
  const UI = MP.UI = { cur: null, back: null, sciCanvases: [] };
  const screens = {};
  function make(id, cls, html) { const s = el(`<div class="screen ${cls || ''}" id="${id}" hidden>${html}</div>`); root.appendChild(s); screens[id] = s; return s; }
  function on(node, sel, fn) { node.querySelectorAll(sel).forEach(b => b.addEventListener('click', e => { MP.Audio.unlock(); sfx('click'); fn(e, b); })); }
  UI.show = (id) => { for (const k in screens) screens[k].hidden = k !== id; UI.cur = id; if (MP.App) MP.App.onScreen(id); };
  UI.hideAll = () => { for (const k in screens) screens[k].hidden = true; UI.cur = null; if (MP.App) MP.App.onScreen(null); };

  // ---------- loading ----------
  make('loading', '', `<div class="logo">MAGNET POP</div><div class="bar"><i></i></div><div id="loadMsg" style="font-size:24px">불러오는 중...</div><button class="btn" id="loadBack" hidden>돌아가기</button>`);
  UI.wait = (msg, back) => { document.getElementById('loadMsg').textContent = msg; document.getElementById('loadBack').hidden = !back; if (!back) UI.progress(0); UI.show('loading'); };
  on(screens.loading, '#loadBack', () => UI.stages());
  UI.progress = p => { screens.loading.querySelector('.bar i').style.width = Math.round(p * 100) + '%'; };
  UI.loadError = names => { document.getElementById('loadMsg').textContent = '이미지를 불러오지 못했습니다: ' + names.join(', '); };

  // ---------- main menu ----------
  make('menu', '', `<button class="btn big" data-go="start">게임 시작</button>
    <div class="row"><button class="btn" data-go="dress">캐릭터 꾸미기</button><button class="btn" data-go="howto">게임 방법</button><button class="btn" data-go="science">과학 교실</button><button class="btn" data-go="settings">설정</button></div>`);
  on(screens.menu, '[data-go]', (e, b) => { const g = b.dataset.go; if (g === 'start') { sfx('start'); if (S().lookDone) UI.stages(); else UI.dress('start'); } else UI[g]('menu'); });
  UI.menu = () => { UI.show('menu'); MP.Audio.music('MENU'); };

  // ---------- stage select ----------
  make('stages', '', `<button class="btn small back" data-b="menu">◀ 메뉴</button><h1 class="title" style="position:absolute;top:16px">스테이지 선택</h1><div class="panel"><div class="worlds"></div><div class="side"></div></div>`);
  UI.stages = () => {
    const d = S(), w = screens.stages.querySelector('.worlds'); let h = '';
    for (let wi = 1; wi <= 5; wi++) {
      h += `<div class="world"><div class="wn">WORLD ${wi}<small>${MP.WORLDS[wi]}</small></div>`;
      for (let k = 0; k < 3; k++) { const n = (wi - 1) * 3 + k + 1, st = MP.STAGES[n], lock = n > d.unlocked; h += `<button class="sbtn ${lock ? 'lock' : ''} ${d.cleared[n] ? 'done' : ''}" data-n="${n}" ${lock ? 'disabled' : ''}><b>${lock ? '<span class="ico lockI" style="transform:scale(.7);margin:-8px"></span>' : 'STAGE ' + n}</b><span>${st.name}</span></button>`; }
      h += `</div>`;
    }
    const fl = d.unlocked < 16;
    h += `<div class="world"><div class="wn" style="color:#a02cc8">FINAL<small>최종 결전</small></div><button class="sbtn final ${fl ? 'lock' : ''} ${d.cleared[16] ? 'done' : ''}" data-n="16" ${fl ? 'disabled' : ''}><b>${fl ? '스테이지 1~15를 모두 클리어하면 열려요' : 'STAGE 16 · 마그넷 타이탄 최종 결전'}</b></button></div>`;
    w.innerHTML = h;
    const st = MP.stats(d.batt, d.coil);
    screens.stages.querySelector('.side').innerHTML = `<div class="mats"><span class="ico bolt"></span>${d.mats} &nbsp;<span class="ico coin"></span>${d.coins || 0}</div><canvas width="540" height="390"></canvas>
      <div class="lv"><span class="ico battery" style="transform:scale(.7);vertical-align:middle;margin:-8px"></span> 건전지 ${st.batteries}개 &nbsp; <span class="ico coil" style="transform:scale(.7);vertical-align:middle;margin:-8px"></span> 에나멜선 ${st.turns}회</div>
      <button class="btn green" data-up>전자석 강화</button>${d.shopOpen ? '<button class="btn small gold" data-shop>상점 열림!</button>' : ''}<button class="btn small" data-dress>캐릭터 꾸미기</button>${d.ended ? '<button class="btn small" data-quiz>과학 퀴즈</button>' : ''}`;
    MP.Render.drawWeapon(screens.stages.querySelector('.side canvas'), d.batt, d.coil, false);
    on(w, '.sbtn:not(.lock)', (e, b) => UI.tryStart(+b.dataset.n));
    on(screens.stages, '[data-up]', () => UI.upgrade('stages'));
    on(screens.stages, '[data-dress]', () => UI.dress('stages'));
    on(screens.stages, '[data-shop]', () => UI.shop('stages'));
    on(screens.stages, '[data-quiz]', () => UI.quiz());
    UI.show('stages'); MP.Audio.music('MENU');
  };
  on(screens.stages, '[data-b]', () => UI.menu());
  UI.tryStart = n => {
    const d = S();
    // before the final battle, remind the player to finish upgrading if they can afford it
    if (n === 16 && (MP.Save.canUpgrade('batt').ok || MP.Save.canUpgrade('coil').ok)) return UI.upgrade(16, '최종 결전 전에 전자석을 끝까지 강화해요!');
    MP.App.startStage(n);
  };

  // ---------- upgrade screen ----------
  make('upgrade', '', `<div class="u-mats"></div><div class="u-title"><span class="u-mag"></span>전자석 업그레이드</div><div class="u-stage"></div>
    <div class="u-panel batt"><div class="u-head"><span class="ico battery"></span>건전지</div><div class="u-sub">전압이 높아져요!</div><div class="u-rows"></div><button class="u-btn" data-buy="batt"></button></div>
    <div class="u-center"><div class="u-rays"></div><canvas width="1080" height="780"></canvas></div>
    <div class="u-panel coil"><div class="u-head"><span class="ico coil"></span>에나멜선</div><div class="u-sub">코일을 더 많이 감아요!</div><div class="u-rows"></div><button class="u-btn" data-buy="coil"></button></div>
    <div class="u-stats"><div class="u-stl">현재 능력</div><div class="u-cells"></div></div><div class="u-toast" hidden></div><div class="u-pow" hidden>POWER UP!</div><button class="btn u-ok">확인 ▶</button>`);
  let upFrom = 'stages', toastT = 0;
  UI.upgrade = (from, msg) => { upFrom = from; renderUp(); UI.show('upgrade'); MP.Audio.music('MENU'); if (msg) toast(msg); };
  function toast(msg) { const t = screens.upgrade.querySelector('.u-toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2400); }
  function coilIcon(cv, lv) { // copper windings on an iron core: 10 / 20 / 30 turns
    const c = cv.getContext('2d'), n = [0, 5, 9, 13][lv], w = cv.width, h = cv.height; c.clearRect(0, 0, w, h); c.lineWidth = 3; c.strokeStyle = '#3b2438';
    const x0 = (w - n * 12) / 2; c.fillStyle = '#c9d3e0'; c.beginPath(); c.rect(x0 - 14, h / 2 - 7, n * 12 + 28, 14); c.fill(); c.stroke();
    for (let i = 0; i < n; i++) { const g = c.createLinearGradient(0, 6, 0, h - 6); g.addColorStop(0, '#ffd39a'); g.addColorStop(0.4, '#f09a45'); g.addColorStop(1, '#a9521a'); c.fillStyle = g; c.beginPath(); c.rect(x0 + i * 12 + 1, 6, 10, h - 12); c.fill(); c.stroke(); }
  }
  function renderUp(flash) {
    const d = S(), sc = screens.upgrade, cur = MP.stats(d.batt, d.coil), mx = MP.stats(3, 3), U = MP.UPG;
    sc.querySelector('.u-mats').innerHTML = `<span class="ico bolt"></span><div><small>보유 재료</small><b>${d.mats}</b></div>`;
    sc.querySelector('.u-stage').innerHTML = `STAGE <b>${typeof upFrom === 'number' ? Math.min(16, upFrom) : d.unlocked}</b>`;
    for (const part of ['batt', 'coil']) {
      const isB = part === 'batt', lv = d[part], c = MP.Save.canUpgrade(part), pn = sc.querySelector('.u-panel.' + part);
      pn.querySelector('.u-rows').innerHTML = [1, 2, 3].map(i => `<div class="u-row ${i === lv ? 'cur' : ''} ${i < lv ? 'done' : ''}"><span class="u-pic">${isB ? '<span class="ico battery lie"></span>'.repeat(i) : `<canvas width="230" height="60" data-coil="${i}"></canvas>`}</span><b>${isB ? U.batt.count[i - 1] + '개' : U.coil.turns[i - 1] + '회'}</b></div>`).join('');
      pn.querySelectorAll('canvas[data-coil]').forEach(cv => coilIcon(cv, +cv.dataset.coil));
      const b = pn.querySelector('.u-btn'); b.className = 'u-btn ' + (c.reason === 'max' ? 'max' : c.ok ? 'ok' : 'no');
      b.innerHTML = c.reason === 'max' ? '✓ MAX' : `강화 <span class="ico bolt"></span>${c.cost}`;
      b.dataset.msg = c.reason === 'max' ? '이미 최대 단계예요!' : c.reason === 'balance' ? `먼저 ${isB ? '에나멜선' : '건전지'}을 2단계로 강화해요!` : c.reason === 'mats' ? `재료가 부족해요! (${c.cost - d.mats}개 더 필요)` : '';
    }
    const tr = MP.Render.TIER[d.batt + d.coil - 2]; sc.querySelector('.u-rays').style.setProperty('--ray', 'rgba(' + tr.cone + ',.9)');
    const cv = sc.querySelector('.u-center canvas'); MP.Render.drawWeapon(cv, d.batt, d.coil, true); cv.classList.remove('flashU'); if (flash) { void cv.offsetWidth; cv.classList.add('flashU'); }
    const cell = (ic, name, v, max) => `<div class="u-cell"><span class="u-ic ${ic}"></span><div><span>${name}</span><b class="${v >= max ? 'top' : ''}">${v >= max ? '최대!' : Math.round(v / max * 100) + '%'}</b></div></div>`;
    sc.querySelector('.u-cells').innerHTML = cell('range', '자기장 범위', cur.range, mx.range) + cell('pull', '흡수 성능', cur.pull, mx.pull) + cell('shot', '발사 공격력', cur.shot, mx.shot);
  }
  on(screens.upgrade, '.u-btn', (e, b) => { if (b.dataset.msg) { sfx('nope'); return toast(b.dataset.msg); } if (MP.Save.upgrade(b.dataset.buy)) { sfx('upgrade'); renderUp(true); const pw = screens.upgrade.querySelector('.u-pow'), d2 = S(); pw.style.color = MP.Render.TIER[d2.batt + d2.coil - 2].name; pw.hidden = true; void pw.offsetWidth; pw.hidden = false; setTimeout(() => { pw.hidden = true; }, 1500); toast(b.dataset.buy === 'batt' ? '건전지 강화 성공!' : '에나멜선 강화 성공!'); } });
  on(screens.upgrade, '.u-ok', () => { if (typeof upFrom === 'number') MP.App.startStage(upFrom); else if (upFrom === 'clear' && lastClear) UI.clear(lastClear); else UI.stages(); });

  // ---------- character dress-up ----------
  const Art = window.MPArt;
  make('dress', '', `<button class="btn small back" data-b>◀ 뒤로</button><h1 class="title" style="position:absolute;top:14px">캐릭터 꾸미기</h1>
    <div class="d-wrap"><div class="d-prev"><div class="d-svg"></div><button class="btn small" data-reset>기본 모습</button></div><div class="d-opts"></div></div><button class="btn big d-go"></button>`);
  let dLook = null, dFrom = 'menu';
  const D_GROUPS = [['gender', '성별'], ['hair', '머리 모양'], ['hairColor', '머리 색'], ['eyes', '눈 크기'], ['skin', '피부색'], ['cloth', '옷 색깔'], ['hat', '모자'], ['glasses', '선글라스']];
  UI.dress = (from) => { dFrom = from || 'menu'; dLook = Art.normLook(S().look); renderDress(); UI.show('dress'); MP.Audio.music('MENU'); };
  function renderDress() {
    const sc = screens.dress, d = S();
    sc.querySelector('.d-svg').innerHTML = Art.previewSVG(dLook, d.batt, d.coil);
    sc.querySelector('.d-opts').innerHTML = D_GROUPS.map(([k, label]) => `<div class="d-row"><span class="d-lab">${label}</span><div class="d-ch">${Art.OPTIONS[k].map(([v, t]) => {
      const sel = dLook[k] === v ? 'sel' : '', col = typeof t === 'string' && t[0] === '#';
      return col ? `<button class="d-sw ${sel}" data-k="${k}" data-v="${v}" style="background:${t}" aria-label="${v}"></button>` : `<button class="d-chip ${sel}" data-k="${k}" data-v="${v}">${t}</button>`;
    }).join('')}</div></div>`).join('');
    sc.querySelector('.d-go').textContent = dFrom === 'start' ? '이 모습으로 시작 ▶' : '이 모습으로 저장';
    on(sc.querySelector('.d-opts'), '[data-k]', (e, b) => {
      const k = b.dataset.k; let v = b.dataset.v; if (k === 'glasses') v = v === 'true';
      dLook[k] = v; if (k === 'gender') { dLook.hair = v === 'boy' ? 'short' : 'pony'; } renderDress();
    });
  }
  on(screens.dress, '[data-reset]', () => { dLook = Art.normLook(null); renderDress(); });
  on(screens.dress, '[data-b]', () => { if (dFrom === 'stages') UI.stages(); else UI.menu(); });
  on(screens.dress, '.d-go', (e, b) => {
    const d = S(); d.look = Object.assign({}, dLook); d.lookDone = true; MP.Save.save(); b.textContent = '준비 중...';
    MP.Assets.applyLook(d.look).then(() => { if (dFrom === 'menu') UI.menu(); else UI.stages(); });
  });

  // ---------- how to play ----------
  make('howto', '', `<button class="btn small back" data-b>◀ 메뉴</button><h1 class="title" style="position:absolute;top:16px">게임 방법</h1><div class="panel">
    <div class="cols"><div class="pc"><h3>PC 키보드</h3><ul><li><kbd>←</kbd><kbd>→</kbd> 또는 <kbd>A</kbd><kbd>D</kbd> 이동</li><li><kbd>SPACE</kbd> <kbd>W</kbd> <kbd>↑</kbd> 점프 &nbsp;(<kbd>↓</kbd>+점프: 아래로)</li><li><kbd>Z</kbd> 또는 <kbd>J</kbd> 꾹 누르기 : 전류 ON · 흡수</li><li><kbd>Z</kbd> 또는 <kbd>J</kbd> 놓기 : 전류 OFF · 발사</li><li><kbd>ESC</kbd> 일시정지</li></ul></div>
    <div><h3>태블릿 터치</h3><ul><li>왼쪽 <kbd>◀</kbd><kbd>▶</kbd> 버튼 : 이동</li><li>오른쪽 <kbd>JUMP</kbd> 버튼 : 점프</li><li><kbd>전자석</kbd> 버튼 꾹 누르기 : 전류 ON · 흡수</li><li>버튼에서 손 떼기 : 전류 OFF · 발사</li><li>이동·점프·전자석을 동시에 누를 수 있어요</li></ul></div></div>
    <div class="rules">① 전자석을 켜서 <b style="color:#2a66d8">철 몬스터</b>를 끌어당겨 흡수해요. (한 번에 최대 ${MP.HOLD_MAX}마리)<br>② 전자석을 끄면 흡수한 몬스터가 발사돼요. 많이 모을수록 강력해요!<br>③ 모든 몬스터를 물리치면 스테이지 클리어! 강화 재료로 <b style="color:#e06a00">건전지</b>와 <b style="color:#e06a00">에나멜선</b>을 강화해요.<br>④ 몬스터에 닿으면 하트가 줄어들어요. 하트 ${MP.HEARTS}개를 모두 잃으면 게임 오버!</div></div>`);
  UI.howto = () => UI.show('howto');
  on(screens.howto, '[data-b]', () => UI.menu());

  // ---------- science classroom ----------
  make('science', '', `<button class="btn small back" data-b>◀ 메뉴</button><h1 class="title" style="position:absolute;top:14px">과학 교실 · 전자석의 원리</h1><button class="btn sci-nav prev">◀</button><button class="btn sci-nav next">▶</button><div class="sci-page"></div><div class="grid">${MP.SCIENCE.map((s, i) => `<div class="scard"><canvas width="600" height="340" data-pic="${s.pic}"></canvas><h3><b>${i + 1}</b>${s.t}</h3><p>${s.d}</p></div>`).join('')}</div>`);
  UI.sciCanvases = [...screens.science.querySelectorAll('canvas')];
  // phones show one large card at a time (see .small in the stylesheet); bigger screens show all six
  let sciIdx = 0; const sciCards = [...screens.science.querySelectorAll('.scard')];
  const sciShow = i => { sciIdx = (i + sciCards.length) % sciCards.length; sciCards.forEach((c, k) => c.classList.toggle('cur', k === sciIdx)); screens.science.querySelector('.sci-page').textContent = (sciIdx + 1) + ' / ' + sciCards.length; };
  on(screens.science, '.sci-nav.prev', () => sciShow(sciIdx - 1)); on(screens.science, '.sci-nav.next', () => sciShow(sciIdx + 1));
  UI.science = () => { sciShow(0); MP.Assets.ensure(['king', 'm_wood', 'm_plastic', 'm_alu']); UI.show('science'); };
  on(screens.science, '[data-b]', () => UI.menu());

  // ---------- settings ----------
  make('settings', '', `<button class="btn small back" data-b>◀ 메뉴</button><h1 class="title" style="position:absolute;top:16px">설정</h1><div class="panel">
    <div class="line"><span>배경 음악</span><button class="tog" data-t="bgm"></button></div><div class="line"><span>효과음</span><button class="tog" data-t="sfx"></button></div>
    <div class="line"><span>전체 음량</span><input type="range" min="0" max="1" step="0.05" id="vol"></div>
    <div class="line"><span>시작할 때 전체 화면</span><button class="tog" data-t="autoFs"></button></div><div class="line"><span>전체 화면</span><button class="btn small" data-fs>전체 화면 전환</button></div>
    <div class="line" style="border:0"><span>진행 상황 초기화</span><button class="btn small red" data-reset>처음부터 다시</button></div></div>`);
  function renderSet() { const s = S().settings; screens.settings.querySelectorAll('.tog').forEach(b => { const v = s[b.dataset.t]; b.textContent = v ? '켜짐' : '꺼짐'; b.classList.toggle('off', !v); }); document.getElementById('vol').value = s.vol; const r = screens.settings.querySelector('[data-reset]'); r.textContent = '처음부터 다시'; r.dataset.arm = ''; }
  UI.settings = () => { renderSet(); UI.show('settings'); };
  on(screens.settings, '[data-b]', () => UI.menu());
  on(screens.settings, '.tog', (e, b) => { const s = S().settings; s[b.dataset.t] = !s[b.dataset.t]; MP.Save.save(); MP.Audio.applySettings(); renderSet(); });
  document.getElementById('vol').addEventListener('input', e => { S().settings.vol = +e.target.value; MP.Save.save(); MP.Audio.applySettings(); });
  on(screens.settings, '[data-fs]', () => { const d = document; if (d.fullscreenElement) d.exitFullscreen(); else MP.App.fullscreen(true); });
  on(screens.settings, '[data-reset]', (e, b) => { if (b.dataset.arm) { MP.Save.reset(); renderSet(); b.textContent = '초기화 완료!'; } else { b.dataset.arm = '1'; b.textContent = '정말요? 한 번 더 누르기'; } });

  // ---------- in-game overlays ----------
  make('pause', 'dim ov', `<div class="panel"><h2>일시정지</h2><button class="btn green" data-a="resume">계속하기</button><button class="btn" data-a="retry">다시 시작</button><button class="btn" data-a="stages">스테이지 선택</button></div>`);
  on(screens.pause, '[data-a]', (e, b) => { const a = b.dataset.a; if (a === 'resume') MP.App.pause(false); else if (a === 'retry') MP.App.startStage(MP.game.stage); else MP.App.quit(); });
  make('over', 'dim ov', `<div class="panel"><h2 style="color:#e8303f">GAME OVER</h2><div class="big2">괜찮아요! 다시 도전해 봐요.</div><div class="row"><button class="btn green" data-a="retry">다시 도전</button><button class="btn" data-a="stages">스테이지 선택</button></div></div>`);
  on(screens.over, '[data-a]', (e, b) => { if (b.dataset.a === 'retry') MP.App.startStage(MP.game.stage); else MP.App.quit(); });
  make('clear', 'ov', `<div class="panel"></div>`);
  let lastClear = null;
  UI.clear = r => {
    lastClear = r; const st = MP.STAGES[r.stage], d = S(), p = screens.clear.querySelector('.panel');
    const cb = MP.Save.canUpgrade('batt'), cc = MP.Save.canUpgrade('coil'), canUp = cb.ok || cc.ok, allMax = cb.reason === 'max' && cc.reason === 'max';
    const need = Math.min(...[cb, cc].filter(c => c.cost != null).map(c => c.cost - d.mats).filter(v => v > 0).concat([Infinity]));
    const why = allMax ? '전자석을 이미 최대로 강화했어요!' : `재료가 부족해요! ${isFinite(need) ? '(' + need + '개 더 필요)' : ''}`;
    const items = Object.keys(d.items || {});
    p.innerHTML = `<h2>STAGE ${r.stage} 클리어!</h2>
      <div class="res"><span>점수</span><b>${r.score.toLocaleString()}</b><span>강화 재료</span><b>${st.noMats ? '강화 완료 구간' : r.first ? '+' + r.mats : '이미 받았어요'} <small>(보유 ${d.mats})</small></b><span>코인</span><b>+${r.coins || 0} <small>(보유 ${d.coins || 0})</small></b></div>
      ${st.upgradeAfter && r.first ? `<div class="chance">업그레이드 기회! 전자석을 강화할 수 있어요</div>` : ''}${r.stage === 15 ? `<div class="chance">최종 보스 스테이지가 열렸어요!</div>` : ''}
      ${items.length ? `<div class="bag">다음 스테이지 아이템 ${items.map(k => `<span class="ico ${MP.ITEMS[k].ico}"></span>`).join('')}</div>` : ''}
      <div class="tip"><b>과학 한 줄</b> ${MP.TIPS[r.stage]}</div><div class="warn" hidden></div>
      <div class="row"><button class="btn green" data-a="next">다음 스테이지 ▶</button><button class="btn ${canUp ? 'gold' : 'gray'}" style="cursor:pointer" data-a="up">전자석 강화</button><button class="btn ${d.shopOpen ? 'gold' : 'gray'}" style="cursor:pointer" data-a="shop">상점</button></div>`;
    on(p, '[data-a]', (e, b) => {
      const n = r.stage + 1, a = b.dataset.a, w = p.querySelector('.warn');
      if (a === 'next') return UI.tryStart(n);
      if (a === 'up') { if (canUp) return UI.upgrade('clear'); sfx('nope'); w.textContent = why; w.hidden = false; return; }
      if (S().shopOpen) return UI.shop('clear'); sfx('nope'); w.textContent = '상점은 스테이지를 클리어할 때마다 한 번 열려요!'; w.hidden = false;
    });
    UI.show('clear'); if (MP.App) { MP.App.scene = 'game'; MP.App.syncHud(); }
  };

  // ---------- shop: one question per visit; a right answer lets the player buy items for the next stage ----------
  make('shop', '', `<h1 class="title" style="position:absolute;top:14px">상점</h1><div class="sh-coins"></div><div class="panel sh-panel"></div><button class="btn sh-exit">나가기 ▶</button>`);
  let shFrom = 'clear', shPhase = 'quiz', shPick = -1;
  UI.shop = from => { shFrom = from || 'clear'; shPhase = 'quiz'; shPick = -1; renderShop(); UI.show('shop'); MP.Audio.music('MENU'); };
  function renderShop() {
    const d = S(), sc = screens.shop, pn = sc.querySelector('.sh-panel'), num = '①②③④';
    sc.querySelector('.sh-coins').innerHTML = `<span class="ico coin"></span><div><small>보유 코인</small><b>${d.coins || 0}</b></div>`;
    if (shPhase === 'quiz' || shPhase === 'right' || shPhase === 'wrong') {
      const qi = shPhase === 'quiz' ? MP.Save.shopQuestion() : sc.dataset.qi | 0, q = MP.SHOP_Q[qi]; sc.dataset.qi = qi;
      pn.innerHTML = `<div class="sh-lead">문제를 맞히면 상점이 열려요!</div><div class="sh-q"><b>문제 ${qi + 1}</b>${q.q}</div>
        <div class="sh-ans">${q.a.map((a, i) => `<button data-i="${i}" class="${shPhase !== 'quiz' && i === q.c ? 'ok' : ''} ${shPhase === 'wrong' && i === shPick ? 'no' : ''}">${num[i]} ${a}</button>`).join('')}</div>
        <div class="sh-why">${shPhase === 'right' ? '정답이에요! 상점 문이 열렸어요.' : shPhase === 'wrong' ? `아쉬워요! 정답은 ${num[q.c]}번이에요. 상점은 다음 스테이지를 클리어하면 다시 열려요.` : ''}</div>
        ${shPhase === 'right' ? '<button class="btn green" data-open>상점 들어가기 ▶</button>' : ''}`;
      if (shPhase === 'quiz') pn.querySelectorAll('.sh-ans button').forEach(b => b.addEventListener('click', () => {
        MP.Audio.unlock(); shPick = +b.dataset.i; const ok = shPick === q.c; MP.Save.shopAnswered(); sfx(ok ? 'quizOk' : 'quizNo');
        shPhase = ok ? 'right' : 'wrong'; if (!ok) { d.shopOpen = false; MP.Save.save(); } renderShop();
      }));
      on(pn, '[data-open]', () => { shPhase = 'buy'; renderShop(); });
    } else {
      pn.innerHTML = `<div class="sh-lead">다음 스테이지에서 쓸 아이템을 골라요 (아이템은 다음 스테이지에서만 쓸 수 있어요)</div><div class="sh-items">${Object.keys(MP.ITEMS).map(k => {
        const it = MP.ITEMS[k], own = d.items[k], can = (d.coins || 0) >= it.price;
        return `<div class="sh-item ${own ? 'own' : ''}"><span class="ico ${it.ico}"></span><h3>${it.name}</h3><p>${it.desc}</p><button class="sh-buy ${own ? 'own' : can ? 'ok' : 'no'}" data-k="${k}">${own ? '구매 완료' : `<span class="ico coin"></span>${it.price}`}</button></div>`;
      }).join('')}</div><div class="sh-why"></div>`;
      on(pn, '.sh-buy', (e, b) => {
        const k = b.dataset.k, it = MP.ITEMS[k], w = pn.querySelector('.sh-why');
        if (d.items[k]) { w.textContent = '이미 샀어요!'; return; }
        if (MP.Save.buy(k)) { sfx('upgrade'); renderShop(); screens.shop.querySelector('.sh-why').textContent = it.name + '을(를) 샀어요! 다음 스테이지에서 자동으로 쓰여요.'; }
        else { sfx('nope'); w.textContent = `코인이 부족해요! (${it.price - (d.coins || 0)}개 더 필요)`; }
      });
    }
  }
  on(screens.shop, '.sh-exit', () => {
    if (shPhase !== 'quiz') { S().shopOpen = false; MP.Save.save(); }        // the visit is used up once the question was answered
    if (shFrom === 'clear' && lastClear) UI.clear(lastClear); else UI.stages();
  });

  // ---------- ending + quiz ----------
  make('ending', 'ov', `<div class="panel"><h2>축하해요! 최종 클리어!</h2><div class="big2" style="font-size:24px">마그넷 타이탄을 물리치고 전자석 박사가 되었어요!</div><div class="res"><span>최종 결전 점수</span><b id="endScore"></b></div>
    <div class="tip" style="max-width:none;width:100%"><b>우리가 배운 전자석의 원리</b><ol>${MP.SCIENCE.map(s => `<li>${s.t}</li>`).join('')}</ol></div>
    <div class="row"><button class="btn big" style="font-size:34px;padding:12px 44px" data-a="quiz">과학 퀴즈 풀기</button><button class="btn" data-a="menu">메뉴로</button></div></div>`);
  UI.ending = r => { document.getElementById('endScore').textContent = r.score.toLocaleString(); UI.show('ending'); MP.Audio.music('WIN'); };
  on(screens.ending, '[data-a]', (e, b) => { if (b.dataset.a === 'quiz') UI.quiz(); else UI.menu(); });
  make('quiz', 'ov', `<div class="panel"></div>`);
  let qi = 0, qScore = 0;
  UI.quiz = () => { qi = 0; qScore = 0; renderQ(); UI.show('quiz'); MP.Audio.music('WIN'); };
  function renderQ() {
    const p = screens.quiz.querySelector('.panel'), Q = MP.QUIZ;
    if (qi >= Q.length) {
      S().quizBest = Math.max(S().quizBest || 0, qScore); MP.Save.save();
      p.innerHTML = `<h2>퀴즈 결과</h2><div class="q">${Q.length}문제 중 <b style="color:#ff7a00;font-weight:normal">${qScore}문제</b> 정답!</div><div class="why">${qScore === Q.length ? '완벽해요! 진정한 전자석 박사예요!' : qScore >= 4 ? '훌륭해요! 과학 교실에서 한 번 더 복습해 봐요.' : '과학 교실에서 다시 살펴보고 또 도전해요!'}</div><div class="row"><button class="btn green" data-a="again">다시 풀기</button><button class="btn" data-a="sci">과학 교실</button><button class="btn" data-a="menu">메뉴로</button></div>`;
      on(p, '[data-a]', (e, b) => { const a = b.dataset.a; if (a === 'again') UI.quiz(); else if (a === 'sci') UI.science(); else UI.menu(); });
      return;
    }
    const q = Q[qi];
    p.innerHTML = `<div class="prog">과학 퀴즈 ${qi + 1} / ${Q.length}</div><div class="q">${q.q}</div><div class="ans">${q.a.map((a, i) => `<button data-i="${i}">${a}</button>`).join('')}</div><div class="why"></div><button class="btn green" data-next hidden>${qi + 1 < Q.length ? '다음 문제 ▶' : '결과 보기 ▶'}</button>`;
    let answered = false;
    p.querySelectorAll('.ans button').forEach(b => b.addEventListener('click', () => {
      if (answered) return; answered = true; MP.Audio.unlock(); const i = +b.dataset.i, ok = i === q.c; if (ok) qScore++;
      sfx(ok ? 'quizOk' : 'quizNo'); b.classList.add(ok ? 'ok' : 'no'); p.querySelector(`.ans button[data-i="${q.c}"]`).classList.add('ok');
      p.querySelector('.why').textContent = (ok ? '정답! ' : '아쉬워요! ') + q.why; p.querySelector('[data-next]').hidden = false;
    }));
    on(p, '[data-next]', () => { qi++; renderQ(); });
  }
})();
