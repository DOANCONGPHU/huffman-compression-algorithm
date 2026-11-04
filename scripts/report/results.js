// Các chương cài đặt, thực nghiệm, thảo luận, kết luận. Mọi con số lấy trực tiếp từ
// docs/ket-qua/iot_results.json để tránh sai sót khi chép tay.
const path = require("path");
const { AlignmentType } = require("docx");
const H = require("./helpers");
const { cite } = require("./references");

const { p, h1, h2, h3, bullet, numbered, eq, code, caption, tableCaption, table, figure } = H;
const R = AlignmentType.RIGHT;
const C = AlignmentType.CENTER;

const ROOT = path.resolve(__dirname, "..", "..");
const FIG = (name) => path.join(ROOT, "docs", "ket-qua", name);

const CODECS = ["static_huffman", "adaptive_huffman", "lz77", "lz78"];
const NAME = { static_huffman: "Huffman tĩnh", adaptive_huffman: "Huffman thích nghi", lz77: "LZ77", lz78: "LZ78" };

// Số kiểu Việt Nam: dấu phẩy thập phân, dấu chấm phân cách hàng nghìn.
function vn(x, digits = 1) {
  const s = Number(x).toFixed(digits);
  const [i, d] = s.split(".");
  const ii = i.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return d ? `${ii},${d}` : ii;
}
const pct = (x, d = 1) => vn(x * 100, d);
const short = (f) => f.replace(/\.(csv|txt)$/, "");

const DATA_INFO = {
  "appliances_energy.csv": ["UCI Appliances Energy Prediction " + cite("candanedo2017"), "Nhiệt độ, độ ẩm từng phòng qua mạng cảm biến không dây ZigBee, điện năng thiết bị; chu kỳ 10 phút, 11/01–27/05/2016 (19.735 dòng)", "IoT"],
  "beijing_pollution.csv": ["UCI Beijing PM2.5 " + cite("liang2015") + ", bản làm sạch của kho jbrownlee/Datasets", "PM2.5, điểm sương, nhiệt độ, áp suất, gió; theo giờ, 2010–2014 (43.800 dòng)", "Cảm biến môi trường"],
  "household_power_30days.txt": ["UCI Individual Household Electric Power Consumption (30 ngày đầu)", "Công suất, điện áp, dòng điện, 3 công tơ phụ; chu kỳ 1 phút, 16/12/2006–15/01/2007 (43.200 dòng)", "Công tơ thông minh"],
  "occupancy_datatraining.txt": ["UCI Occupancy Detection " + cite("candanedo2016"), "Nhiệt độ, độ ẩm, ánh sáng, CO2 trong phòng làm việc; chu kỳ 1 phút (8.143 dòng)", "IoT"],
  "occupancy_datatest.txt": ["UCI Occupancy Detection " + cite("candanedo2016"), "Như trên, tập kiểm thử 1 (2.665 dòng)", "IoT"],
  "occupancy_datatest2.txt": ["UCI Occupancy Detection " + cite("candanedo2016"), "Như trên, tập kiểm thử 2 (9.752 dòng)", "IoT"],
  "daily_min_temperatures.csv": ["Kaggle: Daily minimum temperatures in Melbourne " + cite("nasif2021"), "Nhiệt độ thấp nhất hằng ngày 1981–1990 (3.650 dòng)", "Trạm khí tượng"],
  "monthly_sunspots.csv": ["Monthly sunspots " + cite("nasif2021"), "Số vết đen Mặt Trời hằng tháng 1749–1983 (2.820 dòng)", "Chuỗi thời gian"],
  "ionosphere.csv": ["UCI Ionosphere " + cite("nasif2021"), "Tín hiệu radar, 34 thuộc tính số thực (351 dòng)", "Tín hiệu đo"],
  "daily_female_births.csv": ["Daily total female births " + cite("nasif2021"), "Số trẻ sơ sinh nữ hằng ngày, California 1959", "Chuỗi thời gian"],
  "shampoo_sales.csv": ["Sales of shampoo over a three year period " + cite("nasif2021"), "Doanh số theo tháng, 36 dòng", "Chuỗi thời gian"],
};

// Thứ tự trình bày: dữ liệu cảm biến IoT trước, dữ liệu đối chiếu với Nasif (2021) sau.
const ORDER = ["appliances_energy.csv", "household_power_30days.txt", "beijing_pollution.csv",
  "occupancy_datatraining.txt", "occupancy_datatest.txt", "occupancy_datatest2.txt",
  "daily_min_temperatures.csv", "monthly_sunspots.csv", "ionosphere.csv",
  "daily_female_births.csv", "shampoo_sales.csv"];

// Kết quả của Nasif và cs. (2021), Bảng 2 trong bài báo: tỉ lệ nén (%).
const NASIF = {
  "daily_min_temperatures.csv": { size: "54,5", h: 49, ah: 44, lz77: 172, lz78: 102 },
  "monthly_sunspots.csv": { size: "43,9", h: 49, ah: 45, lz77: 166, lz78: 98 },
  "ionosphere.csv": { size: "74,6", h: 45, ah: 45, lz77: 168, lz78: 120 },
  "daily_female_births.csv": { size: "6,07", h: 49, ah: 43, lz77: 165, lz78: 91 },
  "shampoo_sales.csv": { size: "0,497", h: 121, ah: 67, lz77: 201, lz78: 197 },
};

function rows(res) {
  const by = Object.fromEntries(res.datasets.map((d) => [d.file, d]));
  return ORDER.map((f) => by[f]);
}

