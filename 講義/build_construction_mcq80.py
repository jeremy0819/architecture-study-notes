# -*- coding: utf-8 -*-
"""建築構造與施工｜115 年模擬試題（80 題選擇題版）Word 版。

單一事實來源（改 markdown 重跑本檔即更新）：
  試題　建築構造與施工/03-115年模擬試題（80題選擇題版）.md
  答案　04 §1 答案速查（與各題詳解標題交叉核對）
  詳解　第 1–40 題 ← 02-115年模擬試題詳解.md §2
  　　　第 41–80 題 ← 04-115年模擬試題（80題選擇題版）詳解.md §3–§5
另核對 03 的第 1–40 題與 01 原卷完全一致，避免兩個版本分岔。

執行：python3 講義/build_construction_mcq80.py
"""
import os
import re
import sys

from docx import Document
from docx.enum.table import WD_ROW_HEIGHT_RULE, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUBJ = os.path.join(ROOT, '建築構造與施工')
SRC_01 = os.path.join(SUBJ, '01-115年模擬試題.md')
SRC_02 = os.path.join(SUBJ, '02-115年模擬試題詳解.md')
SRC_03 = os.path.join(SUBJ, '03-115年模擬試題（80題選擇題版）.md')
SRC_04 = os.path.join(SUBJ, '04-115年模擬試題（80題選擇題版）詳解.md')
OUT = os.path.join(ROOT, '講義', '建築構造與施工_115模擬試題_80題選擇版.docx')

CJK = 'Microsoft JhengHei'
NAVY = RGBColor(0x1F, 0x3B, 0x5C)
RED = RGBColor(0xC0, 0x39, 0x2B)
GREEN = RGBColor(0x2E, 0x6B, 0x33)
GRAY = RGBColor(0x66, 0x66, 0x66)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)

Q_SIZE = 10.5      # 試題字級
E_SIZE = 9.5       # 詳解字級
PAGE_W, MARGIN_LR = 21.0, 1.8
TEXT_W = PAGE_W - 2 * MARGIN_LR          # 17.4 cm
Q_INDENT = 0.8                           # 題號懸掛縮排
OPT_INDENT = 0.85                        # (A) 懸掛縮排


def read(path):
    with open(path, encoding='utf-8') as f:
        return f.read()


def between(text, start, end=None):
    i = text.index(start)
    j = text.index(end, i) if end else len(text)
    return text[i:j]


# ---------------------------------------------------------------- 解析
Q_HEAD = re.compile(r'(?m)^\*\*(\d+)\.\*\* (.+)$')


def parse_options(block, n):
    opts = re.findall(r'(?m)^- \(([ABCD])\) (.+)$', block)
    if not opts:
        line = next((ln for ln in block.splitlines() if ln.startswith('(A) ')), '')
        opts = re.findall(r'\(([ABCD])\) (.+?)(?=　\([ABCD]\) |$)', line)
    if [o[0] for o in opts] != list('ABCD'):
        sys.exit(f'第 {n} 題選項解析失敗：{opts}')
    return [o[1].strip() for o in opts]


def parse_paper(md):
    """回傳依序排列的項目：('part', 標題, 說明) 或 ('q', 題號, 題幹, [A,B,C,D])"""
    body = between(md, '## 第一部分', '## 測驗答案卡')
    items, lines, i = [], body.split('\n'), 0
    while i < len(lines):
        ln = lines[i]
        if ln.startswith('## '):
            note = ''
            k = i + 1
            while k < len(lines) and not lines[k].startswith('> ') and not Q_HEAD.match(lines[k]):
                k += 1
            if k < len(lines) and lines[k].startswith('> '):
                note = lines[k][2:].strip()
            items.append(('part', ln[3:].strip(), note))
        m = Q_HEAD.match(ln)
        if m:
            k = i + 1
            while k < len(lines) and not Q_HEAD.match(lines[k]) and not lines[k].startswith('## '):
                k += 1
            block = '\n'.join(lines[i + 1:k])
            n = int(m.group(1))
            items.append(('q', n, m.group(2).strip(), parse_options(block, n)))
            i = k
            continue
        i += 1
    return items


def parse_answers(md):
    ans = []
    for ln in between(md, '## 1. 80 題答案速查', '## 2.').split('\n'):
        if ln.startswith('| 答案 |'):
            ans += [c.strip() for c in ln.strip('|').split('|')[1:]]
    return ans


def explanation_heads(md):
    return {int(n): a for n, a in re.findall(r'(?m)^#### 第 (\d+) 題　答（([ABCD])）', md)}


