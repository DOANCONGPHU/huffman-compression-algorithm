# Nén ảnh bằng Huffman: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chương trình Python nén và giải nén ảnh không mất dữ liệu bằng Huffman (có tùy chọn delta), kèm báo cáo tiếng Việt cho phần a, b, c của đề.

**Architecture:** `core.py` chứa thuật toán Huffman thuần trên `bytes`. `delta.py`, `container.py`, `image_io.py` mỗi file làm một việc. `codec.py` ghép chúng thành nén/giải nén/thống kê. `__main__.py` là dòng lệnh. Hai script tạo ảnh mẫu và đo đạc để lấy số liệu cho báo cáo.

**Tech Stack:** Python 3.10+ (môi trường hiện có 3.13), Pillow, pytest.

**Spec:** `docs/superpowers/specs/2026-11-02-huffman-image-design.md`

## Global Constraints

- Python ≥ 3.10. Dependencies chỉ gồm `Pillow` và `pytest`, ghi trong `requirements.txt`.
- `core.py`, `delta.py`, `container.py` chỉ dùng thư viện chuẩn, không import Pillow, không import lẫn nhau. Chỉ `image_io.py` import Pillow.
- Phần Huffman tự viết, không dùng `zlib`, `gzip` hay thư viện nén nào.
- Mọi số nguyên trong file `.huf` là big-endian, không dấu. Header dài 1046 byte.
- Commit message theo Conventional Commits, mô tả tiếng Việt (xem `CLAUDE.md`).
- Chạy test bằng `python -m pytest -q` từ thư mục gốc repo.
- Báo cáo và README viết bằng tiếng Việt.

## Review Focus

Các đầu vào spec không nhắc tới nhưng người dùng dễ gặp. Mỗi dòng đã có test ở task tương ứng.

1. **File `.huf` hỏng nhưng vẫn đúng magic** (bảng tần suất không khớp kích thước ảnh): phải báo lỗi rõ ràng, không được ghi ra ảnh sai hay hiện traceback của Pillow. Test ở Task 5.
2. **Giải nén ra đuôi có mất dữ liệu (`.jpg`)**: người dùng mong ảnh giống hệt gốc, nên phải từ chối thay vì âm thầm nén JPEG. Test ở Task 5.
3. **Ảnh 16-bit hoặc số thực (chế độ `I`, `I;16`, `F`)**: chuyển sang RGBA sẽ mất dữ liệu, nên phải từ chối với thông báo rõ. Test ở Task 5.
4. **Ảnh rộng 1 pixel hoặc 1×1 khi bật delta**: mỗi hàng chỉ có pixel đầu, delta phải không đổi dữ liệu. Test ở Task 3 và Task 5.
5. **Đầu vào không phải ảnh hoặc không tồn tại ở dòng lệnh**: in thông báo ngắn, mã thoát 1, không traceback. Test ở Task 7.

Hai dòng 2 và 3 bổ sung cho spec mục 5.3 (spec chỉ khuyên dùng `.png` và nói "các chế độ khác chuyển sang RGBA"). Quyết định: chỉ chuyển các chế độ chuyển được không mất dữ liệu (`P`, `PA`, `LA`, `1`), các chế độ khác báo `ValueError`. `save_image` chỉ nhận đuôi `.png`.

---

### Task 1: Khởi tạo dự án và dựng cây Huffman

**Files:**
- Create: `requirements.txt`, `.gitignore`, `huffman/__init__.py`, `huffman/core.py`
- Test: `tests/test_core.py`

**Interfaces:**
- Consumes: không có.
- Produces:
  - `Node` (dataclass): `freq: int`, `symbol: int | None = None`, `left: Node | None = None`, `right: Node | None = None`
  - `count_frequencies(data: bytes) -> list[int]` (độ dài 256)
  - `build_tree(freqs: list[int]) -> Node | None`
  - `build_codes(root: Node | None) -> dict[int, str]`

- [ ] **Step 1: Tạo `requirements.txt` (`Pillow>=10`, `pytest>=8`), `.gitignore` (`__pycache__/`, `.pytest_cache/`, `.superpowers/`, `*.huf`), `huffman/__init__.py` rỗng, rồi cài đặt**

