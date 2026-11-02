# Báo cáo: Nén ảnh không mất dữ liệu bằng Huffman Codes

- **Môn:** Thuật toán nâng cao, Bài kiểm tra giữa kỳ, Câu 1
- **Loại dữ liệu đã chọn:** tệp ảnh
- **Ngôn ngữ:** Python 3
- **Mã nguồn:** https://github.com/DOANCONGPHU/huffman-compression-algorithm

Ký hiệu dùng trong toàn bài:

| Ký hiệu | Ý nghĩa |
|---|---|
| N | Số byte pixel của ảnh = số pixel × số kênh màu (ảnh xám 1 kênh, RGB 3 kênh, RGBA 4 kênh) |
| k | Số giá trị byte khác nhau xuất hiện trong ảnh, 1 ≤ k ≤ 256 |
| L̄ | Độ dài mã trung bình, tính bằng bit cho mỗi byte |
| H | Entropy Shannon của dữ liệu, tính bằng bit cho mỗi byte |

---

## a. Trình bày thuật toán

### a.1 Ý tưởng

Bình thường mỗi byte pixel được lưu bằng đúng 8 bit, dù giá trị đó xuất hiện nhiều hay ít. Huffman gán cho mỗi giá trị một **mã nhị phân có độ dài thay đổi**: giá trị **xuất hiện nhiều thì mã ngắn**, giá trị **hiếm thì mã dài**. Tổng số bit vì thế giảm xuống.

Bộ mã Huffman là **mã tiền tố**: không mã nào là phần đầu của một mã khác. Nhờ vậy, khi đọc dãy bit từ trái sang phải, ta luôn biết chính xác một mã kết thúc ở đâu mà không cần ký tự phân cách.

Huffman là nén **không mất dữ liệu**: ảnh sau giải nén trùng khớp từng pixel với ảnh gốc.

### a.2 Áp dụng cho ảnh

1. Đọc ảnh và lấy ra dãy byte pixel thô. Ví dụ ảnh RGB được đọc thành R, G, B, R, G, B, …
2. Coi dãy byte này như một "văn bản" có bảng chữ cái 256 ký hiệu (giá trị 0–255).
3. Nén dãy byte đó bằng Huffman.

Chương trình dùng thư viện Pillow **chỉ để đọc và ghi ảnh**. Toàn bộ phần Huffman tự cài đặt, không dùng thư viện nén nào.

Lưu ý: không nén trực tiếp file PNG hay JPG, vì các file này đã được nén sẵn. Chương trình giải mã chúng thành pixel thô trước, rồi mới áp dụng Huffman.

### a.3 Thuật toán nén

```
NÉN(ảnh):
    data ← dãy byte pixel của ảnh                       // độ dài N
    nếu dùng delta: data ← DELTA(data)                  // mục a.7

    // Bước 1: đếm tần suất
    freq[0..255] ← 0
    với mỗi byte b trong data: freq[b] ← freq[b] + 1

    // Bước 2: dựng cây Huffman bằng hàng đợi ưu tiên (min-heap)
    Q ← heap rỗng
    với mỗi giá trị s có freq[s] > 0: đưa lá (freq[s], s) vào Q
    lặp khi Q còn nhiều hơn 1 nút:
        a ← lấy nút có tần suất nhỏ nhất ra khỏi Q
        b ← lấy nút có tần suất nhỏ nhất ra khỏi Q
        đưa nút cha (a.freq + b.freq, trái = a, phải = b) vào Q
    gốc ← nút còn lại trong Q

    // Bước 3: sinh bảng mã bằng cách duyệt cây
    đi sang trái thêm bit '0', đi sang phải thêm bit '1'
    mã của giá trị s = chuỗi bit trên đường đi từ gốc tới lá s

    // Bước 4: mã hóa
    bits ← nối mã của từng byte trong data
    đệm thêm bit 0 cho đủ bội số của 8, đổi thành dãy byte

    // Bước 5: ghi file .huf
    ghi header (kích thước ảnh, chế độ màu, bảng freq, số bit) rồi ghi dãy byte nén
```