# ---------------------------------------------------------------- 版面工具
doc = Document()
sec = doc.sections[0]
sec.page_width, sec.page_height = Cm(PAGE_W), Cm(29.7)
sec.left_margin = sec.right_margin = Cm(MARGIN_LR)
sec.top_margin, sec.bottom_margin = Cm(1.6), Cm(1.5)
sec.header_distance, sec.footer_distance = Cm(0.8), Cm(0.7)

normal = doc.styles['Normal']
normal.font.name = CJK
normal.font.size = Pt(Q_SIZE)
_rf = normal.element.get_or_add_rPr().get_or_add_rFonts()
for _a in ('w:ascii', 'w:hAnsi', 'w:eastAsia', 'w:cs'):
    _rf.set(qn(_a), CJK)


def font(run, size, bold=False, color=None):
    run.font.name = CJK
    run.font.size = Pt(size)
    run.font.bold = bold
    if color is not None:
        run.font.color.rgb = color
    rf = run._element.get_or_add_rPr().get_or_add_rFonts()
    for a in ('w:ascii', 'w:hAnsi', 'w:eastAsia', 'w:cs'):
        rf.set(qn(a), CJK)
    return run


def spacing(p, before=0.0, after=2.0, line=1.12):
    pf = p.paragraph_format
    pf.space_before, pf.space_after, pf.line_spacing = Pt(before), Pt(after), line
    return p


def shade(cell, hex_fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), hex_fill)
    tc_pr.append(shd)


def add_tab_stops(p, positions_cm):
    for pos in positions_cm:
        p.paragraph_format.tab_stops.add_tab_stop(Cm(pos))


INLINE = re.compile(r'(\*\*.+?\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))')


def emit(p, text, size, color=None, bold=False):
    """行內標記：**粗體**、`code`、[連結](url)（連結轉純文字）"""
    for part in INLINE.split(text):
        if not part:
            continue
        b, col, t = bold, color, part
        if part.startswith('**') and part.endswith('**'):
            b, t = True, part[2:-2]
        elif part.startswith('`') and part.endswith('`'):
            t, col = part[1:-1], color or NAVY
        else:
            m = re.fullmatch(r'\[([^\]]+)\]\([^)]+\)', part)
            if m:
                t, col = m.group(1), color or NAVY
        font(p.add_run(t), size, b, col)


def para(text='', size=E_SIZE, indent=0.0, hanging=0.0, before=0.0, after=2.0,
         color=None, bold=False, align=None, keep_next=False):
    p = doc.add_paragraph()
    spacing(p, before, after)
    pf = p.paragraph_format
    if indent or hanging:
        pf.left_indent = Cm(indent + hanging)
        pf.first_line_indent = Cm(-hanging) if hanging else None
    if align is not None:
        p.alignment = align
    pf.keep_with_next = keep_next
    if text:
        emit(p, text, size, color, bold)
    return p


def page_break():
    p = doc.add_paragraph()
    spacing(p, 0, 0)
    p.add_run().add_break(WD_BREAK.PAGE)


def bar(text, level=1):
    """色帶標題（沿用本庫講義風格：深藍色帶、白字）"""
    fills = {1: '1F3B5C', 2: '35617F'}
    sizes = {1: 13.5, 2: 11.5}
    t = doc.add_table(rows=1, cols=1)
    t.style = 'Table Grid'
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    c = t.rows[0].cells[0]
    shade(c, fills[level])
    p = c.paragraphs[0]
    spacing(p, 1.5, 1.5, 1.0)
    p.paragraph_format.keep_with_next = True
    font(p.add_run(text), sizes[level], True, WHITE)
    gap = doc.add_paragraph()
    spacing(gap, 0, 2)
    gap.paragraph_format.keep_with_next = True


def sub_heading(text):
    p = para(before=6, after=2, keep_next=True)
    font(p.add_run('▌' + text), 10.5, True, NAVY)


def disp_w(s):
    s = re.sub(r'\*\*|`', '', s)
    s = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', s)
    return sum(1.0 if ord(ch) > 0x2E80 else 0.55 for ch in s)


