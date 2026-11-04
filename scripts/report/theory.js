// Các chương lý thuyết: giới thiệu, tổng quan, cơ sở lý thuyết, phân tích thuật toán.
const { AlignmentType } = require("docx");
const H = require("./helpers");
const { cite } = require("./references");

const { p, h1, h2, h3, bullet, numbered, eq, code, tableCaption, table } = H;

function abstract() {
  return [
    h1("TÓM TẮT"),
    p("Thiết bị Internet vạn vật (IoT) thường có bộ nhớ SRAM chỉ vài kilobyte, trong khi dữ liệu cảm biến được sinh ra liên tục; vì vậy nén không mất dữ liệu ngay tại nút là một hướng giảm lưu lượng mạng và năng lượng truyền tin " + cite("nasif2021", "srisooksai2012") + ". Báo cáo này nghiên cứu và cài đặt thuật toán mã hóa Huffman — một giải thuật tham lam kinh điển xây dựng mã tiền tố tối ưu bằng cách lặp lại việc gộp hai ký hiệu có tần suất nhỏ nhất " + cite("huffman1952") + ". Về lý thuyết, báo cáo trình bày chứng minh tính đúng đắn của lựa chọn tham lam thông qua hai tính chất lựa chọn tham lam và cấu trúc con tối ưu, phân tích độ phức tạp O(n log n) khi dùng hàng đợi ưu tiên, và so sánh Huffman tĩnh (hai lượt) với Huffman thích nghi theo thuật toán FGK " + cite("gallager1978", "knuth1985", "vitter1987") + ". Về thực nghiệm, bốn thuật toán Huffman tĩnh, Huffman thích nghi, LZ77 và LZ78 được tự cài đặt bằng Python và đánh giá trên 11 tệp dữ liệu công khai, chủ yếu từ kho UCI và Kaggle, trong đó có dữ liệu cảm biến môi trường trong nhà, mạng cảm biến không dây ZigBee và công tơ điện. Kết quả cho thấy cây Huffman đạt độ dài mã trung bình chỉ cao hơn entropy bậc 0 dưới 0,08 bit/ký hiệu, thời gian dựng cây tăng theo đúng bậc n log n, và Huffman thích nghi loại bỏ hoàn toàn chi phí gửi bảng mã nên vượt trội Huffman tĩnh khi nén các gói tin nhỏ. Tuy nhiên, trên các tệp CSV, LZ77 và LZ78 đạt tỉ lệ nén tốt hơn Huffman vì khai thác được các chuỗi lặp (dấu thời gian, tên cột), khác với kết luận của Nasif và cộng sự (2021). Báo cáo thảo luận nguyên nhân của khác biệt này và các yêu cầu bộ nhớ khi đưa các thuật toán lên vi điều khiển."),
    p("**Từ khóa:** mã Huffman, thuật toán tham lam, Huffman thích nghi, FGK, LZ77, LZ78, nén không mất dữ liệu, dữ liệu cảm biến IoT.", { noIndent: true }),
  ];
}

