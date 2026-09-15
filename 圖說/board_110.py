# -*- coding: utf-8 -*-
"""110 年 某地方區政中心｜考場大圖（校正版）
基地：近梯形 北188 / 南177 / 深175 → A≈31,937.5㎡〔圖推概算〕
英雄條件：東北第一象限留主要公共開放空間；量體往西、南組織，接北公園與東溪。
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from board_engine import *


# ---------- 左欄小圖 ----------
def dia_site(s, x, y, w, h):
    """①基地與四鄰示意"""
    cx, cy = x+w/2, y+h/2
    sw, sh = w*0.52, h*0.60
    s.rect(cx-sw/2-6, cy-sh/2-5, sw+12, sh+10, fill=LGREY)
    s.poly([(cx-sw/2,cy-sh/2),(cx+sw/2,cy-sh/2),(cx+sw/2-3,cy+sh/2),(cx-sw/2,cy+sh/2)],
           fill="#fff", stroke=INK, stroke_width=0.6)
    s.rect(cx-sw/2+2, cy-sh/2-11, sw-6, 5, fill="url(#tree)", stroke=GREEN, stroke_width=0.3)
    s.txt(cx, cy-sh/2-12.6, "大型公園", 2.3, GREEN, "middle")
    s.rect(cx+sw/2+2, cy-sh/2-5, 3.4, sh+10, fill="url(#water)", stroke=BLUE, stroke_width=0.3)
    s.txt(cx, cy-sh/2+5.5, "北 20M", 2.2, "#555", "middle")
    s.txt(cx-sw/2-3, cy, "西15M", 2.2, "#555", "middle", rot=-90)
    s.txt(cx+sw/2-6, cy, "東5M防汛", 2.2, RED, "middle", rot=-90)
    s.txt(cx, cy+sh/2-2, "南 15M", 2.2, "#555", "middle")
    s.txt(cx, cy+2, "基地", 3.0, INK, "middle", "bold")

def dia_hero(s, x, y, w, h):
    """②英雄條件泡泡圖"""
    cx, cy = x+w/2, y+h/2
    s.circ(cx-16, cy-10, 9, fill="#dcead2", stroke=GREEN, stroke_width=0.4)
    s.txt(cx-16, cy-9, "北公園", 2.4, GREEN, "middle", "bold")
    s.circ(cx+17, cy-6, 8, fill="#dbeaf5", stroke=BLUE, stroke_width=0.4)
    s.txt(cx+17, cy-5, "東溪流", 2.4, BLUE, "middle", "bold")
    s.circ(cx, cy+12, 12, fill="url(#plaza)", stroke=TAN, stroke_width=0.5)
    s.txt(cx, cy+11, "市民廣場", 2.6, "#8a6a1f", "middle", "bold")
    s.txt(cx, cy+15.5, "東北象限", 2.2, "#8a6a1f", "middle")
    s.line(cx-13, cy-3, cx-4, cy+4, stroke=GREEN, stroke_width=0.8)
    s.line(cx+12, cy+1, cx+5, cy+5, stroke=BLUE, stroke_width=0.8)
    s.rect(cx-30, cy+2, 11, 16, fill="#e6dced", stroke=INK, stroke_width=0.35)
    s.txt(cx-24.5, cy+11, "量體", 2.3, "#555", "middle", rot=-90)

def dia_mass(s, x, y, w, h):
    """③量體軸測"""
    bx, by_ = x+w*0.16, y+h*0.74
    def iso(px,py,pw,ph,hh,fill):
        pts=[(px,py),(px+pw,py-pw*0.34),(px+pw+ph*0.62,py-pw*0.34+ph*0.30),(px+ph*0.62,py+ph*0.30)]
        s.poly([(a,b-hh) for a,b in pts], fill=fill, stroke=INK, stroke_width=0.35)
        s.poly([pts[0],pts[3],(pts[3][0],pts[3][1]-hh),(pts[0][0],pts[0][1]-hh)],
               fill="#00000012", stroke=INK, stroke_width=0.3)
        s.poly([pts[3],pts[2],(pts[2][0],pts[2][1]-hh),(pts[3][0],pts[3][1]-hh)],
               fill="#0000001f", stroke=INK, stroke_width=0.3)
    iso(bx, by_-16, 22, 12, 9, "#f2e4c9")
    iso(bx-2, by_-2, 24, 14, 13, "#e6dced")
    iso(bx+2, by_+14, 21, 11, 8, "#d6e6f2")
    s.txt(bx+34, by_-22, "圖書館＋大會議室 2F", 2.3, "#555")
    s.txt(bx+36, by_-6, "行政中心 3F", 2.3, "#555")
    s.txt(bx+34, by_+12, "體健中心 2F・挑高", 2.3, "#555")

def dia_flow(s, x, y, w, h):
    """④ 動線示意：基地形狀＋三量體＋四向出入口＋圖例"""
    # 基地輪廓（近梯形，東界斜切）
    sx, sy = x+22, y+3
    sw, sh = w-44, h-30
    pts = [(sx,sy),(sx+sw,sy),(sx+sw*0.94,sy+sh),(sx,sy+sh)]
    s.poly(pts, fill="#fafaf8", stroke=INK, stroke_width=0.6)
    # 三量體（對應主配置的相對位置）
    for bx,by,bw,bh,lb in [(0.06,0.10,0.40,0.17,"圖書"),(0.04,0.35,0.40,0.23,"行政"),
                           (0.06,0.67,0.38,0.17,"體健")]:
        s.rect(sx+sw*bx, sy+sh*by, sw*bw, sh*bh, fill="#ece9e3", stroke=GREY, stroke_width=0.3)
        s.txt(sx+sw*(bx+bw/2), sy+sh*(by+bh/2)+1, lb, 2.3, "#555", "middle")
    # 市民廣場（東北）
    s.raw(f'<path d="M {sx+sw*0.58:.1f} {sy:.1f} H {sx+sw:.1f} L {sx+sw*0.955:.1f} {sy+sh*0.56:.1f} '
          f'H {sx+sw*0.58:.1f} Z" fill="url(#plaza)" opacity="0.55" stroke="{TAN}" stroke-width="0.3"/>')
    s.txt(sx+sw*0.78, sy+sh*0.30, "市民廣場", 2.5, "#8a6a1f", "middle", "bold")
    # 出入口箭頭
    def ar(x1,y1,x2,y2,c,lb,ax,ay,an="start"):
        s.raw(f'<path d="M {x1:.1f} {y1:.1f} L {x2:.1f} {y2:.1f}" stroke="{c}" stroke-width="1.1" '
              f'fill="none" color="{c}" marker-end="url(#ar2)"/>')
        s.txt(ax, ay, lb, 2.25, c, an)
    ar(sx+sw*0.78, sy-11, sx+sw*0.78, sy-1.5, RED, "主人行（北公園）", sx+sw*0.80, sy-12.5, "middle")
    ar(sx-11, sy+sh*0.46, sx-1.5, sy+sh*0.46, BLUE, "車行・卸貨（西 15M）", x+1, sy+sh*0.46-2.2)
    ar(sx-11, sy+sh*0.52, sx-1.5, sy+sh*0.52, "#7a5ea8", "地下停車入口", x+1, sy+sh*0.52+3.4)
    ar(sx+sw+11, sy+sh*0.34, sx+sw*0.97, sy+sh*0.34, GREEN, "人行自行車", x+w-1, sy+sh*0.34-2.2, "end")
    ar(sx+sw*0.22, sy+sh+11, sx+sw*0.22, sy+sh+1.5, "#777", "服務・清潔（南 15M）", sx+sw*0.24, sy+sh+13.5, "middle")
    # 圖例
    lx, ly = x+2, y+h-11
    for i,(c,t) in enumerate([(RED,"人行"),(BLUE,"車行"),("#7a5ea8","地下車道"),(GREEN,"自行車")]):
        s.line(lx+i*40, ly, lx+i*40+6, ly, stroke=c, stroke_width=1.1)
        s.txt(lx+i*40+8, ly+1.1, t, 2.4, "#444")
    s.txt(lx, ly+5.6, "人車分道：車行僅西側進出，北側廣場面全步行；防災時廣場為集結地。", 2.4, "#666")


s = SVG()
s.raw('<defs><marker id="ar2" markerWidth="5" markerHeight="5" refX="4.2" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 z" fill="currentColor"/></marker></defs>')
frame(s, 110, "溪園大客廳", "某地方區政中心｜開放透明・服務 8 萬人口・都市大客廳")

# ============ 基地幾何（公尺） ============
N,S_,D = 188.0, 177.0, 175.0
SITE = [(0,0),(N,0),(S_,D),(0,D)]           # 近梯形：東界由 (188,0)→(177,175)
A = (N+S_)/2*D
def east_x(y): return N + (S_-N)*(y/D)

# 量體（投影 ≈8,100㎡ → 建蔽 25.4%）
BLK = [
 ("圖書館＋大會議室","4,500㎡ / 2F", 20,18, 75,30, "#f2e4c9"),
 ("行政中心",        "9,000㎡ / 3F", 15,62, 75,40, "#e6dced"),
 ("體健中心",        "4,000㎡ / 2F・挑高", 20,118, 70,29, "#d6e6f2"),
 ("入口大廳・連廊",  "約 850㎡ / 1–2F", 92,48, 18,47, "#ece9e3"),
]
FOOT = sum(w*h for *_ ,x,y,w,h,c in [(a,b,x,y,w,h,c) for a,b,x,y,w,h,c in BLK])

# ============ 中欄：主配置圖 ============
PLAN_BOX = (C_X+2, TOP+2, C_W-4, 316)
EXT = (-46, -40, N+34, D+34)                  # 含周邊 context
f = Fit(PLAN_BOX, EXT)

s.rect(*PLAN_BOX, fill="none", stroke="none")
# 周邊道路
s.rect(f.X(-20), f.Y(-20), f.L(N+40), f.L(20), fill=LGREY)          # 北 20M
s.rect(f.X(-15), f.Y(-20), f.L(15), f.L(D+40), fill=LGREY)          # 西 15M
s.rect(f.X(-15), f.Y(D), f.L(N+35), f.L(15), fill=LGREY)            # 南 15M
s.poly(f.P([(N,0),(N+5,0),(S_+5,D),(S_,D)]), fill="#efeae0", stroke=GREY, stroke_width=0.25)  # 東 5M 防汛道
s.poly(f.P([(N+5,0),(N+13,0),(S_+13,D),(S_+5,D)]), fill="#dcead2", stroke="#6f9b5c", stroke_width=0.25) # 8M 綠帶
s.poly(f.P([(N+13,0),(N+19,0),(S_+19,D),(S_+13,D)]), fill="url(#water)", stroke=BLUE, stroke_width=0.4) # 溝寬6M

s.txt(f.X(N/2), f.Y(-12), "北側 20 M 聯外道路（設 3 M 人行道・服務水準 B）", 3.0, "#555", "middle")
s.txt(f.X(-7.5), f.Y(D/2), "西側 15 M 社區巷道（無人行道）", 2.8, "#555", "middle", rot=-90)
s.txt(f.X(N/2), f.Y(D+9), "南側 15 M 社區巷道（無人行道）", 2.8, "#555", "middle")
s.txt(f.X(N+2.5), f.Y(D*0.62), "東側 5 M 防汛道路", 2.6, RED, "middle", rot=-88)
s.txt(f.X(N+9), f.Y(D*0.62), "8 M 綠帶", 2.6, GREEN, "middle", rot=-88)
s.txt(f.X(N+16), f.Y(D*0.62), "小溪流 溝寬6M・深3M", 2.6, BLUE, "middle", rot=-88)

# 北側大型公園（基地外）
s.rect(f.X(28), f.Y(-38), f.L(120), f.L(18), fill="url(#tree)", stroke=GREEN, stroke_width=0.4)
s.txt(f.X(88), f.Y(-31), "大型公園（基地外・使用強度高）", 3.2, GREEN, "middle", "bold")
s.txt(f.X(88), f.Y(-25.5), "隔 20 M 道路・借景不計入基地面積", 2.5, RED, "middle")

# 基地界線
s.poly(f.P(SITE), fill="#ffffff", stroke=INK, stroke_width=0.9)
s.txt(f.X(2), f.Y(-3), "基地界線　北 188 M／南 177 M／深 175 M", 3.0, INK, weight="bold")
s.txt(f.X(2), f.Y(-7.5), "A＝(188＋177)/2×175 ≒ 31,937.5 ㎡〔近似梯形・圖推概算〕", 2.6, "#555")

# 東北第一象限：主要公共開放空間
s.poly(f.P([(112,0),(188,0),(180,96),(112,96)]), fill="url(#plaza)", opacity=0.55,
       stroke=TAN, stroke_width=0.4)
s.txt(f.X(148), f.Y(40), "市民廣場", 5.2, "#8a6a1f", "middle", "bold")
s.txt(f.X(148), f.Y(47), "東北第一象限｜北接公園・東接溪岸", 2.8, "#8a6a1f", "middle")
s.txt(f.X(148), f.Y(52.5), "地震臨時避難場所（災防法精神）", 2.5, "#8a6a1f", "middle")

# 生態水池（滯洪）
s.raw(f'<ellipse cx="{f.X(150):.2f}" cy="{f.Y(124):.2f}" rx="{f.L(26):.2f}" ry="{f.L(16):.2f}" '
      f'fill="url(#water)" stroke="{BLUE}" stroke-width="0.4"/>')
s.txt(f.X(150), f.Y(124), "生態水池", 3.2, BLUE, "middle", "bold")
s.txt(f.X(150), f.Y(129), "有效容積・控制出流・維護路徑", 2.3, BLUE, "middle")

# 量體
for name, spec, x,y,w,h, col in BLK:
    s.rect(f.X(x), f.Y(y), f.L(w), f.L(h), fill=col, stroke=INK, stroke_width=0.6)
    s.txt(f.X(x+w/2), f.Y(y+h/2)-1.0, name, 4.0, INK, "middle", "bold")
    s.txt(f.X(x+w/2), f.Y(y+h/2)+3.4, spec, 2.7, "#555", "middle")

# 行道樹
for xx in range(24, 170, 12):
    s.circ(f.X(xx), f.Y(-3.5), f.L(3.2), fill="url(#tree)", stroke="#6f9b5c", stroke_width=0.2)
for yy in range(20, 170, 13):
    s.circ(f.X(-4), f.Y(yy), f.L(3.0), fill="url(#tree)", stroke="#6f9b5c", stroke_width=0.2)

# 出入口
ENT = [
 (112, 0, "市民主入口－正對公園穿越", RED, "start"),
 (0, 82, "洽公次入口－西側社區側", RED, "start"),
 (0, 140, "地下車道出入口－設西側巷道", BLUE, "start"),
 (60, 175, "服務・清潔隊卸貨－南側", "#555", "start"),
 (188, 60, "人行自行車銜接防汛道", GREEN, "end"),
]
for x,y,lab,col,an in ENT:
    px,py = f.X(x), f.Y(y)
    ox = 16 if an=="start" else -16
    leader(s, px,py, px+ox, py-5, lab, 2.6, col, an, "bold")

# 公車停靠站
s.rect(f.X(60), f.Y(-16), f.L(26), f.L(3.5), fill="#fff", stroke=INK, stroke_width=0.35)
s.txt(f.X(73), f.Y(-12.4), "公車停靠站", 2.5, INK, "middle")

# 地下開挖範圍
s.path(f'M {f.X(12):.2f} {f.Y(14):.2f} L {f.X(96):.2f} {f.Y(14):.2f} L {f.X(96):.2f} {f.Y(152):.2f} '
       f'L {f.X(12):.2f} {f.Y(152):.2f} Z',
       fill="none", stroke=RED, stroke_width=0.7, stroke_dasharray="2.6 1.6")
s.txt(f.X(14), f.Y(149), "地下開挖範圍（B1 停車）", 2.8, RED, weight="bold")
D_AREA = (96-12)*(152-14)
s.txt(f.X(14), f.Y(145), f"D＝{D_AREA:,} ㎡　開挖率 D/A＝{D_AREA/A*100:.1f}%〔題目未給上限〕", 2.4, RED)

# 剖面線
s.line(f.X(-22), f.Y(80), f.X(N+22), f.Y(80), stroke=INK, stroke_width=0.5, stroke_dasharray="5 1.6 1.4 1.6")
s.txt(f.X(-25), f.Y(81), "A", 4.0, INK, "middle", "bold"); s.txt(f.X(N+25), f.Y(81), "A'", 4.0, INK, "middle", "bold")
s.line(f.X(55), f.Y(-24), f.X(55), f.Y(D+20), stroke=INK, stroke_width=0.5, stroke_dasharray="5 1.6 1.4 1.6")
s.txt(f.X(55), f.Y(-27), "B", 4.0, INK, "middle", "bold"); s.txt(f.X(55), f.Y(D+25), "B'", 4.0, INK, "middle", "bold")

north(s, f.X(N+12), f.Y(-30))
s.txt(C_X+4, TOP+312, "全區配置與地面層景觀", 6.0, INK, weight="bold")
scalebar(s, f, C_X+C_W-118, TOP+300)

# ============ 中欄下半：剖面＋透視 ============
SEC_Y = TOP+326
s.line(C_X+2, SEC_Y-5, C_X+C_W-2, SEC_Y-5, stroke=GREY, stroke_width=0.3)

def section(box, label, segs, floors, note, ctx=None, fh=6.2):
    """segs=[(名稱,寬m)]  floors=[(起點m,寬m,層數,每層高mm,名稱)]  ctx=[(起點m,寬m,高mm,標籤)]"""
    bx,by,bw,bh = box
    total = sum(w for _,w in segs)
    k = (bw-6)/total
    s.txt(bx+2, by+3.4, label, 4.4, INK, weight="bold")
    gy  = by+bh-13                      # 地盤線
    maxh = max([fl*he for _,_,fl,he,_ in floors]+[h for *_,h,_ in (ctx or [])]+[10])
    band = gy - maxh - 9                # 段名帶貼齊最高量體上緣
    # 頂部：剖到的每一段名稱＋寬度
    x = bx+3
    for nm,w in segs:
        s.line(x, band, x, band+3.4, stroke=GREY, stroke_width=0.25)
        s.txt(x+w*k/2, band+2.6, f"{nm} {w}M" if w else nm, 2.25, "#555", "middle")
        x += w*k
    s.line(bx+3, band+3.4, bx+bw-3, band+3.4, stroke=GREY, stroke_width=0.25)
    # 周邊環境剪影
    for x0,w,hh,lab in (ctx or []):
        px=bx+3+x0*k
        s.rect(px, gy-hh, w*k, hh, fill="#f2f0ec", stroke=GREY, stroke_width=0.3)
        s.txt(px+w*k/2, gy-hh-1.6, lab, 2.3, "#888", "middle")
    # 地盤線
    s.line(bx+3, gy, bx+bw-3, gy, stroke=INK, stroke_width=0.8)
    # 本案量體＋逐層樓高
    for x0,w,fl,he,nm in floors:
        px=bx+3+x0*k; pw=w*k
        for i in range(fl):
            yy=gy-(i+1)*he
            s.rect(px, yy, pw, he, fill="#fff", stroke=INK, stroke_width=0.45)
            s.txt(px+1.4, yy+he-1.7, f"{i+1}F", 2.2, "#999")
        s.txt(px+pw/2, gy-fl*he-2.4, nm, 3.0, INK, "middle", "bold")
        s.txt(px+pw+0.9, gy-fl*he+2.6, f"{fl}F", 2.5, RED, weight="bold")
    s.txt(bx+3, by+bh-2.5, note, 2.35, "#555")

# A-A' 東西向：證明都市關係（西巷道→量體→廣場→防汛道→綠帶→溪溝→對岸）
SB1 = (C_X+2, SEC_Y, C_W-4, 62)
section(SB1, "A-A' 剖立面（東西向・證明都市關係）",
  [("西社區巷道",15),("行政中心",75),("連廊",18),("市民廣場",70),("防汛道",5),("綠帶",8),("溪溝",6),("對岸",14)],
  [(15,75,3,6.6,"行政中心"),(108,18,2,6.6,"連廊")],
  "樓高 1F 4.5M（大廳挑高）／2–3F 各 3.6M；廣場以緩坡接防汛道，防汛通行不阻斷。溪溝寬6M深3M為基地外既有。",
  ctx=[(0,15,5,"對街3–5F"),(197,14,16,"對岸")])
# 溪溝剖面（挖在地盤線下）
bx1,by1,bw1,bh1 = SB1
k1=(bw1-6)/sum(w for _,w in [("",15),("",75),("",18),("",70),("",5),("",8),("",6),("",14)])
gy1 = by1+bh1-13
xc = bx1+3+(15+75+18+70+5+8)*k1
s.rect(xc, gy1, 6*k1, 7.5, fill="url(#water)", stroke=BLUE, stroke_width=0.45)
s.txt(xc+3*k1, gy1+10.6, "溝深 3M", 2.2, BLUE, "middle")
s.txt(bx1+3+(15+75+18+35)*k1, gy1-3.2, "市民廣場（無建物・避難集結）", 2.5, TAN, "middle", "bold")

# B-B' 南北向：證明機能與高度（北路對面公園→三棟→南巷道）
SB2 = (C_X+2, SEC_Y+70, C_W-4, 66)
section(SB2, "B-B' 剖立面（南北向・證明機能與高度）",
  [("北聯外道路",20),("圖書館＋大會議室",30),("庭園",14),("行政中心",40),("庭園",16),("體健中心",29),("南巷道",15)],
  [(20,30,2,6.6,"圖書館＋大會議室"),(64,40,3,6.6,"行政中心"),(120,29,2,9.6,"體健中心")],
  "體健中心以 2 層達 4,000㎡：游泳池與籃球場需大跨距並挑高 ≥7M，非以總樓地板÷層數概算。",
  ctx=[(0,20,20,"公園喬木")])
s.txt(C_X+C_W-8, SEC_Y+70+66-30, "挑高 ≥7M", 2.5, RED, "end", "bold")

# 局部透視（題目要求：全區或局部透視圖）
PB = (C_X+2, SEC_Y+146, C_W-4, 110)
px_,py_,pw_,ph_ = PB
s.txt(px_+2, py_+4.2, "局部透視　市民廣場望向溪岸", 4.4, INK, weight="bold")
s.rect(px_+3, py_+7, pw_-6, ph_-20, fill="#fcfbf8", stroke=INK, stroke_width=0.45)
gx0, gy0, gw0 = px_+3, py_+ph_-13, pw_-6
s.line(gx0, gy0, gx0+gw0, gy0, stroke=INK, stroke_width=0.6)
# 遠景量體
s.rect(gx0+14, gy0-34, 74, 34, fill="#f3f0f8", stroke=INK, stroke_width=0.4)
s.txt(gx0+51, gy0-36, "行政中心 3F", 2.5, "#666", "middle")
s.rect(gx0+96, gy0-24, 46, 24, fill="#eceae4", stroke=INK, stroke_width=0.4)
s.txt(gx0+119, gy0-26, "連廊 2F", 2.5, "#666", "middle")
# 溪岸與綠帶
s.path(f'M {gx0+gw0-96:.1f} {gy0:.1f} q 24 -5 48 0 t 48 0', fill="none", stroke=BLUE, stroke_width=0.8)
s.txt(gx0+gw0-48, gy0-4.5, "溪岸綠帶", 2.6, BLUE, "middle")
# 喬木
for i,tx in enumerate([gx0+150, gx0+176, gx0+208, gx0+240, gx0+268]):
    s.circ(tx, gy0-16, 8.5, fill="url(#tree)", stroke="#6f9b5c", stroke_width=0.3)
    s.line(tx, gy0-8, tx, gy0, stroke="#6f9b5c", stroke_width=0.5)
# 人物（尺度）
for hx,hs in [(gx0+40,5.2),(gx0+52,4.6),(gx0+64,5.0),(gx0+108,4.8),(gx0+120,5.4),
              (gx0+190,5.0),(gx0+202,4.4),(gx0+256,5.2),(gx0+300,4.8),(gx0+312,5.0)]:
    s.circ(hx, gy0-hs*1.55, hs*0.26, fill="#33475b")
    s.line(hx, gy0-hs*1.30, hx, gy0-hs*0.45, stroke="#33475b", stroke_width=0.5)
    s.line(hx, gy0-hs*0.45, hx-hs*0.2, gy0, stroke="#33475b", stroke_width=0.4)
    s.line(hx, gy0-hs*0.45, hx+hs*0.2, gy0, stroke="#33475b", stroke_width=0.4)
s.txt(px_+5, py_+ph_-7.5,
      "市民廣場是把北側公園的人流引進來的都市客廳：假日市集與親子活動在此展開，", 2.6, INK)
s.txt(px_+5, py_+ph_-3.6,
      "東側緩坡接溪岸綠帶，長者散步、孩童戲水，行政洽公者也在此等候與停留。", 2.6, INK)

# ============ 左欄四格 ============
x,y,w,h = cell(s,0,"① 基地硬條件與環境")
bullets(s,x,y,[
 "基地　近梯形：北 188 M／南 177 M／深 175 M",
 "　　　A ≒ 31,937.5 ㎡〔圖推概算〕",
 "分區　機關用地　建蔽 50%／容積 200%〔題目給定〕",
 "北　　20 M 聯外道路（3 M 人行道・服務水準 B）",
 "　　　隔路為大型公園（基地外・使用強度高）",
 "西・南 15 M 社區巷道，無人行道",
 "東　　5 M 防汛道（平時禁汽機車・開放人行自行車）",
 "　　　外接 8 M 綠帶＋溪溝寬 6M 深 3M",
 "氣候　夏 29℃ 西南風／冬 16℃／11 月東北季風 23.3 km/h",
 "⚠ 原題明示「基地平緩不淹水」——忠實保留，不改題。",
])
s.txt(x, y+44, "⚠ 公園・防汛道・綠帶・溪溝均在基地外，", 2.6, RED, weight="bold")
s.txt(x, y+48, "　不得計入 A 或法定空地；借景≠用地控制權。", 2.6, RED)
dia_site(s, x, y+54, w, h-56)

x,y,w,h = cell(s,1,"② 英雄條件・課題與對策")
s.rect(x, y-0.5, w, 9, fill="#fdf3d7", stroke=TAN, stroke_width=0.3)
s.txt(x+2, y+5.6, "英雄條件：北公園＋東溪流，兩個基地外資源", 3.2, "#8a6a1f", weight="bold")
bullets(s,x,y+14,[
 "課題1 公園與溪流皆在基地外，且各隔一條路",
 "　對策 東北第一象限整塊留為市民廣場，",
 "　　　 北以人行穿越接公園、東以緩坡接防汛道。①",
 "課題2 容積僅用 27.4%，易流於空曠無用",
 "　對策 廣場需有遮蔭、活動與維護計畫，",
 "　　　 非只畫大片空地。②",
 "課題3 三大機能尺度差異大（體健需挑高）",
 "　對策 量體往西、南組織，低層分棟；",
 "　　　 體健中心獨立大跨距量體。③",
 "課題4 東側防汛道禁汽機車",
 "　對策 車行一律由西側 15M 巷道進出，",
 "　　　 防汛道僅作人行自行車銜接。④",
])
dia_hero(s, x, y+62, w, h-70)
s.txt(x, y+h-3, "編號①–④對應中央配置圖同編號位置。", 2.4, GREY)

x,y,w,h = cell(s,2,"③ 空間需求・量體與開放空間")
yy = checktable(s, x, y+2, w-2, [
 ("基地 A","—","31,937.5 ㎡","—"),
 ("建蔽率","50%","25.4%","✓"),
 ("建築面積 B","≤15,968 ㎡","8,126 ㎡","✓"),
 ("容積率","200%","54.8%","✓"),
 ("計容積 F","≤63,875 ㎡","17,500 ㎡","✓"),
 ("開挖率 D/A","未給上限","36.3%","—"),
], "法規檢核表（A/B/G/F/D 五帳）")
bullets(s,x,yy+4,[
 "行政中心　　　　9,000 ㎡ ÷ 3F ＝ 3,000 ㎡",
 "圖書館＋大會議室 4,500 ㎡ ÷ 2F ＝ 2,250 ㎡〔題目為合計〕",
 "體健中心　　　　4,000 ㎡ ÷ 2F ＝ 2,000 ㎡（挑高）",
 "入口大廳・連廊　約 850 ㎡〔自訂方案〕",
 "投影合計 B ＝ 8,126 ㎡　→ 建蔽 25.4%",
 "G＝17,500 ㎡（題目需求）　F＝G（無免計項目主張）",
], 2.65, 3.9)
dia_mass(s, x, yy+22, w, 34)
s.txt(x, y+h-7, "⚠ 不得以 17,500÷3 概算占地：體健中心", 2.5, RED, weight="bold")
s.txt(x, y+h-3.4, "　 之挑高與大跨距須另行驗算。", 2.5, RED)

x,y,w,h = cell(s,3,"④ 人車動線・防災與管理")
dia_flow(s, x, y+46, w, h-48)
bullets(s,x,y,[
 "人行　北側市民主入口正對公園，設安全穿越；",
 "　　　東側以緩坡接防汛道之步行自行車系統。",
 "車行　地下車道出入口設西側 15M 巷道；④",
 "　　　卸貨與清潔隊由南側 15M 巷道進出。",
 "　　　東側防汛道全程不作汽機車進出。",
 "停車　地下 汽 90／機 50；地面 自行車 120〔題目給定〕",
 "防災　市民廣場兼地震臨時避難場所；",
 "　　　救災動線由北 20M 路直達廣場，不穿越量體。",
 "水文　生態水池具有效容積與控制出流；",
 "　　　基地不淹水為原題條件，仍分析溪流風險。",
 "管理　廣場全時開放；行政中心分時門禁，",
 "　　　假日僅開放圖書館與體健中心。",
])

# ============ 右欄：申論 ============
ry = TOP+32
s.rect(R_X+2, ry, R_W-4, 8, fill="#2c3e50")
s.txt(R_X+5, ry+5.8, "申論題（30 分）", 4.2, "#fff", weight="bold")
ry += 12
s.txt(R_X+4, ry, "列舉敷地計畫程序中的分析作業項目，並以你的", 2.8, "#333")
s.txt(R_X+4, ry+4, "過去工作經驗，描述各項作業的資料取得方式或", 2.8, "#333")
s.txt(R_X+4, ry+8, "來源；並可以經手過的工作為例，用圖文說明分析", 2.8, "#333")
s.txt(R_X+4, ry+12, "如何引導出獨特且令人振奮的設計方向。", 2.8, "#333")
ry += 19

s.txt(R_X+4, ry, "（一）分析作業項目與資料來源", 3.6, INK, weight="bold")
ry += 5
TBL = [("自然","氣候・地形・地質土壤・水文・植生","氣象署／地調所／水利署淹水潛勢圖"),
       ("人為","土地使用・交通・鄰棟天際線・噪音","現勘／都計圖／交通局流量"),
       ("法規","分區・建蔽容積・退縮・建築線","都發局都計書圖／建管處"),
       ("非量化","歷史・記憶・場所感","口述歷史／老地圖／田野訪談")]
for a,b,c in TBL:
    s.rect(R_X+4, ry, 16, 9.5, fill="#eef2f6", stroke=GREY, stroke_width=0.25)
    s.txt(R_X+12, ry+6, a, 2.9, INK, "middle", "bold")
    s.txt(R_X+22, ry+4, b, 2.5, "#333")
    s.txt(R_X+22, ry+8, c, 2.35, "#777")
    ry += 10.5
ry += 2

s.txt(R_X+4, ry, "（二）分析如何引導設計方向〔以本案示範〕", 3.6, INK, weight="bold")
ry += 6
# 疊圖→設計 雙圖
gx, gy2 = R_X+8, ry
s.rect(gx, gy2, 38, 30, fill="none", stroke=INK, stroke_width=0.4)
s.raw(f'<ellipse cx="{gx+15:.1f}" cy="{gy2+12:.1f}" rx="11" ry="8" fill="{GREEN}" opacity="0.25"/>')
s.raw(f'<ellipse cx="{gx+23:.1f}" cy="{gy2+17:.1f}" rx="11" ry="8" fill="{BLUE}" opacity="0.25"/>')
s.raw(f'<ellipse cx="{gx+19:.1f}" cy="{gy2+21:.1f}" rx="10" ry="7" fill="{TAN}" opacity="0.28"/>')
s.txt(gx+19, gy2+17, "★", 5.0, RED, "middle", "bold")
s.txt(gx+19, gy2+33.5, "疊圖：公園・溪流・人流", 2.4, "#555", "middle")
s.txt(gx+46, gy2+16, "→", 6.5, RED, "middle", "bold")
s.rect(gx+54, gy2, 38, 30, fill="none", stroke=INK, stroke_width=0.4)
s.poly([(gx+58,gy2+5),(gx+76,gy2+5),(gx+76,gy2+25),(gx+58,gy2+25)], fill="#e6dced", stroke=INK, stroke_width=0.3)
s.poly([(gx+78,gy2+4),(gx+90,gy2+4),(gx+89,gy2+20),(gx+78,gy2+20)], fill="url(#plaza)", stroke=TAN, stroke_width=0.3)
s.txt(gx+73, gy2+33.5, "配置：量體西南・廣場東北", 2.4, "#555", "middle")
ry = gy2 + 38

bullets(s, R_X+4, ry, [
 "1. 水文與防汛分析發現：東側 5M 防汛道禁汽機車，",
 "　 一般視為「不能用的邊」。",
 "2. 人流分析發現：主要人流自北側 20M 路而來，",
 "　 而北側隔路正是大型公園。",
 "3. 疊圖洞見：把「不能行車的東邊」與「公園來的人流」",
 "　 疊起來，浮現一塊只屬於行人的東北象限。",
 "4. 設計方向：量體退往西、南，東北整塊留為市民廣場——",
 "　 限制翻轉為全案最開闊的公共客廳。",
], 2.65, 4.0)
ry += 18
s.rect(R_X+4, ry, R_W-8, 13, fill="#eef5ea", stroke=GREEN, stroke_width=0.3)
s.txt(R_X+6, ry+4.6, "⚠ 原題說「可以」用經手案例，非強制。", 2.5, GREEN, weight="bold")
s.txt(R_X+6, ry+8.6, "　 無此經驗應明說為練習案例，不捏造親歷。", 2.5, GREEN)
ry += 17
s.txt(R_X+4, ry, "小結：分析的價值不在項目齊全，而在從交疊處", 2.75, INK, weight="bold")
s.txt(R_X+4, ry+4, "讀出「只有這塊基地才有」的條件並放大。", 2.75, INK, weight="bold")
ry += 11

# ---- 本年圖說要求檢核（官方四項）----
s.rect(R_X+2, ry, R_W-4, 7.5, fill="#2c3e50")
s.txt(R_X+5, ry+5.4, "本年官方圖說要求｜逐項打勾", 3.6, "#fff", weight="bold")
ry += 11
REQ=[("規劃設計構想","左欄①–④＋中欄配置","✓"),
     ("建築配置與地面層景觀","中欄主圖 S≈1:800","✓"),
     ("剖立面圖","A-A' 都市關係／B-B' 機能高度","✓"),
     ("全區或局部透視圖","市民廣場望向溪岸","✓")]
for a,b,c in REQ:
    s.rect(R_X+4, ry, R_W-8, 8.6, fill="#f7f9fb", stroke=GREY, stroke_width=0.25)
    s.txt(R_X+6.5, ry+3.8, a, 2.8, INK, weight="bold")
    s.txt(R_X+6.5, ry+7.4, b, 2.4, "#666")
    s.txt(R_X+R_W-8, ry+5.8, c, 4.0, GREEN, "end", "bold")
    ry += 9.6
ry += 3

# ---- 數值證據分級 ----
s.rect(R_X+4, ry, R_W-8, 30, fill="#fdf7e8", stroke=TAN, stroke_width=0.35)
s.txt(R_X+6.5, ry+4.6, "數值證據分級（本張圖）", 3.0, "#8a6a1f", weight="bold")
for i,t in enumerate([
  "題目給定　建蔽50%／容積200%／9,000・4,000・4,500㎡",
  "　　　　　地下汽90機50・地面自行車120・基地不淹水",
  "圖推概算　A≒31,937.5㎡（近似梯形，北188/南177/深175）",
  "自訂方案　量體分棟位置・大廳850㎡・開挖範圍・生態水池",
  "未　指定　開挖率上限・建築高度上限 → 只標示不設限",
]):
    s.txt(R_X+6.5, ry+9.6+i*4.2, t, 2.35, "#6b5a2a")
ry += 34

s.rect(R_X+4, ry, R_W-8, 13.5, fill="#fbeaea", stroke=RED, stroke_width=0.35)
s.txt(R_X+6.5, ry+4.6, "交卷前：圖名・比例尺・指北・剖面樓高數字、", 2.6, RED, weight="bold")
s.txt(R_X+6.5, ry+8.4, "透視有人物、每條算式數字與圖上一致、", 2.6, RED, weight="bold")
s.txt(R_X+6.5, ry+12.2, "題目點名條件逐條指得出位置。", 2.6, RED, weight="bold")

ry += 17

# ---- 法規檢核對照表（法源→本案落點）----
s.rect(R_X+2, ry, R_W-4, 7.5, fill="#2c3e50")
s.txt(R_X+5, ry+5.4, "法規檢核｜法源→本案落點", 3.6, "#fff", weight="bold")
ry += 9
_cw = [52, 72, R_W-8-52-72]
s.rect(R_X+4, ry, R_W-8, 6, fill="#e8ecf0", stroke=GREY, stroke_width=0.25)
for i,(h) in enumerate(["法源（簡稱）","要求","本案落點"]):
    s.txt(R_X+6+sum(_cw[:i]), ry+4.2, h, 2.6, INK, weight="bold")
ry += 6
LAW = [
 ("都計法 §22", "細部計畫定土管、公設用地", "依區政中心用地：建蔽50%／容積200%"),
 ("通盤檢討辦法", "都市設計應表明：地下室開挖限制", "開挖退基線 12M 內縮，D/A=36.3%"),
 ("技則 §162-1-3", "法定停車空間得不計入容積", "B1 停車 90 輛不計入 F"),
 ("技則 §302", "建築基地綠化量", "溪岸綠帶＋廣場喬木，一樓留土植穴"),
 ("技則 §305", "基地保水", "廣場透水鋪面＋生態水塘為保水設施"),
 ("技則 §4-3", "雨水貯集：基地面積×0.045 m³/㎡", "31,937.5×0.045≈1,437 m³〔算式在此〕"),
 ("技則 §39-1", "日照：不使鄰地冬至日照<1hr", "南側 15M 巷道側量體控 2F，退 14M"),
 ("技則 §141", "防空避難設備", "B1 兼防空避難，出入口面市民廣場"),
 ("水利法・出流管制", "都計區 0.2 公頃以上", "本案 3.19 公頃：滯洪＋排入東溪需申請"),
]
for a,b,c in LAW:
    s.rect(R_X+4, ry, R_W-8, 7.2, fill="#ffffff", stroke=LGREY, stroke_width=0.22)
    s.txt(R_X+6, ry+4.9, a, 2.5, BLUE, weight="bold")
    s.txt(R_X+6+_cw[0], ry+4.9, b, 2.4, "#333")
    s.txt(R_X+6+_cw[0]+_cw[1], ry+4.9, c, 2.4, "#333")
    ry += 7.2
s.txt(R_X+4, ry+3.6, "※ 條號僅供本庫查核；考場圖上寫簡稱即可，不背條號。", 2.4, "#888")
ry += 9

# ---- 課題→對策→效益 ----
s.rect(R_X+2, ry, R_W-4, 7.5, fill="#2c3e50")
s.txt(R_X+5, ry+5.4, "課題→對策→效益（三行原則）", 3.6, "#fff", weight="bold")
ry += 9.5
PROB = [
 ("公園與溪流分踞兩側，基地成阻隔", "東北象限退讓為市民廣場，形成公園—廣場—溪岸連續步道", "外部資源轉為本案的到達動機"),
 ("三量體尺度過大，臨 15M 巷道壓迫", "行政 3F 置中、圖書與體健各 2F 分踞南北，沿巷退 14M", "街廓由高到低過渡，日照與風廊留通"),
 ("東溪汛期水位高", "首層 FL 抬 1.0M、B1 出入口反樑檻，防汛道不阻斷", "淹水不進地下、避難層可用"),
 ("地方中心平日使用率低", "廣場為無建物避難集結地，假日兼市集；圖書館獨立出入", "一地多時段使用，管理可分區關閉"),
]
for a,b,c in PROB:
    s.rect(R_X+4, ry, R_W-8, 12.6, fill="#f7f9fb", stroke=GREY, stroke_width=0.22)
    s.txt(R_X+6, ry+4.2, "課題｜"+a, 2.5, RED, weight="bold")
    s.txt(R_X+6, ry+8.0, "對策｜"+b, 2.4, "#333")
    s.txt(R_X+6, ry+11.6, "效益｜"+c, 2.4, GREEN)
    ry += 13.4

ry += 3

# ---- 基地核對（與官方底圖疊合）----
s.rect(R_X+2, ry, R_W-4, 7.5, fill="#2c3e50")
s.txt(R_X+5, ry+5.4, "基地核對｜與官方底圖疊合", 3.6, "#fff", weight="bold")
ry += 9.5
CHK = [
 ("道路", "北 20M／西・南 15M／東 5M 防汛道", "未新增、未拓寬"),
 ("公園", "北側大型公園在基地外", "位置未移、未占用"),
 ("溪流", "東側溪流＋6M 防汛道＋8M 綠帶", "在基地外，不計入 A"),
 ("凹口", "東南角斜切（南 177M<北 188M）", "保留斜邊，未填平"),
 ("樹位", "原題未標樹位", "本案新植喬木，未移既有樹"),
 ("界線", "全部量體與開挖線在界內", "開挖退界線 12M 以上"),
]
for a,b,c in CHK:
    s.rect(R_X+4, ry, R_W-8, 7.2, fill="#ffffff", stroke=LGREY, stroke_width=0.22)
    s.txt(R_X+6, ry+4.9, a, 2.5, INK, weight="bold")
    s.txt(R_X+22, ry+4.9, b, 2.4, "#333")
    s.txt(R_X+R_W-8, ry+4.9, "✓ "+c, 2.4, GREEN, "end")
    ry += 7.2
ry += 4

# ---- 量體計算式（逐行可校核）----
s.rect(R_X+4, ry, R_W-8, 45, fill="#f4f6f8", stroke=GREY, stroke_width=0.3)
s.txt(R_X+6.5, ry+4.8, "量體計算式（逐行可校核）", 3.0, INK, weight="bold")
CALC = [
 "A ＝ (188+177)/2 × 175 ＝ 31,937.5 ㎡〔圖推概算・近似梯形〕",
 "B上限 ＝ A×50% ＝ 15,968.75 ㎡　F上限 ＝ A×200% ＝ 63,875 ㎡",
 "需求 G ＝ 行政 9,000＋體健 4,000＋圖書及大會議 4,500 ＝ 17,500 ㎡",
 "G / F上限 ＝ 17,500 / 63,875 ＝ 27.4%（容積用量低，故壓層數換開放空間）",
 "投影 B ＝ 圖書 2,250＋行政 3,000＋體健 2,000＋大廳連廊 876 ≒ 8,126 ㎡",
 "建蔽率 ＝ 8,126 / 31,937.5 ＝ 25.4% ≦ 50% ✓　平均層數 ≒ 17,500/8,126 ≒ 2.15",
 "開挖 D ＝ 84M × 138M ＝ 11,592 ㎡　開挖率 ＝ 36.3%（題目未上限，本案自訂）",
 "雨水貯集 ＝ 31,937.5 × 0.045 ≒ 1,437 m³（技則 §4-3）",
]
for i,t in enumerate(CALC):
    s.txt(R_X+6.5, ry+10.2+i*4.4, t, 2.4, "#333")
ry += 49

s.txt(R_X+4, H-M-3, "110 年 某地方區政中心｜80150 敷地計畫與都市設計｜考場復原稿（可校核線稿）", 2.4, "#999")
print("右欄結束 ry =", round(ry,1), " 畫框底 =", H-M)

s.save('/home/user/architecture-study-notes/圖說/boards/110_地方區政中心_大圖.svg')
print("saved 110")
print(f"投影 B = {FOOT:,} ㎡  建蔽 = {FOOT/A*100:.2f}%")
print(f"開挖 D = {(96-12)*(152-14):,} ㎡  開挖率 = {(96-12)*(152-14)/A*100:.1f}%")
