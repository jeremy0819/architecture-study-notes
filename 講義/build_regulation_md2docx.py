# -*- coding: utf-8 -*-
"""營建法規與實務｜通用 markdown → Word 轉檔（表格、引言框、程式框、題目小標）。
用法：python3 講義/build_regulation_md2docx.py <營建法規與實務/來源.md> <講義/輸出.docx> <頁首文字> [另起新頁的二級標題開頭,以逗號分隔]
例：  python3 講義/build_regulation_md2docx.py 營建法規與實務/08-114年考古題重做錯題解析.md 講義/營建法規_114重做錯題解析.docx "114 年營建法規｜重做錯題解析" 二、,三、
"""
import sys
import re
import unicodedata
from pathlib import Path

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / sys.argv[1]
OUT = ROOT / sys.argv[2]
HEADER = sys.argv[3]

CJK = 'Microsoft JhengHei'
MONO = 'Consolas'
NAVY = RGBColor(0x1F, 0x3B, 0x5C)
RED = RGBColor(0xB0, 0x2A, 0x1E)
AMBER = RGBColor(0xB7, 0x79, 0x1F)
GRAY = RGBColor(0x55, 0x55, 0x55)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
BODY = 10
MARGIN = 1.8
TEXT_W = 21.0 - 2 * MARGIN
PAGE_BREAK_BEFORE = tuple(x for x in (sys.argv[4].split(',') if len(sys.argv) > 4 else []) if x)
SYMBOL = {'⚠️': '⚠', '📌': '■', '✅': '✓', '🆕 新法': '【新法】', '🎯 你的弱點': '【你的弱點】'}               # 中文字型沒有彩色 emoji

doc = Document()
sec = doc.sections[0]
sec.page_width, sec.page_height = Cm(21.0), Cm(29.7)
sec.left_margin = sec.right_margin = Cm(MARGIN)
sec.top_margin = Cm(1.6)
sec.bottom_margin = Cm(1.5)
st = doc.styles['Normal']
st.font.name = CJK
st.font.size = Pt(BODY)
rf = st.element.get_or_add_rPr().get_or_add_rFonts()
for a in ('w:ascii', 'w:hAnsi', 'w:eastAsia', 'w:cs'):
    rf.set(qn(a), CJK)


def font(r, size=BODY, bold=False, color=None, face=CJK):
    r.font.name = face
    r.font.size = Pt(size)
    r.font.bold = bold
    if color is not None:
        r.font.color.rgb = color
    rr = r._element.get_or_add_rPr().get_or_add_rFonts()
    for a in ('w:ascii', 'w:hAnsi', 'w:cs'):
        rr.set(qn(a), face)
    rr.set(qn('w:eastAsia'), CJK)
    return r


def spacing(p, before=0, after=0, line=1.12, keep=False):
    pf = p.paragraph_format
    pf.space_before, pf.space_after, pf.line_spacing = Pt(before), Pt(after), line
    pf.keep_with_next = keep


def shade(cell, hx):
    tcpr = cell._tc.get_or_add_tcPr()
    e = OxmlElement('w:shd')
    e.set(qn('w:val'), 'clear')
    e.set(qn('w:fill'), hx)
    tcpr.append(e)


def set_widths(table, widths):
    table.autofit = False
    for gc, w in zip(table._tbl.tblGrid.findall(qn('w:gridCol')), widths):
        gc.set(qn('w:w'), str(int(w * 567)))
    for row in table.rows:
        for cell, w in zip(row.cells, widths):
            cell.width = Cm(w)


def no_split(row):
    row._tr.get_or_add_trPr().append(OxmlElement('w:cantSplit'))


def dwidth(s):
    s = re.sub(r'\*\*|`', '', s)
    return sum(2 if unicodedata.east_asian_width(ch) in 'WFA' else 1 for ch in s)


INLINE = re.compile(r'(\*\*.+?\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))')
MARK = re.compile(r'(🔑|🔴)')