Để giải nén dựng lại **đúng cây** từ bảng tần suất, việc dựng cây phải **tất định**. Khi hai nút có cùng tần suất, chương trình so sánh theo thứ tự nút được đưa vào heap: lá theo giá trị tăng dần, nút cha theo thứ tự được tạo.

### a.4 Thuật toán giải nén

```
GIẢI_NÉN(file .huf):
    đọc header và dãy byte nén
    gốc ← dựng cây Huffman từ bảng freq (cùng thuật toán như khi nén)
    nút ← gốc
    với mỗi bit trong số_bit bit đầu tiên:            // bỏ qua bit đệm
        nút ← (bit = 0) ? nút.trái : nút.phải
        nếu nút là lá:
            ghi giá trị của lá ra; nút ← gốc
    nếu dùng delta: data ← DELTA_NGƯỢC(data)
    ghi data thành ảnh .png
```

### a.5 Ví dụ minh họa

Dãy 8 byte `A A A A B B C D` có tần suất: A = 4, B = 2, C = 1, D = 1.

**Các bước gộp** (mỗi lần lấy 2 nút nhỏ nhất):

| Bước | Lấy ra | Tạo nút cha | Heap sau bước |
|---|---|---|---|
| 1 | C(1), D(1) | CD(2) | A(4), B(2), CD(2) |
| 2 | B(2), CD(2) | BCD(4) | A(4), BCD(4) |
| 3 | A(4), BCD(4) | Gốc(8) | Gốc(8) |

**Cây kết quả:**

```
            (8)
          0/   \1
         A(4)   (4)
              0/   \1
             B(2)   (2)
                  0/   \1
                 C(1)   D(1)
```

**Bảng mã và kết quả:**

| Ký hiệu | Tần suất | Mã | Số bit |
|---|---|---|---|
| A | 4 | `0` | 4 × 1 = 4 |
| B | 2 | `10` | 2 × 2 = 4 |
| C | 1 | `110` | 1 × 3 = 3 |
| D | 1 | `111` | 1 × 3 = 3 |
| **Tổng** | 8 | | **14 bit** |

Lưu bình thường cần 8 × 8 = **64 bit**, Huffman chỉ cần **14 bit**. Chuỗi mã hóa là `0000 10 10 110 111`. Đọc từ trái sang phải luôn tách được duy nhất một cách, vì đây là mã tiền tố.

Bảng mã này đúng là kết quả chương trình sinh ra: `{A: '0', B: '10', C: '110', D: '111'}`. Ví dụ này cũng được kiểm tra trong `tests/test_core.py`.

### a.6 Định dạng file `.huf`

| Trường | Kích thước | Nội dung |
|---|---|---|
| Magic | 4 byte | `HUF1`, để nhận diện file |
| Cờ | 1 byte | bit 0 = có dùng delta |
| Chế độ màu | 1 byte | 0 = xám (L), 1 = RGB, 2 = RGBA |
| Rộng, cao | 4 + 4 byte | |
| Bảng tần suất | 256 × 4 byte | Để bộ giải nén dựng lại cây |
| Số bit | 8 byte | Số bit thật, để bỏ qua bit đệm ở byte cuối |
| Dữ liệu nén | còn lại | |

Header dài cố định **1046 byte**. Mọi số nguyên đều là big-endian.

Khi giải nén, chương trình kiểm tra tổng bảng tần suất và số byte giải mã ra có khớp với rộng × cao × số kênh không. Nếu file bị hỏng, chương trình báo lỗi thay vì ghi ra một ảnh sai.

### a.7 Biến đổi delta (tùy chọn `--delta`)

Trong ảnh thật, pixel kề nhau thường có giá trị gần giống nhau. Thay vì lưu giá trị pixel, ta lưu **độ chênh với pixel bên trái** cùng kênh màu:

```
d[i] = (p[i] − p[i − c]) mod 256        c = số kênh màu
```

Pixel đầu mỗi hàng giữ nguyên. Phép ngược là cộng dồn: `p[i] = (d[i] + p[i − c]) mod 256`, nên không mất dữ liệu.

Ví dụ một hàng ảnh xám: `10 12 15 15` biến thành `10 2 3 0`.

