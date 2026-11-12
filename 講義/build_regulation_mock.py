# -*- coding: utf-8 -*-
"""營建法規與實務｜115 年模擬試題（80 題選擇題版）Word 試卷。
單一事實來源：營建法規與實務/01-115年模擬試題.md（題目）、02-115年模擬試題詳解.md（答案）
改 markdown 重跑本檔即更新：python3 講義/build_regulation_mock.py
第二回（考前預測卷）：python3 講義/build_regulation_mock.py 2  →  讀 09／10
"""
import re
import sys
import unicodedata
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

ROOT = Path(__file__).resolve().parent.parent
ROUND = sys.argv[1] if len(sys.argv) > 1 else '1'
CONF = {
    '1': dict(q='01-115年模擬試題.md', a='02-115年模擬試題詳解.md', out='營建法規_115模擬試題_80題.docx',
              title='營建法規與實務｜模擬試題（80 題選擇題版）',
              note='※ 本卷為 AI 依命題慣例模擬，並非考選部試題；法規基準日 115 年 11 月 4 日，條號與數字以全國法規資料庫最新版為準。'),
    '2': dict(q='09-115年模擬試題第二回.md', a='10-115年模擬試題第二回詳解.md', out='營建法規_115模擬試題_第二回.docx',
              title='營建法規與實務｜模擬試題第二回（考前預測卷）',
              note='※ 本卷為 AI 模擬命題，並非考選部試題，亦不保證命中；題型、配分與題序比照 108–114 年試卷，'
                   '各題依全國法規資料庫現行條文（整編截止 115 年 10 月 30 日）或歷屆官方答案命題。禁止使用電子計算器。'),
}[ROUND]
SRC_Q = ROOT / '營建法規與實務' / CONF['q']
SRC_A = ROOT / '營建法規與實務' / CONF['a']
OUT = ROOT / '講義' / CONF['out']

CJK = 'Microsoft JhengHei'
NAVY = RGBColor(0x1F, 0x3B, 0x5C)
GRAY = RGBColor(0x55, 0x55, 0x55)
BODY = 10.5
MARGIN = 2.0                 # cm
TEXT_W = 21.0 - 2 * MARGIN   # A4 可用寬 17 cm
HANG = 0.85                  # 題號懸掛縮排 cm

# ---------------- 讀取 markdown ----------------
q_md = SRC_Q.read_text(encoding='utf-8')
a_md = SRC_A.read_text(encoding='utf-8')

title = re.search(r'^# (.+)$', q_md, re.M).group(1).strip()
info = []
for row in re.findall(r'^\| (?!項目|-)(.+?) \| (.+?) \|$', q_md.split('---\n\n## ')[0], re.M):
    info.append((row[0].strip(), row[1].strip()))

body = q_md.split('## 測驗題作答卡')[0]
questions = []
for m in re.finditer(r'^\*\*(\d+)\.\*\* (.+?)\n\n((?:- \([A-D]\) .+\n?){4})', body, re.M):
    opts = re.findall(r'^- \(([A-D])\) (.+)$', m.group(3), re.M)
    questions.append((int(m.group(1)), m.group(2).strip(), opts))
assert [q[0] for q in questions] == list(range(1, len(questions) + 1)), 'question numbering'

key = [c.strip() for r in re.findall(r'^\| 答案 \|(.+)\|$', a_md, re.M) for c in r.split('|')]
assert len(key) == len(questions), (len(key), len(questions))

# ---------------- 文件與樣式 ----------------
doc = Document()
sec = doc.sections[0]
sec.page_width, sec.page_height = Cm(21.0), Cm(29.7)
sec.left_margin = sec.right_margin = Cm(MARGIN)
sec.top_margin = Cm(1.8)
sec.bottom_margin = Cm(1.6)

st = doc.styles['Normal']
st.font.name = CJK
st.font.size = Pt(BODY)
rf = st.element.get_or_add_rPr().get_or_add_rFonts()
for a in ('w:ascii', 'w:hAnsi', 'w:eastAsia', 'w:cs'):
    rf.set(qn(a), CJK)


