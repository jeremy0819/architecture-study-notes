# -*- coding: utf-8 -*-
"""依 110 年校正版之同一標準，批次產生各年考場大圖。
版面／字級／欄寬全部沿用 board_engine；每年僅提供
  ① 基地幾何與量體（公尺）  ② 平面上的年度專屬圖元 draw_plan()
  ③ 左欄四格文字  ④ 中欄兩張剖立面與局部透視  ⑤ 右欄申論與各檢核表
生成端不得改寫基地條件：道路寬、公園位置、樹位、凹口一律由 spec 給定。
"""
from board_engine import *

# ---------------- 左欄四格通用小圖 ----------------
def dia_site(s, x, y, w, h, sp):
    """① 基地與周邊關係示意（依 spec 的 minisite）"""
    m = sp.get("minisite")
    if not m: return
    bw, bh = w-46, h-26
    bx, by = x+23, y+8
    s.poly([(bx+bw*a, by+bh*b) for a, b in m["poly"]],
           fill="#ffffff", stroke=INK, stroke_width=0.7)
    for side, lab, col in m["edges"]:
        if side == "N":  s.txt(bx+bw/2, by-2.5, lab, 2.5, col, "middle")
        if side == "S":  s.txt(bx+bw/2, by+bh+4.5, lab, 2.5, col, "middle")
        if side == "W":  s.txt(bx-2.5, by+bh/2, lab, 2.5, col, "middle", rot=-90)
        if side == "E":  s.txt(bx+bw+2.5, by+bh/2, lab, 2.5, col, "middle", rot=-90)
    for a, b, lab, col in m.get("marks", []):
        s.circ(bx+bw*a, by+bh*b, 1.6, fill=col, opacity=0.35)
        s.txt(bx+bw*a, by+bh*b+0.9, lab, 2.3, col, "middle", "bold")
    s.txt(bx+bw/2, by+bh/2, "基地", 4.0, INK, "middle", "bold")
    north(s, x+w-7, y+9, 4.2, m.get("north_rot", 0))

def dia_hero(s, x, y, w, h, sp):
    """② 英雄條件泡泡圖"""
    b = sp.get("bubbles")
    if not b: return
    cx, cy = x+w*0.42, y+h*0.52
    for (ax, ay, r, lab, col) in b["out"]:
        s.circ(cx+ax, cy+ay, r, fill=col, opacity=0.22)
        s.circ(cx+ax, cy+ay, r, fill="none", stroke=col, stroke_width=0.35)
        s.txt(cx+ax, cy+ay+1.0, lab, 2.7, col, "middle", "bold")
        s.line(cx, cy, cx+ax, cy+ay, stroke=GREY, stroke_width=0.3)
    s.circ(cx, cy, b["r"], fill="url(#plaza)", opacity=0.6)
    s.circ(cx, cy, b["r"], fill="none", stroke=TAN, stroke_width=0.45)
    s.txt(cx, cy-0.4, b["core"], 3.0, "#8a6a1f", "middle", "bold")
    s.txt(cx, cy+3.4, b["core2"], 2.3, "#8a6a1f", "middle")
    s.txt(x, y+h-1.5, b.get("note", ""), 2.3, "#888")

def dia_mass(s, x, y, w, h, sp):
    """③ 疊層軸測示意"""
    m = sp.get("axon")
    if not m: return
    ox, oy = x+w*0.30, y+h*0.60
    dx, dy = 13.0, -6.5
    for i, (lab, bw_, bh_, lift, col) in enumerate(m):
        yy = oy - lift
        pts = [(ox, yy), (ox+bw_, yy), (ox+bw_+dx, yy+dy), (ox+dx, yy+dy)]
        s.poly(pts, fill=col, stroke=INK, stroke_width=0.4)
        s.rect(ox, yy, bw_, bh_, fill=col, stroke=INK, stroke_width=0.4)
        s.poly([(ox+bw_, yy), (ox+bw_+dx, yy+dy), (ox+bw_+dx, yy+dy+bh_), (ox+bw_, yy+bh_)],
               fill="#00000012", stroke=INK, stroke_width=0.4)
        s.txt(ox+bw_+dx+2, yy+bh_*0.7, lab, 2.5, "#444")