Sau delta, đa số giá trị tập trung quanh 0 (và quanh 255, tức −1). Phân bố lệch mạnh như vậy giúp Huffman nén tốt hơn nhiều (xem mục c.3). Delta không phải là một phần của Huffman. Nó là bước tiền xử lý, độ phức tạp Θ(N).

### a.8 Vị trí trong mã nguồn

| Bước | Hàm | File |
|---|---|---|
| Đếm tần suất | `count_frequencies` | `huffman/core.py` |
| Dựng cây | `build_tree` | `huffman/core.py` |
| Sinh mã | `build_codes` | `huffman/core.py` |
| Mã hóa / giải mã | `encode` / `decode` | `huffman/core.py` |
| Delta | `delta_encode` / `delta_decode` | `huffman/delta.py` |
| File `.huf` | `write_huf` / `read_huf` | `huffman/container.py` |
| Đọc / ghi ảnh | `load_image` / `save_image` | `huffman/image_io.py` |
| Ghép các bước | `compress_file` / `decompress_file` / `stats` | `huffman/codec.py` |

---

## b. Tính các giá trị O, Ω, Θ

### b.1 Nhắc lại định nghĩa

Với T(n) là thời gian chạy:

- **T(n) = O(g(n))**, cận trên: tồn tại c > 0, n₀ sao cho T(n) ≤ c·g(n) với mọi n ≥ n₀.
- **T(n) = Ω(g(n))**, cận dưới: tồn tại c > 0, n₀ sao cho T(n) ≥ c·g(n) với mọi n ≥ n₀.
- **T(n) = Θ(g(n))**, cận chặt: vừa O(g(n)) vừa Ω(g(n)).

### b.2 Phân tích từng bước

**Bước 1. Đếm tần suất.** Duyệt N byte, mỗi byte tăng một phần tử mảng, mất O(1). Khởi tạo mảng 256 phần tử là hằng số. Thời gian **Θ(N)**: mỗi byte phải được đọc ít nhất một lần, nên cận trên và cận dưới trùng nhau.

**Bước 2. Dựng cây.**
- Tạo k lá và `heapify`: Θ(k).
- Mỗi lần gộp làm 2 lần `heappop` và 1 lần `heappush`, mỗi thao tác O(log k) với heap tối đa k phần tử. Mỗi lần gộp giảm số nút trong heap đi 1, nên có đúng **k − 1 lần gộp**.
- Cận trên: (k − 1) · O(log k) = **O(k log k)**.
- Cận dưới: trong `heapq` của Python, `heappop` đưa phần tử cuối lên gốc, đẩy nó xuống **tận lá**, rồi mới đẩy ngược lên. Vì vậy mỗi lần `heappop` trên heap m phần tử tốn ít nhất ⌊log₂ m⌋ − 1 bước, với mọi đầu vào. Mỗi lần gộp giảm kích thước heap đi 1, nên k/2 lần gộp đầu tiên đều chạy trên heap có ít nhất k/2 phần tử. Tổng thời gian vì thế ít nhất (k/2) · (log₂(k/2) − 2) = **Ω(k log k)**.
- Vậy bước 2 là **Θ(k log k)** với mọi đầu vào có k giá trị khác nhau.

**Bước 3. Sinh mã.** Cây có k lá và k − 1 nút trong, tổng 2k − 1 nút. Mỗi nút được thăm đúng một lần, nên **Θ(k)**. Phép nối chuỗi tiền tố tốn thêm thời gian tỉ lệ với độ dài mã, nhưng độ dài mã ≤ k − 1 ≤ 255, nên với ảnh đây vẫn là hằng số.

**Bước 4. Mã hóa.** Với mỗi byte, tra bảng mã O(1) rồi ghi ra số bit bằng độ dài mã. Tổng số bit ghi ra đúng bằng N · L̄. Thời gian **Θ(N · L̄)**.

**Bước 5. Giải mã.** Mỗi bit đi xuống một cạnh của cây, mất O(1). Có N · L̄ bit, nên **Θ(N · L̄)**.