def fixed_table(rows, widths_cm, header=True, size=9.0, center=False, height_cm=None):
    ncol = len(widths_cm)
    t = doc.add_table(rows=len(rows), cols=ncol)
    t.style = 'Table Grid'
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = False
    tbl_pr = t._tbl.tblPr
    layout = OxmlElement('w:tblLayout')
    layout.set(qn('w:type'), 'fixed')
    tbl_pr.append(layout)
    for j, w in enumerate(widths_cm):
        t.columns[j].width = Cm(w)
    for i, row in enumerate(rows):
        r = t.rows[i]
        if height_cm:
            r.height, r.height_rule = Cm(height_cm), WD_ROW_HEIGHT_RULE.AT_LEAST
        for j in range(ncol):
            cell = r.cells[j]
            cell.width = Cm(widths_cm[j])
            p = cell.paragraphs[0]
            spacing(p, 0.8, 0.8, 1.0)
            if center:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            txt = row[j] if j < len(row) else ''
            is_head = (header and i == 0) or txt.startswith('**題號')
            if is_head:
                shade(cell, 'E4EAF0')
                emit(p, txt.replace('**', ''), size, NAVY, True)
            else:
                emit(p, txt, size)
    gap = doc.add_paragraph()
    spacing(gap, 0, 3)
    return t


def md_table(rows, size=9.0):
    """欄寬：短欄（≤ 8.5 字寬）保證一行放得下，剩餘寬度依內容長度分給長欄"""
    ncol = max(len(r) for r in rows)
    unit = size * 0.03528                    # 1 字寬（cm）
    pad = 0.45                               # 儲存格左右留白
    longest = [max(disp_w(r[j]) if j < len(r) else 0 for r in rows) for j in range(ncol)]
    base = [min(L, 8.5) * unit + pad for L in longest]
    if sum(base) >= TEXT_W:
        widths = [TEXT_W * b / sum(base) for b in base]
    else:
        extra = TEXT_W - sum(base)
        weight = [max(min(L, 40.0) - 8.5, 0.0) for L in longest]
        tw = sum(weight)
        widths = [b + (extra * w / tw if tw else extra / ncol) for b, w in zip(base, weight)]
    fixed_table(rows, widths, header=True, size=size)


def quote_box(lines, size=E_SIZE - 0.5, fill='FFF7E0'):
    t = doc.add_table(rows=1, cols=1)
    t.style = 'Table Grid'
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    c = t.rows[0].cells[0]
    shade(c, fill)
    for k, ln in enumerate(lines):
        p = c.paragraphs[0] if k == 0 else c.add_paragraph()
        spacing(p, 0.8, 0.8, 1.08)
        emit(p, ln, size)
    gap = doc.add_paragraph()
    spacing(gap, 0, 3)


def add_field(paragraph, instr, size):
    def run_with(el):
        r = paragraph.add_run()
        font(r, size, color=GRAY)
        r._r.append(el)
    begin = OxmlElement('w:fldChar')
    begin.set(qn('w:fldCharType'), 'begin')
    run_with(begin)
    it = OxmlElement('w:instrText')
    it.set(qn('xml:space'), 'preserve')
    it.text = f' {instr} '
    run_with(it)
    sep = OxmlElement('w:fldChar')
    sep.set(qn('w:fldCharType'), 'separate')
    run_with(sep)
    font(paragraph.add_run('1'), size, color=GRAY)
    end = OxmlElement('w:fldChar')
    end.set(qn('w:fldCharType'), 'end')
    run_with(end)


# ---------------------------------------------------------------- 試題排版
def render_question(n, stem, opts):
    p = para(size=Q_SIZE, hanging=Q_INDENT, before=4, after=1.5, keep_next=True)
    add_tab_stops(p, [Q_INDENT])
    font(p.add_run(f'{n}.'), Q_SIZE, True, NAVY)
    font(p.add_run('\t'), Q_SIZE)
    emit(p, stem, Q_SIZE)
    p.paragraph_format.keep_together = True

    labels = [f'({k})' for k in 'ABCD']
    width = max(disp_w(o) for o in opts)
    avail = TEXT_W - Q_INDENT
    if width <= 8.0:
        groups = [list(range(4))]
    elif width <= 18.5:
        groups = [[0, 1], [2, 3]]
    else:
        groups = [[k] for k in range(4)]
    for gi, grp in enumerate(groups):
        last = gi == len(groups) - 1
        if len(grp) == 1:
            k = grp[0]
            op = para(size=Q_SIZE, indent=Q_INDENT, hanging=OPT_INDENT, after=4 if last else 0.5,
                      keep_next=not last)
            add_tab_stops(op, [Q_INDENT + OPT_INDENT])
            font(op.add_run(labels[k] + '\t'), Q_SIZE)
            emit(op, opts[k], Q_SIZE)
        else:
            step = avail / len(grp)
            op = para(size=Q_SIZE, indent=Q_INDENT, after=4 if last else 0.5, keep_next=not last)
            add_tab_stops(op, [Q_INDENT + step * s for s in range(1, len(grp))])
            for s, k in enumerate(grp):
                if s:
                    font(op.add_run('\t'), Q_SIZE)
                font(op.add_run(labels[k] + ' '), Q_SIZE)
                emit(op, opts[k], Q_SIZE)
        op.paragraph_format.keep_together = True


