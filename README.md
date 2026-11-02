# huffman-compression-algorithm

Nén và giải nén ảnh **không mất dữ liệu** bằng thuật toán **Huffman**, viết bằng Python. Chương trình có thêm tùy chọn biến đổi **delta** giữa các pixel kề nhau để nén ảnh chụp tốt hơn.

Đây là bài làm Câu 1, Bài kiểm tra giữa kỳ môn Thuật toán nâng cao. Loại dữ liệu đã chọn là **tệp ảnh**.

📄 **Báo cáo (phần a, b, c):** [`docs/bao-cao.md`](docs/bao-cao.md)

## Cài đặt

Cần Python 3.10 trở lên.

```bash
pip install -r requirements.txt
```

Thư viện Pillow chỉ dùng để đọc và ghi ảnh. Toàn bộ thuật toán Huffman được tự cài đặt trong `huffman/core.py`.

## Sử dụng

Nén ảnh. Có thể bỏ `--delta` để nén Huffman thuần:

```bash
python -m huffman compress samples/photo_astronaut.png astronaut.huf --delta
```

Giải nén. Chỉ ghi ra `.png` để ảnh giữ nguyên từng pixel:

```bash
python -m huffman decompress astronaut.huf astronaut_restored.png
```

Thống kê entropy, độ dài mã trung bình và tỉ lệ nén, có và không có delta:

```bash
python -m huffman stats samples/photo_astronaut.png
```

Ảnh đầu vào có thể là PNG, JPG hoặc BMP. Chế độ màu được hỗ trợ: xám (L), RGB, RGBA, và ảnh bảng màu (P), ảnh bảng màu được chuyển sang RGBA. Ảnh 16 bit/kênh và ảnh động (nhiều khung hình) chưa được hỗ trợ.

## Kiểm thử

```bash
python -m pytest -q
```

## Đo đạc

Tạo lại ảnh mẫu:

```bash
python scripts/make_samples.py
```

In bảng tỉ lệ nén và bảng thời gian dùng trong báo cáo:

```bash
python scripts/benchmark.py
```

## Cấu trúc thư mục

```
huffman/
  core.py        Thuật toán Huffman: đếm tần suất, dựng cây, sinh mã, mã hóa, giải mã
  delta.py       Biến đổi delta và phép ngược
  container.py   Định dạng file .huf
  image_io.py    Đọc/ghi ảnh bằng Pillow
  codec.py       Ghép các phần: nén, giải nén, thống kê
  __main__.py    Dòng lệnh
scripts/         Tạo ảnh mẫu, đo đạc
samples/         Ảnh mẫu
tests/           Kiểm thử (pytest)
docs/bao-cao.md  Báo cáo
```

## Nguồn ảnh mẫu

- `flat.png`, `gradient.png`, `noise.png`: tạo bằng `scripts/make_samples.py`.
- `photo_astronaut.png`: ảnh của NASA (Eileen Collins), thuộc phạm vi công cộng, lấy từ bộ dữ liệu mẫu của [scikit-image](https://github.com/scikit-image/scikit-image). `photo_astronaut_gray.png` là bản xám của ảnh này.