def font(r, size=BODY, bold=False, color=None, underline=False):
    r.font.name = CJK
    r.font.size = Pt(size)
    r.font.bold = bold
    r.font.underline = underline
    if color is not None:
        r.font.color.rgb = color
    rr = r._element.get_or_add_rPr().get_or_add_rFonts()
    for a in ('w:ascii', 'w:hAnsi', 'w:eastAsia', 'w:cs'):
        rr.set(qn(a), CJK)
    return r


def spacing(p, before=0, after=0, line=1.15):
    pf = p.paragraph_format
    pf.space_before = Pt(before)
    pf.space_after = Pt(after)
    pf.line_spacing = line


def shade(cell, hx):
    tcpr = cell._tc.get_or_add_tcPr()
    e = OxmlElement('w:shd')
    e.set(qn('w:val'), 'clear')
    e.set(qn('w:fill'), hx)
    tcpr.append(e)


def set_widths(table, widths_cm):
    table.autofit = False
    grid = table._tbl.tblGrid
    for gc, w in zip(grid.findall(qn('w:gridCol')), widths_cm):
        gc.set(qn('w:w'), str(int(w * 567)))
    for row in table.rows:
        for cell, w in zip(row.cells, widths_cm):
            cell.width = Cm(w)


def field(p, code, size=9):
    """插入 PAGE / NUMPAGES 等欄位"""
    r = p.add_run()
    font(r, size, color=GRAY)
    for tag, text in (('begin', None), (None, code), ('end', None)):
        if tag:
            fc = OxmlElement('w:fldChar')
            fc.set(qn('w:fldCharType'), tag)
            r._r.append(fc)
        else:
            it = OxmlElement('w:instrText')
            it.set(qn('xml:space'), 'preserve')
            it.text = f' {text} '
            r._r.append(it)


def bottom_rule(p, color='1F3B5C', sz=12):
    ppr = p._p.get_or_add_pPr()
    bdr = OxmlElement('w:pBdr')
    b = OxmlElement('w:bottom')
    b.set(qn('w:val'), 'single')
    b.set(qn('w:sz'), str(sz))
    b.set(qn('w:space'), '1')
    b.set(qn('w:color'), color)
    bdr.append(b)
    ppr.append(bdr)


# 頁首頁尾
hp = sec.header.paragraphs[0]
hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
font(hp.add_run('115 年建築師考試（模擬）｜營建法規與實務'), 8.5, color=GRAY)
fp = sec.footer.paragraphs[0]
fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
font(fp.add_run('第 '), 9, color=GRAY)
field(fp, 'PAGE')
font(fp.add_run(' 頁，共 '), 9, color=GRAY)
field(fp, 'NUMPAGES')
font(fp.add_run(' 頁'), 9, color=GRAY)

# ---------------- 封面資訊 ----------------
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
spacing(p, 0, 2)
font(p.add_run('115 年專門職業及技術人員高等考試　建築師（模擬試題）'), 11, color=GRAY)
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
spacing(p, 0, 6)
font(p.add_run(CONF['title']), 17, bold=True, color=NAVY)
bottom_rule(p)

t = doc.add_table(rows=len(info), cols=2)
t.style = 'Table Grid'
t.alignment = WD_TABLE_ALIGNMENT.CENTER
for i, (k, v) in enumerate(info):
    c0, c1 = t.rows[i].cells
    shade(c0, 'E4EAF0')
    for c, txt, bold in ((c0, k, True), (c1, v, False)):
        c.text = ''
        cp = c.paragraphs[0]
        spacing(cp, 1, 1, 1.0)
        font(cp.add_run(txt), BODY - 0.5, bold=bold, color=NAVY if bold else None)
set_widths(t, [3.0, TEXT_W - 3.0])

notes = [
    CONF['note'],
    '※ 本測驗為單一選擇題，請選出一個正確或最適當的答案；複選作答者，該題不予計分。',
    '※ 共 80 題，每題 1.25 分，滿分 100 分。請將答案劃記於卷末作答卡；參考答案在最後一頁，作答完畢再翻閱。',
]
for n in notes:
    p = doc.add_paragraph()
    spacing(p, 3 if n is notes[0] else 0, 0, 1.1)
    p.paragraph_format.left_indent = Cm(0.5)
    p.paragraph_format.first_line_indent = Cm(-0.5)
    font(p.add_run(n), 9.5, color=GRAY)
spacer = doc.add_paragraph()
spacing(spacer, 0, 4)
bottom_rule(spacer, 'B0B8C1', 6)

