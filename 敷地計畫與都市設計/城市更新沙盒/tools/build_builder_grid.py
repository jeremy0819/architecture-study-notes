"""Precompute BUILDER Core results for the sandbox's demo block → js/builder-data.js.

The sandbox never recomputes these numbers: it only looks up the row that matches the sliders.
Every value comes from BUILDER Core (api.calculate, decision.decide) run here, so the browser
carries no capacity, finance, allocation or decision formula.

Usage (from this folder):
  python tools/build_builder_grid.py --builder /path/to/BUILDER

Inputs that are not Core outputs (the demo block's geometry, households, old-home value,
shop price ratio, decision inputs) are listed in meta.assumptions and shown in the page.
"""
import argparse
import datetime
import json
import math
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parents[1]
BONUS = [round(0.05 * i, 2) for i in range(11)]            # 獎勵率 0%–50%
FLOORS = list(range(6, 25))                                 # 塔樓層數（裙樓 2 層之上）
PRICE = [60, 65, 70, 75, 80, 85, 90]                        # 住宅單價（萬元／坪）
COST = [20, 22, 24, 26, 28, 30, 32]                         # 營造單價（萬元／坪，all-in）
STAGES = [("S1", "整合中"), ("S8", "審議中"), ("S10", "施工中")]
# Decision inputs: BUILDER's own illustrative values (tests/test_decision.py IMPL and OUR), not estimates for this block.
DECISION_INPUTS = {"mgmt_fee": 14700, "advance": 3000, "operating": 1200, "我方收入": 9000, "我方投入": 2500}
SHOP_RATIO = 1.6        # 店舖單價 = 住宅單價 × 1.6（沿用沙盒權變章的假設）
BALCONY, LOBBY, STAIR, ROOF = 40.0, 25.0, 24.0, 80.0         # 標準層陽台／梯廳／安全梯、屋突樓板（㎡，示範設計）


def sandbox():
    """Read the block straight from js/data.js so geometry and households have one source."""
    script = ("global.window={};require(process.argv[1]);const C=window.CITY;"
              "process.stdout.write(JSON.stringify({site:C.SITE,far:C.ZONES.res.far,urban:C.URBAN,market:C.MARKET,"
              "units:C.OLD_UNITS.map(u=>({id:u.id,bld:u.bld,label:u.label,m2:u.m2,ping:u.ping,fac:u.fac,kind:u.kind}))}))")
    out = subprocess.run(["node", "-e", script, str(HERE / "js/data.js")], check=True, capture_output=True, text=True)
    return json.loads(out.stdout)


def rect_area(r):
    return (r[2] - r[0]) * (r[3] - r[1])


