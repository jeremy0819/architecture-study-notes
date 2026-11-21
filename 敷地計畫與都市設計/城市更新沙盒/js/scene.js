/* 城市更新沙盒｜3D 場景引擎（three.js r128，全域 THREE）
 * 只負責畫：資料在 data.js，計算在 calc.js，介面在 app.js。
 */
(function () {
  'use strict';

  const THREE = window.THREE;
  const C = window.CITY;
  const K = window.CALC;

  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888888';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const UNIT = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const UNIT_EDGES = new THREE.EdgesGeometry(UNIT);
  const FLOOR_H = { house: 3.2, walkup: 3.0, mid: 3.1, tower: 3.1, fresh: 3.2, named: 3.0 };

  function create(opts) {
    const { canvas, stage, labelsEl } = opts;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    } catch (e) {
      return null;
    }
    const small = () => stage.clientWidth <= 760;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 1, 6000);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x8d9590, 0.6);
    const ambient = new THREE.AmbientLight(0xffffff, 0.12);
    const sun = new THREE.DirectionalLight(0xfff3df, 0.9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.08;
    scene.add(hemi, ambient, sun, sun.target);

    const themed = [];
    function tmat(token, extra, kind) {
      const m = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.9, metalness: 0 }, extra));
      themed.push({ m, token, kind: kind || 'color' });
      return m;
    }
    function bmat(token, extra) {
      const m = new THREE.MeshBasicMaterial(Object.assign({}, extra));
      themed.push({ m, token, kind: 'color' });
      return m;
    }
    function lmat(token, extra) {
      const m = new THREE.LineBasicMaterial(Object.assign({}, extra));
      themed.push({ m, token, kind: 'color' });
      return m;
    }

    const M = {
      ground: tmat('--scene-ground'),
      road: tmat('--scene-road'),
      walk: tmat('--scene-walk'),
      mark: bmat('--scene-mark'),
      park: tmat('--scene-park'),
      field: tmat('--scene-field'),
      track: tmat('--scene-track'),
      plaza: tmat('--scene-plaza'),
      setback: tmat('--scene-setback'),
      tree: tmat('--scene-tree'),
      trunk: tmat('--scene-trunk'),
      ctx: tmat('--scene-ctx'),
      ctxEdge: lmat('--scene-edge', { transparent: true, opacity: 0.6 }),
      old: tmat('--scene-old'),
      shop: tmat('--scene-old-shop'),
      roofAdd: tmat('--scene-roofadd', { roughness: 0.5, metalness: 0.2 }),
      tank: tmat('--scene-tank'),
      reno: tmat('--scene-reno'),
      elev: tmat('--scene-elev'),
      pv: tmat('--scene-pv', { roughness: 0.35, metalness: 0.4 }),
      glass: tmat('--scene-new', { roughness: 0.32, metalness: 0.28 }),
      podium: tmat('--scene-podium'),
      civic: tmat('--scene-civic'),
      roofGreen: tmat('--scene-roof-green'),
      danger: tmat('--scene-danger'),
      newEdge: lmat('--scene-new-edge', { transparent: true, opacity: 0.75 }),
      hl: tmat('--scene-hl', { emissive: 0x000000 }),
      pick: tmat('--scene-pick'),
      ghost: tmat('--scene-ghost', { transparent: true, opacity: 0.2, depthWrite: false }),
      mrt: tmat('--scene-mrt', { roughness: 0.3, metalness: 0.3, transparent: true, opacity: 0.85 }),
      age0: tmat('--age-0'), age1: tmat('--age-1'), age2: tmat('--age-2'), age3: tmat('--age-3'),
      simBuild: tmat('--sim-build', { transparent: true, opacity: 0.72 }),
      simNew: tmat('--sim-new', { roughness: 0.35, metalness: 0.25 }),
      simReno: tmat('--sim-reno'),
      site: lmat('--scene-site'),
      siteFill: bmat('--scene-site', { transparent: true, opacity: 0.08, depthWrite: false }),
      zres: bmat('--z-res', { transparent: true, opacity: 0.5, depthWrite: false }),
      zcom: bmat('--z-com', { transparent: true, opacity: 0.5, depthWrite: false }),
      zpark: bmat('--z-park', { transparent: true, opacity: 0.55, depthWrite: false }),
      zschool: bmat('--z-school', { transparent: true, opacity: 0.5, depthWrite: false }),
      routeA: bmat('--route-a', { transparent: true, opacity: 0.85, depthWrite: false }),
      routeB: bmat('--route-b', { transparent: true, opacity: 0.85, depthWrite: false }),
      routeC: bmat('--route-c', { transparent: true, opacity: 0.85, depthWrite: false }),
      walkLine: bmat('--walk', { transparent: true, opacity: 0.95, depthWrite: false }),
      evac: bmat('--evac', { transparent: true, opacity: 0.9, depthWrite: false }),
      refuge: bmat('--evac', { transparent: true, opacity: 0.22, depthWrite: false }),
      fire: bmat('--route-a', { transparent: true, opacity: 0.35, depthWrite: false }),
      wind: bmat('--wind', { transparent: true, opacity: 0.85, depthWrite: false }),
      ring: lmat('--walk', { transparent: true, opacity: 0.7 }),
      open: bmat('--open', { transparent: true, opacity: 0.45, depthWrite: false }),
    };
    const ZMAT = { res: M.zres, com: M.zcom, park: M.zpark, school: M.zschool };

    // ── geometry helpers ─────────────────────────────────────────
    const world = new THREE.Group();
    scene.add(world);
    function boxMesh(rect, y0, h, mat, parent, shadow) {
      const [x0, z0, x1, z1] = rect;
      const m = new THREE.Mesh(UNIT, mat);
      m.scale.set(Math.max(0.05, x1 - x0), Math.max(0.01, h), Math.max(0.05, z1 - z0));
      m.position.set((x0 + x1) / 2, y0, (z0 + z1) / 2);
      if (shadow !== false) { m.castShadow = true; m.receiveShadow = true; }
      (parent || world).add(m);
      return m;
    }
    function edgeOf(mesh, mat, parent) {
      const e = new THREE.LineSegments(UNIT_EDGES, mat || M.ctxEdge);
      e.scale.copy(mesh.scale);
      e.position.copy(mesh.position);
      (parent || world).add(e);
      mesh.userData.edge = e;
      return e;
    }
    function flat(rect, y, mat, parent) {
      const [x0, z0, x1, z1] = rect;
      const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
      g.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(g, mat);
      m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
      m.receiveShadow = true;
      (parent || world).add(m);
      return m;
    }
    // 樓層線：每層一圈矩形
    function floorLines(rect, y0, floors, fh, mat, parent) {
      const [x0, z0, x1, z1] = rect;
      const pts = [];
      for (let i = 1; i < floors; i++) {
        const y = y0 + i * fh;
        pts.push(x0, y, z0, x1, y, z0, x1, y, z0, x1, y, z1, x1, y, z1, x0, y, z1, x0, y, z1, x0, y, z0);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const l = new THREE.LineSegments(g, mat || M.ctxEdge);
      (parent || world).add(l);
      return l;
    }
    // 平面色帶：沿折線的扁平矩形（線寬 w）
    function ribbon(points, w, y, mat, parent, arrow) {
      const g = new THREE.Group();
      for (let i = 0; i < points.length - 1; i++) {
        const [ax, az] = points[i], [bx, bz] = points[i + 1];
        const len = Math.hypot(bx - ax, bz - az);
        if (len < 0.01) continue;
        const geo = new THREE.PlaneGeometry(len + w, w);
        geo.rotateX(-Math.PI / 2);
        const m = new THREE.Mesh(geo, mat);
        m.position.set((ax + bx) / 2, y, (az + bz) / 2);
        m.rotation.y = -Math.atan2(bz - az, bx - ax);
        m.renderOrder = 3;
        g.add(m);
      }
      if (arrow) {
        const n = points.length;
        const [ax, az] = points[n - 2], [bx, bz] = points[n - 1];
        const ang = Math.atan2(bz - az, bx - ax);
        const s = new THREE.Shape();
        s.moveTo(w * 2.4, 0); s.lineTo(-w * 1.2, w * 1.9); s.lineTo(-w * 1.2, -w * 1.9); s.lineTo(w * 2.4, 0);
        const geo = new THREE.ShapeGeometry(s);
        geo.rotateX(-Math.PI / 2);
        const m = new THREE.Mesh(geo, mat);
        m.position.set(bx, y + 0.01, bz);
        m.rotation.y = -ang;
        m.renderOrder = 3;
        g.add(m);
      }
      (parent || world).add(g);
      return g;
    }
    function dashRect(rect, y, mat, parent) {
      const [x0, z0, x1, z1] = rect;
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x0, y, z0), new THREE.Vector3(x1, y, z0), new THREE.Vector3(x1, y, z1), new THREE.Vector3(x0, y, z1), new THREE.Vector3(x0, y, z0),
      ]);
      const l = new THREE.Line(g, mat);
      l.computeLineDistances();
      (parent || world).add(l);
      return l;
    }
    function ringLine(cx, cz, r, y, mat, parent) {
      const pts = [];
      for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        pts.push(new THREE.Vector3(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r));
      }
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
      l.computeLineDistances();
      (parent || world).add(l);
      return l;
    }

    // ── labels ───────────────────────────────────────────────────
    const labels = [];
    function addLabel(text, pos, o) {
      const el = document.createElement('div');
      el.className = 'tag' + (o && o.cls ? ' ' + o.cls : '');
      if (o && o.html) el.innerHTML = text; else el.textContent = text;
      labelsEl.appendChild(el);
      const L = Object.assign({ el, pos: new THREE.Vector3(pos[0], pos[1], pos[2]), pri: 2, w: 0, h: 0 }, o || {});
      labels.push(L);
      return L;
    }
    function removeLabels(group) {
      for (let i = labels.length - 1; i >= 0; i--) {
        if (labels[i].group === group) { labels[i].el.remove(); labels.splice(i, 1); }
      }
    }

    // ── state ────────────────────────────────────────────────────
    const state = {
      scenario: 'now', compare: false, left: 'now', right: 'urban', split: 0.5,
      layers: { heights: true, zoning: false, roads: false, open: false, walk: false, disaster: false, wind: false, age: false, labels: true },
      chapter: 'overview',
      sim: null,
      floorSel: null,
      unitSel: null,
      oldSel: null,
      night: false,
      sunDir: new THREE.Vector3(0.45, 0.78, 0.43).normalize(),
      heat: { left: null, right: null, single: null },
    };
    let dirty = true;
    const invalidate = () => { dirty = true; };

    // ── static ground & streets ──────────────────────────────────
    const ground = flat([-900, -900, 900, 900], -0.02, M.ground);
    ground.receiveShadow = true;
    const roadsG = new THREE.Group();
    world.add(roadsG);
    C.ROADS.forEach((r) => {
      flat(r.rect, 0.0, M.road, roadsG);
      if (r.walk) {
        const [x0, z0, x1, z1] = r.rect;
        if (r.axis === 'x') {
          flat([x0, z0, x1, z0 + r.walk], 0.05, M.walk, roadsG);
          flat([x0, z1 - r.walk, x1, z1], 0.05, M.walk, roadsG);
        } else {
          flat([x0, z0, x0 + r.walk, z1], 0.05, M.walk, roadsG);
          flat([x1 - r.walk, z0, x1, z1], 0.05, M.walk, roadsG);
        }
      }
    });
    // 主要道路中線（虛線）與斑馬線
    for (let x = -300; x < 320; x += 12) flat([x, -30.15, x + 6, -29.85], 0.03, M.mark, roadsG);
    [[-44, -32], [32, 40], [120, 132]].forEach(([a, b]) => {
      for (let z = -37; z < -23; z += 1.6) flat([a + 1, z, b - 1, z + 0.8], 0.04, M.mark, roadsG);
    });
    // 街廓地面（人行／開放空間的底色）
    C.BLOCKS.forEach((b) => {
      if (b.zone === 'park') flat(b.rect, 0.01, M.park);
      else if (b.zone === 'school') flat(b.rect, 0.01, M.plaza);
      else if (!b.site) flat(b.rect, 0.01, M.plaza);
    });
    // 學校操場
    (function track() {
      const s = new THREE.Shape();
      const cx = 33, cz = 76, rw = 46, rd = 17;
      s.absellipse(cx, -cz, rw, rd, 0, Math.PI * 2, false, 0);
      const hole = new THREE.Path();
      hole.absellipse(cx, -cz, rw - 5, rd - 5, 0, Math.PI * 2, true, 0);
      s.holes.push(hole);
      const g = new THREE.ShapeGeometry(s, 48);
      g.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(g, M.track);
      m.position.y = 0.03;
      m.receiveShadow = true;
      world.add(m);
      const f = new THREE.Shape();
      f.absellipse(cx, -cz, rw - 5, rd - 5, 0, Math.PI * 2, false, 0);
      const fg = new THREE.ShapeGeometry(f, 48);
      fg.rotateX(-Math.PI / 2);
      const fm = new THREE.Mesh(fg, M.field);
      fm.position.y = 0.025;
      fm.receiveShadow = true;
      world.add(fm);
    })();

    // 樹
    const treeGeo = new THREE.SphereGeometry(1, 10, 8);
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.24, 1, 6).translate(0, 0.5, 0);
    function tree(x, z, s, parent) {
      const g = new THREE.Group();
      const t = new THREE.Mesh(trunkGeo, M.trunk);
      t.scale.set(s, 2.6 * s, s);
      const c = new THREE.Mesh(treeGeo, M.tree);
      c.scale.set(2.4 * s, 2.1 * s, 2.4 * s);
      c.position.y = 3.6 * s;
      c.castShadow = true;
      g.add(t, c);
      g.position.set(x, 0, z);
      (parent || world).add(g);
      return g;
    }
    const rnd = (() => { let a = 7; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; })();
    for (let x = -300; x < 320; x += 9) {
      if (x > -46 && x < 42) continue;
      tree(x, -38.6, 0.85);
      tree(x + 4, -21.4, 0.85);
    }
    for (let i = 0; i < 46; i++) tree(-120 + rnd() * 72, -16 + rnd() * 32, 0.9 + rnd() * 0.6);
    for (let i = 0; i < 18; i++) tree(-30 + rnd() * 140, 96 + rnd() * 3, 0.9);
    // 公園涼亭
    boxMesh([-88, -4, -80, 4], 0, 3.2, M.podium);

    // 捷運出入口
    (function mrt() {
      const g = new THREE.Group();
      boxMesh([134, -19, 142, -13], 0, 3.6, M.mrt, g);
      boxMesh([133, -19.5, 143, -12.5], 3.6, 0.35, M.podium, g);
      world.add(g);
    })();

    // ── context buildings ────────────────────────────────────────
    const ctxRecs = [];
    const pickCtx = [];
    function buildCtx(b, named) {
      const fh = b.floorH || (named ? FLOOR_H.named : FLOOR_H[b.type] || 3);
      const g = new THREE.Group();
      const rec = { b, g, fh, named, h: b.floors * fh };
      const [x0, z0, x1, z1] = b.rect;
      const arc = b.arcade;
      if (arc) {
        const inset = 3.64;
        const r = arc === 'S' ? [x0, z0, x1, z1 - inset] : arc === 'N' ? [x0, z0 + inset, x1, z1] : arc === 'E' ? [x0, z0, x1 - inset, z1] : [x0 + inset, z0, x1, z1];
        rec.base = boxMesh(r, 0, fh, M.ctx, g);
        rec.body = boxMesh(b.rect, fh, (b.floors - 1) * fh, M.ctx, g);
      } else {
        rec.body = boxMesh(b.rect, 0, b.floors * fh, M.ctx, g);
      }
      edgeOf(rec.body, M.ctxEdge, g);
      if (rec.base) edgeOf(rec.base, M.ctxEdge, g);
      if (b.roofAdd) {
        const w = x1 - x0, d = z1 - z0;
        rec.roof = boxMesh([x0 + w * 0.12, z0 + d * 0.18, x1 - w * 0.2, z1 - d * 0.12], b.floors * fh, 2.6, M.roofAdd, g);
      }
      rec.meshes = [rec.body, rec.base, rec.roof].filter(Boolean);
      rec.meshes.forEach((m) => { m.userData.pick = { type: 'ctx', rec }; pickCtx.push(m); });
      world.add(g);
      ctxRecs.push(rec);
      if (named) {
        rec.label = addLabel(`${b.floors}F`, [(x0 + x1) / 2, rec.h + 1.5, (z0 + z1) / 2], { layer: 'heights', cls: 'h', pri: 1, kind: 'height', rec });
      }
      return rec;
    }
    C.NAMED.forEach((b) => buildCtx(b, true));
    C.GENERATED.forEach((b) => buildCtx(b, false));
    const ctxById = {};
    ctxRecs.forEach((r) => { ctxById[r.b.id] = r; });

    // ── zoning, road tiers, site boundary (layers) ───────────────
    const layerG = {};
    function lgroup(name) { const g = new THREE.Group(); g.visible = false; world.add(g); layerG[name] = g; return g; }
    const zoning = lgroup('zoning');
    C.BLOCKS.forEach((b) => flat(b.rect, 0.07, ZMAT[b.zone], zoning).renderOrder = 2);
    const roadsL = lgroup('roads');
    C.ROADS.forEach((r) => {
      const mat = r.tier === 'emergency' ? M.routeA : r.tier === 'rescue' ? M.routeB : M.routeC;
      const [x0, z0, x1, z1] = r.rect;
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      const pts = r.axis === 'x' ? [[Math.max(x0, -260), cz], [Math.min(x1, 270), cz]] : [[cx, Math.max(z0, -122)], [cx, Math.min(z1, 108)]];
      ribbon(pts, r.tier === 'lane' ? 1.2 : 2.2, 0.12, mat, roadsL);
    });
    [
      ['20 m 計畫道路・緊急道路', [-80, 0.4, -30]], ['12 m 計畫道路', [-38, 0.4, 60]], ['10 m 計畫道路', [-100, 0.4, 25]],
      ['8 m 巷道', [36, 0.4, 8]], ['15 m 計畫道路', [-60, 0.4, -117]],
    ].forEach(([t, p]) => addLabel(t, p, { layer: 'roads', cls: 'road', pri: 2 }));

    const siteLine = dashRect(C.SITE.rect, 0.16, new THREE.LineDashedMaterial({ color: cssVar('--scene-site'), dashSize: 3.2, gapSize: 1.1 }));
    themed.push({ m: siteLine.material, token: '--scene-site', kind: 'color' });
    const siteFill = flat(C.SITE.rect, 0.06, M.siteFill);
    const siteLabel = addLabel('更新單元 2,560 ㎡', [0, 0.4, 22.5], { cls: 'site', pri: 0, layer: 'always' });

    // ── walking, disaster, wind layers ───────────────────────────
    const walkL = lgroup('walk');
    const walkLabels = {};
    Object.entries(C.WALKS).forEach(([id, pts]) => {
      ribbon(pts, 1.1, 0.2, M.walkLine, walkL, true);
      let d = 0;
      for (let i = 1; i < pts.length; i++) d += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      const f = C.FACILITIES.find((x) => x.id === id);
      walkLabels[id] = { d };
      addLabel(`${f.name}｜${Math.round(d)} m`, [f.p[0], 4, f.p[1]], { layer: 'walk', cls: 'walk', pri: 1, facility: id, dist: d });
    });
    ringLine(138, -16, 500, 0.25, new THREE.LineDashedMaterial({ color: cssVar('--walk'), dashSize: 8, gapSize: 6 }), walkL);
    addLabel('捷運 500 m 範圍', [138 - 360, 0.5, -16 - 340], { layer: 'walk', cls: 'walk dim', pri: 3 });

    const disasterL = lgroup('disaster');
    C.REFUGE.forEach((r) => {
      if (r.after) return;
      flat(r.rect, 0.1, M.refuge, disasterL).renderOrder = 2;
      const [x0, z0, x1, z1] = r.rect;
      addLabel(r.name, [(x0 + x1) / 2, 2, (z0 + z1) / 2], { layer: 'disaster', cls: 'evac', pri: 1 });
    });
    C.EVAC.forEach((pts) => ribbon(pts, 1.4, 0.22, M.evac, disasterL, true));
    const firePad = flat(C.FIRE_PAD.rect, 0.24, M.fire, disasterL);
    firePad.renderOrder = 3;
    firePad.userData.after = true;
    const fireLabel = addLabel('消防車救災活動空間', [-2, 2, -18], { layer: 'disaster', cls: 'evac', pri: 2, scen: 'urban' });

    const windL = lgroup('wind');
    C.WIND.forEach((w, i) => {
      const a = (w.from * Math.PI) / 180;
      const dx = -Math.sin(a), dz = Math.cos(a);
      for (let k = -2; k <= 2; k++) {
        const ox = (i ? -1 : 1) * 60 + k * 36 * dz, oz = (i ? 1 : -1) * 50 - k * 36 * dx;
        const sx = ox - dx * 40, sz = oz - dz * 40;
        ribbon([[sx, sz], [sx + dx * 34, sz + dz * 34]], 0.9, 0.3 + i * 0.02, M.wind, windL, true);
      }
      addLabel(w.label, [(i ? -1 : 1) * 60 - dx * 46, 3, (i ? 1 : -1) * 50 - dz * 46], { layer: 'wind', cls: 'wind', pri: 1 });
    });

    // ── site scenarios ───────────────────────────────────────────
    const SC = {};
    const pickSc = { now: [], renovate: [], dangerous: [], urban: [] };
    function scGroup(id) { const g = new THREE.Group(); g.visible = false; world.add(g); SC[id] = g; return g; }

    // 現況與老宅延壽：逐戶量體
    const oldMeshes = {};
    function buildOld(id, reno) {
      const g = scGroup(id);
      const fh = 3;
      const unitMeshes = {};
      C.OLD.forEach((b) => {
        const [x0, z0, x1, z1] = b.rect;
        const units = C.OLD_UNITS.filter((u) => u.bld === b.id);
        units.forEach((u) => {
          const mat = reno ? M.reno : u.kind === 'shop' ? M.shop : M.old;
          let r = u.rect;
          let y0 = (u.floor - 1) * fh, h = fh;
          if (u.kind === 'house') { y0 = 0; h = b.floors * 3.2; }
          if (b.arcade === 'N' && u.floor === 1) r = [r[0], r[1] + 3.64, r[2], r[3]];
          const m = boxMesh(r, y0, h, mat, g);
          edgeOf(m, M.ctxEdge, g);
          m.userData.pick = { type: 'old', unit: u, bld: b, scen: id };
          m.userData.baseMat = mat;
          pickSc[id].push(m);
          unitMeshes[u.id] = m;
        });
        const top = b.house ? b.floors * 3.2 : b.floors * fh;
        if (b.roofAdd) {
          const w = x1 - x0, d = z1 - z0;
          boxMesh([x0 + w * 0.1, z0 + d * 0.15, x1 - w * 0.3, z1 - d * 0.1], top, 2.6, M.roofAdd, g);
        }
        if (!b.house) {
          const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.6, 12).translate(0, 0.8, 0), M.tank);
          tank.position.set(x1 - 2.2, top, z1 - 2);
          tank.castShadow = true;
          g.add(tank);
        }
        if (reno && !b.house) {
          // 增設電梯：貼在背面（面向內部通路）
          const cx = (x0 + x1) / 2;
          const back = b.id === 'A' || b.id === 'B' ? [cx - 1.4, z1, cx + 1.4, z1 + 2.6] : [cx - 1.4, z0 - 2.6, cx + 1.4, z0];
          const e = boxMesh(back, 0, top + 3.2, M.elev, g);
          edgeOf(e, M.newEdge, g);
          // 屋頂光電
          const w = x1 - x0;
          if (!b.roofAdd) boxMesh([x0 + 1, z0 + 1, x1 - 1, z1 - 1], top + 0.35, 0.18, M.pv, g);
          else boxMesh([x1 - w * 0.28, z0 + 1, x1 - 1, z1 - 1], top + 0.35, 0.18, M.pv, g);
        }
      });
      oldMeshes[id] = unitMeshes;
      // 內部通路
      flat([-32, -8, 32, -3], 0.04, M.walk, g);
      flat([-32, 9, 32, 11], 0.04, M.walk, g);
      return g;
    }
    buildOld('now', false);
    buildOld('renovate', true);
    addLabel('A 棟 5F（1979）', [-16, 17, -14], { cls: 'site', pri: 2, scen: 'now', layer: 'heights' });
    addLabel('B 棟 5F（1980）', [16, 17, -14], { cls: 'site', pri: 2, scen: 'now', layer: 'heights' });
    addLabel('C 棟 4F', [-18, 14, 3], { cls: 'site', pri: 3, scen: 'now', layer: 'heights' });
    addLabel('D 棟 4F', [16, 14, 3], { cls: 'site', pri: 3, scen: 'now', layer: 'heights' });
    addLabel('增設電梯', [16, 19.5, -6], { cls: 'key', pri: 1, scen: 'renovate' });
    addLabel('屋頂光電', [-6, 17, 3], { cls: 'key', pri: 2, scen: 'renovate' });

    // 危老：四宗基地（樓層數由 app 計算後傳入）
    const dg = scGroup('dangerous');
    const dangerLabels = [];
    function rebuildDangerous(list) {
      while (dg.children.length) {
        const o = dg.children.pop();
        if (o.geometry && o.geometry !== UNIT && o.geometry !== UNIT_EDGES) o.geometry.dispose();
      }
      pickSc.dangerous.length = 0;
      removeLabels('dangerous');
      list.forEach((p) => {
        const fh = 3.2;
        const m = boxMesh(p.bld, 0, p.floors * fh, M.danger, dg);
        edgeOf(m, M.newEdge, dg);
        floorLines(p.bld, 0, p.floors, fh, M.newEdge, dg);
        m.userData.pick = { type: 'danger', parcel: p };
        pickSc.dangerous.push(m);
        const [x0, z0, x1, z1] = p.bld;
        addLabel(`${p.id} ${p.floors}F`, [(x0 + x1) / 2, p.floors * fh + 2, (z0 + z1) / 2], { cls: 'site', pri: 1, scen: 'dangerous', group: 'dangerous', layer: 'heights' });
        // 退縮帶
        const [lx0, lz0, lx1, lz1] = p.lot;
        flat([lx0, lz0, lx1, lz1], 0.04, M.setback, dg);
      });
      invalidate();
    }

    // 都更：裙樓＋塔樓（逐層）
    const ug = scGroup('urban');
    const urban = { floors: [], unitG: new THREE.Group(), top: 0 };
    ug.add(urban.unitG);
    function rebuildUrban(mass) {
      while (ug.children.length) {
        const o = ug.children.pop();
        if (o !== urban.unitG && o.geometry && o.geometry !== UNIT && o.geometry !== UNIT_EDGES) o.geometry.dispose();
      }
      ug.add(urban.unitG);
      pickSc.urban.length = 0;
      urban.floors = [];
      removeLabels('urban');
      const U = C.URBAN;
      // 地面：退縮帶與廣場
      flat(C.SITE.rect, 0.05, M.setback, ug);
      flat(U.plaza, 0.07, M.plaza, ug);
      [[-24, -10], [-24, 0], [-24, 10], [-18, -6], [-18, 6], [-10, 14], [0, 14], [10, 14], [20, 14]].forEach(([x, z]) => tree(x, z, 0.8, ug));
      [[-28, -18], [-16, -18], [26, -18], [30, -12], [30, 6]].forEach(([x, z]) => tree(x, z, 0.7, ug));
      // 裙樓
      let y = 0;
      U.podium.floors.forEach((f) => {
        const mat = f.use === 'civic' ? M.civic : M.podium;
        const m = boxMesh(U.podium.rect, y, f.h, mat, ug);
        edgeOf(m, M.newEdge, ug);
        m.userData.pick = { type: 'podium', floor: f };
        m.userData.baseMat = mat;
        pickSc.urban.push(m);
        urban.floors.push({ id: f.id, mesh: m, y0: y, h: f.h, podium: true });
        y += f.h;
      });
      // 裙樓屋頂花園（扣掉塔樓）
      const pr = U.podium.rect, tr = U.tower.rect;
      flat([pr[0] + 0.6, pr[1] + 0.6, tr[0] - 0.6, pr[3] - 0.6], y + 0.06, M.roofGreen, ug);
      flat([tr[2] + 0.6, pr[1] + 0.6, pr[2] - 0.6, pr[3] - 0.6], y + 0.06, M.roofGreen, ug);
      flat([tr[0], tr[3] + 0.6, tr[2], pr[3] - 0.6], y + 0.06, M.roofGreen, ug);
      // 塔樓
      for (let i = 0; i < mass.towerFloors; i++) {
        const m = boxMesh(tr, y, U.tower.typH, M.glass, ug);
        m.userData.pick = { type: 'tower', index: i, floorNo: i + 3 };
        m.userData.baseMat = M.glass;
        pickSc.urban.push(m);
        urban.floors.push({ id: `${i + 3}F`, mesh: m, y0: y, h: U.tower.typH, index: i });
        y += U.tower.typH;
      }
      const towerTop = y;
      const outline = boxMesh(tr, U.podium.floors.reduce((s, f) => s + f.h, 0), towerTop - U.podium.floors.reduce((s, f) => s + f.h, 0), M.glass, ug, false);
      outline.visible = false;
      edgeOf(outline, M.newEdge, ug);
      floorLines(tr, towerTop - mass.towerFloors * U.tower.typH, mass.towerFloors, U.tower.typH, M.newEdge, ug);
      // 屋突與光電
      const roof = boxMesh([tr[0] + 9, tr[1] + 3, tr[0] + 19, tr[1] + 11], towerTop, U.roofH, M.podium, ug);
      edgeOf(roof, M.newEdge, ug);
      boxMesh([tr[0] + 1, tr[1] + 1, tr[0] + 8, tr[3] - 1], towerTop + 0.3, 0.2, M.pv, ug);
      boxMesh([tr[0] + 20, tr[1] + 1, tr[2] - 1, tr[3] - 1], towerTop + 0.3, 0.2, M.pv, ug);
      urban.top = towerTop;
      addLabel(`${mass.floors}F｜${mass.height.toFixed(1)} m`, [(tr[0] + tr[2]) / 2, towerTop + U.roofH + 3, (tr[1] + tr[3]) / 2], { cls: 'site big', pri: 0, scen: 'urban', group: 'urban', layer: 'always' });
      addLabel('開放空間廣場', [-21, 1, 0], { cls: 'key', pri: 1, scen: 'urban', group: 'urban', layer: 'open' });
      addLabel('4 m 無遮簷人行道', [12, 1, -18], { cls: 'key', pri: 2, scen: 'urban', group: 'urban', layer: 'open' });
      addLabel('2F 公益設施', [24, 9.5, -14], { cls: 'key', pri: 2, scen: 'urban', group: 'urban' });
      addLabel('車道出入口（次要道路）', [31, 2, 4], { cls: 'key', pri: 3, scen: 'urban', group: 'urban', layer: 'roads' });
      invalidate();
    }

    // 都更：選取樓層 → 顯示該層 6 戶
    function showFloorUnits(floorNo) {
      while (urban.unitG.children.length) urban.unitG.remove(urban.unitG.children[0]);
      const f = urban.floors.find((x) => x.id === `${floorNo}F`);
      if (!f) return;
      C.URBAN.plan.forEach((u) => {
        const m = boxMesh(u.rect, f.y0 + 0.05, f.h - 0.1, M.pick, urban.unitG, false);
        m.userData.pick = { type: 'newUnit', floorNo, plan: u };
        m.userData.unitId = u.id;
        m.userData.baseMat = M.pick;
        edgeOf(m, M.newEdge, urban.unitG);
      });
      boxMesh(C.URBAN.core, f.y0 + 0.05, f.h - 0.1, M.podium, urban.unitG, false);
      boxMesh(C.URBAN.corridor, f.y0 + 0.05, 0.2, M.podium, urban.unitG, false);
    }

    // ── overlays: heat map ───────────────────────────────────────
    const heatPlane = { mesh: null, grid: null };
    function setHeatGrid(grid) {
      if (heatPlane.mesh) { world.remove(heatPlane.mesh); heatPlane.mesh.geometry.dispose(); }
      const w = grid.nx * grid.cell, d = grid.nz * grid.cell;
      const g = new THREE.PlaneGeometry(w, d);
      g.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0.88 });
      const m = new THREE.Mesh(g, mat);
      m.position.set(grid.x0 + w / 2, 0.18, grid.z0 + d / 2);
      m.renderOrder = 4;
      m.visible = false;
      world.add(m);
      heatPlane.mesh = m;
      heatPlane.grid = grid;
    }
    function makeHeatTexture(rgba, grid) {
      const tex = new THREE.DataTexture(rgba, grid.nx, grid.nz, THREE.RGBAFormat);
      tex.magFilter = THREE.LinearFilter;
      tex.minFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
      return tex;
    }

    // ── open space / setbacks overlay for urban ─────────────────
    const openL = lgroup('open');
    flat(C.URBAN.plaza, 0.12, M.open, openL).renderOrder = 3;
    flat([-28, -20, 32, -16], 0.12, M.open, openL).renderOrder = 3;
    flat([-32, -20, -28, 20], 0.12, M.open, openL).renderOrder = 3;
    flat([-28, 16, 32, 20], 0.12, M.open, openL).renderOrder = 3;
    flat([30, -16, 32, 16], 0.12, M.open, openL).renderOrder = 3;

    // ── sim helpers ─────────────────────────────────────────────
    const caseScaffold = new THREE.Group();
    world.add(caseScaffold);
    boxMesh([-28, -16, 30, 16], 0, 16, M.simBuild, caseScaffold);
    caseScaffold.visible = false;

    // ── camera control ───────────────────────────────────────────
    const ctl = { target: new THREE.Vector3(8, 6, -10), radius: 230, theta: 0.62, phi: 0.98, fov: 38, anim: null, minPhi: 0.02, maxPhi: 1.52 };
    const tmpV = new THREE.Vector3();
    const VIEWS = {
      aerial: { target: [6, 12, -6], pos: [150, 150, 190], fov: 38, span: 300 },
      street: { target: [10, 13, -12], pos: [-62, 1.7, -37.5], fov: 60, street: true },
      plan: { target: [16, 0, -10], pos: [16, 520, -9.6], fov: 30, span: 330, spanV: 240 },
      city: { target: [10, 0, -6], pos: [260, 330, 380], fov: 38, span: 520 },
      site: { target: [4, 16, -2], pos: [128, 118, 168], fov: 38, span: 150 },
      sun: { target: [0, 0, -40], pos: [40, 300, 140], fov: 36, span: 280 },
    };
    // 依可用畫面寬度把指定的寬度（span）放進視野
    // 焦距以畫布高度計（applyCam 會把視野角換算到加了位移的虛擬畫框），span 要放進面板以外的空間
    function fitRadius(v, r) {
      if (!v.span) return r;
      const w = stage.clientWidth, h = Math.max(1, stage.clientHeight);
      const freeW = Math.max(120, w - offset.x - 24), freeH = Math.max(120, h - offset.y - 24);
      const vf = THREE.MathUtils.degToRad(v.fov || 38);
      const f = h / (2 * Math.tan(vf / 2));
      const span = w <= 760 ? v.span * 0.72 : v.span;
      let need = (span * f) / freeW;
      if (v.spanV) need = Math.max(need, (v.spanV * f) / freeH);
      return Math.max(r, need);
    }
    function sph(pos, target) {
      const o = tmpV.set(pos[0] - target[0], pos[1] - target[1], pos[2] - target[2]);
      const r = o.length();
      return { target: new THREE.Vector3(target[0], target[1], target[2]), radius: r, theta: Math.atan2(o.x, o.z), phi: Math.acos(Math.min(1, Math.max(-1, o.y / r))) };
    }
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    function flyTo(v, dur) {
      const end = sph(v.pos, v.target);
      end.fov = v.fov || 38;
      end.radius = fitRadius(v, end.radius);
      ctl.maxPhi = v.street ? 1.78 : 1.52;
      const d = reduceMotion.matches ? 0 : dur === undefined ? 1100 : dur;
      let dT = end.theta - ctl.theta;
      dT = ((((dT + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
      ctl.anim = { t0: performance.now(), d, from: { target: ctl.target.clone(), theta: ctl.theta, phi: ctl.phi, radius: ctl.radius, fov: ctl.fov }, end, dT };
      invalidate();
    }
    function view(name, dur) { if (VIEWS[name]) flyTo(VIEWS[name], dur); }
    function stepAnim(now) {
      const a = ctl.anim;
      if (!a) return false;
      const t = a.d ? Math.min(1, (now - a.t0) / a.d) : 1;
      const k = ease(t);
      ctl.target.lerpVectors(a.from.target, a.end.target, k);
      ctl.theta = a.from.theta + a.dT * k;
      ctl.phi = a.from.phi + (a.end.phi - a.from.phi) * k;
      ctl.radius = Math.exp(Math.log(a.from.radius) + (Math.log(a.end.radius) - Math.log(a.from.radius)) * k);
      ctl.fov = a.from.fov + (a.end.fov - a.from.fov) * k;
      if (t >= 1) ctl.anim = null;
      return true;
    }
    let offset = { x: 0, y: 0 };
    function setOffset(x, y) { offset = { x: Math.max(0, x || 0), y: Math.max(0, y || 0) }; invalidate(); }
    function applyCam() {
      const s = Math.sin(ctl.phi);
      camera.position.set(
        ctl.target.x + ctl.radius * s * Math.sin(ctl.theta),
        ctl.target.y + ctl.radius * Math.cos(ctl.phi),
        ctl.target.z + ctl.radius * s * Math.cos(ctl.theta)
      );
      camera.lookAt(ctl.target);
      const w = stage.clientWidth, h = Math.max(stage.clientHeight, 1);
      // 讓可見的畫布維持 ctl.fov：虛擬畫框加高 offset.y 時，視野角跟著放大
      camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(ctl.fov) / 2) * ((h + offset.y) / h)));
      camera.near = Math.max(0.3, ctl.radius / 600);
      camera.far = ctl.radius * 10 + 2500;
      camera.aspect = (w + offset.x) / (h + offset.y);
      if (offset.x || offset.y) camera.setViewOffset(w + offset.x, h + offset.y, offset.x, offset.y, w, h);
      else camera.clearViewOffset();
      camera.updateProjectionMatrix();
      // 陰影範圍跟著視野
      const S = THREE.MathUtils.clamp(ctl.radius * 0.95, 140, 420);
      Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 10, far: 2200 });
      sun.shadow.camera.updateProjectionMatrix();
      sun.target.position.set(ctl.target.x, 0, ctl.target.z);
      sun.position.copy(sun.target.position).addScaledVector(state.sunDir, 900);
    }
    function rotate(dx, dy) {
      ctl.theta -= dx * 0.0055;
      ctl.phi = Math.min(ctl.maxPhi, Math.max(ctl.minPhi, ctl.phi - dy * 0.0045));
    }
    function pan(dx, dy) {
      const s = (ctl.radius * 0.0019 * ctl.fov) / 38;
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
      ctl.target.addScaledVector(right.setY(0).normalize(), -dx * s);
      ctl.target.add(new THREE.Vector3(-Math.sin(ctl.theta), 0, -Math.cos(ctl.theta)).multiplyScalar(dy * s));
      ctl.target.x = THREE.MathUtils.clamp(ctl.target.x, -320, 330);
      ctl.target.z = THREE.MathUtils.clamp(ctl.target.z, -260, 220);
    }
    function zoom(f) { ctl.radius = Math.min(1500, Math.max(8, ctl.radius * f)); }

    // ── pointer: orbit, hover, click, swipe ──────────────────────
    const ptrs = new Map();
    let pinch = null, down = null, dragMode = 'rotate';
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let hoverObj = null;
    let hoverPending = null;
    function pickables(sideScen) {
      const scen = sideScen || state.scenario;
      const list = [];
      if (state.chapter !== 'city' || !state.sim) list.push(...pickCtx);
      else list.push(...pickCtx);
      if (SC[scen] && SC[scen].visible !== false) list.push(...pickSc[scen]);
      if (scen === 'urban') urban.unitG.children.forEach((m) => { if (m.userData.pick) list.push(m); });
      return list.filter((m) => m.visible);
    }
    function sideAt(x) {
      if (!state.compare) return state.scenario;
      return x < stage.clientWidth * state.split ? state.left : state.right;
    }
    function hitTest(e) {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      ndc.set((x / r.width) * 2 - 1, -(y / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const scen = sideAt(x);
      showScenario(scen);
      const hit = ray.intersectObjects(pickables(scen), false)[0];
      return hit ? hit.object : null;
    }
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      dragMode = e.button === 2 || e.shiftKey ? 'pan' : 'rotate';
      if (e.pointerType === 'touch' && ptrs.size === 1) dragMode = 'rotate';
      ctl.anim = null;
      if (ptrs.size === 2) pinch = null;
      down = ptrs.size === 1 ? { x: e.clientX, y: e.clientY, t: performance.now(), button: e.button } : null;
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = ptrs.get(e.pointerId);
      if (!p) {
        if (e.pointerType === 'mouse') { hoverPending = e; invalidate(); }
        return;
      }
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (ptrs.size === 1) {
        if (dragMode === 'pan') pan(dx, dy); else rotate(dx, dy);
      } else if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        if (pinch) { zoom(pinch.dist / Math.max(dist, 1)); pan(mx - pinch.mx, my - pinch.my); }
        pinch = { dist, mx, my };
      }
      if (hoverObj) { setHover(null); opts.onHover(null); }
      invalidate();
    });
    const endPtr = (e) => {
      const wasClick = down && ptrs.size === 1 && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6 && performance.now() - down.t < 600 && down.button === 0;
      ptrs.delete(e.pointerId);
      pinch = null;
      if (wasClick && e.type === 'pointerup') {
        const obj = hitTest(e);
        opts.onPick(obj ? obj.userData.pick : null, e);
        invalidate();
      }
      down = null;
    };
    canvas.addEventListener('pointerup', endPtr);
    canvas.addEventListener('pointercancel', endPtr);
    canvas.addEventListener('pointerleave', () => { if (hoverObj) { setHover(null); opts.onHover(null); invalidate(); } });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      ctl.anim = null;
      zoom(Math.exp(e.deltaY * 0.0012));
      invalidate();
    }, { passive: false });
    canvas.addEventListener('keydown', (e) => {
      const k = e.key;
      if (k === 'ArrowLeft') rotate(-24, 0);
      else if (k === 'ArrowRight') rotate(24, 0);
      else if (k === 'ArrowUp') rotate(0, -24);
      else if (k === 'ArrowDown') rotate(0, 24);
      else if (k === '+' || k === '=') zoom(0.88);
      else if (k === '-') zoom(1.14);
      else return;
      e.preventDefault();
      ctl.anim = null;
      invalidate();
    });
    function setHover(obj) {
      if (hoverObj === obj) return;
      if (hoverObj) restoreMat(hoverObj);
      hoverObj = obj;
      if (obj) {
        const meshes = obj.userData.pick && obj.userData.pick.rec ? obj.userData.pick.rec.meshes : [obj];
        meshes.forEach((m) => { m.userData.hoverPrev = m.material; m.material = M.hl; });
      }
    }
    function restoreMat(obj) {
      const meshes = obj.userData.pick && obj.userData.pick.rec ? obj.userData.pick.rec.meshes : [obj];
      meshes.forEach((m) => { if (m.userData.hoverPrev) { m.material = m.userData.hoverPrev; m.userData.hoverPrev = null; } });
    }
    function processHover() {
      if (!hoverPending) return;
      const e = hoverPending;
      hoverPending = null;
      if (ptrs.size) return;
      const obj = hitTest(e);
      if (obj !== hoverObj) {
        setHover(obj);
        opts.onHover(obj ? obj.userData.pick : null, e);
      } else if (obj) {
        opts.onHover(obj.userData.pick, e);
      }
    }

    // ── labels placement ─────────────────────────────────────────
    const proj = new THREE.Vector3();
    const occRay = new THREE.Raycaster();
    function labelVisible(L) {
      if (!state.layers.labels && L.layer !== 'always') return false;
      if (L.layer && L.layer !== 'always' && !state.layers[L.layer]) return false;
      if (L.scen) {
        if (state.compare) return false;
        if (L.scen !== (simPhase || state.scenario)) return false;
      }
      if (L.kind === 'height' && state.chapter === 'city') return false;
      return true;
    }
    function occluded(L) {
      tmpV.subVectors(L.pos, camera.position);
      const dist = tmpV.length();
      occRay.set(camera.position, tmpV.normalize());
      occRay.far = dist - 1.2;
      const own = L.rec ? L.rec.meshes : null;
      const list = pickables(state.compare ? state.right : state.scenario).filter((m) => !own || own.indexOf(m) < 0);
      return occRay.intersectObjects(list, false).length > 0;
    }
    function placeLabels() {
      const w = stage.clientWidth, h = stage.clientHeight;
      const maxPri = w < 760 ? 1 : w < 1180 ? 2 : 3;
      const placed = [];
      const rightLimit = w - offset.x;
      const list = labels.slice().sort((a, b) => a.pri - b.pri);
      list.forEach((L) => {
        let show = L.pri <= maxPri && labelVisible(L);
        let x = 0, y = 0;
        if (show) {
          proj.copy(L.pos).project(camera);
          if (proj.z > 1 || proj.z < -1) show = false;
          x = ((proj.x + 1) / 2) * w;
          y = ((1 - proj.y) / 2) * h;
        }
        if (show && L.kind === 'height' && occluded(L)) show = false;
        if (show) {
          if (!L.w) { L.w = L.el.offsetWidth; L.h = L.el.offsetHeight; }
          const box = { x0: x - L.w / 2 - 3, x1: x + L.w / 2 + 3, y0: y - L.h - 6, y1: y + 2 };
          if (box.x0 < 2 || box.x1 > rightLimit - 2 || box.y0 < 2 || box.y1 > h - 2) show = false;
          else if (placed.some((b) => !(box.x1 < b.x0 || box.x0 > b.x1 || box.y1 < b.y0 || box.y0 > b.y1))) show = false;
          if (show) {
            placed.push(box);
            L.el.style.transform = `translate(${Math.round(x - L.w / 2)}px, ${Math.round(y - L.h - 4)}px)`;
          }
        }
        L.el.style.visibility = show ? 'visible' : 'hidden';
      });
    }

    // ── scenario visibility & render ─────────────────────────────
    let simPhase = null;
    function showScenario(id) {
      Object.keys(SC).forEach((k) => { SC[k].visible = k === id; });
      const simCase = state.chapter === 'city' && state.sim;
      if (simCase) {
        const y = state.sim.year;
        const phase = y < C.SIM.caseStart ? 'now' : y < C.SIM.caseDone ? 'build' : 'urban';
        Object.keys(SC).forEach((k) => { SC[k].visible = k === phase; });
        caseScaffold.visible = phase === 'build';
        simPhase = phase;
      } else {
        caseScaffold.visible = false;
        simPhase = null;
      }
      firePad.visible = id === 'urban';
      layerG.open.visible = state.layers.open && (id === 'urban');
    }
    function applyHeat(which) {
      const tex = state.heat[which];
      if (!heatPlane.mesh) return;
      heatPlane.mesh.visible = !!tex;
      const mat = heatPlane.mesh.material;
      if (tex && mat.map !== tex) {
        const had = !!mat.map;
        mat.map = tex;
        if (!had) mat.needsUpdate = true;
      }
    }
    function render() {
      const w = stage.clientWidth, h = stage.clientHeight;
      if (state.compare) {
        const sx = Math.round(w * state.split);
        renderer.setScissorTest(true);
        showScenario(state.left);
        applyHeat('left');
        renderer.setScissor(0, 0, sx, h);
        renderer.render(scene, camera);
        showScenario(state.right);
        applyHeat('right');
        renderer.setScissor(sx, 0, w - sx, h);
        renderer.render(scene, camera);
        renderer.setScissorTest(false);
      } else {
        showScenario(state.scenario);
        applyHeat('single');
        renderer.render(scene, camera);
      }
    }
    function frame(now) {
      requestAnimationFrame(frame);
      const moving = stepAnim(now);
      if (!dirty && !moving && !hoverPending) return;
      if (hoverPending && !dirty && !moving) { applyCam(); processHover(); }
      dirty = false;
      applyCam();
      render();
      placeLabels();
      if (opts.onFrame) opts.onFrame(ctl);
    }
    function resize() {
      renderer.setSize(stage.clientWidth, stage.clientHeight, false);
      labels.forEach((L) => { L.w = 0; });
      invalidate();
    }
    new ResizeObserver(resize).observe(stage);

    // ── colors / theme ───────────────────────────────────────────
    function refreshColors() {
      themed.forEach((t) => { t.m.color = new THREE.Color(cssVar(t.token)); });
      scene.background = new THREE.Color(cssVar(state.night ? '--scene-night' : '--scene-sky'));
      const night = state.night;
      hemi.intensity = night ? 0.2 : 0.6;
      ambient.intensity = night ? 0.06 : 0.12;
      sun.intensity = night ? 0.12 : 0.9;
      sun.color = new THREE.Color(night ? 0x9fb4ff : 0xfff3df);
      scene.fog = new THREE.Fog(scene.background.getHex(), 900, 2600);
      // 夜景：住宅亮燈（以自發光近似）
      const glow = [[M.ctx, 0x2a2214], [M.old, 0x3a2410], [M.shop, 0x4a2a0c], [M.glass, 0x0f4a4c], [M.podium, 0x3a3020], [M.civic, 0x16402a], [M.danger, 0x241f45], [M.reno, 0x173a30], [M.simNew, 0x10414c]];
      glow.forEach(([m, c]) => { m.emissive = new THREE.Color(night ? c : 0x000000); });
      invalidate();
    }

    // ── sim colouring ────────────────────────────────────────────
    function ageMat(age) { return age < 15 ? M.age0 : age < 30 ? M.age1 : age < 45 ? M.age2 : M.age3; }
    function applyCtxColors() {
      const sim = state.chapter === 'city' ? state.sim : null;
      const byAge = state.layers.age || !!sim;
      const year = sim ? sim.year : 2026;
      const idx = sim ? sim.index : null;
      ctxRecs.forEach((rec) => {
        const b = rec.b;
        let mat = M.ctx;
        let floors = b.floors;
        let status = 'old';
        if (sim && idx && idx[b.id] !== undefined) {
          const i = idx[b.id];
          status = sim.frame.status[i];
          floors = sim.frame.floors[i];
        }
        if (byAge) {
          if (status === 'new') mat = M.simNew;
          else if (status === 'building') mat = M.simBuild;
          else if (status === 'renovated') mat = M.simReno;
          else mat = ageMat(year - b.year);
        }
        const h = (status === 'new' ? 3.2 : rec.fh) * floors;
        if (rec.base) rec.base.visible = status !== 'new';
        if (rec.roof) rec.roof.visible = status !== 'new' && status !== 'renovated';
        const yb = rec.base && status !== 'new' ? rec.fh : 0;
        rec.body.position.y = yb;
        rec.body.scale.y = Math.max(0.5, h - yb);
        if (rec.body.userData.edge) { rec.body.userData.edge.position.y = yb; rec.body.userData.edge.scale.y = rec.body.scale.y; }
        if (status === 'building') rec.body.scale.y = Math.max(0.5, Math.min(h, 12));
        if (rec.body.userData.edge) rec.body.userData.edge.scale.y = rec.body.scale.y;
        rec.meshes.forEach((m) => { if (!m.userData.hoverPrev) m.material = m === rec.roof ? M.roofAdd : mat; });
        if (rec.label) rec.label.pos.y = rec.body.position.y + rec.body.scale.y + 1.5;
      });
      invalidate();
    }

    // ── public API ───────────────────────────────────────────────
    const api = {
      THREE, renderer, scene, camera, ctl, M, labels,
      invalidate,
      view, flyTo,
      setOffset,
      refreshColors,
      setChapter(ch) { state.chapter = ch; applyCtxColors(); invalidate(); },
      setScenario(id) { state.scenario = id; state.compare = false; invalidate(); },
      setCompare(left, right) { state.compare = true; state.left = left; state.right = right; invalidate(); },
      setSplit(f) { state.split = Math.min(0.98, Math.max(0.02, f)); invalidate(); },
      get state() { return state; },
      setLayers(obj) {
        Object.assign(state.layers, obj);
        Object.keys(layerG).forEach((k) => { layerG[k].visible = !!state.layers[k]; });
        siteFill.visible = !state.layers.zoning;
        applyCtxColors();
        labels.forEach((L) => { L.w = 0; });
        invalidate();
      },
      rebuildDangerous,
      rebuildUrban,
      showFloorUnits(no) { showFloorUnits(no); invalidate(); },
      highlightFloor(no) {
        urban.floors.forEach((f) => {
          if (no === null || no === undefined) f.mesh.material = f.mesh.userData.baseMat;
          else f.mesh.material = f.id === `${no}F` ? M.ghost : M.ghost;
        });
        if (no === null || no === undefined) { while (urban.unitG.children.length) urban.unitG.remove(urban.unitG.children[0]); }
        else showFloorUnits(no);
        invalidate();
      },
      highlightNewUnit(id) {
        urban.unitG.children.forEach((m) => { if (m.userData.unitId) m.material = m.userData.unitId === id ? M.hl : M.pick; });
        invalidate();
      },
      highlightOld(unitId, scen) {
        const meshes = oldMeshes[scen || 'now'];
        Object.entries(meshes).forEach(([id, m]) => { m.material = unitId && id === unitId ? M.hl : m.userData.baseMat; });
        invalidate();
      },
      urbanTop: () => urban.top,
      setSunDir(dir) { state.sunDir.set(dir[0], Math.max(0.02, dir[1]), dir[2]).normalize(); invalidate(); },
      setHeatGrid,
      makeHeatTexture,
      setHeat(which, tex) { state.heat[which] = tex; invalidate(); },
      setSim(sim) { state.sim = sim; applyCtxColors(); },
      setNight(on) { state.night = on; refreshColors(); },
      ctxRecs,
      ctxById,
      walkLabels,
      start() { refreshColors(); resize(); requestAnimationFrame(frame); },
    };
    return api;
  }

  window.SCENE = { create };
})();