function avgCodeLength(d) {
  // Phần đầu Huffman tĩnh: 4 byte độ dài + 2 byte số ký hiệu + 2 byte cho mỗi ký hiệu.
  const header = 6 + 2 * d.distinct_symbols;
  return ((d.codecs.static_huffman.bytes - header) * 8) / d.bytes;
}

function implementation() {
  const W1 = [2700, 6371];
  const W2 = [1700, 2400, 4971];
  return [
    h1("5. CÀI ĐẶT"),
    h2("5.1. Tổ chức mã nguồn"),
    p("Bốn thuật toán được tự cài đặt bằng Python 3 (không dùng thư viện nén có sẵn) trong gói iot_compression, đặt cạnh mã Huffman cho ảnh đã có từ bài giữa kỳ. Mã nguồn, dữ liệu kết quả và script tạo báo cáo nằm trong kho mã của đề tài (nhánh final-exam)."),
    tableCaption("**Bảng 3.** Các tệp mã nguồn chính"),
    table(["Tệp", "Nội dung"], [
      ["iot_compression/bitio.py", "Ghi/đọc dòng bit (bit cao trước), phần đầu 4 byte chứa độ dài dữ liệu gốc."],
      ["iot_compression/static_huffman.py", "Huffman tĩnh: đếm tần suất, dựng cây bằng heap (và hai biến thể quét tuyến tính, hai hàng đợi để đối chiếu), mã chính tắc, mã hóa và giải mã."],
      ["iot_compression/adaptive_huffman.py", "Huffman thích nghi theo FGK: nút NYT, đánh số thứ tự nút, tìm nút dẫn đầu khối, đổi chỗ, cập nhật trọng số."],
      ["iot_compression/lz77.py", "LZ77 bộ ba (offset, length, ký tự) với bảng băm tiền tố 3 byte."],
      ["iot_compression/lz78.py", "LZ78 cặp (chỉ số cụm, ký tự) với từ điển dạng trie."],
      ["scripts/fetch_iot_datasets.py", "Tải dữ liệu, in kích thước và mã băm SHA-256."],
      ["scripts/benchmark_iot.py", "Ba thực nghiệm, ghi kết quả ra docs/ket-qua/iot_results.json."],
      ["scripts/plot_iot.py, scripts/report/", "Vẽ biểu đồ và sinh báo cáo .docx trực tiếp từ tệp kết quả."],
      ["tests/test_iot_codecs.py", "49 ca kiểm thử tự động cho các bộ nén."],
    ], W1, { size: 19 }),
    h2("5.2. Định dạng dữ liệu nén và tham số"),
    p("Mọi định dạng bắt đầu bằng 4 byte ghi độ dài dữ liệu gốc. Tỉ lệ nén được tính trên toàn bộ tệp nén, **bao gồm** phần đầu và bảng mã, để so sánh công bằng giữa các thuật toán. Tham số được chọn theo mô tả gốc của từng thuật toán và được nêu rõ trong Bảng 4."),
    tableCaption("**Bảng 4.** Định dạng và tham số của từng bộ nén"),
    table(["Thuật toán", "Thông tin phụ", "Mã hóa và tham số"], [
      ["Huffman tĩnh", "2 + 2k byte bảng độ dài mã chính tắc (k ký hiệu)", "Mã chính tắc suy ra từ độ dài mã; hai bên dựng lại cùng một bảng mã. Giải mã chính tắc từng bit."],
      ["Huffman thích nghi", "Không có", "FGK; ký hiệu mới: mã NYT + 8 bit thô. Cây tối đa 513 nút."],
      ["LZ77", "Không có", "Bộ ba cố định 24 bit: offset 12 bit (cửa sổ 4.095 byte), length 4 bit (tối đa 15), ký tự 8 bit. Khớp tối thiểu 3 byte; mỗi vị trí xét tối đa 64 ứng viên gần nhất trong bảng băm."],
      ["LZ78", "Không có", "Cặp (chỉ số, ký tự); chỉ số ghi ⌈log~2~(kích thước từ điển)⌉ bit, tăng dần; từ điển tối đa 65.536 cụm, đầy thì xóa và xây lại."],
    ], W2, { size: 19 }),
    h2("5.3. Kiểm thử"),
    p("Bộ kiểm thử gồm 49 ca cho các bộ nén (toàn kho có 95 ca, đều đạt). Các nhóm kiểm thử chính:"),
    bullet("**Nén–giải nén khôi phục đúng từng byte** cho cả 4 thuật toán trên 9 mẫu: dữ liệu rỗng, 1 byte, 1 ký hiệu lặp, 2 ký hiệu, CSV cảm biến, đủ 256 giá trị byte, dữ liệu ngẫu nhiên, dữ liệu lệch, chuỗi lặp dài (36 ca)."),
    bullet("**Tính tối ưu của Huffman:** ví dụ giáo trình cho chi phí đúng 224 bit; độ dài mã trung bình thỏa H ≤ L̄ < H + 1; độ dài mã thỏa đẳng thức Kraft; ba cách dựng cây (heap, quét tuyến tính, hai hàng đợi) cho cùng chi phí trên 5 kích thước bảng chữ."),
    bullet("**Tính chất anh em của cây FGK:** sau mỗi lần cập nhật, kiểm tra trọng số không giảm theo số thứ tự, các cặp nút (2j − 1, 2j) là anh em, và trọng số nút trong bằng tổng hai con."),
    bullet("**Xử lý dữ liệu hỏng:** dòng nén bị cụt bị từ chối bằng lỗi ValueError thay vì trả về dữ liệu sai."),
    p("Ngoài ra, trong mọi lần đo của Mục 6, kết quả giải nén đều được so sánh với dữ liệu gốc; chương trình dừng nếu có sai khác."),
  ];
}

