# -*- coding: utf-8 -*-
"""115 模擬試題產生器（單一事實來源）

產出（皆在本資料夾）：
  115-基地圖.svg / .png      設計題附圖：A3 橫式、1/500 原寸
  115-示範分區.png           命題解析用：示範分區（非唯一解）
  115-模擬試題.md            試題（Markdown）
  115-模擬試題.pdf           列印用：A4 試題＋A3 原寸基地圖

執行：python3 build_115.py（需 rsvg-convert、node＋playwright、pdfunite）
"""
import html
import os
import subprocess
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = "Noto Sans CJK TC, WenQuanYi Zen Hei, sans-serif"

# ================= 基地幾何（公尺；原點＝基地西北角，x 向東、y 向南）=================
W, D, CUT = 100.0, 64.0, 6.0
SITE = [(0, 0), (W - CUT, 0), (W, CUT), (W, D), (0, D)]
A = W * D - CUT * CUT / 2                      # 6,382 ㎡（截角不屬基地）
HER = (6, 6, 36, 10)                           # 歷史建築 x, y, 寬, 深
TREES = [("A", 14, 28), ("B", 26, 31), ("C", 38, 28)]
CROWN_R = 7.0                                  # 樹冠直徑 14 M
assert A == 6382

# ================= A3 版面：1 M = 2 mm（1/500）=================
S = 2.0
EXT = (-40, -40, 128, 88)                      # 圖面範圍（公尺）
OX, OY = 10.0, 26.0                            # 圖框左上（mm）
MAP_W, MAP_H = (EXT[2] - EXT[0]) * S, (EXT[3] - EXT[1]) * S   # 336 × 256 mm


def X(x):
    return OX + (x - EXT[0]) * S


def Y(y):
    return OY + (y - EXT[1]) * S


def L(v):
    return v * S


class Svg:
    def __init__(self):
        self.o = []

    def add(self, s):
        self.o.append(s)

    @staticmethod
    def _a(k):
        return "".join(f' {a.rstrip("_").replace("_", "-")}="{v}"' for a, v in k.items())

    def rect(self, x, y, w, h, **k):
        self.add(f'<rect x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}"{self._a(k)}/>')

    def line(self, x1, y1, x2, y2, **k):
        self.add(f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}"{self._a(k)}/>')

    def poly(self, pts, **k):
        p = " ".join(f"{a:.2f},{b:.2f}" for a, b in pts)
        self.add(f'<polygon points="{p}"{self._a(k)}/>')

    def circ(self, cx, cy, r, **k):
        self.add(f'<circle cx="{cx:.2f}" cy="{cy:.2f}" r="{r:.2f}"{self._a(k)}/>')

    def text(self, x, y, t, size=3.0, fill="#222", anchor="start", weight="normal", rot=None):
        tr = f' transform="rotate({rot} {x:.2f} {y:.2f})"' if rot is not None else ""
        self.add(f'<text x="{x:.2f}" y="{y:.2f}" font-size="{size}" fill="{fill}" '
                 f'text-anchor="{anchor}" font-weight="{weight}"{tr}>{html.escape(t)}</text>')

    def mp(self, pts):                      # 公尺座標 → mm
        return [(X(a), Y(b)) for a, b in pts]


INK, GREY, RED, BLUE, GREEN, TAN = "#222", "#888", "#c0392b", "#2c6fa8", "#4e7d3a", "#8a6a1f"
ORANGE = "#d9822b"
MARK = {INK: "k", RED: "r", BLUE: "b", "#555": "g", GREEN: "gr", ORANGE: "o"}


def mk(col):
    return f"url(#arr-{MARK[col]})"


def defs():
    return f'''<defs>
<clipPath id="mapclip"><rect x="{OX}" y="{OY}" width="{MAP_W}" height="{MAP_H}"/></clipPath>
<pattern id="hatch" width="1.6" height="1.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
  <rect width="1.6" height="1.6" fill="#f4e6cc"/><line x1="0" y1="0" x2="0" y2="1.6" stroke="#b08a4a" stroke-width="0.35"/></pattern>
<pattern id="nodig" width="2.2" height="2.2" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
  <line x1="0" y1="0" x2="0" y2="2.2" stroke="#d9534f" stroke-width="0.3" opacity="0.55"/></pattern>
''' + "".join(
        f'<marker id="arr-{k}" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" '
        f'markerUnits="strokeWidth"><path d="M0,0 L6,3 L0,6 Z" fill="{c}"/></marker>'
        for c, k in MARK.items()) + '''
</defs>'''


def dim_h(s, x1, x2, y, label, off=-1.2):
    """水平尺寸線（公尺座標）"""
    s.line(X(x1), Y(y), X(x2), Y(y), stroke=INK, stroke_width=0.25)
    for xx in (x1, x2):
        s.line(X(xx), Y(y) - 1.4, X(xx), Y(y) + 1.4, stroke=INK, stroke_width=0.25)
    s.text((X(x1) + X(x2)) / 2, Y(y) + off, label, 2.8, INK, "middle", "bold")


def dim_v(s, x, y1, y2, label, off=-1.2):
    s.line(X(x), Y(y1), X(x), Y(y2), stroke=INK, stroke_width=0.25)
    for yy in (y1, y2):
        s.line(X(x) - 1.4, Y(yy), X(x) + 1.4, Y(yy), stroke=INK, stroke_width=0.25)
    cx, cy = X(x) + off, (Y(y1) + Y(y2)) / 2
    s.text(cx, cy, label, 2.8, INK, "middle", "bold", rot=-90)


