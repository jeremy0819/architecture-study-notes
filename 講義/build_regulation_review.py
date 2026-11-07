# -*- coding: utf-8 -*-
"""營建法規與實務｜115 模擬試題第 1 回作答批改與錯題對照 Word 版。
單一事實來源：營建法規與實務/04-第1回作答批改與錯題對照.md
改 markdown 重跑本檔即更新：python3 講義/build_regulation_review.py
"""
import re
from pathlib import Path

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / '營建法規與實務' / '04-第1回作答批改與錯題對照.md'
OUT = ROOT / '講義' / '營建法規_115模擬試題_第1回錯題對照.docx'

CJK = 'Microsoft JhengHei'
NAVY = RGBColor(0x1F, 0x3B, 0x5C)
RED = RGBColor(0xB0, 0x2A, 0x1E)
GREEN = RGBColor(0x2E, 0x6B, 0x33)
AMBER = RGBColor(0xB7, 0x79, 0x1F)
GRAY = RGBColor(0x55, 0x55, 0x55)
BODY = 10
MARGIN = 1.8
TEXT_W = 21.0 - 2 * MARGIN

# Word／LibreOffice 的中文字型多半沒有彩色 emoji，換成一般符號
SYMBOL = {'⚠️': '⚠', '❌': '✗', '✅': '✓', '❓': '？', '📌': '■', '🔴': '●', '🟡': '●'}


def plain(s):
    for k, v in SYMBOL.items():
        s = s.replace(k, v)
    return s


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


def font(r, size=BODY, bold=False, color=None):
    r.font.name = CJK
    r.font.size = Pt(size)
    r.font.bold = bold
    if color is not None:
        r.font.color.rgb = color
    rr = r._element.get_or_add_rPr().get_or_add_rFonts()
    for a in ('w:ascii', 'w:hAnsi', 'w:eastAsia', 'w:cs'):
        rr.set(qn(a), CJK)
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
    trpr = row._tr.get_or_add_trPr()
    e = OxmlElement('w:cantSplit')
    trpr.append(e)


INLINE = re.compile(r'(\*\*.+?\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))')


def emit(p, text, size=BODY, color=None, bold=False):
    segs = re.split(r'(🔴|🟡)', text)
    if len(segs) > 1:      # 紅／黃圓點各自上色
        for seg in segs:
            if seg in ('🔴', '🟡'):
                font(p.add_run('●'), size, bold, RED if seg == '🔴' else AMBER)
            elif seg:
                emit(p, seg, size, color, bold)
        return
    text = plain(text)
    for part in INLINE.split(text):
        if not part:
            continue
        b, c, t = bold, color, part
        if part.startswith('**') and part.endswith('**'):
            b, t = True, part[2:-2]
        elif part.startswith('`') and part.endswith('`'):
            t = part[1:-1]
        else:
            m = re.fullmatch(r'\[([^\]]+)\]\([^)]+\)', part)
            if m:
                t, c = m.group(1), c or NAVY
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
font(hp.add_run('115 營建法規與實務模擬試題｜第 1 回作答批改與錯題對照'), 8.5, color=GRAY)
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
    t = doc.add_table(rows=1, cols=1)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    c = t.rows[0].cells[0]
    shade(c, '1F3B5C')
    p = c.paragraphs[0]
    spacing(p, 1, 1, 1.0, keep=True)
    font(p.add_run(plain(text).replace('`', '')), 12, True, RGBColor(0xFF, 0xFF, 0xFF))
    set_widths(t, [TEXT_W])
    gap = doc.add_paragraph()
    spacing(gap, 0, 3, keep=True)


def h3(text):
    p = doc.add_paragraph()
    spacing(p, 8, 3, keep=True)
    font(p.add_run('▌' + plain(text).replace('`', '')), 11, True, NAVY)


def quote(lines, fill='FFF7E0'):
    t = doc.add_table(rows=1, cols=1)
    t.style = 'Table Grid'
    c = t.rows[0].cells[0]
    shade(c, fill)
    for i, ln in enumerate(lines):
        p = c.paragraphs[0] if i == 0 else c.add_paragraph()
        spacing(p, 1, 1, 1.08)
        emit(p, ln, BODY - 0.5)
    set_widths(t, [TEXT_W])
    gap = doc.add_paragraph()
    spacing(gap, 0, 4)