Run: `pip install -r requirements.txt`
Expected: cài xong, `python -m pytest --version` in ra phiên bản pytest.

- [ ] **Step 2: Viết test thất bại trong `tests/test_core.py`**

```python
import random
from huffman.core import count_frequencies, build_tree, build_codes

def test_count_frequencies():
    f = count_frequencies(b"AAAABBCD")
    assert len(f) == 256
    assert (f[65], f[66], f[67], f[68]) == (4, 2, 1, 1)
    assert sum(f) == 8

def test_example_code_lengths():
    codes = build_codes(build_tree(count_frequencies(b"AAAABBCD")))
    assert {chr(s): len(c) for s, c in codes.items()} == {"A": 1, "B": 2, "C": 3, "D": 3}

def test_codes_are_prefix_free():
    rng = random.Random(1)
    data = bytes(rng.choice(range(40)) for _ in range(5000))
    codes = list(build_codes(build_tree(count_frequencies(data))).values())
    for a in codes:
        for b in codes:
            assert a == b or not b.startswith(a)

def test_single_symbol():
    assert build_codes(build_tree(count_frequencies(b"\x07" * 10))) == {7: "0"}

def test_empty():
    assert build_tree([0] * 256) is None
    assert build_codes(None) == {}

def test_tree_is_deterministic():
    data = bytes(random.Random(2).randrange(256) for _ in range(3000))
    f = count_frequencies(data)
    assert build_codes(build_tree(f)) == build_codes(build_tree(f))
```

- [ ] **Step 3: Chạy test, xác nhận thất bại**

Run: `python -m pytest tests/test_core.py -q`
Expected: FAIL với `ModuleNotFoundError` hoặc `ImportError` cho `huffman.core`.

- [ ] **Step 4: Viết `Node`, `count_frequencies`, `build_tree`, `build_codes` trong `huffman/core.py`**

`build_tree` theo đúng spec 5.1: lá đưa vào heap theo symbol tăng dần, phần tử heap là `(freq, order, node)` với `order` là bộ đếm tăng dần, lấy `a` rồi `b`, cha là `Node(a.freq + b.freq, left=a, right=b)`. `build_codes` duyệt cây (trái `0`, phải `1`). Nếu gốc là lá thì trả `{symbol: "0"}`. Mỗi hàm có docstring tiếng Việt ngắn vì code này được trích vào báo cáo.

- [ ] **Step 5: Chạy test, xác nhận qua**

Run: `python -m pytest tests/test_core.py -q`
Expected: `6 passed`

- [ ] **Step 6: Commit**

```bash
git add requirements.txt .gitignore huffman/__init__.py huffman/core.py tests/test_core.py
git commit -m "feat(core): dựng cây và sinh bảng mã Huffman"
```

### Task 2: Mã hóa và giải mã Huffman

**Files:**
- Modify: `huffman/core.py`
- Test: `tests/test_core.py`

**Interfaces:**
- Consumes: `count_frequencies`, `build_tree`, `build_codes`, `Node` (Task 1).
- Produces:
  - `encode(data: bytes, codes: dict[int, str]) -> tuple[bytes, int]` trả về `(payload, bit_length)`
  - `decode(payload: bytes, bit_length: int, root: Node | None) -> bytes`

- [ ] **Step 1: Thêm test thất bại vào `tests/test_core.py`**

```python
from huffman.core import encode, decode

def _roundtrip(data):
    root = build_tree(count_frequencies(data))
    payload, n = encode(data, build_codes(root))
    return payload, n, decode(payload, n, root)

def test_example_bit_length():
    payload, n, out = _roundtrip(b"AAAABBCD")
    assert n == 14 and len(payload) == 2 and out == b"AAAABBCD"

def test_roundtrip_random():
    data = bytes(random.Random(0).randrange(256) for _ in range(10_000))
    assert _roundtrip(data)[2] == data

def test_encode_single_symbol():
    payload, n, out = _roundtrip(b"\x07" * 10)
    assert (payload, n, out) == (b"\x00\x00", 10, b"\x07" * 10)

def test_encode_empty():
    assert encode(b"", {}) == (b"", 0)
    assert decode(b"", 0, None) == b""
```