def base_map(s, exam=True):
    """周邊環境＋基地＋歷史建築＋樟樹（試題與示範分區共用）"""
    s.add('<g clip-path="url(#mapclip)">')
    s.rect(OX, OY, MAP_W, MAP_H, fill="#fbfbf8")
    # ---- 道路 ----
    road = "#e3e3e0"
    s.rect(X(EXT[0]), Y(-20), L(EXT[2] - EXT[0]), L(20), fill=road)        # 北 20M
    s.rect(X(100), Y(EXT[1]), L(12), L(EXT[3] - EXT[1]), fill=road)        # 東 12M
    s.rect(X(EXT[0]), Y(64), L(EXT[2] - EXT[0]), L(8), fill=road)          # 南 8M
    s.line(X(EXT[0]), Y(-10), X(100), Y(-10), stroke="#fff", stroke_width=0.5, stroke_dasharray="3 2")
    s.line(X(112), Y(-10), X(EXT[2]), Y(-10), stroke="#fff", stroke_width=0.5, stroke_dasharray="3 2")
    s.line(X(106), Y(EXT[1]), X(106), Y(-20), stroke="#fff", stroke_width=0.5, stroke_dasharray="3 2")
    s.line(X(106), Y(0), X(106), Y(64), stroke="#fff", stroke_width=0.5, stroke_dasharray="3 2")
    s.text(X(34), Y(-12.2), "20 M 道路（雙向四車道）", 3.4, "#555", "middle", "bold")
    s.text(X(107.8), Y(34), "12 M 道路", 3.2, "#555", "middle", "bold", rot=-90)
    s.text(X(18), Y(69.4), "8 M 巷道", 3.0, "#555", "middle", "bold")
    # ---- 北側：傳統市場（對側）----
    s.rect(X(2), Y(-38), L(80), L(15), fill="#efece6", stroke=GREY, stroke_width=0.3)
    s.text(X(42), Y(-29), "傳統市場（對側・上午人潮）", 3.2, "#555", "middle", "bold")
    s.rect(X(86), Y(-38), L(12), L(15), fill="#efece6", stroke=GREY, stroke_width=0.3)
    s.text(X(92), Y(-29.5), "住商", 2.6, "#777", "middle")
    # 公車站（基地前）
    s.rect(X(62), Y(-3.2), L(14), L(2.4), fill="#fff", stroke=INK, stroke_width=0.35)
    s.text(X(69), Y(-1.4), "公車站", 2.4, INK, "middle", "bold")
    # ---- 東側：4–5 層集合住宅（對側）----
    for y0 in (4, 34):
        s.rect(X(116), Y(y0), L(16), L(26), fill="#efece6", stroke=GREY, stroke_width=0.3)
    s.rect(X(116), Y(-38), L(16), L(15), fill="#efece6", stroke=GREY, stroke_width=0.3)
    s.text(X(121.5), Y(17), "4–5 層集合住宅（對側）", 2.8, "#555", "middle", "bold", rot=-90)
    # ---- 南側：2–3 層透天（對側）----
    xx = -40
    while xx < 98:
        s.rect(X(xx), Y(76), L(5.4), L(12), fill="#efece6", stroke=GREY, stroke_width=0.25)
        xx += 6
    s.rect(X(116), Y(76), L(16), L(12), fill="#efece6", stroke=GREY, stroke_width=0.25)
    s.text(X(46), Y(82.6), "2–3 層透天住宅（對側）", 3.0, "#555", "middle", "bold")
    # ---- 西側：國小（同校區）----
    s.rect(X(EXT[0]), Y(0), L(40), L(64), fill="#eef2ea")
    s.rect(X(-36), Y(4), L(30), L(16), fill="#e1e6dc", stroke=GREY, stroke_width=0.35)
    s.text(X(-21), Y(12.6), "國小校舍（3F）", 3.0, "#555", "middle", "bold")
    s.add(f'<rect x="{X(-84):.2f}" y="{Y(26):.2f}" width="{L(78):.2f}" height="{L(36):.2f}" '
          f'rx="{L(18):.2f}" fill="#c98b6e" stroke="#9c5a40" stroke-width="0.4"/>')
    s.add(f'<rect x="{X(-77):.2f}" y="{Y(33):.2f}" width="{L(64):.2f}" height="{L(22):.2f}" '
          f'rx="{L(11):.2f}" fill="#dcebd2" stroke="#ffffff" stroke-width="0.4"/>')
    s.text(X(-26), Y(43), "國小操場", 3.2, GREEN, "middle", "bold")
    s.text(X(-26), Y(47.5), "（災時得為避難集結延伸）", 2.5, GREEN, "middle")
    s.text(X(-21), Y(24.2), "國民小學（同校區）", 3.0, GREEN, "middle", "bold")
    s.add('</g>')
    # ---- 基地 ----
    s.poly(s.mp(SITE), fill="#ffffff", stroke=INK, stroke_width=0.75)
    # 現有實心圍牆（與國小交界）
    s.line(X(0), Y(0), X(0), Y(64), stroke="#555", stroke_width=1.4)
    s.text(X(-1.6), Y(32), "現有實心圍牆（國小同意改為通透圍籬＋管制門一處）", 2.4, "#555",
           "middle", rot=-90)
    # 截角
    s.text(X(96.2), Y(-1.2), "截角 6 M × 6 M", 2.4, RED, "end", "bold")
    # ---- 歷史建築 ----
    x, y, w, h = HER
    s.rect(X(x), Y(y), L(w), L(h), fill="url(#hatch)", stroke=INK, stroke_width=0.6)
    s.text(X(x + w / 2), Y(y + 4.4), "歷史建築（日治木造校舍・1F）", 3.2, INK, "middle", "bold")
    s.text(X(x + w / 2), Y(y + 8.3), "簷高約 3.6 M・屋脊高約 7 M", 2.6, "#5a4520", "middle")
    # ---- 樟樹 ----
    for name, tx, ty in TREES:
        s.circ(X(tx), Y(ty), L(CROWN_R), fill="#cfe3c0", fill_opacity="0.85",
               stroke="#5f8f4e", stroke_width=0.45)
        s.line(X(tx) - 1.2, Y(ty), X(tx) + 1.2, Y(ty), stroke="#3d6b2e", stroke_width=0.35)
        s.line(X(tx), Y(ty) - 1.2, X(tx), Y(ty) + 1.2, stroke="#3d6b2e", stroke_width=0.35)
        s.text(X(tx), Y(ty) + 4.2, f"樟樹 {name}", 2.7, "#3d6b2e", "middle", "bold")
    if exam:
        s.text(X(26), Y(42.6), "老樟樹 3 株（樹冠直徑約 14 M・原地保留）", 2.8, "#3d6b2e", "middle", "bold")
        s.text(X(72), Y(36), "基　地", 5.0, "#bbb", "middle", "bold")
        s.text(X(72), Y(42), "學校用地（多目標作社會福利設施）", 2.8, "#999", "middle")
        s.text(X(72), Y(46), "建蔽率 50%・容積率 200%", 2.8, "#999", "middle")
        s.text(X(72), Y(56), "淹水潛勢 0.3–0.5 M（日雨量 500 mm）", 2.8, BLUE, "middle", "bold")
        # 尺寸
        dim_h(s, 0, W - CUT, -6, "94 M")
        dim_h(s, W - CUT, W, -6, "6 M")
        dim_h(s, 0, W, 66.6, "100 M", off=3.4)
        dim_v(s, 103, CUT, D, "58 M", off=3.6)
        dim_v(s, 103, 0, CUT, "6 M", off=3.6)
        dim_v(s, -5, 0, D, "64 M", off=-1.4)
        dim_h(s, 0, HER[0], 11, "6 M", off=-1.0)
        dim_v(s, 24, 0, HER[1], "6 M", off=-1.0)
        dim_h(s, HER[0], HER[0] + HER[2], 17.6, "36 M", off=3.2)
        dim_v(s, HER[0] + HER[2] + 1.8, HER[1], HER[1] + HER[3], "10 M", off=3.2)
    # 捷運方向
    s.line(X(113), Y(-21.5), X(124), Y(-36), stroke=BLUE, stroke_width=0.6, marker_end=mk(BLUE))
    s.text(X(110.5), Y(-25.2), "捷運站出入口", 2.6, BLUE, "end", "bold")
    s.text(X(110.5), Y(-22.2), "（東北方約 250 M）", 2.4, BLUE, "end")


