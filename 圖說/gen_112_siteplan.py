# -*- coding: utf-8 -*-
"""112 年 公益教育研修中心｜全區配置圖 按比例示意（SVG）
座標系：原點＝基地西北角，x→東，y→南，單位公尺。
幾何依考選部 112 原題正文與附圖：基地 120×70；西30M(上有高架約10M高)、南20M、北15M、東10M；
水圳虛線自北邊 x≈80 斜向南邊 x≈65；東北角既有樹木群。
"""
import math

S = 3.2                     # 1 公尺 = S px
def X(m): return (PAD + m) * S
def Y(m): return (PAD + m) * S
PAD = 34                    # 基地外四周留設的 context 寬度(公尺)

W_CTX, H_CTX = 120 + 2*PAD, 70 + 2*PAD
WPX, HPX = W_CTX * S, H_CTX * S

# --- 水圳：北邊 x=80 → 南邊 x=65 ---
def canal_x(y): return 80 + (65 - 80) * (y / 70.0)
CANAL_HALF = 6              # 疑似範圍半寬(方案值)

out = []
A = out.append
A(f'<svg xmlns="http://www.w3.org/2000/svg" width="{WPX:.0f}" height="{HPX:.0f}" '
  f'viewBox="0 0 {WPX:.0f} {HPX:.0f}" font-family="Noto Sans CJK TC, Microsoft JhengHei, sans-serif">')
A('<defs>'
  '<pattern id="tree" width="8" height="8" patternUnits="userSpaceOnUse">'
  '<circle cx="4" cy="4" r="3.2" fill="#cfe3c4" stroke="#6f9b5c" stroke-width="0.7"/></pattern>'
  '<pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
  '<line x1="0" y1="0" x2="0" y2="6" stroke="#d9a441" stroke-width="1.6"/></pattern>'
  '<marker id="arw" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">'
  '<path d="M0,0 L7,3.5 L0,7 z" fill="#c0392b"/></marker>'
  '</defs>')
A(f'<rect width="{WPX}" height="{HPX}" fill="#fdfdfb"/>')

def rect(x,y,w,h,**k):
    at = ' '.join(f'{a.replace("_","-")}="{v}"' for a,v in k.items())
    A(f'<rect x="{X(x):.1f}" y="{Y(y):.1f}" width="{w*S:.1f}" height="{h*S:.1f}" {at}/>')
def line(x1,y1,x2,y2,**k):
    at = ' '.join(f'{a.replace("_","-")}="{v}"' for a,v in k.items())
    A(f'<line x1="{X(x1):.1f}" y1="{Y(y1):.1f}" x2="{X(x2):.1f}" y2="{Y(y2):.1f}" {at}/>')
def txt(x,y,s,size=8,fill="#222",anchor="start",weight="normal",rot=0):
    tr = f' transform="rotate({rot} {X(x):.1f} {Y(y):.1f})"' if rot else ''
    A(f'<text x="{X(x):.1f}" y="{Y(y):.1f}" font-size="{size}" fill="{fill}" '
      f'text-anchor="{anchor}" font-weight="{weight}"{tr}>{s}</text>')

# ================= 道路（基地外） =================
rect(-30,-15,30,100, fill="#eceae6")                      # 西 30M
rect(120,-15,10,100, fill="#eceae6")                      # 東 10M
rect(-30,-15,160,15, fill="#eceae6")                      # 北 15M
rect(-30,70,160,20, fill="#eceae6")                       # 南 20M
for x,y,s_,r in [(-15,58,"30 M 道路",90),(125,58,"10 M 道路",90),(55,-6,"15 M 道路",0),(55,83,"20 M 道路",0)]:
    txt(x,y,s_,8.5,"#555","middle",rot=r)

# 高架道路（西側上方，約10M高）
rect(-26,-15,10,100, fill="none", stroke="#8a8a8a", stroke_width=1.6, stroke_dasharray="7 4")
txt(-21,30,"高架道路（約 10 M 高）", 8.5, "#8a8a8a", "middle", "bold", rot=90)
txt(-21,52,"噪音・震動極明顯", 7.5, "#c0392b", "middle", rot=90)

# 對街涵構
txt(-34,-19,"商業區 12–15F（1–2F 餐廳商店）",7.5,"#777")
txt(46,88,"商業區 12F（1F 餐廳）",7.5,"#777")
txt(126,-19,"商業區／住宅區",7.5,"#777")
rect(18,-32,36,17, fill="#dcecd2", stroke="#6f9b5c", stroke_width=1)
txt(36,-22,"鄰里公園（基地外）",8,"#4a7a3a","middle","bold")
txt(36,-13.5,"隔 15M 道路・借景不計入基地",7,"#c0392b","middle")
txt(78,-19,"住宅區 7–9F",7.5,"#777")

# ================= 基地 =================
rect(0,0,120,70, fill="#ffffff", stroke="#111", stroke_width=2.4)
txt(2,-2.5,"基地 120 M × 70 M ＝ 8,400 ㎡〔題目給定〕",9,"#111",weight="bold")