def engine_for(S, bonus, tower_floors, price, cost):
    U = S["urban"]
    units = tower_floors * len(U["plan"])
    cars = units + 4
    basement = rect_area(U["basement"]["rect"])
    levels = max(2, math.ceil(cars * 40 / basement))
    podium_gross = rect_area(U["podium"]["rect"])
    floors = [{"啟用": True, "樓層": f"B{i}F", "樓板": basement, "計容積": 0.0, "梯廳": 0.0, "安全梯": 0.0, "陽台": 0.0}
              for i in range(levels, 0, -1)]
    floors += [{"啟用": True, "樓層": f["id"], "樓板": podium_gross, "計容積": float(f["fa"]), "梯廳": 0.0, "安全梯": STAIR, "陽台": 0.0}
               for f in U["podium"]["floors"]]
    floors += [{"啟用": True, "樓層": f"{i + 3}F", "樓板": float(U["tower"]["plateM2"]), "計容積": float(U["tower"]["typicalFA"]),
                "梯廳": LOBBY, "安全梯": STAIR, "陽台": BALCONY} for i in range(tower_floors)]
    floors.append({"啟用": True, "樓層": "R1F", "樓板": ROOF, "計容積": 0.0, "梯廳": 0.0, "安全梯": 0.0, "陽台": 0.0})
    owners_m2 = sum(u["m2"] for u in S["units"])
    owners = [{"owner_id": u["id"], "land_share": round(u["m2"] / owners_m2, 6), "pre_building_area_sqm": round(u["m2"], 2),
               "pre_value": round(u["ping"] * S["market"]["priceOld"] * u["fac"], 2), "consent": "unknown", "min_unit_eligible": True}
              for u in S["units"]]
    params = {
        "案件名稱": "城市更新沙盒示範街廓（虛構）", "基地面積": float(S["site"]["area"]), "人行廣場": 0.0,
        "容積率": float(S["far"]), "獎勵率": bonus, "容積移轉": 0.0, "公設比": float(U["shareRatio"]),
        "梯廳免計基準": 5, "陽台免計基準": 10, "面積表計入容積": 0.0,
        "住宅單價": float(price), "店舖坪數": float(sum(s["ping"] for s in U["shops"])), "店舖單價": round(price * SHOP_RATIO, 1),
        "車位數": cars, "車位單價": float(S["market"]["carPrice"]), "營造單價": float(cost),
        "戶數": units, "權變戶數": len(S["units"]), "土融土地成本": 0.0, "地價": 0.0,
        "財務覆寫": {"月租金每戶": float(S["market"]["rent"]), "安置月數": 60},
    }
    return {"params": params, "floors": floors, "case_type": "都更", "mode": "全案管理", "owners": owners}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--builder", required=True, help="BUILDER repository root")
    args = ap.parse_args()
    root = pathlib.Path(args.builder).resolve()
    sys.path.insert(0, str(root))
    from core.redcf import api
    from core.redcf._version import CORE_VERSION
    from core.redcf.recompute import input_hash, _analysis
    from core.redcf.decision import decide, load_stage_tree, load_decision_config

    S = sandbox()
    commit = subprocess.run(["git", "-C", str(root), "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()
    tree = load_stage_tree()
    stage_names = {s["id"]: s["name"] for s in tree["stage_tree"]}
    cfg = load_decision_config()
    dp, dc = PRICE.index(80), COST.index(24)

    # ① 容積：每個獎勵率 × 塔樓層數，Core 的容積查核
    capacity, fit = [], []
    for b in BONUS:
        rows, best = [], None
        for n in FLOORS:
            r = api.calculate(engine_for(S, b, n, PRICE[dp], COST[dc]))
            codes = [w["code"] for w in r["warnings"]]
            over = "VOLUME_EXCEEDED" in codes
            rows.append([n, round(r["baseline_far"], 1), round(r["allow_floor_area"], 1), round(r["used_floor_area"], 1),
                         round(r["remaining_floor_area"], 1), int(over)])
            if not over:
                best = n
        if best is None:
            raise SystemExit(f"no feasible tower at bonus {b}")
        capacity.append(rows)
        fit.append(best)

    # 地主分組：更新前權利價值相同的戶，Core 分配結果相同；只存每組一個值
    sample = engine_for(S, BONUS[0], fit[0], PRICE[dp], COST[dc])
    groups, gid, owner_group = [], {}, {}
    for o in sample["owners"]:
        key = o["pre_value"]
        if key not in gid:
            gid[key] = len(groups)
            groups.append({"pre_value": key, "members": []})
        groups[gid[key]]["members"].append(o["owner_id"])
        owner_group[o["owner_id"]] = gid[key]

    # ②③④：獎勵率 × 住宅單價 × 營造單價（塔樓取 Core 判定不超出的最高層數）
    fields = ["saleable_area", "efficiency_ratio", "total_sales", "shared_cost", "shared_cost_ratio",
              "owner_return_value", "owner_return_ratio", "return_rate"]
    cost_parts = ["A工程費用", "B管維費用", "C權變費用", "D貸款利息", "E稅捐", "F管理費用"]
    rows, alloc, decisions, warn, hashes, parts = [], [], [], [], [], []
    per_stage = {}
    share = None
    for bi, b in enumerate(BONUS):
        for p in PRICE:
            for c in COST:
                eng = engine_for(S, b, fit[bi], p, c)
                r = api.calculate(eng)
                _, _, _, inv = _analysis(eng)
                ih = input_hash(eng)
                rows.append([round(r[k], 4 if k.endswith("ratio") or k == "return_rate" else 1) for k in fields])
                parts.append([round(inv[k]) for k in cost_parts])
                warn.append([w["code"] for w in r["warnings"]])
                hashes.append(ih.split(":")[1][:12])
                by_owner = {a["owner_id"]: a for a in r["owner_allocations"]}
                if share is None:
                    share = {k: v["value_share"] for k, v in by_owner.items()}
                g = []
                for grp in groups:
                    vals = {round(by_owner[m]["return_value"], 2) for m in grp["members"]}
                    assert len(vals) == 1, "owners with equal pre_value must receive equal allocations"
                    g.append(round(vals.pop()))
                alloc.append(g)
                d_row = []
                for sid, _ in STAGES:
                    d = decide(r, {"stage": sid, "input_hash": ih}, dict(DECISION_INPUTS))
                    ev = d["ev"]
                    d_row.append([d["verdict"], d["breakpoint_stakeholder"] or "", ev["地主"]["nominal"], ev["地主"]["ev"]])
                    fixed = {"p": d["completion_probability"], "T": d["T_remaining_yr"],
                             "impl": [ev["實施者"]["nominal"], ev["實施者"]["ev"]], "our": [ev["我方"]["nominal"], ev["我方"]["ev"]],
                             "insufficient": d["insufficient_fields"]}
                    prev = per_stage.setdefault(sid, fixed)
                    assert prev == fixed, "implementer/our EV must not depend on the grid"
                decisions.append(d_row)

    out = {
        "meta": {
            "core_version": CORE_VERSION, "builder_commit": commit,
            "generated_at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "grid": {"bonus": BONUS, "floors": FLOORS, "price": PRICE, "cost": COST, "default": {"bonus": 10, "price": dp, "cost": dc}},
            "stages": [{"id": sid, "label": lab, "tree": tree["wf_stage_map"][sid], "tree_name": stage_names[tree["wf_stage_map"][sid]]} for sid, lab in STAGES],
            "decision_inputs": DECISION_INPUTS,
            "decision_config": {"r": cfg["r"], "g": cfg["g"], "threshold_return": cfg["threshold_return"]},
            "stage_note": tree["_note"],
            "assumptions": {
                "基地": f"基地 {S['site']['area']} ㎡、住宅區容積率 {int(S['far'] * 100)}%、容積移轉 0；都更、全案管理模式",
                "設計": f"裙樓 2 層（各計入容積 900 ㎡）＋標準層（計入 {S['urban']['tower']['typicalFA']} ㎡、樓板 {S['urban']['tower']['plateM2']} ㎡、陽台 {BALCONY:g} ㎡、梯廳 {LOBBY:g} ㎡），地下室依車位數",
                "戶數與車位": f"每層 {len(S['urban']['plan'])} 戶；車位＝戶數＋4",
                "店舖": f"店舖 {sum(s['ping'] for s in S['urban']['shops'])} 坪，單價＝住宅單價 × {SHOP_RATIO}",
                "更新前價值": f"每戶坪數 × 舊屋單價 {S['market']['priceOld']} 萬／坪 × 樓層效用（沙盒示範假設）",
                "安置": f"租金補貼 {S['market']['rent']} 萬／月 × 60 個月；其餘費率沿用 Core 預設",
                "決策輸入": "實施者與我方收支沿用 BUILDER 決策引擎測試的示意值，不是本案估算",
            },
        },
        "fields": fields, "cost_parts": cost_parts, "fit": fit,
        "capacity_fields": ["floors", "baseline_far", "allow_floor_area", "used_floor_area", "remaining_floor_area", "volume_exceeded"],
        "capacity": capacity,
        "rows": rows, "parts": parts, "warnings": warn, "hash": hashes,
        "owners": {"groups": [{"pre_value": round(g["pre_value"]), "members": g["members"]} for g in groups],
                   "pre_value_total": round(sum(o["pre_value"] for o in sample["owners"])),
                   "value_share": share},
        "alloc": alloc, "decision": decisions, "stage_fixed": per_stage,
    }
    text = json.dumps(out, ensure_ascii=False, separators=(",", ":"))
    target = HERE / "js/builder-data.js"
    target.write_text("/* 由 tools/build_builder_grid.py 產生：BUILDER Core " + CORE_VERSION + "（" + commit + "）預先試算結果。請勿手改。 */\n"
                      "window.BUILDER_GRID=" + text + ";\n", encoding="utf-8")
    print(f"wrote {target.name}: {len(rows)} combinations, {len(text) // 1024} KiB, fit floors {fit}")


if __name__ == "__main__":
    main()