function experiments(res) {
  const ds = rows(res);
  const env = res.environment;
  const big = ds.filter((d) => d.bytes >= 200000);
  const out = [];

  out.push(h1("6. THỰC NGHIỆM VÀ KẾT QUẢ"));
  out.push(h2("6.1. Dữ liệu"));
  out.push(p("Thực nghiệm dùng 11 tệp dữ liệu công khai, chia làm hai nhóm. Nhóm thứ nhất là dữ liệu cảm biến IoT và cảm biến môi trường thực từ kho UCI: phát hiện người trong phòng bằng cảm biến nhiệt độ, độ ẩm, ánh sáng, CO2 " + cite("candanedo2016") + "; năng lượng thiết bị trong nhà đo bằng mạng cảm biến không dây ZigBee " + cite("candanedo2017") + "; ô nhiễm PM2.5 tại Bắc Kinh " + cite("liang2015") + "; và công tơ điện hộ gia đình chu kỳ 1 phút. Nhóm thứ hai gồm năm tệp cũng được dùng trong " + cite("nasif2021") + " để đối chiếu trực tiếp. Do môi trường thực nghiệm không truy cập được trực tiếp archive.ics.uci.edu và kaggle.com, các tệp được tải từ bản sao công khai trên GitHub (kho của chính tác giả bộ dữ liệu Occupancy và Appliances, và kho tổng hợp jbrownlee/Datasets); mã băm SHA-256 của từng tệp được ghi ở Phụ lục để kiểm tra lại. Dữ liệu được nén ở dạng văn bản CSV gốc, giống cách làm của " + cite("nasif2021") + "."));
  out.push(tableCaption("**Bảng 5.** Các bộ dữ liệu thực nghiệm (k: số giá trị byte phân biệt; H: entropy bậc 0, bit/byte)"));
  out.push(table(["Tệp", "Nguồn", "Nội dung", "Kích thước (byte)", "k", "H"],
    ds.map((d) => [short(d.file), DATA_INFO[d.file][0], DATA_INFO[d.file][1], vn(d.bytes, 0), d.distinct_symbols, vn(d.entropy_bits, 3)]),
    [1750, 2050, 2771, 1100, 500, 900], { size: 18, align: [null, null, null, R, R, R] }));

  out.push(h2("6.2. Môi trường và phương pháp đo"));
  out.push(p(`Các thực nghiệm chạy trên máy ảo Linux (bộ xử lý Intel Xeon 2,10 GHz, 4 nhân ảo), Python ${env.python}. Mỗi phép nén và giải nén được lặp ${res.repeats} lần và lấy trung vị thời gian (thực nghiệm dựng cây lặp ${res.scaling_repeats} lần). **Tỉ lệ nén** được định nghĩa như trong " + cite("nasif2021") + ": tỉ lệ = kích thước sau nén / kích thước gốc × 100%, tức càng nhỏ càng tốt và lớn hơn 100% nghĩa là dữ liệu bị phình ra. Để có một mốc tham chiếu, bảng kết quả kèm tỉ lệ nén của DEFLATE (thư viện zlib, mức 9) — một thuật toán công nghiệp kết hợp LZ77 với mã Huffman; thời gian của zlib không được so sánh vì nó viết bằng C.`.replace('" + cite("nasif2021") + "', cite("nasif2021"))));

  // Bảng tỉ lệ nén
  out.push(h2("6.3. Tỉ lệ nén"));
  const best = (d) => CODECS.reduce((a, c) => (d.codecs[c].ratio < d.codecs[a].ratio ? c : a), CODECS[0]);
  const wins = Object.fromEntries(CODECS.map((c) => [c, 0]));
  ds.forEach((d) => { wins[best(d)] += 1; });
  const mean = (c) => ds.reduce((s, d) => s + d.codecs[c].ratio, 0) / ds.length;
  const iot = ds.slice(0, 6);
  const meanIot = (c) => iot.reduce((s, d) => s + d.codecs[c].ratio, 0) / iot.length;
  out.push(tableCaption("**Bảng 6.** Tỉ lệ nén (%) — giá trị in đậm là tốt nhất trong bốn thuật toán tự cài đặt"));
  const ratioRows = ds.map((d) => {
    const b = best(d);
    return [short(d.file), vn(d.bytes, 0),
      ...CODECS.map((c) => (c === b ? `**${pct(d.codecs[c].ratio)}**` : pct(d.codecs[c].ratio))),
      pct(d.deflate_bytes / d.bytes)];
  });
  ratioRows.push(["Trung bình 6 tệp IoT", "", ...CODECS.map((c) => pct(meanIot(c))), pct(iot.reduce((s, d) => s + d.deflate_bytes / d.bytes, 0) / iot.length)]);
  ratioRows.push(["Trung bình 11 tệp", "", ...CODECS.map((c) => pct(mean(c))), pct(ds.reduce((s, d) => s + d.deflate_bytes / d.bytes, 0) / ds.length)]);
  out.push(table(["Tệp", "Kích thước (byte)", "Huffman tĩnh", "Huffman thích nghi", "LZ77", "LZ78", "DEFLATE (tham chiếu)"],
    ratioRows, [2271, 1300, 1100, 1200, 1000, 1000, 1200], { size: 19, align: [null, R, R, R, R, R, R] }));
  out.push(figure(FIG("hinh_ti_le_nen.png"), 560, 498));
  out.push(caption("**Hình 1.** Tỉ lệ nén của bốn thuật toán trên 11 tệp dữ liệu (càng ngắn càng tốt)"));

  const diffStaticAdaptive = Math.max(...ds.filter((d) => d.bytes > 40000).map((d) => Math.abs(d.codecs.static_huffman.ratio - d.codecs.adaptive_huffman.ratio)));
  out.push(p(`Bảng 6 và Hình 1 cho thấy ba quan sát chính. **Thứ nhất**, hai biến thể Huffman cho tỉ lệ nén gần như trùng nhau trên mọi tệp lớn hơn 40 KB (chênh lệch không quá ${pct(diffStaticAdaptive, 2)} điểm phần trăm), dao động trong khoảng ${pct(Math.min(...ds.map((d) => d.codecs.static_huffman.ratio)))}–${pct(Math.max(...ds.filter((d) => d.bytes > 1000).map((d) => d.codecs.static_huffman.ratio)))}%. Điều này phù hợp với lý thuyết: với dữ liệu dài, phân bố tích lũy mà FGK dùng nhanh chóng hội tụ về phân bố toàn cục mà Huffman tĩnh dùng, còn bảng mã của Huffman tĩnh (tối đa 514 byte) không đáng kể. Chỉ ở hai tệp rất nhỏ, Huffman thích nghi mới tốt hơn rõ rệt nhờ không phải gửi bảng mã (shampoo_sales: ${pct(ds[10].codecs.adaptive_huffman.ratio)}% so với ${pct(ds[10].codecs.static_huffman.ratio)}%).`));
  out.push(p(`**Thứ hai**, trái với kết luận của " + cite("nasif2021") + ", các thuật toán từ điển cho tỉ lệ nén tốt hơn Huffman trên phần lớn các tệp: LZ78 tốt nhất ở ${wins.lz78} tệp, LZ77 ở ${wins.lz77} tệp, Huffman thích nghi ở ${wins.adaptive_huffman} tệp và Huffman tĩnh ở ${wins.static_huffman} tệp. Trên 6 tệp dữ liệu cảm biến IoT, tỉ lệ trung bình của LZ78 là ${pct(meanIot("lz78"))}%, của LZ77 là ${pct(meanIot("lz77"))}%, còn của Huffman là ${pct(meanIot("static_huffman"))}%. Nguyên nhân là dữ liệu cảm biến dạng CSV chứa rất nhiều chuỗi lặp — dấu thời gian chỉ khác nhau vài chữ số cuối, các giá trị đo thay đổi chậm, các dấu ngăn cách lặp ở vị trí cố định — mà mã Huffman bậc 0 không khai thác được vì nó mã hóa từng byte độc lập (nhận xét (ii) ở Mục 3.3).`.replace('" + cite("nasif2021") + "', cite("nasif2021"))));
  const iono = ds.find((d) => d.file === "ionosphere.csv");
  out.push(p(`**Thứ ba**, Huffman chỉ thắng ở hai tệp không có cấu trúc lặp rõ: ionosphere (các số thực 5 chữ số thập phân gần như ngẫu nhiên, Huffman ${pct(iono.codecs.static_huffman.ratio)}% so với LZ78 ${pct(iono.codecs.lz78.ratio)}% và LZ77 ${pct(iono.codecs.lz77.ratio)}%) và shampoo_sales (chỉ 519 byte, quá ngắn để từ điển kịp hình thành). DEFLATE, vốn kết hợp LZ77 với mã Huffman, cho tỉ lệ tốt nhất trên mọi tệp (trung bình ${pct(iot.reduce((s, d) => s + d.deflate_bytes / d.bytes, 0) / iot.length)}% trên dữ liệu IoT), cho thấy mô hình từ điển và mã entropy bổ sung cho nhau chứ không loại trừ nhau.`));

  // Kiểm chứng tối ưu
  out.push(h2("6.4. Kiểm chứng tính tối ưu của mã Huffman"));
  const gaps = ds.map((d) => avgCodeLength(d) - d.entropy_bits);
  out.push(p("Từ kích thước tệp nén Huffman tĩnh trừ đi phần đầu và bảng mã, ta tính được độ dài mã trung bình L̄ thực tế (sai số tối đa 7 bit đệm ở byte cuối, không đáng kể). Bảng 7 so sánh L̄ với entropy bậc 0."));
  out.push(tableCaption("**Bảng 7.** Độ dài mã trung bình của Huffman tĩnh so với entropy bậc 0 (bit/byte)"));
  out.push(table(["Tệp", "H", "L̄", "L̄ − H", "Hiệu suất H / L̄"],
    ds.map((d, i) => [short(d.file), vn(d.entropy_bits, 4), vn(avgCodeLength(d), 4), vn(gaps[i], 4), pct(d.entropy_bits / avgCodeLength(d), 2) + "%"]),
    [2871, 1500, 1500, 1500, 1700], { size: 19, align: [null, R, R, R, R] }));
  out.push(p(`Trên cả 11 tệp, 0 ≤ L̄ − H ≤ ${vn(Math.max(...gaps), 3)} bit, nằm sâu trong cận lý thuyết [0, 1) của bất đẳng thức (2), và hiệu suất mã đều trên ${pct(Math.min(...ds.map((d) => d.entropy_bits / avgCodeLength(d))), 0)}%. Như vậy cài đặt Huffman đạt gần đúng giới hạn nén của mô hình bậc 0; muốn nén tốt hơn phải thay đổi mô hình (khai thác ngữ cảnh, chuỗi lặp hoặc hiệu giữa các giá trị liên tiếp), không phải cải tiến bộ mã.`));

  // Thời gian
  out.push(h2("6.5. Thời gian chạy"));
  out.push(p("Bảng 8 trình bày thời gian nén, giải nén (trung vị) và thông lượng trên 6 tệp lớn hơn 200 KB. Vì cả bốn thuật toán đều viết bằng Python thuần trong cùng điều kiện, thời gian chỉ có ý nghĩa so sánh tương đối giữa các thuật toán."));
  out.push(tableCaption("**Bảng 8.** Thời gian nén / giải nén (giây) và thông lượng nén (MB/s)"));
  out.push(table(["Tệp", "Kích thước (MB)", ...CODECS.map((c) => NAME[c])],
    big.map((d) => [short(d.file), vn(d.bytes / 1e6, 2), ...CODECS.map((c) => {
      const x = d.codecs[c];
      return `${vn(x.encode_s, 2)} / ${vn(x.decode_s, 2)} (${vn(d.bytes / 1e6 / x.encode_s, 2)})`;
    })]),
    [2071, 1000, 1500, 1500, 1500, 1500], { size: 18, align: [null, R, R, R, R, R] }));
  const tp = (c) => big.reduce((s, d) => s + d.bytes, 0) / 1e6 / big.reduce((s, d) => s + d.codecs[c].encode_s, 0);
  const tpd = (c) => big.reduce((s, d) => s + d.bytes, 0) / 1e6 / big.reduce((s, d) => s + d.codecs[c].decode_s, 0);
  out.push(p(`Tính gộp trên 6 tệp, thông lượng nén lần lượt là: Huffman tĩnh ${vn(tp("static_huffman"), 2)} MB/s, Huffman thích nghi ${vn(tp("adaptive_huffman"), 2)} MB/s, LZ77 ${vn(tp("lz77"), 2)} MB/s, LZ78 ${vn(tp("lz78"), 2)} MB/s; thông lượng giải nén lần lượt là ${vn(tpd("static_huffman"), 2)}, ${vn(tpd("adaptive_huffman"), 2)}, ${vn(tpd("lz77"), 2)} và ${vn(tpd("lz78"), 2)} MB/s. Huffman thích nghi chậm hơn Huffman tĩnh khoảng ${vn(tp("static_huffman") / tp("adaptive_huffman"), 1)} lần khi nén, vì mỗi ký hiệu phải đi từ lá lên gốc để phát mã và cập nhật cây (O(d) thao tác) thay vì một lần tra bảng O(1) — đúng như phân tích ở Bảng 2. Phía giải nén, cả hai biến thể Huffman đều chậm vì phải xử lý từng bit, trong khi LZ77 và LZ78 giải nén theo từng cụm byte nên nhanh hơn nhiều. LZ78 nhanh nhất ở cả hai chiều nhờ mỗi byte đầu vào chỉ cần một lần tra bảng băm.`));

  // Độ phức tạp
  out.push(h2("6.6. Kiểm chứng độ phức tạp O(n log n) của bước dựng cây"));
  out.push(p(`Để quan sát bậc tăng của bước dựng cây — vốn bị che khuất khi n ≤ 256 — thực nghiệm sinh ngẫu nhiên tần suất cho n = 2^8^ đến 2^17^ ký hiệu và đo thời gian ba cách cài đặt cùng một phép chọn tham lam. Ở mọi kích thước, ba cách cho cùng chi phí B(T), xác nhận chúng cùng sinh ra cây tối ưu.`));
  const sc = res.tree_scaling;
  const slope = (key) => {
    const pts = sc.filter((r) => r[key + "_s"] !== undefined).map((r) => [Math.log(r.n), Math.log(r[key + "_s"])]);
    const mx = pts.reduce((s, q) => s + q[0], 0) / pts.length;
    const my = pts.reduce((s, q) => s + q[1], 0) / pts.length;
    return pts.reduce((s, q) => s + (q[0] - mx) * (q[1] - my), 0) / pts.reduce((s, q) => s + (q[0] - mx) ** 2, 0);
  };
  out.push(tableCaption("**Bảng 9.** Thời gian dựng cây (ms) theo số ký hiệu n"));
  out.push(table(["n", "Heap", "Hai hàng đợi", "Quét tuyến tính", "Heap / (n log~2~ n) (ns)"],
    sc.map((r) => [vn(r.n, 0), vn(r.heap_s * 1000, 2), vn(r.two_queues_s * 1000, 2), r.naive_s !== undefined ? vn(r.naive_s * 1000, 1) : "—", vn(r.heap_s * 1e9 / (r.n * Math.log2(r.n)), 1)]),
    [1500, 1700, 1800, 2071, 2000], { size: 19, align: [R, R, R, R, R] }));
  out.push(figure(FIG("hinh_do_phuc_tap.png"), 540, 321));
  out.push(caption("**Hình 2.** Thời gian dựng cây Huffman theo n (thang log–log)"));
  out.push(p(`Trên thang log–log, độ dốc hồi quy của đường thời gian là ${vn(slope("heap"), 2)} với heap, ${vn(slope("two_queues"), 2)} với hai hàng đợi và ${vn(slope("naive"), 2)} với quét tuyến tính. Độ dốc xấp xỉ 2 khẳng định cách quét tuyến tính có độ phức tạp Θ(n²): mỗi lần n tăng gấp đôi, thời gian tăng khoảng bốn lần, và tới n = 8.192 nó đã chậm hơn heap khoảng ${vn(sc.find((r) => r.n === 8192).naive_s / sc.find((r) => r.n === 8192).heap_s, 0)} lần. Với heap, độ dốc lớn hơn 1 một chút đúng như dự đoán của O(n log n) (hàm n log n có độ dốc cục bộ 1 + 1/ln n trên thang log–log); phần vượt thêm chủ yếu do chi phí bộ nhớ đệm của CPU khi cấu trúc dữ liệu lớn dần, thể hiện qua cột cuối Bảng 9 tăng từ ${vn(sc[0].heap_s * 1e9 / (sc[0].n * Math.log2(sc[0].n)), 1)} lên ${vn(sc[sc.length - 1].heap_s * 1e9 / (sc[sc.length - 1].n * Math.log2(sc[sc.length - 1].n)), 1)} ns. Cách hai hàng đợi nhanh hơn heap ở n lớn (khoảng ${vn(sc[sc.length - 1].heap_s / sc[sc.length - 1].two_queues_s, 1)} lần tại n = 131.072) vì sau một lần sắp xếp (do thư viện chuẩn thực hiện rất nhanh), phần gộp chỉ tốn O(n).`));

  // Gói tin
  out.push(h2("6.7. Nén theo gói tin nhỏ: Huffman tĩnh và Huffman thích nghi"));
  const pk = res.packets;
  out.push(p("Một nút IoT thường không thể đệm toàn bộ dữ liệu rồi mới nén; nó gửi từng gói nhỏ và mỗi gói phải giải nén được độc lập. Thực nghiệm chia tệp occupancy_datatraining thành các gói có kích thước cố định, nén từng gói riêng và cộng tổng kích thước (Bảng 10, Hình 3)."));
  out.push(tableCaption("**Bảng 10.** Tỉ lệ nén (%) khi nén từng gói độc lập — occupancy_datatraining"));
  out.push(table(["Kích thước gói (byte)", "Số gói", ...CODECS.map((c) => NAME[c])],
    pk.map((r) => {
      const b = CODECS.reduce((a, c) => (r.ratio[c] < r.ratio[a] ? c : a), CODECS[0]);
      return [vn(r.packet_bytes, 0), vn(r.packets, 0), ...CODECS.map((c) => (c === b ? `**${pct(r.ratio[c])}**` : pct(r.ratio[c])))];
    }),
    [1871, 1200, 1500, 1500, 1500, 1500], { size: 19, align: [R, R, R, R, R, R] }));
  out.push(figure(FIG("hinh_goi_tin.png"), 540, 321));
  out.push(caption("**Hình 3.** Tỉ lệ nén theo kích thước gói (đường đứt nét: 100%)"));
  const p64 = pk[0];
  const crossover = pk.find((r) => r.ratio.lz78 < r.ratio.adaptive_huffman);
  out.push(p(`Kết quả làm rõ ưu thế thực sự của Huffman thích nghi. Với gói 64 byte, Huffman tĩnh làm dữ liệu **phình ra** (${pct(p64.ratio.static_huffman)}%) vì bảng mã chiếm phần lớn gói, LZ77 phình tới ${pct(p64.ratio.lz77)}% vì phần lớn bộ ba không tìm được chuỗi khớp, trong khi Huffman thích nghi vẫn nén được còn ${pct(p64.ratio.adaptive_huffman)}%. Huffman thích nghi tốt nhất ở mọi kích thước gói đến ${vn(pk.filter((r) => CODECS.every((c) => r.ratio.adaptive_huffman <= r.ratio[c])).slice(-1)[0].packet_bytes, 0)} byte; khi gói đủ lớn (từ ${vn(crossover.packet_bytes, 0)} byte), từ điển LZ78 tích lũy đủ cụm và vượt lên. Hiện tượng tỉ lệ nén lớn hơn 100% ở dữ liệu nhỏ cũng xuất hiện trong " + cite("nasif2021") + " (Huffman tĩnh 121%, LZ77 201% trên tệp shampoo 0,5 KB) và đây có lẽ là lý do chính khiến nhóm tác giả đánh giá Huffman thích nghi là phù hợp nhất cho IoT.`.replace('" + cite("nasif2021") + "', cite("nasif2021"))));

  // Đối chiếu Nasif
  out.push(h2("6.8. Đối chiếu với kết quả của Nasif và cộng sự (2021)"));
  out.push(p("Bảng 11 đặt cạnh nhau kết quả của báo cáo này và kết quả công bố trong Bảng 2 của " + cite("nasif2021") + " trên năm tệp chung. Kích thước của ba tệp monthly_sunspots, ionosphere và daily_female_births khớp với kích thước tính theo KiB (1 KiB = 1.024 byte) trong bài báo, cho thấy nhiều khả năng đây là cùng một phiên bản dữ liệu; tệp shampoo_sales chênh khoảng 10 byte, còn tệp nhiệt độ Melbourne trong bài báo nhỏ hơn đáng kể (54,5 so với 66,3 KiB) nên có thể là một phiên bản khác."));
  out.push(tableCaption("**Bảng 11.** Tỉ lệ nén (%): báo cáo này / Nasif và cs. (2021)"));
  out.push(table(["Tệp", "Kích thước (KiB) này / bài báo", "Huffman tĩnh", "Huffman thích nghi", "LZ77", "LZ78"],
    Object.keys(NASIF).map((f) => {
      const d = ds.find((x) => x.file === f);
      const n = NASIF[f];
      return [short(f), `${vn(d.bytes / 1024, 2)} / ${n.size}`,
        `${pct(d.codecs.static_huffman.ratio, 0)} / ${n.h}`, `${pct(d.codecs.adaptive_huffman.ratio, 0)} / ${n.ah}`,
        `${pct(d.codecs.lz77.ratio, 0)} / ${n.lz77}`, `${pct(d.codecs.lz78.ratio, 0)} / ${n.lz78}`];
    }),
    [2171, 1900, 1250, 1250, 1250, 1250], { size: 19, align: [null, R, R, R, R, R] }));
  out.push(p("Kết quả Huffman tĩnh của hai nghiên cứu gần nhau trên các tệp lớn hơn 40 KB (45–49%), trong khi kết quả LZ77 và LZ78 khác nhau rất xa: LZ77 của Nasif và cộng sự luôn làm dữ liệu phình ra (165–172%), còn LZ77 ở đây nén được còn 29–56% trên bốn tệp đầu (riêng tệp shampoo 0,5 KB là 94%). Khác biệt này được thảo luận ở Mục 7.1."));
  return out;
}

