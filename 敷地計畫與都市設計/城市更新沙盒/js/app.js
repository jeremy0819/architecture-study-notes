/* 城市更新沙盒｜介面與章節 */
(function () {
  'use strict';

  const C = window.CITY;
  const K = window.CALC;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = K.fmt;
  const pct = K.pct;
  const SRC = { law: '法規', data: '資料', model: '模型', assume: '假設', draft: '草案' };
  const src = (k) => `<span class="src s-${k}" title="${SRC[k]}">${SRC[k]}</span>`;
  const DASHBOARD = 'https://claude.ai/artifact/N9HnLsT8NB46aZa8f2hQm2';
  const VISION = 'https://claude.ai/artifact/LCWGPVdjLN1kds1bWCB8nh';
  const VIEWER = 'https://claude.ai/artifact/7mSMrv1gAdsEhdT8yCrKXw';

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

  // ── 章節 ───────────────────────────────────────────────────────
  const CHAPTERS = ['overview', 'compare', 'bonus', 'sun', 'share', 'city', 'future'];
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
    applyLayers(ch);
    const cam = (v) => { if (moveCam !== false) setView(v); };
    if (ch === 'overview') { S.setScenario('now'); cam('aerial'); }
    else if (ch === 'compare') { S.setCompare(st.cmp.left, st.cmp.right); swipe.hidden = false; cam('site'); }
    else if (ch === 'bonus') { S.setScenario(st.route); cam('site'); }
    else if (ch === 'sun') { applySun(); cam('sun'); }
    else if (ch === 'share') { S.setCompare('now', 'urban'); swipe.hidden = false; renderFloors(); floorsEl.hidden = false; S.highlightFloor(st.share.floor); S.highlightNewUnit(st.share.unit); S.highlightOld(st.share.oldId); cam('site'); }
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
    const html = ({ overview: pOverview, compare: pCompare, bonus: pBonus, sun: pSun, share: pShare, city: pCity, future: pFuture })[ch]();
    panelBody.innerHTML = html;
    panelBody.scrollTop = 0;
    bindPanel();
    if (ch === 'city') drawCharts();
  }

  function pOverview() {
    const ages = C.OLD.map((b) => 2026 - b.year);
    return `
      <p class="eyebrow">示範案｜${esc(C.GEO.place)}</p>
      <h2>一個 1970 年代街廓，四種未來</h2>
      <p class="lead">這塊 2,560 ㎡ 的完整街廓有 6 棟 2–5 層老屋、${C.OLD_UNITS.length} 戶，屋齡 ${Math.min(...ages)}–${Math.max(...ages)} 年，全部沒有電梯。拖動模型看周邊，或依序走完下面六章。</p>
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
      <h3>接下來六章</h3>
      <div class="chapters-list">
        ${[
          ['compare', '方案比較', '拖曳捲簾比較現況、老宅延壽、危老、都更'],
          ['bonus', '容積獎勵', '逐項勾選獎勵，看量體長高與上限'],
          ['sun', '日照陰影', '冬至日照時數與建技規則 §39-1 檢討'],
          ['share', '分回試算', '選你的舊家，看能換回幾坪'],
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
      <p class="note">新北近年案件共同負擔多在 45–56%（公開案例 55.71%，2026-08 審議）${src('data')}。本頁用簡化公式，實際以估價師查估與審議核定為準。</p>`;
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
  setView(({ overview: 'aerial', compare: 'site', bonus: 'site', sun: 'sun', share: 'site', city: 'city', future: 'aerial' })[st.chapter]);
  window.__app = { st, S, get MASS() { return MASS; }, go };
})();
