import random

import pytest
from PIL import Image

from huffman.codec import compress_file, decompress_file, stats
from huffman.image_io import load_image, save_image


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


def test_extra_decoded_pixels_rejected(tmp_path):
    # Ảnh 8x1 một màu: mỗi pixel 1 bit, bit_length = 8, payload 1 byte.
    # Sửa bit_length thành 16 và thêm 1 byte: bộ giải mã sinh ra 16 pixel thay vì 8.
    _, huf, _ = _roundtrip(tmp_path, Image.new("L", (8, 1), 9), False)
    data = bytearray(huf.read_bytes())
    data[1038:1046] = (16).to_bytes(8, "big")
    huf.write_bytes(bytes(data) + b"\x00")
    with pytest.raises(ValueError):
        decompress_file(huf, tmp_path / "bad.png")


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


def _png16_rgb(path, w, h, samples):
    """Ghi tay một PNG RGB 16 bit/kênh (Pillow mở ảnh này ở chế độ RGB)."""
    import struct
    import zlib

    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))

    raw = b"".join(b"\x00" + struct.pack(f">{w * 3}H", *samples[y * w * 3:(y + 1) * w * 3])
                   for y in range(h))
    ihdr = struct.pack(">IIBBBBB", w, h, 16, 2, 0, 0, 0)
    path.write_bytes(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr)
                     + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))


def test_16bit_rgb_rejected(tmp_path):
    p = tmp_path / "a.png"
    _png16_rgb(p, 4, 2, [1 + 1000 * i for i in range(4 * 2 * 3)])
    with pytest.raises(ValueError):
        load_image(p)


def test_multi_frame_rejected(tmp_path):
    p = tmp_path / "a.png"
    Image.new("L", (4, 4), 1).save(p, save_all=True, append_images=[Image.new("L", (4, 4), 2)])
    with pytest.raises(ValueError):
        load_image(p)


def test_flipped_payload_bit_rejected(tmp_path):
    # Hai giá trị xuất hiện đều nhau nên mỗi mã dài 1 bit: lật một bit vẫn ra
    # đúng số pixel nhưng sai giá trị. Phải báo lỗi, không ghi ra ảnh sai.
    img = Image.frombytes("L", (8, 8), bytes([0, 255]) * 32)
    _, huf, _ = _roundtrip(tmp_path, img, False)
    data = bytearray(huf.read_bytes())
    data[1046] ^= 0x80
    huf.write_bytes(bytes(data))
    with pytest.raises(ValueError):
        decompress_file(huf, tmp_path / "bad.png")
