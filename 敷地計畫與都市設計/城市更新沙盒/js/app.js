/* 城市更新沙盒｜介面與章節 */
(function () {
  'use strict';

  const C = window.CITY;
  const K = window.CALC;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = K.fmt;
  const pct = K.pct;
  const SRC = { core: 'Core', law: '法規', data: '資料', model: '模型', assume: '假設', draft: '草案' };
  const src = (k) => `<span class="src s-${k}" title="${SRC[k]}">${SRC[k]}</span>`;
  const DASHBOARD = 'https://claude.ai/artifact/N9HnLsT8NB46aZa8f2hQm2';
  const VISION = 'https://claude.ai/artifact/LCWGPVdjLN1kds1bWCB8nh';
  const VIEWER = 'https://claude.ai/artifact/7mSMrv1gAdsEhdT8yCrKXw';
  const BUILDER = 'https://jeremy0819.github.io/BUILDER/';

  const stage = $('stage');
  const panelBody = $('panelBody');
  const panel = $('panel');
  const dock = $('dock');
  const floorsEl = $('floors');
  const hoverEl = $('hover');
  const swipe = $('swipe');

  function fail(msg) {
    const fb = $('fallback');
    fb.hidden = false;
    fb.querySelector('p').textContent = msg;
  }
  if (!window.THREE) { fail('3D 引擎（three.js）沒有載入。請確認網路可以連到 cdnjs.cloudflare.com，然後重新整理。'); return; }

  const S = window.SCENE.create({ canvas: $('scene'), stage, labelsEl: $('labels'), onHover, onPick, onFrame });
  if (!S) { fail('這個瀏覽器無法啟動 WebGL。請改用新版 Chrome、Safari 或 Edge 開啟。'); return; }

  // ── 狀態 ───────────────────────────────────────────────────────
  const SCEN = {
    now: { label: '現況', short: '現況' },
    renovate: { label: '老宅延壽', short: '延壽' },
    dangerous: { label: '危老重建', short: '危老' },
    urban: { label: '都市更新', short: '都更' },
  };
  const DAYS = { winter: { n: 356, label: '冬至', date: '12/22' }, equinox: { n: 80, label: '春分', date: '3/21' }, summer: { n: 172, label: '夏至', date: '6/21' } };
  const st = {
    chapter: 'overview',
    picks: { urban: Object.assign({}, C.ROUTES.urban.defaults), dangerous: Object.assign({}, C.ROUTES.dangerous.defaults) },
    route: 'urban',
    cmp: { left: 'now', right: 'urban' },
    sun: { day: 'winter', hour: 10, mode: 'hours', scen: 'urban', compare: false },
    share: { oldId: 'A-3F-2', floor: 12, unit: 'B', priceNew: C.MARKET.priceNew, priceOld: C.MARKET.priceOld, cost: C.MARKET.costAbove, car: true },
    core: { step: 'site', b: 10, floors: null, p: 4, c: 2, stage: 1, owner: 'A-3F-2' },
    city: { preset: 'current', policy: Object.assign({}, C.SIM.presets.current.policy), year: 2036 },
    lens: 'netzero',
    layers: { heights: true, zoning: false, roads: false, open: false, walk: false, disaster: false, wind: false, age: false, labels: true },
    night: false,
    view: 'aerial',
  };

  // ── 量體與財務（隨獎勵選項重算）────────────────────────────────
  const BASE_FA = C.SITE.area * C.ZONES.res.far;
  const PLAN = { podium: C.URBAN.podium.floors, typicalFA: C.URBAN.tower.typicalFA, typH: C.URBAN.tower.typH };
  let MASS = null;
  function lotArea(r) { return (r[2] - r[0]) * (r[3] - r[1]); }
  function computeMass() {
    const ub = K.bonusSummary(C.ROUTES.urban, st.picks.urban, { area: C.SITE.area, far: C.ZONES.res.far, origFA: C.OLD_FA });
    const stack = K.stackTower(ub.finalFA, PLAN);
    const donate = st.picks.urban.donate === 'd2f';
    const towerUnits = stack.towerFloors * C.URBAN.plan.length;
    const dangerous = C.DANGEROUS.map((p) => {
      const area = lotArea(p.lot);
      const orig = C.OLD.filter((b) => p.olds.indexOf(b.id) >= 0).reduce((s, b) => s + lotArea(b.rect) * b.floors, 0);
      const sum = K.bonusSummary(C.ROUTES.dangerous, st.picks.dangerous, { area, far: C.ZONES.res.far, origFA: orig });
      const fp = lotArea(p.bld);
      const floors = Math.max(3, Math.round((sum.finalFA * 1.12) / fp));
      return Object.assign({}, p, { area, orig, sum, fp, floors, height: floors * 3.2, units: Math.round((sum.finalFA * 0.92) / 85) });
    });
    const dFA = dangerous.reduce((s, p) => s + p.sum.finalFA, 0);
    const owners = C.OLD_UNITS.length;
    const flats = C.OLD_UNITS.filter((u) => u.kind !== 'shop').length;
    const footU = lotArea(C.URBAN.podium.rect);
    const carsU = towerUnits + 4;
    const RN = C.RENO;
    const perBld = Math.min(RN.capBuilding, Math.min(RN.works.elevator * RN.rate, RN.capElevator) + Math.min(RN.works.facade * RN.rate, RN.capFacade) + RN.works.other * RN.rate);
    const renoFlats = C.OLD_UNITS.filter((u) => u.kind === 'flat').length;
    const subsidy = perBld * 4 + renoFlats * RN.privateGeneral;
    const levels = Math.max(2, Math.ceil((carsU * 40) / lotArea(C.URBAN.basement.rect)));
    MASS = {
      ub, stack, donate, towerUnits, carsU, levels,
      dangerous, dFA,
      key: JSON.stringify([st.picks.urban, st.picks.dangerous]),
      kpi: {
        now: {
          fa: C.OLD_FA, far: C.OLD_FA / C.SITE.area, cover: C.OLD_COVER / C.SITE.area, floors: 5, height: 15, units: owners,
          openPublic: 204, elevShare: 0, cars: 0, carNote: '無停車位（路邊停車）', pv: 0, years: '—', consent: '—', relocate: '不需搬遷',
        },
        renovate: {
          fa: C.OLD_FA + 4 * 6.8 * 6, far: (C.OLD_FA + 4 * 6.8 * 6) / C.SITE.area, cover: (C.OLD_COVER + 4 * 6.8) / C.SITE.area, floors: 5, height: 15,
          units: owners, openPublic: 204, elevShare: renoFlats / flats, cars: 0, carNote: '仍無停車位', pv: 'A–D 屋頂', subsidy,
          years: '約 1–2 年（申請＋施工）', consent: '依區分所有權人會議決議與計畫規定（公寓至少做 3 項）', relocate: '多數工程可不搬遷',
        },
        dangerous: {
          fa: dFA, far: dFA / C.SITE.area, cover: dangerous.reduce((s, p) => s + p.fp, 0) / C.SITE.area,
          floors: Math.max(...dangerous.map((p) => p.floors)), height: Math.max(...dangerous.map((p) => p.height)),
          units: dangerous.reduce((s, p) => s + p.units, 0), openPublic: 662, elevShare: 1,
          cars: dangerous.reduce((s, p) => s + p.units, 0), carNote: '四棟各自設地下室與坡道（或機械車位）',
          pv: 0, years: C.ROUTES.dangerous.years, consent: C.ROUTES.dangerous.consent, relocate: '施工期間約 4 年需搬遷',
        },
        urban: {
          fa: ub.finalFA, far: ub.finalFAR, cover: footU / C.SITE.area, floors: stack.floors, height: stack.height,
          units: towerUnits, openPublic: 1152, elevShare: 1, cars: carsU, carNote: `一戶一汽車（新北都審原則），地下 ${levels} 層`,
          pv: footU / 20, years: C.ROUTES.urban.years, consent: C.ROUTES.urban.consent, relocate: '施工期間約 6 年需搬遷',
        },
      },
    };
    MASS.fin = finance();
    MASS.finD = financeDangerous();
    return MASS;
  }

  // 小坪數單價較高（示範假設）
  const TYPE_PREMIUM = { '1 房': 0.06, '2 房': 0.02, '3 房': 0 };
  // 都更權利變換（簡化公式）
  function finance() {
    const P = K.PING;
    const sale = [];
    for (let f = 0; f < MASS.stack.towerFloors; f++) {
      C.URBAN.plan.forEach((u) => sale.push({ id: `${f + 3}F-${u.id}`, floor: f + 3, unit: u.id, type: u.type, m2: u.m2, ping: u.m2 / (1 - C.URBAN.shareRatio) / P, inPing: u.m2 / P, prem: TYPE_PREMIUM[u.type] || 0 }));
    }
    const shops = C.URBAN.shops.slice();
    if (!MASS.donate) shops.push({ ping: 900 / (1 - C.URBAN.shareRatio) / P * 0.8 });
    const levels = MASS.levels;
    const owners = C.OLD_UNITS.map((u) => ({ id: u.id, value: u.ping * st.share.priceOld * u.fac }));
    const r = K.rightsCalc({
      saleUnits: sale, shops, cars: MASS.carsU,
      priceRes: st.share.priceNew, refFloor: 3, floorStep: 0.005, shopMul: 1.6, carPrice: C.MARKET.carPrice,
      grossAbove: lotArea(C.URBAN.podium.rect) * 2 + C.URBAN.tower.plateM2 * MASS.stack.towerFloors + 80,
      grossBelow: lotArea(C.URBAN.basement.rect) * levels,
      costAbove: st.share.cost, costBelow: st.share.cost * 1.25,
      rates: { rt: 0.04, interest: 0.04, tax: 0.01, admin: 0.03, risk: 0.11, sales: 0.05 },
      relocation: { households: C.OLD_UNITS.length, rent: C.MARKET.rent, months: 60 },
      owners,
    });
    r.ownersById = {};
    owners.forEach((o) => { r.ownersById[o.id] = o; });
    return r;
  }
  // 危老：以同樣公式估算四宗基地合計（無共同地下室、單價打九五折）
  function financeDangerous() {
    const P = K.PING;
    let total = 0, burden = 0, ownersValue = 0;
    MASS.dangerous.forEach((p) => {
      const gross = p.fp * p.floors;
      const units = [{ id: p.id, floor: Math.ceil(p.floors / 2), ping: (gross * 1.05) / P }];
      const owners = C.OLD_UNITS.filter((u) => p.olds.indexOf(u.bld) >= 0).map((u) => ({ id: u.id, value: u.ping * st.share.priceOld * u.fac }));
      const r = K.rightsCalc({
        saleUnits: units, shops: [], cars: p.units, priceRes: st.share.priceNew * 0.95, refFloor: units[0].floor, floorStep: 0, shopMul: 1, carPrice: C.MARKET.carPrice * 0.85,
        grossAbove: gross, grossBelow: p.fp * 1.3 * 2, costAbove: st.share.cost * 0.95, costBelow: st.share.cost * 1.25,
        rates: { rt: 0.04, interest: 0.04, tax: 0.01, admin: 0.03, risk: 0.1, sales: 0.05 },
        relocation: { households: owners.length, rent: C.MARKET.rent, months: 48 }, owners,
      });
      total += r.total; burden += r.burden; ownersValue += r.ownersValue;
    });
    return { total, burden, burdenRatio: burden / total, gain: (total - burden) / ownersValue };
  }

  // ── 日照柵格 ───────────────────────────────────────────────────
  const GRID = { x0: -160, z0: -140, cell: 2.5, nx: 152, nz: 100 };
  S.setHeatGrid(GRID);
  const ctxBoxes = S.ctxRecs.map((r) => ({ x0: r.b.rect[0], z0: r.b.rect[1], x1: r.b.rect[2], z1: r.b.rect[3], y0: 0, y1: r.h }));
  function siteBoxes(scen) {
    if (scen === 'now' || scen === 'renovate') {
      return C.OLD.map((b) => ({ x0: b.rect[0], z0: b.rect[1], x1: b.rect[2], z1: b.rect[3], y0: 0, y1: b.floors * (b.house ? 3.2 : 3) }));
    }
    if (scen === 'dangerous') return MASS.dangerous.map((p) => ({ x0: p.bld[0], z0: p.bld[1], x1: p.bld[2], z1: p.bld[3], y0: 0, y1: p.height }));
    const pr = C.URBAN.podium.rect, tr = C.URBAN.tower.rect;
    const podH = C.URBAN.podium.floors.reduce((s, f) => s + f.h, 0);
    const top = podH + MASS.stack.towerFloors * C.URBAN.tower.typH;
    return [
      { x0: pr[0], z0: pr[1], x1: pr[2], z1: pr[3], y0: 0, y1: podH },
      { x0: tr[0], z0: tr[1], x1: tr[2], z1: tr[3], y0: podH, y1: top },
      { x0: tr[0] + 9, z0: tr[1] + 3, x1: tr[0] + 19, z1: tr[1] + 11, y0: top, y1: top + C.URBAN.roofH },
    ];
  }
  const heatCache = new Map();
  function heatData(scen, kind) {
    const day = DAYS[st.sun.day];
    const key = `${scen}|${kind}|${day.n}|${scen === 'now' || scen === 'renovate' ? '' : MASS.key}`;
    if (heatCache.has(key)) return heatCache.get(key);
    const opts = { geo: C.GEO, n: day.n, from: 8, to: 16, step: 10 };
    let out;
    if (kind === 'rule') {
      const above = K.boxesAbove(siteBoxes(scen), 21);
      out = { hours: K.sunHours(GRID, above, opts) };
    } else {
      const boxes = ctxBoxes.concat(siteBoxes(scen));
      out = { hours: K.sunHours(GRID, boxes, opts), foot: K.footprintMask(GRID, boxes) };
    }
    heatCache.set(key, out);
    return out;
  }
  function rgbOf(token) {
    const c = new S.THREE.Color(getComputedStyle(document.documentElement).getPropertyValue(token).trim() || '#888');
    return [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)];
  }
  const blocksResCom = C.BLOCKS.filter((b) => !b.site && (b.zone === 'res' || b.zone === 'com'));
  const inRect = (x, z, r) => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3];
  let lotMask = null;
  function neighborLotMask() {
    if (lotMask) return lotMask;
    lotMask = new Uint8Array(GRID.nx * GRID.nz);
    for (let j = 0; j < GRID.nz; j++) {
      for (let i = 0; i < GRID.nx; i++) {
        const x = GRID.x0 + (i + 0.5) * GRID.cell, z = GRID.z0 + (j + 0.5) * GRID.cell;
        if (blocksResCom.some((b) => inRect(x, z, b.rect))) lotMask[j * GRID.nx + i] = 1;
      }
    }
    return lotMask;
  }
  function heatTexture(scen, mode) {
    const N = GRID.nx * GRID.nz;
    const rgba = new Uint8Array(N * 4);
    const ramp = [rgbOf('--heat-0'), rgbOf('--heat-1'), rgbOf('--heat-2'), rgbOf('--heat-3')];
    const loss = rgbOf('--heat-loss');
    const bad = rgbOf('--heat-0');
    const put = (k, c, a) => {
      const j = Math.floor(k / GRID.nx), i = k % GRID.nx;
      const r = (GRID.nz - 1 - j) * GRID.nx + i;
      rgba[r * 4] = c[0]; rgba[r * 4 + 1] = c[1]; rgba[r * 4 + 2] = c[2]; rgba[r * 4 + 3] = a;
    };
    if (mode === 'hours') {
      const d = heatData(scen, 'all');
      for (let k = 0; k < N; k++) {
        if (d.foot[k]) continue;
        const h = d.hours[k];
        if (h < 1) put(k, ramp[0], 215);
        else if (h < 2) put(k, ramp[1], 180);
        else if (h < 4) put(k, ramp[2], 140);
        else if (h < 6) put(k, ramp[3], 90);
      }
    } else if (mode === 'loss') {
      const a = heatData('now', 'all'), b = heatData(scen, 'all');
      for (let k = 0; k < N; k++) {
        if (b.foot[k] || a.foot[k]) continue;
        const l = a.hours[k] - b.hours[k];
        if (l > 0.2) put(k, loss, Math.min(230, 70 + l * 45));
      }
    } else if (mode === 'rule') {
      const d = heatData(scen, 'rule');
      const all = heatData(scen, 'all');
      const lots = neighborLotMask();
      for (let k = 0; k < N; k++) {
        const h = d.hours[k];
        if (h >= 7.99) continue;
        if (all.foot[k]) continue;
        if (lots[k] && h < 1) put(k, bad, 225);
        else if (lots[k]) put(k, loss, 120);
        else put(k, loss, 55);
      }
    }
    return S.makeHeatTexture(rgba, GRID);
  }
  const NEAR = ['N1', 'N2', 'N3', 'N4', 'E1', 'E2', 'E3', 'E5', 'NE1'];
  function neighborStats(scen) {
    const before = heatData('now', 'all'), after = heatData(scen, 'all'), rule = heatData(scen, 'rule');
    return NEAR.map((id) => {
      const b = C.NAMED.find((x) => x.id === id);
      const r = [b.rect[0] - 4, b.rect[1] - 4, b.rect[2] + 4, b.rect[3] + 4];
      const a0 = K.areaStats(GRID, before.hours, r, before.foot);
      const a1 = K.areaStats(GRID, after.hours, r, after.foot);
      const q = K.areaStats(GRID, rule.hours, r, after.foot);
      return { b, before: a0 ? a0.mean : null, after: a1 ? a1.mean : null, ruleMin: q ? q.min : null, ok: q ? q.min >= 1 : true };
    });
  }

  // ── 共用片段 ───────────────────────────────────────────────────
  const tile = (k, v, s, source) => `<div class="tile"><div class="k">${k}${source ? src(source) : ''}</div><div class="v">${v}</div>${s ? `<div class="s">${s}</div>` : ''}</div>`;
  const row = (k, v, source, cls) => `<div class="row${cls ? ' ' + cls : ''}"><span class="rk">${k}</span><span class="rv">${v}</span>${source ? src(source) : '<span></span>'}</div>`;
  const say = (text) => `<div class="say"><div class="say-k">審議／考場可寫句</div><p>${text}</p><button type="button" class="copy" data-copy="${esc(text.replace(/<[^>]+>/g, ''))}">複製</button></div>`;
  const seg = (id, items, cur, label) => `<div class="seg" role="group" aria-label="${esc(label || '')}" id="${id}">${items.map(([v, t]) => `<button type="button" data-v="${esc(v)}" aria-pressed="${v === cur}">${t}</button>`).join('')}</div>`;
  const checkMark = (ok) => (ok === null ? '<span class="chk na">—</span>' : ok ? '<span class="chk ok">符合</span>' : '<span class="chk bad">不符</span>');

  // ── BUILDER 四步：數字全部來自 BUILDER Core 預先試算（js/builder-data.js），這裡只查表、不計算 ──
  const G = window.BUILDER_GRID || null;
  const BG = G ? G.meta.grid : null;
  const MK = window.MARKET_SNAPSHOT || null;
  const CORE_WARN = {
    VOLUME_EXCEEDED: ['bad', '設計計入容積超過允建容積'],
    SHARED_COST_HIGH: ['bad', '共同負擔比高於 Core 的全案管理合理區間（30–50%）'],
    SHARED_COST_LOW: ['info', '共同負擔比低於合理區間，請檢查成本是否漏列'],
    EFFICIENCY_OUT_OF_BAND: ['info', '銷坪比超出住宅常見範圍 1.58–1.68'],
    VALUE_MULTIPLE_LOW: ['bad', '更新後價值倍數偏低'],
    OWNERS_SHARE_MISMATCH: ['info', '地主持分合計不等於 1'],
    OWNERS_VALUE_MISMATCH: ['info', '逐戶更新前價值合計與總額不符'],
  };
  const VERDICT = { GO: ['go', '值得推進'], CAUTION: ['caution', '有條件推進，先處理風險'], STOP: ['stop', '目前不宜推進'] };
  const COST_NAMES = { A工程費用: '工程', B管維費用: '管理維護', C權變費用: '權變（拆遷、租金）', D貸款利息: '利息', E稅捐: '稅捐', F管理費用: '管理與銷售' };
  const ownerGroup = {};
  if (G) G.owners.groups.forEach((g, gi) => g.members.forEach((id) => { ownerGroup[id] = gi; }));
  const yi = (v) => `${fmt(v / 10000, 1)} 億元`;
  const signed = (v) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;

  function coreFloors() { return st.core.floors === null ? G.fit[st.core.b] : st.core.floors; }
  function coreCap() { const n = coreFloors(); return G.capacity[st.core.b].find((r) => r[0] === n); }
  function coreIndex(b, p, c) { return (b * BG.price.length + p) * BG.cost.length + c; }
  function coreAt() {
    const i = coreIndex(st.core.b, st.core.p, st.core.c);
    const r = {};
    G.fields.forEach((f, k) => { r[f] = G.rows[i][k]; });
    return { i, r, parts: G.parts[i], warn: G.warnings[i], hash: G.hash[i], alloc: G.alloc[i], dec: G.decision[i] };
  }
  // 3D：裙樓＋n 層標準層（只是幾何堆疊）
  function coreStack(n) {
    const podH = C.URBAN.podium.floors.reduce((s, f) => s + f.h, 0);
    return { towerFloors: n, floors: C.URBAN.podium.floors.length + n, height: podH + n * C.URBAN.tower.typH };
  }
  let urbanFor = 'mass';
  function showCoreMass() {
    if (!G) return;
    if (st.core.step === 'people') {
      restoreMass();
      S.setScenario('now');
      S.highlightOld(st.core.owner);
      return;
    }
    S.highlightOld(null);
    S.setScenario('urban');
    const fit = G.fit[st.core.b];
    const n = st.core.step === 'site' ? coreFloors() : fit;
    S.rebuildUrban(coreStack(n));
    urbanFor = 'core';
    S.markOverFloors(n > fit ? fit : null);
  }
  function restoreMass() {
    if (urbanFor !== 'mass') { S.rebuildUrban(MASS.stack); urbanFor = 'mass'; }
  }
  function groupLabel(grp) {
    const units = grp.members.map((id) => C.OLD_UNITS.find((u) => u.id === id));
    const u = units[0];
    if (u.kind === 'house') return `${C.OLD.find((b) => b.id === u.bld).name}（每戶）`;
    const blds = [...new Set(units.map((x) => x.bld))].join('、');
    return `${blds} 棟 ${u.floor} 樓${u.kind === 'shop' ? '店面' : ''}`;
  }
  function warnList(codes) {
    if (!codes.length) return '<p class="note">Core 沒有發出警示。</p>';
    return `<div class="warns">${codes.map((c) => { const w = CORE_WARN[c] || ['info', c]; return `<div class="${w[0] === 'info' ? 'info' : ''}">Core 警示：${esc(w[1])}</div>`; }).join('')}</div>`;
  }
  function coreProv(at) {
    const m = G.meta;
    return `<details class="prov"><summary>來源：BUILDER Core ${esc(m.core_version)}（${esc(m.builder_commit)}）・input_hash <code>${esc(at.hash)}…</code></summary>
      <p>input_hash 是 Core 對這組輸入取的指紋，用來核對畫面上的數字對應哪一組輸入。下列輸入不是 Core 產生，是這個示範街廓的假設：</p>
      <dl>${Object.entries(m.assumptions).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}<dt>試算時間</dt><dd>${esc(m.generated_at)}</dd></dl></details>`;
  }

  function pCase() {
    if (!G) return '<p class="warn">BUILDER 試算資料沒有載入（js/builder-data.js），請重新整理。</p>';
    const at = coreAt();
    const steps = [['site', '①', '基地'], ['product', '②', '產品'], ['people', '③', '地主'], ['decision', '④', '決策']];
    const body = ({ site: coreSite, product: coreProduct, people: corePeople, decision: coreDecision })[st.core.step](at);
    return `
      <p class="eyebrow">BUILDER 都更決策系統｜Core ${esc(G.meta.core_version)}</p>
      <h2>用 BUILDER 的四步算這塊地</h2>
      <p class="lead">這一章的數字都是 BUILDER 計算核心對示範街廓算好的結果，網頁只依你選的條件查出對應那一筆，不自己計算。真實案件請到 <a href="${BUILDER}" target="_blank" rel="noopener">BUILDER</a> 輸入。</p>
      <div class="steps" id="coreStep" role="group" aria-label="BUILDER 四步">${steps.map(([id, n, t]) => `<button type="button" data-v="${id}" aria-pressed="${st.core.step === id}"><b>${n}</b>${t}</button>`).join('')}</div>
      ${body}
      ${coreProv(at)}`;
  }
  function coreSite() {
    const [n, base, allow, used, remain, over] = coreCap();
    const fit = G.fit[st.core.b];
    const bonus = Math.round(BG.bonus[st.core.b] * 100);
    const usedW = Math.min(100, (used / Math.max(allow, used)) * 100), allowW = (allow / Math.max(allow, used)) * 100;
    return `
      <h3>① 基地：容積查核</h3>
      <p class="note">選總獎勵率與塔樓層數。Core 依建築技術規則 §162 逐層查核：設計計入容積有沒有超過允建容積。</p>
      <div class="field range"><label for="cB">容積獎勵率 <output id="cBV">${bonus}%</output></label><input type="range" id="cB" min="0" max="${BG.bonus.length - 1}" step="1" value="${st.core.b}"></div>
      <div class="field range"><label for="cF">塔樓標準層 <output id="cFV">${n} 層（${n + 2}F）</output></label><input type="range" id="cF" min="${BG.floors[0]}" max="${BG.floors[BG.floors.length - 1]}" step="1" value="${n}"></div>
      <div class="bbar" aria-hidden="true"><div class="bbar-fill" style="width:${usedW.toFixed(1)}%"></div>${over ? `<div class="bbar-over" style="left:${allowW.toFixed(1)}%;right:0"></div>` : ''}<div class="bbar-cap" style="left:${allowW.toFixed(1)}%"><span>允建</span></div></div>
      <div class="rows">
        ${row('基準容積', `${fmt(base)} ㎡`, 'core')}
        ${row('允建容積', `${fmt(allow)} ㎡`, 'core')}
        ${row('設計計入容積', `${fmt(used)} ㎡`, 'core')}
        ${row('容積餘量', `<span class="${remain < 0 ? 'neg' : 'pos'}">${fmt(remain)} ㎡</span>`, 'core')}
        ${row('Core 判定', over ? '<span class="chk bad">容積超出</span>' : '<span class="chk ok">未超出</span>', 'core')}
      </div>
      ${over ? `<p class="warn">模型上紅色的樓層超出允建容積，BUILDER 會擋下這個設計。這個獎勵率最多做 ${fit} 層標準層（${fit + 2}F）。</p>` : `<p class="note">這個獎勵率下，Core 判定最多可做 ${fit} 層標準層（${fit + 2}F）。</p>`}
      ${n !== fit ? `<div class="btns"><button type="button" class="btn" id="cFit">改用 Core 可行的 ${fit} 層</button></div>` : ''}
      <p class="note">〈容積獎勵〉章逐項勾選的結果目前是 ${pct(MASS.ub.pctTotal)}。BUILDER Core 目前只收一個總獎勵率，各款上限與總量上限的核對列在 BUILDER 的 M9.2 待辦。</p>`;
  }
  function coreProduct(at) {
    const r = at.r, fit = G.fit[st.core.b], bonus = Math.round(BG.bonus[st.core.b] * 100);
    const parts = G.cost_parts.map((k, i) => [k, at.parts[i]]);
    const inBand = r.shared_cost_ratio >= 0.3 && r.shared_cost_ratio <= 0.5;
    return `
      <h3>② 產品：總銷與共同負擔</h3>
      <p class="note">容積獎勵率 ${bonus}%，塔樓用 ① 中 Core 判定可行的 ${fit} 層標準層（${fit + 2}F）。調整房價與營造單價：</p>
      <div class="field range"><label for="cP">新屋住宅單價 <output id="cPV">${BG.price[st.core.p]} 萬／坪</output></label><input type="range" id="cP" min="0" max="${BG.price.length - 1}" step="1" value="${st.core.p}"></div>
      <div class="field range"><label for="cC">營造單價（含地下室，all-in） <output id="cCV">${BG.cost[st.core.c]} 萬／坪</output></label><input type="range" id="cC" min="0" max="${BG.cost.length - 1}" step="1" value="${st.core.c}"></div>
      <div class="tiles">
        ${tile('總銷', yi(r.total_sales), `可售 ${fmt(r.saleable_area)} 坪・銷坪比 ${r.efficiency_ratio.toFixed(3)}`, 'core')}
        ${tile('共同負擔比', pct(r.shared_cost_ratio), `${yi(r.shared_cost)}${inBand ? '，在合理區間內' : '，超出 30–50%'}`, 'core')}
        ${tile('地主分回', yi(r.owner_return_value), `占總銷 ${pct(r.owner_return_ratio)}`, 'core')}
        ${tile('報酬率', pct(r.return_rate), '地主分回 ÷ 共同負擔（Core 定義）', 'core')}
      </div>
      <h3>共同負擔的組成</h3>
      <div class="stack" role="img" aria-label="共同負擔組成">${parts.map(([k, v]) => `<i style="width:${((v / r.shared_cost) * 100).toFixed(2)}%" title="${esc(COST_NAMES[k])} ${fmt(v)} 萬元"></i>`).join('')}</div>
      <div class="legend">${parts.map(([k, v], i) => `<span class="lg"><i class="c${i + 1}"></i>${esc(COST_NAMES[k])} ${fmt(v / 10000, 1)} 億</span>`).join('')}</div>
      ${warnList(at.warn)}
      <p class="note">〈分回試算〉章用的是沙盒自己的簡化教學公式，數字會和這裡不同；兩者不一致時以 BUILDER Core 為準。</p>
      ${say(`依 BUILDER Core 試算，本案容積獎勵 ${bonus}%、新屋單價每坪 ${BG.price[st.core.p]} 萬元、營造單價每坪 ${BG.cost[st.core.c]} 萬元時，總銷約 ${yi(r.total_sales)}，共同負擔比約 ${pct(r.shared_cost_ratio, 0)}${inBand ? '，落在全案管理的合理區間' : '，高於全案管理 30–50% 的合理區間，應優先檢討營建成本與獎勵項目'}。`)}`;
  }
  function corePeople(at) {
    const u = C.OLD_UNITS.find((x) => x.id === st.core.owner) || C.OLD_UNITS[0];
    const gi = ownerGroup[u.id], g = G.owners.groups[gi];
    const groups = C.OLD.map((b) => `<optgroup label="${esc(b.name)}">${C.OLD_UNITS.filter((x) => x.bld === b.id).map((x) => `<option value="${x.id}"${x.id === u.id ? ' selected' : ''}>${esc(x.label)}</option>`).join('')}</optgroup>`).join('');
    return `
      <h3>③ 地主：權利變換分配</h3>
      <p class="note">在模型上點一戶舊家，或從清單選。Core 依都更條例 §56，按更新前權利價值的比例分配 ② 算出的地主分回總額。</p>
      <div class="field"><label for="cOwner">我的舊家</label><select id="cOwner">${groups}</select></div>
      <div class="tiles">
        ${tile('更新前權利價值', `${fmt(g.pre_value)} 萬`, `${u.ping.toFixed(1)} 坪，舊屋單價 ${C.MARKET.priceOld} 萬／坪起算`, 'assume')}
        ${tile('權值比例', pct(G.owners.value_share[u.id], 2), '占全體更新前價值', 'core')}
        ${tile('Core 分回價值', `${fmt(at.alloc[gi])} 萬`, `地主分回總額 ${yi(at.r.owner_return_value)}`, 'core')}
        ${tile('同意門檻', '超過 4/5', '人數與面積（都更條例 §37）', 'law')}
      </div>
      <h3>各類住戶</h3>
      <div class="gtable"><div class="g-h"><span>住戶</span><span>戶數</span><span>更新前</span><span>Core 分回</span></div>
        ${G.owners.groups.map((grp, i) => `<div class="g-r${i === gi ? ' sel' : ''}"><span>${esc(groupLabel(grp))}</span><span>${grp.members.length}</span><span>${fmt(grp.pre_value)}</span><span>${fmt(at.alloc[i])}</span></div>`).join('')}
      </div>
      <p class="note">金額單位萬元。全體更新前權利價值合計 ${fmt(G.owners.pre_value_total)} 萬元（示範假設）。分回價值會隨 ② 的房價與營造單價改變；要換到幾坪的新家，見〈分回試算〉章。</p>`;
  }
  function coreDecision(at) {
    const cfg = G.meta.decision_config;
    const stg = G.meta.stages[st.core.stage];
    const fx = G.stage_fixed[stg.id];
    const [verdict, bp, ln, lev] = at.dec[st.core.stage];
    const V = VERDICT[verdict];
    const evRow = (who, n, ev) => `<div class="cmp-r"><span class="rk">${who}</span><span>${fmt(n)}</span><span class="${ev <= 0 ? 'neg' : 'pos'}">${fmt(ev)}</span><span>${ev <= 0 ? '<span class="chk bad">≤ 0</span>' : '<span class="chk ok">正</span>'}</span></div>`;
    const first = G.meta.stages[0], last = G.meta.stages[G.meta.stages.length - 1];
    const d0 = at.dec[0], dN = at.dec[at.dec.length - 1];
    const inp = G.meta.decision_inputs;
    return `
      <h3>④ 決策：三方期望值</h3>
      <p class="note">Core 的決策引擎讀 ② 的結果，依案件階段的完工機率與剩餘年期，算地主、實施者與我方的期望值，給出 GO／CAUTION／STOP。</p>
      ${seg('coreStage', G.meta.stages.map((s, i) => [String(i), s.label]), String(st.core.stage), '案件階段')}
      <div class="vd ${V[0]}"><b>${verdict}</b><span>${V[1]}${bp ? `；最先轉負的是${esc(bp)}` : ''}</span></div>
      <div class="tiles">
        ${tile('完工機率', pct(fx.p, 1), `由「${esc(stg.tree_name)}」階段算到交屋`, 'core')}
        ${tile('剩餘年期', `${fx.T} 年`, '到交屋結算', 'core')}
      </div>
      <div class="cmp"><div class="cmp-h"><b>對象（萬元）</b><b>名目</b><b>期望值</b><b></b></div>
        ${evRow('地主', ln, lev)}${evRow('實施者', fx.impl[0], fx.impl[1])}${evRow('我方', fx.our[0], fx.our[1])}
      </div>
      <p class="note">地主名目值＝分回價值減更新前價值；期望值再考慮完工機率、折現率 ${pct(cfg.r, 0)}，以及不更新時舊屋價值每年成長 ${pct(cfg.g, 0)}。</p>
      <p class="note">實施者與我方的收支沿用 BUILDER 決策引擎測試的示意值（實施者管理收入 ${fmt(inp.mgmt_fee)}、墊付 ${fmt(inp.advance)}、營運 ${fmt(inp.operating)}；我方收入 ${fmt(inp['我方收入'])}、投入 ${fmt(inp['我方投入'])} 萬元），不是本案估算。階段存活率是示意預設，尚未用真實成敗案校準：verdict 是方向性判斷，不是投資結論。</p>
      ${say(`依 BUILDER 決策引擎，同一份財務試算在「${first.label}」階段完工機率約 ${pct(G.stage_fixed[first.id].p, 0)}，判定 ${d0[0]}；到「${last.label}」階段約 ${pct(G.stage_fixed[last.id].p, 0)}，判定 ${dN[0]}。整合期的不確定性，是地主評估都更時最大的隱性成本。`)}`;
  }

  // ── 房市：房市儀表板資料快照（js/market-data.js），數值未改 ─────────────
  const mkRows = (id) => (MK && MK.datasets[id] ? MK.datasets[id].rows : []);
  const safeUrl = (u) => (/^https?:\/\//.test(u || '') ? u : '');
  // 老宅延壽資格（儀表板 renewal_rules 第 1 條）：屋齡 30 年以上的 4–6 層公寓，或 6 層以下透天。只看屋齡與樓層。
  function renoEligible(b) {
    if (b.keep || !/住/.test(b.use || '住宅')) return false;
    if (2026 - b.year < 30) return false;
    const house = b.house || b.type === 'house' || /透天|平房|街屋/.test(b.name || '');
    return house ? b.floors <= 6 : b.floors >= 4 && b.floors <= 6;
  }
  const renoTint = (b) => (renoEligible(b) ? 'yes' : 'no');
  function pMarket() {
    if (!MK) return '<p class="warn">房市資料沒有載入（js/market-data.js），請重新整理。</p>';
    const ytd = mkRows('ytd_2026'), credit = mkRows('credit_rules'), bank = mkRows('bank_exposure')[0];
    const hh = mkRows('households'), rules = mkRows('renewal_rules'), sub = mkRows('renewal_subsidy');
    const trends = mkRows('trends'), ups = mkRows('updates').slice().sort((a, b) => (a.date < b.date ? 1 : -1));
    const homes = C.NAMED.concat(C.GENERATED).filter((b) => !b.keep && /住/.test(b.use || ''));
    const elig = homes.filter(renoEligible).length;
    const siteElig = C.OLD.filter((b) => renoEligible(Object.assign({ use: '住宅' }, b))).map((b) => b.id).join('、');
    const ytdBy = Object.fromEntries(ytd.map((r) => [r.key, r]));
    const subBy = Object.fromEntries(sub.map((r) => [r.item, r]));
    const wan = (v) => `${fmt(v / 10000)} 萬元`;
    const presets = [['基準', 80, 24], ['房價回落約 10%', 70, 24], ['營造上漲', 80, 28], ['兩者同時', 70, 28]];
    return `
      <p class="eyebrow">房市儀表板快照｜${esc(MK.as_of)}</p>
      <h2>市場在變，這塊地的帳也跟著變</h2>
      <p class="lead">信用管制、供給與老宅延壽的數字來自<a href="${MK.source}" target="_blank" rel="noopener">房市儀表板</a>；模型上綠色的是屋齡與樓層符合老宅延壽申請條件的建物。</p>
      <div class="tiles">
        ${['start', 'permit', 'complete', 'demolish'].filter((k) => ytdBy[k]).map((k) => { const r = ytdBy[k]; return tile(`${esc(r.indicator)}（2026 前三季・${esc(r.scope)}）`, `${fmt(r.value)} ${esc(r.unit)}`, `年增 ${signed(r.yoy)}`, 'data'); }).join('')}
      </div>
      <div class="chart" id="chartQ1"></div>
      <h3>信用管制：房貸成數上限</h3>
      <div>${credit.map((r) => `<div class="ltv${r.since === '2026-09-18' ? ' chg' : ''}"><span>${esc(r.buyer)}</span><b>${(r.ltv * 10).toFixed(0)} 成</b><span class="bar"><i style="width:${(r.ltv * 100).toFixed(0)}%"></i></span><small>${esc(r.since ? `${r.since} 起・` : '')}寬限期：${esc(r.grace)}。${esc(r.note)}</small></div>`).join('')}</div>
      ${bank ? `<div class="rows">${row(esc(bank.label), pct(bank.value, 2), 'data')}</div><p class="note">${esc(bank.as_of)}：${esc(bank.note)}</p>` : ''}
      <h3>老宅延壽：套到模型上</h3>
      <div class="tiles">
        ${tile('周邊符合屋齡與樓層的住宅', `${elig} 棟`, `共 ${homes.length} 棟住宅建物（以 2026 年計屋齡）`, 'model')}
        ${tile('示範街廓', siteElig ? `${siteElig} 棟` : '—', '6 棟老屋都在 30 年以上', 'model')}
      </div>
      <ul class="list">${rules.map((r) => `<li>${esc(r.rule)}</li>`).join('')}</ul>
      <p class="note">模型只檢查第 1 條（屋齡與樓層）；住戶條件與排除條件要逐棟查證。</p>
      <div class="rows">
        ${subBy.rate ? row(esc(subBy.rate.label), pct(subBy.rate.value, 0), 'data') : ''}
        ${['cap_public', 'cap_elevator', 'cap_facade'].filter((k) => subBy[k]).map((k) => row(esc(subBy[k].label), wan(subBy[k].value), 'data')).join('')}
        ${['cap_private', 'cap_private_vulnerable'].filter((k) => subBy[k]).map((k) => row(esc(subBy[k].label), `${wan(subBy[k].value)}／戶`, 'data')).join('')}
      </div>
      <h3>把市場情境帶進 BUILDER 四步</h3>
      <p class="note">選一個情境，用 BUILDER Core 重看 ② 產品的總銷與共同負擔（新屋與營造單價，萬元／坪）：</p>
      <div class="btns">${presets.map(([t, p, c]) => `<button type="button" class="btn" data-mkp="${p},${c}">${t}：${p}／${c}</button>`).join('')}</div>
      <h3>家戶結構</h3>
      <div class="rows">${hh.map((r) => row(esc(r.label), r.unit === '比例' ? pct(r.value, 1) : `${fmt(r.value, r.value < 100 ? 2 : 0)} ${esc(r.unit)}`, 'data')).join('')}</div>
      <h3>區域與產品趨勢</h3>
      <ul class="list">${trends.map((r) => `<li><b>${r.group === 'strong' ? '相對抗跌' : r.group === 'weak' ? '相對弱勢' : '產品'}</b>：${esc(r.text)}</li>`).join('')}</ul>
      <h3>近期動態</h3>
      <ul class="list news">${ups.map((u) => `<li><span class="date">${esc(u.date)}</span>${esc(u.event)}${safeUrl(u.url) ? ` <a href="${esc(u.url)}" target="_blank" rel="noopener">${esc(u.source)}</a>` : `（${esc(u.source)}）`}</li>`).join('')}</ul>
      ${ytdBy.start && ytdBy.demolish ? say(`2026 年前三季住宅開工約 ${fmt(ytdBy.start.value)} 戶、年減約 ${Math.abs(Math.round(ytdBy.start.yoy * 100))}%，拆照 ${fmt(ytdBy.demolish.value)} 件、年減約 ${Math.abs(Math.round(ytdBy.demolish.yoy * 100))}%，新建供給與都更拆除同步放緩；本案財務應以房價回落約一成的情境檢驗共同負擔比。`) : ''}
      <p class="note">快照日期 ${esc(MK.as_of)}；最新數字以<a href="${MK.source}" target="_blank" rel="noopener">房市儀表板</a>為準。</p>`;
  }
  function drawMarketChart() {
    const box = $('chartQ1');
    if (!box || !MK) return;
    const rows = mkRows('q1_supply');
    if (!rows.length) return;
    const keys = [['permit', '建照', 'q1'], ['start', '開工', 'q2'], ['complete', '使照', 'q3']];
    const W = Math.max(260, box.clientWidth || 320), H = 168, m = { l: 34, r: 12, t: 12, b: 22 };
    const top = Math.ceil(Math.max(...rows.flatMap((r) => keys.map(([k]) => r[k]))) / 10000) * 10000;
    const x = (i) => m.l + (i / (rows.length - 1)) * (W - m.l - m.r);
    const y = (v) => m.t + (1 - v / top) * (H - m.t - m.b);
    const steps = [0, top / 2, top];
    const grid = steps.map((v) => `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" class="g"/><text x="${m.l - 6}" y="${y(v) + 3.5}" class="t" text-anchor="end">${v / 10000} 萬</text>`).join('');
    const ticks = rows.map((r, i) => (i % 3 === 0 || i === rows.length - 1 ? `<text x="${x(i)}" y="${H - 6}" class="t" text-anchor="middle">${r.year}</text>` : '')).join('');
    const lines = keys.map(([k, , c]) => `<path class="${c}" d="${rows.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(r[k]).toFixed(1)}`).join('')}"/>`).join('');
    const dots = keys.map(([k, name, c]) => rows.map((r, i) => `<circle class="${c}" cx="${x(i).toFixed(1)}" cy="${y(r[k]).toFixed(1)}" r="${i === rows.length - 1 ? 3.5 : 2.2}"><title>${r.quarter} ${name} ${fmt(r[k])} 宅</title></circle>`).join('')).join('');
    const notes = rows.filter((r) => r.note).map((r) => `${esc(r.quarter)}：${esc(r.note)}`).join('；');
    box.innerHTML = `<div class="chart-h"><b>歷年第一季住宅（宅）</b>${keys.map(([, n, c]) => `<span class="lg"><i class="${c}"></i>${n}</span>`).join('')}</div>
      <svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="2017 到 2026 年第一季住宅建照、開工、使照宅數">${grid}${ticks}${lines}${dots}</svg>
      ${notes ? `<p class="chart-tip">${notes}</p>` : ''}`;
  }

  // ── 章節 ───────────────────────────────────────────────────────
  const CHAPTERS = ['overview', 'compare', 'bonus', 'sun', 'share', 'case', 'market', 'city', 'future'];
  const chapterBtns = [...document.querySelectorAll('#chapters [data-ch]')];
  chapterBtns.forEach((b) => b.addEventListener('click', () => go(b.dataset.ch, true)));

  function go(ch, user, moveCam) {
    if (CHAPTERS.indexOf(ch) < 0) ch = 'overview';
    st.chapter = ch;
    chapterBtns.forEach((b) => b.setAttribute('aria-selected', String(b.dataset.ch === ch)));
    const btn = chapterBtns.find((b) => b.dataset.ch === ch);
    if (btn && user) btn.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    if (location.hash.slice(1) !== ch) history.replaceState(null, '', '#' + ch);
    S.setChapter(ch);
    hideHover();
    stopPlay();
    enterChapter(ch, moveCam !== false);
  }

  function enterChapter(ch, moveCam) {
    swipe.hidden = true;
    floorsEl.hidden = true;
    dock.hidden = true;
    S.highlightFloor(null);
    S.highlightOld(null);
    S.setHeat('single', null);
    S.setHeat('left', null);
    S.setHeat('right', null);
    S.setSim(null);
    if (ch !== 'case') restoreMass();
    S.setCtxTint(ch === 'market' ? renoTint : null);
    applyLayers(ch);
    const cam = (v) => { if (moveCam !== false) setView(v); };
    if (ch === 'overview') { S.setScenario('now'); cam('aerial'); }
    else if (ch === 'compare') { S.setCompare(st.cmp.left, st.cmp.right); swipe.hidden = false; cam('site'); }
    else if (ch === 'bonus') { S.setScenario(st.route); cam('site'); }
    else if (ch === 'sun') { applySun(); cam('sun'); }
    else if (ch === 'share') { S.setCompare('now', 'urban'); swipe.hidden = false; renderFloors(); floorsEl.hidden = false; S.highlightFloor(st.share.floor); S.highlightNewUnit(st.share.unit); S.highlightOld(st.share.oldId); cam('site'); }
    else if (ch === 'case') { showCoreMass(); cam('site'); }
    else if (ch === 'market') { S.setScenario('now'); cam('city'); }
    else if (ch === 'city') { runSim(); cam('city'); }
    else if (ch === 'future') { S.setScenario('urban'); cam('aerial'); }
    renderPanel();
    updateSwipeTags();
    layoutOffsets();
    if (!swipe.hidden) centerSplit();
  }

  function applyLayers(ch) {
    const L = Object.assign({}, st.layers);
    if (ch === 'future') {
      L.walk = st.lens === 'aging';
      L.disaster = st.lens === 'resilience';
      L.open = st.lens === 'resilience' || st.lens === 'mixed';
      L.roads = st.lens === 'mobility';
      L.wind = false;
    }
    if (ch === 'city') L.age = true;
    S.setLayers(L);
    syncLayerUI(L);
  }

  // ── 面板 ───────────────────────────────────────────────────────
  function renderPanel() {
    const ch = st.chapter;
    const html = ({ overview: pOverview, compare: pCompare, bonus: pBonus, sun: pSun, share: pShare, case: pCase, market: pMarket, city: pCity, future: pFuture })[ch]();
    panelBody.innerHTML = html;
    panelBody.scrollTop = 0;
    bindPanel();
    if (ch === 'city') drawCharts();
    if (ch === 'market') drawMarketChart();
  }

  function pOverview() {
    const ages = C.OLD.map((b) => 2026 - b.year);
    return `
      <p class="eyebrow">示範案｜${esc(C.GEO.place)}</p>
      <h2>一個 1970 年代街廓，四種未來</h2>
      <p class="lead">這塊 2,560 ㎡ 的完整街廓有 6 棟 2–5 層老屋、${C.OLD_UNITS.length} 戶，屋齡 ${Math.min(...ages)}–${Math.max(...ages)} 年，全部沒有電梯。拖動模型看周邊，或依序走完下面八章。</p>
      <div class="tiles">
        ${tile('基地面積', '2,560 ㎡', '64 × 40 m 完整街廓', 'assume')}
        ${tile('使用分區', '住宅區', '建蔽 50%・容積 300%', 'law')}
        ${tile('現況容積率', pct(C.OLD_FA / C.SITE.area, 0), `建蔽 ${pct(C.OLD_COVER / C.SITE.area, 0)}，高於現行 50%`, 'model')}
        ${tile('住戶', `${C.OLD_UNITS.length} 戶`, '含 8 間店面，0 部電梯', 'model')}
      </div>
      <h3>現況問題</h3>
      <ul class="list">
        <li><b>耐震</b>：1999 年 921 地震前的設計，需做結構安全性能評估。</li>
        <li><b>高齡</b>：4–5 樓公寓沒有電梯，臺灣 65 歲以上人口已占 20.06%。</li>
        <li><b>街道</b>：騎樓斷續、無停車位，路邊停車占用人行空間。</li>
        <li><b>違建</b>：A、B、C 棟頂樓加蓋，不列入合法建物的權利價值（拆遷補償另計）。</li>
      </ul>
      <h3>接下來八章</h3>
      <div class="chapters-list">
        ${[
          ['compare', '方案比較', '拖曳捲簾比較現況、老宅延壽、危老、都更'],
          ['bonus', '容積獎勵', '逐項勾選獎勵，看量體長高與上限'],
          ['sun', '日照陰影', '冬至日照時數與建技規則 §39-1 檢討'],
          ['share', '分回試算', '選你的舊家，看能換回幾坪'],
          ['case', 'BUILDER 四步', '同一塊地交給 BUILDER 計算核心：容積、共負、分回、GO／STOP'],
          ['market', '房市', '信用管制、供給與老宅延壽資格，套到模型上'],
          ['city', '城市模擬', '2026–2046 年整個街區怎麼變'],
          ['future', '2050', '淨零、韌性、高齡、移動、複合五個鏡頭'],
        ].map(([id, t, d]) => `<button type="button" class="ch-card" data-go="${id}"><b>${t}</b><span>${d}</span></button>`).join('')}
      </div>
      <h3>數字從哪裡來</h3>
      <p class="note">每個數字旁都有標記：${src('law')} 法規條文、${src('data')} 公開統計或報導、${src('model')} 由模型幾何計算、${src('assume')} 示範假設、${src('draft')} 尚未通過的修法草案。</p>
      <p class="note">街廓、住戶與價格是虛構示範，用來說明制度與取捨，不是任何真實建案，也不是法律或投資建議。法規以全國法規資料庫為準。整理日期 ${C.MARKET.asOf}。</p>
      <h3>相關頁面</h3>
      <ul class="list links">
        <li><a href="${DASHBOARD}" target="_blank" rel="noopener">全台房市供給量體儀表板</a>：建照、開工、使照、拆照與信用管制</li>
        <li><a href="${VISION}" target="_blank" rel="noopener">3D 量體導覽 v2 願景提案</a>：未來城市五個轉變</li>
        <li><a href="${VIEWER}" target="_blank" rel="noopener">敷地 3D 量體導覽</a>：113、114 年考題示範量體</li>
        <li><a href="${BUILDER}" target="_blank" rel="noopener">BUILDER 都更決策系統</a>：真實案件的容積、共負與分回交給同一份計算核心，排出先談誰、什麼不能說</li>
      </ul>`;
  }

  function kpiRows(scen) {
    const k = MASS.kpi[scen];
    return k;
  }
  function pCompare() {
    const L = kpiRows(st.cmp.left), R = kpiRows(st.cmp.right);
    const opts = Object.keys(SCEN).map((k) => [k, SCEN[k].short]);
    const sunL = sunSummary(st.cmp.left), sunR = sunSummary(st.cmp.right);
    const gainU = MASS.fin.gain, gainD = MASS.finD.gain;
    const gainOf = (s) => (s === 'urban' ? gainU : s === 'dangerous' ? gainD : null);
    const lines = [
      ['容積率', pct(L.far, 0), pct(R.far, 0), 'model'],
      ['容積樓地板', `${fmt(L.fa)} ㎡`, `${fmt(R.fa)} ㎡`, 'model'],
      ['最高樓層', `${L.floors}F・${L.height.toFixed(0)} m`, `${R.floors}F・${R.height.toFixed(0)} m`, 'model'],
      ['建蔽率', pct(L.cover, 0), pct(R.cover, 0), 'model'],
      ['住宅戶數', `${fmt(L.units)}`, `${fmt(R.units)}`, 'model'],
      ['公眾可走的開放空間', `${fmt(L.openPublic)} ㎡`, `${fmt(R.openPublic)} ㎡`, 'model'],
      ['有電梯的住戶', pct(L.elevShare, 0), pct(R.elevShare, 0), 'model'],
      ['停車位', L.cars ? `${fmt(L.cars)} 輛` : '0', R.cars ? `${fmt(R.cars)} 輛` : '0', 'model'],
      ['冬至北側鄰房平均日照', sunL, sunR, 'model'],
      ['地主更新後價值 ÷ 更新前', gainOf(st.cmp.left) ? `${gainOf(st.cmp.left).toFixed(2)} 倍` : '—', gainOf(st.cmp.right) ? `${gainOf(st.cmp.right).toFixed(2)} 倍` : '—', 'assume'],
      ['老宅延壽補助（估）', L.subsidy ? `約 ${fmt(L.subsidy)} 萬` : '—', R.subsidy ? `約 ${fmt(R.subsidy)} 萬` : '—', 'assume'],
    ];
    const renoNote = st.cmp.left === 'renovate' || st.cmp.right === 'renovate'
      ? `<p class="note">老宅延壽補助：公共空間工程費 65%、每棟上限 960 萬（電梯 400 萬、立面 300 萬），室內每戶 20 萬（高齡或弱勢 30 萬）${src('data')}。本頁以 A–D 四棟各做電梯、立面、防水估算${src('assume')}。${esc(C.RENO.progress)}</p>`
      : '';
    const verdict = compareVerdict(st.cmp.left, st.cmp.right);
    return `
      <p class="eyebrow">方案比較</p>
      <h2>左右拖曳，比較兩種未來</h2>
      <p class="lead">模型中間的把手可以左右拖。左邊與右邊各選一個方案，下面的數字跟著換。</p>
      <div class="pair">
        <div><span class="pair-k">左</span>${seg('cmpL', opts, st.cmp.left, '左側方案')}</div>
        <div><span class="pair-k">右</span>${seg('cmpR', opts, st.cmp.right, '右側方案')}</div>
      </div>
      <div class="cmp">
        <div class="cmp-h"><span></span><b>${SCEN[st.cmp.left].label}</b><b>${SCEN[st.cmp.right].label}</b><span></span></div>
        ${lines.map(([k, a, b, s]) => `<div class="cmp-r"><span class="rk">${k}</span><span>${a}</span><span>${b}</span>${src(s)}</div>`).join('')}
      </div>
      <p class="verdict">${verdict}</p>
      ${renoNote}
      <h3>程序與時間</h3>
      ${['left', 'right'].map((side) => {
        const s = st.cmp[side];
        const k = MASS.kpi[s];
        return `<div class="proc"><b>${SCEN[s].label}</b><span>${esc(k.years)}</span><span>${esc(k.consent)}</span><span>${esc(k.relocate)}</span></div>`;
      }).join('')}
      ${say('「本案為完整計畫街廓，以都市更新整體開發取代個別危老重建，留設約 1,150 ㎡ 開放空間與 4 m 無遮簷人行道，並以一處車道出入口開設於次要道路，降低對主要道路人行的干擾。」')}`;
  }
  function sunSummary(scen) {
    const s = neighborStats(scen).filter((x) => x.after !== null);
    const mean = s.reduce((a, x) => a + x.after, 0) / s.length;
    return `${mean.toFixed(1)} 小時`;
  }
  function compareVerdict(a, b) {
    const A = MASS.kpi[a], B = MASS.kpi[b];
    if (a === b) return '左右是同一個方案。換一邊看看差異。';
    const dFa = B.fa - A.fa, dOpen = B.openPublic - A.openPublic;
    return `${SCEN[b].label}比${SCEN[a].label}${dFa >= 0 ? '多' : '少'} ${fmt(Math.abs(dFa))} ㎡ 樓地板、${dOpen >= 0 ? '多' : '少'} ${fmt(Math.abs(dOpen))} ㎡ 公眾開放空間；代價是${b === 'urban' ? '時間最長、需要 4/5 同意' : b === 'dangerous' ? '每宗基地都要 100% 同意，四棟各自為政' : b === 'renovate' ? '容積不增加、停車問題仍在' : '問題原地不動'}。`;
  }

  function pBonus() {
    const route = C.ROUTES[st.route];
    const picks = st.picks[st.route];
    const isU = st.route === 'urban';
    const sum = isU ? MASS.ub : null;
    const items = route.items.map((it) => {
      if (it.type === 'orig') {
        const applies = isU ? false : MASS.dangerous.some((p) => p.orig > p.area * 3);
        return `<div class="item${applies ? '' : ' off'}"><div class="item-h"><b>${it.label}</b><span class="law">${it.law}</span>${src('law')}</div><p class="note">${esc(it.note)}${!isU ? '（P1、P2 原容積約 350%，適用）' : ''}</p></div>`;
      }
      if (it.type === 'scale') {
        return `<div class="item"><div class="item-h"><b>${it.label}</b><span class="law">${it.law}</span>${src('law')}</div><p class="note">${esc(it.note)}</p></div>`;
      }
      const cur = picks[it.id] || it.options[0].id;
      return `<div class="item${it.id === 'draft' ? ' draft' : ''}"><div class="item-h"><label for="pick-${it.id}"><b>${it.label}</b></label><span class="law">${it.law}</span>${src(it.id === 'draft' ? 'draft' : 'law')}</div>
        <select id="pick-${it.id}" data-item="${it.id}">${it.options.map((o) => `<option value="${o.id}"${o.id === cur ? ' selected' : ''}>${esc(o.label)}${o.pct ? `（${(o.pct * 100).toFixed(1).replace(/\.0$/, '')}%）` : ''}</option>`).join('')}</select>
        ${it.note ? `<p class="note">${esc(it.note)}</p>` : ''}</div>`;
    }).join('');
    let result;
    if (isU) {
      const s = MASS.ub, stk = MASS.stack;
      const bar = bonusBar(s.pctInside, 0.5, s.pctOutside);
      result = `
        <div class="big"><span class="big-v">${pct(s.pctTotal, 1)}</span><span class="big-k">獎勵合計（上限 ${s.pctOutside ? '另計草案' : '50%'}）</span></div>
        ${bar}
        ${s.overCap ? `<p class="warn">超過 ${esc(s.capLabel)}，有 ${fmt(s.lostFA)} ㎡ 用不到。</p>` : ''}
        <div class="rows">
          ${row('基準容積', `${fmt(s.baseFA)} ㎡（300%）`, 'law')}
          ${row('獎勵後容積', `${fmt(s.finalFA)} ㎡（${pct(s.finalFAR, 0)}）`, 'model')}
          ${row('樓層／高度', `${stk.floors}F・${stk.height.toFixed(1)} m`, 'model')}
          ${row('標準層', `${C.URBAN.plan.length} 戶 × ${stk.towerFloors} 層 ＝ ${MASS.towerUnits} 戶`, 'assume')}
          ${row('未用容積', `${fmt(stk.spareFA)} ㎡`, 'model', 'muted')}
        </div>`;
    } else {
      result = `
        <div class="rows">
          ${MASS.dangerous.map((p) => row(`${p.id}（${fmt(p.area)} ㎡）`, `${pct(p.sum.pctTotal, 1)} → ${pct(p.sum.finalFAR, 0)}・${p.floors}F${p.sum.overCap ? '（已達上限）' : ''}`, 'model')).join('')}
          ${row('四宗合計容積', `${fmt(MASS.dFA)} ㎡（${pct(MASS.dFA / C.SITE.area, 0)}）`, 'model')}
        </div>
        <p class="note">每宗各自檢討上限：P1、P2 原容積高於基準，適用 1.15 倍原建築容積；P3、P4 為 1.3 倍基準容積。規模獎勵在上限之外另計。</p>`;
    }
    const checks = isU ? urbanChecks() : '';
    return `
      <p class="eyebrow">容積獎勵</p>
      <h2>${isU ? '每一項獎勵，換來一層樓' : '危老：四宗基地各算各的'}</h2>
      ${seg('route', [['urban', '都市更新'], ['dangerous', '危老重建']], st.route, '重建途徑')}
      <p class="note">${esc(route.law)}。${esc(route.consent)}。</p>
      ${result}
      <h3>獎勵項目</h3>
      <div class="items">${items}</div>
      <p class="note">${esc(route.local)}</p>
      ${checks}
      ${say(isU ? `「本案基準容積 ${fmt(BASE_FA)} ㎡，申請結構安全、綠建築、耐震設計等獎勵合計 ${pct(MASS.ub.pctTotal, 1)}，未逾都市更新條例 1.5 倍基準容積上限；捐贈 2F 公益設施作社區長照據點與親子館。」` : '「危老重建以個別基地為單位、須全體所有權人同意，獎勵上限 1.3 倍基準容積（或 1.15 倍原建築容積），規模獎勵另計；街廓分四棟各自重建，難以留設整體開放空間。」')}`;
  }
  function bonusBar(inside, cap, outside) {
    const max = Math.max(0.8, inside + outside + 0.05);
    const w = (v) => `${(Math.min(v, max) / max) * 100}%`;
    return `<div class="bbar" role="img" aria-label="獎勵 ${pct(inside + outside, 1)}，上限 ${pct(cap, 0)}">
      <div class="bbar-fill" style="width:${w(Math.min(inside, cap))}"></div>
      ${inside > cap ? `<div class="bbar-over" style="left:${w(cap)};width:${w(inside - cap)}"></div>` : ''}
      ${outside ? `<div class="bbar-out" style="left:${w(Math.min(inside, cap))};width:${w(outside)}"></div>` : ''}
      <div class="bbar-cap" style="left:${w(cap)}"><span>上限 ${pct(cap, 0)}</span></div>
    </div>`;
  }
  function urbanChecks() {
    const k = MASS.kpi.urban;
    const foot = lotArea(C.URBAN.podium.rect);
    const legalCars = Math.ceil(Math.max(0, MASS.ub.finalFA - 500) / 300);
    const roofTotal = foot - lotArea(C.URBAN.tower.rect);
    const items = [
      ['建蔽率 ≤ 50%', `${pct(k.cover, 1)}`, k.cover <= 0.5, 'law'],
      ['退縮：臨 ≥ 10 m 道路 ≥ 3.52 m', '北、西、南各 4 m', true, 'law'],
      ['退縮：臨 < 10 m 道路 ≥ 1.5 m', '東側 8 m 巷道 2 m', true, 'law'],
      ['法定停車（§59 第二類）', `${legalCars} 輛；設計 ${k.cars} 輛（一戶一汽車）`, true, 'law'],
      ['屋頂光電義務（建築面積 ≥ 1,000 ㎡）', `${fmt(foot)} ㎡ → ${(foot / 20).toFixed(1)} kW`, null, 'law'],
      ['雨水貯集滯洪（§4-3）', `${fmt(C.SITE.area * 0.045, 1)} m³ 以上`, null, 'law'],
      ['裙樓屋頂綠化 ≥ 1/2', `可綠化約 ${fmt(roofTotal)} ㎡，設計全面綠化`, true, 'law'],
      ['高層建築物（≥ 50 m）', `${k.height.toFixed(1)} m：需緊急昇降機、防災中心`, null, 'law'],
      ['冬至日照 §39-1', '見「日照陰影」章', null, 'law'],
    ];
    return `<h3>都審與法規快檢（新北）</h3>
      <div class="checks">${items.map(([a, b, ok, s]) => `<div class="check">${checkMark(ok)}<div><b>${a}</b><span>${b}</span></div>${src(s)}</div>`).join('')}</div>
      <p class="note">退縮、停車與屋頂綠化數字依新北市《都市設計審議原則》整理（本知識庫 02 都審原則與教學檢核）；個案以審議結果為準。</p>`;
  }

  function pSun() {
    const day = DAYS[st.sun.day];
    const sp = K.sunPosition(C.GEO, day.n, st.sun.hour);
    const times = K.sunTimes(C.GEO, day.n);
    const stats = neighborStats(st.sun.scen);
    const allOk = stats.every((x) => x.ok);
    const modes = [['hours', '日照時數'], ['rule', '§39-1 檢討'], ['loss', '新增遮蔭'], ['off', '關閉']];
    const scens = [['urban', '都更'], ['dangerous', '危老'], ['now', '現況']];
    return `
      <p class="eyebrow">日照陰影</p>
      <h2>${day.label}，北側鄰房還曬得到太陽嗎</h2>
      <p class="lead">陰影是即時的：拖下方時間軸看一天的變化。地面色塊是整天（08:00–16:00）累積的日照時數。</p>
      ${seg('sunDay', Object.keys(DAYS).map((k) => [k, `${DAYS[k].label} ${DAYS[k].date}`]), st.sun.day, '日期')}
      ${seg('sunScen', scens, st.sun.scen, '方案')}
      ${seg('sunMode', modes, st.sun.mode, '地面圖層')}
      <label class="toggle"><input type="checkbox" id="sunCompare"${st.sun.compare ? ' checked' : ''}> 和現況左右對照</label>
      <div class="rows">
        ${row('太陽', `高度角 ${sp.alt.toFixed(1)}°・方位 ${sp.az.toFixed(0)}°`, 'model')}
        ${row('日出／日落', `${K.hhmm(times.rise)}／${K.hhmm(times.set)}`, 'model')}
      </div>
      ${heatLegend(st.sun.mode)}
      <h3>鄰房檢核（${SCEN[st.sun.scen].label}）</h3>
      <div class="ntable">
        <div class="nt-h"><span>鄰房</span><span>現況</span><span>方案</span><span>§39-1</span></div>
        ${stats.map((x) => `<div class="nt-r" data-focus="${x.b.id}"><span>${esc(x.b.name)} ${x.b.floors}F</span><span>${x.before === null ? '—' : x.before.toFixed(1) + ' h'}</span><span>${x.after === null ? '—' : x.after.toFixed(1) + ' h'}</span><span>${st.sun.scen === 'now' ? '—' : x.ruleMin >= 7.99 ? '<span class="chk ok">無影響</span>' : x.ok ? `<span class="chk ok">${x.ruleMin.toFixed(1)} h</span>` : `<span class="chk bad">${x.ruleMin.toFixed(1)} h</span>`}</span></div>`).join('')}
      </div>
      <p class="note">「現況／方案」是鄰房基地空地上的平均日照時數（含所有建物陰影）；§39-1 欄只計方案中 21 m 以上部分的陰影，列出鄰地最少的有效日照，須 ≥ 1 小時。${st.sun.scen !== 'now' ? (allOk ? '本方案九棟鄰房都符合。' : '有鄰房未達 1 小時，需調整塔樓位置或高度。') : ''}</p>
      <p class="note">假設：北緯 ${C.GEO.lat}°、東經 ${C.GEO.lon}° 換算臺灣標準時；有效日照時段以 08:00–16:00 示意（法規未定義時段，各地另有檢討辦法）；只算建築量體，不含樹木與地形。${src('assume')}</p>
      ${say('「依建築技術規則設計施工編 §39-1，本案高度超過 21 m 部分於冬至日造成之陰影，經模擬鄰近住宅區、商業區基地仍有 1 小時以上有效日照；塔樓配置於基地東半部並退縮，陰影主要落在北側 20 m 道路。」')}`;
  }
  function heatLegend(mode) {
    if (mode === 'off') return '';
    if (mode === 'hours') return `<div class="legend"><span><i style="background:var(--heat-0)"></i>&lt; 1 h</span><span><i style="background:var(--heat-1)"></i>1–2 h</span><span><i style="background:var(--heat-2)"></i>2–4 h</span><span><i style="background:var(--heat-3)"></i>4–6 h</span><span><i class="clear"></i>≥ 6 h</span></div>`;
    if (mode === 'loss') return `<div class="legend"><span><i style="background:var(--heat-loss)"></i>比現況少曬的地方（越深越多）</span></div>`;
    return `<div class="legend"><span><i style="background:var(--heat-0)"></i>鄰地有效日照 &lt; 1 h</span><span><i style="background:var(--heat-loss)"></i>21 m 以上部分的陰影範圍</span></div>`;
  }

  function pShare() {
    const f = MASS.fin;
    const u = C.OLD_UNITS.find((x) => x.id === st.share.oldId) || C.OLD_UNITS[0];
    const owner = f.ownersById[u.id];
    const alloc = f.allocOf(owner.value);
    const share = owner.value / f.ownersValue;
    const target = f.units.find((x) => x.floor === st.share.floor && x.unit === st.share.unit) || f.units[0];
    const carCost = st.share.car ? C.MARKET.carPrice : 0;
    const diff = alloc - target.price - carCost;
    const eqPing = alloc / f.unitPrice(12);
    const inOld = u.ping * (u.kind === 'flat' || u.kind === 'shop' ? 0.95 : 0.92);
    const inNew = eqPing * (1 - C.URBAN.shareRatio);
    const groups = {};
    C.OLD_UNITS.forEach((x) => { (groups[x.bld] = groups[x.bld] || []).push(x); });
    const oldOpts = Object.keys(groups).map((g) => `<optgroup label="${esc(C.OLD.find((b) => b.id === g).name)}">${groups[g].map((x) => `<option value="${x.id}"${x.id === u.id ? ' selected' : ''}>${esc(x.label)}・${x.ping.toFixed(1)} 坪</option>`).join('')}</optgroup>`).join('');
    const cost = f.cost;
    return `
      <p class="eyebrow">分回試算</p>
      <h2>你的舊家，換回幾坪</h2>
      <p class="lead">左邊點你的舊家，右邊樓層表選新家。都更以「權利變換」分配：更新後總價值扣掉共同負擔，再依每戶更新前價值的比例分回。</p>
      <div class="field"><label for="oldSel">1．我的舊家</label><select id="oldSel">${oldOpts}</select></div>
      <div class="rows">
        ${row('權狀面積', `${u.ping.toFixed(1)} 坪（${fmt(u.m2)} ㎡）`, 'model')}
        ${row('更新前權利價值', `${fmt(owner.value)} 萬元`, 'assume')}
        ${row('權值比例', pct(share, 2), 'model')}
      </div>
      <div class="big"><span class="big-v">${fmt(alloc)} <small>萬元</small></span><span class="big-k">應分配價值${src('model')}</span></div>
      <div class="tiles two">
        ${tile('約可換權狀', `${eqPing.toFixed(1)} 坪`, `舊家的 ${(eqPing / u.ping).toFixed(2)} 倍`, 'model')}
        ${tile('約可換室內', `${inNew.toFixed(1)} 坪`, `舊家室內的 ${(inNew / inOld).toFixed(2)} 倍`, 'model')}
      </div>
      <p class="note">新大樓公設比 ${pct(C.URBAN.shareRatio, 0)}（新北 2025 年新案平均 34.7%${src('data')}），舊公寓約 5%：權狀坪數接近 1:1，室內常只剩約七成，這是地主最容易誤會的地方。</p>
      <h3>2．選新家</h3>
      <p class="note">用右側樓層表或在模型上點一戶。</p>
      <div class="rows">
        ${row('選配', `${target.floor} 樓 ${target.unit} 戶・${target.type}・${target.ping.toFixed(1)} 坪`, 'assume')}
        ${row('房屋價格', `${fmt(target.price)} 萬元（${f.unitPrice(target.floor).toFixed(1)} 萬／坪）`, 'assume')}
        <label class="row toggle-row"><span class="rk"><input type="checkbox" id="wantCar"${st.share.car ? ' checked' : ''}> 加選一個車位</span><span class="rv">${fmt(C.MARKET.carPrice)} 萬元</span>${src('data')}</label>
      </div>
      <div class="settle ${diff >= 0 ? 'pos' : 'neg'}"><b>${diff >= 0 ? '領回差額' : '需補繳'}</b><span>${fmt(Math.abs(diff))} 萬元</span></div>
      <h3>3．調整假設</h3>
      <div class="field range"><label for="pNew">更新後單價 <output id="pNewV">${st.share.priceNew}</output> 萬／坪</label><input type="range" id="pNew" min="60" max="110" step="1" value="${st.share.priceNew}"><span class="note">板橋近捷運新案約 70–90 萬${src('data')}</span></div>
      <div class="field range"><label for="pOld">舊公寓單價 <output id="pOldV">${st.share.priceOld}</output> 萬／坪</label><input type="range" id="pOld" min="35" max="65" step="1" value="${st.share.priceOld}"><span class="note">30–50 年公寓 2026 成交多在 43–55 萬${src('data')}</span></div>
      <div class="field range"><label for="pCost">營建單價（提列）<output id="pCostV">${st.share.cost}</output> 萬／坪</label><input type="range" id="pCost" min="18" max="34" step="0.5" value="${st.share.cost}"><span class="note">業者稱北部 RC 高樓實際約 25–29 萬、SRC 32–33 萬${src('data')}</span></div>
      <h3>共同負擔 ${pct(f.burdenRatio, 1)}</h3>
      <div class="rows">
        ${row('更新後總價值', `${K.money(f.total)}元`, 'model')}
        ${row('工程費', `${K.money(cost.build)}元`, 'assume')}
        ${row('權變、利息、稅捐、行政', `${K.money(cost.rtFees + cost.interest + cost.tax + cost.admin)}元`, 'assume')}
        ${row('拆遷安置（租金 5 年）', `${K.money(cost.relocation)}元`, 'assume')}
        ${row('風險管理＋銷售管理', `${K.money(cost.risk + cost.sales)}元`, 'assume')}
        ${row('地主可分配', `${K.money(f.pool)}元（整體 ${f.gain.toFixed(2)} 倍）`, 'model')}
      </div>
      <p class="note">新北近年案件共同負擔多在 45–56%（公開案例 55.71%，2026-08 審議）${src('data')}。本頁用簡化公式，實際以估價師查估與審議核定為準。</p>
      <p class="note">真實案件請改用 <a href="${BUILDER}" target="_blank" rel="noopener">BUILDER</a> 的四步流程：權利變換、共同負擔與分回都由同一份計算核心產出，並逐戶排出整合順序。</p>`;
  }

  // ── 城市模擬 ───────────────────────────────────────────────────
  let SIMF = null, SIMBASE = null;
  const simIndex = {};
  C.SIM_BUILDINGS.forEach((b, i) => { simIndex[b.id] = i; });
  function runSim() {
    SIMF = K.simulate({ buildings: C.SIM_BUILDINGS }, st.city.policy, C.SIM.market, C.SIM.years);
    SIMBASE = K.simulate({ buildings: C.SIM_BUILDINGS }, C.SIM.presets.current.policy, C.SIM.market, C.SIM.years);
    pushSim();
    dock.hidden = false;
    renderDock();
  }
  function frameOf(y) { return SIMF[Math.max(0, Math.min(SIMF.length - 1, y - C.SIM.years[0]))]; }
  function pushSim() {
    const fr = frameOf(st.city.year);
    S.setSim({ year: st.city.year, frame: fr, index: simIndex });
  }
  function cumulative(frames, y, key) {
    return frames.filter((f) => f.year <= y).reduce((s, f) => s + f.ev[key], 0);
  }
  function pCity() {
    const fr = frameOf(st.city.year);
    const base = SIMBASE[st.city.year - C.SIM.years[0]];
    const P = st.city.policy;
    const started = cumulative(SIMF, st.city.year, 'started');
    const reno = cumulative(SIMF, st.city.year, 'renovated');
    const presets = Object.keys(C.SIM.presets).map((k) => [k, C.SIM.presets[k].label]);
    const delta = (a, b, f) => (Math.abs(a - b) < 1e-9 ? '' : `<span class="delta ${a > b ? 'up' : 'down'}">${a > b ? '+' : '−'}${f(Math.abs(a - b))} 對照現行</span>`);
    const facts = C.MARKET.facts.map((x) => `<div class="fact"><span class="fk">${esc(x.k)}</span><b>${esc(x.v)}</b><span class="fd">${esc(x.d)}</span>${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.src)}</a>` : `<span class="fd">${esc(x.src)}</span>`}</div>`).join('');
    return `
      <p class="eyebrow">城市模擬 ${C.SIM.years[0]}–${C.SIM.years[1]}</p>
      <h2>${st.city.year} 年，這個街區有 ${pct(fr.oldShare, 0)} 住戶住在 30 年以上的老屋</h2>
      <p class="lead">周邊 ${C.SIM_BUILDINGS.length} 棟建物每年依「地主分回是否划算、同意門檻、信用環境」決定是否重建或做老宅延壽。拖下方年份，或換一組政策。</p>
      ${seg('preset', presets, st.city.preset, '政策組合')}
      <div class="tiles">
        ${tile('30 年以上老屋住戶', pct(fr.oldShare, 0), delta(fr.oldShare, base.oldShare, (v) => pct(v, 0)), 'model')}
        ${tile('有電梯的住戶', pct(fr.elevShare, 0), delta(fr.elevShare, base.elevShare, (v) => pct(v, 0)), 'model')}
        ${tile('累計啟動重建', `${started} 棟`, `另有 ${reno} 棟老宅延壽`, 'model')}
        ${tile('施工中暫離的住戶', `${fmt(fr.offline)} 戶`, `新建單價約 ${fr.priceNew.toFixed(0)} 萬／坪`, 'model')}
      </div>
      <div class="chart" id="chartShare" aria-label="老屋與電梯住戶比例"></div>
      <div class="chart" id="chartEv" aria-label="每年啟動重建與完工棟數"></div>
      <h3>政策與市場</h3>
      <div class="field"><label for="polSunset">危老申請期限</label>
        <select id="polSunset"><option value="1"${P.dangerousSunset ? ' selected' : ''}>2027-05-31 落日（現行）</option><option value="0"${!P.dangerousSunset ? ' selected' : ''}>刪除期限（草案）</option></select></div>
      <div class="field"><label for="polBonus">社宅／婚育宅加碼</label>
        <select id="polBonus"><option value="0"${!P.extraBonus ? ' selected' : ''}>無（現行）</option><option value="0.15"${P.extraBonus ? ' selected' : ''}>+15% 基準容積（草案）</option></select></div>
      <div class="field"><label for="polLife">老宅延壽補助</label>
        <select id="polLife"><option value="0"${P.extendLife === 0 ? ' selected' : ''}>2027 年後停辦</option><option value="1"${P.extendLife === 1 ? ' selected' : ''}>維持現行</option><option value="2"${P.extendLife === 2 ? ' selected' : ''}>擴大（放寬公寓門檻）</option></select></div>
      <div class="field"><label for="polCredit">信用環境</label>
        <select id="polCredit"><option value="loose"${P.credit === 'loose' ? ' selected' : ''}>寬鬆</option><option value="current"${P.credit === 'current' ? ' selected' : ''}>現行（第二戶 7 成）</option><option value="tight"${P.credit === 'tight' ? ' selected' : ''}>緊縮</option></select></div>
      <div class="field range"><label for="polPrice">房價年變動 <output id="polPriceV">${(P.priceGrowth * 100).toFixed(0)}</output>%</label><input type="range" id="polPrice" min="-3" max="6" step="1" value="${P.priceGrowth * 100}"></div>
      <div class="field range"><label for="polCost">營建成本年增 <output id="polCostV">${(P.costGrowth * 100).toFixed(0)}</output>%</label><input type="range" id="polCost" min="0" max="8" step="1" value="${P.costGrowth * 100}"><span class="note">營造工程物價指數 2026-06 年增 6.4%${src('data')}</span></div>
      <div class="legend city">
        <span><i style="background:var(--age-0)"></i>&lt; 15 年</span><span><i style="background:var(--age-1)"></i>15–30 年</span>
        <span><i style="background:var(--age-2)"></i>30–45 年</span><span><i style="background:var(--age-3)"></i>45 年以上</span>
        <span><i style="background:var(--sim-reno)"></i>老宅延壽</span><span><i style="background:var(--sim-build)"></i>施工中</span><span><i style="background:var(--sim-new)"></i>重建完成</span>
      </div>
      <p class="note">示範案依都更時程 ${C.SIM.caseStart} 年動工、${C.SIM.caseDone} 年完工。模型是教學示意：每棟樓的重建機率由「地主更新後價值 ÷ 更新前價值」、同意門檻（危老 100%、都更 4/5）與信用環境決定，參數是假設，不是預測。${src('assume')}</p>
      <h3>現實參照（${esc(C.MARKET.asOf)} 整理）</h3>
      <div class="facts">${facts}</div>
      <p class="note">最新數字見 <a href="${DASHBOARD}" target="_blank" rel="noopener">全台房市供給量體儀表板</a>。</p>
      <h3>近期政策動態</h3>
      <ul class="list news">${C.MARKET.news.map((n) => `<li><span class="date">${n.date}</span>${esc(n.text)}${n.url ? ` <a href="${esc(n.url)}" target="_blank" rel="noopener">來源</a>` : ''}</li>`).join('')}</ul>`;
  }

  function drawCharts() {
    const box1 = $('chartShare'), box2 = $('chartEv');
    if (!box1 || !box2) return;
    const W = Math.max(260, box1.clientWidth || 320);
    const H = 150, m = { l: 34, r: 10, t: 22, b: 22 };
    const ys = SIMF.map((f) => f.year);
    const x = (y) => m.l + ((y - ys[0]) / (ys[ys.length - 1] - ys[0])) * (W - m.l - m.r);
    const yv = (v) => m.t + (1 - v) * (H - m.t - m.b);
    const line = (frames, key) => frames.map((f, i) => `${i ? 'L' : 'M'}${x(f.year).toFixed(1)},${yv(f[key]).toFixed(1)}`).join('');
    const cur = st.city.year;
    const fr = frameOf(cur);
    const grid = [0, 0.25, 0.5, 0.75, 1].map((v) => `<line x1="${m.l}" x2="${W - m.r}" y1="${yv(v)}" y2="${yv(v)}" class="g"/><text x="${m.l - 6}" y="${yv(v) + 3.5}" class="t" text-anchor="end">${v * 100}%</text>`).join('');
    const ticks = [2026, 2031, 2036, 2041, 2046].map((y) => `<text x="${x(y)}" y="${H - 6}" class="t" text-anchor="middle">${y}</text>`).join('');
    box1.innerHTML = `<div class="chart-h"><b>住戶比例</b><span class="lg"><i class="s1"></i>30 年以上老屋</span><span class="lg"><i class="s2"></i>有電梯</span><span class="lg"><i class="sb"></i>現行制度</span></div>
      <svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="老屋比例與電梯比例">
        ${grid}${ticks}
        <path d="${line(SIMBASE, 'oldShare')}" class="base"/><path d="${line(SIMBASE, 'elevShare')}" class="base"/>
        <path d="${line(SIMF, 'oldShare')}" class="s1"/><path d="${line(SIMF, 'elevShare')}" class="s2"/>
        <line x1="${x(cur)}" x2="${x(cur)}" y1="${m.t - 6}" y2="${H - m.b}" class="cur"/>
        <circle cx="${x(cur)}" cy="${yv(fr.oldShare)}" r="3.5" class="s1d"/><circle cx="${x(cur)}" cy="${yv(fr.elevShare)}" r="3.5" class="s2d"/>
      </svg>`;
    const maxEv = Math.max(3, ...SIMF.map((f) => Math.max(f.ev.started, f.ev.completed + f.ev.renovated)));
    const bw = Math.max(2, (W - m.l - m.r) / ys.length / 2 - 1);
    const yb = (v) => m.t + (1 - v / maxEv) * (H - m.t - m.b);
    const bars = SIMF.map((f) => {
      const cx = x(f.year);
      return `<rect x="${(cx - bw - 0.5).toFixed(1)}" y="${yb(f.ev.started).toFixed(1)}" width="${bw}" height="${(yb(0) - yb(f.ev.started)).toFixed(1)}" class="b1"/>
        <rect x="${(cx + 0.5).toFixed(1)}" y="${yb(f.ev.completed).toFixed(1)}" width="${bw}" height="${(yb(0) - yb(f.ev.completed)).toFixed(1)}" class="b2"/>
        <rect x="${(cx + 0.5).toFixed(1)}" y="${yb(f.ev.completed + f.ev.renovated).toFixed(1)}" width="${bw}" height="${(yb(f.ev.completed) - yb(f.ev.completed + f.ev.renovated)).toFixed(1)}" class="b3"/>`;
    }).join('');
    const gridB = [0, Math.round(maxEv / 2), maxEv].map((v) => `<line x1="${m.l}" x2="${W - m.r}" y1="${yb(v)}" y2="${yb(v)}" class="g"/><text x="${m.l - 6}" y="${yb(v) + 3.5}" class="t" text-anchor="end">${v}</text>`).join('');
    box2.innerHTML = `<div class="chart-h"><b>每年棟數</b><span class="lg"><i class="b1"></i>啟動重建</span><span class="lg"><i class="b2"></i>重建完工</span><span class="lg"><i class="b3"></i>老宅延壽</span></div>
      <svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="每年啟動重建、完工與老宅延壽棟數">${gridB}${ticks}${bars}<line x1="${x(cur)}" x2="${x(cur)}" y1="${m.t - 6}" y2="${H - m.b}" class="cur"/></svg>`;
  }

  function pFuture() {
    const k = MASS.kpi.urban;
    const foot = lotArea(C.URBAN.podium.rect);
    const pvNeed = foot / 20;
    const pvHave = (7 * 18 + 3 * 18) * 0.2;
    const walks = S.walkLabels;
    const t = (d, v) => `${Math.round(d / v / 60 * 10) / 10} 分`;
    const lenses = {
      netzero: {
        t: '淨零', h: `屋頂光電還差 ${(pvNeed - pvHave).toFixed(0)} kW`,
        body: `建築面積 ${fmt(foot)} ㎡ 達 1,000 ㎡，依再生能源發展條例須設 ${pvNeed.toFixed(1)} kW（每 20 ㎡ 1 kW）${src('law')}。塔樓屋頂扣掉屋突只能放約 ${pvHave.toFixed(0)} kW${src('model')}，其餘要靠裙樓屋頂或立面光電，和屋頂綠化 ≥ 1/2 的都審要求互相拉扯。`,
        say: '「裙樓建築面積逾 1,000 ㎡，依再生能源發展條例設置屋頂太陽光電；塔樓屋頂設置不足部分，以裙樓屋頂半區光電、半區綠化，兼顧都審屋頂綠化比例。」',
      },
      resilience: {
        t: '韌性', h: `滯洪 ${fmt(C.SITE.area * 0.045, 1)} m³＋1,150 ㎡ 避難空地`,
        body: `都市計畫地區新建須設雨水貯集滯洪設施，容量 ≥ 基地面積 × 0.045 m³${src('law')}。開放空間平時是廣場，地震時是就地避難空間，以每人 2 ㎡ 計約可容納 ${fmt(1152 / 2)} 人${src('assume')}；往西 60 m 就是鄰里公園（臨時避難），20 m 道路是緊急道路。`,
        say: '「基地留設約 1,150 ㎡ 開放空間兼作地震就地避難，並設雨水貯集滯洪設施；避難動線沿 12 m 道路連結西側鄰里公園，20 m 計畫道路為緊急道路。」',
      },
      aging: {
        t: '超高齡', h: `走到捷運 ${t(walks.mrt.d, 0.8)}（長者步速）`,
        body: `以長者每秒 0.8 m 計${src('assume')}：捷運 ${fmt(walks.mrt.d)} m 約 ${t(walks.mrt.d, 0.8)}、診所 ${fmt(walks.clinic.d)} m 約 ${t(walks.clinic.d, 0.8)}、公園 ${fmt(walks.park.d)} m 約 ${t(walks.park.d, 0.8)}、傳統市場 ${fmt(walks.market.d)} m 約 ${t(walks.market.d, 0.8)}${src('model')}。2F 長照據點讓住戶不出大樓就能用到照顧服務；全棟有電梯，現況是 0 部。`,
        say: '「本案位於捷運站步行 5 分鐘範圍內，2F 設社區長照據點，配合無障礙通路與電梯，讓高齡住戶在步行 15 分鐘內取得交通、醫療、綠地與市場等日常服務。」',
      },
      mobility: {
        t: '移動', h: `${k.cars} 個車位，未來可能用不完`,
        body: `新北都審以一戶一汽車為原則，設計 ${k.cars} 輛、地下 3 層${src('law')}。基地離捷運 500 m 內，若 2050 年停車需求降三成，B3 約 ${Math.round(k.cars * 0.3)} 個車位可轉作社區倉儲或防災物資庫；層高與坡道要先留轉用條件${src('assume')}。`,
        say: '「基地位於捷運 500 m 範圍內，停車依都審原則一戶一車位設置於地下，車道出入口設於東側次要道路；地下停車層預留轉用為社區倉儲與防災物資空間的彈性。」',
      },
      mixed: {
        t: '立體複合', h: MASS.donate ? '2F 捐出 900 ㎡ 做長照與親子' : '2F 目前作店鋪辦公出售',
        body: MASS.donate ? `捐贈公益設施可換回同面積的容積獎勵（${pct(900 / BASE_FA, 1)}）${src('law')}，等於用不能賣的樓地板換來社區服務：住戶與鄰里共用的長照據點、親子館疊在店面之上、住宅之下。` : `在「容積獎勵」章把捐贈公益設施打開，2F 就會變成社區長照據點與親子館，同時換回 ${pct(900 / BASE_FA, 1)} 的容積獎勵。`,
        say: '「低層為店面與社區公益設施，2F 捐贈作社區長照據點及親子館，與上層住宅以獨立出入口與垂直動線分流，形成垂直複合的街廓核心。」',
      },
    };
    const cur = lenses[st.lens];
    return `
      <p class="eyebrow">2050 未來鏡頭</p>
      <h2>同一棟樓，放進 2050 年的城市</h2>
      <p class="lead">延續「未來城市願景」的五個轉變，點一個鏡頭，模型會換上對應的圖層。</p>
      ${seg('lens', Object.keys(lenses).map((id) => [id, lenses[id].t]), st.lens, '未來鏡頭')}
      <div class="lens-card"><h3>${cur.h}</h3><p>${cur.body}</p></div>
      ${say(cur.say)}
      <p class="note">願景文件：<a href="${VISION}" target="_blank" rel="noopener">3D 量體導覽 v2 願景提案</a>。</p>`;
  }

  // ── 面板事件 ───────────────────────────────────────────────────
  function bindSeg(id, fn) {
    const el = $(id);
    if (!el) return;
    el.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => fn(b.dataset.v)));
  }
  function bindPanel() {
    panelBody.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => go(b.dataset.go, true)));
    panelBody.querySelectorAll('.copy').forEach((b) => b.addEventListener('click', () => copyText(b.dataset.copy, b)));
    const ch = st.chapter;
    if (ch === 'compare') {
      bindSeg('cmpL', (v) => { st.cmp.left = v; S.setCompare(st.cmp.left, st.cmp.right); renderPanel(); updateSwipeTags(); });
      bindSeg('cmpR', (v) => { st.cmp.right = v; S.setCompare(st.cmp.left, st.cmp.right); renderPanel(); updateSwipeTags(); });
    }
    if (ch === 'bonus') {
      bindSeg('route', (v) => { st.route = v; S.setScenario(v); renderPanel(); });
      panelBody.querySelectorAll('select[data-item]').forEach((s) => s.addEventListener('change', () => {
        st.picks[st.route][s.dataset.item] = s.value;
        recompute();
        const y = panelBody.scrollTop;
        renderPanel();
        panelBody.scrollTop = y;
      }));
    }
    if (ch === 'sun') {
      bindSeg('sunDay', (v) => { st.sun.day = v; applySun(); renderPanel(); });
      bindSeg('sunScen', (v) => { st.sun.scen = v; applySun(); renderPanel(); });
      bindSeg('sunMode', (v) => { st.sun.mode = v; applySun(); renderPanel(); });
      const cb = $('sunCompare');
      if (cb) cb.addEventListener('change', () => { st.sun.compare = cb.checked; applySun(); });
      panelBody.querySelectorAll('[data-focus]').forEach((r) => r.addEventListener('click', () => focusBuilding(r.dataset.focus)));
    }
    if (ch === 'share') {
      const sel = $('oldSel');
      if (sel) sel.addEventListener('change', () => { st.share.oldId = sel.value; S.highlightOld(sel.value); suggestUnit(); renderPanel(); });
      const car = $('wantCar');
      if (car) car.addEventListener('change', () => { st.share.car = car.checked; renderPanel(); });
      [['pNew', 'priceNew'], ['pOld', 'priceOld'], ['pCost', 'cost']].forEach(([id, key]) => {
        const r = $(id);
        if (!r) return;
        r.addEventListener('input', () => { $(id + 'V').textContent = r.value; });
        r.addEventListener('change', () => {
          st.share[key] = Number(r.value);
          MASS.fin = finance();
          MASS.finD = financeDangerous();
          const y = panelBody.scrollTop;
          renderPanel();
          panelBody.scrollTop = y;
        });
      });
    }
    if (ch === 'city') {
      bindSeg('preset', (v) => { st.city.preset = v; st.city.policy = Object.assign({}, C.SIM.presets[v].policy); runSim(); renderPanel(); });
      const P = st.city.policy;
      const onPol = () => { st.city.preset = matchPreset(); runSim(); const y = panelBody.scrollTop; renderPanel(); panelBody.scrollTop = y; };
      const bindSel = (id, fn) => { const e = $(id); if (e) e.addEventListener('change', () => { fn(e.value); onPol(); }); };
      bindSel('polSunset', (v) => { P.dangerousSunset = v === '1'; });
      bindSel('polBonus', (v) => { P.extraBonus = Number(v); });
      bindSel('polLife', (v) => { P.extendLife = Number(v); });
      bindSel('polCredit', (v) => { P.credit = v; });
      [['polPrice', 'priceGrowth'], ['polCost', 'costGrowth']].forEach(([id, key]) => {
        const r = $(id);
        if (!r) return;
        r.addEventListener('input', () => { $(id + 'V').textContent = r.value; });
        r.addEventListener('change', () => { P[key] = Number(r.value) / 100; onPol(); });
      });
    }
    if (ch === 'case') {
      const keep = () => { const y = panelBody.scrollTop; renderPanel(); panelBody.scrollTop = y; };
      bindSeg('coreStep', (v) => { st.core.step = v; showCoreMass(); renderPanel(); });
      bindSeg('coreStage', (v) => { st.core.stage = Number(v); keep(); });
      const live = (id, apply, label) => {
        const e = $(id);
        if (!e) return;
        e.addEventListener('input', () => { apply(Number(e.value)); $(id + 'V').textContent = label(Number(e.value)); showCoreMass(); });
        e.addEventListener('change', () => { apply(Number(e.value)); showCoreMass(); keep(); });
      };
      live('cB', (v) => { st.core.b = v; }, (v) => `${Math.round(BG.bonus[v] * 100)}%`);
      live('cF', (v) => { st.core.floors = v; }, (v) => `${v} 層（${v + 2}F）`);
      live('cP', (v) => { st.core.p = v; }, (v) => `${BG.price[v]} 萬／坪`);
      live('cC', (v) => { st.core.c = v; }, (v) => `${BG.cost[v]} 萬／坪`);
      const fitBtn = $('cFit');
      if (fitBtn) fitBtn.addEventListener('click', () => { st.core.floors = null; showCoreMass(); keep(); });
      const own = $('cOwner');
      if (own) own.addEventListener('change', () => { st.core.owner = own.value; S.highlightOld(own.value); keep(); });
    }
    if (ch === 'market') {
      panelBody.querySelectorAll('[data-mkp]').forEach((b) => b.addEventListener('click', () => {
        const [pv, cv] = b.dataset.mkp.split(',').map(Number);
        st.core.p = BG.price.indexOf(pv);
        st.core.c = BG.cost.indexOf(cv);
        st.core.step = 'product';
        go('case', true);
      }));
    }
    if (ch === 'future') {
      bindSeg('lens', (v) => { st.lens = v; applyLayers('future'); renderPanel(); lensCamera(v); });
    }
  }
  function matchPreset() {
    const P = st.city.policy;
    const same = (a) => Object.keys(a).every((k) => a[k] === P[k]);
    const hit = Object.keys(C.SIM.presets).find((k) => same(C.SIM.presets[k].policy));
    return hit || 'custom';
  }
  function lensCamera(v) {
    if (v === 'aging' || v === 'mobility') S.view('city');
    else if (v === 'resilience') S.flyTo({ target: [-40, 0, -4], pos: [-10, 190, 170], fov: 38 });
    else S.view('site');
  }
  function copyText(text, btn) {
    const done = () => { btn.textContent = '已複製'; setTimeout(() => { btn.textContent = '複製'; }, 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, () => selectFallback(btn));
    } else selectFallback(btn);
  }
  function selectFallback(btn) {
    const p = btn.parentElement.querySelector('p');
    const r = document.createRange();
    r.selectNodeContents(p);
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
    btn.textContent = '已選取，請按複製';
  }

  function recompute() {
    computeMass();
    S.rebuildUrban(MASS.stack);
    urbanFor = 'mass';
    S.rebuildDangerous(MASS.dangerous);
    if (st.chapter === 'share') { renderFloors(); S.highlightFloor(st.share.floor); }
  }

  // ── 日照套用 ───────────────────────────────────────────────────
  function applySun() {
    const day = DAYS[st.sun.day];
    const sp = K.sunPosition(C.GEO, day.n, st.sun.hour);
    S.setSunDir(sp.dir);
    if (st.sun.compare && st.sun.scen !== 'now') {
      S.setCompare('now', st.sun.scen);
      if (swipe.hidden) { swipe.hidden = false; centerSplit(); }
      S.setHeat('left', st.sun.mode === 'off' ? null : heatTexture('now', st.sun.mode === 'rule' || st.sun.mode === 'loss' ? 'hours' : st.sun.mode));
      S.setHeat('right', st.sun.mode === 'off' ? null : heatTexture(st.sun.scen, st.sun.mode));
    } else {
      S.setScenario(st.sun.scen);
      swipe.hidden = true;
      S.setHeat('single', st.sun.mode === 'off' || (st.sun.scen === 'now' && st.sun.mode !== 'hours') ? null : heatTexture(st.sun.scen, st.sun.mode));
    }
    updateSwipeTags();
    dock.hidden = false;
    renderDock();
  }
  function setDefaultSun() {
    const sp = K.sunPosition(C.GEO, 80, 10.5);
    S.setSunDir(sp.dir);
  }

  // ── 下方時間軸 ─────────────────────────────────────────────────
  let playing = null;
  function stopPlay() {
    if (playing) { cancelAnimationFrame(playing.raf); playing = null; }
    const b = $('playBtn');
    if (b) { b.setAttribute('aria-pressed', 'false'); b.textContent = '播放'; }
  }
  function renderDock() {
    if (st.chapter === 'sun') {
      const day = DAYS[st.sun.day];
      dock.innerHTML = `<button type="button" id="playBtn" class="play" aria-pressed="false">播放</button>
        <label for="hourR" class="dock-k">${day.label}</label>
        <input type="range" id="hourR" min="6" max="18.5" step="0.25" value="${st.sun.hour}">
        <output id="hourV" class="dock-v">${K.hhmm(st.sun.hour)}</output>`;
      const r = $('hourR');
      r.addEventListener('input', () => { stopPlay(); st.sun.hour = Number(r.value); $('hourV').textContent = K.hhmm(st.sun.hour); onHour(); });
      $('playBtn').addEventListener('click', () => togglePlay('sun'));
    } else if (st.chapter === 'city') {
      dock.innerHTML = `<button type="button" id="playBtn" class="play" aria-pressed="false">播放</button>
        <label for="yearR" class="dock-k">年份</label>
        <input type="range" id="yearR" min="${C.SIM.years[0]}" max="${C.SIM.years[1]}" step="1" value="${st.city.year}">
        <output id="yearV" class="dock-v">${st.city.year}</output>`;
      const r = $('yearR');
      r.addEventListener('input', () => { stopPlay(); st.city.year = Number(r.value); onYear(); });
      $('playBtn').addEventListener('click', () => togglePlay('city'));
    }
  }
  let hourTimer = null;
  function onHour() {
    const day = DAYS[st.sun.day];
    const sp = K.sunPosition(C.GEO, day.n, st.sun.hour);
    S.setSunDir(sp.dir);
    clearTimeout(hourTimer);
    hourTimer = setTimeout(() => {
      const rows = panelBody.querySelectorAll('.rows .row .rv');
      if (rows[0]) rows[0].textContent = `高度角 ${sp.alt.toFixed(1)}°・方位 ${sp.az.toFixed(0)}°`;
    }, 60);
  }
  function onYear() {
    $('yearV').textContent = st.city.year;
    const r = $('yearR');
    if (r && Number(r.value) !== st.city.year) r.value = st.city.year;
    pushSim();
    const y = panelBody.scrollTop;
    renderPanel();
    panelBody.scrollTop = y;
  }
  function togglePlay(kind) {
    if (playing) { stopPlay(); return; }
    const b = $('playBtn');
    b.setAttribute('aria-pressed', 'true');
    b.textContent = '暫停';
    let last = performance.now();
    if (kind === 'sun' && st.sun.hour >= 18.4) st.sun.hour = 6;
    if (kind === 'city' && st.city.year >= C.SIM.years[1]) st.city.year = C.SIM.years[0];
    const step = (now) => {
      const dt = now - last;
      if (kind === 'sun') {
        st.sun.hour = Math.min(18.5, st.sun.hour + dt / 1000 * 1.2);
        const r = $('hourR');
        if (r) r.value = st.sun.hour;
        $('hourV').textContent = K.hhmm(st.sun.hour);
        onHour();
        last = now;
        if (st.sun.hour >= 18.5) { stopPlay(); return; }
      } else if (dt > 650) {
        st.city.year += 1;
        last = now;
        onYear();
        if (st.city.year >= C.SIM.years[1]) { stopPlay(); return; }
      }
      playing.raf = requestAnimationFrame(step);
    };
    playing = { raf: requestAnimationFrame(step) };
  }

  // 依應分配價值，在目前樓層挑最接近又不必補錢的一戶
  function suggestUnit() {
    const f = MASS.fin;
    const owner = f.ownersById[st.share.oldId];
    if (!owner) return;
    const budget = f.allocOf(owner.value) - (st.share.car ? C.MARKET.carPrice : 0);
    const onFloor = f.units.filter((u) => u.floor === st.share.floor).sort((a, b) => a.price - b.price);
    const fit = onFloor.filter((u) => u.price <= budget);
    const pick = fit.length ? fit[fit.length - 1] : onFloor[0];
    if (pick) { st.share.unit = pick.unit; S.highlightNewUnit(pick.unit); }
  }

  // ── 樓層選擇器（分回試算）──────────────────────────────────────
  function renderFloors() {
    const n = MASS.stack.towerFloors;
    if (st.share.floor > n + 2) st.share.floor = n + 2;
    const items = [];
    for (let f = n + 2; f >= 3; f--) items.push(`<button type="button" data-floor="${f}" aria-pressed="${f === st.share.floor}">${f}F</button>`);
    floorsEl.innerHTML = `<div class="floors-k">新大樓</div><div class="floors-list">${items.join('')}</div><div class="floors-k sub">2F 公益・1F 店面</div>`;
    floorsEl.querySelectorAll('[data-floor]').forEach((b) => b.addEventListener('click', () => selectFloor(Number(b.dataset.floor))));
    requestAnimationFrame(revealFloor);
  }
  function revealFloor() {
    const b = floorsEl.querySelector('[aria-pressed="true"]');
    const list = floorsEl.querySelector('.floors-list');
    if (!b || !list) return;
    if (list.scrollWidth > list.clientWidth) list.scrollLeft = b.offsetLeft - list.clientWidth / 2 + b.offsetWidth / 2;
    if (list.scrollHeight > list.clientHeight) list.scrollTop = b.offsetTop - list.clientHeight / 2 + b.offsetHeight / 2;
  }
  function selectFloor(f) {
    st.share.floor = f;
    floorsEl.querySelectorAll('[data-floor]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.floor) === f)));
    revealFloor();
    S.highlightFloor(f);
    S.highlightNewUnit(st.share.unit);
    renderPanel();
  }

  // ── 懸停與點選 ─────────────────────────────────────────────────
  function cardFor(p) {
    if (!p) return null;
    if (p.type === 'ctx') {
      const b = p.rec.b;
      const age = 2026 - b.year;
      const d = distToSite(b.rect);
      return `<b>${esc(b.name)}</b><span>${b.floors}F・約 ${p.rec.h.toFixed(0)} m・${esc(b.struct || 'RC')}</span>
        <span>${b.year} 年（屋齡 ${age} 年）・${esc(b.use || '住宅')}</span>
        <span>距更新單元 ${d < 1 ? '相鄰' : fmt(d) + ' m'}${b.elevator ? '・有電梯' : '・無電梯'}${b.roofAdd ? '・頂樓加蓋' : ''}${b.arcade ? '・騎樓' : ''}</span>`;
    }
    if (p.type === 'old') {
      const u = p.unit;
      return `<b>${esc(u.label)}</b><span>權狀約 ${u.ping.toFixed(1)} 坪（${fmt(u.m2)} ㎡）</span><span>${esc(p.bld.struct)}・${p.bld.year} 年・${esc(p.bld.note)}</span>${st.chapter === 'share' ? '<span class="hint">點一下設為「我的舊家」</span>' : ''}`;
    }
    if (p.type === 'danger') {
      const q = p.parcel;
      return `<b>危老 ${q.id}</b><span>基地 ${fmt(q.area)} ㎡・${q.floors}F・容積率 ${pct(q.sum.finalFAR, 0)}</span><span>原有：${q.olds.map((id) => C.OLD.find((b) => b.id === id).name).join('、')}</span><span>${esc(q.setback)}</span>`;
    }
    if (p.type === 'podium') return `<b>${esc(p.floor.label)}</b><span>樓高 ${p.floor.h} m</span>`;
    if (p.type === 'tower') return `<b>都更大樓 ${p.floorNo} 樓</b><span>標準層 ${C.URBAN.plan.length} 戶・樓高 ${C.URBAN.tower.typH} m</span>${st.chapter === 'share' ? '<span class="hint">點一下查看這層</span>' : ''}`;
    if (p.type === 'newUnit') {
      const u = MASS.fin.units.find((x) => x.floor === p.floorNo && x.unit === p.plan.id);
      return `<b>${p.floorNo} 樓 ${p.plan.id} 戶・${p.plan.type}</b><span>權狀約 ${u.ping.toFixed(1)} 坪・室內 ${u.inPing.toFixed(1)} 坪</span><span>${fmt(u.price)} 萬元</span>`;
    }
    return null;
  }
  function distToSite(r) {
    const s = C.SITE.rect;
    const dx = Math.max(s[0] - r[2], 0, r[0] - s[2]);
    const dz = Math.max(s[1] - r[3], 0, r[1] - s[3]);
    return Math.hypot(dx, dz);
  }
  function onHover(p, e) {
    const html = cardFor(p);
    if (!html || !e) { hideHover(); return; }
    hoverEl.innerHTML = html;
    hoverEl.hidden = false;
    hoverEl.classList.remove('pinned');
    const r = stage.getBoundingClientRect();
    const w = hoverEl.offsetWidth, h = hoverEl.offsetHeight;
    let x = e.clientX - r.left + 14, y = e.clientY - r.top + 14;
    if (x + w > r.width - 8) x = e.clientX - r.left - w - 14;
    if (y + h > r.height - 8) y = e.clientY - r.top - h - 14;
    hoverEl.style.transform = `translate(${Math.max(8, x)}px, ${Math.max(8, y)}px)`;
  }
  function hideHover() { hoverEl.hidden = true; }
  function onPick(p, e) {
    if (st.chapter === 'case' && st.core.step === 'people' && p && p.type === 'old') {
      st.core.owner = p.unit.id; S.highlightOld(p.unit.id);
      const y = panelBody.scrollTop; renderPanel(); panelBody.scrollTop = y;
    }
    if (st.chapter === 'share' && p) {
      if (p.type === 'old') { st.share.oldId = p.unit.id; S.highlightOld(p.unit.id); suggestUnit(); renderPanel(); }
      else if (p.type === 'tower') { selectFloor(p.floorNo); }
      else if (p.type === 'newUnit') { st.share.floor = p.floorNo; st.share.unit = p.plan.id; S.highlightNewUnit(p.plan.id); renderPanel(); }
    }
    if (e && e.pointerType !== 'mouse') {
      const html = cardFor(p);
      if (!html) { hideHover(); return; }
      hoverEl.innerHTML = html + '<button type="button" class="card-x" aria-label="關閉">×</button>';
      hoverEl.hidden = false;
      hoverEl.classList.add('pinned');
      hoverEl.style.transform = '';
      hoverEl.querySelector('.card-x').addEventListener('click', hideHover);
    }
  }
  function focusBuilding(id) {
    const b = C.NAMED.find((x) => x.id === id);
    if (!b) return;
    const cx = (b.rect[0] + b.rect[2]) / 2, cz = (b.rect[1] + b.rect[3]) / 2;
    S.flyTo({ target: [cx, 10, cz], pos: [cx + 70, 110, cz + 120], fov: 38 });
  }
  function onFrame(ctl) {
    $('compassRose').style.transform = `rotate(${ctl.theta}rad)`;
  }

  // ── 比較捲簾 ───────────────────────────────────────────────────
  let split = 0.5;
  const knob = $('swipeKnob');
  function setSplit(f) {
    split = Math.min(0.95, Math.max(0.05, f));
    swipe.style.setProperty('--split', `${split * 100}%`);
    S.setSplit(split);
  }
  setSplit(0.5);
  knob.addEventListener('pointerdown', (e) => {
    knob.setPointerCapture(e.pointerId);
    const move = (ev) => { const r = stage.getBoundingClientRect(); setSplit((ev.clientX - r.left) / r.width); };
    const up = () => { knob.removeEventListener('pointermove', move); knob.removeEventListener('pointerup', up); knob.removeEventListener('pointercancel', up); };
    knob.addEventListener('pointermove', move);
    knob.addEventListener('pointerup', up);
    knob.addEventListener('pointercancel', up);
  });
  knob.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { setSplit(split - 0.04); e.preventDefault(); }
    if (e.key === 'ArrowRight') { setSplit(split + 0.04); e.preventDefault(); }
  });
  function centerSplit() {
    const narrow = stage.clientWidth <= 760;
    const free = narrow ? stage.clientWidth : stage.clientWidth - panel.offsetWidth - 20;
    setSplit(free / 2 / stage.clientWidth);
  }
  function updateSwipeTags() {
    let l = st.cmp.left, r = st.cmp.right;
    if (st.chapter === 'share') { l = 'now'; r = 'urban'; }
    if (st.chapter === 'sun') { l = 'now'; r = st.sun.scen; }
    $('swipeL').textContent = st.chapter === 'share' ? '舊家（點一戶）' : SCEN[l].label;
    $('swipeR').textContent = st.chapter === 'share' ? '新家（選樓層）' : SCEN[r].label;
  }

  // ── 圖層面板 ───────────────────────────────────────────────────
  const LAYERS = [
    ['heights', '鄰房樓層標示'], ['zoning', '土地使用分區'], ['roads', '道路層級'], ['open', '開放空間與退縮'],
    ['walk', '步行距離'], ['disaster', '防救災動線'], ['wind', '季風方向'], ['age', '屋齡上色'], ['labels', '所有標籤'],
  ];
  const layersBody = $('layersBody');
  layersBody.innerHTML = LAYERS.map(([id, t]) => `<label class="lyr"><input type="checkbox" id="lyr-${id}" data-layer="${id}"${st.layers[id] ? ' checked' : ''}><span>${t}</span></label>`).join('') +
    `<div class="lyr-legend" id="zoneLegend" hidden>${['res', 'com', 'park', 'school'].map((z) => `<span><i style="background:var(${C.ZONES[z].color})"></i>${C.ZONES[z].label}</span>`).join('')}</div>`;
  layersBody.querySelectorAll('[data-layer]').forEach((cb) => cb.addEventListener('change', () => {
    st.layers[cb.dataset.layer] = cb.checked;
    applyLayers(st.chapter);
  }));
  function syncLayerUI(L) {
    layersBody.querySelectorAll('[data-layer]').forEach((cb) => { cb.checked = !!L[cb.dataset.layer]; });
    $('zoneLegend').hidden = !L.zoning;
  }
  const layersToggle = $('layersToggle');
  layersToggle.addEventListener('click', () => {
    const open = layersToggle.getAttribute('aria-expanded') !== 'true';
    layersToggle.setAttribute('aria-expanded', String(open));
    $('layers').classList.toggle('open', open);
  });

  // ── 視角與夜景 ─────────────────────────────────────────────────
  const viewBtns = [...document.querySelectorAll('#views [data-view]')];
  viewBtns.forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  function setView(v) {
    st.view = v;
    viewBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
    S.view(v);
  }
  $('nightBtn').addEventListener('click', () => {
    st.night = !st.night;
    $('nightBtn').setAttribute('aria-pressed', String(st.night));
    S.setNight(st.night);
  });

  // ── 版面：面板讓出畫面中心 ─────────────────────────────────────
  const sheetToggle = $('sheetToggle');
  sheetToggle.addEventListener('click', () => {
    const collapsed = panel.classList.toggle('collapsed');
    sheetToggle.setAttribute('aria-expanded', String(!collapsed));
    sheetToggle.textContent = collapsed ? '展開說明' : '收合';
    layoutOffsets();
  });
  function layoutOffsets() {
    const narrow = stage.clientWidth <= 760;
    if (narrow) {
      const h = panel.classList.contains('collapsed') ? 0 : panel.offsetHeight;
      S.setOffset(0, Math.max(0, h - 40));
    } else {
      S.setOffset(panel.offsetWidth + 20, 0);
    }
    if (st.chapter === 'city') drawCharts();
    if (st.chapter === 'market') drawMarketChart();
  }
  new ResizeObserver(() => layoutOffsets()).observe(stage);

  // ── 主題變化 ───────────────────────────────────────────────────
  const darkMQ = window.matchMedia('(prefers-color-scheme: dark)');
  const onTheme = () => {
    S.refreshColors();
    if (st.chapter === 'sun') applySun();
  };
  if (darkMQ.addEventListener) darkMQ.addEventListener('change', onTheme);
  new MutationObserver(onTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // ── 啟動 ───────────────────────────────────────────────────────
  if (stage.clientWidth > 900) { layersToggle.setAttribute('aria-expanded', 'true'); $('layers').classList.add('open'); }
  computeMass();
  S.rebuildUrban(MASS.stack);
  S.rebuildDangerous(MASS.dangerous);
  suggestUnit();
  setDefaultSun();
  S.start();
  window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (h && h !== st.chapter) go(h, false, true); });
  const first = location.hash.slice(1);
  go(CHAPTERS.indexOf(first) >= 0 ? first : 'overview', false, false);
  setView(({ overview: 'aerial', compare: 'site', bonus: 'site', sun: 'sun', share: 'site', case: 'site', market: 'city', city: 'city', future: 'aerial' })[st.chapter]);
  window.__app = { st, S, get MASS() { return MASS; }, go };
})();
