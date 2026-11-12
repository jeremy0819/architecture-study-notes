# -*- coding: utf-8 -*-
"""建築構造與施工｜115 年第二回模擬試題（考前預測卷）Word 版。

單一事實來源（改 markdown 重跑本檔即更新）：
  試題　建築構造與施工/07-115年第二回模擬試題.md（題幹後可接附圖或表格）
  詳解　建築構造與施工/08-115年第二回模擬試題詳解.md（§1 答案速查、§3 逐題解析）
附圖　建築構造與施工/img/mock2-q*.png：不存在或加 --redraw 時以 Pillow 重畫。
版面工具沿用 build_construction_mcq80.py。產生前核對：80 題四選項、答案速查＝各題詳解標題。

執行：python3 講義/build_construction_mock2.py [--redraw]
"""
import math
import os
import re
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_construction_mcq80 as g  # noqa: E402

from docx.enum.text import WD_ALIGN_PARAGRAPH  # noqa: E402
from docx.shared import Cm  # noqa: E402

SUBJ = os.path.join(g.ROOT, '建築構造與施工')
SRC_Q = os.path.join(SUBJ, '07-115年第二回模擬試題.md')
SRC_A = os.path.join(SUBJ, '08-115年第二回模擬試題詳解.md')
OUT = os.path.join(g.ROOT, '講義', '建築構造與施工_115第二回模擬試題.docx')
IMG = os.path.join(SUBJ, 'img')
FONT_CANDIDATES = (
    'C:/Windows/Fonts/msjh.ttc',
    '/System/Library/Fonts/PingFang.ttc',
    '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc',
    '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
)
NAVY, STEEL, BLUE, ORANGE, RED, INK = '#1F3B5C', '#5F6B7A', '#35617F', '#E67E22', '#C0392B', '#222222'
IMG_WIDTH_CM = {'mock2-q28-steel-joints.png': 16.4, 'mock2-q37-tile.png': 12.5, 'mock2-q72-network.png': 14.5}


# ---------------------------------------------------------------- 附圖
def _pil():
    from PIL import Image, ImageDraw, ImageFont
    path = next((p for p in FONT_CANDIDATES if os.path.exists(p)), None)
    if path is None:
        sys.exit('找不到中文字型，無法重繪附圖（可改用 repo 內既有圖檔）')
    return Image, ImageDraw, lambda size: ImageFont.truetype(path, size)


def _arrow(d, p1, p2, color=INK, width=5, head=22):
    d.line([p1, p2], fill=color, width=width)
    ang = math.atan2(p2[1] - p1[1], p2[0] - p1[0])
    d.polygon([p2,
               (p2[0] - head * math.cos(ang - 0.42), p2[1] - head * math.sin(ang - 0.42)),
               (p2[0] - head * math.cos(ang + 0.42), p2[1] - head * math.sin(ang + 0.42))], fill=color)


