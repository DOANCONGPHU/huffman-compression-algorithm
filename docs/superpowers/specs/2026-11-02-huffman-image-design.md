# Thiết kế: Nén ảnh không mất dữ liệu bằng Huffman Codes

- Ngày: 2026-11-02
- Bối cảnh: Bài kiểm tra giữa kỳ môn Thuật toán nâng cao, Câu 1
- Trạng thái: chờ duyệt

## 1. Mục tiêu

### Đề bài

Vận dụng Huffman Codes và Data Compression để nén một loại dữ liệu. Bài này chọn **tệp ảnh**. Bài làm gồm ba phần:

- a. Trình bày thuật toán
- b. Tính các giá trị O, Ω, Θ
- c. Đánh giá độ phức tạp thuật toán

Ràng buộc: chỉ chọn một loại dữ liệu, ngôn ngữ tùy chọn, mã nguồn đưa lên GitHub, link GitHub ghi trong bài kiểm tra.

### Sản phẩm

1. Chương trình Python nén và giải nén ảnh bằng Huffman, **không mất dữ liệu**. Ảnh sau giải nén phải trùng từng pixel với ảnh gốc.
2. Tùy chọn `--delta`: biến đổi hiệu giữa pixel kề nhau trước khi nén Huffman.
3. Báo cáo tiếng Việt `docs/bao-cao.md` trả lời phần a, b, c, có số liệu đo thực tế.
4. `README.md` hướng dẫn cài đặt, chạy, và dẫn link đến báo cáo.

### Tiêu chí thành công

- Mọi test pytest đều qua.
- Với mọi ảnh ở chế độ L, RGB, RGBA hoặc P: nén rồi giải nén cho ra ảnh có pixel trùng khớp với ảnh gốc (ảnh P được so sánh sau khi chuyển sang RGBA), cả khi có và không có `--delta`.
- Ảnh phẳng (ít màu) có file `.huf` nhỏ hơn rõ rệt so với dữ liệu pixel thô.
- Báo cáo có đủ ba phần a, b, c, và bảng số liệu sinh ra từ `scripts/benchmark.py`.

## 2. Phạm vi

### Trong phạm vi

- Huffman tĩnh: một bảng mã cho toàn bộ ảnh, dựng từ tần suất byte.
- Biến đổi delta theo hàng, có thể bật tắt.
- Dòng lệnh `compress`, `decompress`, `stats`.
- Script tạo ảnh mẫu và script đo đạc.

### Ngoài phạm vi

- Nén có mất dữ liệu (kiểu JPEG, WebP lossy).
- Huffman thích nghi, Huffman theo khối, Huffman chuẩn tắc (canonical).
- Tối ưu tốc độ bằng C hoặc numpy. Phần Huffman được viết bằng Python thuần để dễ đọc.
- Giao diện đồ họa.

## 3. Môi trường

- Python 3.10 trở lên.
- Thư viện: `Pillow` (chỉ để đọc và ghi ảnh), `pytest` (kiểm thử). Ghi trong `requirements.txt`.
- Phần Huffman, delta và định dạng file chỉ dùng thư viện chuẩn (`heapq`, `struct`, `dataclasses`).

## 4. Cấu trúc mã nguồn

```
huffman/
  __init__.py
  core.py        # Thuật toán Huffman, làm việc trên bytes, không biết gì về ảnh
  delta.py       # Biến đổi delta và phép ngược
  image_io.py    # Đọc/ghi ảnh bằng Pillow
  container.py   # Ghi/đọc file .huf
  codec.py       # Ghép các phần trên: nén file, giải nén file, thống kê
  __main__.py    # Dòng lệnh (argparse)
scripts/
  make_samples.py
  benchmark.py
samples/         # Ảnh mẫu
tests/
  test_core.py
  test_delta.py
  test_container.py
  test_codec.py
docs/
  bao-cao.md
requirements.txt
README.md
```

Quy tắc phụ thuộc: `core`, `delta`, `container` không import lẫn nhau và không import Pillow. Chỉ `image_io` import Pillow. `codec` dùng tất cả. `__main__` chỉ gọi `codec`.

## 5. Thành phần

### 5.1 `core.py`: thuật toán Huffman

```python
@dataclass
class Node:
    freq: int
    symbol: int | None = None   # None với nút trong
    left: "Node | None" = None
    right: "Node | None" = None

def count_frequencies(data: bytes) -> list[int]          # độ dài 256
def build_tree(freqs: list[int]) -> Node | None
def build_codes(root: Node | None) -> dict[int, str]     # symbol -> chuỗi "0"/"1"
def encode(data: bytes, codes: dict[int, str]) -> tuple[bytes, int]   # (payload, bit_length)
def decode(payload: bytes, bit_length: int, root: Node | None) -> bytes
```

