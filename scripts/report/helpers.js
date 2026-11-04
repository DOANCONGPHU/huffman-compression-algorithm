// Các hàm dựng khối văn bản dùng chung cho báo cáo (thư viện docx).
const fs = require("fs");
const {
  Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, ImageRun, ExternalHyperlink, LineRuleType,
} = require("docx");

const FONT = "Times New Roman";
const CONTENT_WIDTH = 9071; // A4 (11906) trừ lề trái 3 cm (1701) và phải 2 cm (1134)

// Phân tích chuỗi có đánh dấu đơn giản: **đậm**, _nghiêng_, ^chỉ số trên^, ~chỉ số dưới~.
function runs(text, base = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|(?<![\w])_[^_]+_(?![\w])|\^[^^]+\^|~[^~]+~)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), ...base }));
    const tok = m[0];
    const inner = tok.startsWith("**") ? tok.slice(2, -2) : tok.slice(1, -1);
    if (tok.startsWith("**")) out.push(new TextRun({ text: inner, bold: true, ...base }));
    else if (tok.startsWith("_")) out.push(new TextRun({ text: inner, italics: true, ...base }));
    else if (tok.startsWith("^")) out.push(new TextRun({ text: inner, superScript: true, ...base }));
    else out.push(new TextRun({ text: inner, subScript: true, ...base }));
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), ...base }));
  return out;
}

function p(text, opts = {}) {
  return new Paragraph({
    children: Array.isArray(text) ? text : runs(text, opts.run || {}),
    alignment: opts.align || AlignmentType.JUSTIFIED,
    indent: opts.noIndent ? undefined : { firstLine: 567 },
    spacing: { after: 120, ...(opts.spacing || {}) },
    keepNext: opts.keepNext,
  });
}

// Ghi lại các đề mục cấp 1, 2 để dựng mục lục tĩnh (có số trang lấy từ bản PDF).
const HEADINGS = [];
function h1(text) { HEADINGS.push({ level: 1, text }); return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] }); }
function h2(text) { HEADINGS.push({ level: 2, text }); return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] }); }
function h3(text) { return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(text)] }); }

function bullet(text, level = 0) {
  return new Paragraph({ children: runs(text), numbering: { reference: "bullets", level },
    alignment: AlignmentType.JUSTIFIED, spacing: { after: 60 } });
}

function numbered(text, ref = "steps") {
  return new Paragraph({ children: runs(text), numbering: { reference: ref, level: 0 },
    alignment: AlignmentType.JUSTIFIED, spacing: { after: 60 } });
}

// Công thức hiển thị ở giữa dòng, kèm số hiệu bên phải.
function eq(text, label) {
  const children = runs(text, { italics: false });
  if (label) children.push(new TextRun({ text: `\t(${label})` }));
  return new Paragraph({
    children,
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 120 },
    tabStops: label ? [{ type: "right", position: CONTENT_WIDTH }] : undefined,
  });
}

// Khối mã giả / mã nguồn: phông đơn cách, nền xám nhạt.
function code(lines) {
  return lines.map((line, i) => new Paragraph({
    children: [new TextRun({ text: line.length ? line : " ", font: "Courier New", size: 20 })],
    shading: { type: ShadingType.CLEAR, fill: "F3F3F1", color: "auto" },
    spacing: { before: i === 0 ? 60 : 0, after: i === lines.length - 1 ? 160 : 0, line: 260 },
    indent: { left: 284 },
    keepLines: true,
    keepNext: i !== lines.length - 1,
  }));
}

function caption(text) {
  return new Paragraph({ children: runs(text, { size: 22 }), alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 200 } });
}

function tableCaption(text) {
  return new Paragraph({ children: runs(text, { size: 22 }), alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 80 }, keepNext: true });
}

const border = { style: BorderStyle.SINGLE, size: 4, color: "8C8B86" };
const borders = { top: border, bottom: border, left: border, right: border };

// widths: mảng độ rộng cột (DXA), tổng phải bằng độ rộng bảng.
function table(headers, rows, widths, opts = {}) {
  const total = widths.reduce((a, b) => a + b, 0);
  const size = opts.size || 20;
  const cell = (text, i, header) => new TableCell({
    borders,
    width: { size: widths[i], type: WidthType.DXA },
    shading: header ? { fill: "E8EEF6", type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 50, bottom: 50, left: 90, right: 90 },
    children: [new Paragraph({
      children: runs(String(text), { size, bold: header || undefined }),
      alignment: header ? AlignmentType.CENTER
        : (opts.align && opts.align[i]) || AlignmentType.LEFT,
    })],
  });
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, i, true)) }),
      ...rows.map((r) => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, i, false)) })),
    ],
  });
}

function figure(path, widthPx, heightPx) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    keepNext: true,
    spacing: { before: 120, after: 0, line: 240, lineRule: LineRuleType.AUTO },
    children: [new ImageRun({ type: "png", data: fs.readFileSync(path),
      transformation: { width: widthPx, height: heightPx } })],
  });
}

function link(text, url) {
  return new ExternalHyperlink({ link: url, children: [new TextRun({ text, style: "Hyperlink" })] });
}

module.exports = { HEADINGS, FONT, CONTENT_WIDTH, runs, p, h1, h2, h3, bullet, numbered, eq, code, caption,
  tableCaption, table, figure, link };