- [ ] **Step 2: Chạy test, xác nhận thất bại**

Run: `python -m pytest tests/test_core.py -q`
Expected: FAIL với `ImportError: cannot import name 'encode'`.

- [ ] **Step 3: Viết `encode` và `decode` trong `huffman/core.py`**

`encode`: nối mã bằng `"".join`, đệm `0` bên phải cho đủ bội số của 8, đổi sang bytes bằng `int(bits, 2).to_bytes(len // 8, "big")` (chuỗi rỗng trả về `b""`). `decode`: duyệt `bit_length` bit đầu từ gốc. Nếu gốc là lá thì mỗi bit sinh một symbol.

- [ ] **Step 4: Chạy test, xác nhận qua**

Run: `python -m pytest tests/test_core.py -q`
Expected: `10 passed`

- [ ] **Step 5: Commit**

```bash
git add huffman/core.py tests/test_core.py
git commit -m "feat(core): thêm mã hóa và giải mã Huffman"
```

### Task 3: Biến đổi delta

**Files:**
- Create: `huffman/delta.py`
- Test: `tests/test_delta.py`

**Interfaces:**
- Consumes: không có.
- Produces:
  - `delta_encode(data: bytes, width: int, channels: int) -> bytes`
  - `delta_decode(data: bytes, width: int, channels: int) -> bytes`

- [ ] **Step 1: Viết test thất bại trong `tests/test_delta.py`**

```python
import random, pytest
from huffman.delta import delta_encode, delta_decode

def test_gray_example():
    data = bytes([10, 12, 15, 15, 200, 190, 190, 0])
    assert delta_encode(data, 4, 1) == bytes([10, 2, 3, 0, 200, 246, 0, 66])

def test_rgb_example():
    data = bytes([10, 20, 30, 15, 18, 40])
    assert delta_encode(data, 2, 3) == bytes([10, 20, 30, 5, 254, 10])

def test_roundtrip_random():
    data = bytes(random.Random(3).randrange(256) for _ in range(7 * 3 * 5))
    assert delta_decode(delta_encode(data, 7, 3), 7, 3) == data

def test_width_one_is_identity():
    data = bytes([5, 9, 200, 0])
    assert delta_encode(data, 1, 1) == data
    assert delta_decode(data, 1, 1) == data

def test_bad_length():
    with pytest.raises(ValueError):
        delta_encode(bytes(5), 2, 1)
```

- [ ] **Step 2: Chạy test, xác nhận thất bại**

Run: `python -m pytest tests/test_delta.py -q`
Expected: FAIL với `ModuleNotFoundError: No module named 'huffman.delta'`.

- [ ] **Step 3: Viết `delta_encode` và `delta_decode` trong `huffman/delta.py`**

Theo công thức spec 5.2. Cả hai hàm báo `ValueError` khi `len(data) % (width * channels) != 0`.

- [ ] **Step 4: Chạy test, xác nhận qua**

Run: `python -m pytest tests/test_delta.py -q`
Expected: `5 passed`

- [ ] **Step 5: Commit**

```bash
git add huffman/delta.py tests/test_delta.py
git commit -m "feat(delta): thêm biến đổi delta giữa pixel kề nhau"
```

### Task 4: Định dạng file `.huf`

**Files:**
- Create: `huffman/container.py`
- Test: `tests/test_container.py`

**Interfaces:**
- Consumes: không có.
- Produces:
  - `HufHeader` (dataclass): `use_delta: bool`, `mode: str`, `width: int`, `height: int`, `freqs: list[int]`, `bit_length: int`
  - `HEADER_SIZE = 1046`
  - `write_huf(path, header: HufHeader, payload: bytes) -> None`
  - `read_huf(path) -> tuple[HufHeader, bytes]`

- [ ] **Step 1: Viết test thất bại trong `tests/test_container.py`**