**Delta.** Mỗi byte một phép trừ (hoặc cộng) mod 256, nên **Θ(N)**.

### b.3 Tổng hợp

| Bước | O | Ω | Θ |
|---|---|---|---|
| Đếm tần suất | O(N) | Ω(N) | Θ(N) |
| Dựng cây | O(k log k) | Ω(k log k) | Θ(k log k) |
| Sinh mã | O(k) | Ω(k) | Θ(k) |
| Mã hóa | O(N · L̄) | Ω(N) | Θ(N · L̄) |
| Giải mã | O(N · L̄) | Ω(N) | Θ(N · L̄) |
| Delta | O(N) | Ω(N) | Θ(N) |

Với Huffman, mỗi mã dài ít nhất 1 bit, nên L̄ ≥ 1. Mã dài nhất không quá k − 1 bit, nên L̄ ≤ k − 1 ≤ 255. Như vậy L̄ bị chặn trên bởi một hằng số khi làm việc với byte, và Θ(N · L̄) = Θ(N).

**Toàn bộ thuật toán nén:**

- **Cận trên:** T(N, k) = Θ(N) + O(k log k) + Θ(k) + Θ(N · L̄) = **O(N + k log k)**.
- **Cận dưới:** phải đọc hết N byte, và dựng cây cần Ω(k log k) như đã chứng minh ở b.2, nên **Ω(N + k log k)**.
- **Cận chặt:** **T(N, k) = Θ(N + k log k)** với mọi đầu vào.
- **Trường hợp tốt nhất:** k = 1, ảnh chỉ có một giá trị byte. Cây chỉ có một lá, không có lần gộp nào, nên thời gian là **Θ(N)**.
- **Trường hợp xấu nhất về thời gian:** k = 256, dùng đủ mọi giá trị byte, nên thời gian là **Θ(N + 256 log 256)**.

**Áp dụng cho ảnh:** vì k ≤ 256 là hằng số, k log k ≤ 256 · 8 = 2048 cũng là hằng số. Do đó trong **mọi trường hợp**, thời gian nén và giải nén ảnh là:

> **T(N) = Θ(N)**, tức tuyến tính theo số byte pixel.

**Bộ nhớ:** dữ liệu vào N byte, dãy bit trung gian N · L̄ bit, cây 2k − 1 nút, bảng mã k phần tử. Tổng **Θ(N + k)**, và với ảnh là Θ(N).

### b.4 Hai nghĩa của "trường hợp xấu nhất"

Cần phân biệt hai khái niệm:

- **Xấu nhất về thời gian:** k lớn, vì dựng cây mất Θ(k log k). Với ảnh, k tối đa là 256 nên ảnh hưởng không đáng kể.
- **Xấu nhất về tỉ lệ nén:** 256 giá trị xuất hiện đều nhau. Khi đó H = 8 và mọi mã đều dài 8 bit, nên L̄ = 8: không nén được chút nào. File `.huf` còn **lớn hơn** dữ liệu gốc một chút vì có thêm header 1046 byte. Ảnh `noise.png` ở mục c.3 cho thấy đúng điều này.

---

## c. Đánh giá độ phức tạp thuật toán

### c.1 Tổng hợp độ phức tạp

| | Tổng quát | Với ảnh (k ≤ 256) |
|---|---|---|
| Thời gian nén | Θ(N + k log k) | Θ(N) |
| Thời gian giải nén | Θ(N · L̄ + k log k) | Θ(N) |
| Bộ nhớ | Θ(N + k) | Θ(N) |
| Kích thước file nén | 1046 byte header + ⌈N · L̄ / 8⌉ byte | |

### c.2 Kiểm chứng thời gian bằng thực nghiệm

Số liệu sinh bằng `python scripts/benchmark.py` trên ảnh nhiễu xám vuông. Máy chạy là container Linux, Python 3.13.

| Cạnh | N (byte) | Nén (giây) | Giải nén (giây) | Nén (µs/byte) | Giải nén (µs/byte) |
|---|---|---|---|---|---|
| 128 | 16384 | 0.002 | 0.022 | 0.142 | 1.341 |
| 256 | 65536 | 0.006 | 0.052 | 0.095 | 0.791 |
| 512 | 262144 | 0.025 | 0.199 | 0.097 | 0.760 |
| 1024 | 1048576 | 0.112 | 1.022 | 0.107 | 0.975 |

