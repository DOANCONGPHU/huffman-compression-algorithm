"""Ghi và đọc dòng bit (bit cao trước), dùng chung cho mọi bộ nén."""

from __future__ import annotations

HEADER_BYTES = 4  # độ dài dữ liệu gốc, số nguyên không dấu big-endian


class BitWriter:
    def __init__(self) -> None:
        self._out = bytearray()
        self._acc = 0
        self._nbits = 0

    def write(self, value: int, width: int) -> None:
        """Ghi `width` bit thấp của `value`."""
        self._acc = (self._acc << width) | (value & ((1 << width) - 1))
        self._nbits += width
        while self._nbits >= 8:
            self._nbits -= 8
            self._out.append((self._acc >> self._nbits) & 0xFF)
        self._acc &= (1 << self._nbits) - 1

    def getvalue(self) -> bytes:
        """Trả về các byte đã ghi; byte cuối được đệm bit 0 bên phải."""
        if self._nbits:
            return bytes(self._out) + bytes([(self._acc << (8 - self._nbits)) & 0xFF])
        return bytes(self._out)


class BitReader:
    def __init__(self, data: bytes, start: int = 0) -> None:
        self._data = data
        self._pos = start  # chỉ số byte kế tiếp chưa nạp
        self._acc = 0
        self._nbits = 0

    def read(self, width: int) -> int:
        while self._nbits < width:
            if self._pos >= len(self._data):
                raise ValueError("dòng bit bị cụt")
            self._acc = (self._acc << 8) | self._data[self._pos]
            self._pos += 1
            self._nbits += 8
        self._nbits -= width
        value = self._acc >> self._nbits
        self._acc &= (1 << self._nbits) - 1
        return value

    def read_bit(self) -> int:
        return self.read(1)


def pack_header(n: int) -> bytes:
    return n.to_bytes(HEADER_BYTES, "big")


def unpack_header(data: bytes) -> int:
    if len(data) < HEADER_BYTES:
        raise ValueError("thiếu phần đầu (header)")
    return int.from_bytes(data[:HEADER_BYTES], "big")
