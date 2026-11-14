// MAGNET POP - static game data (stages, monsters, upgrades, texts)
(function () {
  const MP = window.MP = window.MP || {};
  MP.VERSION = 16;               // shown on the title screen; also stamped on file URLs (index.html, sw.js)
  MP.W = 1280; MP.H = 720; MP.GROUND = 625;
  MP.DT = 1 / 120;

  // ---- electromagnet upgrades: exactly two parts, exactly three levels each ----
  MP.UPG = {
    maxLevel: 3,
    batt: { count: [1, 2, 3], pull: [1, 1.55, 2.2], cost: [0, 100, 200] },      // cost to reach level 2 / level 3
    coil: { turns: [10, 20, 30], range: [230, 310, 400], field: [1, 1.3, 1.65], cost: [0, 100, 200] },
  };
  MP.stats = function (b, c) {
    const U = MP.UPG, pull = U.batt.pull[b - 1] * U.coil.field[c - 1];
    return {
      batteries: U.batt.count[b - 1], turns: U.coil.turns[c - 1],
      range: U.coil.range[c - 1],                 // magnetic field reach (px)
      pull,                                        // absorption strength multiplier
      shot: 1 + (b + c - 2) * 0.25,               // launch power multiplier (speed / knock-back / bonus damage)
      shotBonus: Math.floor((b + c - 2) / 2),     // extra damage 0..2
    };
  };
  MP.HOLD_MAX = 5;
  MP.HEARTS = 5;
  MP.JUMP = 974;                 // jump take-off speed (px/s); 10% stronger than the original 885

  // ---- monsters ----  w/h = hit box, weight = how hard to pull, iron = reacts to the electromagnet
  MP.MON = {
    ball:   { name: '철구 몬스터',   w: 58,  h: 66,  speed: 118, hp: 1, weight: 1,   score: 100, drop: 1, ai: 'walk',   iron: true },
    robot:  { name: '철갑 로봇',     w: 62,  h: 84,  speed: 152, hp: 1, weight: 1.1, score: 150, drop: 1, ai: 'jumper', iron: true },
    slime:  { name: '고철 슬라임',   w: 72,  h: 54,  speed: 185, hp: 1, weight: 1,   score: 150, drop: 1, ai: 'hop',    iron: true },
    bug:    { name: '자석 벌레',     w: 80,  h: 46,  speed: 172, hp: 1, weight: 1.2, score: 200, drop: 2, ai: 'dash',   iron: true },
    bat:    { name: '철제 박쥐',     w: 60,  h: 56,  speed: 190, hp: 1, weight: 0.9, score: 200, drop: 2, ai: 'fly',    iron: true },
    golem:  { name: '철판 골렘',     w: 96,  h: 112, speed: 78,  hp: 3, weight: 2.6, score: 500, drop: 4, ai: 'thrower', iron: true },
    bigbot: { name: '대형 철제 로봇', w: 104, h: 140, speed: 98,  hp: 4, weight: 3.4, score: 800, drop: 6, ai: 'charger', iron: true },
    wood:    { name: '나무 상자',     w: 62, h: 70, speed: 105, hp: 1, weight: 1, score: 200, drop: 2, ai: 'walk', iron: false, mat: '나무' },
    plastic: { name: '플라스틱 오리', w: 66, h: 66, speed: 155, hp: 1, weight: 1, score: 200, drop: 2, ai: 'walk', iron: false, mat: '플라스틱' },
    alu:     { name: '알루미늄 캔',   w: 54, h: 74, speed: 125, hp: 1, weight: 1, score: 200, drop: 2, ai: 'walk', iron: false, mat: '알루미늄' },
    // boss parts handled like iron objects
    shield: { name: '철제 방패', w: 70, h: 100, speed: 0, hp: 99, weight: 1.6, score: 100, drop: 0, ai: 'static', iron: true, part: 'shield' },
    pod:    { name: '전원 건전지', w: 60, h: 90, speed: 0, hp: 99, weight: 1.6, score: 300, drop: 0, ai: 'static', iron: true, part: 'podOn', anchor: 1.5 },
  };

  // ---- stages ----
  // Platform: P(x, y, width, options). options: move {ax,range,period}, kind 'vanish' | 'crumble' | 'spring', belt (conveyor speed), phase.
  // Waves are lists of monster letters; where each monster appears is chosen when the wave starts (see Game.pickSlot).
  const P = (x, y, w, o) => Object.assign({ x, y, w }, o || {});
  const mv = (ax, range, period) => ({ move: { ax, range, period } });
  const VAN = ph => ({ kind: 'vanish', phase: ph || 0 }), CRU = { kind: 'crumble' }, SPR = { kind: 'spring' };
  const T = { b: 'ball', r: 'robot', s: 'slime', g: 'bug', t: 'bat', G: 'golem', B: 'bigbot', w: 'wood', p: 'plastic', a: 'alu' };
  const W = list => list.map(w => [...w].map(c => T[c]));
  // reward = total upgrade materials for the first clear of the stage (monster drops + clear bonus)
  MP.STAGES = [null,
    { name: '초원의 첫 만남', world: 1, reward: 10, bgm: 'A', tutorial: true,
      plats: [P(448, 465, 384), P(160, 330, 192), P(928, 330, 192)],
      waves: W(['b', 'bb', 'bbb', 'bbb']) },
    { name: '숲속의 철갑 로봇', world: 1, reward: 12, bgm: 'A',
      plats: [P(64, 470, 288), P(928, 470, 288), P(448, 345, 384), P(160, 312, 192, VAN(0)), P(928, 312, 192, VAN(2.5))],
      waves: W(['rb', 'rrb', 'rbb', 'rrbb']) },
    { name: '슬라임 언덕', world: 1, reward: 14, bgm: 'A',
      plats: [P(0, 505, 192), P(224, 425, 192), P(448, 345, 384), P(864, 425, 192), P(1088, 505, 192)],
      waves: W(['ss', 'ssb', 'sssb', 'ssbb', 'sss']) },
    { name: '낡은 기계 공장', world: 2, reward: 16, bgm: 'B',
      plats: [P(208, 480, 288), P(784, 480, 288), P(0, 340, 288), P(992, 340, 288), P(448, 340, 384, { belt: 95 })],
      waves: W(['br', 'brr', 'bbrr', 'brrs', 'rrb']) },
    { name: '컨베이어 벨트', world: 2, reward: 18, bgm: 'B',
      plats: [P(64, 490, 384, { belt: 110 }), P(832, 490, 384, { belt: -110 }), P(112, 350, 288, mv('x', 300, 6)), P(880, 350, 288, mv('x', -300, 6)), P(544, 560, 192, SPR)],
      waves: W(['rs', 'rsg', 'rrss', 'rsgg', 'rrsb']) },
    { name: '고철의 습격', world: 2, reward: 40, bgm: 'B', upgradeAfter: true,
      plats: [P(96, 470, 288), P(896, 470, 288), P(448, 300, 384), P(544, 565, 192, SPR), P(160, 320, 192, CRU), P(928, 320, 192, CRU)],
      waves: W(['gg', 'grs', 'ggrb', 'grss', 'ggrrsb']) },
    { name: '나침반 숲', world: 3, reward: 20, bgm: 'A',
      plats: [P(0, 485, 288), P(992, 485, 288), P(496, 445, 288), P(208, 335, 288, VAN(0)), P(784, 335, 288, VAN(2.5))],
      waves: W(['tt', 'trg', 'ttrb', 'tgrr', 'ttgg', 'trb']) },
    { name: '회전하는 시계탑', world: 3, reward: 25, bgm: 'A',
      plats: [P(96, 400, 192, mv('y', 115, 5)), P(992, 400, 192, mv('y', -115, 5)), P(448, 300, 384), P(496, 470, 288), P(304, 380, 192, VAN(1)), P(784, 380, 192, VAN(3.5))],
      waves: W(['tt', 'trr', 'ttrs', 'trrs', 'tttr', 'rrs']) },
    { name: '컴퍼스 킹의 전령', world: 3, reward: 60, bgm: 'A', boss: 'king', upgradeAfter: true,
      plats: [P(48, 465, 288), P(944, 465, 288), P(496, 330, 288, VAN(0))],
      waves: W(['gg', 'ttr', 'ggtr', 'ttrr']) },
    { name: '전자석 실험실', world: 4, reward: 40, bgm: 'B',
      plats: [P(160, 485, 288), P(832, 485, 288), P(448, 350, 384, { belt: -100 }), P(64, 322, 192), P(1024, 322, 192), P(0, 570, 192, SPR)],
      waves: W(['rg', 'rgt', 'rrgt', 'sssg', 'rgtt', 'rrgg']) },
    { name: '강력한 자기장', world: 4, reward: 50, bgm: 'B',
      plats: [P(0, 465, 384), P(896, 465, 384), P(448, 325, 384, mv('y', 95, 6)), P(160, 310, 192, CRU), P(928, 310, 192, CRU)],
      waves: W(['Gb', 'Gbt', 'Gbbt', 'GGr', 'Gbrt', 'GGbb']) },
    { name: '금속 재료 시험장', world: 4, reward: 300, bgm: 'B', upgradeAfter: true, materials: true,
      plats: [P(112, 475, 288), P(880, 475, 288), P(496, 335, 288), P(160, 320, 192, VAN(0)), P(928, 320, 192, VAN(2.5)), P(544, 565, 192, SPR)],
      waves: W(['bw', 'bbp', 'bba', 'bbwp', 'bbra', 'bbwpa', 'bbrw']) },
    { name: '철의 협곡', world: 5, reward: 0, bgm: 'A',
      plats: [P(0, 430, 288), P(992, 430, 288), P(352, 430, 192, CRU), P(736, 430, 192, CRU), P(448, 300, 384), P(544, 565, 192, SPR)],
      waves: W(['Bt', 'Btg', 'BGt', 'Brrt', 'BGg', 'BGtt']) },
    { name: '타이탄의 전초기지', world: 5, reward: 0, bgm: 'A',
      plats: [P(96, 475, 288, mv('x', 200, 7)), P(896, 475, 288, mv('x', -200, 7)), P(448, 340, 384), P(0, 315, 192, VAN(0)), P(1088, 315, 192, VAN(2.5)), P(544, 570, 192, SPR)],
      waves: W(['Gg', 'Bgt', 'BGg', 'GGss', 'Brgt', 'BGrt', 'BBgst']) },
    { name: '마지막 관문', world: 5, reward: 0, bgm: 'A',
      plats: [P(64, 485, 480), P(736, 485, 480), P(352, 345, 576, { belt: 115 }), P(64, 322, 192, VAN(0)), P(1024, 305, 192, mv('y', 80, 5)), P(544, 575, 192, CRU)],
      waves: W(['BG', 'Bgt', 'BGtg', 'GGrs', 'BBtt', 'BGgs', 'BGrr', 'BBGg', 'BBGtg']) },
    { name: '마그넷 타이탄 최종 결전', world: 5, reward: 0, bgm: 'BOSS', boss: 'titan', final: true,
      plats: [P(400, 465, 288), P(64, 330, 288), P(160, 570, 192, SPR)], waves: [] },
  ];
  MP.WORLDS = [null, '철의 초원', '고철 공장', '나침반의 성', '전자석 연구소', '마그넷 타이탄의 요새'];
  MP.THEME = [null, 'meadow', 'factory', 'compass', 'lab', 'fortress'];
  // clear bonus so that drops + bonus = reward
  // stages 13-16 come after the last upgrade chance: they award score only (no more upgrade materials).
  // Drops are scaled so that monster drops + clear bonus always add up to exactly `reward`.
  MP.STAGES.forEach((s, i) => {
    if (!s) return; s.n = i; s.noMats = i >= 13; s.count = s.waves.reduce((a, w) => a + w.length, 0);
    let nat = 0; s.waves.forEach(w => w.forEach(t => nat += MP.MON[t].drop)); const boss = s.boss === 'king' ? 10 : 0;
    s.dropScale = s.noMats || !nat ? 0 : Math.min(1, (s.reward - boss) * 0.7 / nat); s.total = s.noMats ? 0 : s.reward;
  });

  // ---- shop: answer a question to open it; items bought here work only in the next stage that is started ----
  MP.ITEMS = {
    heart:  { name: '하트', desc: '하트 1개를 더 가지고 시작해요', price: 10, ico: 'heart' },
    shield: { name: '전자 보호막', desc: '25초 동안 몬스터의 공격을 막아 줘요', price: 15, dur: 25, ico: 'shield' },
    boots:  { name: '스피드 부츠', desc: '25초 동안 더 빨리 달려요', price: 12, dur: 25, ico: 'boots' },
    magnet: { name: '초강력 자석', desc: '25초 동안 흡수 범위가 넓어져요', price: 15, dur: 25, ico: 'smagnet' },
  };
  MP.SHOP_Q = [
    { q: '전자석은 언제 자석의 성질을 나타낼까요?', a: ['에나멜선에 전류가 흐를 때', '에나멜선에 물을 부었을 때', '에나멜선을 차갑게 만들었을 때', '에나멜선을 나무에 감았을 때'], c: 0 },
    { q: '전자석의 세기를 더 강하게 만드는 방법은 무엇일까요?', a: ['에나멜선을 조금 풀어 준다.', '에나멜선을 더 많이 감는다.', '건전지를 회로에서 분리한다.', '에나멜선을 플라스틱 막대에 감는다.'], c: 1 },
    { q: '전자석의 양 끝에 나침반을 가까이 갖다 대면 어떻게 되나요?', a: ['나침반이 뜨거워진다.', '불빛이 난다.', '아무런 움직임이 없다.', '나침반이 움직인다.'], c: 3 },
    { q: '전자석에 연결된 건전지의 +극과 -극을 서로 바꾸면 어떻게 될까요?', a: ['전자석이 뽀로로가 된다.', '전자석의 세기가 반드시 2배가 된다.', '전자석의 N극과 S극이 서로 바뀐다.', '전자석이 나무를 끌어당기게 된다.'], c: 2 },
    { q: '건전지 1개를 연결했을 때와 3개를 직렬로 연결했을 때, 어느 쪽 전자석의 자력이 더 강할까요?', a: ['건전지 1개를 연결했을 때', '둘 다 똑같다.', '건전지 3개를 직렬로 연결했을 때', '건전지 개수와 자력은 관계가 없다.'], c: 2 },
  ];

  // ---- one-line science tips shown on the clear screen ----
  MP.TIPS = [null,
    '전류가 흐르면 코일 주변에 자기장이 생겨요. 그래서 전자석이 철을 끌어당겨요!',
    '전류를 끊으면 전자석의 자기장이 약해져서 붙어 있던 철이 떨어져요.',
    '전자석은 스위치로 켜고 끌 수 있어서 영구 자석보다 편리할 때가 많아요.',
    '철처럼 자석에 잘 붙는 물질을 강자성체라고 해요.',
    '고철 처리장의 커다란 크레인도 전자석으로 철을 들어 올린답니다.',
    '건전지를 직렬로 연결하면 전압이 높아져요. 전자석을 강화해 보세요!',
    '나침반 바늘도 작은 자석이에요. 그래서 주변 자기장의 영향을 받아요.',
    '전자석 가까이에 나침반을 두면 바늘이 가리키는 방향이 바뀌어요.',
    '전류가 일정할 때, 코일을 많이 감을수록 자기장이 세져요.',
    '전류의 세기는 전압뿐 아니라 회로의 저항에 따라서도 달라져요.',
    '전자석의 세기는 전류의 세기와 코일을 감은 횟수에 따라 달라져요.',
    '나무, 플라스틱, 알루미늄은 전자석에 철처럼 끌려오지 않아요.',
    '전자석은 스피커, 전동기, 자기 부상 열차에도 쓰여요.',
    '에나멜선은 겉이 얇게 코팅된 구리선이에요. 코일을 만들 때 써요.',
    '이제 마지막 결전! 지금까지 배운 전자석의 원리를 모두 활용해요.',
    '전류를 끊으면 자기장이 사라진다는 원리로 타이탄을 물리쳤어요!',
  ];

  // ---- science classroom ----
  MP.SCIENCE = [
    { t: '전류가 흐르면 자기장이 생겨요', d: '에나멜선을 감은 코일에 전류가 흐르면 코일 주변에 자기장이 생겨요. 이렇게 만든 자석을 전자석이라고 해요.', pic: 'field' },
    { t: '전류를 끊으면 자기장이 약해져요', d: '스위치를 꺼서 전류를 끊으면 전자석의 자기장이 약해져서 붙어 있던 철이 떨어져요. 게임에서 버튼을 놓으면 몬스터가 발사되는 이유예요!', pic: 'onoff' },
    { t: '철은 전자석에 끌려와요', d: '철은 전자석에 잘 끌려와요. 하지만 나무, 플라스틱, 알루미늄은 전자석에 철처럼 끌려오지 않아요.', pic: 'materials' },
    { t: '건전지를 직렬로 연결하면 전압이 높아져요', d: '건전지 여러 개를 한 줄로(직렬로) 연결하면 전압이 높아져서 더 센 전류를 흐르게 할 수 있어요. 실제 전류의 세기는 회로의 저항에 따라서도 달라져요.', pic: 'battery' },
    { t: '코일을 많이 감으면 자기장이 세져요', d: '전류가 일정할 때, 코일을 감은 횟수가 많을수록 전자석의 자기장이 세져요. 10회보다 30회 감은 전자석이 더 멀리, 더 세게 끌어당겨요.', pic: 'coil' },
    { t: '나침반 바늘은 자기장의 영향을 받아요', d: '나침반 바늘은 작은 자석이에요. 전자석을 가까이 가져가면 바늘이 전자석의 자기장 때문에 움직여요. 컴퍼스 킹이 어지러워한 이유랍니다!', pic: 'compass' },
  ];
  MP.QUIZ = [
    { q: '전자석에 전류가 흐르면 코일 주변에 무엇이 생길까요?', a: ['자기장', '바람', '소리', '그림자'], c: 0, why: '전류가 흐르는 코일 주변에는 자기장이 생겨요.' },
    { q: '전자석의 전류를 끊으면 어떻게 될까요?', a: ['자기장이 더 세진다', '자기장이 약해져 철이 떨어진다', '아무 변화가 없다', '코일이 길어진다'], c: 1, why: '전류를 끊으면 자기장이 약해져서 붙어 있던 철이 떨어져요.' },
    { q: '다음 중 전자석에 잘 끌려오는 물체는 무엇일까요?', a: ['나무 상자', '플라스틱 오리', '철구', '알루미늄 캔'], c: 2, why: '철은 전자석에 잘 끌려오지만 나무, 플라스틱, 알루미늄은 그렇지 않아요.' },
    { q: '건전지 여러 개를 직렬로 연결하면 무엇이 높아질까요?', a: ['전압', '코일의 감은 수', '건전지의 무게만', '나침반의 크기'], c: 0, why: '건전지를 직렬로 연결하면 전압이 높아져요.' },
    { q: '전류가 일정할 때 전자석을 더 세게 만들려면 어떻게 해야 할까요?', a: ['코일을 풀어 버린다', '코일을 더 많이 감는다', '철심을 나무로 바꾼다', '스위치를 끈다'], c: 1, why: '전류가 일정할 때 코일을 감은 횟수가 많을수록 자기장이 세져요.' },
    { q: '전자석을 나침반 가까이에 가져가면 나침반 바늘은 어떻게 될까요?', a: ['아무 변화가 없다', '바늘이 사라진다', '바늘이 자기장의 영향을 받아 움직인다', '바늘이 녹는다'], c: 2, why: '나침반 바늘은 작은 자석이라 주변 자기장의 영향을 받아 움직여요.' },
  ];
})();