def north_and_wind(s, x0, y0):
    """指北＋風向示意（mm 座標）"""
    s.add(f'<path d="M {x0:.2f} {y0 - 9:.2f} L {x0 + 3.2:.2f} {y0 + 3:.2f} L {x0:.2f} {y0 + 0.8:.2f} '
          f'L {x0 - 3.2:.2f} {y0 + 3:.2f} Z" fill="{INK}"/>')
    s.text(x0, y0 + 8, "N", 4.4, INK, "middle", "bold")
    cx, cy, r = x0 + 26, y0 + 1, 9
    s.circ(cx, cy, r, fill="none", stroke=GREY, stroke_width=0.3, stroke_dasharray="1 1")
    s.line(cx - 13, cy + 13, cx - 3, cy + 3, stroke=ORANGE, stroke_width=0.9, marker_end=mk(ORANGE))
    s.line(cx + 13, cy - 13, cx + 3, cy - 3, stroke=BLUE, stroke_width=0.9, marker_end=mk(BLUE))
    s.text(cx - 14, cy + 17, "夏季 西南風", 2.6, "#d9822b", "middle", "bold")
    s.text(cx + 12, cy - 15, "冬季 東北季風", 2.6, BLUE, "middle", "bold")


def scale_bar(s, x0, y0, meters=25, step=5):
    for i in range(0, meters, step):
        s.rect(x0 + L(i), y0, L(step), 2.0, fill=INK if (i // step) % 2 == 0 else "#fff",
               stroke=INK, stroke_width=0.25)
    for i in range(0, meters + 1, step):
        s.text(x0 + L(i), y0 + 5.4, str(i), 2.4, INK, "middle")
    s.text(x0 + L(meters) + 2, y0 + 5.4, "M", 2.4, INK)


def svg_doc(body, w=420, h=297):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}mm" height="{h}mm" '
            f'viewBox="0 0 {w} {h}" font-family="{FONT}">' + defs() + body + '</svg>')


# ================= 試題附圖：基地圖 =================
def build_site_map():
    s = Svg()
    s.rect(0, 0, 420, 297, fill="#ffffff")
    s.text(10, 13, "115 年建築師考試｜敷地計畫與都市設計　模擬試題　設計題附圖：基地圖", 6.0, INK, weight="bold")
    s.text(10, 20.5, "「老幼共融社區韌性中心」　尺寸單位：M　比例尺 1/500（A3 橫式、實際大小列印）"
           "　本庫自擬，非官方試題", 3.3, "#555")
    base_map(s, exam=True)
    s.rect(OX, OY, MAP_W, MAP_H, fill="none", stroke=INK, stroke_width=0.4)
    # 右側說明欄
    px = 352
    north_and_wind(s, px + 6, OY + 14)
    yy = OY + 44
    s.text(px, yy, "比例尺 1/500", 3.2, INK, weight="bold")
    scale_bar(s, px, yy + 3)
    yy += 18
    s.text(px, yy, "圖例", 3.2, INK, weight="bold")
    s.rect(px, yy + 3, 8, 5, fill="url(#hatch)", stroke=INK, stroke_width=0.4)
    s.text(px + 10, yy + 7, "歷史建築（保存活化）", 2.7)
    s.circ(px + 4, yy + 13.5, 3, fill="#cfe3c0", stroke="#5f8f4e", stroke_width=0.4)
    s.text(px + 10, yy + 14.5, "樟樹樹冠（原地保留）", 2.7)
    s.rect(px, yy + 19, 8, 5, fill="#e3e3e0")
    s.text(px + 10, yy + 23, "道路", 2.7)
    s.rect(px, yy + 27, 8, 5, fill="#eef2ea")
    s.text(px + 10, yy + 31, "國民小學（基地外）", 2.7)
    yy += 44
    s.text(px, yy, "座標（原點＝基地西北角）", 3.2, INK, weight="bold")
    for i, t in enumerate(["x 向東、y 向南，單位 M",
                           "歷史建築：x 6–42、y 6–16",
                           "樟樹 A（14, 28）",
                           "樟樹 B（26, 31）",
                           "樟樹 C（38, 28）",
                           "樹冠直徑約 14 M"]):
        s.text(px, yy + 5.5 + i * 4.6, t, 2.7, "#333")
    yy += 36
    s.text(px, yy, "附註", 3.2, INK, weight="bold")
    for i, t in enumerate(["截角 6×6 M 不屬基地",
                           "北側 16:00 前後國小接送壅塞",
                           "夏季午後西曬強烈",
                           "淹水潛勢 0.3–0.5 M"]):
        s.text(px, yy + 5.5 + i * 4.6, t, 2.7, "#333")
    s.text(px, 284, "本圖為模擬試題附圖", 2.5, GREY)
    s.text(px, 288, "非官方試題", 2.5, GREY)
    return svg_doc("".join(s.o))