**Dựng cây (`build_tree`):**

1. Mỗi symbol có tần suất > 0 tạo một lá. Lá được đưa vào heap theo thứ tự symbol tăng dần.
2. Phần tử heap là bộ `(freq, order, node)`. `order` là bộ đếm tăng dần, gán cho mỗi nút lúc đưa vào heap. Nhờ vậy, hai nút cùng tần suất luôn được so sánh theo một thứ tự cố định.
3. Lặp cho đến khi heap còn một nút: lấy ra hai nút nhỏ nhất `a` rồi `b`, tạo nút cha `Node(a.freq + b.freq, left=a, right=b)`, đưa nút cha vào heap.
4. Trả về nút cuối cùng.

Cây phải **tất định**: cùng bảng tần suất luôn cho cùng cây. Đây là điều kiện để bộ giải nén dựng lại đúng cây từ bảng tần suất trong file.

**Sinh mã (`build_codes`):** duyệt cây, đi trái thêm `0`, đi phải thêm `1`.

**Trường hợp biên:**

| Trường hợp | `build_tree` | `build_codes` | `encode` | `decode` |
|---|---|---|---|---|
| Dữ liệu rỗng | `None` | `{}` | `(b"", 0)` | `b""` |
| Chỉ một symbol `s` | Lá của `s` | `{s: "0"}` | Mỗi byte thành 1 bit `0` | Mỗi bit sinh ra một `s` |

**Mã hóa (`encode`):** nối mã của từng byte thành chuỗi bit. Byte cuối được đệm thêm bit `0` bên phải cho đủ 8 bit. Trả về payload và số bit thật `bit_length`.

**Giải mã (`decode`):** đọc lần lượt `bit_length` bit đầu, đi từ gốc xuống theo bit, gặp lá thì ghi symbol ra và quay về gốc. Các bit đệm bị bỏ qua.

### 5.2 `delta.py`: biến đổi delta

```python
def delta_encode(data: bytes, width: int, channels: int) -> bytes
def delta_decode(data: bytes, width: int, channels: int) -> bytes
```

- Dữ liệu được chia thành các hàng, mỗi hàng dài `width * channels` byte.
- Trong mỗi hàng, `channels` byte đầu tiên (pixel đầu hàng) giữ nguyên.
- Các byte còn lại: `out[i] = (data[i] - data[i - channels]) & 0xFF`, tức trừ đi cùng kênh màu của pixel bên trái.
- `delta_decode` cộng dồn ngược lại: `out[i] = (data[i] + out[i - channels]) & 0xFF`.
- `delta_decode(delta_encode(x)) == x` với mọi `x` có độ dài là bội số của `width * channels`.

### 5.3 `image_io.py`: đọc và ghi ảnh

```python
def load_image(path) -> tuple[str, int, int, bytes]         # (mode, width, height, pixels)
def save_image(path, mode: str, width: int, height: int, pixels: bytes) -> None
```

- Chế độ hỗ trợ trực tiếp: `L` (1 kênh), `RGB` (3 kênh), `RGBA` (4 kênh).
- Ảnh ở chế độ khác (ví dụ `P`, `LA`, `1`) được chuyển sang `RGBA`. Chuyển như vậy không làm mất thông tin hiển thị.
- `pixels` là dữ liệu thô từ `Image.tobytes()`, các kênh xen kẽ (R, G, B, R, G, B, …).
- `save_image` dùng `Image.frombytes`. Định dạng file đầu ra do đuôi file quyết định. Nên dùng `.png` vì PNG không mất dữ liệu.

### 5.4 `container.py`: định dạng file `.huf`

```python
@dataclass
class HufHeader:
    use_delta: bool
    mode: str            # "L" | "RGB" | "RGBA"
    width: int
    height: int
    freqs: list[int]     # độ dài 256
    bit_length: int

def write_huf(path, header: HufHeader, payload: bytes) -> None
def read_huf(path) -> tuple[HufHeader, bytes]
```

Bố cục file (mọi số nguyên đều là big-endian, không dấu):

| Thứ tự | Trường | Kích thước | Giá trị |
|---|---|---|---|
| 1 | Magic | 4 byte | `b"HUF1"` |
| 2 | Cờ | 1 byte | bit 0 = dùng delta. Các bit khác bằng 0 |
| 3 | Chế độ màu | 1 byte | 0 = L, 1 = RGB, 2 = RGBA |
| 4 | Rộng | 4 byte | |
| 5 | Cao | 4 byte | |
| 6 | Bảng tần suất | 256 × 4 byte | `freqs[0]` … `freqs[255]` |
| 7 | Số bit dữ liệu | 8 byte | `bit_length` |
| 8 | Dữ liệu nén | còn lại | đúng `ceil(bit_length / 8)` byte |

