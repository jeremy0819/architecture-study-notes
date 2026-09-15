# -*- coding: utf-8 -*-
"""考場大圖生成引擎（A1 橫式・可校核線稿）
版面：左 22% 四等格｜中 52% 主配置＋剖面｜右 26% 申論
座標：基地以公尺定義，引擎自動擬合到中欄畫框。不得由生成端改寫基地條件。
"""
from math import hypot

MM = 1.0
W, H = 841.0, 594.0            # A1 橫式 (mm)
M = 6.0
L_X, L_W = M, 180.0            # 左欄
C_X, C_W = 192.0, 430.0        # 中欄
R_X, R_W = 628.0, 207.0        # 右欄
TOP = M

INK   = "#1a1a1a"
GREY  = "#8a8a8a"
LGREY = "#e8e6e2"
RED   = "#c0392b"
BLUE  = "#2f6f9f"
GREEN = "#4a7a3a"
TAN   = "#b8860b"

class SVG:
    def __init__(s):
        s.o = []
        s.o.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}mm" height="{H}mm" '
                   f'viewBox="0 0 {W} {H}" font-family="Noto Sans CJK TC, Microsoft JhengHei, sans-serif">')
        s.o.append('<defs>'
          '<pattern id="tree" width="3.2" height="3.2" patternUnits="userSpaceOnUse">'
          '<circle cx="1.6" cy="1.6" r="1.25" fill="#dbead0" stroke="#6f9b5c" stroke-width="0.22"/></pattern>'
          '<pattern id="plaza" width="2.6" height="2.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
          '<line x1="0" y1="0" x2="0" y2="2.6" stroke="#e0c079" stroke-width="0.55"/></pattern>'
          '<pattern id="water" width="3" height="3" patternUnits="userSpaceOnUse">'
          '<path d="M0,1.5 q0.75,-0.9 1.5,0 t1.5,0" fill="none" stroke="#8fc3e3" stroke-width="0.3"/></pattern>'
          '</defs>')
        s.o.append(f'<rect width="{W}" height="{H}" fill="#ffffff"/>')
    def raw(s, x): s.o.append(x)
    def rect(s,x,y,w,h,**k): s.o.append(f'<rect x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}" {_a(k)}/>')
    def line(s,x1,y1,x2,y2,**k): s.o.append(f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" {_a(k)}/>')
    def poly(s,pts,**k):
        p=" ".join(f"{a:.2f},{b:.2f}" for a,b in pts)
        s.o.append(f'<polygon points="{p}" {_a(k)}/>')
    def path(s,d,**k): s.o.append(f'<path d="{d}" {_a(k)}/>')
    def circ(s,x,y,r,**k): s.o.append(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{r:.2f}" {_a(k)}/>')
    def txt(s,x,y,t,sz=3.0,fill=INK,anchor="start",weight="normal",rot=0,op=1):
        tr=f' transform="rotate({rot} {x:.2f} {y:.2f})"' if rot else ''
        s.o.append(f'<text x="{x:.2f}" y="{y:.2f}" font-size="{sz}" fill="{fill}" text-anchor="{anchor}" '
                   f'font-weight="{weight}" opacity="{op}"{tr}>{_esc(t)}</text>')
    def save(s,p):
        s.o.append('</svg>')
        open(p,'w',encoding='utf-8').write("\n".join(s.o))

def _a(k): return ' '.join(f'{a.replace("_","-")}="{v}"' for a,v in k.items())
def _esc(t): return str(t).replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')

# ---------- 版面骨架 ----------
def frame(s, year, title, subtitle):
    s.rect(L_X,TOP,L_W,H-2*M, fill="none", stroke=GREY, stroke_width=0.3)
    s.rect(C_X,TOP,C_W,H-2*M, fill="none", stroke=GREY, stroke_width=0.3)
    s.rect(R_X,TOP,R_W,H-2*M, fill="none", stroke=GREY, stroke_width=0.3)
    s.rect(R_X,TOP,R_W,26, fill="#f4f1ea", stroke=GREY, stroke_width=0.3)
    s.txt(R_X+R_W/2, TOP+13, title, 12.5, INK, "middle", "bold")
    s.txt(R_X+R_W/2, TOP+21, subtitle, 3.6, "#555", "middle")
    s.txt(L_X+2, TOP+H-2*M-1.5, f"{year} 年 敷地計畫與都市設計 80150｜考場版線稿（可校核）", 2.5, GREY)

def cell(s, i, head):
    """左欄四等格；回傳 (x,y,w,h) 內容區"""
    ch=(H-2*M)/4.0
    y=TOP+i*ch
    s.line(L_X,y,L_X+L_W,y, stroke=GREY, stroke_width=0.3)
    s.rect(L_X+1.5,y+1.5,L_W-3,7, fill="#2c3e50")
    s.txt(L_X+3.5,y+6.6, head, 4.0, "#fff", weight="bold")
    return (L_X+3, y+11, L_W-6, ch-13)

# ---------- 基地擬合 ----------
class Fit:
    """把公尺座標擬合到指定畫框（等比、留邊）"""
    def __init__(s, box, extent):
        bx,by,bw,bh = box
        x0,y0,x1,y1 = extent
        sx=(bw-6)/(x1-x0); sy=(bh-6)/(y1-y0)
        s.k=min(sx,sy)
        s.ox = bx+3 + ((bw-6)-(x1-x0)*s.k)/2 - x0*s.k
        s.oy = by+3 + ((bh-6)-(y1-y0)*s.k)/2 - y0*s.k
    def X(s,m): return s.ox+m*s.k
    def Y(s,m): return s.oy+m*s.k
    def P(s,pts): return [(s.X(a),s.Y(b)) for a,b in pts]
    def L(s,m): return m*s.k          # 長度換算
    def scale_str(s):
        # 1mm 圖 = 1/k 公尺 → 比例 1:(1000/k)
        return f"1 : {round(1000/s.k/10)*10:,}"

def scalebar(s, fit, x, y, seg=20, n=4):
    for i in range(n):
        s.rect(x+i*fit.L(seg), y, fit.L(seg), 1.4,
               fill=INK if i%2==0 else "#fff", stroke=INK, stroke_width=0.2)
    for i in range(n+1):
        s.txt(x+i*fit.L(seg), y+4.2, str(i*seg), 2.4, INK, "middle")
    s.txt(x+n*fit.L(seg)/2, y+8.0, f"公尺　S＝{fit.scale_str()}", 2.6, INK, "middle")

def north(s, x, y, r=5, rot=0):
    s.raw(f'<g transform="translate({x:.2f},{y:.2f}) rotate({rot})">'
          f'<path d="M0,{-r} L{r*0.36},{r*0.42} L0,{r*0.1} L{-r*0.36},{r*0.42} Z" fill="{INK}"/>'
          f'<text x="0" y="{r+3.6}" font-size="3.4" text-anchor="middle" font-weight="bold">N</text></g>')

def checktable(s, x, y, w, rows, title="法規檢核表"):
    rh=4.6; n=len(rows)
    s.rect(x,y,w,rh*(n+1), fill="#fff", stroke=INK, stroke_width=0.4)
    s.rect(x,y,w,rh, fill="#2c3e50")
    for i,lab in enumerate(["項目","法定","本案",""]):
        s.txt(x+w*[0.03,0.40,0.66,0.93][i], y+rh-1.4, lab, 2.6, "#fff", weight="bold")
    for j,(a,b,c,ok) in enumerate(rows):
        yy=y+rh*(j+1)
        s.line(x,yy,x+w,yy, stroke="#ccc", stroke_width=0.2)
        s.txt(x+w*0.03, yy+rh-1.4, a, 2.5)
        s.txt(x+w*0.40, yy+rh-1.4, b, 2.5, "#555")
        s.txt(x+w*0.66, yy+rh-1.4, c, 2.5, INK, weight="bold")
        s.txt(x+w*0.93, yy+rh-1.4, ok, 2.8, GREEN if ok=="✓" else RED, weight="bold")
    s.txt(x, y-1.4, title, 2.9, INK, weight="bold")
    return y+rh*(n+1)

def leader(s, x1,y1, x2,y2, text, sz=2.5, col=INK, anchor="start", weight="normal"):
    """引線標註：名詞－效益"""
    s.line(x1,y1,x2,y2, stroke=col, stroke_width=0.25)
    s.circ(x1,y1,0.55, fill=col)
    dx = 1.2 if anchor=="start" else -1.2
    s.txt(x2+dx, y2+0.9, text, sz, col, anchor, weight)

def bullets(s, x, y, items, sz=2.75, lh=4.0, col=INK, w=None):
    for i,t in enumerate(items):
        s.txt(x, y+i*lh, t, sz, col)
    return y+len(items)*lh