# ================= 命題解析用：示範分區 =================
BLOCKS = [  # 名稱, 說明, x, y, w, h, 色
    ("照顧棟", "1F 日間照顧中心｜2F 多功能活動中心（挑高・淨高 7 M）＋社工辦公", 57, 22, 34, 40, "#d6e6f2"),
    ("托嬰棟", "1F 托嬰中心｜2F 共融活動室（東半 20×20）", 20, 42, 37, 20, "#f2e4c9"),
    ("服務棟", "1F 共享廚房｜2F 物資倉儲・儲能", 48, 4, 9, 27, "#e6dced"),
]
EXC = (52, 8, 40, 50)                                   # B1 開挖 40×50＝2,000 ㎡


def build_zoning():
    s = Svg()
    s.rect(0, 0, 420, 297, fill="#ffffff")
    s.text(10, 13, "115 模擬試題　示範分區（本庫方案之一，非唯一解）", 6.0, INK, weight="bold")
    s.text(10, 20.5, "照顧棟在 15 M 線外可做高；服務棟在線內只做 2F；托嬰棟與照顧棟相接，共融活動室在兩棟交接處"
           "；B1 只挖東半部（避開禁挖區）", 3.2, "#555")
    base_map(s, exam=False)
    # 15 M／2F 線與 6 M 間距
    s.poly(s.mp([(0, 0), (57, 0), (57, 31), (0, 31)]), fill="none", stroke="#7a5ea8",
           stroke_width=0.6, stroke_dasharray="2.4 1.4")
    s.text(X(50.5), Y(-1.3), "15 M 線內 ≦2F", 2.5, "#7a5ea8", "end", "bold")
    s.poly(s.mp([(0, 0), (48, 0), (48, 22), (0, 22)]), fill="none", stroke="#7a5ea8",
           stroke_width=0.4, stroke_dasharray="0.8 0.8")
    # 禁挖區（歷史建築外 5 M＋樹冠外 2 M）
    s.rect(X(1), Y(1), L(46), L(20), fill="url(#nodig)", stroke="none")
    for _, tx, ty in TREES:
        s.circ(X(tx), Y(ty), L(CROWN_R + 2), fill="url(#nodig)", stroke="#d9534f",
               stroke_width=0.3, stroke_dasharray="1 1")
    # 開放空間
    s.rect(X(57), Y(4), L(40), L(16), fill="#f6eedb", stroke=TAN, stroke_width=0.4)
    s.text(X(77), Y(11), "避難集結廣場 40×16＝640 ㎡", 3.0, TAN, "middle", "bold")
    s.text(X(77), Y(15.2), "主入口・公車站側・自行車 40", 2.5, TAN, "middle")
    s.rect(X(4), Y(42), L(16), L(20), fill="#fdf3e1", stroke="#d9822b", stroke_width=0.4,
           stroke_dasharray="1.6 1")
    s.text(X(12), Y(51), "托嬰戶外", 2.8, "#b86b12", "middle", "bold")
    s.text(X(12), Y(55), "320 ㎡", 2.6, "#b86b12", "middle")
    s.rect(X(47), Y(31), L(10), L(11), fill="#e9f3e2", stroke=GREEN, stroke_width=0.4)
    s.text(X(52), Y(34.2), "療癒", 2.5, GREEN, "middle", "bold")
    s.text(X(52), Y(40.6), "庭園", 2.5, GREEN, "middle", "bold")
    s.text(X(26), Y(21.4), "樟樹前庭・老幼共融庭園", 2.8, "#3d6b2e", "middle", "bold")
    # 量體
    for name, spec, x, y, w, h, col in BLOCKS:
        s.rect(X(x), Y(y), L(w), L(h), fill=col, stroke=INK, stroke_width=0.6)
    s.text(X(74), Y(41), "照顧棟（2F）", 3.6, INK, "middle", "bold")
    s.text(X(74), Y(45.2), "1F 日間照顧中心", 2.7, "#333", "middle")
    s.text(X(74), Y(49.0), "2F 多功能活動中心（淨高 7 M）", 2.7, "#333", "middle")
    s.text(X(74), Y(52.8), "＋社工辦公　34×40＝1,360 ㎡", 2.7, "#333", "middle")
    s.text(X(44), Y(50.0), "托嬰棟（2F）", 3.2, INK, "middle", "bold")
    s.text(X(44), Y(54.0), "1F 托嬰 37×20＝740", 2.5, "#333", "middle")
    s.text(X(44), Y(57.6), "2F 共融 400（東半）", 2.5, "#333", "middle")
    s.text(X(50.6), Y(17.5), "服務棟 2F　9×27", 2.4, INK, "middle", "bold", rot=-90)
    s.text(X(55.2), Y(17.5), "廚房／倉儲・儲能", 2.2, "#333", "middle", rot=-90)
    # 車寄
    s.rect(X(91), Y(24), L(6), L(26), fill="#f1f1f1", stroke=GREY, stroke_width=0.35, stroke_dasharray="1.2 0.8")
    s.text(X(94.6), Y(37), "車寄臨停 4 席（雨遮）", 2.4, "#555", "middle", "bold", rot=-90)
    # 開挖
    ex, ey, ew, eh = EXC
    s.rect(X(ex), Y(ey), L(ew), L(eh), fill="none", stroke=RED, stroke_width=0.7, stroke_dasharray="2.6 1.6")
    s.text(X(ex + 1), Y(ey + eh + 2.8), "B1 開挖 40×50＝2,000 ㎡（31.3%）≦ 50%", 2.8, RED, weight="bold")
    # 出入口
    def arrow(x1, y1, x2, y2, col, lab, anchor="start", dx=1.0, dy=-1.0):
        s.line(X(x1), Y(y1), X(x2), Y(y2), stroke=col, stroke_width=0.8, marker_end=mk(col))
        if lab:
            s.text(X(x1) + dx, Y(y1) + dy, lab, 2.5, col, anchor, "bold")
    arrow(86, -6, 82, 3, RED, "主入口（人行）", "start", 1.5, -0.8)
    arrow(26, -6, 26, 5, RED, "共學館入口", "start", 1.5, -0.8)
    arrow(110, 30, 98, 30, BLUE, "接送車寄", "start", 1.0, -1.4)
    arrow(110, 57, 98, 57, BLUE, "B1 車道（防水閘門）", "start", 1.0, -1.4)
    arrow(52, -7, 52, 3, "#555", "卸貨（上午）", "end", -1.5, -0.8)
    arrow(-10, 39, -0.8, 39, GREEN, "", "start")
    s.text(X(1.2), Y(40.6), "管制門（假日・災時）", 2.4, GREEN, "start", "bold")
    # 剖面線
    s.line(X(-30), Y(36), X(114), Y(36), stroke=INK, stroke_width=0.4, stroke_dasharray="4 1.4 1 1.4")
    s.text(X(-32), Y(37), "A", 3.6, INK, "middle", "bold")
    s.text(X(116), Y(37), "A'", 3.6, INK, "middle", "bold")
    s.line(X(36), Y(-18), X(36), Y(74), stroke=INK, stroke_width=0.4, stroke_dasharray="4 1.4 1 1.4")
    s.text(X(36), Y(-19.5), "B", 3.6, INK, "middle", "bold")
    s.text(X(36), Y(77.5), "B'", 3.6, INK, "middle", "bold")
    s.rect(OX, OY, MAP_W, MAP_H, fill="none", stroke=INK, stroke_width=0.4)
    # 右側：數字
    px = 352
    north_and_wind(s, px + 6, OY + 14)
    yy = OY + 42
    s.text(px, yy, "示範數字", 3.4, INK, weight="bold")
    for i, t in enumerate(["A＝6,400−18＝6,382",
                           "B＝1,360＋740＋243＋360",
                           "　＝2,703（42.4%）",
                           "F＝4,623（72.4%）",
                           "E＝1,960　G＝6,583",
                           "D＝2,000（31.3%）",
                           "光電 ≧ 2,343÷20",
                           "　≒ 118 kW",
                           "滯洪 ≧ 288 m³"]):
        s.text(px, yy + 6 + i * 4.8, t, 2.8, "#333")
    yy += 56
    s.text(px, yy, "剖面", 3.4, INK, weight="bold")
    for i, t in enumerate(["A-A'：操場→樟樹前庭→",
                           "　療癒庭園→照顧棟→車寄",
                           "B-B'：20M 道路→歷史建築",
                           "　→樟樹→托嬰棟→8M 巷"]):
        s.text(px, yy + 6 + i * 4.8, t, 2.6, "#333")
    yy += 28
    s.text(px, yy, "圖例", 3.4, INK, weight="bold")
    s.line(px, yy + 4, px + 8, yy + 4, stroke="#7a5ea8", stroke_width=0.6, stroke_dasharray="2.4 1.4")
    s.text(px + 10, yy + 5, "15 M 線（線內 ≦2F）", 2.6)
    s.line(px, yy + 9, px + 8, yy + 9, stroke="#7a5ea8", stroke_width=0.4, stroke_dasharray="0.8 0.8")
    s.text(px + 10, yy + 10, "6 M 間距線", 2.6)
    s.rect(px, yy + 12, 8, 4, fill="url(#nodig)", stroke="#d9534f", stroke_width=0.3)
    s.text(px + 10, yy + 15.2, "禁挖區（歷建外 5 M", 2.6)
    s.text(px + 10, yy + 19.2, "　樹冠外 2 M）", 2.6)
    s.line(px, yy + 23, px + 8, yy + 23, stroke=RED, stroke_width=0.7, stroke_dasharray="2.6 1.6")
    s.text(px + 10, yy + 24, "B1 開挖範圍", 2.6)
    yy += 32
    scale_bar(s, px, yy)
    s.text(px, 284, "命題解析附圖", 2.5, GREY)
    s.text(px, 288, "非唯一解", 2.5, GREY)
    return svg_doc("".join(s.o))


