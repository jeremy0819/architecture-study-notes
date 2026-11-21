/* 城市更新沙盒｜計算核心
 * 純函式：不碰 DOM、不需要 three.js。瀏覽器掛在 window.CALC，Node 以 module.exports 匯出（測試用）。
 * 座標：x 向東、z 向南、y 向上，單位 m。
 */
(function (root) {
  'use strict';

  const PING = 3.305785; // 1 坪 = 3.305785 ㎡
  const RAD = Math.PI / 180;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const sum = (arr, f) => arr.reduce((s, x) => s + (f ? f(x) : x), 0);

  // ── 太陽位置 ─────────────────────────────────────────────────────
  const CUM = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const dayOfYear = (m, d) => CUM[m - 1] + d;
  // 均時差（分鐘）
  function equationOfTime(n) {
    const B = (2 * Math.PI * (n - 81)) / 364;
    return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  }
  const declination = (n) => 23.44 * Math.sin((2 * Math.PI * (284 + n)) / 365);
  // geo = { lat, lon, tzMeridian }；clockH = 臺灣標準時（UTC+8）的鐘點，例如 9.5 = 09:30
  function sunPosition(geo, n, clockH) {
    const solarH = clockH + (4 * (geo.lon - geo.tzMeridian) + equationOfTime(n)) / 60;
    const decl = declination(n) * RAD;
    const H = 15 * (solarH - 12) * RAD;
    const phi = geo.lat * RAD;
    const sinAlt = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(H);
    const alt = Math.asin(clamp(sinAlt, -1, 1));
    const cosAz = (Math.sin(decl) - Math.sin(alt) * Math.sin(phi)) / Math.max(1e-6, Math.cos(alt) * Math.cos(phi));
    let az = Math.acos(clamp(cosAz, -1, 1));
    if (H > 0) az = 2 * Math.PI - az;
    return {
      alt: alt / RAD,
      az: az / RAD,
      solarH,
      dir: [Math.sin(az) * Math.cos(alt), Math.sin(alt), -Math.cos(az) * Math.cos(alt)],
    };
  }
  function sunTimes(geo, n) {
    const decl = declination(n) * RAD;
    const h0 = Math.acos(clamp(-Math.tan(geo.lat * RAD) * Math.tan(decl), -1, 1)) / RAD / 15;
    const corr = (4 * (geo.lon - geo.tzMeridian) + equationOfTime(n)) / 60;
    return { rise: 12 - h0 - corr, set: 12 + h0 - corr, noon: 12 - corr };
  }

  // ── 陰影柵格與日照時數 ───────────────────────────────────────────
  // grid = { x0, z0, cell, nx, nz }，第 (i, j) 格的格心 = (x0 + (i + .5)·cell, z0 + (j + .5)·cell)
  // box  = { x0, z0, x1, z1, y0, y1 }：軸對齊量體；y0 > 0 表示懸空的一段（例如只算 21 m 以上部分）
  function hull(pts) {
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [], upper = [];
    for (const q of p) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
      lower.push(q);
    }
    for (let i = p.length - 1; i >= 0; i--) {
      const q = p[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
      upper.push(q);
    }
    upper.pop();
    lower.pop();
    return lower.concat(upper);
  }
  function fillConvex(grid, poly, out, val) {
    let minZ = Infinity, maxZ = -Infinity;
    for (const q of poly) { if (q[1] < minZ) minZ = q[1]; if (q[1] > maxZ) maxZ = q[1]; }
    const j0 = Math.max(0, Math.ceil((minZ - grid.z0) / grid.cell - 0.5));
    const j1 = Math.min(grid.nz - 1, Math.floor((maxZ - grid.z0) / grid.cell - 0.5));
    const n = poly.length;
    for (let j = j0; j <= j1; j++) {
      const z = grid.z0 + (j + 0.5) * grid.cell;
      let xa = Infinity, xb = -Infinity;
      for (let k = 0; k < n; k++) {
        const a = poly[k], b = poly[(k + 1) % n];
        if ((a[1] <= z && b[1] >= z) || (b[1] <= z && a[1] >= z)) {
          if (a[1] === b[1]) {
            xa = Math.min(xa, a[0], b[0]);
            xb = Math.max(xb, a[0], b[0]);
          } else {
            const x = a[0] + ((z - a[1]) / (b[1] - a[1])) * (b[0] - a[0]);
            if (x < xa) xa = x;
            if (x > xb) xb = x;
          }
        }
      }
      if (xa > xb) continue;
      const i0 = Math.max(0, Math.ceil((xa - grid.x0) / grid.cell - 0.5));
      const i1 = Math.min(grid.nx - 1, Math.floor((xb - grid.x0) / grid.cell - 0.5));
      const row = j * grid.nx;
      for (let i = i0; i <= i1; i++) out[row + i] = val;
    }
  }
  function shadowMask(grid, boxes, dir, out) {
    out.fill(0);
    if (dir[1] <= 0.02) { out.fill(1); return out; }
    const kx = -dir[0] / dir[1], kz = -dir[2] / dir[1];
    const pts = [];
    for (const b of boxes) {
      pts.length = 0;
      for (const y of [b.y0, b.y1]) {
        const ox = kx * y, oz = kz * y;
        pts.push([b.x0 + ox, b.z0 + oz], [b.x1 + ox, b.z0 + oz], [b.x1 + ox, b.z1 + oz], [b.x0 + ox, b.z1 + oz]);
      }
      fillConvex(grid, hull(pts), out, 1);
    }
    return out;
  }
  // opts = { geo, n, from, to, step }（from／to 為鐘點，step 為分鐘）；回傳每格日照時數（小時）
  function sunHours(grid, boxes, opts) {
    const N = grid.nx * grid.nz;
    const lit = new Float32Array(N);
    const mask = new Uint8Array(N);
    const dt = opts.step / 60;
    const steps = Math.max(1, Math.round((opts.to - opts.from) / dt));
    for (let k = 0; k < steps; k++) {
      const s = sunPosition(opts.geo, opts.n, opts.from + (k + 0.5) * dt);
      if (s.alt <= 0) continue;
      shadowMask(grid, boxes, s.dir, mask);
      for (let i = 0; i < N; i++) if (!mask[i]) lit[i] += dt;
    }
    return lit;
  }
  function footprintMask(grid, boxes) {
    const m = new Uint8Array(grid.nx * grid.nz);
    for (const b of boxes) {
      if (b.y0 <= 0.01) fillConvex(grid, [[b.x0, b.z0], [b.x1, b.z0], [b.x1, b.z1], [b.x0, b.z1]], m, 1);
    }
    return m;
  }
  // 某矩形範圍內（排除建物底下的格子）日照時數的統計
  function areaStats(grid, hours, rect, exclude) {
    const [x0, z0, x1, z1] = rect;
    const i0 = Math.max(0, Math.ceil((x0 - grid.x0) / grid.cell - 0.5));
    const i1 = Math.min(grid.nx - 1, Math.floor((x1 - grid.x0) / grid.cell - 0.5));
    const j0 = Math.max(0, Math.ceil((z0 - grid.z0) / grid.cell - 0.5));
    const j1 = Math.min(grid.nz - 1, Math.floor((z1 - grid.z0) / grid.cell - 0.5));
    let n = 0, min = Infinity, total = 0, below = 0;
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const k = j * grid.nx + i;
        if (exclude && exclude[k]) continue;
        const v = hours[k];
        n++;
        total += v;
        if (v < min) min = v;
        if (v < 1) below++;
      }
    }
    return n ? { n, min, mean: total / n, below: below / n } : null;
  }
  // 量體 → 盒子；cut 只留 y ≥ cut 的部分（§39-1 只檢討 21 m 以上部分）
  function boxesAbove(boxes, cut) {
    return boxes.filter((b) => b.y1 > cut).map((b) => Object.assign({}, b, { y0: Math.max(b.y0, cut) }));
  }

  // ── 容積獎勵 ─────────────────────────────────────────────────────
  // route.items：{ id, type: 'pick' | 'scale', options?, scale?, group? }；picks：{ itemId: optionId }
  // ctx = { area, far, origFA }
  function bonusSummary(route, picks, ctx) {
    const baseFA = ctx.area * ctx.far;
    const lines = [];
    const groups = {};
    route.items.forEach((it) => {
      let pct = 0, choice = '';
      if (it.type === 'pick') {
        const o = it.options.find((x) => x.id === picks[it.id]) || it.options[0];
        pct = o.pct;
        choice = o.label;
      } else if (it.type === 'scale' && picks[it.id] !== 'none') {
        const s = it.scale;
        if (ctx.area >= s.min) {
          pct = s.basePct + s.stepPct * Math.floor((ctx.area - s.min) / s.stepArea);
          choice = `基地 ${Math.round(ctx.area).toLocaleString('en-US')} ㎡`;
        }
      } else if (it.type === 'orig') {
        // 原建築容積高於基準容積者：差額（依各辦法規定）
        if (ctx.origFA > baseFA && picks[it.id] !== 'none') {
          pct = (ctx.origFA - baseFA) / baseFA;
          choice = `原容積 ${Math.round(ctx.origFA).toLocaleString('en-US')} ㎡`;
        }
      }
      if (it.group) {
        const g = route.groups[it.group];
        const used = groups[it.group] || 0;
        const room = Math.max(0, g.cap - used);
        if (pct > room) { pct = room; choice += `（${g.label}合計上限）`; }
        groups[it.group] = used + pct;
      }
      if (pct > 0) lines.push({ id: it.id, label: it.label, choice, pct, law: it.law, outside: !!it.outsideCap });
    });
    const inside = sum(lines.filter((l) => !l.outside), (l) => l.pct);
    const outside = sum(lines.filter((l) => l.outside), (l) => l.pct);
    const cap = route.cap(ctx);
    const wantInside = baseFA * (1 + inside);
    const cappedInside = Math.min(wantInside, cap.fa);
    const finalFA = cappedInside + baseFA * outside;
    return {
      lines,
      baseFA,
      pctInside: inside,
      pctOutside: outside,
      pctTotal: inside + outside,
      wantFA: baseFA * (1 + inside + outside),
      capFA: cap.fa,
      capLabel: cap.label,
      overCap: wantInside > cap.fa + 0.5,
      lostFA: Math.max(0, wantInside - cap.fa),
      finalFA,
      finalFAR: finalFA / ctx.area,
    };
  }

  // ── 量體堆疊：容積 → 樓層 ────────────────────────────────────────
  // plan = { podium: [{ id, fa, h }], typicalFA, typH }
  function stackTower(finalFA, plan) {
    const podFA = sum(plan.podium, (p) => p.fa);
    const remain = Math.max(0, finalFA - podFA);
    const towerFloors = Math.floor(remain / plan.typicalFA + 1e-9);
    const usedFA = podFA + towerFloors * plan.typicalFA;
    const podH = sum(plan.podium, (p) => p.h);
    return {
      towerFloors,
      floors: plan.podium.length + towerFloors,
      height: podH + towerFloors * plan.typH,
      usedFA,
      spareFA: finalFA - usedFA,
    };
  }

  // ── 權利變換（簡化）─────────────────────────────────────────────
  // 更新後總價值 − 共同負擔 = 地主可分配價值；每位地主依更新前權利價值比例分配。
  function rightsCalc(p) {
    const unitPrice = (f) => p.priceRes * (1 + p.floorStep * (f - p.refFloor));
    const units = p.saleUnits.map((u) => Object.assign({}, u, { price: u.ping * unitPrice(u.floor) * (1 + (u.prem || 0)) }));
    const resValue = sum(units, (u) => u.price);
    const shopValue = sum(p.shops, (s) => s.ping * p.priceRes * p.shopMul);
    const carValue = p.cars * p.carPrice;
    const total = resValue + shopValue + carValue;
    const build = (p.grossAbove / PING) * p.costAbove + (p.grossBelow / PING) * p.costBelow;
    const rtFees = build * p.rates.rt;
    const relocation = p.relocation.households * p.relocation.rent * p.relocation.months;
    const interest = (build + rtFees + relocation) * p.rates.interest;
    const tax = build * p.rates.tax;
    const admin = (build + rtFees + relocation + interest + tax) * p.rates.admin;
    const subtotal = build + rtFees + relocation + interest + tax + admin;
    const risk = subtotal * p.rates.risk;
    const sales = (subtotal + risk) * p.rates.sales;
    const burden = subtotal + risk + sales;
    const pool = Math.max(0, total - burden);
    const ownersValue = sum(p.owners, (o) => o.value);
    return {
      units,
      unitPrice,
      resValue, shopValue, carValue, total,
      cost: { build, rtFees, relocation, interest, tax, admin, risk, sales },
      burden,
      burdenRatio: burden / total,
      pool,
      ownersValue,
      gain: pool / ownersValue, // 地主整體：更新後分得價值 ÷ 更新前價值
      allocOf: (value) => (pool * value) / ownersValue,
    };
  }

  // 依應分配價值找最接近的選配（優先不必補差額），並算找補
  function pickUnits(units, alloc, carPrice, wantCar) {
    const budget = alloc - (wantCar ? carPrice : 0);
    const sorted = units.slice().sort((a, b) => a.price - b.price);
    let best = null;
    sorted.forEach((u) => { if (u.price <= budget * 1.0 && (!best || u.price > best.price)) best = u; });
    const near = sorted.find((u) => u.price > budget) || null;
    return { best, near, budget };
  }

  // ── 城市尺度模擬（教學示意）──────────────────────────────────────
  // 每棟樓每年有一個固定的隨機門檻 u（由 id 與年份雜湊而來）：機率提高只會「多發生」，方便比較不同政策。
  function hashU(str, year) {
    let h = 2166136261 ^ year;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  }
  const logistic = (x) => 1 / (1 + Math.exp(-x));

  // 一棟樓在某年的重建可行性：地主「更新後價值 ÷ 更新前價值」
  // 原容積高於基準者可依原容積重建，上限另有原容積算法（都更 §65 第 2 項、危老 §6）。
  function feasibility(b, env) {
    const farOld = b.farOld;
    const base = env.farBase;
    const route = b.lotArea < env.smallLot && env.dangerousOpen ? 'dangerous' : 'urban';
    const r = env.routes[route];
    const capFar = route === 'urban'
      ? (farOld > base ? Math.max(base * 1.5, base * 0.3 + farOld, farOld * 1.2) : base * 1.5)
      : Math.max(base * 1.3, farOld * 1.15);
    const farNew = Math.min(Math.max(base, farOld) + base * r.bonus, capFar) + base * (env.extraBonus + (r.outside || 0));
    const burden = clamp((env.cost * env.grossPerSale * (1 + env.softRate)) / env.priceNew, 0.25, 0.9);
    const ratio = (farNew / farOld) * (1 - burden) * (env.priceNew / env.priceOld);
    return { route, farNew, burden, ratio };
  }

  // district.buildings: [{ id, year, floors, units, lotArea, footprint, farOld, elevator, lowrise }]
  // policy: { dangerousSunset, extraBonus, extendLife (0/1/2), priceGrowth, costGrowth, credit }
  function simulate(district, policy, market, years) {
    const st = district.buildings.map((b) => ({
      id: b.id, status: 'old', since: b.year, route: null, done: 0, floorsNew: 0, unitsNew: 0, renovatedAt: 0, b,
    }));
    const frames = [];
    const creditK = { loose: 1.15, current: 1, tight: 0.72 }[policy.credit] || 1;
    for (let y = years[0]; y <= years[1]; y++) {
      const t = y - market.year;
      const priceNew = market.priceNew * Math.pow(1 + policy.priceGrowth, t);
      const priceOld = market.priceOld * Math.pow(1 + policy.priceGrowth, t);
      const cost = market.cost * Math.pow(1 + policy.costGrowth, t);
      const dangerousOpen = policy.dangerousSunset ? y <= market.dangerousSunsetYear : true;
      const env = {
        farBase: market.farBase, smallLot: market.smallLot, dangerousOpen, routes: market.routes,
        extraBonus: policy.extraBonus, cost, priceNew, priceOld, grossPerSale: market.grossPerSale, softRate: market.softRate,
      };
      const ev = { started: 0, completed: 0, renovated: 0, demolishedUnits: 0, completedUnits: 0, byRoute: { dangerous: 0, urban: 0 } };
      st.forEach((s) => {
        const b = s.b;
        if (s.status === 'building' && y >= s.done) {
          s.status = 'new';
          s.since = y;
          ev.completed++;
          ev.completedUnits += s.unitsNew;
          return;
        }
        if (s.status !== 'old' && s.status !== 'renovated') return;
        const age = y - b.year;
        if (!b.lowrise || age < 30) return;
        const f = feasibility(b, env);
        const consent = Math.pow(f.route === 'dangerous' ? market.consentDangerous : market.consentUrban, b.units);
        const lifeK = s.status === 'renovated' && y - s.renovatedAt < 20 ? 0.15 : 1;
        const pRe = market.routes[f.route].p0 * logistic((f.ratio - market.ratioNeed) / market.ratioWidth) * consent * creditK * lifeK;
        const u = hashU(b.id, y);
        if (u < pRe) {
          s.status = 'building';
          s.route = f.route;
          s.done = y + market.routes[f.route].years;
          const fa = f.farNew * b.lotArea;
          s.unitsNew = Math.max(b.units, Math.round(fa / market.faPerUnit));
          // 模型沿用原建物投影面積畫新量體，樓層數以「容積 × 1.15 ÷ 投影面積」換算，體積才一致
          s.floorsNew = Math.max(b.floors + 2, Math.ceil((fa * 1.15) / b.footprint));
          ev.started++;
          ev.byRoute[f.route]++;
          ev.demolishedUnits += b.units;
          return;
        }
        if (s.status === 'old' && policy.extendLife > 0 && !b.elevator && b.floors >= 4 && b.floors <= 6) {
          const pR = market.renovateP[policy.extendLife] * (f.ratio < market.ratioNeed ? 1 : 0.45);
          if (hashU(b.id + '#r', y) < pR) {
            s.status = 'renovated';
            s.renovatedAt = y;
            ev.renovated++;
          }
        }
      });
      // 年底存量
      let units = 0, oldUnits = 0, elevUnits = 0, ageSum = 0, offline = 0;
      st.forEach((s) => {
        const b = s.b;
        if (s.status === 'building') { offline += b.units; return; }
        const n = s.status === 'new' ? s.unitsNew : b.units;
        const age = s.status === 'new' ? y - s.since : y - b.year;
        units += n;
        ageSum += n * age;
        if (age >= 30) oldUnits += n;
        if (s.status === 'new' || s.status === 'renovated' || b.elevator) elevUnits += n;
      });
      frames.push({
        year: y,
        priceNew, cost,
        status: st.map((s) => s.status),
        floors: st.map((s) => (s.status === 'new' ? s.floorsNew : s.b.floors)),
        route: st.map((s) => s.route),
        ev,
        units, offline,
        oldShare: units ? oldUnits / units : 0,
        elevShare: units ? elevUnits / units : 0,
        avgAge: units ? ageSum / units : 0,
      });
    }
    return frames;
  }

  // ── 格式 ─────────────────────────────────────────────────────────
  const fmt = (n, d) => (n === null || n === undefined || Number.isNaN(n) ? '—' : Number(n).toLocaleString('en-US', { maximumFractionDigits: d || 0, minimumFractionDigits: d || 0 }));
  const pct = (v, d) => (v === null || v === undefined ? '—' : `${(v * 100).toFixed(d === undefined ? 1 : d)}%`);
  const hhmm = (h) => {
    const m = Math.round(h * 60);
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(((m % 60) + 60) % 60).padStart(2, '0')}`;
  };
  // 萬元 → 「1.23 億」或「4,560 萬」
  const money = (wan) => (Math.abs(wan) >= 10000 ? `${(wan / 10000).toFixed(2)} 億` : `${fmt(wan)} 萬`);

  const CALC = {
    PING, clamp, sum,
    dayOfYear, equationOfTime, declination, sunPosition, sunTimes,
    hull, fillConvex, shadowMask, sunHours, footprintMask, areaStats, boxesAbove,
    bonusSummary, stackTower, rightsCalc, pickUnits,
    hashU, feasibility, simulate,
    fmt, pct, hhmm, money,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = CALC;
  else root.CALC = CALC;
})(typeof window !== 'undefined' ? window : globalThis);