Header dài cố định 1046 byte.

`read_huf` báo `ValueError` khi: sai magic, mã chế độ màu không hợp lệ, file ngắn hơn header, hoặc độ dài payload khác `ceil(bit_length / 8)`.

### 5.5 `codec.py`: ghép các phần

```python
def compress_file(input_path, output_path, use_delta: bool = False) -> None
def decompress_file(input_path, output_path) -> None
def stats(input_path) -> dict
```

**Nén:** `load_image`, rồi `delta_encode` nếu `use_delta`, rồi `count_frequencies`, `build_tree`, `build_codes`, `encode`, và cuối cùng `write_huf`.

**Giải nén:** `read_huf`, `build_tree(freqs)`, `decode`, rồi `delta_decode` nếu cờ delta bật, và cuối cùng `save_image`.

**`stats`** trả về một dict có các khóa sau:

| Khóa | Ý nghĩa |
|---|---|
| `mode`, `width`, `height` | Thông tin ảnh |
| `raw_bytes` | N, số byte pixel thô |
| `file_bytes` | Kích thước file ảnh đầu vào |
| `distinct_symbols` | k, số giá trị byte khác nhau |
| `entropy` | Entropy Shannon H (bit/symbol) của dữ liệu không delta |
| `avg_code_length` | L̄ (bit/symbol) của dữ liệu không delta |
| `huf_bytes` | Kích thước file `.huf` không delta (header + payload) |
| `ratio` | `huf_bytes / raw_bytes` |
| `entropy_delta`, `avg_code_length_delta`, `huf_bytes_delta`, `ratio_delta` | Các giá trị tương ứng khi bật delta |
| `encode_seconds`, `decode_seconds` | Thời gian nén và giải nén, không delta |

### 5.6 `__main__.py`: dòng lệnh

```
python -m huffman compress <input_image> <output.huf> [--delta]
python -m huffman decompress <input.huf> <output_image>
python -m huffman stats <input_image>
```

- `compress` và `decompress` in ra một dòng tóm tắt: kích thước trước, sau và thời gian.
- `stats` in các giá trị của `stats()` thành từng dòng dễ đọc.
- Lỗi đầu vào (không có file, file `.huf` hỏng) in ra thông báo ngắn và thoát với mã 1, không in traceback.

## 6. Ảnh mẫu và đo đạc

### `scripts/make_samples.py`

Tạo ảnh mẫu tất định vào `samples/`. Ảnh nhiễu dùng seed cố định.

| File | Chế độ | Kích thước | Mô tả |
|---|---|---|---|
| `flat.png` | RGB | 512 × 512 | Vài hình khối, ít màu, kiểu logo |
| `gradient.png` | L | 512 × 512 | Dải màu xám chuyển dần |
| `noise.png` | L | 512 × 512 | Nhiễu ngẫu nhiên đều, seed 42 |

Người dùng có thể thêm ảnh chụp thật (PNG hoặc JPG) vào `samples/`.

### `scripts/benchmark.py`

1. Chạy `stats()` trên mọi ảnh trong `samples/` và in một bảng Markdown: tên ảnh, chế độ, N, k, H, L̄, tỉ lệ nén khi không và có delta.
2. Tạo ảnh nhiễu xám vuông với cạnh 128, 256, 512, 1024 và in bảng: N, thời gian nén, thời gian giải nén, thời gian chia cho N. Bảng này dùng để kiểm chứng thời gian tăng tuyến tính.

## 7. Kiểm thử

| File test | Các trường hợp |
|---|---|
| `test_core.py` | Đếm tần suất đúng trên ví dụ nhỏ. Bộ mã không có mã nào là tiền tố của mã khác. Ví dụ `AAAABBCD` cho độ dài mã A = 1, B = 2, C = 3, D = 3 và `bit_length == 14`. Nén rồi giải nén 10 000 byte ngẫu nhiên (seed cố định) cho lại dữ liệu gốc. Dữ liệu chỉ một symbol. Dữ liệu rỗng. `build_tree` tất định: gọi hai lần cho cùng bộ mã. |
| `test_delta.py` | Ví dụ nhỏ tính tay với `channels = 1` và `channels = 3`. Biến đổi rồi biến đổi ngược dữ liệu ngẫu nhiên cho lại dữ liệu gốc. |
| `test_container.py` | Ghi rồi đọc lại cho đúng header và payload. `ValueError` khi sai magic, khi file bị cắt ngắn, khi mã chế độ màu không hợp lệ. |
| `test_codec.py` | Với mỗi chế độ L, RGB, RGBA, P, có và không delta: tạo ảnh trong thư mục tạm, nén, giải nén, so pixel với ảnh gốc (ảnh P so sau khi chuyển RGBA). Ảnh 1×1. Ảnh xám một màu 256 × 256: `.huf` nhỏ hơn 1/5 dữ liệu thô (payload 8 192 byte + header 1 046 byte, so với 65 536 byte thô). `stats()` trả về đủ các khóa, và `entropy <= avg_code_length < entropy + 1`. |