def dia_flow(s, x, y, w, h, sp):
    """④ 動線示意：基地形狀＋量體＋出入口箭頭＋圖例"""
    fl = sp.get("flow")
    if not fl: return
    sx, sy = x+24, y+3
    sw, sh = w-48, h-30
    s.poly([(sx+sw*a, sy+sh*b) for a, b in fl["poly"]],
           fill="#fafaf8", stroke=INK, stroke_width=0.6)
    for bx, by, bw_, bh_, lb in fl.get("blocks", []):
        s.rect(sx+sw*bx, sy+sh*by, sw*bw_, sh*bh_, fill="#ece9e3", stroke=GREY, stroke_width=0.3)
        s.txt(sx+sw*(bx+bw_/2), sy+sh*(by+bh_/2)+1, lb, 2.3, "#555", "middle")
    for pl in fl.get("open", []):
        s.poly([(sx+sw*a, sy+sh*b) for a, b in pl["poly"]],
               fill="url(#%s)" % pl.get("pat", "plaza"), opacity=0.55,
               stroke=pl.get("col", TAN), stroke_width=0.3)
        s.txt(sx+sw*pl["at"][0], sy+sh*pl["at"][1], pl["lab"], 2.5, pl.get("col", "#8a6a1f"), "middle", "bold")
    def ar(x1, y1, x2, y2, c, lb, ax, ay, an="start"):
        s.raw(f'<path d="M {x1:.1f} {y1:.1f} L {x2:.1f} {y2:.1f}" stroke="{c}" stroke-width="1.1" '
              f'fill="none" color="{c}" marker-end="url(#ar2)"/>')
        s.txt(ax, ay, lb, 2.25, c, an)
    for side, t, lb, col in fl.get("arrows", []):
        if side == "N": ar(sx+sw*t, sy-11, sx+sw*t, sy-1.5, col, lb, sx+sw*t, sy-12.5, "middle")
        if side == "S": ar(sx+sw*t, sy+sh+11, sx+sw*t, sy+sh+1.5, col, lb, sx+sw*t, sy+sh+13.5, "middle")
        if side == "W": ar(sx-11, sy+sh*t, sx-1.5, sy+sh*t, col, lb, x+1, sy+sh*t-2.0)
        if side == "E": ar(sx+sw+11, sy+sh*t, sx+sw*0.99, sy+sh*t, col, lb, x+w-1, sy+sh*t-2.0, "end")
    lx, ly = x+2, y+h-11
    for i, (c, t) in enumerate(fl.get("legend", [])):
        s.line(lx+i*40, ly, lx+i*40+6, ly, stroke=c, stroke_width=1.1)
        s.txt(lx+i*40+8, ly+1.1, t, 2.4, "#444")
    s.txt(lx, ly+5.6, fl.get("note", ""), 2.4, "#666")

DIA = {"site": dia_site, "hero": dia_hero, "mass": dia_mass, "flow": dia_flow}

# ---------------- 剖立面 ----------------
def section(s, box, label, segs, floors, note, ctx=None, below=None):
    """segs=[(名稱,寬m)]  floors=[(起點m,寬m,層數,每層高mm,名稱)]
       ctx=[(起點m,寬m,高mm,標籤)]  below=[(起點m,寬m,深mm,標籤,色)]"""
    bx, by, bw, bh = box
    total = sum(w for _, w in segs)
    k = (bw-6)/total
    s.txt(bx+2, by+3.4, label, 4.4, INK, weight="bold")
    gy = by+bh-13
    maxh = max([fl*he for _, _, fl, he, _ in floors]+[h for *_, h, _ in (ctx or [])]+[10])
    band = gy - maxh - 9
    x = bx+3
    for nm, w in segs:
        s.line(x, band, x, band+3.4, stroke=GREY, stroke_width=0.25)
        s.txt(x+w*k/2, band+2.6, f"{nm} {w}M" if w else nm, 2.25, "#555", "middle")
        x += w*k
    s.line(bx+3, band+3.4, bx+bw-3, band+3.4, stroke=GREY, stroke_width=0.25)
    for x0, w, hh, lab in (ctx or []):
        px = bx+3+x0*k
        s.rect(px, gy-hh, w*k, hh, fill="#f2f0ec", stroke=GREY, stroke_width=0.3)
        s.txt(px+w*k/2, gy-hh-1.6, lab, 2.3, "#888", "middle")
    s.line(bx+3, gy, bx+bw-3, gy, stroke=INK, stroke_width=0.8)
    for x0, w, dep, lab, col in (below or []):
        px = bx+3+x0*k
        s.rect(px, gy, w*k, dep, fill=col, stroke=INK if col != "url(#water)" else BLUE,
               stroke_width=0.45, stroke_dasharray="2 1.2" if col == "#f7f7f5" else "none")
        s.txt(px+w*k/2, gy+dep-1.6, lab, 2.3, "#555", "middle")
    for x0, w, fl, he, nm in floors:
        px = bx+3+x0*k; pw = w*k
        for i in range(fl):
            yy = gy-(i+1)*he
            s.rect(px, yy, pw, he, fill="#fff", stroke=INK, stroke_width=0.45)
            s.txt(px+1.4, yy+he-1.7, f"{i+1}F", 2.2, "#999")
        s.txt(px+pw/2, gy-fl*he-2.4, nm, 3.0, INK, "middle", "bold")
        s.txt(px+pw+0.9, gy-fl*he+2.6, f"{fl}F", 2.5, RED, weight="bold")
    s.txt(bx+3, by+bh-2.5, note, 2.35, "#555")