def emit(p, text, size=BODY, color=None, bold=False):
    for k, v in SYMBOL.items():
        text = text.replace(k, v)
    for seg in MARK.split(text):
        if seg == '🔑':
            font(p.add_run('◆ '), size, True, AMBER)
            continue
        if seg == '🔴':
            font(p.add_run('●'), size, True, RED)
            continue
        for part in INLINE.split(seg):
            if not part:
                continue
            b, c, t = bold, color, part
            if part.startswith('**') and part.endswith('**'):
                b, t = True, part[2:-2]
                c = c or NAVY
            elif part.startswith('`') and part.endswith('`'):
                t = part[1:-1]
            else:
                m = re.fullmatch(r'\[([^\]]+)\]\([^)]+\)', part)
                if m:
                    t, c = m.group(1), c or NAVY
            if t.startswith('⚠') and c is None:
                c = RED
            font(p.add_run(t), size, b, c)


def field(p, code):
    r = p.add_run()
    font(r, 8.5, color=GRAY)
    for kind in ('begin', 'instr', 'end'):
        if kind == 'instr':
            it = OxmlElement('w:instrText')
            it.set(qn('xml:space'), 'preserve')
            it.text = f' {code} '
            r._r.append(it)
        else:
            fc = OxmlElement('w:fldChar')
            fc.set(qn('w:fldCharType'), kind)
            r._r.append(fc)


hp = sec.header.paragraphs[0]
hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
font(hp.add_run(HEADER), 8.5, color=GRAY)
fp = sec.footer.paragraphs[0]
fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
font(fp.add_run('第 '), 8.5, color=GRAY)
field(fp, 'PAGE')
font(fp.add_run(' 頁，共 '), 8.5, color=GRAY)
field(fp, 'NUMPAGES')
font(fp.add_run(' 頁'), 8.5, color=GRAY)


