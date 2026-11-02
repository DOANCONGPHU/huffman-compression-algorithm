"""Định dạng file .huf: header cố định 1046 byte rồi tới dữ liệu nén.

| Trường        | Kích thước   | Ghi chú                       |
|---------------|--------------|-------------------------------|
| Magic         | 4 byte       | b"HUF1"                       |
| Cờ            | 1 byte       | bit 0 = dùng delta            |
| Chế độ màu    | 1 byte       | 0 = L, 1 = RGB, 2 = RGBA      |
| Rộng, cao     | 4 + 4 byte   |                               |
| Bảng tần suất | 256 × 4 byte |                               |
| Số bit        | 8 byte       | số bit thật của dữ liệu nén   |
| Dữ liệu nén   | còn lại      | ceil(số bit / 8) byte         |

Mọi số nguyên là big-endian, không dấu.
"""

from __future__ import annotations

import struct
from dataclasses import dataclass

MAGIC = b"HUF1"
MODE_CODES = {"L": 0, "RGB": 1, "RGBA": 2}
_CODE_MODES = {v: k for k, v in MODE_CODES.items()}

_FIXED = struct.Struct(">4sBBII")
_FREQS = struct.Struct(">256I")
_BITS = struct.Struct(">Q")
HEADER_SIZE = _FIXED.size + _FREQS.size + _BITS.size


@dataclass
class HufHeader:
    use_delta: bool
    mode: str
    width: int
    height: int
    freqs: list[int]
    bit_length: int


def write_huf(path, header: HufHeader, payload: bytes) -> None:
    with open(path, "wb") as f:
        f.write(_FIXED.pack(MAGIC, 1 if header.use_delta else 0,
                            MODE_CODES[header.mode], header.width, header.height))
        f.write(_FREQS.pack(*header.freqs))
        f.write(_BITS.pack(header.bit_length))
        f.write(payload)


def read_huf(path) -> tuple[HufHeader, bytes]:
    with open(path, "rb") as f:
        data = f.read()
    if len(data) < HEADER_SIZE:
        raise ValueError("File .huf quá ngắn")
    magic, flags, mode_code, width, height = _FIXED.unpack_from(data, 0)
    if magic != MAGIC:
        raise ValueError("Không phải file .huf (sai magic)")
    if mode_code not in _CODE_MODES:
        raise ValueError(f"Mã chế độ màu không hợp lệ: {mode_code}")
    freqs = list(_FREQS.unpack_from(data, _FIXED.size))
    (bit_length,) = _BITS.unpack_from(data, _FIXED.size + _FREQS.size)
    payload = data[HEADER_SIZE:]
    if len(payload) != (bit_length + 7) // 8:
        raise ValueError("Độ dài dữ liệu nén không khớp với số bit trong header")
    header = HufHeader(bool(flags & 1), _CODE_MODES[mode_code], width, height, freqs, bit_length)
    return header, payload