# ================= 試題文字（Markdown 與 PDF 共用）=================
HEAD = [("等　別", "高等考試"), ("類　科", "建築師"), ("科　目", "敷地計畫與都市設計"), ("考試時間", "4 小時")]
NOTICE = ["（一）可以使用電子計算器。",
          "（二）不必抄題，作答時請將試題題號及答案依照順序寫（繪）於試卷（圖紙）上，於本試題上作答者，不予計分。",
          "（三）本科目除專門名詞或數理公式外，應使用本國文字作答。"]

ESSAY_INTRO = ("極端高溫日益頻繁，長者與幼兒因體溫調節能力較弱，是熱危害的高風險族群；"
               "同時，我國已宣示 2050 年淨零排放目標。請回答下列問題：")
ESSAY = [
    "（一）說明都市熱島效應形成的主要原因，並分別從「都市設計」與「敷地計畫」兩個層面，"
    "提出降低戶外熱危害、改善行人熱舒適的具體策略。（15 分）",
    "（二）公共建築應如何在敷地計畫階段即降低營運與交通的碳排放？請就基地配置與座向、自然通風與遮陽、"
    "再生能源（如屋頂太陽光電）、低碳交通、雨水利用與綠覆等面向，以圖文方式說明，"
    "並以本次設計題基地為例。（15 分）",
]