def perspective(s, box, sp):
    """局部透視：地面線＋量體剪影＋喬木＋人物＋說明"""
    p = sp.get("persp")
    if not p: return
    bx, by, bw, bh = box
    s.txt(bx+2, by-2, "局部透視　"+p["title"], 5.0, INK, weight="bold")
    s.rect(bx, by+2, bw, bh-2, fill="#fff", stroke=GREY, stroke_width=0.35)
    gy = by+bh-16
    s.line(bx+4, gy, bx+bw-4, gy, stroke=INK, stroke_width=0.5)
    for t0, t1, hh, lab in p.get("mass", []):
        x0, x1 = bx+4+(bw-8)*t0, bx+4+(bw-8)*t1
        s.rect(x0, gy-hh, x1-x0, hh, fill="#f1eef6", stroke=INK, stroke_width=0.5)
        s.txt((x0+x1)/2, gy-hh-1.8, lab, 2.6, "#555", "middle")
    for t in p.get("trees", []):
        px = bx+4+(bw-8)*t
        s.line(px, gy, px, gy-7, stroke="#6f9b5c", stroke_width=0.5)
        s.circ(px, gy-10.5, 4.2, fill="url(#tree)", stroke="#6f9b5c", stroke_width=0.25)
    for t in p.get("people", []):
        px = bx+4+(bw-8)*t
        s.circ(px, gy-5.4, 0.85, fill=INK)
        s.line(px, gy-4.6, px, gy-1.6, stroke=INK, stroke_width=0.55)
        s.line(px-1.3, gy, px, gy-1.6, stroke=INK, stroke_width=0.45)
        s.line(px+1.3, gy, px, gy-1.6, stroke=INK, stroke_width=0.45)
    if p.get("water"):
        t0, t1 = p["water"]
        s.path(f'M {bx+4+(bw-8)*t0:.1f} {gy+4:.1f} q 6,-2.4 12,0 t 12,0 t 12,0 t 12,0 t 12,0',
               fill="none", stroke=BLUE, stroke_width=0.5)
        s.txt(bx+4+(bw-8)*t1, gy+2, p.get("water_lab", ""), 2.4, BLUE, "end")
    for i, t in enumerate(p.get("caption", [])):
        s.txt(bx+2, by+bh+3.4+i*4.0, t, 2.6, "#444")