function introduction() {
  return [
    h1("1. GIỚI THIỆU"),
    h2("1.1. Bối cảnh và động lực"),
    p("Trong kiến trúc IoT, mỗi nút cảm biến gồm vi điều khiển, bộ nhớ, khối quản lý năng lượng và khối truyền thông; dữ liệu đo được gửi qua cổng (gateway) lên máy chủ hoặc đám mây " + cite("nasif2021") + ". Nasif và cộng sự chỉ ra rằng bộ nhớ dữ liệu của nhiều bo mạch phổ biến rất nhỏ — ví dụ Arduino Uno dùng ATmega328P với 2 KB SRAM — nên khi nhiều cảm biến cùng gửi dữ liệu về một nút, bộ đệm có thể tràn và dữ liệu bị mất " + cite("nasif2021") + ". Nén dữ liệu ngay tại nút giúp giảm số byte phải lưu tạm và truyền đi. Nhóm tác giả cũng dẫn lại kết quả của Kimura và Latifi rằng năng lượng để truyền một bit qua sóng vô tuyến cao gấp khoảng 480 lần năng lượng thực hiện một phép cộng " + cite("nasif2021") + ", nên giảm số bit truyền là cách tiết kiệm pin hiệu quả; nén dữ liệu trong mạng cảm biến không dây đã được khảo sát rộng rãi " + cite("srisooksai2012", "mishra2022") + "."),
    p("Dữ liệu cảm biến là dữ liệu số và chuỗi thời gian, nên phải được nén không mất dữ liệu nếu ứng dụng cần giá trị chính xác " + cite("nasif2021", "chiarot2023") + ". Trong nhóm thuật toán entropy, mã Huffman là đại diện kinh điển: nó là một thuật toán tham lam đơn giản nhưng cho mã tiền tố tối ưu " + cite("huffman1952", "moffat2019") + ". Nasif và cộng sự đã so sánh Huffman, Huffman thích nghi, LZ77 và LZ78 trên các bộ dữ liệu từ Kaggle, UCI, AMPds, Calgary Corpus và dữ liệu ô-zôn Malaysia, và kết luận Huffman thích nghi cho tỉ lệ nén tốt nhất trên dữ liệu số và chuỗi thời gian " + cite("nasif2021") + ". Báo cáo này lấy công trình đó làm điểm xuất phát."),
    h2("1.2. Mục tiêu và phạm vi"),
    p("Báo cáo có bốn mục tiêu:"),
    numbered("Trình bày thuật toán Huffman dưới góc độ thiết kế thuật toán tham lam, chứng minh chặt chẽ tính tối ưu của lựa chọn tham lam.", "goals"),
    numbered("Phân tích độ phức tạp thời gian và bộ nhớ: O(n log n) khi dùng hàng đợi ưu tiên, so với cách cài đặt O(n²) và cách dùng hai hàng đợi.", "goals"),
    numbered("So sánh Huffman tĩnh với Huffman thích nghi (FGK) cả về lý thuyết lẫn thực nghiệm.", "goals"),
    numbered("Cài đặt và đánh giá tỉ lệ nén, thời gian chạy của Huffman so với hai thuật toán nén từ điển LZ77, LZ78 trên các bộ dữ liệu cảm biến công khai.", "goals"),
    p("Phạm vi: nén không mất dữ liệu trên luồng byte (dữ liệu CSV/văn bản, giống cách tiếp cận của " + cite("nasif2021") + "); không xét nén có mất mát và không xét các phương pháp học sâu. Mọi thuật toán được cài đặt bằng Python thuần để so sánh thời gian trong cùng điều kiện; kết quả thời gian vì vậy mang tính tương đối giữa các thuật toán, không phản ánh tốc độ trên vi điều khiển thực."),
    h2("1.3. Cấu trúc báo cáo"),
    p("Mục 2 tổng quan các nghiên cứu liên quan. Mục 3 trình bày cơ sở lý thuyết và chứng minh tính đúng đắn. Mục 4 phân tích độ phức tạp và so sánh Huffman tĩnh với Huffman thích nghi. Mục 5 mô tả cài đặt. Mục 6 trình bày thực nghiệm và kết quả. Mục 7 thảo luận, và Mục 8 kết luận."),
  ];
}