def draw_q28(path):
    """鋼梁端部四種接合：甲 剪力板、乙 雙角鋼、丙 托座、丁 翼板全滲透銲＋腹板螺栓"""
    Image, ImageDraw, f = _pil()
    W, H, pw = 2000, 720, 500
    img = Image.new('RGB', (W, H), 'white')
    d = ImageDraw.Draw(img)
    top, bot, t = 190, 430, 22                      # 梁上、下翼板位置與厚度

    def bolts(x, ys, r=11):
        for y in ys:
            d.ellipse([x - r, y - r, x + r, y + r], fill='white', outline=INK, width=4)

    for k, name in enumerate('甲乙丙丁'):
        x0 = k * pw + 40
        cx0, cx1 = x0, x0 + 46                      # 柱（翼板面）
        bx0 = cx1 + (0 if name == '丁' else 16)     # 梁端（丁緊貼柱面，其餘留間隙）
        bx1 = x0 + 400
        d.rectangle([cx0, 90, cx1, 560], fill=STEEL)
        d.rectangle([bx0, top, bx1, top + t], fill='#8A95A3')              # 上翼板
        d.rectangle([bx0, bot, bx1, bot + t], fill='#8A95A3')              # 下翼板
        d.rectangle([bx0, top + t, bx1, bot], fill='#EEF2F6', outline='#9AA5B1', width=2)  # 腹板
        if name == '甲':                             # 剪力板（銲於柱）＋腹板螺栓
            d.rectangle([cx1, 250, cx1 + 120, 392], fill='#C9D3DE', outline=INK, width=3)
            bolts(cx1 + 70, (275, 321, 367))
            d.text((cx1 + 140, 296), '剪力板', font=f(30), fill=INK)
        elif name == '乙':                           # 雙角鋼：一肢接腹板、一肢接柱
            d.rectangle([cx1, 240, cx1 + 26, 402], fill='#C9D3DE', outline=INK, width=3)
            d.rectangle([cx1, 240, cx1 + 120, 402], outline=INK, width=3)
            bolts(cx1 + 76, (268, 321, 374))
            for y in (268, 321, 374):
                d.line([cx1 - 14, y, cx1 + 26, y], fill=INK, width=5)
            d.text((cx1 + 140, 296), '角鋼', font=f(30), fill=INK)
        elif name == '丙':                           # 托座：僅下翼板螺栓
            d.polygon([(cx1, bot + t), (cx1 + 170, bot + t), (cx1 + 170, bot + t + 20), (cx1 + 24, bot + t + 110),
                       (cx1, bot + t + 110)], fill='#C9D3DE', outline=INK)
            for bx in (cx1 + 70, cx1 + 130):
                d.line([bx, bot - 12, bx, bot + t + 14], fill=INK, width=6)
                d.rectangle([bx - 11, bot - 18, bx + 11, bot - 8], fill=INK)
            d.text((cx1 + 190, bot + 46), '托座', font=f(30), fill=INK)
        else:                                        # 丁：翼板全滲透銲＋腹板剪力板螺栓
            for y in (top, bot):
                d.polygon([(cx1, y - 6), (cx1 + 30, y + t // 2), (cx1, y + t + 6)], fill=ORANGE)
            d.rectangle([cx1, 250, cx1 + 120, 392], fill='#C9D3DE', outline=INK, width=3)
            bolts(cx1 + 70, (275, 321, 367))
            d.text((cx1 + 46, top - 58), '全滲透銲', font=f(30), fill=ORANGE)
            d.text((cx1 + 46, bot + t + 16), '全滲透銲', font=f(30), fill=ORANGE)
        d.text((x0 + 4, 40), '柱', font=f(30), fill=INK)
        d.text((bx1 - 60, top - 46), '梁', font=f(30), fill=INK)
        d.text((x0 + 170, 600), f'（{name}）', font=f(46), fill=NAVY)
    d.text((40, 668), '○ 表示高強度螺栓；（甲）（乙）（丙）之梁翼板與柱之間留有間隙、未接合', font=f(28), fill='#555555')
    img.save(path, dpi=(220, 220))


def draw_q37(path):
    """外牆磁磚張貼剖面：砂漿塗於打底面與磁磚背面（改良式壓貼）"""
    Image, ImageDraw, f = _pil()
    img = Image.new('RGB', (1500, 760), 'white')
    d = ImageDraw.Draw(img)
    y0, y1 = 120, 640
    layers = [(80, 330, '#B9C1CB', '① 結構體（RC 外牆）'),
              (330, 420, '#DDD3C0', '② 底層粉刷（水泥砂漿打底）'),
              (420, 462, '#E9A95B', '③ 貼磁磚用砂漿：塗於打底面（厚 4～6 mm）'),
              (462, 492, '#F2C894', '④ 貼磁磚用砂漿：塗於磁磚背面（厚 3～4 mm）')]
    for xa, xb, fill, _ in layers:
        d.rectangle([xa, y0, xb, y1], fill=fill, outline=INK, width=2)
    for k in range(4):                                # ⑤ 磁磚四片
        ya = y0 + 8 + k * 128
        d.rectangle([492, ya, 548, ya + 112], fill='#8C4A3C', outline=INK, width=2)
    d.text((90, 60), '室內側', font=f(30), fill='#555555')
    d.text((470, 60), '室外側', font=f(30), fill='#555555')
    labels = [lay[3] for lay in layers] + ['⑤ 磁磚']
    anchors = [205, 375, 441, 477, 520]
    for k, (txt, ax) in enumerate(zip(labels, anchors)):
        ty = 150 + k * 100
        d.line([(ax, ty + 20), (640, ty + 20)], fill=INK, width=3)
        d.ellipse([ax - 7, ty + 13, ax + 7, ty + 27], fill=INK)
        d.text((656, ty), txt, font=f(32), fill=INK)
    d.text((80, 680), '外牆磁磚張貼工法剖面示意（未按比例）', font=f(30), fill='#555555')
    img.save(path, dpi=(220, 220))


def draw_q72(path):
    """施工網圖（節點式）：A3 B4 C5 D2 E6 F4 G3 H2"""
    Image, ImageDraw, f = _pil()
    img = Image.new('RGB', (1700, 700), 'white')
    d = ImageDraw.Draw(img)
    bw, bh = 190, 110
    pos = {'開始': (60, 295), 'A': (340, 130), 'B': (340, 460), 'C': (660, 60), 'D': (660, 260), 'E': (660, 460),
           'F': (980, 60), 'G': (980, 360), 'H': (1300, 210)}
    dur = {'A': 3, 'B': 4, 'C': 5, 'D': 2, 'E': 6, 'F': 4, 'G': 3, 'H': 2}
    edges = [('開始', 'A'), ('開始', 'B'), ('A', 'C'), ('A', 'D'), ('B', 'E'), ('C', 'F'), ('D', 'G'), ('E', 'G'),
             ('F', 'H'), ('G', 'H')]
    for a, b in edges:
        xa, ya = pos[a]
        xb, yb = pos[b]
        _arrow(d, (xa + bw, ya + bh // 2), (xb - 6, yb + bh // 2), color=STEEL)
    for name, (x, y) in pos.items():
        if name == '開始':
            d.rounded_rectangle([x, y, x + bw, y + bh], radius=50, fill='#EEF2F6', outline=NAVY, width=4)
            d.text((x + 52, y + 30), '開始', font=f(42), fill=NAVY)
        else:
            d.rectangle([x, y, x + bw, y + bh], fill='white', outline=NAVY, width=5)
            d.text((x + 22, y + 26), name, font=f(52), fill=NAVY)
            d.text((x + 86, y + 34), f'{dur[name]} 日', font=f(40), fill=INK)
    xh, yh = pos['H']
    _arrow(d, (xh + bw, yh + bh // 2), (xh + bw + 110, yh + bh // 2), color=STEEL)
    d.text((xh + bw + 20, yh + bh // 2 + 16), '完成', font=f(36), fill=NAVY)
    d.text((60, 630), '箭線表示作業之先後關係；方框內為作業名稱及工期', font=f(30), fill='#555555')
    img.save(path, dpi=(220, 220))


FIGURES = {'mock2-q28-steel-joints.png': draw_q28, 'mock2-q37-tile.png': draw_q37, 'mock2-q72-network.png': draw_q72}


# ---------------------------------------------------------------- 解析
IMG_LINE = re.compile(r'^!\[([^\]]*)\]\(([^)]+)\)$')


def parse_paper(md):
    body = g.between(md, '## 測驗題', '## 測驗答案卡')
    heads = list(g.Q_HEAD.finditer(body))
    out = []
    for k, m in enumerate(heads):
        n = int(m.group(1))
        block = body[m.end(): heads[k + 1].start() if k + 1 < len(heads) else len(body)]
        extras, table = [], []
        for ln in block.split('\n'):
            ln = ln.rstrip()
            im = IMG_LINE.match(ln)
            if im:
                extras.append(('img', im.group(2), im.group(1)))
            elif ln.startswith('|'):
                cells = [c.strip() for c in ln.strip('|').split('|')]
                if not all(re.fullmatch(r':?-{2,}:?', c) for c in cells if c):
                    table.append(cells)
            elif table:
                extras.append(('table', table))
                table = []
        if table:
            extras.append(('table', table))
        out.append((n, m.group(2).strip(), extras, g.parse_options(block, n)))
    return out


def main():
    os.makedirs(IMG, exist_ok=True)
    for name, fn in FIGURES.items():
        if '--redraw' in sys.argv or not os.path.exists(os.path.join(IMG, name)):
            fn(os.path.join(IMG, name))
            print('drew', name)

    md_q, md_a = g.read(SRC_Q), g.read(SRC_A)
    paper = parse_paper(md_q)
    if [q[0] for q in paper] != list(range(1, 81)):
        sys.exit(f'07 題號不完整：{[q[0] for q in paper]}')
    answers = g.parse_answers(md_a)
    heads = g.explanation_heads(md_a)
    if len(answers) != 80 or sorted(heads) != list(range(1, 81)):
        sys.exit(f'答案或詳解數量不符：答案 {len(answers)}、詳解 {len(heads)}')
    bad = [n for n in range(1, 81) if heads[n] != answers[n - 1]]
    if bad:
        sys.exit(f'答案速查與詳解標題不一致：{bad}')

    sec = g.sec
    hp = sec.header.paragraphs[0]
    hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    g.font(hp.add_run('115 建築師｜建築構造與施工 第二回模擬試題（考前預測卷）｜AI 編擬，非考選部試題'), 8, color=g.GRAY)
    fp = sec.footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    g.font(fp.add_run('第 '), 8.5, color=g.GRAY)
    g.add_field(fp, 'PAGE', 8.5)
    g.font(fp.add_run(' 頁，共 '), 8.5, color=g.GRAY)
    g.add_field(fp, 'NUMPAGES', 8.5)
    g.font(fp.add_run(' 頁'), 8.5, color=g.GRAY)

    g.para('115 年專門職業及技術人員高等考試建築師考試（第二回模擬）', 13.5, bold=True, color=g.NAVY,
           align=WD_ALIGN_PARAGRAPH.CENTER, after=2)
    g.para('建築構造與施工｜考前預測卷', 12.5, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, after=6)
    info = g.fixed_table([['類　科', '建築師', '科　目', '建築構造與施工'],
                          ['考試時間', '2 小時', '座　號', '']],
                         [2.3, 6.4, 2.3, 6.4], header=False, size=10, height_cm=0.7)
    for row in info.rows:
        for j in (0, 2):
            g.shade(row.cells[j], 'E4EAF0')
            for r in row.cells[j].paragraphs[0].runs:
                r.font.bold, r.font.color.rgb = True, g.NAVY
    g.quote_box([
        '※注意：（一）本試題為單一選擇題，請選出一個正確或最適當答案，複選作答者，該題不予計分。',
        '（二）本科目共 80 題，每題 1.25 分。禁止使用電子計算器。',
        '（三）作答方式：在題號後的（　）內填入答案，或填寫文末答案卡；也可以把 80 個字母依序傳給 Claude 對答案。',
        '（四）本卷為 AI 依 108–114 年原卷出題方式與個人弱項編擬之預測卷，非考選部試題，亦不保證命中。',
    ], size=9.5, fill='F2F4F6')

    for n, stem, extras, opts in paper:
        g.render_stem(n, stem, blank=True)
        for ex in extras:
            if ex[0] == 'img':
                name = os.path.basename(ex[1])
                g.doc.add_picture(os.path.join(SUBJ, ex[1]), width=Cm(IMG_WIDTH_CM.get(name, 14.0)))
                pic = g.doc.paragraphs[-1]
                pic.alignment = WD_ALIGN_PARAGRAPH.CENTER
                pic.paragraph_format.keep_with_next = True
            else:
                rows = ex[1]
                widths = [5.2] + [(g.TEXT_W - g.Q_INDENT - 5.2 - 2.0) / (len(rows[0]) - 1)] * (len(rows[0]) - 1)
                t = g.fixed_table(rows, widths, header=True, size=10, center=False)
                for row in t.rows:
                    for cell in row.cells[1:]:
                        cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        g.render_options(opts)

    g.page_break()
    g.bar('測驗答案卡（共 80 題，每題 1.25 分）', 1)
    g.para('姓名：＿＿＿＿＿　日期：＿＿＿＿　用時：＿＿＿ 分鐘　答對：＿＿＿ 題　得分：＿＿＿ 分', 10, after=6)
    g.number_grid()
    g.para('計分：答對題數 × 1.25 分。作答完畢再翻閱後面的解答與詳解。', 9.5, color=g.GRAY, before=4)

    g.page_break()
    g.bar('解答與詳解', 1)
    g.para('以下為解答，請完成作答後再翻閱。', 10, bold=True, color=g.RED, after=4)
    g.bar('答案速查', 2)
    g.number_grid(answers, label='答案')
    g.render_md(g.between(md_a, '## 2.'))

    cp = g.doc.core_properties
    cp.title = '115 年建築師 建築構造與施工 第二回模擬試題（考前預測卷）'
    cp.subject = '建築構造與施工'
    cp.author = 'architecture-study-notes（AI 協作編擬）'
    cp.keywords = '建築師, 建築構造與施工, 模擬試題, 第二回'
    g.doc.save(OUT)
    neg = sum(bool(re.search(r'錯誤|不適當|不是|不包括|非屬|不屬於|不符合', q[1])) for q in paper)
    print('saved', OUT, '| questions 80 | answers ok | 否定題', neg)


if __name__ == '__main__':
    main()