```python
import pytest
from huffman.container import HufHeader, HEADER_SIZE, write_huf, read_huf

def _header():
    return HufHeader(use_delta=True, mode="RGB", width=3, height=2,
                     freqs=list(range(256)), bit_length=13)

def test_roundtrip(tmp_path):
    p = tmp_path / "a.huf"
    write_huf(p, _header(), b"\xab\xcd")
    assert read_huf(p) == (_header(), b"\xab\xcd")
    assert HEADER_SIZE == 1046 and p.stat().st_size == 1046 + 2

@pytest.mark.parametrize("corrupt", [
    lambda b: b"XXXX" + b[4:],                  # sai magic
    lambda b: b[:100],                          # file bị cắt
    lambda b: b[:5] + bytes([9]) + b[6:],       # mã chế độ màu không hợp lệ
    lambda b: b + b"\x00",                      # thừa payload
])
def test_corrupt_files_raise(tmp_path, corrupt):
    p = tmp_path / "a.huf"
    write_huf(p, _header(), b"\xab\xcd")
    p.write_bytes(corrupt(p.read_bytes()))
    with pytest.raises(ValueError):
        read_huf(p)
```

- [ ] **Step 2: Chạy test, xác nhận thất bại**

Run: `python -m pytest tests/test_container.py -q`
Expected: FAIL với `ModuleNotFoundError: No module named 'huffman.container'`.

- [ ] **Step 3: Viết `container.py`**

Bố cục đúng bảng spec 5.4 bằng `struct`: `">4sBBII"`, rồi `">256I"`, rồi `">Q"`. Mã chế độ màu: `{"L": 0, "RGB": 1, "RGBA": 2}`.

- [ ] **Step 4: Chạy test, xác nhận qua**

Run: `python -m pytest tests/test_container.py -q`
Expected: `5 passed`

- [ ] **Step 5: Commit**

```bash
git add huffman/container.py tests/test_container.py
git commit -m "feat(container): thêm định dạng file .huf"
```

### Task 5: Đọc/ghi ảnh và nén/giải nén file

**Files:**
- Create: `huffman/image_io.py`, `huffman/codec.py`
- Test: `tests/test_codec.py`

**Interfaces:**
- Consumes: Task 1–4.
- Produces:
  - `CHANNELS = {"L": 1, "RGB": 3, "RGBA": 4}` trong `image_io.py`
  - `load_image(path) -> tuple[str, int, int, bytes]` trả về `(mode, width, height, pixels)`
  - `save_image(path, mode: str, width: int, height: int, pixels: bytes) -> None`
  - `compress_file(input_path, output_path, use_delta: bool = False) -> None`
  - `decompress_file(input_path, output_path) -> None`

- [ ] **Step 1: Viết test thất bại trong `tests/test_codec.py`**

```python
import random, pytest
from PIL import Image
from huffman.image_io import load_image, save_image
from huffman.codec import compress_file, decompress_file

def _random_image(mode, w=37, h=23):
    rng = random.Random(4)
    if mode == "P":
        img = Image.frombytes("P", (w, h), bytes(rng.randrange(16) for _ in range(w * h)))
        img.putpalette([rng.randrange(256) for _ in range(16 * 3)])
        return img
    n = w * h * {"L": 1, "RGB": 3, "RGBA": 4}[mode]
    return Image.frombytes(mode, (w, h), bytes(rng.randrange(256) for _ in range(n)))

def _roundtrip(tmp_path, img, use_delta):
    src, huf, out = tmp_path / "in.png", tmp_path / "x.huf", tmp_path / "out.png"
    img.save(src)
    compress_file(src, huf, use_delta=use_delta)
    decompress_file(huf, out)
    return src, huf, out

@pytest.mark.parametrize("use_delta", [False, True])
@pytest.mark.parametrize("mode", ["L", "RGB", "RGBA", "P"])
def test_roundtrip_modes(tmp_path, mode, use_delta):
    img = _random_image(mode)
    _, _, out = _roundtrip(tmp_path, img, use_delta)
    expected = img.convert("RGBA") if mode == "P" else img
    assert Image.open(out).tobytes() == expected.tobytes()

@pytest.mark.parametrize("size", [(1, 1), (1, 20)])
def test_tiny_images_with_delta(tmp_path, size):
    img = _random_image("RGB", *size)
    _, _, out = _roundtrip(tmp_path, img, True)
    assert Image.open(out).tobytes() == img.tobytes()

def test_flat_image_compresses(tmp_path):
    _, huf, _ = _roundtrip(tmp_path, Image.new("L", (256, 256), 128), False)
    assert huf.stat().st_size < 65536 / 5

def test_unsupported_mode_rejected(tmp_path):
    p = tmp_path / "a.png"
    Image.new("I;16", (4, 4)).save(p)
    with pytest.raises(ValueError):
        load_image(p)

def test_lossy_output_rejected(tmp_path):
    with pytest.raises(ValueError):
        save_image(tmp_path / "a.jpg", "L", 1, 1, b"\x00")

def test_inconsistent_huf_rejected(tmp_path):
    src, huf, out = _roundtrip(tmp_path, _random_image("L"), False)
    data = bytearray(huf.read_bytes())
    data[6:10] = (38).to_bytes(4, "big")          # sửa chiều rộng 37 -> 38
    huf.write_bytes(bytes(data))
    with pytest.raises(ValueError):
        decompress_file(huf, tmp_path / "bad.png")
```