ORIGIN = [
    "某都市國民小學因少子化減班，校地東北隅之舊校舍區長年閒置。市政府擬將此區劃為獨立基地，"
    "興建「老幼共融社區韌性中心」，整合長照日間照顧、公共托育、代間共學與社區共餐；"
    "平時為社區照顧與交流據點，災時（地震、水患、極端高溫）作為社區避難收容及物資據點，以實踐「平災兩用」。",
    "基地內有日治時期木造校舍一棟，已登錄為歷史建築，應保存並活化為「社區共學館」；"
    "校舍南側三株老樟樹應原地保留。",
]
SITE_TXT = [
    "基地東西 100 M、南北 64 M，東北角臨路口設有 6 M × 6 M 截角（截角部分不屬基地）。",
    "使用分區為學校用地，已依都市計畫公共設施用地多目標使用相關規定核准作社會福利設施使用（本題假設條件）；"
    "建蔽率 50%、容積率 200%。",
    "北臨 20 M 道路（雙向四車道，基地前設有公車站，對側為傳統市場）；東臨 12 M 道路（對側為 4–5 層集合住宅）；"
    "南臨 8 M 巷道（對側為 2–3 層透天住宅）；西鄰同一校區之國民小學（西北側為 3 層校舍、西南側為操場）。"
    "基地東北方約 250 M 為捷運站出入口。",
    "國小放學時段（16:00 前後），北側 20 M 道路接送車輛壅塞。基地與國小交界現為實心圍牆，"
    "國小同意改設通透圍籬並設管制門一處，假日開放社區通行，災時操場得作為避難集結之延伸空間；"
    "國小學童不得穿越本中心之車行及服務動線。",
    "歷史建築：木造平房一棟，長 36 M、寬 10 M（樓地板面積 360 ㎡），簷高約 3.6 M、屋脊高約 7 M，位置如附圖。"
    "不得拆除，亦不得於其上增建；其建築面積及樓地板面積應計入本基地建蔽率及容積率檢討。",
    "老樟樹 3 株：胸徑約 80–110 cm，樹冠直徑約 14 M，位置如附圖；樹冠投影外 2 M 範圍內不得設置建築物、不得開挖。",
    "地勢平坦；基地位於淹水潛勢區（日雨量 500 mm 時淹水深度約 0.3–0.5 M）。",
    "氣候：夏季盛行西南風、冬季東北季風；夏季午後西曬強烈，年日照時數約 2,000 小時。",
]
GUIDE = [
    "臨 20 M 道路退縮 4 M、臨 12 M 道路退縮 3 M、臨 8 M 巷道退縮 2 M，均留設無遮簷人行道。",
    "新建建築物高度不得超過 4 層且不得超過 18 M；距歷史建築外牆 15 M 範圍內之新建建築物不得超過 2 層；"
    "新建建築物與歷史建築外牆之距離不得小於 6 M。",
    "地下室開挖率不得超過 50%；歷史建築外牆外 5 M 範圍內不得開挖。",
    "地面層樓板應高於前面道路路面 0.5 M 以上，或設置同等效能之防洪措施；地下室出入口應設防水閘門。",
    "屋頂應設置太陽光電發電設備，並於圖面標示設置範圍及裝置容量（依現行規定檢討）。",
    "基地內應設置雨水貯集滯洪設施，並標示位置及容量（依建築技術規則檢討）。",
]
PROG_NOTE = "面積為各空間之淨面積，不含門廳、走廊、樓電梯、廁所、機電等公共設施；公共設施比例自訂並說明。"
PROG = [
    ("日間照顧中心", "1,000 ㎡", "失能、失智長者 60 人；含活動區、休憩室、餐廳及備餐、復健、沐浴、護理站及辦公；"
                              "以設於地面層為原則，並應有專用療癒庭園"),
    ("公共托嬰中心", "500 ㎡", "0–2 歲幼兒 40 名；以設於地面層為原則；專用戶外活動空間 ≥ 150 ㎡"),
    ("老幼共融活動室", "2 間，共 300 ㎡", "代間共學、共餐、親子活動；應與日間照顧中心及托嬰中心便捷連通"),
    ("多功能活動中心", "800 ㎡", "平時供社區運動與集會（可設羽球場 2 面），災時作為避難收容空間（收容 250 人）；"
                              "室內淨高 ≥ 7 M"),
    ("社區共學館", "360 ㎡（歷史建築）", "社區大學教室及地方記憶展示；應與老樟樹共同形成戶外核心"),
    ("社區共享廚房", "150 ㎡", "供平日共餐及災時供膳；須有獨立卸貨動線"),
    ("社工站及管理辦公", "200 ㎡", "含個案諮詢、志工室、中控室"),
    ("防災物資倉儲及緊急電力", "120 ㎡", "含儲能設備；不得設於地下層"),
    ("公共設施", "自訂", "門廳、廁所、樓電梯、機電等；全區無障礙，應設無障礙電梯"),
    ("停車", "—", "汽車 40 輛（含無障礙車位 2 輛）、機車 60 輛，設於地下層；"
                 "長照及托育接送臨停 4 席設於地面層並具遮雨設施；自行車 40 輛"),
    ("戶外空間", "—", "避難集結廣場 ≥ 600 ㎡（不得與托嬰戶外活動空間重疊）、療癒庭園、雨水貯集滯洪設施、景觀綠化"),
]
DRAW = [
    "規劃構想說明：以圖文表達基地分析、課題與對策及配置概念。",
    "全區配置圖兼地面層平面圖（比例尺 1/300 或 1/400，自選）：應標示主、次出入口及人車動線"
    "（含長照與托育接送、卸貨、汽機車出入口）、地下室開挖範圍及開挖率、歷史建築與老樟樹之保護範圍、"
    "避難集結廣場與避難動線、托嬰戶外活動空間、療癒庭園、滯洪設施位置及無障礙通路。",
    "全區空間機能組織圖（含水平及垂直關係）。",
    "剖面圖至少 2 向：應表示樓層數、高度、地下室、地面層防洪高程，以及與歷史建築、國小之關係。",
    "外部空間局部透視圖至少 1 處（含歷史建築、老樟樹與老幼共融庭園）。",
    "面積計算表：基地面積、建築面積及建蔽率、總樓地板面積及容積率、地下開挖面積及開挖率、太陽光電裝置容量。",
]
CN = "一二三四五六七八九十"


