/* 城市更新沙盒｜場景與規則資料
 * 示範街廓為虛構，位置、尺度與屋齡參照新北市板橋區舊市區的常見樣態；不是任何真實建案。
 * 座標：x 向東、z 向南（m）；原點＝更新單元中心。
 */
(function () {
  'use strict';

  // ── 小工具：可重現的亂數 ───────────────────────────────────────
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const R = (x0, z0, x1, z1) => [x0, z0, x1, z1];
  const PING = 3.305785;
  const ping = (m2) => m2 / PING;

  // ── 基本設定 ─────────────────────────────────────────────────
  const GEO = { lat: 25.01, lon: 121.46, tzMeridian: 120, place: '新北市板橋區（示意位置）' };
  const ZONES = {
    res: { label: '住宅區', bcr: 0.5, far: 3.0, color: '--z-res' },
    com: { label: '商業區', bcr: 0.7, far: 4.4, color: '--z-com' },
    park: { label: '公園用地', color: '--z-park' },
    school: { label: '學校用地', color: '--z-school' },
    road: { label: '道路用地', color: '--z-road' },
  };

  // ── 道路（含人行道寬度）────────────────────────────────────────
  const ROADS = [
    { id: 'main', name: '20 m 計畫道路', width: 20, rect: R(-320, -40, 330, -20), axis: 'x', walk: 3, tier: 'emergency' },
    { id: 'north', name: '15 m 計畫道路', width: 15, rect: R(-320, -125, 330, -110), axis: 'x', walk: 2.5, tier: 'rescue' },
    { id: 'south', name: '10 m 計畫道路', width: 10, rect: R(-320, 20, 330, 30), axis: 'x', walk: 1.5, tier: 'aux' },
    { id: 'south2', name: '12 m 計畫道路', width: 12, rect: R(-320, 100, 330, 112), axis: 'x', walk: 2, tier: 'aux' },
    { id: 'west', name: '12 m 計畫道路', width: 12, rect: R(-44, -125, -32, 112), axis: 'z', walk: 2, tier: 'aux' },
    { id: 'east', name: '8 m 巷道', width: 8, rect: R(32, -20, 40, 30), axis: 'z', walk: 0, tier: 'lane' },
    { id: 'eastN', name: '8 m 巷道', width: 8, rect: R(32, -110, 40, -40), axis: 'z', walk: 0, tier: 'lane' },
    { id: 'x0', name: '12 m 計畫道路', width: 12, rect: R(-136, -125, -124, 112), axis: 'z', walk: 2, tier: 'aux' },
    { id: 'x3', name: '12 m 計畫道路', width: 12, rect: R(120, -125, 132, 112), axis: 'z', walk: 2, tier: 'aux' },
    { id: 'x4', name: '12 m 計畫道路', width: 12, rect: R(212, -125, 224, 112), axis: 'z', walk: 2, tier: 'aux' },
  ];
  const ROAD_TIERS = {
    emergency: { label: '緊急道路（20 m 以上）', token: '--route-a' },
    rescue: { label: '救援輸送道路（15 m 以上）', token: '--route-b' },
    aux: { label: '避難輔助道路（8 m 以上）', token: '--route-c' },
    lane: { label: '巷道', token: '--route-c' },
  };

  // ── 更新單元（基地）──────────────────────────────────────────
  const SITE = {
    rect: R(-32, -20, 32, 20),
    area: 2560,
    zone: 'res',
    name: '示範更新單元',
    address: '板橋區某段（虛構）',
    roadsNote: '北臨 20 m 計畫道路、西臨 12 m 計畫道路、南臨 10 m 計畫道路、東臨 8 m 巷道（完整街廓）',
  };

  // 現況建物：每戶都是可點選的單元（權變試算用）
  // floorsUse：每層用途；fac：更新前估價的樓層效用（示範假設）
  const OLD = [
    { id: 'A', name: 'A 棟公寓', rect: R(-30, -20, -2, -8), floors: 5, year: 1979, struct: 'RC', arcade: 'N', roofAdd: true,
      unitsPerFloor: 4, split: 'x', shopFloor1: true, note: '1 樓店面＋騎樓、2–5 樓住宅，無電梯；頂樓有加蓋' },
    { id: 'B', name: 'B 棟公寓', rect: R(2, -20, 30, -8), floors: 5, year: 1980, struct: 'RC', arcade: 'N', roofAdd: true,
      unitsPerFloor: 4, split: 'x', shopFloor1: true, note: '1 樓店面＋騎樓、2–5 樓住宅，無電梯；頂樓有加蓋' },
    { id: 'C', name: 'C 棟公寓', rect: R(-30, -3, -6, 9), floors: 4, year: 1982, struct: 'RC', roofAdd: true,
      unitsPerFloor: 3, split: 'x', note: '4 樓公寓，無電梯；1 樓住戶有前院' },
    { id: 'D', name: 'D 棟公寓', rect: R(6, -3, 26, 9), floors: 4, year: 1983, struct: 'RC',
      unitsPerFloor: 2, split: 'x', note: '4 樓公寓，無電梯' },
    { id: 'E', name: 'E 排透天', rect: R(8, 11, 31, 19), floors: 2, year: 1965, struct: '加強磚造',
      unitsPerFloor: 3, split: 'x', house: true, note: '3 戶兩層透天，加強磚造' },
    { id: 'F', name: 'F 排街屋', rect: R(-30, 12, 2, 19), floors: 3, year: 1972, struct: '加強磚造',
      unitsPerFloor: 4, split: 'x', house: true, note: '4 戶三層街屋，1 樓為小店與住家' },
  ];
  const OLD_FAC = { shop: 1.9, f1: 1.05, f2: 1.0, f3: 0.98, f4: 0.95, f5: 0.93, house: 1.2 };

  // 由現況建物展開成「戶」
  function expandOldUnits() {
    const units = [];
    OLD.forEach((b) => {
      const [x0, z0, x1, z1] = b.rect;
      const w = (x1 - x0) / b.unitsPerFloor;
      const d = z1 - z0;
      if (b.house) {
        for (let k = 0; k < b.unitsPerFloor; k++) {
          const m2 = w * d * b.floors;
          units.push({
            id: `${b.id}${k + 1}`, bld: b.id, floor: 0, k, label: `${b.name} 第 ${k + 1} 戶（${b.floors} 層透天）`,
            rect: R(x0 + k * w, z0, x0 + (k + 1) * w, z1), m2, ping: ping(m2), fac: OLD_FAC.house, kind: 'house',
          });
        }
        return;
      }
      for (let f = 1; f <= b.floors; f++) {
        for (let k = 0; k < b.unitsPerFloor; k++) {
          const m2 = w * d;
          const shop = b.shopFloor1 && f === 1;
          const fac = shop ? OLD_FAC.shop : f === 1 ? OLD_FAC.f1 : f === b.floors ? (b.floors === 5 ? OLD_FAC.f5 : OLD_FAC.f4) : OLD_FAC['f' + f] || 0.97;
          units.push({
            id: `${b.id}-${f}F-${k + 1}`, bld: b.id, floor: f, k, label: `${b.name} ${f} 樓之 ${k + 1}${shop ? '（店面）' : ''}`,
            rect: R(x0 + k * w, z0, x0 + (k + 1) * w, z1), m2, ping: ping(m2), fac, kind: shop ? 'shop' : 'flat',
          });
        }
      }
    });
    return units;
  }
  const OLD_UNITS = expandOldUnits();
  const OLD_FA = OLD.reduce((s, b) => s + (b.rect[2] - b.rect[0]) * (b.rect[3] - b.rect[1]) * b.floors, 0);
  const OLD_COVER = OLD.reduce((s, b) => s + (b.rect[2] - b.rect[0]) * (b.rect[3] - b.rect[1]), 0);

  // ── 更新後（都更）設計：裙樓＋塔樓 ───────────────────────────────
  const URBAN = {
    setbacks: { N: 4, W: 4, S: 4, E: 2 },
    podium: { rect: R(-14, -14, 28, 12), floors: [
      { id: '1F', h: 4.5, fa: 900, use: 'shop', label: '1F 店面＋大廳＋車道口' },
      { id: '2F', h: 4.2, fa: 900, use: 'civic', label: '2F 公益設施（社區長照據點＋親子館）' },
    ] },
    tower: { rect: R(-6, -12, 24, 8), typicalFA: 510, typH: 3.2, plateM2: 600 },
    roofH: 6,
    plaza: R(-28, -16, -14, 16),
    basement: { rect: R(-26, -14, 28, 14), levelH: 3.4 },
    lobby: [8, -15],
    carEntry: [31, 2],
    // 標準層 8 戶（tower.rect 內的位置；m2 為主建物＋附屬）：南側 4 戶、北側 4 戶，中間梯廳
    plan: [
      { id: 'A', rect: R(-6, -2, 2.5, 8), m2: 85, type: '3 房' },
      { id: 'B', rect: R(2.5, -2, 8.7, 8), m2: 62, type: '2 房' },
      { id: 'C', rect: R(8.7, -2, 15.5, 8), m2: 68, type: '2 房' },
      { id: 'D', rect: R(15.5, -2, 24, 8), m2: 85, type: '3 房' },
      { id: 'E', rect: R(-6, -12, -1, -4), m2: 40, type: '1 房' },
      { id: 'F', rect: R(-1, -12, 4, -4), m2: 40, type: '1 房' },
      { id: 'G', rect: R(12, -12, 17, -4), m2: 40, type: '1 房' },
      { id: 'H', rect: R(17, -12, 24, -4), m2: 56, type: '2 房' },
    ],
    core: R(4, -12, 12, -4),
    corridor: R(-6, -4, 24, -2),
    shareRatio: 0.34, // 公設比（新北 2025 年新案平均約 34.7%）
    shops: [{ ping: 32 }, { ping: 30 }, { ping: 30 }, { ping: 28 }],
  };

  // ── 危老：四宗基地分別重建 ──────────────────────────────────────
  const DANGEROUS = [
    { id: 'P1', lot: R(-32, -20, 0, -5), olds: ['A'], bld: R(-28, -16, -2, -7.5), setback: '北 4 m 無遮簷人行道' },
    { id: 'P2', lot: R(0, -20, 32, -5), olds: ['B'], bld: R(2, -16, 29, -7.5), setback: '北 4 m 無遮簷人行道' },
    { id: 'P3', lot: R(-32, -5, 4, 20), olds: ['C', 'F'], bld: R(-28, -2, -3, 16), setback: '西 4 m、南 4 m' },
    { id: 'P4', lot: R(4, -5, 32, 20), olds: ['D', 'E'], bld: R(6, -2, 28, 13.8), setback: '南 4 m、東 2 m' },
  ];

  // ── 容積獎勵規則 ───────────────────────────────────────────────
  // 中央《都市更新建築容積獎勵辦法》（2025-01-13 修正）、《危險及老舊建築物建築容積獎勵辦法》（2025-03-04 修正）。
  // 百分比為基準容積的比例；條號與數字以全國法規資料庫為準，查核狀態寫在 conf（high／medium）。
  const opt = (id, label, pct) => ({ id, label, pct });
  const LEVELS = [opt('none', '不申請', 0), opt('l2', '合格級', 0.02), opt('l4', '銅級', 0.04), opt('l6', '銀級', 0.06), opt('l8', '黃金級', 0.08), opt('l10', '鑽石級', 0.1)];
  const ROUTES = {
    urban: {
      id: 'urban',
      name: '都市更新',
      short: '都更',
      law: '都市更新條例 §65；都市更新建築容積獎勵辦法',
      consent: '自行劃定更新單元：私有土地與合法建物所有權人數、面積均須超過 4/5 同意（都更條例 §37）',
      years: '約 7–10 年：事業計畫與權利變換審議 3–5 年，施工約 4 年',
      groups: {},
      cap: (ctx) => {
        const base = ctx.area * ctx.far;
        if (ctx.origFA > base) {
          const opts = [[base * 1.5, '1.5 倍基準容積'], [base * 0.3 + ctx.origFA, '0.3 倍基準容積＋原建築容積'], [ctx.origFA * 1.2, '1.2 倍原建築容積']];
          opts.sort((a, b) => b[0] - a[0]);
          return { fa: opts[0][0], label: opts[0][1] };
        }
        return { fa: base * 1.5, label: '1.5 倍基準容積' };
      },
      local: '新北市另有地方獎勵（上限 0.2 倍基準容積），條文本次未能查證，未列入試算。',
      items: [
        { id: 'orig', type: 'orig', label: '原建築容積高於基準容積', law: '辦法 §5', conf: 'high',
          note: '可依原建築容積重建，或給予基準容積 10%。本案原容積約 254%，低於基準 300%，不適用。' },
        { id: 'struct', type: 'pick', label: '結構安全', law: '辦法 §6', conf: 'high', note: '兩款擇一，不得重複。',
          options: [opt('none', '不申請', 0), opt('s8', '結構安全性能評估未達最低等級', 0.08), opt('s10', '經通知限期拆除或有危險之虞', 0.1)] },
        { id: 'donate', type: 'pick', label: '捐贈公益設施', law: '辦法 §7', conf: 'high', note: '樓地板面積 × 係數（通常為 1），上限 30%。捐出的樓層不能出售。',
          options: [opt('none', '不捐贈（2F 作店鋪辦公出售）', 0), opt('d2f', '捐贈 2F 長照據點＋親子館 900 ㎡', 900 / 7680)] },
        { id: 'green', type: 'pick', label: '綠建築標章', law: '辦法 §10', conf: 'high', options: LEVELS },
        { id: 'smart', type: 'pick', label: '智慧建築標章', law: '辦法 §11', conf: 'high', options: LEVELS },
        { id: 'access', type: 'pick', label: '無障礙環境', law: '辦法 §12', conf: 'high',
          options: [opt('none', '不申請', 0), opt('a3', '住宅性能評估 第二級', 0.03), opt('a4', '住宅性能評估 第一級', 0.04), opt('a5', '無障礙住宅建築標章', 0.05)] },
        { id: 'seismic', type: 'pick', label: '耐震設計', law: '辦法 §13', conf: 'high',
          options: [opt('none', '不申請', 0), opt('e2', '住宅性能評估 第三級', 0.02), opt('e4', '住宅性能評估 第二級', 0.04), opt('e6', '住宅性能評估 第一級', 0.06), opt('e10', '耐震標章', 0.1)] },
        { id: 'time', type: 'pick', label: '時程獎勵', law: '辦法 §14', conf: 'medium', note: '2019-05-15 起 5 年內較高，之後減半；此處用 2026 年適用值。',
          options: [opt('none', '不適用', 0), opt('t35', '未經劃定（自行劃定更新單元）', 0.035), opt('t5', '位於劃定更新地區', 0.05)] },
        { id: 'scale', type: 'pick', label: '規模獎勵', law: '辦法 §15', conf: 'medium', note: '完整街廓 5%；3,000 ㎡ 以上另有級距，擇一。',
          options: [opt('none', '不適用', 0), opt('block', '更新單元為完整計畫街廓', 0.05)] },
        { id: 'coop', type: 'pick', label: '協議合建', law: '辦法 §16', conf: 'medium', note: '20 戶門牌以上、報核時全體同意。本案以權利變換為主，預設不列。',
          options: [opt('none', '不適用', 0), opt('c5', '全體同意協議合建', 0.05)] },
        { id: 'draft', type: 'pick', label: '草案：捐贈社宅或婚育宅', law: '行政院 2026-07-16 草案（未三讀）', conf: 'medium', outsideCap: true,
          note: '尚未完成立法，只供情境比較。草案將都更上限提高至 2 倍基準容積。',
          options: [opt('none', '現行法（不列入）', 0), opt('x20', '情境：捐贈社宅 +20%', 0.2), opt('x50', '情境：草案上限 +50%', 0.5)] },
      ],
      defaults: { struct: 's8', donate: 'd2f', green: 'l8', smart: 'l4', access: 'a3', seismic: 'e6', time: 't35', scale: 'block', coop: 'none', draft: 'none' },
    },
    dangerous: {
      id: 'dangerous',
      name: '危老重建',
      short: '危老',
      law: '危老條例 §6；危險及老舊建築物建築容積獎勵辦法',
      consent: '重建計畫範圍內土地及合法建物所有權人 100% 同意（危老條例 §5），一人反對就無法申請',
      years: '約 4–5 年：重建計畫審核數月，施工 3–4 年；申請期限 2027-05-31（修法草案擬刪除）',
      groups: { timeScale: { cap: 0.1, label: '時程＋規模' } },
      cap: (ctx) => {
        const base = ctx.area * ctx.far;
        const a = base * 1.3, b = ctx.origFA * 1.15;
        return a >= b ? { fa: a, label: '1.3 倍基準容積' } : { fa: b, label: '1.15 倍原建築容積' };
      },
      local: '危老獎勵不得與其他法令的容積獎勵重複申請。',
      items: [
        { id: 'orig', type: 'orig', label: '原建築容積高於基準容積', law: '辦法 §3', conf: 'medium', note: '依原建築容積重建，或給予基準容積 10%，擇優。' },
        { id: 'struct', type: 'pick', label: '結構安全', law: '辦法 §4', conf: 'high', note: '三款擇一。',
          options: [opt('none', '不申請', 0), opt('s6', '耐震能力未達一定標準', 0.06), opt('s8', '結構安全性能評估未達最低等級', 0.08), opt('s10', '經通知限期拆除或有危險之虞', 0.1)] },
        { id: 'setback', type: 'pick', label: '退縮建築', law: '辦法 §5', conf: 'high', note: '退縮部分淨空、設無遮簷人行步道，與鄰地至少留 2 m。',
          options: [opt('none', '不退縮', 0), opt('b8', '退縮 ≥ 2 m', 0.08), opt('b10', '退縮 ≥ 4 m', 0.1)] },
        { id: 'seismic', type: 'pick', label: '耐震設計', law: '辦法 §6', conf: 'high',
          options: [opt('none', '不申請', 0), opt('e2', '住宅性能評估 第三級', 0.02), opt('e4', '住宅性能評估 第二級', 0.04), opt('e6', '住宅性能評估 第一級', 0.06), opt('e10', '耐震標章', 0.1)] },
        { id: 'green', type: 'pick', label: '綠建築標章', law: '辦法 §7', conf: 'high', options: LEVELS },
        { id: 'smart', type: 'pick', label: '智慧建築標章', law: '辦法 §8', conf: 'high', options: LEVELS },
        { id: 'access', type: 'pick', label: '無障礙環境', law: '辦法 §9', conf: 'high',
          options: [opt('none', '不申請', 0), opt('a3', '住宅性能評估 第二級', 0.03), opt('a4', '住宅性能評估 第一級', 0.04), opt('a5', '無障礙住宅建築標章', 0.05)] },
        { id: 'scale', type: 'scale', label: '規模獎勵', law: '危老條例 §6 第 2 項', conf: 'high', group: 'timeScale', outsideCap: true,
          note: '200 ㎡ 起 2%，每增 100 ㎡ 加 0.5%；與時程獎勵合計 ≤ 10%，不受 1.3 倍上限限制。時程獎勵已於 2025-05-12 歸零。',
          scale: { min: 200, basePct: 0.02, stepArea: 100, stepPct: 0.005 } },
        { id: 'draft', type: 'pick', label: '草案：捐贈社宅或婚育宅', law: '行政院 2026-07-16 草案（未三讀）', conf: 'medium', outsideCap: true,
          note: '尚未完成立法，只供情境比較；草案總上限約 1.45 倍基準容積。',
          options: [opt('none', '現行法（不列入）', 0), opt('x15', '情境：草案上限 +15%', 0.15)] },
      ],
      defaults: { struct: 's8', setback: 'b10', seismic: 'e6', green: 'l6', smart: 'none', access: 'none', draft: 'none' },
    },
  };

  // 老宅延壽機能復新（內政部，2025–2027）
  const RENO = {
    rate: 0.65, capBuilding: 960, capElevator: 400, capFacade: 300, privateGeneral: 20, privateVulnerable: 30,
    budget: '50 億元特別預算，計畫至 2027-12-31',
    rules: ['屋齡 30 年以上住宅', '公寓至少選 3 項（共 8 項）、透天至少 1 項（共 4 項）', '公共空間先做，室內補助才適用'],
    progress: '截至 2026-10-22：22 縣市開辦、受理 1,359 件（透天 1,285、公寓 74）；第二梯次預計 2027 年 1–5 月，報導指公寓門檻可望放寬。',
    // 示範：A–D 四棟公寓各做電梯＋立面＋防水；工程費（萬元）為示範假設
    works: { elevator: 520, facade: 380, other: 160 },
  };

  // ── 鄰房（具名，懸停可看）與街區程序生成 ─────────────────────────
  const NAMED = [
    { id: 'N1', name: '北側住宅大樓', rect: R(-30, -66, -6, -44), floors: 15, year: 2003, struct: 'RC', use: '住宅', units: 56, elevator: true },
    { id: 'N2', name: '北側住宅', rect: R(0, -64, 30, -44), floors: 12, year: 1996, struct: 'RC', use: '住宅', units: 44, elevator: true },
    { id: 'N3', name: '北側公寓', rect: R(-30, -106, -4, -88), floors: 4, year: 1977, struct: 'RC', use: '住宅', units: 12, roofAdd: true },
    { id: 'N4', name: '北側公寓', rect: R(2, -106, 30, -90), floors: 5, year: 1981, struct: 'RC', use: '住宅', units: 15 },
    { id: 'E1', name: '東側公寓', rect: R(42, -18, 64, -6), floors: 5, year: 1978, struct: 'RC', use: '住宅', units: 15, roofAdd: true },
    { id: 'E2', name: '東側公寓', rect: R(42, 4, 60, 18), floors: 4, year: 1983, struct: 'RC', use: '住宅', units: 8 },
    { id: 'E3', name: '東側平房', rect: R(70, -18, 92, -8), floors: 2, year: 1962, struct: '加強磚造', use: '住宅', units: 3 },
    { id: 'E4', name: '東側住宅大樓', rect: R(96, -16, 118, 16), floors: 14, year: 2006, struct: 'RC', use: '住宅', units: 52, elevator: true },
    { id: 'E5', name: '東側華廈', rect: R(68, 2, 90, 18), floors: 7, year: 1990, struct: 'RC', use: '住商', units: 18, elevator: true },
    { id: 'NE1', name: '東北側住商（騎樓）', rect: R(42, -56, 78, -42), floors: 7, year: 1985, struct: 'RC', use: '住商', units: 24, arcade: 'S', elevator: true },
    { id: 'NW1', name: '西北側都更大樓', rect: R(-112, -96, -82, -68), floors: 26, year: 2021, struct: 'SRC', use: '住宅', units: 120, elevator: true },
    { id: 'NW2', name: '西北側住商（騎樓）', rect: R(-120, -56, -86, -42), floors: 5, year: 1984, struct: 'RC', use: '住商', units: 20, arcade: 'S' },
    { id: 'MK', name: '傳統市場', rect: R(140, 34, 176, 60), floors: 2, year: 1979, struct: 'RC', use: '市場', units: 0, keep: true },
    { id: 'S1', name: '國小教室（北棟）', rect: R(-28, 34, 56, 46), floors: 4, year: 1987, struct: 'RC', use: '學校', units: 0, keep: true },
    { id: 'S2', name: '國小教室（東棟）', rect: R(98, 34, 116, 92), floors: 4, year: 1994, struct: 'RC', use: '學校', units: 0, keep: true },
    { id: 'S3', name: '國小活動中心', rect: R(62, 34, 92, 52), floors: 2, floorH: 4.5, year: 2008, struct: 'RC', use: '學校', units: 0, keep: true },
  ];

  // 程序生成的街屋帶：front＝臨街面
  const STRIPS = [
    { rect: R(-204, -58, -136, -40), front: 'S', zone: 'com', arcade: true, mix: 'com' },
    { rect: R(-204, -110, -136, -94), front: 'N', zone: 'res', mix: 'res' },
    { rect: R(-82, -58, -46, -40), front: 'S', zone: 'com', arcade: true, mix: 'com' },
    { rect: R(-80, -110, -46, -96), front: 'N', zone: 'res', mix: 'res' },
    { rect: R(-124, -110, -114, -60), front: 'W', zone: 'res', mix: 'res' },
    { rect: R(80, -58, 118, -40), front: 'S', zone: 'com', arcade: true, mix: 'com' },
    { rect: R(42, -110, 118, -94), front: 'N', zone: 'res', mix: 'res' },
    { rect: R(96, -90, 118, -62), front: 'E', zone: 'res', mix: 'res' },
    { rect: R(134, -58, 210, -40), front: 'S', zone: 'com', arcade: true, mix: 'com' },
    { rect: R(134, -110, 210, -94), front: 'N', zone: 'res', mix: 'res' },
    { rect: R(-204, -20, -136, -6), front: 'N', zone: 'res', mix: 'res' },
    { rect: R(-204, 6, -136, 20), front: 'S', zone: 'res', mix: 'res' },
    { rect: R(146, -20, 210, -6), front: 'N', zone: 'com', arcade: true, mix: 'com' },
    { rect: R(134, 6, 210, 20), front: 'S', zone: 'res', mix: 'res' },
    { rect: R(-204, 30, -136, 46), front: 'N', zone: 'res', mix: 'res' },
    { rect: R(-204, 84, -136, 100), front: 'S', zone: 'res', mix: 'res' },
    { rect: R(-124, 30, -46, 46), front: 'N', zone: 'res', mix: 'res' },
    { rect: R(-124, 84, -46, 100), front: 'S', zone: 'res', mix: 'res' },
    { rect: R(-124, 50, -104, 80), front: 'W', zone: 'res', mix: 'res' },
    { rect: R(180, 30, 210, 60), front: 'E', zone: 'res', mix: 'res' },
    { rect: R(134, 84, 210, 100), front: 'S', zone: 'res', mix: 'res' },
  ];
  const TYPES = {
    house: { w: [5, 8], d: [11, 15], f: [2, 4], y: [1958, 1992], units: () => 1, struct: '加強磚造', label: '透天街屋' },
    walkup: { w: [15, 24], d: [11, 14], f: [4, 5], y: [1970, 1990], units: (w, f) => f * Math.max(2, Math.round(w / 8)), struct: 'RC', label: '公寓' },
    mid: { w: [16, 24], d: [13, 16], f: [6, 8], y: [1983, 1996], units: (w, f) => f * 3, struct: 'RC', label: '華廈', elevator: true },
    tower: { w: [20, 28], d: [16, 20], f: [12, 16], y: [1995, 2014], units: (w, f) => f * 4, struct: 'RC', label: '住宅大樓', elevator: true },
    fresh: { w: [22, 30], d: [16, 20], f: [16, 24], y: [2016, 2024], units: (w, f) => f * 4, struct: 'SRC', label: '新建大樓', elevator: true },
  };
  const MIX = {
    res: [['house', 0.34], ['walkup', 0.42], ['mid', 0.1], ['tower', 0.1], ['fresh', 0.04]],
    com: [['house', 0.22], ['walkup', 0.3], ['mid', 0.3], ['tower', 0.12], ['fresh', 0.06]],
  };

  function generateStrips() {
    const out = [];
    const rand = rng(20261120);
    const pick = (mix) => {
      let r = rand();
      for (const [t, p] of mix) { if ((r -= p) <= 0) return t; }
      return mix[0][0];
    };
    const between = (a, b) => a + (b - a) * rand();
    STRIPS.forEach((s, si) => {
      const [x0, z0, x1, z1] = s.rect;
      const along = s.front === 'N' || s.front === 'S';
      const len = along ? x1 - x0 : z1 - z0;
      const depth = along ? z1 - z0 : x1 - x0;
      let pos = 0, n = 0;
      while (pos < len - 4) {
        const type = pick(MIX[s.mix]);
        const T = TYPES[type];
        let w = Math.min(between(T.w[0], T.w[1]), len - pos);
        if (len - pos - w < 5) w = len - pos;
        if (w < 4.5) break;
        const d = Math.min(depth, between(T.d[0], T.d[1]));
        const floors = Math.round(between(T.f[0], T.f[1]));
        const year = Math.round(between(T.y[0], T.y[1]));
        let rect;
        if (s.front === 'N') rect = R(x0 + pos, z0, x0 + pos + w, z0 + d);
        else if (s.front === 'S') rect = R(x0 + pos, z1 - d, x0 + pos + w, z1);
        else if (s.front === 'W') rect = R(x0, z0 + pos, x0 + d, z0 + pos + w);
        else rect = R(x1 - d, z0 + pos, x1, z0 + pos + w);
        // 地界：臨街面寬 × 進深（含後院；建蔽約 55–72%）
        const lotD = Math.max(depth, d / 0.72);
        let lot;
        if (s.front === 'N') lot = R(x0 + pos, z0, x0 + pos + w, z0 + lotD);
        else if (s.front === 'S') lot = R(x0 + pos, z1 - lotD, x0 + pos + w, z1);
        else if (s.front === 'W') lot = R(x0, z0 + pos, x0 + lotD, z0 + pos + w);
        else lot = R(x1 - lotD, z0 + pos, x1, z0 + pos + w);
        out.push({
          id: `G${si}-${n++}`, name: T.label, rect, lot, floors, year, struct: type === 'house' && year > 1980 ? 'RC' : T.struct,
          use: s.zone === 'com' ? (type === 'house' ? '店鋪住宅' : '住商') : '住宅', units: T.units(w, floors),
          elevator: !!T.elevator, arcade: s.arcade && type !== 'fresh' && type !== 'tower' ? s.front : null,
          roofAdd: (type === 'walkup' || type === 'house') && rand() < 0.45, zone: s.zone, type,
        });
        pos += w + (rand() < 0.2 ? between(0.5, 2) : 0);
      }
    });
    return out;
  }
  const GENERATED = generateStrips();

  // 給模擬用的建物清單（不含學校、市場、基地內建物）
  function lotOf(b) {
    if (b.lot) return b.lot;
    const [x0, z0, x1, z1] = b.rect;
    return R(x0 - 1, z0 - 1, x1 + 1, z1 + 1);
  }
  const SIM_BUILDINGS = NAMED.filter((b) => !b.keep).concat(GENERATED).map((b) => {
    const lot = lotOf(b);
    const lotArea = (lot[2] - lot[0]) * (lot[3] - lot[1]);
    const foot = (b.rect[2] - b.rect[0]) * (b.rect[3] - b.rect[1]);
    return {
      id: b.id, year: b.year, floors: b.floors, units: Math.max(1, b.units || 1), lotArea, footprint: foot,
      farOld: (foot * b.floors) / lotArea, elevator: !!b.elevator, lowrise: b.floors <= 6,
    };
  });

  // ── 街廓與土地使用分區（圖層用）──────────────────────────────────
  const BLOCKS = [
    { rect: R(-204, -110, -136, -40), zone: 'com' }, { rect: R(-124, -110, -44, -40), zone: 'com' },
    { rect: R(-32, -110, 32, -40), zone: 'res' }, { rect: R(40, -110, 120, -40), zone: 'com' },
    { rect: R(132, -110, 212, -40), zone: 'com' },
    { rect: R(-204, -20, -136, 20), zone: 'res' }, { rect: R(-124, -20, -44, 20), zone: 'park' },
    { rect: R(-32, -20, 32, 20), zone: 'res', site: true }, { rect: R(40, -20, 120, 20), zone: 'res' },
    { rect: R(132, -20, 212, 20), zone: 'com' },
    { rect: R(-204, 30, -136, 100), zone: 'res' }, { rect: R(-124, 30, -44, 100), zone: 'res' },
    { rect: R(-32, 30, 120, 100), zone: 'school' }, { rect: R(132, 30, 212, 100), zone: 'res' },
  ];

  // ── 設施、步行與防災 ───────────────────────────────────────────
  const FACILITIES = [
    { id: 'mrt', name: '捷運出入口', p: [138, -16], icon: 'M', walkTo: [137, -20] },
    { id: 'park', name: '鄰里公園', p: [-84, 0], icon: 'P', walkTo: [-44, -2] },
    { id: 'school', name: '國小校門', p: [10, 31], icon: 'S', walkTo: [10, 30] },
    { id: 'market', name: '傳統市場', p: [158, 32], icon: 'K', walkTo: [158, 30] },
    { id: 'clinic', name: '診所', p: [60, -41], icon: '+', walkTo: [60, -40] },
  ];
  // 由大廳出發、沿人行道的步行路徑（折線）
  const WALKS = {
    mrt: [[8, -18], [8, -21.5], [137, -21.5], [137, -19]],
    park: [[-30, -18], [-36, -18], [-36, -2], [-44, -2]],
    school: [[8, -18], [8, -21.5], [34, -21.5], [34, 24], [10, 24], [10, 30]],
    market: [[8, -18], [8, -21.5], [126, -21.5], [126, 25], [158, 25], [158, 30]],
    clinic: [[8, -18], [8, -21.5], [36, -21.5], [36, -38.5], [60, -38.5]],
  };
  const REFUGE = [
    { id: 'park', name: '臨時避難：鄰里公園', rect: R(-120, -16, -50, 16), kind: 'temp' },
    { id: 'school', name: '收容處所：國小活動中心', rect: R(62, 34, 92, 52), kind: 'shelter' },
    { id: 'plaza', name: '基地開放空間（就地避難）', rect: R(-28, -16, -14, 16), kind: 'site', after: true },
  ];
  const FIRE_PAD = { rect: R(-12, -19.5, 8, -16), note: '消防車救災活動空間（示意：約 8 × 20 m，依消防主管機關指導原則）' };
  const EVAC = [
    [[-6, -18], [-36, -18], [-36, -4], [-50, -4]],
    [[20, 18], [20, 25], [-38, 25], [-38, -2], [-50, -2]],
    [[30, 0], [36, 0], [36, 25], [77, 25], [77, 32]],
  ];
  const WIND = [
    { season: '冬季', dir: 'NE', from: 45, label: '冬季東北季風' },
    { season: '夏季', dir: 'SW', from: 225, label: '夏季西南氣流' },
  ];

  // ── 市場與政策脈絡（2026-11-20 整理）────────────────────────────
  const MARKET = {
    asOf: '2026-11-20',
    // 價格與成本的預設值（萬元／坪），附來源等級
    priceNew: 80, // 板橋近捷運新案約 70–90 萬（府中站周邊新案均價約 77 萬；本基地距捷運約 150 m）
    priceOld: 48, // 30–50 年公寓 2026 單筆成交多落在 43–55 萬
    costAbove: 24, // 權變提列營建單價（地上，示範假設；市場實際造價 RC 高樓約 25–29 萬、SRC 32–33 萬）
    costBelow: 30,
    carPrice: 230, // 板橋坡道平面車位 2026 掛牌約 220–270 萬
    rent: 3, // 安置期間租金補貼（萬／月，示範假設）
    facts: [
      { k: '2026 前三季住宅開工', v: '約 6.5 萬戶', d: '年減約 32%', src: '內政部統計月報（信義房屋整理，經濟日報 2026-11）', url: 'https://money.udn.com/money/story/5621/9857500' },
      { k: '2026 前三季住宅建照', v: '約 7.8 萬戶', d: '年減約 28%', src: '同上', url: 'https://ec.ltn.com.tw/article/breakingnews/5629928' },
      { k: '2026 上半年使照', v: '68,225 宅', d: '近 10 年次高', src: '住商不動產（經濟日報 2026-08）', url: 'https://money.udn.com/money/story/5621/9692328' },
      { k: '2026 前三季住宅拆照', v: '618 件', d: '年減約 23%', src: '理財周刊 2026-11', url: 'https://www.moneyweekly.com.tw/_Article?AID=262046' },
      { k: '第二戶房貸成數', v: '7 成', d: '2026-09-18 起由 6 成放寬', src: '中央銀行 2026-09-17 理監事會', url: 'https://www.cbc.gov.tw/tw/cp-971-192865-5f8ca-1.html' },
      { k: '營造工程物價指數', v: '119.16', d: '2026-06 年增 6.4%', src: '主計總處（媒體整理）', url: '' },
      { k: '新北新案公設比', v: '34.7%', d: '2025 年平均，歷史新高', src: '住展（經濟日報 2026-01）', url: 'https://money.udn.com/money/story/5621/9281248' },
    ],
    news: [
      { date: '2026-10-28', text: '立法院就都更、危老修正草案舉行公聽會；行政院版擬刪除危老 2027-05-31 申請期限、捐贈社宅或婚育宅最高再加 15% 容積，尚未三讀。', url: 'https://udn.com/news/story/6649/9842080' },
      { date: '2026-10-16', text: '臺北市宣布公辦都更「5099」：同意門檻由 75% 降為 50%，符合條件者基準容積由 225% 提高為 300%。', url: 'https://udn.com/news/story/6656/9819245' },
      { date: '2026-09-17', text: '央行維持利率，第二戶房貸成數由 6 成放寬為 7 成，其餘選擇性信用管制不變。', url: 'https://www.cbc.gov.tw/tw/cp-971-192865-5f8ca-1.html' },
      { date: '2025-05-12', text: '危老時程獎勵歸零，現存規模獎勵（200 ㎡ 起 2%，每增 100 ㎡ 加 0.5%，時程＋規模合計 ≤ 10%）。', url: '' },
    ],
  };

  // ── 城市模擬的參數（教學示意，非預測）──────────────────────────
  const SIM = {
    years: [2026, 2046],
    market: {
      year: 2026,
      priceNew: 80,
      priceOld: 48,
      cost: 24,
      farBase: 3.0,
      smallLot: 1000,
      dangerousSunsetYear: 2027,
      grossPerSale: 1.35,
      softRate: 0.25,
      ratioNeed: 1.25,
      ratioWidth: 0.14,
      consentDangerous: 0.975,
      consentUrban: 0.988,
      faPerUnit: 85,
      coverNew: 0.45,
      renovateP: [0, 0.012, 0.03],
      routes: {
        dangerous: { bonus: 0.3, outside: 0.03, p0: 0.09, years: 4 },
        urban: { bonus: 0.45, outside: 0, p0: 0.06, years: 6 },
      },
    },
    presets: {
      current: { label: '現行制度', policy: { dangerousSunset: true, extraBonus: 0, extendLife: 1, priceGrowth: 0.02, costGrowth: 0.03, credit: 'current' } },
      reform: { label: '修法通過', policy: { dangerousSunset: false, extraBonus: 0.15, extendLife: 2, priceGrowth: 0.02, costGrowth: 0.03, credit: 'current' } },
      squeeze: { label: '成本緊縮', policy: { dangerousSunset: true, extraBonus: 0, extendLife: 1, priceGrowth: 0, costGrowth: 0.05, credit: 'tight' } },
      boom: { label: '景氣回溫', policy: { dangerousSunset: true, extraBonus: 0, extendLife: 1, priceGrowth: 0.04, costGrowth: 0.03, credit: 'loose' } },
    },
    caseStart: 2028,
    caseDone: 2034,
  };

  window.CITY = {
    GEO, ZONES, ROADS, ROAD_TIERS, SITE, BLOCKS, OLD, OLD_FAC, OLD_UNITS, OLD_FA, OLD_COVER,
    URBAN, DANGEROUS, ROUTES, RENO, NAMED, GENERATED, SIM_BUILDINGS,
    FACILITIES, WALKS, REFUGE, FIRE_PAD, EVAC, WIND, MARKET, SIM, ping, R,
  };
})();
