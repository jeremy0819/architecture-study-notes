# -*- coding: utf-8 -*-
"""Markdown → A4 列印 PDF（Chromium／Playwright 排版）。

用法：python3 build_md_pdf.py <來源.md> <輸出.pdf> [頁尾文字]
需要：python3 markdown、node＋playwright（Chromium）。
相對連結在 PDF 內不可點，表格、標題、引言、程式碼區塊照樣排版。
"""
import html
import os
import re
import subprocess
import sys
import tempfile

import markdown

CSS = """
@page { size: A4; margin: 13mm 13mm 15mm 13mm; }
body { font-family: "Noto Sans CJK TC", sans-serif; font-size: 9.6pt; line-height: 1.55; color: #1b1b1b; }
h1 { font-size: 16pt; margin: 0 0 2mm; color: #1f3b5c; }
h2 { font-size: 12.6pt; color: #fff; background: #2c3e50; padding: 1.2mm 2.4mm; margin: 5mm 0 2mm;
     break-after: avoid; }
h3 { font-size: 10.8pt; color: #1f3b5c; border-bottom: 0.8pt solid #1f3b5c; padding-bottom: 0.4mm;
     margin: 3.4mm 0 1.4mm; break-after: avoid; }
h4 { font-size: 10pt; margin: 2.4mm 0 1mm; break-after: avoid; }
p { margin: 0 0 1.4mm; }
ul, ol { margin: 0 0 1.6mm; padding-left: 5mm; }
li { margin-bottom: 0.4mm; }
table { border-collapse: collapse; width: 100%; margin: 1mm 0 2.4mm; font-size: 8.8pt; line-height: 1.42; }
th, td { border: 0.5pt solid #9aa3ad; padding: 0.8mm 1.4mm; vertical-align: top; text-align: left; }
th { background: #e9eef3; font-weight: 700; }
tr { break-inside: avoid; }
blockquote { margin: 1mm 0 2mm; padding: 1mm 2.6mm; border-left: 2pt solid #c0392b; background: #fbf3f2; color: #333; }
blockquote p { margin: 0.4mm 0; }
code { font-family: "Noto Sans Mono CJK TC", monospace; font-size: 8.6pt; background: #f3f4f6; padding: 0 0.6mm; }
pre { background: #f6f7f9; border: 0.5pt solid #d5d9de; padding: 1.6mm 2.2mm; font-size: 8.4pt; line-height: 1.45;
      white-space: pre-wrap; break-inside: avoid; }
pre code { background: none; padding: 0; }
hr { border: none; border-top: 0.6pt dashed #b9c0c8; margin: 3mm 0; }
a { color: #1f5f99; text-decoration: none; }
strong { color: #111; }
"""

PRINT_JS = r"""
const { chromium } = require('playwright');
(async () => {
  const [, , src, out, foot] = process.argv;
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://' + src, { waitUntil: 'load' });
  await p.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true,
    displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: '<div style="font-size:7.5px;width:100%;text-align:center;color:#666;">' + foot +
      '　第 <span class="pageNumber"></span>／<span class="totalPages"></span> 頁</div>' });
  await b.close();
})();
"""


def main():
    src, out = sys.argv[1], sys.argv[2]
    foot = html.escape(sys.argv[3] if len(sys.argv) > 3 else os.path.basename(src))
    text = open(src, encoding="utf-8").read()
    body = markdown.markdown(text, extensions=["tables", "fenced_code", "sane_lists"])
    body = re.sub(r'<a href="(?!https?:)[^"]*">', "<a>", body)   # 相對連結在 PDF 內不可點
    page = f"<!doctype html><html lang='zh-Hant'><head><meta charset='utf-8'><style>{CSS}</style></head><body>{body}</body></html>"
    with tempfile.TemporaryDirectory() as t:
        h = os.path.join(t, "doc.html")
        open(h, "w", encoding="utf-8").write(page)
        js = os.path.join(t, "print.js")
        open(js, "w", encoding="utf-8").write(PRINT_JS)
        subprocess.run(["node", js, h, os.path.abspath(out), foot], check=True, cwd=t)
    print("wrote", out)


if __name__ == "__main__":
    main()