**Nhận xét:**

- Khi N tăng gấp 4 lần (cạnh gấp đôi), thời gian nén và giải nén cũng tăng khoảng 4 lần.
- Thời gian trên mỗi byte gần như không đổi: khoảng 0,1 µs/byte khi nén, 0,8–1,0 µs/byte khi giải nén. Điều này khớp với kết luận **Θ(N)** ở phần b.
- Dòng 128 có µs/byte cao hơn vì chi phí cố định, như dựng cây và khởi tạo, chiếm tỉ lệ lớn khi ảnh nhỏ.
- Giải nén chậm hơn nén khoảng 8–9 lần. Hai chiều có cùng độ phức tạp Θ(N · L̄), chỉ khác hằng số. Khi nén, Python nối các chuỗi mã có sẵn, còn khi giải nén phải chạy vòng lặp Python cho **từng bit**.

### c.3 Tỉ lệ nén trên ảnh mẫu

**Tỉ lệ nén** = kích thước `.huf` / N. Càng nhỏ càng tốt, lớn hơn 1 nghĩa là file to ra.

| Ảnh | Chế độ | N (byte) | k | H (bit) | L̄ (bit) | Tỉ lệ nén | Tỉ lệ nén + delta |
|---|---|---|---|---|---|---|---|
| flat.png | RGB | 786432 | 9 | 2.582 | 2.615 | 0.328 | 0.130 |
| gradient.png | L | 262144 | 256 | 7.721 | 7.750 | 0.973 | 0.162 |
| noise.png | L | 262144 | 256 | 7.999 | 8.000 | 1.004 | 1.004 |
| photo_astronaut.png | RGB | 786432 | 256 | 7.472 | 7.511 | 0.940 | 0.625 |
| photo_astronaut_gray.png | L | 262144 | 256 | 7.454 | 7.491 | 0.940 | 0.617 |

Các ảnh mẫu:

- `flat.png`: ảnh kiểu logo, ít màu.
- `gradient.png`: dải xám chuyển dần.
- `noise.png`: nhiễu ngẫu nhiên.
- `photo_astronaut.png`: ảnh chụp thật của NASA, thuộc phạm vi công cộng, lấy từ bộ dữ liệu mẫu của scikit-image.
- `photo_astronaut_gray.png`: bản xám của ảnh trên.

**Kiểm chứng giới hạn Shannon.** Lý thuyết cho biết với mã Huffman, **H ≤ L̄ < H + 1**. Mọi dòng trong bảng đều thỏa mãn, và L̄ chỉ lớn hơn H từ 0,001 đến 0,04 bit. Như vậy Huffman gần như đạt giới hạn tối ưu cho mã hóa từng byte riêng lẻ.

### c.4 Phân tích kết quả

- **Ảnh phẳng (`flat.png`) nén tốt.** Chỉ có k = 9 giá trị byte, phân bố rất lệch vì nền trắng chiếm đa số, nên L̄ ≈ 2,6 bit thay vì 8 bit. Tỉ lệ nén khoảng 0,33.
- **Ảnh nhiễu (`noise.png`) không nén được.** H ≈ 8 bit, mọi giá trị đều đều nhau. Tỉ lệ 1,004 > 1 do thêm header. Đây là trường hợp xấu nhất về tỉ lệ nén đã nêu ở b.4.
- **Ảnh chụp thật chỉ giảm khoảng 6% nếu không dùng delta.** Ảnh dùng gần đủ 256 giá trị, phân bố khá đều, nên H ≈ 7,5 bit.
- **Delta giúp rất nhiều với ảnh có tương quan giữa pixel kề nhau.**
  - Ảnh chụp: tỉ lệ nén từ 0,94 giảm xuống khoảng 0,62.
  - Gradient: từ 0,97 giảm xuống 0,16, vì mọi hiệu chỉ là 0 hoặc 1.
  - Ảnh nhiễu: delta không giúp gì, vì các pixel không liên quan đến nhau.
