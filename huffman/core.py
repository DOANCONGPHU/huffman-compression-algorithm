"""Thuật toán Huffman làm việc trên dãy byte (không phụ thuộc vào ảnh)."""

from __future__ import annotations

import heapq
from itertools import chain
from dataclasses import dataclass


# _BYTE_BITS[b] là chuỗi 8 bit của byte b, ví dụ _BYTE_BITS[5] == "00000101".
_BYTE_BITS = [format(b, "08b") for b in range(256)]


@dataclass
class Node:
    """Một nút của cây Huffman. Lá có `symbol`, nút trong có `left`/`right`."""

    freq: int
    symbol: int | None = None
    left: Node | None = None
    right: Node | None = None


def count_frequencies(data: bytes) -> list[int]:
    """Đếm số lần xuất hiện của mỗi giá trị byte 0..255. Θ(N)."""
    freqs = [0] * 256
    for b in data:
        freqs[b] += 1
    return freqs


def build_tree(freqs: list[int]) -> Node | None:
    """Dựng cây Huffman bằng hàng đợi ưu tiên (heap). Θ(k log k).

    Lá được đưa vào heap theo thứ tự symbol tăng dần; `order` tăng dần giúp
    hai nút cùng tần suất luôn so sánh theo một thứ tự cố định, nên cùng một
    bảng tần suất luôn cho cùng một cây.
    """
    heap: list[tuple[int, int, Node]] = []
    order = 0
    for symbol, freq in enumerate(freqs):
        if freq > 0:
            heap.append((freq, order, Node(freq, symbol=symbol)))
            order += 1
    if not heap:
        return None
    heapq.heapify(heap)
    while len(heap) > 1:
        _, _, a = heapq.heappop(heap)
        _, _, b = heapq.heappop(heap)
        parent = Node(a.freq + b.freq, left=a, right=b)
        heapq.heappush(heap, (parent.freq, order, parent))
        order += 1
    return heap[0][2]


def build_codes(root: Node | None) -> dict[int, str]:
    """Duyệt cây để sinh mã: đi trái thêm '0', đi phải thêm '1'. Θ(tổng độ dài các mã)."""
    if root is None:
        return {}
    if root.symbol is not None:
        return {root.symbol: "0"}
    codes: dict[int, str] = {}
    stack: list[tuple[Node, str]] = [(root, "")]
    while stack:
        node, prefix = stack.pop()
        if node.symbol is not None:
            codes[node.symbol] = prefix
        else:
            stack.append((node.left, prefix + "0"))
            stack.append((node.right, prefix + "1"))
    return codes


def encode(data: bytes, codes: dict[int, str]) -> tuple[bytes, int]:
    """Thay mỗi byte bằng mã của nó. Trả về (payload, số bit thật).

    Byte cuối được đệm bit '0' bên phải cho đủ 8 bit. Θ(N · L̄).
    """
    bits = "".join(codes[b] for b in data)
    bit_length = len(bits)
    if bit_length == 0:
        return b"", 0
    padded = bits + "0" * (-bit_length % 8)
    return int(padded, 2).to_bytes(len(padded) // 8, "big"), bit_length


def decode(payload: bytes, bit_length: int, root: Node | None) -> bytes:
    """Đi từ gốc xuống theo từng bit, gặp lá thì ghi symbol và quay về gốc.

    Chỉ đọc `bit_length` bit đầu, bỏ qua bit đệm. Θ(N · L̄).
    """
    if root is None or bit_length == 0:
        return b""
    if root.symbol is not None:
        return bytes([root.symbol]) * bit_length
    # Duyệt từng byte qua bảng tra 8 bit, không tạo chuỗi bit lớn trong bộ nhớ.
    full, rest = divmod(bit_length, 8)
    tail = _BYTE_BITS[payload[full]][:rest] if rest else ""
    chunks = chain((_BYTE_BITS[byte] for byte in memoryview(payload)[:full]), (tail,))
    out = bytearray()
    node = root
    for chunk in chunks:
        for bit in chunk:
            node = node.left if bit == "0" else node.right
            if node.symbol is not None:
                out.append(node.symbol)
                node = root
    return bytes(out)
