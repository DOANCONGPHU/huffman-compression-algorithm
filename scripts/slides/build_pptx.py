"""Đóng gói ảnh slide thành tệp PowerPoint 16:9, kèm ghi chú thuyết trình.

Chạy: python scripts/slides/build_pptx.py <thư-mục-ảnh> <tệp.pptx>
Mỗi slide là một ảnh phủ kín trang; tiêu đề slide được ghi làm văn bản thay thế (alt text),
nội dung <aside> của slide được ghi vào phần Notes.
"""

from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

from pptx import Presentation
from pptx.util import Emu

ROOT = Path(__file__).resolve().parents[2]
DECK = ROOT / "docs" / "slides"
W, H = Emu(12192000), Emu(6858000)  # 13,333 × 7,5 inch


def text_of(fragment: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", fragment)).strip()


def main() -> None:
    png_dir, out = Path(sys.argv[1]), Path(sys.argv[2])
    deck = json.loads((DECK / "deck.json").read_text(encoding="utf-8"))
    prs = Presentation()
    prs.slide_width, prs.slide_height = W, H
    blank = prs.slide_layouts[6]
    for i, sid in enumerate(deck["order"], start=1):
        src = (DECK / "slides" / f"{sid}.html").read_text(encoding="utf-8")
        title = re.search(r"<h[12][^>]*>(.*?)</h[12]>", src, re.S)
        notes = re.search(r"<aside>(.*?)</aside>", src, re.S)
        slide = prs.slides.add_slide(blank)
        pic = slide.shapes.add_picture(str(png_dir / f"{i:02d}-{sid}.png"), 0, 0, W, H)
        alt = text_of(title.group(1)) if title else sid
        pic.name = f"Slide {i}"
        pic._element.nvPicPr.cNvPr.set("descr", alt)
        if notes:
            slide.notes_slide.notes_text_frame.text = text_of(notes.group(1))
    prs.core_properties.title = deck["title"]
    prs.core_properties.author = "Nhóm 8 — Đoàn Công Phú, Vũ Quang Vinh"
    prs.save(out)
    print(f"Đã ghi {out} ({len(deck['order'])} slide)")


if __name__ == "__main__":
    main()