- **Giới hạn 1 bit/byte của Huffman.** Ảnh `flat.png` sau delta có H ≈ 0,09 bit, nhưng L̄ ≈ 1,03 bit, vì Huffman phải dùng **ít nhất 1 bit** cho mỗi ký hiệu. Khi dữ liệu gần như toàn một giá trị, Huffman lãng phí nhiều so với entropy. Mã hóa số học (arithmetic coding) hoặc mã hóa độ dài loạt (RLE) sẽ làm tốt hơn trong trường hợp này.
- **Ghi chú về k = 1.** Với ảnh một màu thì H = 0 nhưng L̄ = 1. Khi đó bất đẳng thức L̄ < H + 1 không còn đúng, vì chương trình quy ước dùng 1 bit cho mỗi ký hiệu khi cây chỉ có một lá.

**So sánh với file PNG gốc:**

| Ảnh | PNG gốc (byte) | `.huf` (byte) | `.huf` + delta (byte) |
|---|---|---|---|
| flat.png | 2 737 | 258 099 | 102 178 |
| gradient.png | 1 436 | 254 999 | 42 494 |
| noise.png | 263 056 | 263 190 | 263 190 |
| photo_astronaut.png | 791 555 | 739 409 | 491 763 |
| photo_astronaut_gray.png | 141 673 | 246 499 | 161 667 |

PNG thường nhỏ hơn `.huf` vì PNG dùng DEFLATE, tức là **LZ77 kết hợp với Huffman**. LZ77 tìm và thay thế các **chuỗi byte lặp lại**, còn Huffman thuần chỉ nhìn từng byte riêng lẻ. Riêng `photo_astronaut.png` có file PNG gốc được nén kém, nên `.huf` + delta nhỏ hơn PNG gốc khoảng 38%.

### c.5 Ưu điểm và hạn chế

**Ưu điểm:**

- Thời gian tuyến tính Θ(N), bộ nhớ Θ(N).
- Không mất dữ liệu.
- Tối ưu trong lớp mã tiền tố gán mã cho từng ký hiệu: L̄ gần sát entropy H.
- Cài đặt đơn giản, dễ kiểm chứng.

**Hạn chế:**

- Không khai thác được tương quan giữa các pixel hay các chuỗi lặp lại. Phải kết hợp thêm delta, hoặc LZ77 như PNG.
- Mỗi ký hiệu tốn ít nhất 1 bit, nên lãng phí khi dữ liệu gần như đồng nhất.
- Phải đọc dữ liệu hai lần (đếm tần suất rồi mới mã hóa) và lưu bảng tần suất 1 KB trong header. Với ảnh rất nhỏ, header có thể lớn hơn phần tiết kiệm được.
- Bản cài đặt Python thuần chậm hơn C nhiều lần, nhất là khi giải nén từng bit.

**Hướng cải thiện:**

- Lưu độ dài mã theo kiểu Huffman chuẩn tắc (canonical Huffman) để header chỉ còn 256 byte.
- Giải mã theo bảng tra nhiều bit cùng lúc thay vì từng bit.
- Dùng bộ dự đoán tốt hơn delta, ví dụ dự đoán từ pixel trái, trên và chéo như PNG hoặc JPEG-LS.

### c.6 Kết luận

Thuật toán Huffman nén ảnh có độ phức tạp **Θ(N + k log k)**. Với ảnh, k ≤ 256 nên độ phức tạp là **Θ(N)** cả về thời gian lẫn bộ nhớ. Thực nghiệm xác nhận thời gian tăng tuyến tính theo kích thước ảnh. Độ dài mã trung bình luôn nằm trong giới hạn Shannon H ≤ L̄ < H + 1.

Hiệu quả nén phụ thuộc vào phân bố giá trị pixel:

- Tốt với ảnh ít màu.
- Kém với ảnh chụp nếu dùng một mình.
- Không nén được với ảnh nhiễu.

Thêm bước delta giúp tỉ lệ nén ảnh chụp cải thiện rõ rệt, từ 0,94 xuống khoảng 0,62.
