"""LZ78 (Ziv–Lempel 1978) dạng cặp (chỉ số cụm, ký tự kế tiếp).

Từ điển bắt đầu chỉ có cụm rỗng (chỉ số 0). Mỗi bước tìm cụm dài nhất w
đã có trong từ điển, phát (chỉ số(w), c) với c là ký tự ngay sau w, rồi
thêm w·c vào từ điển. Từ điển được lưu dạng trie: (chỉ số cha, byte) -> chỉ số.

Chỉ số được ghi với số bit vừa đủ cho kích thước từ điển hiện tại
(ceil(log2(kích thước))), ký tự ghi 8 bit. Khi từ điển đạt MAX_ENTRIES cụm
thì được xóa và xây lại từ đầu (cả hai phía làm giống nhau).

Định dạng: [4 byte: độ dài gốc][dòng cặp].
"""

from __future__ import annotations

from .bitio import BitReader, BitWriter, pack_header, unpack_header, HEADER_BYTES

MAX_ENTRIES = 1 << 16


def _index_bits(size: int) -> int:
    return max(1, (size - 1).bit_length())


def compress(data: bytes) -> bytes:
    w = BitWriter()
    trie: dict[tuple[int, int], int] = {}
    size = 1  # số cụm trong từ điển, gồm cụm rỗng
    cur = 0
    for b in data:
        nxt = trie.get((cur, b))
        if nxt is not None:
            cur = nxt
            continue
        w.write(cur, _index_bits(size))
        w.write(b, 8)
        trie[(cur, b)] = size
        size += 1
        cur = 0
        if size >= MAX_ENTRIES:
            trie.clear()
            size = 1
    if cur:
        # Dữ liệu kết thúc giữa một cụm đã có: phát (cha của cụm, byte cuối).
        parent, last = next(k for k, v in trie.items() if v == cur)
        w.write(parent, _index_bits(size))
        w.write(last, 8)
    return pack_header(len(data)) + w.getvalue()


def decompress(packed: bytes) -> bytes:
    n = unpack_header(packed)
    r = BitReader(packed, HEADER_BYTES)
    phrases: list[bytes] = [b""]
    out = bytearray()
    while len(out) < n:
        idx = r.read(_index_bits(len(phrases)))
        b = r.read(8)
        if idx >= len(phrases):
            raise ValueError("chỉ số cụm không hợp lệ")
        phrase = phrases[idx] + bytes([b])
        out += phrase
        phrases.append(phrase)
        if len(phrases) >= MAX_ENTRIES:
            phrases = [b""]
    if len(out) != n:
        raise ValueError("độ dài giải nén không khớp")
    return bytes(out)