function relatedWork() {
  const W = [650, 2000, 900, 2350, 3171];
  return [
    h1("2. TỔNG QUAN NGHIÊN CỨU LIÊN QUAN"),
    h2("2.1. Phân loại thuật toán nén không mất dữ liệu"),
    p("Nasif và cộng sự chia các thuật toán nén không mất dữ liệu thành ba nhóm " + cite("nasif2021") + ": (i) **thuật toán entropy** thay mỗi ký hiệu bằng một từ mã tiền tố có độ dài phụ thuộc tần suất (Huffman, Huffman thích nghi, mã số học, ANS, Golomb…); (ii) **thuật toán từ điển** thay các chuỗi lặp bằng tham chiếu tới một từ điển hoặc cửa sổ trượt (LZ77, LZ78, LZW, LZ4, Deflate…); (iii) **thuật toán tổng quát** dựa trên biến đổi hoặc dự đoán (BWT, Delta, PPM, RLE…). Theo nhóm tác giả, phần lớn thuật toán cần sửa đổi mới chạy được trên nút IoT, và ứng viên tiềm năng nhất là Huffman thích nghi vì nó xử lý được dữ liệu vào theo thời gian thực " + cite("nasif2021") + "."),
    p("Về lịch sử, Huffman (1952) đưa ra thuật toán dựng mã có độ dư thừa nhỏ nhất " + cite("huffman1952") + ". Gallager (1978) chứng minh một cây là cây Huffman khi và chỉ khi nó thỏa “tính chất anh em” (sibling property) và đề xuất phiên bản thích nghi; Knuth (1985) cải tiến thành thuật toán cập nhật trong thời gian tỉ lệ với độ dài từ mã, nay gọi là FGK " + cite("gallager1978", "knuth1985") + ". Vitter (1987) phân tích FGK và đề xuất thuật toán Λ dùng ít hơn t bit so với Huffman hai lượt khi mã hóa thông điệp t ký hiệu " + cite("vitter1987") + ". Ziv và Lempel đề xuất hai họ thuật toán từ điển LZ77 (cửa sổ trượt) và LZ78 (từ điển cụm tăng dần) " + cite("lz77", "lz78") + ". Lelewer và Hirschberg tổng hợp các kết quả này trong khảo sát kinh điển về nén dữ liệu " + cite("lelewer1987") + "."),
    h2("2.2. Các nghiên cứu cập nhật"),
    p("Bảng 1 tóm tắt các nghiên cứu gần đây, chỉ chọn bài đăng trên tạp chí thuộc nhóm Q1 hoặc Q2 theo SCImago (SJR), kèm đường dẫn tới bản công bố."),
    tableCaption("**Bảng 1.** Các nghiên cứu cập nhật liên quan (tạp chí Q1/Q2)"),
    table(["Năm", "Tác giả, tạp chí", "Xếp hạng (SJR)", "Liên kết", "Nội dung chính liên quan đến đề tài"], [
      ["2009", "Blanchette, Journal of Automated Reasoning " + cite("blanchette2009"), "Q2", "doi.org/10.1007/​s10817-009-9116-y", "Hình thức hóa và kiểm chứng máy (Isabelle/HOL) chứng minh tính tối ưu của thuật toán Huffman theo đúng lập luận trong giáo trình."],
      ["2012", "Srisooksai và cs., J. Network and Computer Applications " + cite("srisooksai2012"), "Q1", "doi.org/10.1016/​j.jnca.2011.03.001", "Khảo sát nén dữ liệu trong mạng cảm biến không dây, đưa ra tiêu chí phân loại và so sánh hiệu năng, giới hạn của các kỹ thuật."],
      ["2019", "Moffat, ACM Computing Surveys " + cite("moffat2019"), "Q1", "doi.org/10.1145/3342555", "Bài hướng dẫn và khảo sát về mã Huffman: cách tính mã, mã chính tắc, mã hóa/giải mã nhanh, mã giới hạn độ dài, quan hệ với mã số học và ANS."],
      ["2021", "Nasif và cs., Sensors " + cite("nasif2021"), "Q1–Q2", "mdpi.com/1424-8220/​21/12/4223", "So sánh Huffman, Huffman thích nghi, LZ77, LZ78 trên 5 nhóm dữ liệu; Huffman thích nghi tốt nhất; đề xuất hướng kết hợp với học sâu."],
      ["2022", "Mishra và cs., Sensors " + cite("mishra2022"), "Q1–Q2", "mdpi.com/1424-8220/​22/19/7685", "Đánh giá chi phí năng lượng của RLE và mã hóa Huffman thích nghi trên nút cảm biến, đề xuất phương pháp lai H-RLEAHE."],
      ["2023", "Chiarot, Silvestri, ACM Computing Surveys " + cite("chiarot2023"), "Q1", "doi.org/10.1145/3560814", "Khảo sát nén chuỗi thời gian; phân loại theo hướng tiếp cận (từ điển, xấp xỉ hàm, tự mã hóa, tuần tự…) và theo tính thích nghi, tính không mất dữ liệu."],
      ["2023", "Hwang và cs., Sensors " + cite("hwang2023"), "Q1–Q2", "mdpi.com/1424-8220/​23/20/8575", "Nén không mất dữ liệu chuỗi thời gian cảm biến bằng đóng gói bit với kích thước gói xác định động theo độ sâu bit."],
      ["2024", "Nasif và cs., IEEE Access " + cite("nasif2024"), "Q1–Q2", "ieeexplore.ieee.org/​document/10662892", "Thuật toán Huffman Deep Compression (HDC) cho nút biên IoT: cửa sổ trượt kết hợp tỉa (pruning) và gộp (pooling) để thu gọn cây Huffman; tác giả báo cáo tỉ lệ nén cao hơn 1,4 lần, giảm dữ liệu tới 59% với dưới 80 KB bộ nhớ."],
    ], W, { size: 19 }),
    p("_Ghi chú:_ Xếp hạng quý của SCImago được tính theo từng chuyên ngành và từng năm; một tạp chí có thể thuộc Q1 ở chuyên ngành này và Q2 ở chuyên ngành khác. Cột “Xếp hạng” ghi mức tham khảo từ các nguồn tổng hợp; người đọc nên đối chiếu lại tại scimagojr.com cho năm cần dùng. Đầy đủ đường dẫn có trong mục Tài liệu tham khảo.", { noIndent: true, run: { size: 22 } }),
    h2("2.3. Khoảng trống nghiên cứu"),
    p("Nasif và cộng sự (2021) không công bố mã nguồn và các tham số cài đặt (kích thước cửa sổ LZ77, cách mã hóa bộ ba, cách lưu bảng mã của Huffman tĩnh) " + cite("nasif2021") + ". Vì kết quả nén của LZ77 và LZ78 phụ thuộc mạnh vào các tham số này, kết luận “Huffman thích nghi tốt nhất” cần được kiểm chứng lại bằng một cài đặt minh bạch. Báo cáo này đóng góp: (1) một cài đặt mở, có kiểm thử, của cả bốn thuật toán với tham số được nêu rõ; (2) thực nghiệm lặp lại trên một phần dữ liệu trùng với " + cite("nasif2021") + " và trên các bộ dữ liệu cảm biến IoT khác; (3) thực nghiệm kiểm chứng bậc tăng O(n log n) và thực nghiệm nén theo gói tin nhỏ để làm rõ ưu điểm của Huffman thích nghi."),
  ];
}

