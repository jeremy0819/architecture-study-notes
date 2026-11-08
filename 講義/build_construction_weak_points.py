# -*- coding: utf-8 -*-
"""建築構造與施工｜弱項重點整理 Word 版。

單一事實來源：建築構造與施工/05-弱項重點整理.md（改 markdown 重跑本檔即更新）
版面工具沿用 build_construction_mcq80.py（色帶標題、表格欄寬、引用框）。
排版：§0 速記卡獨立成第 1 頁；§6 自我檢測解答另起一頁。

附圖：建築構造與施工/img/箱型柱接頭示意.png（不存在或加 --redraw 時以 Pillow 重畫）。

執行：python3 講義/build_construction_weak_points.py [--redraw]
"""
import os
import re
import sys

sys.dont_write_bytecode = True            # 匯入版面工具時不在 repo 內留下 __pycache__
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_construction_mcq80 as g  # noqa: E402

from docx.enum.table import WD_TABLE_ALIGNMENT  # noqa: E402
from docx.enum.text import WD_ALIGN_PARAGRAPH  # noqa: E402
from docx.shared import Cm, Pt  # noqa: E402

SRC = os.path.join(g.ROOT, '建築構造與施工', '05-弱項重點整理.md')
OUT = os.path.join(g.ROOT, '講義', '建築構造與施工_弱項重點整理.docx')
FIG = os.path.join(g.ROOT, '建築構造與施工', 'img', '箱型柱接頭示意.png')
PAGE_BREAK_BEFORE = ('## 1.', '## 6.')
MONO = 'Consolas'
HEAD_NUM = re.compile(r'^\d+(\.\d+)*\.?\s+')
FONT_CANDIDATES = (
    'C:/Windows/Fonts/msjh.ttc',                         # Windows 微軟正黑體
    '/System/Library/Fonts/PingFang.ttc',                 # macOS
    '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc',       # Linux 文泉驛正黑
    '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
)


def draw_box_column(path):
    """箱型柱梁柱接頭立面剖面示意（Pillow 繪製；圖檔不存在或加 --redraw 時才重畫）"""
    import math
    from PIL import Image, ImageDraw, ImageFont

    font_path = next((p for p in FONT_CANDIDATES if os.path.exists(p)), None)
    if font_path is None:
        sys.exit('找不到中文字型，無法重繪示意圖（可改用 repo 內既有圖檔）')

    def f(size):
        return ImageFont.truetype(font_path, size)

    navy, steel, blue, orange, red = '#1F3B5C', '#5F6B7A', '#35617F', '#E67E22', '#C0392B'
    img = Image.new('RGB', (1700, 930), 'white')
    d = ImageDraw.Draw(img)

    def arrow(x1, y1, x2, y2, color, width=7, head=26):
        d.line([(x1, y1), (x2, y2)], fill=color, width=width)
        ang = math.atan2(y2 - y1, x2 - x1)
        d.polygon([(x2, y2),
                   (x2 - head * math.cos(ang - 0.45), y2 - head * math.sin(ang - 0.45)),
                   (x2 - head * math.cos(ang + 0.45), y2 - head * math.sin(ang + 0.45))], fill=color)

    d.text((40, 24), '箱型柱梁柱接頭（立面剖面示意）', font=f(44), fill=navy)
    top, bot, t = 330, 610, 32                       # 上、下翼板高程與板厚（px）
    lx0, lx1, rx0, rx1 = 880, 912, 1248, 1280        # 左、右柱板
    d.rectangle([140, top + t, lx0, bot], fill='#E9EEF3', outline='#9AA5B1', width=2)   # 梁腹板
    for y in (top, bot):
        d.rectangle([140, y, lx0, y + t], fill=steel)                                 # 梁翼板
        d.rectangle([lx1, y, rx0, y + t], fill=blue)                                  # 內隔板
        d.polygon([(lx0 - 38, y), (lx0, y), (lx0, y + t)], fill=orange)               # CJP 銲道
        for x in (lx1, rx0):
            d.rectangle([x - 7, y - 4, x + 7, y + t + 4], fill=orange)                # ESW 銲道
        d.rectangle([lx0 - 10, y - 14, lx1 + 10, y + t + 14], outline=red, width=5)   # 板厚方向受拉區
    d.rectangle([lx0, 110, lx1, 880], fill=steel)
    d.rectangle([rx0, 110, rx1, 880], fill=steel)

    arrow(840, top - 40, 610, top - 40, red)
    d.text((440, top - 62), '梁翼拉力', font=f(34), fill=red)
    d.text((380, 128), '柱板在此沿「板厚方向」受拉', font=f(34), fill=red)
    d.text((380, 174), '→ 層狀撕裂風險', font=f(34), fill=red)
    d.line([(850, 152), (lx0 + 4, top - 16)], fill=red, width=4)

    d.text((1310, 120), '① 箱型柱柱板', font=f(38), fill=navy)
    d.text((1310, 170), 'SN490C', font=f(32), fill=navy)
    d.text((1310, 210), '（保證板厚方向性能）', font=f(30), fill=navy)
    d.text((1310, top - 6), '② 內隔板', font=f(38), fill=blue)
    d.text((1310, top + 42), '與梁翼同高同厚', font=f(30), fill=blue)
    d.text((1310, top + 80), 'ESW 由柱外立向', font=f(30), fill=orange)
    d.text((1310, top + 116), '一次銲接', font=f(30), fill=orange)
    d.text((260, 430), '③ H 型鋼梁', font=f(38), fill=navy)
    d.text((260, 482), '翼板與柱板：CJP 全滲透銲', font=f(30), fill=navy)
    d.text((260, 522), '起弧板＋背墊板；UT 檢測', font=f(30), fill=navy)
    d.text((40, 872), '橘色＝銲道（CJP、ESW）　紅框＝柱板受板厚方向拉力處', font=f(28), fill='#666666')

    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, dpi=(200, 200))
    print('drew', path)