function discussion(res) {
  const ds = rows(res);
  return [
    h1("7. THẢO LUẬN"),
    h2("7.1. Vì sao kết quả LZ77, LZ78 khác với Nasif và cộng sự"),
    p("Tỉ lệ nén của LZ77 phụ thuộc chủ yếu vào cách mã hóa bộ ba và khả năng tìm chuỗi khớp. Với bộ ba 24 bit, mỗi bộ ba thay cho (length + 1) byte gốc; nếu hầu như không tìm được chuỗi khớp, mỗi byte gốc bị thay bằng 3 byte và tỉ lệ tiến tới 300%. Tỉ lệ 165–172% gần như không đổi trên mọi tệp trong " + cite("nasif2021") + " gợi ý rằng cài đặt của nhóm tác giả tìm được rất ít chuỗi khớp hoặc dùng bộ ba có độ rộng lớn. Tuy nhiên, bài báo không công bố kích thước cửa sổ, độ dài khớp tối đa hay cách mã hóa bộ ba, nên đây chỉ là giả thuyết, không thể kiểm chứng. Điều có thể khẳng định là: với tham số theo mô tả gốc của Ziv và Lempel " + cite("lz77") + " và cửa sổ 4 KB như trong báo cáo này, LZ77 và LZ78 nén dữ liệu cảm biến dạng CSV tốt hơn Huffman bậc 0. Kết luận “Huffman thích nghi tốt nhất” của " + cite("nasif2021") + " chỉ được tái hiện trong trường hợp gói tin nhỏ (Mục 6.7)."),
    p("Tương tự, trong " + cite("nasif2021") + ", Huffman thích nghi tốt hơn Huffman tĩnh 4–6 điểm phần trăm trên một số tệp (nhiệt độ Melbourne, Electric_Production, sunspots, female births) nhưng bằng nhau trên các tệp khác (ozone, occupancy, ionosphere). Ở đây chênh lệch gần bằng 0 trên mọi tệp lớn vì bảng mã chính tắc chỉ tốn 2 + 2k byte. Theo phân tích ở Mục 4.2, khi không tính bảng mã thì Huffman tĩnh không thể tệ hơn Huffman thích nghi trên cùng một khối dữ liệu tĩnh; chênh lệch lớn trong bài báo vì vậy nhiều khả năng đến từ cách lưu bảng mã (ví dụ lưu cả cây hoặc lưu tần suất dạng số nguyên lớn), chứ không phải từ bản chất thuật toán."),
    h2("7.2. Huffman tĩnh hay Huffman thích nghi cho nút IoT?"),
    p("Kết quả thực nghiệm và phân tích cho thấy lựa chọn phụ thuộc vào cách nút gửi dữ liệu:"),
    bullet("**Gửi theo gói nhỏ (≤ 2 KB), mỗi gói giải mã độc lập:** Huffman thích nghi rõ ràng tốt hơn vì không có chi phí bảng mã và chỉ cần một lượt duyệt, không phải đệm dữ liệu. Đây là trường hợp điển hình của nút cảm biến có SRAM vài KB."),
    bullet("**Gửi khối lớn hoặc dùng chung bảng mã:** Huffman tĩnh nén ngang bằng nhưng nhanh hơn khoảng 5 lần khi mã hóa. Nếu phân bố dữ liệu ổn định, có thể dựng bảng mã một lần (ví dụ trên gateway từ dữ liệu lịch sử) rồi nạp sẵn vào nút; khi đó chi phí bảng mã bằng 0 và mã hóa chỉ còn tra bảng."),
    bullet("**Chi phí năng lượng:** trong mô phỏng của Mishra và cộng sự, RLE vượt trội mã hóa Huffman thích nghi về hiệu quả năng lượng, tốc độ mạng và tỉ lệ nhận gói " + cite("mishra2022") + "; vì vậy ưu thế về tỉ lệ nén cần được cân nhắc cùng chi phí xử lý mỗi ký hiệu trên nút."),
    h2("7.3. Yêu cầu bộ nhớ khi đưa lên vi điều khiển"),
    p("Dựa trên tham số trong Bảng 4, có thể ước lượng bộ nhớ dữ liệu tối thiểu nếu cài đặt bằng C (ước lượng của báo cáo, chưa đo trên phần cứng thực):"),
    bullet("**Huffman tĩnh:** bảng tần suất 256 × 4 byte và bảng mã 256 × 4 byte ≈ 2 KB, **cộng** bộ đệm chứa toàn bộ khối dữ liệu cần nén (vì phải duyệt hai lượt)."),
    bullet("**Huffman thích nghi (FGK):** 513 nút, mỗi nút gồm trọng số 4 byte và bốn chỉ số 2 byte (cha, con trái, con phải, số thứ tự) ≈ 513 × 12 ≈ 6 KB, cộng chỉ mục lá 256 × 2 byte; không cần đệm dữ liệu."),
    bullet("**LZ77:** cửa sổ 4.095 byte cộng bảng băm; cửa sổ này đã vượt 2 KB SRAM của Arduino Uno, phải thu nhỏ cửa sổ (đổi lại tỉ lệ nén kém đi)."),
    bullet("**LZ78:** từ điển tối đa 65.536 cụm, mỗi cụm cần ít nhất chỉ số cha 2 byte và 1 byte ký tự cùng cấu trúc tra cứu, tức hàng trăm KB — không khả thi trên nút nhỏ nếu không giới hạn mạnh kích thước từ điển."),
    p("So với bảng thông số các bo mạch trong " + cite("nasif2021") + ", cả bốn thuật toán với tham số hiện tại đều vượt 2 KB SRAM của ATmega328P, nhưng Huffman (tĩnh với khối nhỏ, hoặc FGK) và LZ77 với cửa sổ thu nhỏ đều vừa với các bo 32 KB SRAM như SAMD21. Đây cũng là hướng mà nghiên cứu tiếp theo của chính nhóm tác giả theo đuổi: thuật toán HDC thu gọn cây Huffman bằng tỉa và gộp để chạy với dưới 80 KB bộ nhớ " + cite("nasif2024") + "."),
    h2("7.4. Hạn chế của nghiên cứu"),
    bullet("Thời gian đo bằng Python trên máy chủ, chỉ phản ánh tương quan giữa các thuật toán, không phải thời gian và năng lượng trên vi điều khiển."),
    bullet("Kết quả LZ77, LZ78 phụ thuộc tham số (cửa sổ, độ dài khớp, số ứng viên, kích thước từ điển); báo cáo chỉ khảo sát một bộ tham số."),
    bullet("Dữ liệu được nén ở dạng văn bản CSV như " + cite("nasif2021") + "; nút IoT thực thường lưu giá trị nhị phân, khi đó tỉ lệ nén tuyệt đối sẽ khác."),
    bullet("Dữ liệu lấy từ bản sao trên GitHub thay vì trang gốc UCI/Kaggle; mã băm SHA-256 được công bố để kiểm tra, nhưng tệp Beijing PM2.5 là bản đã làm sạch chứ không phải tệp gốc."),
  ];
}