def build_md():
    o = ["# 115 年建築師考試｜敷地計畫與都市設計　模擬試題", "",
         "> 本庫自擬之模擬題，**非官方試題**；題型、配分與圖說要求比照 106–114 年（申論 30＋設計 70）。",
         "> 建議限時 4 小時作答，寫完再看 [命題解析](./115-模擬試題-命題解析.md)。",
         "> 列印用：[`115-模擬試題.pdf`](./115-模擬試題.pdf)（A4 試題 3 頁＋A3 原寸基地圖 1/500）。", "",
         "| 項目 | 內容 |", "|---|---|"]
    o += [f"| {a} | {b} |" for a, b in HEAD]
    o += ["", "※注意："] + [f"- {t}" for t in NOTICE]
    o += ["", "---", "", "## 一、申論題（30 分）", "", ESSAY_INTRO, ""] + [f"{t}\n" for t in ESSAY]
    o += ["---", "", "## 二、設計題（70 分）：「老幼共融社區韌性中心」規劃設計", "",
          "### （一）計畫緣起", ""] + [f"{t}\n" for t in ORIGIN]
    o += ["### （二）基地概述（詳附圖）", ""] + [f"{i + 1}. {t}" for i, t in enumerate(SITE_TXT)]
    o += ["", "### （三）都市設計準則（本題給定）", ""] + [f"{i + 1}. {t}" for i, t in enumerate(GUIDE)]
    o += ["", "### （四）計畫內容", "", f"> {PROG_NOTE}", "",
          "| 項目 | 面積／數量 | 說明 |", "|---|---|---|"]
    o += [f"| {i + 1}. {a} | {b} | {c} |" for i, (a, b, c) in enumerate(PROG)]
    o += ["", "### （五）圖說要求", ""] + [f"{i + 1}. {t}" for i, t in enumerate(DRAW)]
    o += ["", "### 附圖：基地圖", "",
          "![115 模擬試題基地圖](./115-基地圖.png)", "",
          "> 尺寸單位 M。座標原點為基地西北角（x 向東、y 向南）：歷史建築 x 6–42、y 6–16；"
          "樟樹 A（14, 28）、B（26, 31）、C（38, 28），樹冠直徑約 14 M。"
          "A3 原寸（1/500）見 PDF 最後一頁。", ""]
    return "\n".join(o)


CSS = """
@page { size: A4; margin: 15mm 16mm 17mm 16mm; }
body { font-family: "Noto Serif CJK TC", serif; font-size: 10.4pt; line-height: 1.62; color: #111; margin: 0; }
h1 { font-family: "Noto Sans CJK TC", sans-serif; font-size: 14.5pt; text-align: center; margin: 0 0 1mm; }
.mock { text-align: center; font-family: "Noto Sans CJK TC", sans-serif; font-size: 8.6pt; color: #b03a2e;
        border: 0.6pt solid #b03a2e; padding: 0.6mm 2mm; width: 62mm; margin: 0 auto 3mm; }
table.head { border-collapse: collapse; width: 100%; font-size: 10pt; margin-bottom: 2mm; }
table.head td { border: 0.6pt solid #333; padding: 1mm 2.4mm; }
table.head td.k { width: 20mm; background: #f2f2f2; font-family: "Noto Sans CJK TC", sans-serif; }
.notice { font-size: 9.3pt; margin: 1.5mm 0 3mm; }
.notice div { padding-left: 3.4em; text-indent: -3.4em; }
h2 { font-family: "Noto Sans CJK TC", sans-serif; font-size: 12pt; margin: 4mm 0 1.5mm;
     border-bottom: 0.8pt solid #333; padding-bottom: 0.6mm; }
h3 { font-family: "Noto Sans CJK TC", sans-serif; font-size: 10.6pt; margin: 3mm 0 1mm; }
p { margin: 0 0 1.4mm; text-align: justify; }
.q { padding-left: 2em; text-indent: -2em; }
ol { margin: 0 0 1mm; padding-left: 1.6em; }
ol li { margin-bottom: 0.6mm; text-align: justify; }
table.prog { border-collapse: collapse; width: 100%; font-size: 9.2pt; line-height: 1.45; }
table.prog th, table.prog td { border: 0.6pt solid #333; padding: 1mm 1.8mm; vertical-align: top; }
table.prog th { background: #f2f2f2; font-family: "Noto Sans CJK TC", sans-serif; font-weight: 700; }
table.prog td.n { white-space: nowrap; }
.note { font-size: 9pt; color: #333; margin: 1mm 0 1.6mm; }
.fig { text-align: center; margin-top: 2mm; }
.fig img { width: 100%; border: 0.4pt solid #999; }
.cap { font-size: 8.8pt; color: #333; margin-top: 1mm; }
.figblk { break-inside: avoid; }
"""