function theory() {
  return [
    h1("3. CƠ SỞ LÝ THUYẾT VÀ TÍNH ĐÚNG ĐẮN"),
    h2("3.1. Mã tiền tố và bài toán mã tối ưu"),
    p("Cho bảng chữ cái C gồm n ký hiệu, mỗi ký hiệu c có tần suất f(c) > 0. Một **mã tiền tố** gán cho mỗi ký hiệu một chuỗi bit sao cho không từ mã nào là tiền tố của từ mã khác, nhờ đó dòng bit được giải mã duy nhất mà không cần dấu phân cách. Mỗi mã tiền tố nhị phân tương ứng với một cây nhị phân T có các lá là ký hiệu; từ mã của c là đường đi từ gốc tới lá c (trái = 0, phải = 1), độ dài từ mã bằng độ sâu d~T~(c). Chi phí của cây — tổng số bit cần để mã hóa dữ liệu — là:"),
    eq("B(T) = Σ~c∈C~ f(c) · d~T~(c)", "1"),
    p("Bài toán: tìm cây T có B(T) nhỏ nhất. Một cây tối ưu luôn là **cây nhị phân đầy đủ** (mọi nút trong có đúng hai con): nếu một nút trong chỉ có một con, thay nút đó bằng con của nó sẽ giảm độ sâu của mọi lá bên dưới, làm B(T) giảm thực sự " + cite("clrs") + ". Với cây đầy đủ, độ dài từ mã l~c~ thỏa đẳng thức Kraft Σ 2^−l~c~^ = 1."),
    p("Gọi p~c~ = f(c)/N với N = Σ f(c) là xác suất thực nghiệm. Entropy bậc 0 của nguồn là H = −Σ p~c~ log~2~ p~c~ (bit/ký hiệu). Độ dài mã trung bình L̄ = B(T)/N của mã Huffman thỏa " + cite("huffman1952", "moffat2019") + ":"),
    eq("H ≤ L̄ < H + 1", "2"),
    p("Cận dưới đúng với mọi mã tiền tố; cận trên suy ra từ việc mã Shannon với độ dài ⌈−log~2~ p~c~⌉ là mã tiền tố và mã Huffman không tệ hơn nó. Bất đẳng thức (2) là căn cứ để kiểm tra cài đặt trong Mục 6."),
    h2("3.2. Thuật toán Huffman"),
    p("Thuật toán Huffman dựng cây từ dưới lên. Ban đầu mỗi ký hiệu là một cây một nút. Ở mỗi bước, thuật toán **chọn tham lam** hai cây có trọng số nhỏ nhất và gộp chúng thành một cây mới có trọng số bằng tổng. Sau n − 1 lần gộp còn lại đúng một cây. Mã giả dùng hàng đợi ưu tiên Q (min-heap) theo trọng số:"),
    ...code([
      "HUFFMAN(C):",
      "  n ← |C|",
      "  Q ← min-heap chứa mọi c ∈ C, khóa f(c)          // O(n)",
      "  for i ← 1 to n − 1:",
      "      z ← nút mới",
      "      z.left  ← x ← EXTRACT-MIN(Q)          // O(log n)",
      "      z.right ← y ← EXTRACT-MIN(Q)          // O(log n)",
      "      f(z) ← f(x) + f(y)",
      "      INSERT(Q, z)                          // O(log n)",
      "  return EXTRACT-MIN(Q)                     // gốc cây",
    ]),
    p("Ví dụ (" + cite("clrs") + "): với sáu ký hiệu a–f có tần suất 45, 13, 12, 16, 9, 5, thuật toán lần lượt gộp (f,e)→14, (c,b)→25, (14,d)→30, (25,30)→55, (a,55)→100, cho độ dài mã 1, 3, 3, 3, 4, 4 và chi phí B(T) = 224 bit, so với 300 bit nếu dùng mã độ dài cố định 3 bit. Ví dụ này được dùng làm một ca kiểm thử trong cài đặt."),
    h2("3.3. Chứng minh tính đúng đắn của lựa chọn tham lam"),
    p("Một thuật toán tham lam đúng khi bài toán có hai tính chất: **tính chất lựa chọn tham lam** (tồn tại lời giải tối ưu chứa lựa chọn tham lam đầu tiên) và **cấu trúc con tối ưu** (sau khi thực hiện lựa chọn đó, phần còn lại là một bài toán cùng dạng, và lời giải tối ưu của nó ghép với lựa chọn cho lời giải tối ưu ban đầu). Lập luận dưới đây theo " + cite("clrs") + "; Blanchette đã hình thức hóa và kiểm chứng toàn bộ chứng minh này bằng trợ lý chứng minh Isabelle/HOL " + cite("blanchette2009") + "."),
    p("**Bổ đề 1 (Lựa chọn tham lam).** Gọi x và y là hai ký hiệu có tần suất nhỏ nhất trong C. Khi đó tồn tại một cây tối ưu trong đó x và y là hai lá anh em có độ sâu lớn nhất; tức là từ mã của chúng có cùng độ dài và chỉ khác nhau ở bit cuối.", { noIndent: true }),
    p("_Chứng minh._ Lấy một cây tối ưu T bất kỳ. Vì T đầy đủ, tồn tại hai lá anh em a, b ở độ sâu lớn nhất. Không mất tổng quát giả sử f(a) ≤ f(b) và f(x) ≤ f(y). Do x, y có tần suất nhỏ nhất nên f(x) ≤ f(a) và f(y) ≤ f(b); do a, b sâu nhất nên d~T~(a) ≥ d~T~(x) và d~T~(b) ≥ d~T~(y). Đổi chỗ x với a được cây T′. Chênh lệch chi phí là:", { noIndent: true }),
    eq("B(T) − B(T′) = f(x)d~T~(x) + f(a)d~T~(a) − f(x)d~T~(a) − f(a)d~T~(x)"),
    eq("= (f(a) − f(x)) · (d~T~(a) − d~T~(x)) ≥ 0", "3"),
    p("Tương tự, đổi chỗ y với b trong T′ được T″ với B(T″) ≤ B(T′). Do đó B(T″) ≤ B(T); vì T tối ưu nên B(T″) = B(T), tức T″ cũng tối ưu, và trong T″ thì x, y là hai lá anh em sâu nhất. (Trường hợp các ký hiệu trùng nhau, chẳng hạn x = b, khi đó f(x) = f(a) = f(b) và việc đổi chỗ không làm thay đổi chi phí, nên kết luận vẫn đúng.) ∎", { noIndent: true }),
    p("**Bổ đề 2 (Cấu trúc con tối ưu).** Gọi C′ = (C \\ {x, y}) ∪ {z} với z là ký hiệu mới có f(z) = f(x) + f(y). Nếu T′ là cây tối ưu cho C′ thì cây T thu được từ T′ bằng cách thay lá z bằng một nút trong có hai con x và y là cây tối ưu cho C.", { noIndent: true }),
    p("_Chứng minh._ Với mọi ký hiệu c ≠ x, y thì d~T~(c) = d~T′~(c), còn d~T~(x) = d~T~(y) = d~T′~(z) + 1. Do đó:", { noIndent: true }),
    eq("B(T) = B(T′) + f(x) + f(y)", "4"),
    p("Giả sử phản chứng tồn tại cây T~0~ cho C với B(T~0~) < B(T). Theo Bổ đề 1 có thể chọn T~0~ sao cho x, y là anh em. Thay cặp lá x, y cùng nút cha của chúng bằng lá z, ta được cây T~0~′ cho C′ với B(T~0~′) = B(T~0~) − f(x) − f(y) < B(T) − f(x) − f(y) = B(T′), mâu thuẫn với tính tối ưu của T′. ∎", { noIndent: true }),
    p("**Định lý.** Thuật toán Huffman sinh ra một mã tiền tố tối ưu.", { noIndent: true }),
    p("_Chứng minh._ Quy nạp theo n = |C|. Với n = 1 hoặc 2, khẳng định hiển nhiên. Giả sử đúng với bảng chữ có n − 1 ký hiệu. Bước đầu tiên của thuật toán gộp hai ký hiệu x, y có tần suất nhỏ nhất thành z — đúng là lựa chọn mà Bổ đề 1 bảo đảm nằm trong một lời giải tối ưu. Các bước còn lại chính là thuật toán Huffman chạy trên C′ có n − 1 ký hiệu, theo giả thiết quy nạp cho cây tối ưu T′. Theo Bổ đề 2, cây T thu được bằng cách tách z thành x, y là tối ưu cho C. ∎", { noIndent: true }),
    p("Hai nhận xét quan trọng rút ra từ chứng minh: (i) cây Huffman không duy nhất khi có các tần suất bằng nhau, nhưng mọi cây do thuật toán sinh ra đều có cùng chi phí tối ưu — cài đặt dùng một thứ tự phá hòa cố định để bộ mã hóa và bộ giải mã dựng ra cùng một cây; (ii) tính tối ưu chỉ xét trong lớp **mã tiền tố theo từng ký hiệu với phân bố cố định** (mô hình bậc 0). Huffman không khai thác được quan hệ giữa các ký hiệu liên tiếp, nên các thuật toán từ điển có thể nén tốt hơn khi dữ liệu có nhiều chuỗi lặp — điều được quan sát thấy trong Mục 6."),
    h2("3.4. Tính chất anh em và Huffman thích nghi"),
    p("Huffman tĩnh cần biết trước tần suất, nên phải duyệt dữ liệu hai lượt và gửi kèm bảng mã. Huffman thích nghi (động) loại bỏ hai hạn chế này: bộ mã hóa và bộ giải mã cùng bắt đầu từ một cây giống nhau và cùng cập nhật cây sau mỗi ký hiệu, nên mã của ký hiệu thứ i chỉ phụ thuộc i − 1 ký hiệu trước đó " + cite("knuth1985", "vitter1987") + "."),
    p("Cơ sở của Huffman thích nghi là định lý của Gallager " + cite("gallager1978") + ": một cây nhị phân có trọng số không âm là cây Huffman **khi và chỉ khi** nó có **tính chất anh em** — có thể đánh số các nút 1, 2, …, 2n − 1 theo thứ tự trọng số không giảm sao cho các nút 2j − 1 và 2j là anh em với mọi j. Thuật toán FGK duy trì tính chất này với chi phí thấp. Khi đọc ký hiệu a:"),
    numbered("Nếu a đã xuất hiện, phát từ mã là đường đi từ gốc tới lá của a. Nếu a chưa xuất hiện, phát từ mã của nút đặc biệt NYT (Not Yet Transmitted, trọng số 0) rồi phát a ở dạng thô 8 bit; nút NYT được tách thành NYT mới và một lá mới cho a.", "fgk"),
    numbered("Đi từ lá của a lên gốc. Tại mỗi nút v: tìm nút có số thứ tự lớn nhất trong khối các nút cùng trọng số với v (nút dẫn đầu khối); nếu nút đó không phải v và không phải cha của v thì đổi chỗ hai cây con; sau đó tăng trọng số v thêm 1 và chuyển lên cha.", "fgk"),
    p("Việc đổi chỗ với nút dẫn đầu khối trước khi tăng trọng số bảo đảm thứ tự trọng số không giảm vẫn được giữ, nên cây luôn là cây Huffman cho các tần suất đã thấy " + cite("gallager1978", "knuth1985") + ". Cài đặt trong báo cáo kiểm tra lại tính chất này một cách tự động sau mỗi bước cập nhật (Mục 5.3)."),
  ];
}

