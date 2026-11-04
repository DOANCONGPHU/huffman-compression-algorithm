// Sinh báo cáo cuối kỳ docs/bao-cao-cuoi-ki.docx từ kết quả thực nghiệm.
// Chạy: node scripts/report/build.js
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, LevelFormat, PageBreak, Footer,
  PageNumber, Header, LineRuleType, TabStopType, ImageRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom,
  TextWrappingType,
} = require("docx");
const H = require("./helpers");
const { REFS } = require("./references");
const T = require("./theory");
const X = require("./results");

const ROOT = path.resolve(__dirname, "..", "..");
const res = JSON.parse(fs.readFileSync(path.join(ROOT, "docs", "ket-qua", "iot_results.json"), "utf8"));
const OUT = path.join(ROOT, "docs", "bao-cao-cuoi-ki.docx");
const FONT = H.FONT;

function center(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: opts.before || 0, after: opts.after || 120 },
    children: [new TextRun({ text, bold: opts.bold, size: opts.size || 26, font: FONT, allCaps: opts.caps })],
  });
}

// Thông tin nhóm thực hiện (in trên trang bìa).
const SCHOOL = "TRƯỜNG CAO ĐẲNG KỸ THUẬT – CÔNG NGHỆ BÁCH KHOA"; // theo bìa mẫu của nhóm
const GROUP = {
  number: "8",
  members: [
    { name: "Đoàn Công Phú", id: "", cls: "34CNTT11" },
    { name: "Vũ Quang Vinh", id: "", cls: "34CNTT11" },
  ],
};

// Trang bìa dựng lại theo tệp “Bìa mẫu báo cáo.docx” do nhóm cung cấp: khung viền nằm sau chữ,
// logo ở giữa, cỡ chữ 14/16/18 pt in đậm, bảng thông tin sinh viên không viền thụt 1701 DXA.
// Lề trang, vị trí và kích thước hình (EMU) chép đúng từ tệp mẫu.
const ASSETS = path.join(__dirname, "assets");
const EMU_PER_PX = 9525;
const COVER_MARGIN = { top: 1418, bottom: 1418, left: 1701, right: 1134 };

function titlePage() {
  const line = (text, size, opts = {}) => new Paragraph({
    alignment: opts.left ? AlignmentType.LEFT : AlignmentType.CENTER,
    spacing: { before: opts.before || 0, after: opts.after ?? 160, line: opts.line || 259, lineRule: LineRuleType.AUTO },
    children: [...(opts.lead || []), ...(text ? [new TextRun({ text, bold: true, size })] : [])],
  });
  const frame = new ImageRun({
    type: "jpg",
    data: fs.readFileSync(path.join(ASSETS, "bia_khung.jpg")),
    transformation: { width: 6226460 / EMU_PER_PX, height: 9486932 / EMU_PER_PX },
    outline: { type: "solidFill", solidFillType: "rgb", value: "0000FF", width: 9525 },
    altText: { name: "khung doi", description: "khung doi", title: "khung doi" },
    floating: {
      horizontalPosition: { relative: HorizontalPositionRelativeFrom.MARGIN, offset: -244563 },
      verticalPosition: { relative: VerticalPositionRelativeFrom.PARAGRAPH, offset: -282290 },
      behindDocument: true,
      allowOverlap: true,
      wrap: { type: TextWrappingType.NONE },
    },
  });
  const logo = new ImageRun({
    type: "jpg",
    data: fs.readFileSync(path.join(ASSETS, "bia_logo.jpg")),
    transformation: { width: 1991995 / EMU_PER_PX, height: 1991995 / EMU_PER_PX },
  });

  // Bảng thông tin: hai cột 2263 + 4686 DXA, không viền, chữ đậm 14 pt, giãn dòng 1,5.
  const noBorder = { style: BorderStyle.NONE, size: 0, color: "auto" };
  const cell = (text, width) => new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
    children: [new Paragraph({ spacing: { after: 0, line: 360, lineRule: LineRuleType.AUTO },
      children: [new TextRun({ text, bold: true, size: 28 })] })],
  });
  const info = [
    ["Sinh viên:", GROUP.members[0].name.toUpperCase()],
    ...GROUP.members.slice(1).map((m) => ["", m.name.toUpperCase()]),
    ["Mã số sinh viên:", GROUP.members.map((m) => m.id || "…………").join(" ; ")],
    ["Lớp:", [...new Set(GROUP.members.map((m) => m.cls))].join(", ")],
    ["Nhóm:", GROUP.number],
  ];
  const infoTable = new Table({
    width: { size: 6949, type: WidthType.DXA },
    columnWidths: [2263, 4686],
    indent: { size: 1701, type: WidthType.DXA },
    borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder,
      insideHorizontal: noBorder, insideVertical: noBorder },
    rows: info.map(([k, v]) => new TableRow({ children: [cell(k, 2263), cell(v, 4686)] })),
  });

  return [
    line("BỘ GIÁO DỤC VÀ ĐÀO TẠO", 28, { lead: [frame], after: 0 }),
    line(SCHOOL, 28),
    line("", 32),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [logo] }),
    line("", 24),
    line("BÁO CÁO BÀI TẬP LỚN CUỐI KỲ", 32),
    line("MÔN: THUẬT TOÁN NÂNG CAO", 32),
    line("", 32),
    line("ỨNG DỤNG THUẬT TOÁN THAM LAM HUFFMAN", 36, { line: 276, after: 0 }),
    line("TRONG NÉN DỮ LIỆU CẢM BIẾN IoT", 36, { line: 276 }),
    line("", 28, { line: 276 }),
    line("CBHD: ……………………………", 28, { line: 276 }),
    line("", 28, { line: 276 }),
    infoTable,
    line("", 28, { line: 276 }),
    line("", 28, { line: 276 }),
    line("Hà Nội – 2026", 28, { line: 276, after: 0, before: 520 }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// Mục lục tĩnh: số trang đọc từ docs/ket-qua/toc_pages.json do scripts/report/toc_pages.py
// tạo ra sau lần dựng đầu (xem scripts/report/make.sh). Thiếu tệp thì để trống số trang.
const TOC_FILE = path.join(ROOT, "docs", "ket-qua", "toc_pages.json");
const TOC_PAGES = fs.existsSync(TOC_FILE) ? JSON.parse(fs.readFileSync(TOC_FILE, "utf8")) : {};

function toc(headings) {
  const entries = headings.map((h) => new Paragraph({
    indent: { left: h.level === 1 ? 0 : 400 },
    spacing: { after: h.level === 1 ? 60 : 20, before: h.level === 1 ? 80 : 0 },
    children: [
      new TextRun({ text: h.text, bold: h.level === 1, size: h.level === 1 ? 24 : 23 }),
      new TextRun({ text: "\t" + String(TOC_PAGES[h.text] || "  "), bold: h.level === 1, size: h.level === 1 ? 24 : 23 }),
    ],
    tabStops: [{ type: TabStopType.RIGHT, position: H.CONTENT_WIDTH, leader: "dot" }],
  }));
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 },
      children: [new TextRun({ text: "MỤC LỤC", bold: true, size: 30 })] }),
    ...entries,
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

