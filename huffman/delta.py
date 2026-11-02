"""Biến đổi delta: thay mỗi byte bằng hiệu với cùng kênh của pixel bên trái.

Pixel kề nhau trong ảnh thường gần giống nhau, nên các hiệu tập trung quanh 0
và Huffman nén chúng tốt hơn. Phép biến đổi có phép ngược nên không mất dữ liệu.
"""


def _check(data: bytes, width: int, channels: int) -> int:
    stride = width * channels
    if stride <= 0 or len(data) % stride != 0:
        raise ValueError("Độ dài dữ liệu không là bội số của width * channels")
    return stride


def delta_encode(data: bytes, width: int, channels: int) -> bytes:
    """out[i] = (data[i] - data[i - channels]) mod 256; pixel đầu hàng giữ nguyên. Θ(N)."""
    stride = _check(data, width, channels)
    out = bytearray(data)
    for row in range(0, len(data), stride):
        for i in range(row + channels, row + stride):
            out[i] = (data[i] - data[i - channels]) & 0xFF
    return bytes(out)


def delta_decode(data: bytes, width: int, channels: int) -> bytes:
    """Phép ngược: out[i] = (data[i] + out[i - channels]) mod 256. Θ(N)."""
    stride = _check(data, width, channels)
    out = bytearray(data)
    for row in range(0, len(data), stride):
        for i in range(row + channels, row + stride):
            out[i] = (data[i] + out[i - channels]) & 0xFF
    return bytes(out)