- [ ] **Step 2: Chạy test, xác nhận thất bại**

Run: `python -m pytest tests/test_codec.py -q`
Expected: FAIL với `ModuleNotFoundError: No module named 'huffman.image_io'`.

- [ ] **Step 3: Viết `image_io.py`**

`load_image`: giữ nguyên `L`, `RGB`, `RGBA`. Chuyển `P`, `PA`, `LA`, `1` sang `RGBA`. Các chế độ khác báo `ValueError("Chế độ ảnh <mode> chưa được hỗ trợ")`. `save_image`: báo `ValueError` nếu đuôi file (không phân biệt hoa thường) khác `.png`.

- [ ] **Step 4: Viết `compress_file` và `decompress_file` trong `codec.py`**

Theo luồng ở spec 5.5. Trong `decompress_file`, trước khi giải mã, kiểm tra `sum(header.freqs) == width * height * CHANNELS[mode]`. Nếu không khớp thì báo `ValueError("File .huf không hợp lệ")`.

- [ ] **Step 5: Chạy test, xác nhận qua**

Run: `python -m pytest tests/test_codec.py -q`
Expected: `14 passed`

- [ ] **Step 6: Commit**

```bash
git add huffman/image_io.py huffman/codec.py tests/test_codec.py
git commit -m "feat(codec): nén và giải nén file ảnh"
```

### Task 6: Thống kê nén

**Files:**
- Modify: `huffman/codec.py`
- Test: `tests/test_codec.py`

**Interfaces:**
- Consumes: Task 1–5.
- Produces: `stats(input_path) -> dict` với đúng các khóa ở bảng spec 5.5.

- [ ] **Step 1: Thêm test thất bại vào `tests/test_codec.py`**

```python
from huffman.codec import stats

STATS_KEYS = {"mode", "width", "height", "raw_bytes", "file_bytes", "distinct_symbols",
              "entropy", "avg_code_length", "huf_bytes", "ratio",
              "entropy_delta", "avg_code_length_delta", "huf_bytes_delta", "ratio_delta",
              "encode_seconds", "decode_seconds"}

def test_stats_keys_and_shannon_bound(tmp_path):
    p = tmp_path / "a.png"
    _random_image("RGB").save(p)
    s = stats(p)
    assert set(s) == STATS_KEYS
    assert s["raw_bytes"] == 37 * 23 * 3
    assert s["entropy"] <= s["avg_code_length"] < s["entropy"] + 1

def test_delta_helps_gradient(tmp_path):
    p = tmp_path / "g.png"
    Image.frombytes("L", (256, 64), bytes(range(256)) * 64).save(p)
    s = stats(p)
    assert s["ratio_delta"] < s["ratio"]
```

- [ ] **Step 2: Chạy test, xác nhận thất bại**

Run: `python -m pytest tests/test_codec.py -q`
Expected: FAIL với `ImportError: cannot import name 'stats'`.

- [ ] **Step 3: Viết `stats` trong `codec.py`**

`entropy = -Σ p·log2(p)` trên các tần suất khác 0. `avg_code_length = Σ freq·len(code) / N`. `huf_bytes = HEADER_SIZE + ceil(bit_length / 8)`. Thời gian đo bằng `time.perf_counter()`, bao gồm dựng cây, sinh mã và mã hóa (hoặc giải mã). Tách phần đếm, dựng cây, mã hóa dùng chung với `compress_file` thành một hàm nội bộ để không lặp code.