function complexity() {
  const W = [2600, 3235, 3236];
  return [
    h1("4. PHÂN TÍCH ĐỘ PHỨC TẠP VÀ SO SÁNH"),
    h2("4.1. Độ phức tạp của thuật toán Huffman tĩnh"),
    p("Ký hiệu N là độ dài dữ liệu (số byte) và n là số ký hiệu phân biệt (n ≤ 256 với bảng chữ cái byte). Quá trình nén gồm bốn bước:"),
    bullet("**Đếm tần suất:** một lượt duyệt, Θ(N) thời gian, O(n) bộ nhớ."),
    bullet("**Dựng cây bằng min-heap:** BUILD-HEAP tốn O(n). Vòng lặp chạy đúng n − 1 lần; mỗi lần gồm hai EXTRACT-MIN và một INSERT trên heap có không quá n phần tử, mỗi thao tác O(log n). Tổng thời gian:"),
    eq("T(n) = O(n) + (n − 1) · 3 · O(log n) = O(n log n)", "5"),
    bullet("**Sinh mã:** duyệt cây có 2n − 1 nút, O(n) (cài đặt tính độ sâu từ mảng cha trong một lượt duyệt ngược), sau đó gán mã chính tắc bằng một lần sắp xếp O(n log n)."),
    bullet("**Mã hóa:** mỗi byte tra bảng mã O(1) và ghi l~c~ bit, tổng Θ(N + B(T)) = Θ(N · L̄). **Giải mã:** đọc từng bit và đi xuống cây (hoặc tra mã chính tắc), Θ(B(T))."),
    p("Tổng thời gian nén là O(N + n log n). Với bảng chữ cái byte, n ≤ 256 là hằng số nên chi phí chủ đạo là phần tuyến tính theo N; tuy nhiên với bảng chữ cái lớn (ví dụ mã hóa trực tiếp các giá trị cảm biến 16 bit, hoặc các từ trong văn bản), bước dựng cây O(n log n) trở nên đáng kể."),
    p("Có hai cách cài đặt khác của cùng phép chọn tham lam, đều được cài đặt để đối chiếu trong Mục 6.4:"),
    bullet("**Quét tuyến tính:** tìm hai phần tử nhỏ nhất bằng cách duyệt danh sách, mỗi bước O(n), tổng O(n²)."),
    bullet("**Hai hàng đợi:** sắp xếp các lá một lần, rồi dùng hai hàng đợi FIFO — một cho lá, một cho nút trong mới tạo. Vì các nút trong được tạo ra có trọng số không giảm, phần tử nhỏ nhất luôn nằm ở đầu một trong hai hàng đợi, nên phần gộp chỉ tốn O(n). Tổng thời gian O(n log n) do bước sắp xếp, và giảm còn O(n) nếu tần suất đã được sắp sẵn " + cite("moffat2019") + "."),
    h2("4.2. Độ phức tạp của Huffman thích nghi (FGK)"),
    p("Với mỗi ký hiệu, FGK phát từ mã có độ dài bằng độ sâu d của lá và đi từ lá lên gốc qua d nút. Knuth chỉ ra rằng với cấu trúc dữ liệu “khối” phù hợp, mỗi bước tìm nút dẫn đầu khối và đổi chỗ tốn O(1), nên thời gian xử lý tỉ lệ với độ dài dữ liệu đã mã hóa " + cite("knuth1985") + ". Cài đặt trong báo cáo tìm nút dẫn đầu bằng cách dò tuần tự trong khối, nên mỗi bước tốn O(kích thước khối) trong trường hợp xấu nhất; với bảng chữ byte, khối nhỏ và chi phí này bị chặn bởi hằng số 2·256 + 1."),
    p("Về số bit, gọi S là số bit Huffman tĩnh dùng cho dữ liệu (không tính bảng mã) và t là số ký hiệu của thông điệp. Vitter chứng minh thuật toán Λ dùng ít hơn S + t bit và đây là cận tốt nhất có thể trong trường hợp xấu nhất cho mọi phương pháp Huffman một lượt " + cite("vitter1987") + ". Với FGK, Lelewer và Hirschberg trình bày cận của Vitter: tổng số bit nằm trong khoảng từ S − n + 1 đến 2S + t − 4n + 2, tức FGK không bao giờ tệ hơn nhiều so với hai lần tối ưu " + cite("lelewer1987") + ". Lưu ý S không gồm chi phí bảng mã của Huffman tĩnh; trên dữ liệu ngắn, chính chi phí bảng mã này khiến Huffman thích nghi có lợi thế."),
    h2("4.3. Độ phức tạp của LZ77 và LZ78"),
    p("**LZ77** " + cite("lz77") + " duy trì cửa sổ trượt W byte đã mã hóa; tại mỗi vị trí, tìm chuỗi khớp dài nhất (tối đa L byte) trong cửa sổ và phát bộ ba (offset, length, ký tự kế tiếp). Tìm kiếm vét cạn tốn O(W · L) mỗi vị trí, tức O(N · W · L) cho cả tệp. Cài đặt trong báo cáo dùng bảng băm theo tiền tố 3 byte và chỉ xét tối đa K ứng viên gần nhất, nên thời gian nén là O(N · K · L) = O(N) với hằng số K·L; giải mã chỉ sao chép byte, O(N)."),
    p("**LZ78** " + cite("lz78") + " xây dựng từ điển cụm tăng dần; mỗi bước tìm cụm dài nhất w có trong từ điển, phát cặp (chỉ số của w, ký tự kế tiếp) và thêm cụm mới. Khi lưu từ điển dạng cây trie với bảng băm cho các cạnh, mỗi byte đầu vào chỉ tốn một lần tra O(1) kỳ vọng, nên cả nén và giải mã đều O(N) kỳ vọng. Bộ nhớ tỉ lệ với số cụm trong từ điển."),
    h2("4.4. So sánh Huffman tĩnh và Huffman thích nghi"),
    tableCaption("**Bảng 2.** So sánh lý thuyết Huffman tĩnh và Huffman thích nghi (FGK)"),
    table(["Tiêu chí", "Huffman tĩnh (hai lượt)", "Huffman thích nghi (FGK)"], [
      ["Số lượt duyệt dữ liệu", "2 (đếm tần suất, rồi mã hóa); phải đệm toàn bộ dữ liệu", "1; mã hóa ngay khi ký hiệu đến (phù hợp luồng dữ liệu cảm biến)"],
      ["Thông tin phụ cần gửi", "Bảng mã: ở đây 2 + 2k byte (k ký hiệu, mỗi ký hiệu 1 byte giá trị + 1 byte độ dài mã chính tắc)", "Không có; ký hiệu mới gửi dạng thô 8 bit sau mã NYT"],
      ["Tính tối ưu", "Tối ưu cho phân bố của toàn bộ dữ liệu (không tính bảng mã)", "Tối ưu cho phân bố tích lũy đến thời điểm hiện tại; thuật toán Λ < S + t bit " + cite("vitter1987")],
      ["Thích ứng với thay đổi phân bố", "Không (một bảng mã cho cả khối)", "Có, theo tần suất tích lũy (nhưng thích ứng chậm dần khi trọng số lớn)"],
      ["Thời gian mỗi ký hiệu", "O(1) tra bảng khi mã hóa", "O(d) để phát mã và cập nhật cây (d là độ sâu lá)"],
      ["Thời gian toàn bộ", "O(N + n log n)", "O(N · d) ≈ O(N · L̄)"],
      ["Bộ nhớ", "Bảng tần suất và bảng mã O(n), cộng bộ đệm dữ liệu O(N)", "Cây 2n + 1 nút, O(n); không cần đệm dữ liệu"],
      ["Độ bền với lỗi kênh truyền", "Lỗi bit chỉ ảnh hưởng trong khối", "Lỗi bit làm hai phía mất đồng bộ cây cho tới hết luồng (cần đặt lại cây định kỳ)"],
    ], W, { size: 19 }),
  ];
}

module.exports = { abstract, introduction, relatedWork, theory, complexity };