function references() {
  const groups = [
    ["classic", "Công trình gốc về mã Huffman và nén từ điển"],
    ["recent", "Nghiên cứu cập nhật (tạp chí Q1/Q2 theo SCImago)"],
    ["data", "Bài báo công bố bộ dữ liệu"],
    ["book", "Giáo trình"],
  ];
  const out = [H.h1("TÀI LIỆU THAM KHẢO")];
  for (const [g, title] of groups) {
    out.push(H.h3(title));
    REFS.forEach((r, i) => {
      if (r.group !== g) return;
      const children = [new TextRun({ text: `[${i + 1}] `, bold: true }), ...H.runs(r.text)];
      if (r.rank) children.push(new TextRun({ text: ` (SJR: ${r.rank})` }));
      if (r.url) {
        children.push(new TextRun({ text: " Link: " }));
        children.push(H.link(r.url, r.url));
      }
      out.push(new Paragraph({ children, alignment: AlignmentType.LEFT,
        indent: { left: 567, hanging: 567 }, spacing: { after: 100 } }));
    });
  }
  out.push(H.p("_Bộ dữ liệu (bản sao đã dùng):_ github.com/LuisM78/Occupancy-detection-data; github.com/LuisM78/Appliances-energy-prediction-data; github.com/jbrownlee/Datasets (pollution.csv, household_power_consumption.zip, daily-min-temperatures.csv, monthly-sunspots.csv, ionosphere.csv, daily-total-female-births.csv, shampoo.csv). Trang gốc của các bộ dữ liệu UCI: archive.ics.uci.edu.", { noIndent: true, run: { size: 22 } }));
  return out;
}

const listLevel = (format, text) => ({
  levels: [{ level: 0, format, text, alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
});

// Dựng phần thân trước để thu thập đề mục cho mục lục.
const BODY = [
  ...T.abstract(),
  ...T.introduction(),
  ...T.relatedWork(),
  ...T.theory(),
  ...T.complexity(),
  ...X.implementation(),
  ...X.experiments(res),
  ...X.discussion(res),
  ...X.conclusion(),
  ...references(),
  ...X.appendix(res),
];
const BODY_HEADINGS = [...H.HEADINGS];
fs.writeFileSync(path.join(ROOT, "docs", "ket-qua", "headings.json"), JSON.stringify(BODY_HEADINGS, null, 1));

const doc = new Document({
  creator: "Nhóm 8 — Đoàn Công Phú, Vũ Quang Vinh (34CNTT11)",
  title: "Ứng dụng thuật toán tham lam Huffman trong nén dữ liệu cảm biến IoT",
  styles: {
    default: { document: { run: { font: FONT, size: 26 }, paragraph: { spacing: { line: 312, lineRule: LineRuleType.AUTO } } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 30, bold: true, color: "1F3864" },
        paragraph: { spacing: { before: 360, after: 180 }, keepNext: true, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 27, bold: true, color: "1F3864" },
        paragraph: { spacing: { before: 240, after: 120 }, keepNext: true, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 26, bold: true, italics: true },
        paragraph: { spacing: { before: 180, after: 100 }, keepNext: true, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", ...listLevel(LevelFormat.BULLET, "•") },
      ...["steps", "goals", "fgk", "conc"].map((reference) => ({
        reference, ...listLevel(LevelFormat.DECIMAL, "%1."),
      })),
    ],
  },
  sections: [
    {
      properties: { page: { size: { width: 11906, height: 16838 },
        margin: COVER_MARGIN } },
      children: titlePage(),
    },
    {
      properties: { page: { size: { width: 11906, height: 16838 },
        margin: { top: 1134, bottom: 1134, left: 1701, right: 1134 },
        pageNumbers: { start: 1 } } },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: "Ứng dụng thuật toán tham lam Huffman trong nén dữ liệu cảm biến IoT", italics: true, size: 20, color: "52514E" })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
        children: [new TextRun({ children: [PageNumber.CURRENT], size: 22 })] })] }) },
      children: [
        ...toc(BODY_HEADINGS),
        ...BODY,
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT, buf);
  console.log("Đã ghi", OUT);
});