- [ ] **Step 4: Chạy test, xác nhận qua**

Run: `python -m pytest tests/test_codec.py -q`
Expected: `16 passed`

- [ ] **Step 5: Commit**

```bash
git add huffman/codec.py tests/test_codec.py
git commit -m "feat(codec): thêm thống kê entropy và tỉ lệ nén"
```

### Task 7: Dòng lệnh

**Files:**
- Create: `huffman/__main__.py`
- Test: `tests/test_cli.py`

**Interfaces:**
- Consumes: `compress_file`, `decompress_file`, `stats` (Task 5–6).
- Produces: `main(argv: list[str] | None = None) -> int`. Cuối file: `if __name__ == "__main__": sys.exit(main())`.

- [ ] **Step 1: Viết test thất bại trong `tests/test_cli.py`**

```python
from PIL import Image
from huffman.__main__ import main

def test_compress_decompress_stats(tmp_path, capsys):
    src = tmp_path / "a.png"
    Image.new("L", (16, 16), 7).save(src)
    assert main(["compress", str(src), str(tmp_path / "a.huf"), "--delta"]) == 0
    assert main(["decompress", str(tmp_path / "a.huf"), str(tmp_path / "b.png")]) == 0
    assert Image.open(tmp_path / "b.png").tobytes() == bytes([7]) * 256
    assert main(["stats", str(src)]) == 0
    assert "entropy" in capsys.readouterr().out

def test_missing_input(tmp_path, capsys):
    assert main(["compress", str(tmp_path / "nope.png"), str(tmp_path / "x.huf")]) == 1
    err = capsys.readouterr().err
    assert err.strip() and "Traceback" not in err

def test_not_an_image(tmp_path, capsys):
    p = tmp_path / "a.png"
    p.write_text("không phải ảnh")
    assert main(["compress", str(p), str(tmp_path / "x.huf")]) == 1
    assert "Traceback" not in capsys.readouterr().err
```

- [ ] **Step 2: Chạy test, xác nhận thất bại**

Run: `python -m pytest tests/test_cli.py -q`
Expected: FAIL với `ModuleNotFoundError: No module named 'huffman.__main__'`.

- [ ] **Step 3: Viết `main` trong `huffman/__main__.py`**

Dùng `argparse` với ba subcommand theo spec 5.6. Bắt `OSError`, `ValueError` và `PIL.UnidentifiedImageError`, in `Lỗi: <thông báo>` ra stderr và trả về 1. `compress`/`decompress` in kích thước trước, sau và thời gian. `stats` in mỗi khóa một dòng.

- [ ] **Step 4: Chạy test, xác nhận qua**

Run: `python -m pytest -q`
Expected: `39 passed` (toàn bộ test)

- [ ] **Step 5: Commit**

```bash
git add huffman/__main__.py tests/test_cli.py
git commit -m "feat(cli): thêm lệnh compress, decompress, stats"
```

### Task 8: Ảnh mẫu và script đo đạc

**Files:**
- Create: `scripts/make_samples.py`, `scripts/benchmark.py`, `samples/flat.png`, `samples/gradient.png`, `samples/noise.png`
- Test: `tests/test_scripts.py`

**Interfaces:**
- Consumes: `stats`, `compress_file`, `decompress_file` (Task 5–6).
- Produces:
  - `make_samples(out_dir) -> list[Path]`
  - `sample_table(samples_dir) -> str` (bảng Markdown)
  - `timing_table(sizes: list[int]) -> str` (bảng Markdown)
  - Chạy `python scripts/benchmark.py` in cả hai bảng, với `sizes = [128, 256, 512, 1024]`.

- [ ] **Step 1: Viết test thất bại trong `tests/test_scripts.py`**

