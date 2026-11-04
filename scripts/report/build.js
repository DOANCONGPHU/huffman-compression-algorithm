// Sinh báo cáo cuối kỳ docs/bao-cao-cuoi-ki.docx từ kết quả thực nghiệm.
// Chạy: node scripts/report/build.js
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, LevelFormat, PageBreak, Footer,
  PageNumber, Header, LineRuleType, TabStopType, ImageRun,
  HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, TextWrappingType,
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
const GROUP = {
  number: "8",
  members: [
    { name: "Đoàn Công Phú", id: "268119157", cls: "34CNTT11" },
    { name: "Vũ Quang Vinh", id: "", cls: "34CNTT11" },
  ],
  supervisor: "",  // chưa biết tên giảng viên hướng dẫn: để trống cho nhóm điền
};

// Trang bìa dựng lại theo tệp “BaoCao_DevSecOps_TichHop.docx” do nhóm cung cấp: khung viền
// và logo trường, chữ Times New Roman 13 pt căn giữa, tiêu đề 17 pt in đậm. Lề trang, vị trí
// và kích thước hình (EMU), khoảng cách đoạn (twip) chép đúng từ tệp mẫu.
const ASSETS = path.join(__dirname, "assets");
const EMU_PER_PX = 9525;
const COVER_MARGIN = { top: 1560, bottom: 1400, left: 1560, right: 1560 };

function titlePage() {
  const line = (text, size, opts = {}) => new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: opts.before || 0, after: opts.after ?? 0, line: opts.line, lineRule: opts.line ? LineRuleType.AUTO : undefined },
    children: text ? [new TextRun({ text, size, bold: opts.bold, italics: opts.italics })] : [],
  });
  const frame = new ImageRun({
    type: "jpg",
    data: fs.readFileSync(path.join(ASSETS, "bia_khung.jpg")),
    transformation: { width: 6229350 / EMU_PER_PX, height: 9486900 / EMU_PER_PX },
    floating: {
      horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: 666925 },
      verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 602599 },
      behindDocument: true,
      allowOverlap: true,
      wrap: { type: TextWrappingType.NONE },
    },
  });
  const logo = new ImageRun({
    type: "png",
    data: fs.readFileSync(path.join(ASSETS, "bia_logo.png")),
    transformation: { width: 990600 / EMU_PER_PX, height: 1276350 / EMU_PER_PX },
    altText: { name: "Logo", description: "Logo Trường Đại học Thủy lợi", title: "Logo" },
  });
  const blank = "……………………";
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [frame, logo] }),
    line("TRƯỜNG ĐẠI HỌC THỦY LỢI", 26, { bold: true, after: 60 }),
    line("KHOA CÔNG NGHỆ THÔNG TIN", 26, { after: 1220 }),
    line("BÁO CÁO BÀI TẬP LỚN CUỐI KỲ", 26, { after: 240 }),
    line("ỨNG DỤNG THUẬT TOÁN THAM LAM HUFFMAN TRONG NÉN DỮ LIỆU CẢM BIẾN IoT", 34,
      { bold: true, after: 240, line: 400 }),
    line("Học phần: Thuật toán nâng cao", 26, { italics: true, after: 1600 }),
    line(`Nhóm thực hiện: Nhóm ${GROUP.number}`, 26, { after: 120 }),
    ...GROUP.members.map((x) => line(`${x.name} – Lớp: ${x.cls} – Mã học viên: ${x.id || blank}`, 26, { after: 120 })),
    line(`Giảng viên hướng dẫn: ${GROUP.supervisor || "……………………………"}`, 26, { after: 120 }),
    line("Hà Nội, 2026", 26, { before: 2860 }),
  ];  // không cần ngắt trang: phần tiếp theo là một section mới nên tự sang trang
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
