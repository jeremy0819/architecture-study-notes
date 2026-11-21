"""Copy the housing dashboard's datasets into js/market-data.js (a dated snapshot, values unchanged).

The live dashboard stays the source of truth; this file only lets the sandbox show the same
figures offline and beside the 3D block.

Usage: python tools/build_market_snapshot.py --snapshot DIR
DIR holds the dashboard export: datasets/<id>.json (dataset documents) and files/<blob>.json (their files).
"""
import argparse
import json
import pathlib

HERE = pathlib.Path(__file__).resolve().parents[1]
DASHBOARD = "https://claude.ai/artifact/N9HnLsT8NB46aZa8f2hQm2"
IDS = ["credit_rules", "bank_exposure", "ytd_2026", "h1_2026", "q1_supply", "households",
       "renewal_rules", "renewal_subsidy", "trends", "updates"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--snapshot", required=True)
    root = pathlib.Path(ap.parse_args().snapshot)
    out = {"source": DASHBOARD, "datasets": {}}
    for ds in IDS:
        doc = json.loads((root / "datasets" / f"{ds}.json").read_text(encoding="utf-8"))
        doc = doc.get("data", doc)
        blob = doc["source"]["url"].rsplit("/", 1)[-1]
        rows = json.loads((root / "files" / f"{blob}.json").read_text(encoding="utf-8"))
        out["datasets"][ds] = {"title": doc["title"], "description": doc.get("description", ""),
                               "updated": (doc.get("updated") or {}).get("at", ""), "rows": rows}
    out["as_of"] = max(d["updated"] for d in out["datasets"].values())[:10]
    text = json.dumps(out, ensure_ascii=False, separators=(",", ":"))
    (HERE / "js/market-data.js").write_text(
        "/* 由 tools/build_market_snapshot.py 產生：房市儀表板資料快照（數值未改）。請勿手改。 */\n"
        "window.MARKET_SNAPSHOT=" + text + ";\n", encoding="utf-8")
    print(f"wrote market-data.js: {len(IDS)} datasets, as of {out['as_of']}, {len(text) // 1024} KiB")


if __name__ == "__main__":
    main()