def build_html(map_png_name):
    e = html.escape
    o = [f"<!doctype html><html lang='zh-Hant'><head><meta charset='utf-8'><style>{CSS}</style></head><body>",
         "<h1>115 年專門職業及技術人員高等考試建築師考試試題</h1>",
         "<div class='mock'>模擬試題｜本庫自擬，非官方試題</div>",
         "<table class='head'>"]
    o += [f"<tr><td class='k'>{e(a)}</td><td>{e(b)}</td></tr>" for a, b in HEAD]
    o += ["<tr><td class='k'>座　號</td><td>＿＿＿＿＿＿＿＿</td></tr></table>",
          "<div class='notice'>※注意：" + "".join(f"<div>{e(t)}</div>" for t in NOTICE) + "</div>",
          "<h2>一、申論題（30 分）</h2>", f"<p>{e(ESSAY_INTRO)}</p>"]
    o += [f"<p class='q'>{e(t)}</p>" for t in ESSAY]
    o += ["<h2>二、設計題（70 分）：「老幼共融社區韌性中心」規劃設計</h2>",
          "<h3>（一）計畫緣起</h3>"] + [f"<p>{e(t)}</p>" for t in ORIGIN]
    o += ["<h3>（二）基地概述（詳附圖）</h3><ol>"] + [f"<li>{e(t)}</li>" for t in SITE_TXT] + ["</ol>"]
    o += ["<h3>（三）都市設計準則（本題給定）</h3><ol>"] + [f"<li>{e(t)}</li>" for t in GUIDE] + ["</ol>"]
    o += ["<h3>（四）計畫內容</h3>", f"<div class='note'>{e(PROG_NOTE)}</div>",
          "<table class='prog'><tr><th>項目</th><th>面積／數量</th><th>說明</th></tr>"]
    o += [f"<tr><td class='n'>{i + 1}. {e(a)}</td><td class='n'>{e(b)}</td><td>{e(c)}</td></tr>"
          for i, (a, b, c) in enumerate(PROG)]
    o += ["</table>", "<h3>（五）圖說要求</h3><ol>"] + [f"<li>{e(t)}</li>" for t in DRAW] + ["</ol>"]
    o += ["<div class='figblk'><h3>附圖：基地圖（縮圖；A3 原寸 1/500 見最後一頁）</h3>",
          f"<div class='fig'><img src='{map_png_name}'></div>",
          "<div class='cap'>尺寸單位 M。座標原點為基地西北角（x 向東、y 向南）：歷史建築 x 6–42、y 6–16；"
          "樟樹 A（14, 28）、B（26, 31）、C（38, 28），樹冠直徑約 14 M。</div></div>",
          "</body></html>"]
    return "".join(o)


PRINT_JS = r"""
const { chromium } = require('playwright');
(async () => {
  const [, , a4html, a4pdf, a3html, a3pdf] = process.argv;
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://' + a4html, { waitUntil: 'load' });
  await p.pdf({ path: a4pdf, format: 'A4', printBackground: true, preferCSSPageSize: true,
    displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#555;">' +
      '115 模擬試題（本庫自擬・非官方）　第 <span class="pageNumber"></span> 頁</div>' });
  await p.goto('file://' + a3html, { waitUntil: 'load' });
  await p.pdf({ path: a3pdf, width: '420mm', height: '297mm', printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' } });
  await b.close();
})();
"""


def main():
    site_svg = build_site_map()
    zone_svg = build_zoning()
    p_site = os.path.join(HERE, "115-基地圖.svg")
    open(p_site, "w", encoding="utf-8").write(site_svg)
    subprocess.run(["rsvg-convert", "-w", "2400", p_site, "-o", os.path.join(HERE, "115-基地圖.png")], check=True)
    with tempfile.TemporaryDirectory() as t:
        pz = os.path.join(t, "zone.svg")
        open(pz, "w", encoding="utf-8").write(zone_svg)
        subprocess.run(["rsvg-convert", "-w", "2400", pz, "-o", os.path.join(HERE, "115-示範分區.png")], check=True)
        open(os.path.join(HERE, "115-模擬試題.md"), "w", encoding="utf-8").write(build_md())
        # PDF：A4 試題（Chromium）＋A3 原寸基地圖（Chromium，字型子集小）
        subprocess.run(["rsvg-convert", "-w", "1500", p_site, "-o", os.path.join(t, "map.png")], check=True)
        a4html = os.path.join(t, "exam.html")
        open(a4html, "w", encoding="utf-8").write(build_html("map.png"))
        a3html = os.path.join(t, "map.html")
        open(a3html, "w", encoding="utf-8").write(
            "<!doctype html><html><head><meta charset='utf-8'><style>@page{size:420mm 297mm;margin:0}"
            "html,body{margin:0;padding:0}svg{display:block}</style></head><body>" + site_svg + "</body></html>")
        js = os.path.join(t, "print.js")
        open(js, "w", encoding="utf-8").write(PRINT_JS)
        a4pdf, a3pdf = os.path.join(t, "a4.pdf"), os.path.join(t, "a3.pdf")
        subprocess.run(["node", js, a4html, a4pdf, a3html, a3pdf], check=True, cwd=t)
        subprocess.run(["pdfunite", a4pdf, a3pdf, os.path.join(HERE, "115-模擬試題.pdf")], check=True)
    print("A =", A, "｜B上限", A * 0.5, "｜F上限", A * 2.0, "｜D上限", A * 0.5)


if __name__ == "__main__":
    main()