```python
import sys
from pathlib import Path
from PIL import Image
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from make_samples import make_samples
from benchmark import sample_table, timing_table

def test_make_samples(tmp_path):
    make_samples(tmp_path)
    expected = {"flat.png": "RGB", "gradient.png": "L", "noise.png": "L"}
    for name, mode in expected.items():
        img = Image.open(tmp_path / name)
        assert (img.mode, img.size) == (mode, (512, 512))

def test_tables(tmp_path):
    make_samples(tmp_path)
    t = sample_table(tmp_path)
    assert t.startswith("|") and "noise.png" in t
    assert "| 64 |" in timing_table([64])   # cột đầu là cạnh ảnh, số nguyên
```

- [ ] **Step 2: Chạy test, xác nhận thất bại**

Run: `python -m pytest tests/test_scripts.py -q`
Expected: FAIL với `ModuleNotFoundError: No module named 'make_samples'`.

- [ ] **Step 3: Viết `scripts/make_samples.py`**

Ảnh theo bảng spec mục 6. `flat.png`: nền trắng, vài hình chữ nhật và hình tròn bằng `ImageDraw`, tối đa 5 màu. `gradient.png`: pixel = `(x + y) // 4`. `noise.png`: `random.Random(42)`. Chạy trực tiếp thì ghi vào `samples/`.

- [ ] **Step 4: Viết `scripts/benchmark.py`**

`sample_table`: mỗi ảnh trong thư mục (`.png`, `.jpg`, `.jpeg`, `.bmp`) một dòng gồm tên, chế độ, N, k, H, L̄, tỉ lệ nén và tỉ lệ nén có delta, làm tròn 2–3 chữ số. `timing_table`: với mỗi cạnh s, tạo ảnh nhiễu xám s×s, gọi `stats` trên file tạm, in cột cạnh, N, thời gian nén, thời gian giải nén, và µs/byte.

- [ ] **Step 5: Chạy test, xác nhận qua; rồi tạo ảnh mẫu**

Run: `python -m pytest tests/test_scripts.py -q && python scripts/make_samples.py`
Expected: `2 passed`, và `samples/` có 3 file PNG.

- [ ] **Step 6: Commit**

```bash
git add scripts tests/test_scripts.py samples
git commit -m "feat(scripts): thêm ảnh mẫu và script đo đạc"
```

### Task 9: README và báo cáo

**Files:**
- Modify: `README.md`
- Create: `docs/bao-cao.md`

**Interfaces:**
- Consumes: kết quả `python scripts/benchmark.py`, các hàm ở `huffman/core.py` (trích mã giả).
- Produces: tài liệu, không có code.

- [ ] **Step 1: Chạy đo đạc, lưu kết quả**

Run: `mkdir -p .superpowers && python scripts/benchmark.py > .superpowers/benchmark.md && cat .superpowers/benchmark.md`
Expected: hai bảng Markdown. Cột µs/byte gần như không đổi giữa các cỡ ảnh.

- [ ] **Step 2: Viết `docs/bao-cao.md`**

Đủ các mục ở spec mục 8. Phần a có ví dụ `AAAABBCD` với các bước gộp và cây vẽ bằng khối mã văn bản. Phần b dùng đúng lập luận spec 8b, kể cả việc tách "xấu nhất về thời gian" và "xấu nhất về tỉ lệ nén". Phần c dán nguyên hai bảng từ Step 1 kèm nhận xét. Thêm ghi chú: với k = 1, L̄ = 1 trong khi H = 0, nên bất đẳng thức L̄ < H + 1 không còn đúng; đó là do cách mã hóa quy ước 1 bit/symbol. Không bịa số liệu: mọi con số lấy từ Step 1.

- [ ] **Step 3: Viết `README.md`**

Gồm: giới thiệu một đoạn, cài đặt (`pip install -r requirements.txt`), ba lệnh dùng thử trên `samples/`, cách chạy test, cách chạy benchmark, link đến `docs/bao-cao.md`, cấu trúc thư mục.

- [ ] **Step 4: Kiểm tra lần cuối**

Run: `python -m pytest -q && python -m huffman compress samples/flat.png /tmp/f.huf --delta && python -m huffman decompress /tmp/f.huf /tmp/f.png`
Expected: `41 passed`, hai lệnh in tóm tắt và thoát mã 0.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/bao-cao.md
git commit -m "docs: thêm báo cáo phần a, b, c và hướng dẫn sử dụng"
```
