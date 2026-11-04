// Chụp từng slide trong docs/slides/ thành ảnh PNG 1920×1080 bằng Chromium (Playwright).
// Chạy: node scripts/slides/render.js <thư-mục-ảnh-ra>
// Slide viết theo định dạng HTML của kiểu Artifact "Slides": mỗi tệp một <section> 1920×1080,
// style nội tuyến; <aside> là ghi chú thuyết trình; <x-connector> là đường nối/mũi tên.
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..", "..");
const DECK = path.join(ROOT, "docs", "slides");
const OUT = path.resolve(process.argv[2] || path.join(ROOT, "docs", "slides", "png"));

const deck = JSON.parse(fs.readFileSync(path.join(DECK, "deck.json"), "utf8"));
const fontLinks = Object.values(deck.faces)
  .filter((f) => f.href)
  .map((f) => `<link rel="stylesheet" href="${f.href}">`)
  .join("\n");

// Mặc định của định dạng slide: div không khai báo display là cột flex; khoảng cách dòng mặc định.
const BASE_CSS = `
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1920px;height:1080px;overflow:hidden}
section{width:1920px;height:1080px;position:relative;overflow:hidden}
div:not([style*="display"]){display:flex;flex-direction:column}
h1{font-size:96px;font-weight:600;line-height:1.1}
h2{font-size:64px;font-weight:600;line-height:1.15}
h3{font-size:44px;font-weight:600;line-height:1.2}
p,li{line-height:1.4}
aside{display:none}
table{border-collapse:collapse}
th,td{padding:0.35em 0.6em;border:1px solid #CFC9BA;vertical-align:top}
th{font-weight:600}
a{color:inherit}
`;

// Thay <x-connector> bằng SVG: có tọa độ x1..y2 thì vẽ trong khung cha; không có thì là mũi tên ngang.
const CONNECTOR_JS = `
for (const c of [...document.querySelectorAll('x-connector')]) {
  const color = c.style.color || '#5F6B7A';
  const bw = parseFloat(c.style.borderWidth) || 2;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  if (c.hasAttribute('x1')) {
    svg.setAttribute('style', 'position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible');
    const l = document.createElementNS(NS, 'line');
    for (const k of ['x1','y1','x2','y2']) l.setAttribute(k, c.getAttribute(k));
    l.setAttribute('stroke', color); l.setAttribute('stroke-width', bw); l.setAttribute('stroke-linecap', 'round');
    svg.appendChild(l);
  } else {
    const w = parseFloat(c.style.width) || 48;
    svg.setAttribute('width', w); svg.setAttribute('height', 24);
    svg.setAttribute('style', 'flex:none;align-self:center');
    const l = document.createElementNS(NS, 'line');
    l.setAttribute('x1', 0); l.setAttribute('y1', 12); l.setAttribute('x2', w - 10); l.setAttribute('y2', 12);
    l.setAttribute('stroke', color); l.setAttribute('stroke-width', bw);
    const h = document.createElementNS(NS, 'path');
    h.setAttribute('d', 'M' + (w - 12) + ' 5 L' + w + ' 12 L' + (w - 12) + ' 19 Z'); h.setAttribute('fill', color);
    svg.appendChild(l); svg.appendChild(h);
  }
  c.replaceWith(svg);
}
`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  for (const [i, id] of deck.order.entries()) {
    const html = fs.readFileSync(path.join(DECK, "slides", `${id}.html`), "utf8");
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8">${fontLinks}<style>${BASE_CSS}</style></head><body>${html}</body></html>`, { waitUntil: "networkidle" });
    await page.evaluate(CONNECTOR_JS);
    await page.evaluate(() => document.fonts.ready);
    const file = path.join(OUT, `${String(i + 1).padStart(2, "0")}-${id}.png`);
    await page.locator("section").screenshot({ path: file });
    console.log(file);
  }
  await browser.close();
})();