# ---------------- 題目 ----------------
NEG = re.compile(r'(「非屬」|「非」|錯誤|不包括|非屬|無須|不符規定|應計入)')


def width(s):
    return sum(2 if unicodedata.east_asian_width(ch) in 'WF' else 1 for ch in s)


def add_stem(n, stem):
    p = doc.add_paragraph()
    spacing(p, 5, 1, 1.2)
    pf = p.paragraph_format
    pf.left_indent = Cm(HANG)
    pf.first_line_indent = Cm(-HANG)
    pf.keep_with_next = True
    pf.tab_stops.add_tab_stop(Cm(HANG))
    font(p.add_run(f'{n}.\t'), BODY, bold=True, color=NAVY)
    for part in NEG.split(stem):
        if not part:
            continue
        if NEG.fullmatch(part):
            font(p.add_run(part.strip('「」')), BODY, bold=True, underline=True)
        else:
            font(p.add_run(part), BODY)


def add_options(opts):
    longest = max(width(t) for _, t in opts)
    per_row = 4 if longest <= 16 else (2 if longest <= 38 else 1)
    col = (TEXT_W - HANG) / per_row
    rows = [opts[i:i + per_row] for i in range(0, 4, per_row)]
    for ri, row in enumerate(rows):
        p = doc.add_paragraph()
        spacing(p, 0, 0, 1.15)
        pf = p.paragraph_format
        pf.left_indent = Cm(HANG)
        if per_row == 1:     # 長選項：(A) 後懸掛縮排，換行對齊文字
            pf.left_indent = Cm(HANG + 0.85)
            pf.first_line_indent = Cm(-0.85)
            pf.tab_stops.add_tab_stop(Cm(HANG + 0.85))
        else:
            for k in range(1, per_row):
                pf.tab_stops.add_tab_stop(Cm(HANG + col * k))
        if ri < len(rows) - 1:
            pf.keep_with_next = True
        for j, (letter, text) in enumerate(row):
            sep = '\t' if per_row == 1 else ' '
            lead = '' if j == 0 else '\t'
            font(p.add_run(f'{lead}({letter}){sep}'), BODY, bold=True)
            font(p.add_run(text), BODY)


for n, stem, opts in questions:
    add_stem(n, stem)
    add_options(opts)

# ---------------- 作答卡與參考答案 ----------------
def grid_page(heading, sub, row_label, values):
    p = doc.add_paragraph()
    p.add_run().add_break(WD_BREAK.PAGE)
    spacing(p, 0, 0)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    spacing(p, 0, 2)
    font(p.add_run(heading), 15, bold=True, color=NAVY)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    spacing(p, 0, 8)
    font(p.add_run(sub), 9.5, color=GRAY)
    for block in range(len(values) // 10):
        t = doc.add_table(rows=2, cols=11)
        t.style = 'Table Grid'
        t.alignment = WD_TABLE_ALIGNMENT.CENTER
        labels = ['題號'] + [str(block * 10 + i + 1) for i in range(10)]
        cells = [row_label] + values[block * 10:block * 10 + 10]
        for j in range(11):
            for r, txt in ((0, labels[j]), (1, cells[j])):
                c = t.rows[r].cells[j]
                c.text = ''
                cp = c.paragraphs[0]
                cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
                spacing(cp, 3 if r else 1, 3 if r else 1, 1.0)
                font(cp.add_run(txt), BODY if r else 9, bold=(r == 0 or j == 0),
                     color=NAVY if (r == 0 or j == 0) else None)
                if r == 0 or j == 0:
                    shade(c, 'E4EAF0')
        set_widths(t, [2.0] + [1.5] * 10)
        gap = doc.add_paragraph()
        spacing(gap, 0, 4)


grid_page('測驗題作答卡', '每題 1.25 分｜答對 ____ 題 × 1.25 ＝ ______ 分（60 分＝答對 48 題）',
          '作答', [''] * len(questions))
grid_page('參考答案', '作答完畢再翻閱｜逐題法源與誘答解析見 營建法規與實務／' + CONF['a'],
          '答案', key)

doc.core_properties.title = title
doc.core_properties.subject = '營建法規與實務 模擬試題（AI 模擬命題）'
doc.save(OUT)
print(f'wrote {OUT} ({len(questions)} questions)')