# ---------------- 右欄 ----------------
def right_column(s, sp):
    ry = TOP+32
    E = sp["essay"]
    s.rect(R_X+2, ry, R_W-4, 8, fill="#2c3e50")
    s.txt(R_X+5, ry+5.8, "申論題（30 分）", 4.2, "#fff", weight="bold")
    ry += 12
    for i, t in enumerate(E["q"]):
        s.txt(R_X+4, ry+i*4, t, 2.8, "#333")
    ry += len(E["q"])*4 + 3
    for sec in E["sections"]:
        s.txt(R_X+4, ry, sec["h"], 3.6, INK, weight="bold"); ry += 5.5
        for item in sec.get("rows", []):
            a, b, c = item
            s.rect(R_X+4, ry, 16, 9.5, fill="#eef2f6", stroke=GREY, stroke_width=0.25)
            s.txt(R_X+12, ry+6, a, 2.9, INK, "middle", "bold")
            s.txt(R_X+22, ry+4, b, 2.5, "#333")
            s.txt(R_X+22, ry+8, c, 2.35, "#777")
            ry += 10.5
        for t in sec.get("lines", []):
            s.txt(R_X+4, ry+1.4, t, 2.7, "#333"); ry += 4.1
        if sec.get("box"):
            bl = sec["box"]
            s.rect(R_X+4, ry+1, R_W-8, 4.4+len(bl["t"])*4.0, fill=bl.get("bg", "#eef5ea"),
                   stroke=bl.get("st", GREEN), stroke_width=0.3)
            for i, t in enumerate(bl["t"]):
                s.txt(R_X+6, ry+5.6+i*4.0, t, 2.5, bl.get("st", GREEN), weight="bold")
            ry += 7.4+len(bl["t"])*4.0
        ry += 2
    ry += 2

    def head(t):
        nonlocal ry
        s.rect(R_X+2, ry, R_W-4, 7.5, fill="#2c3e50")
        s.txt(R_X+5, ry+5.4, t, 3.6, "#fff", weight="bold"); ry += 9.5

    head("本年官方圖說要求｜逐項打勾")
    for a, b in sp["shuoming"]:
        s.rect(R_X+4, ry, R_W-8, 8.6, fill="#f7f9fb", stroke=GREY, stroke_width=0.25)
        s.txt(R_X+6.5, ry+3.8, a, 2.8, INK, weight="bold")
        s.txt(R_X+6.5, ry+7.4, b, 2.4, "#666")
        s.txt(R_X+R_W-8, ry+5.8, "✓", 4.0, GREEN, "end", "bold")
        ry += 9.6
    ry += 3

    ev = sp["evidence"]
    s.rect(R_X+4, ry, R_W-8, 7.2+len(ev)*4.2, fill="#fdf7e8", stroke=TAN, stroke_width=0.35)
    s.txt(R_X+6.5, ry+4.6, "數值證據分級（本張圖）", 3.0, "#8a6a1f", weight="bold")
    for i, t in enumerate(ev):
        s.txt(R_X+6.5, ry+9.6+i*4.2, t, 2.35, "#6b5a2a")
    ry += 11.4+len(ev)*4.2

    s.rect(R_X+4, ry, R_W-8, 13.5, fill="#fbeaea", stroke=RED, stroke_width=0.35)
    s.txt(R_X+6.5, ry+4.6, "交卷前：圖名・比例尺・指北・剖面樓高數字、", 2.6, RED, weight="bold")
    s.txt(R_X+6.5, ry+8.4, "透視有人物、每條算式數字與圖上一致、", 2.6, RED, weight="bold")
    s.txt(R_X+6.5, ry+12.2, "題目點名條件逐條指得出位置。", 2.6, RED, weight="bold")
    ry += 17

    head("法規檢核｜法源→本案落點")
    cw = [52, 72, R_W-8-52-72]
    s.rect(R_X+4, ry, R_W-8, 6, fill="#e8ecf0", stroke=GREY, stroke_width=0.25)
    for i, hh in enumerate(["法源（簡稱）", "要求", "本案落點"]):
        s.txt(R_X+6+sum(cw[:i]), ry+4.2, hh, 2.6, INK, weight="bold")
    ry += 6
    for a, b, c in sp["laws"]:
        s.rect(R_X+4, ry, R_W-8, 7.2, fill="#ffffff", stroke=LGREY, stroke_width=0.22)
        s.txt(R_X+6, ry+4.9, a, 2.5, BLUE, weight="bold")
        s.txt(R_X+6+cw[0], ry+4.9, b, 2.4, "#333")
        s.txt(R_X+6+cw[0]+cw[1], ry+4.9, c, 2.4, "#333")
        ry += 7.2
    s.txt(R_X+4, ry+3.6, "※ 條號僅供本庫查核；考場圖上寫簡稱即可，不背條號。", 2.4, "#888")
    ry += 9

    head("課題→對策→效益（三行原則）")
    for a, b, c in sp["probs"]:
        s.rect(R_X+4, ry, R_W-8, 12.6, fill="#f7f9fb", stroke=GREY, stroke_width=0.22)
        s.txt(R_X+6, ry+4.2, "課題｜"+a, 2.5, RED, weight="bold")
        s.txt(R_X+6, ry+8.0, "對策｜"+b, 2.4, "#333")
        s.txt(R_X+6, ry+11.6, "效益｜"+c, 2.4, GREEN)
        ry += 13.4
    ry += 3

    head("基地核對｜與官方底圖疊合")
    for a, b, c in sp["sitecheck"]:
        s.rect(R_X+4, ry, R_W-8, 7.2, fill="#ffffff", stroke=LGREY, stroke_width=0.22)
        s.txt(R_X+6, ry+4.9, a, 2.5, INK, weight="bold")
        s.txt(R_X+22, ry+4.9, b, 2.4, "#333")
        s.txt(R_X+R_W-8, ry+4.9, "✓ "+c, 2.4, GREEN, "end")
        ry += 7.2
    ry += 4

    cc = sp["calc"]
    s.rect(R_X+4, ry, R_W-8, 11.4+len(cc)*4.4, fill="#f4f6f8", stroke=GREY, stroke_width=0.3)
    s.txt(R_X+6.5, ry+4.8, "量體計算式（逐行可校核）", 3.0, INK, weight="bold")
    for i, t in enumerate(cc):
        s.txt(R_X+6.5, ry+10.2+i*4.4, t, 2.4, "#333")
    ry += 15.4+len(cc)*4.4
    s.txt(R_X+4, H-M-3, sp["footer"], 2.4, "#999")
    return ry