def number_grid(values=None, label='作答'):
    rows = []
    for g in range(1, 81, 10):
        rows.append(['題號'] + [str(n) for n in range(g, g + 10)])
        rows.append([label] + ([values[n - 1] for n in range(g, g + 10)] if values else [''] * 10))
    first = 1.9
    widths = [first] + [(TEXT_W - first) / 10] * 10
    t = fixed_table(rows, widths, header=False, size=10, center=True, height_cm=0.72)
    for i in range(0, len(rows), 2):          # 題號列上色
        for cell in t.rows[i].cells:
            shade(cell, 'E4EAF0')
            for r in cell.paragraphs[0].runs:
                r.font.bold, r.font.color.rgb = True, NAVY
    return t


# ---------------------------------------------------------------- 詳解排版
HEAD_NUM = re.compile(r'^\d+(\.\d+)*\.?\s+')


def render_md(md):
    lines = md.split('\n')
    buf_q, buf_t, buf_c, in_code = [], [], [], False

    def flush():
        nonlocal buf_q, buf_t
        if buf_q:
            quote_box(buf_q)
            buf_q = []
        if buf_t:
            md_table(buf_t)
            buf_t = []

    for raw in lines:
        ln = raw.rstrip()
        if ln.startswith('```'):
            if in_code:
                quote_box(buf_c, size=8.0, fill='F2F4F6')
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
                quote_box(buf_q)
                buf_q = []
            cells = [c.strip() for c in ln.strip('|').split('|')]
            if not all(re.fullmatch(r':?-{2,}:?', c) for c in cells if c):
                buf_t.append(cells)
            continue
        if ln.startswith('>'):
            if buf_t:
                md_table(buf_t)
                buf_t = []
            if ln[1:].strip():
                buf_q.append(ln[1:].strip())
            continue
        flush()
        if not ln.strip() or re.fullmatch(r'-{3,}', ln):
            continue
        m = re.match(r'^(#{2,4}) (.+)$', ln)
        if m:
            level, text = len(m.group(1)), m.group(2).strip()
            if level == 2:
                bar(HEAD_NUM.sub('', text), 2)
            elif level == 3:
                sub_heading(HEAD_NUM.sub('', text))
            else:
                hm = re.match(r'^(第 \d+ 題)　(答（[ABCD]）)(.*)$', text)
                p = para(before=5, after=1, keep_next=True)
                if hm:
                    font(p.add_run(hm.group(1) + '　'), 10, True, NAVY)
                    font(p.add_run(hm.group(2)), 10, True, RED)
                    if hm.group(3).strip():
                        font(p.add_run('　' + hm.group(3).strip()), 9.5, False, GRAY)
                else:
                    font(p.add_run(text), 10, True, NAVY)
            continue
        m = re.match(r'^(\s*)[-*] (.+)$', ln)
        if m:
            depth = len(m.group(1)) // 2
            para('・' + m.group(2), indent=0.3 + 0.55 * depth, hanging=0.45)
            continue
        m = re.match(r'^(\s*)(\d+)\. (.+)$', ln)
        if m:
            depth = len(m.group(1)) // 2
            para(f'{m.group(2)}. {m.group(3)}', indent=0.3 + 0.55 * depth, hanging=0.55)
            continue
        para(ln.strip())
    flush()


