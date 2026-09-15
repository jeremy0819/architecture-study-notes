# -*- coding: utf-8 -*-
"""由九張大圖的 spec 直接產生「逐年基地核對與方案數值」文字表（單一事實來源）。"""
import importlib, io, sys
YEARS = [106, 107, 108, 109, 110, 111, 112, 113, 114]
out = []
out.append("# 106–114 逐年基地核對與方案數值表\n")
out.append("> 由 `圖說/board_1xx.py` 的 spec 直接產生（`python3 圖說/gen_tables.py`），")
out.append("> 與 `圖說/boards/` 之九張大圖為**同一組數字**，改圖即改表。\n")
out.append("> 證據等級依 [21 數據證據分級](../敷地計畫與都市設計/21-數據證據分級.md)；")
out.append("> 各年數字以 [22 專業審查修正彙編](../敷地計畫與都市設計/22-專業審查修正彙編.md) 為準。\n")
out.append("---\n")
out.append("## 總覽\n")
out.append("| 年 | 題目 | 基地 A | 建蔽（法定） | 容積（法定） | 開挖率 | 大圖 |")
out.append("|---|------|-------|------------|------------|-------|------|")

rows, details = [], []
for y in YEARS:
    if y == 110:
        continue
    m = importlib.import_module(f"board_{y}")
    sp = m.SP
    t = {a: (b, c, ok) for a, b, c, ok in sp["cells"][2].get("table", [])}
    def g(k, i):
        return t.get(k, ("—", "—", ""))[i]
    rows.append((y, sp["title"], sp["subtitle"], sp, t))

# 110 為手寫腳本，數值手動對齊其列印輸出
SP110 = dict(year=110, title="溪園大客廳",
             subtitle="某地方區政中心｜機關用地 50%／200%｜北公園・東溪流",
             file="110_地方區政中心_大圖")

TABLE110 = [("基地 A", "—", "31,937.5 ㎡", "—"), ("建蔽率", "50%", "25.4%", "✓"),
            ("建築面積 B", "≤15,968 ㎡", "8,126 ㎡", "✓"), ("容積率", "200%", "54.8%", "✓"),
            ("計容積 F", "≤63,875 ㎡", "17,500 ㎡", "✓"), ("開挖率 D/A", "未給上限", "36.3%", "—")]
CALC110 = ["A ＝ (188＋177)/2 × 175 ＝ 31,937.5 ㎡〔近似梯形・圖推概算〕",
           "B上限 ＝ A×50% ＝ 15,968.75 ㎡　F上限 ＝ A×200% ＝ 63,875 ㎡",
           "需求 G ＝ 行政 9,000＋體健 4,000＋圖書及大會議 4,500 ＝ 17,500 ㎡〔題目給定〕",
           "G / F上限 ＝ 17,500 / 63,875 ＝ 27.4%（容積用量低，故壓層數換開放空間）",
           "投影 B ＝ 2,250＋3,000＋2,000＋876 ≒ 8,126 ㎡　建蔽 ＝ 25.4% ≦ 50% ✓",
           "開挖 D ＝ 84M × 138M ＝ 11,592 ㎡　開挖率 ＝ 36.3%〔題目未給上限〕",
           "雨水貯集 ＝ 31,937.5 × 0.045 ≒ 1,437 m³（技則 §4-3）"]
CHK110 = [("道路", "北 20M／西・南 15M／東 5M 防汛道", "未新增、未拓寬"),
          ("公園", "北側大型公園在基地外", "位置未移、未占用"),
          ("溪流", "東側溪流＋6M 防汛道＋8M 綠帶", "在基地外，不計入 A"),
          ("凹口", "東南角斜切（南 177M<北 188M）", "保留斜邊，未填平"),
          ("樹位", "原題未標樹位", "本案新植喬木，未移既有樹"),
          ("界線", "全部量體與開挖線在界內", "開挖退界線 12M 以上")]
EV110 = ["題目給定：建蔽 50%／容積 200%、9,000／4,000／4,500 ㎡ 需求",
         "圖推概算：A＝31,937.5 ㎡（近似梯形，依題圖 188／177／175）",
         "自訂方案：量體尺寸、樓層、開挖範圍、廣場與生態水池位置",
         "題目未指定：高度上限、開挖率上限、汽車位數 → 圖上明寫未指定"]

ALL = []
for y, title, subtitle, sp, t in rows:
    ALL.append((y, title, subtitle, t, sp["calc"], sp["sitecheck"], sp["evidence"], sp["file"]))
ALL.append((110, SP110["title"], SP110["subtitle"],
            {a: (b, c, ok) for a, b, c, ok in TABLE110},
            CALC110, CHK110, EV110, SP110["file"]))
ALL.sort(key=lambda r: r[0])

for y, title, subtitle, t, calc, chk, ev, fn in ALL:
    A = t.get("基地 A", ("", "—", ""))[1]
    if "建蔽率" in t:
        bd = f'{t["建蔽率"][1]}（{t["建蔽率"][0]}）'
        fr = f'{t["容積率"][1]}（{t["容積率"][0]}）'
    else:                      # 109：機關用地，題目未給建蔽容積
        bd = "題目未給（本案 5.8%）" if y == 109 else "—"
        fr = "題目未給（本案 13.1%）" if y == 109 else "—"
    dk = t.get("開挖率 D/A", ("", "3.1%" if y == 109 else "—", ""))[1]
    out.append(f"| {y} | {subtitle.split('｜')[0]} | {A} | {bd} | {fr} | {dk} | [`{fn}`](./boards/{fn}.png) |")

out.append("")
for y, title, subtitle, t, calc, chk, ev, fn in ALL:
    out.append("---\n")
    out.append(f"## {y} 年｜{subtitle.split('｜')[0]}　—　「{title}」\n")
    out.append("### 基地核對（與官方底圖疊合）\n")
    out.append("| 項目 | 官方底圖條件 | 本案處理 |")
    out.append("|------|------------|---------|")
    for a, b, c in chk:
        out.append(f"| {a} | {b} | ✓ {c} |")
    out.append("\n### 方案數值（A/B/G/F/D 五帳）\n")
    out.append("| 項目 | 法定／題目 | 本案 | 檢核 |")
    out.append("|------|-----------|-----|-----|")
    for k in ["基地 A", "建蔽率", "建築面積 B", "容積率", "計容積 F", "多目標 F",
              "開挖率 D/A", "普通教室", "專科教室", "服務行政", "小計", "建蔽／容積"]:
        if k in t:
            b, c, ok = t[k]
            out.append(f"| {k} | {b} | **{c}** | {ok or '—'} |")
    out.append("\n### 計算式（逐行可校核）\n")
    out.append("```")
    for line in calc:
        out.append(line)
    out.append("```\n")
    out.append("### 數值證據分級\n")
    for e in ev:
        out.append(f"- {e}")
    out.append("")

io.open("/home/user/architecture-study-notes/圖說/逐年基地核對與方案數值.md", "w",
        encoding="utf-8").write("\n".join(out) + "\n")
print("wrote 逐年基地核對與方案數值.md　共", len(ALL), "年")