def table(rows):
    ncol = max(len(r) for r in rows)
    grid80 = rows[0][0] == '題號' and ncol == 11
    t = doc.add_table(rows=len(rows), cols=ncol)
    t.style = 'Table Grid'
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    result = next((r for r in rows if r[0] == '結果'), None)
    for i, row in enumerate(rows):
        no_split(t.rows[i])
        for j in range(ncol):
            cell = t.rows[i].cells[j]
            p = cell.paragraphs[0]
            txt = row[j] if j < len(row) else ''
            spacing(p, 1, 1, 1.0, keep=(i < len(rows) - 1))
            if grid80:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            head = i == 0 or (grid80 and j == 0)
            color = NAVY if head else None
            if grid80 and result and j > 0 and result[j] == '✗' and not head:
                shade(cell, 'F9E0DE')
                if row[0] in ('結果', '你的答案'):
                    color = RED
            if head:
                shade(cell, 'E4EAF0')
            if '🔴' in txt:
                color = RED
            elif '🟡' in txt:
                color = AMBER
            emit(p, txt, BODY - (1 if grid80 else 0.5), color, bold=head)
    if grid80:
        set_widths(t, [2.2] + [(TEXT_W - 2.2) / 10] * 10)
    elif ncol == 2:
        first = 2.0 if rows[0][0] == '題號' else 4.0
        set_widths(t, [first, TEXT_W - first])
    elif ncol == 4:
        set_widths(t, [4.2, 1.2, 3.8, TEXT_W - 9.2])
    elif ncol == 5:
        set_widths(t, [5.0, 1.8, 2.4, 1.9, TEXT_W - 11.1])
    gap = doc.add_paragraph()
    spacing(gap, 0, 4)


FIELDS = [('你的答案', RED), ('正確答案', GREEN), ('錯在哪', None), ('記法', None), ('法源', GRAY)]


def card(title, stem, items):
    guess = '猜錯' in title
    t = doc.add_table(rows=2 + len(items), cols=2)
    t.style = 'Table Grid'
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    top = t.rows[0].cells[0].merge(t.rows[0].cells[1])
    shade(top, 'FFF3D6' if guess else 'F9E0DE')
    p = top.paragraphs[0]
    spacing(p, 1, 1, 1.0, keep=True)
    font(p.add_run(plain(title)), BODY + 0.5, True, AMBER if guess else RED)
    rows = [('題目', stem, None)] + [(k, v, c) for k, v, c in items]
    for i, (k, v, c) in enumerate(rows, start=1):
        a, b = t.rows[i].cells
        shade(a, 'F2F4F6')
        pa, pb = a.paragraphs[0], b.paragraphs[0]
        last = i == len(rows)
        spacing(pa, 1, 1, 1.05, keep=not last)
        spacing(pb, 1, 1, 1.05, keep=not last)
        font(pa.add_run(k), BODY - 0.5, True, NAVY)
        emit(pb, v, BODY - 0.5, c, bold=(k == '正確答案'))
    for r in t.rows:
        no_split(r)
    set_widths(t, [2.2, TEXT_W - 2.2])
    gap = doc.add_paragraph()
    spacing(gap, 0, 5)


# ---------------- 解析 markdown ----------------
md = SRC.read_text(encoding='utf-8')
md = md.split('---\n', 2)[2] if md.startswith('---\n') else md
lines = md.split('\n')
i = 0
buf_t, buf_q = [], []


def flush():
    global buf_t, buf_q
    if buf_t:
        table(buf_t)
        buf_t = []
    if buf_q:
        quote(buf_q)
        buf_q = []


while i < len(lines):
    ln = lines[i].rstrip()
    i += 1
    if ln.startswith('#### '):
        flush()
        title = ln[5:].strip()
        stem, items = '', []
        while i < len(lines) and not lines[i].startswith('#'):
            s = lines[i].strip()
            i += 1
            if s.startswith('> '):
                stem = s[2:]
            m = re.match(r'^- (?:❌ |✅ )?\*\*(.+?)\*\*：(.+)$', s)
            if m:
                color = dict(FIELDS).get(m.group(1))
                items.append((m.group(1), m.group(2), color))
            if s == '---':
                i -= 1
                break
        card(title, stem, items)
        continue
    if ln.startswith('# '):
        flush()
        h1(ln[2:].strip())
    elif ln.startswith('## '):
        flush()
        h2(ln[3:].strip())
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
            quote(buf_q)
            buf_q = []
        cells = [c.strip() for c in ln.strip('|').split('|')]
        if not all(re.fullmatch(r'-+', c) for c in cells):
            buf_t.append(cells)
    elif re.match(r'^\d+\. ', ln) or ln.startswith('   '):
        flush()
        if ln.startswith('   '):
            p = doc.paragraphs[-1]
            emit(p, ' ' + ln.strip())
            continue
        p = doc.add_paragraph()
        spacing(p, 1, 2, 1.12)
        p.paragraph_format.left_indent = Cm(0.6)
        p.paragraph_format.first_line_indent = Cm(-0.6)
        n, rest = ln.split('. ', 1)
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

doc.core_properties.title = '115 營建法規與實務模擬試題 第 1 回作答批改與錯題對照'
doc.save(OUT)
print('wrote', OUT)