Lệnh chạy: `python -m pytest -q`.

## 8. Báo cáo `docs/bao-cao.md`

Viết bằng tiếng Việt. Ký hiệu: **N** là số byte pixel (số pixel × số kênh), **k** là số giá trị byte khác nhau (1 ≤ k ≤ 256), **L̄** là độ dài mã trung bình (bit/symbol), **H** là entropy.

### a. Trình bày thuật toán

- Ý tưởng: giá trị xuất hiện nhiều nhận mã ngắn. Mã tiền tố nên giải mã được không cần dấu phân cách.
- Các bước nén và giải nén, kèm mã giả.
- Ví dụ `AAAABBCD`: bảng tần suất, các bước gộp, cây kết quả, bảng mã, 64 bit so với 14 bit.
- Định dạng file `.huf`.
- Biến đổi delta: lý do, công thức, ví dụ.

### b. Tính O, Ω, Θ

| Bước | Độ phức tạp |
|---|---|
| Đếm tần suất | Θ(N) |
| Dựng heap ban đầu | Θ(k) |
| Dựng cây: k − 1 lần gộp, mỗi lần O(log k) | Θ(k log k) |
| Sinh mã: duyệt cây 2k − 1 nút | Θ(k) |
| Mã hóa | Θ(N · L̄) |
| Giải mã | Θ(N · L̄) |
| Delta mã hóa và giải mã | Θ(N) |

- Cận trên O: tổng các bước cho O(N · L̄ + k log k). Vì k ≤ 256 nên L̄ ≤ k − 1 ≤ 255, ta có O(N + k log k).
- Cận dưới Ω cho mọi đầu vào: thuật toán phải đọc mỗi byte ít nhất một lần và tạo k lá, nên Ω(N + k).
- Cận dưới Ω cho trường hợp xấu nhất: trong mô hình so sánh, có thể dùng Huffman để sắp xếp k số, nên dựng cây cần Ω(k log k) phép so sánh ở trường hợp xấu nhất. Do đó thời gian trường hợp xấu nhất là Ω(N + k log k).
- Vậy thời gian trường hợp xấu nhất là Θ(N + k log k). Trường hợp tốt nhất là k = 1 (ảnh một màu), khi đó thời gian là Θ(N).
- Với ảnh, k bị chặn bởi hằng số 256, nên trong mọi trường hợp thời gian chạy là Θ(N).
- Bộ nhớ: Θ(N + k).
- Cần phân biệt hai loại "xấu nhất". Về **thời gian**, xấu nhất là k lớn. Về **tỉ lệ nén**, xấu nhất là k = 256 với tần suất đều: khi đó H = 8, L̄ = 8, file nén còn lớn hơn dữ liệu gốc một chút vì có thêm header.

### c. Đánh giá

- Bảng tổng hợp độ phức tạp thời gian và bộ nhớ.
- Bảng thời gian theo N từ `benchmark.py`, nhận xét thời gian/N gần như không đổi.
- Bảng tỉ lệ nén trên các ảnh mẫu. Đối chiếu với giới hạn lý thuyết H ≤ L̄ < H + 1.
- Giải thích: ảnh phẳng nén tốt vì k nhỏ và phân bố lệch. Ảnh nhiễu không nén được vì H ≈ 8. Delta giúp ảnh thật vì hiệu tập trung quanh 0.
- Hạn chế: Python thuần chậm. Bảng tần suất tốn 1 KB cố định. Huffman không khai thác các chuỗi lặp lại như LZ77 trong PNG, nên file `.huf` thường lớn hơn file PNG gốc.

## 9. Hiệu năng dự kiến

Phần Huffman là Python thuần. Ảnh mẫu dùng cỡ 512 × 512. Thời gian thực tế được đo bằng `benchmark.py` và ghi vào báo cáo, không cam kết trước con số cụ thể.