def code_box(lines):
    """等寬字圖（ASCII 示意圖）：四種字型槽一律等寬字，避免框線字被當成全形"""
    t = g.doc.add_table(rows=1, cols=1)
    t.style = 'Table Grid'
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    c = t.rows[0].cells[0]
    g.shade(c, 'F2F4F6')
    for k, ln in enumerate(lines):
        p = c.paragraphs[0] if k == 0 else c.add_paragraph()
        g.spacing(p, 0, 0, 1.0)
        r = p.add_run(ln.replace('\t', '    ') or ' ')
        r.font.size = Pt(9)
        r.font.name = MONO
        rf = r._element.get_or_add_rPr().get_or_add_rFonts()
        for a in ('w:ascii', 'w:hAnsi', 'w:eastAsia', 'w:cs'):
            rf.set(g.qn(a), MONO)
    gap = g.doc.add_paragraph()
    g.spacing(gap, 0, 3)


def render(md):
    body = re.sub(r'\A---\n.*?\n---\n', '', md, flags=re.S)   # 去掉 YAML frontmatter
    buf_q, buf_t, buf_c, in_code = [], [], [], False
    first_h2 = True

    def flush():
        nonlocal buf_q, buf_t
        if buf_q:
            g.quote_box(buf_q, size=9.5)
            buf_q = []
        if buf_t:
            g.md_table(buf_t, size=9.0)
            buf_t = []

    for raw in body.split('\n'):
        ln = raw.rstrip()
        if ln.startswith('```'):
            if in_code:
                code_box(buf_c)
                buf_c, in_code = [], False
            else:
                flush()
                in_code = True
            continue
        if in_code:
            buf_c.append(ln)
            continue
        if ln.startswith('|'):
            if buf_q:
                g.quote_box(buf_q, size=9.5)
                buf_q = []
            cells = [c.strip() for c in ln.strip('|').split('|')]
            if not all(re.fullmatch(r':?-{2,}:?', c) for c in cells if c):
                buf_t.append(cells)
            continue
        if ln.startswith('>'):
            if buf_t:
                g.md_table(buf_t, size=9.0)
                buf_t = []
            if ln[1:].strip():
                buf_q.append(ln[1:].strip())
            continue
        flush()
        if not ln.strip() or re.fullmatch(r'-{3,}', ln):
            continue
        m = re.match(r'^!\[([^\]]*)\]\(([^)]+)\)$', ln)
        if m:
            g.doc.add_picture(os.path.join(os.path.dirname(SRC), m.group(2)), width=Cm(15.5))
            g.doc.paragraphs[-1].alignment = WD_ALIGN_PARAGRAPH.CENTER
            g.para(m.group(1), 8.5, color=g.GRAY, align=WD_ALIGN_PARAGRAPH.CENTER, after=4)
            continue
        m = re.match(r'^(#{1,4}) (.+)$', ln)
        if m:
            level, text = len(m.group(1)), m.group(2).strip()
            if level == 1:
                g.para(text, 15, bold=True, color=g.NAVY, align=WD_ALIGN_PARAGRAPH.CENTER, after=6)
            elif level == 2:
                if not first_h2 and ln.startswith(PAGE_BREAK_BEFORE):
                    g.page_break()
                first_h2 = False
                g.bar(text, 1)
            elif level == 3:
                g.bar(HEAD_NUM.sub('', text), 2)
            else:
                g.sub_heading(text)
            continue
        m = re.match(r'^(\s*)[-*] (.+)$', ln)
        if m:
            depth = len(m.group(1)) // 2
            g.para('・' + m.group(2), 10, indent=0.3 + 0.55 * depth, hanging=0.45, after=2.5)
            continue
        m = re.match(r'^(\s*)(\d+)\. (.+)$', ln)
        if m:
            depth = len(m.group(1)) // 2
            g.para(f'{m.group(2)}. {m.group(3)}', 10, indent=0.3 + 0.55 * depth, hanging=0.55, after=2.5)
            continue
        g.para(ln.strip(), 10)
    flush()


def main():
    if '--redraw' in sys.argv or not os.path.exists(FIG):
        draw_box_column(FIG)
    hp = g.sec.header.paragraphs[0]
    hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    g.font(hp.add_run('115 建築師｜建築構造與施工 弱項重點整理｜依 80 題模擬卷錯題'), 8, color=g.GRAY)
    fp = g.sec.footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    g.font(fp.add_run('第 '), 8.5, color=g.GRAY)
    g.add_field(fp, 'PAGE', 8.5)
    g.font(fp.add_run(' 頁，共 '), 8.5, color=g.GRAY)
    g.add_field(fp, 'NUMPAGES', 8.5)
    g.font(fp.add_run(' 頁'), 8.5, color=g.GRAY)

    render(g.read(SRC))

    cp = g.doc.core_properties
    cp.title = '建築構造與施工｜弱項重點整理'
    cp.subject = '建築構造與施工'
    cp.author = 'architecture-study-notes（AI 協作編擬）'
    cp.keywords = '建築師, 建築構造與施工, 弱項, 重點整理'
    g.doc.save(OUT)
    print('saved', OUT)


if __name__ == '__main__':
    main()