# 疑似水圳帶
pts_l = " ".join(f"{X(canal_x(y)-CANAL_HALF):.1f},{Y(y):.1f}" for y in range(0,71,7))
pts_r = " ".join(f"{X(canal_x(y)+CANAL_HALF):.1f},{Y(y):.1f}" for y in reversed(range(0,71,7)))
A(f'<polygon points="{pts_l} {pts_r}" fill="#e7f0f7" stroke="#4a86b8" stroke-width="1.2" stroke-dasharray="8 5"/>')
line(80,0,65,70, stroke="#2f6f9f", stroke_width=2, stroke_dasharray="11 6")
txt(74,36,"疑似水圳遺址帶",8.5,"#2f6f9f","middle","bold",rot=-78)
txt(79,36,"優先避挖・調查確認後調整",7,"#2f6f9f","middle",rot=-78)
txt(80,-4.5,"約80M",7,"#2f6f9f","middle"); txt(65,75,"約65M",7,"#2f6f9f","middle")

# 東北角既有樹木群
A(f'<ellipse cx="{X(104):.1f}" cy="{Y(13):.1f}" rx="{15*S:.1f}" ry="{11*S:.1f}" fill="url(#tree)" stroke="#6f9b5c" stroke-width="1.2"/>')
txt(104,13,"既有樹木群",8,"#3f6b32","middle","bold")
txt(104,18,"原地保留（題目給定）",7,"#3f6b32","middle")

# ================= 量體（方案） =================
BLK = [
 (10, 8,46,24,"A 棟　圖書館＋演講廳","3F・對外開放","#f4e3c8"),
 (10,40,30,24,"C 棟　會議室＋住宿＋辦公","4F・公司專用","#e6d7ea"),
 (88,38,28,26,"B 棟　多目的（2 羽球場）＋健身","2F・淨高 6.1M","#d9e6f2"),
]
for x,y,w,h,n1,n2,c in BLK:
    rect(x,y,w,h, fill=c, stroke="#333", stroke_width=1.6)
    txt(x+w/2,y+h/2-1.5,n1,8.5,"#222","middle","bold")
    txt(x+w/2,y+h/2+4.5,n2,7.5,"#555","middle")

# 開放空間
A(f'<ellipse cx="{X(66):.1f}" cy="{Y(46):.1f}" rx="{14*S:.1f}" ry="{12*S:.1f}" fill="url(#hatch)" opacity="0.5"/>')
txt(66,45,"中央廣場",8.5,"#8a6a1f","middle","bold")
txt(66,50,"水圳記憶軸核心節點",7,"#8a6a1f","middle")
rect(46,4,22,10, fill="#f7efdc", stroke="#d9a441", stroke_width=1)
txt(57,10,"北側入口廣場",7.5,"#8a6a1f","middle")

# 地下開挖範圍（避開水圳帶與樹群）
A(f'<path d="M {X(6):.1f} {Y(6):.1f} L {X(56):.1f} {Y(6):.1f} L {X(56):.1f} {Y(64):.1f} '
  f'L {X(6):.1f} {Y(64):.1f} Z" fill="none" stroke="#c0392b" stroke-width="2.2" stroke-dasharray="9 5"/>')
txt(8,62,"地下開挖範圍（粗虛線）",8,"#c0392b",weight="bold")
txt(8,66,"避開疑似水圳帶與東北樹群",7,"#c0392b")

# 出入口
for x,y,lab,col in [(120,50,"主要人行出入口","#c0392b"),(30,70,"次要人行出入口","#c0392b"),
                    (0,58,"地下停車場出入口","#2f6f9f"),(0,30,"服務・卸貨出入口","#555")]:
    A(f'<circle cx="{X(x):.1f}" cy="{Y(y):.1f}" r="5" fill="{col}"/>')
    ax = -1 if x>60 else 1
    txt(x+ax*4, y-3, lab, 7.5, col, "end" if x>60 else "start", "bold")

# 剖面線
line(-30,34,130,34, stroke="#111", stroke_width=1.6, stroke_dasharray="14 5 4 5")
txt(-32,33,"A",10,"#111","middle","bold"); txt(132,33,"A'",10,"#111","middle","bold")
line(52,-15,52,90, stroke="#111", stroke_width=1.6, stroke_dasharray="14 5 4 5")
txt(52,-17,"B",10,"#111","middle","bold"); txt(52,93,"B'",10,"#111","middle","bold")

# 指北 + 比例尺
A(f'<g transform="translate({X(112):.1f},{Y(-26):.1f})">'
  f'<path d="M0,-16 L5,6 L0,1 L-5,6 Z" fill="#111"/><text x="0" y="17" font-size="9" '
  f'text-anchor="middle" font-weight="bold">N</text></g>')
sx, sy = X(-28), Y(84)
for i in range(4):
    A(f'<rect x="{sx+i*10*S:.1f}" y="{sy:.1f}" width="{10*S:.1f}" height="5" '
      f'fill="{"#111" if i%2==0 else "#fff"}" stroke="#111" stroke-width="0.7"/>')
for i,v in enumerate(["0","10","20","30","40"]):
    A(f'<text x="{sx+i*10*S:.1f}" y="{sy+14:.1f}" font-size="7.5" text-anchor="middle">{v}</text>')
A(f'<text x="{sx+21*S:.1f}" y="{sy+25:.1f}" font-size="8">公尺　本圖為按比例示意（非手繪成果）</text>')

A('</svg>')
open('/home/user/architecture-study-notes/圖說/112_全區配置圖_示意.svg','w',encoding='utf-8').write("\n".join(out))
print("saved: 圖說/112_全區配置圖_示意.svg")
print(f"畫布 {WPX:.0f}×{HPX:.0f}px　基地 120×70M　水圳 北x=80→南x=65")
