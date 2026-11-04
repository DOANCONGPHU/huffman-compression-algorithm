#!/usr/bin/env bash
# Dựng báo cáo hai lượt: lượt 1 để lấy số trang của đề mục, lượt 2 điền mục lục.
# Cần: node (thư viện docx), LibreOffice (soffice), poppler-utils (pdfinfo, pdftotext).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TMP="$(mktemp -d)"
rm -f "$ROOT/docs/ket-qua/toc_pages.json"
node "$ROOT/scripts/report/build.js"
soffice --headless --convert-to pdf --outdir "$TMP" "$ROOT/docs/bao-cao-cuoi-ki.docx" >/dev/null
python3 "$ROOT/scripts/report/toc_pages.py" "$TMP/bao-cao-cuoi-ki.pdf"
node "$ROOT/scripts/report/build.js"
soffice --headless --convert-to pdf --outdir "$TMP" "$ROOT/docs/bao-cao-cuoi-ki.docx" >/dev/null
python3 "$ROOT/scripts/report/toc_pages.py" "$TMP/bao-cao-cuoi-ki.pdf"
node "$ROOT/scripts/report/build.js"
echo "PDF kiểm tra: $TMP/bao-cao-cuoi-ki.pdf"
