"""Thuật toán Huffman làm việc trên dãy byte (không phụ thuộc vào ảnh)."""

from __future__ import annotations

import heapq
from dataclasses import dataclass


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
    """Duyệt cây để sinh mã: đi trái thêm '0', đi phải thêm '1'. Θ(k)."""
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