def h1(text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    spacing(p, 0, 6)
    font(p.add_run(text), 16, True, NAVY)


def h2(text):
    if PAGE_BREAK_BEFORE and text.startswith(PAGE_BREAK_BEFORE):
        bp = doc.add_paragraph()
        bp.add_run().add_break(WD_BREAK.PAGE)
        spacing(bp, 0, 0)
    t = doc.add_table(rows=1, cols=1)
    c = t.rows[0].cells[0]
    shade(c, '1F3B5C')
    p = c.paragraphs[0]
    spacing(p, 1, 1, 1.0, keep=True)
    font(p.add_run(text), 12, True, WHITE)
    set_widths(t, [TEXT_W])
    gap = doc.add_paragraph()
    spacing(gap, 0, 2, keep=True)


def h3(text):
    p = doc.add_paragraph()
    spacing(p, 7, 3, keep=True)
    font(p.add_run('▌' + text), 11, True, NAVY)


def h4(text):
    p = doc.add_paragraph()
    spacing(p, 6, 2, keep=True)
    color = RED if '答錯' in text else (AMBER if '不知道' in text else NAVY)
    font(p.add_run(text.replace('❌ ', '✗ ').replace('❓ ', '？ ')), 10.5, True, color)
    ppr = p._p.get_or_add_pPr()
    bdr = OxmlElement('w:pBdr')
    b = OxmlElement('w:bottom')
    b.set(qn('w:val'), 'single'); b.set(qn('w:sz'), '6'); b.set(qn('w:space'), '1'); b.set(qn('w:color'), 'B0B8C1')
    bdr.append(b); ppr.append(bdr)


def box(lines, fill, mono=False):
    t = doc.add_table(rows=1, cols=1)
    t.style = 'Table Grid'
    c = t.rows[0].cells[0]
    shade(c, fill)
    for i, ln in enumerate(lines):
        p = c.paragraphs[0] if i == 0 else c.add_paragraph()
        spacing(p, 0.5, 0.5, 1.05)
        if mono:
            font(p.add_run(ln), 9, False, None, face=MONO)
        else:
            emit(p, ln, BODY - 0.5)
    no_split(t.rows[0])
    set_widths(t, [TEXT_W])
    gap = doc.add_paragraph()
    spacing(gap, 0, 4)


def table(rows):
    ncol = max(len(r) for r in rows)
    rows = [r + [''] * (ncol - len(r)) for r in rows]
    weights = []
    for j in range(ncol):
        w = max(dwidth(r[j]) for r in rows)
        weights.append(min(max(w, 7), 70) + 2)
    total = sum(weights)
    # 欄寬至少放得下表頭文字（約 0.18 cm／半形字寬＋內距）
    widths = [max(TEXT_W * w / total, dwidth(rows[0][j]) * 0.18 + 0.45) for j, w in enumerate(weights)]
    scale = TEXT_W / sum(widths)
    widths = [w * scale for w in widths]
    t = doc.add_table(rows=len(rows), cols=ncol)
    t.style = 'Table Grid'
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, row in enumerate(rows):
        no_split(t.rows[i])
        for j, txt in enumerate(row):
            cell = t.rows[i].cells[j]
            p = cell.paragraphs[0]
            spacing(p, 1, 1, 1.02, keep=(i < len(rows) - 1))
            if i == 0:
                shade(cell, 'E4EAF0')
                emit(p, txt, BODY - 0.5, NAVY, True)
            else:
                emit(p, txt, BODY - 0.5)
    set_widths(t, widths)
    gap = doc.add_paragraph()
    spacing(gap, 0, 4)


# ---------------- 解析 markdown ----------------
md = SRC.read_text(encoding='utf-8')
if md.startswith('---\n'):
    md = md.split('---\n', 2)[2]
buf_t, buf_q, buf_c = [], [], []
in_code = False


def flush():
    global buf_t, buf_q
    if buf_t:
        table(buf_t)
        buf_t = []
    if buf_q:
        box(buf_q, 'FFF7E0')
        buf_q = []


for raw in md.split('\n'):
    ln = raw.rstrip()
    if ln.startswith('```'):
        if in_code:
            box(buf_c, 'F2F4F6', mono=True)
            buf_c, in_code = [], False
        else:
            flush()
            in_code = True
        continue
    if in_code:
        buf_c.append(ln)
        continue
    if ln.startswith('# '):
        flush()
        h1(ln[2:].strip())
    elif ln.startswith('## '):
        flush()
        h2(ln[3:].strip())
    elif ln.startswith('#### '):
        flush()
        h4(ln[5:].strip())
    elif ln.startswith('### '):
        flush()
        h3(ln[4:].strip())
    elif ln.startswith('>'):
        if buf_t:
            table(buf_t)
            buf_t = []
        if ln[1:].strip():
            buf_q.append(ln[1:].strip())
    elif ln.startswith('|'):
        if buf_q:
            box(buf_q, 'FFF7E0')
            buf_q = []
        cells = [c.strip() for c in ln.strip('|').split('|')]
        if not all(re.fullmatch(r':?-+:?', c) for c in cells):
            buf_t.append(cells)
    elif ln.startswith('- '):
        flush()
        p = doc.add_paragraph(style='List Bullet')
        spacing(p, 0.5, 1.5, 1.12)
        emit(p, ln[2:])
    elif re.match(r'^\d+\. ', ln):
        flush()
        n, rest = ln.split('. ', 1)
        p = doc.add_paragraph()
        spacing(p, 1, 2, 1.12)
        p.paragraph_format.left_indent = Cm(0.6)
        p.paragraph_format.first_line_indent = Cm(-0.6)
        font(p.add_run(f'{n}. '), BODY, True, NAVY)
        emit(p, rest)
    elif ln.strip() in ('', '---'):
        flush()
    else:
        flush()
        p = doc.add_paragraph()
        spacing(p, 1, 2)
        emit(p, ln)
flush()

doc.core_properties.title = HEADER
doc.save(OUT)
print('wrote', OUT)