# ---------------------------------------------------------------- 主程式
def main():
    md01, md02, md03, md04 = read(SRC_01), read(SRC_02), read(SRC_03), read(SRC_04)

    items = parse_paper(md03)
    qs = {it[1]: it for it in items if it[0] == 'q'}
    if sorted(qs) != list(range(1, 81)):
        sys.exit(f'03 題號不完整：{sorted(qs)}')

    # 03 第 1–40 題須與 01 原卷一致
    orig = {}
    heads = list(Q_HEAD.finditer(md01))
    for k, m in enumerate(heads):
        end = heads[k + 1].start() if k + 1 < len(heads) else md01.index('## 測驗答案卡')
        orig[int(m.group(1))] = (m.group(2).strip(), parse_options(md01[m.end():end], int(m.group(1))))
    diff = [n for n in range(1, 41) if (qs[n][2], qs[n][3]) != orig.get(n)]
    if diff:
        sys.exit(f'03 與 01 第 1–40 題不一致：{diff}')

    answers = parse_answers(md04)
    exp40 = between(md02, '## 2. 測驗題詳解', '## 3. 申論題參考擬答')
    exp80 = between(md04, '## 3. 第 41–52 題')
    heads_all = {**explanation_heads(exp40), **explanation_heads(exp80)}
    if len(answers) != 80 or sorted(heads_all) != list(range(1, 81)):
        sys.exit(f'答案或詳解數量不符：答案 {len(answers)}、詳解 {len(heads_all)}')
    bad = [n for n in range(1, 81) if heads_all[n] != answers[n - 1]]
    if bad:
        sys.exit(f'答案速查與詳解標題不一致：{bad}')

    # 頁首、頁尾
    hp = sec.header.paragraphs[0]
    hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    font(hp.add_run('115 建築師｜建築構造與施工 模擬試題（80 題選擇題版）｜AI 編擬，非考選部試題'), 8, color=GRAY)
    fp = sec.footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    font(fp.add_run('第 '), 8.5, color=GRAY)
    add_field(fp, 'PAGE', 8.5)
    font(fp.add_run(' 頁，共 '), 8.5, color=GRAY)
    add_field(fp, 'NUMPAGES', 8.5)
    font(fp.add_run(' 頁'), 8.5, color=GRAY)

    # 封面資訊
    para('115 年專門職業及技術人員高等考試建築師考試（模擬）', 13.5, bold=True, color=NAVY,
         align=WD_ALIGN_PARAGRAPH.CENTER, after=2)
    para('建築構造與施工｜80 題選擇題版', 12.5, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, after=6)
    info = fixed_table([['類　科', '建築師', '科　目', '建築構造與施工'],
                        ['考試時間', '2 小時', '座　號', '']],
                       [2.3, 6.4, 2.3, 6.4], header=False, size=10, height_cm=0.7)
    for row in info.rows:
        for j in (0, 2):
            shade(row.cells[j], 'E4EAF0')
            for r in row.cells[j].paragraphs[0].runs:
                r.font.bold, r.font.color.rgb = True, NAVY
    quote_box([
        '※注意：（一）本試題為單一選擇題，請選出一個正確或最適當的答案，複選作答者，該題不予計分。',
        '（二）共 80 題，每題 1.25 分，滿分 100 分。禁止使用電子計算器。',
        '（三）第 1–40 題同原卷測驗題；第 41–52 題由兩題申論（預鑄、屋頂光電）改寫；第 53–80 題為補充題。',
        '（四）本卷為 AI 依近年命題趨勢編擬之模擬試題，非考選部試題；正式考試同為 80 題單選（105–114 年原卷確認）。'
        '法規、標準數值以全國法規資料庫與 CNS 最新版為準。',
    ], size=9.5, fill='F2F4F6')

    for it in items:
        if it[0] == 'part':
            p = para(before=8, after=3, keep_next=True)
            font(p.add_run('▌' + it[1]), 11, True, NAVY)
            if it[2]:
                font(p.add_run('　' + re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', it[2])), 9, False, GRAY)
        else:
            render_question(it[1], it[2], it[3])

    # 答案卡
    page_break()
    bar('測驗答案卡（共 80 題，每題 1.25 分）', 1)
    para('姓名：＿＿＿＿＿　日期：＿＿＿＿　用時：＿＿＿ 分鐘　答對：＿＿＿ 題　得分：＿＿＿ 分',
         10, after=6)
    number_grid()
    para('計分：答對題數 × 1.25 分。作答完畢再翻閱後面的解答與詳解。', 9.5, color=GRAY, before=4)

    # 解答與詳解
    page_break()
    bar('解答與詳解', 1)
    para('以下為解答，請完成作答後再翻閱。', 10, bold=True, color=RED, after=4)
    bar('答案速查', 2)
    number_grid(answers, label='答案')
    para('全卷 A／B／C／D 各 20 題。', 9.5, color=GRAY, before=2, after=4)
    bar('第 1–40 題：原卷測驗題', 2)
    render_md(between(exp40, '\n', None))
    render_md(exp80)
    para('第 1–40 題之查證紀錄見 repo 內 02 詳解 §7；本卷由 AI 協作編擬，示範寫法非唯一正解。',
         9, color=GRAY, before=6)

    cp = doc.core_properties
    cp.title = '115 年建築師 建築構造與施工 模擬試題（80 題選擇題版）'
    cp.subject = '建築構造與施工'
    cp.author = 'architecture-study-notes（AI 協作編擬）'
    cp.keywords = '建築師, 建築構造與施工, 模擬試題, 選擇題'

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    doc.save(OUT)
    print('saved', OUT, '| questions 80 | answers ok')


if __name__ == '__main__':
    main()