function conclusion() {
  return [
    h1("8. KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN"),
    p("Báo cáo đã nghiên cứu thuật toán Huffman như một ví dụ điển hình của chiến lược tham lam, trình bày chứng minh đầy đủ tính tối ưu dựa trên tính chất lựa chọn tham lam và cấu trúc con tối ưu, phân tích độ phức tạp O(n log n) với hàng đợi ưu tiên và so sánh với cài đặt O(n²) và cài đặt hai hàng đợi. Bốn thuật toán Huffman tĩnh, Huffman thích nghi (FGK), LZ77 và LZ78 được cài đặt, kiểm thử với 49 ca kiểm thử tự động và đánh giá trên 11 tệp dữ liệu công khai."),
    p("Các kết luận chính:"),
    numbered("Cài đặt Huffman đạt độ dài mã trung bình chỉ cao hơn entropy bậc 0 dưới 0,08 bit/byte, xác nhận thực nghiệm tính tối ưu đã chứng minh.", "conc"),
    numbered("Thời gian dựng cây tăng theo bậc n log n với heap (độ dốc log–log xấp xỉ 1,1–1,2) và theo bậc n² với quét tuyến tính (độ dốc xấp xỉ 2), đúng như phân tích lý thuyết.", "conc"),
    numbered("Trên dữ liệu dài, Huffman tĩnh và Huffman thích nghi nén gần như bằng nhau; Huffman thích nghi vượt trội khi nén từng gói nhỏ (≤ 2 KB) vì không phải gửi bảng mã và chỉ cần một lượt duyệt — phù hợp với đặc điểm của nút IoT.", "conc"),
    numbered("Trên dữ liệu cảm biến dạng CSV, LZ78 và LZ77 cho tỉ lệ nén tốt hơn Huffman bậc 0 vì khai thác được chuỗi lặp; kết luận này khác với Nasif và cộng sự (2021), và khác biệt nhiều khả năng đến từ tham số cài đặt LZ77 chưa được công bố trong bài báo đó.", "conc"),
    p("Hướng phát triển: (i) kết hợp biến đổi delta (hiệu giữa hai giá trị đo liên tiếp) trước khi mã Huffman, như các khảo sát về nén chuỗi thời gian và nén cảm biến gợi ý " + cite("chiarot2023", "hwang2023") + "; (ii) cài đặt Huffman thích nghi theo thuật toán Λ của Vitter để có cận S + t bit " + cite("vitter1987") + "; (iii) dùng bảng Huffman dựng sẵn trên gateway và nạp xuống nút; (iv) chuyển cài đặt sang C và đo thời gian, năng lượng, bộ nhớ trên vi điều khiển thực."),
  ];
}

function appendix(res) {
  const ds = rows(res);
  return [
    h1("PHỤ LỤC. TÁI HIỆN THỰC NGHIỆM"),
    p("Các lệnh sau (chạy tại thư mục gốc của kho mã, nhánh final-exam) tải dữ liệu, chạy kiểm thử, chạy thực nghiệm, vẽ biểu đồ và sinh lại báo cáo này:"),
    ...code([
      "pip install -r requirements.txt matplotlib",
      "python scripts/fetch_iot_datasets.py",
      "python -m pytest -q",
      "python scripts/benchmark_iot.py",
      "python scripts/plot_iot.py",
      "bash scripts/report/make.sh      # cần node (docx), LibreOffice, poppler",
    ]),
    tableCaption("**Bảng 12.** Mã băm SHA-256 (16 ký tự đầu) của các tệp dữ liệu đã dùng"),
    table(["Tệp", "Kích thước (byte)", "SHA-256 (rút gọn)"],
      ds.map((d) => [d.file, vn(d.bytes, 0), d.sha256.slice(0, 16)]),
      [3571, 2000, 3500], { size: 19, align: [null, R, null] }),
  ];
}

module.exports = { implementation, experiments, discussion, conclusion, appendix };
