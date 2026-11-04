"""LZ77 (Ziv–Lempel 1977) dạng bộ ba (offset, length, ký tự kế tiếp).

Mỗi bộ ba được ghi với độ rộng cố định:
offset 12 bit (cửa sổ trượt 4096 byte), length 4 bit (0..15), ký tự 8 bit,
tức 24 bit = 3 byte cho mỗi bộ ba, như mô tả gốc của Ziv và Lempel.

Tìm chuỗi khớp dài nhất bằng bảng băm theo tiền tố 3 byte; mỗi vị trí chỉ
xét tối đa MAX_CANDIDATES ứng viên gần nhất. Khớp ngắn hơn MIN_MATCH được
phát thành bộ ba (0, 0, ký tự).

Định dạng: [4 byte: độ dài gốc][dòng bộ ba].
"""

from __future__ import annotations

from collections import defaultdict, deque

from .bitio import BitReader, BitWriter, pack_header, unpack_header, HEADER_BYTES

OFFSET_BITS = 12
LENGTH_BITS = 4
WINDOW = (1 << OFFSET_BITS) - 1   # offset tối đa
MAX_LEN = (1 << LENGTH_BITS) - 1  # độ dài khớp tối đa
MIN_MATCH = 3
MAX_CANDIDATES = 64


def compress(data: bytes) -> bytes:
    n = len(data)
    w = BitWriter()
    chains: dict[bytes, deque[int]] = defaultdict(lambda: deque(maxlen=MAX_CANDIDATES))
    i = 0
    inserted = 0  # mọi vị trí < inserted đã nằm trong bảng băm

    while i < n:
        best_len = 0
        best_off = 0
        limit = min(MAX_LEN, n - 1 - i)  # chừa 1 byte làm "ký tự kế tiếp"
        if limit >= MIN_MATCH:
            key = data[i:i + 3]
            for j in reversed(chains.get(key, ())):
                off = i - j
                if off > WINDOW:
                    break
                length = 3
                while length < limit and data[j + length] == data[i + length]:
                    length += 1
                if length > best_len:
                    best_len, best_off = length, off
                    if length == limit:
                        break
        if best_len < MIN_MATCH:
            best_len, best_off = 0, 0
        w.write(best_off, OFFSET_BITS)
        w.write(best_len, LENGTH_BITS)
        w.write(data[i + best_len], 8)
        i += best_len + 1
        while inserted < i and inserted + 3 <= n:
            chains[data[inserted:inserted + 3]].append(inserted)
            inserted += 1
    return pack_header(n) + w.getvalue()


def decompress(packed: bytes) -> bytes:
    n = unpack_header(packed)
    r = BitReader(packed, HEADER_BYTES)
    out = bytearray()
    while len(out) < n:
        off = r.read(OFFSET_BITS)
        length = r.read(LENGTH_BITS)
        ch = r.read(8)
        if length:
            start = len(out) - off
            if off == 0 or start < 0:
                raise ValueError("offset không hợp lệ")
            for k in range(length):  # cho phép chồng lấn (off < length)
                out.append(out[start + k])
        out.append(ch)
    if len(out) != n:
        raise ValueError("độ dài giải nén không khớp")
    return bytes(out)