# ---------------- 主流程 ----------------
def build(sp, draw_plan):
    s = SVG()
    s.raw('<defs><marker id="ar2" markerWidth="5" markerHeight="5" refX="4.2" refY="2.5" '
          'orient="auto"><path d="M0,0 L5,2.5 L0,5 z" fill="currentColor"/></marker></defs>')
    frame(s, sp["year"], sp["title"], sp["subtitle"])

    # 左欄
    for i, c in enumerate(sp["cells"]):
        bx, by, bw, bh = cell(s, i, c["head"])
        yy = by
        for t in c.get("lines", []):
            col = RED if t.startswith("⚠") or t.startswith("△") else ("#333" if not t.startswith("　") else "#555")
            s.txt(bx, yy, t, 2.7, col); yy += 3.9
        if c.get("table"):
            yy = _small_table(s, bx, yy+2, bw, c["table"]) + 2
        for t in c.get("lines2", []):
            s.txt(bx, yy, t, 2.7, RED if t.startswith("⚠") else "#333"); yy += 3.9
        if c.get("dia"):
            DIA[c["dia"]](s, bx-1, yy+1, bw+2, by+bh-yy-2, sp)

    # 中欄 上：主配置
    PLAN_BOX = (C_X+2, TOP+2, C_W-4, sp.get("plan_h", 316))
    f = Fit(PLAN_BOX, sp["ext"])
    draw_plan(s, f, sp)
    north(s, *sp["north_at"](f), 5, sp.get("north_rot", 0))
    s.txt(C_X+4, TOP+sp.get("plan_h", 316)-4, sp["plan_title"], 6.0, INK, weight="bold")
    scalebar(s, f, C_X+C_W-108, TOP+sp.get("plan_h", 316)-16, sp.get("bar_seg"), maxw=100.0)

    # 中欄 下：剖面＋透視
    SEC_Y = TOP+sp.get("plan_h", 316)+10
    s.line(C_X+2, SEC_Y-5, C_X+C_W-2, SEC_Y-5, stroke=GREY, stroke_width=0.3)
    y = SEC_Y
    for sec in sp["sections"]:
        box = (C_X+2, y, C_W-4, sec["h"])
        section(s, box, sec["label"], sec["segs"], sec["floors"], sec["note"],
                sec.get("ctx"), sec.get("below"))
        for fn in sec.get("extra", []):
            fn(s, box)
        y += sec["h"]+8
    perspective(s, (C_X+2, y+4, C_W-4, H-M-y-22), sp)

    right_column(s, sp)
    out = f'/home/user/architecture-study-notes/圖說/boards/{sp["file"]}'
    s.save(out+".svg")
    return out

def _small_table(s, x, y, w, rows):
    s.rect(x, y, w, 5.0, fill="#e8ecf0", stroke=GREY, stroke_width=0.25)
    cols = [0.02, 0.44, 0.70, 0.94]
    for i, hh in enumerate(["項目", "法定", "本案", ""]):
        s.txt(x+w*cols[i], y+3.6, hh, 2.5, INK, weight="bold")
    y += 5.0
    for a, b, c, ok in rows:
        s.rect(x, y, w, 4.8, fill="#fff", stroke=LGREY, stroke_width=0.2)
        s.txt(x+w*cols[0], y+3.4, a, 2.5, "#333")
        s.txt(x+w*cols[1], y+3.4, b, 2.4, "#666")
        s.txt(x+w*cols[2], y+3.4, c, 2.5, INK, weight="bold")
        s.txt(x+w*cols[3], y+3.4, ok, 2.9, GREEN if ok == "✓" else RED, weight="bold")
        y += 4.8
    return y
