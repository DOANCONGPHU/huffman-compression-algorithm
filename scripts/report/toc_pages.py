"""Tìm số trang (theo đánh số chân trang) của từng đề mục trong bản PDF của báo cáo.

Dùng: python scripts/report/toc_pages.py <báo-cáo.pdf>
Trang PDF thứ 1 là trang bìa (không đánh số), nên số trang in = chỉ số trang PDF - 1.
"""

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "docs" / "ket-qua"


def norm(s: str) -> str:
    return " ".join(s.split())


def main() -> None:
    pdf = sys.argv[1]
    headings = json.loads((OUT_DIR / "headings.json").read_text())
    n_pages = int(next(l.split()[-1] for l in subprocess.run(
        ["pdfinfo", pdf], capture_output=True, text=True).stdout.splitlines() if l.startswith("Pages")))
    texts = [norm(subprocess.run(["pdftotext", "-f", str(i), "-l", str(i), "-layout", pdf, "-"],
                                 capture_output=True, text=True).stdout) for i in range(1, n_pages + 1)]
    pages = {}
    start = 3  # bỏ qua trang bìa và trang mục lục
    for h in headings:
        key = norm(h["text"])
        for i in range(start - 1, n_pages):
            if key in texts[i]:
                pages[h["text"]] = i  # chỉ số PDF (từ 1) trừ 1 trang bìa
                start = i + 1
                break
        else:
            raise SystemExit(f"Không tìm thấy đề mục: {h['text']}")
    (OUT_DIR / "toc_pages.json").write_text(json.dumps(pages, ensure_ascii=False, indent=1))
    print(f"Đã ghi số trang cho {len(pages)} đề mục")


if __name__ == "__main__":
    main()
