"""Huffman thích nghi (động) theo thuật toán FGK (Faller–Gallager–Knuth).

Bộ mã hóa và bộ giải mã cùng bắt đầu từ cây chỉ có nút NYT (Not Yet
Transmitted) và cập nhật cây giống hệt nhau sau mỗi ký hiệu, nên không
cần gửi bảng tần suất và chỉ cần một lượt duyệt dữ liệu.

- Ký hiệu đã gặp: phát mã đường đi từ gốc tới lá của nó.
- Ký hiệu mới: phát mã của NYT rồi 8 bit thô của ký hiệu.
- Cập nhật: đi từ lá lên gốc; tại mỗi nút, đổi chỗ nó với nút có số thứ
  tự lớn nhất trong cùng khối trọng số (trừ khi đó là cha nó), rồi tăng
  trọng số. Thao tác này giữ "tính chất anh em" (sibling property) của
  Gallager, vốn là điều kiện cần và đủ để cây là cây Huffman.

Định dạng: [4 byte: độ dài gốc][dòng bit].
"""

from __future__ import annotations

from .bitio import BitReader, BitWriter, pack_header, unpack_header, HEADER_BYTES

_MAX_NODES = 2 * 256 + 1  # 256 lá + 255 nút trong + NYT... đủ cho bảng chữ cái 1 byte


class _Tree:
    __slots__ = ("weight", "parent", "left", "right", "symbol", "node_at", "order_of",
                 "leaf", "nyt", "root")

    def __init__(self) -> None:
        # Nút được đánh chỉ số 0.. ; số thứ tự (order) lớn hơn = gần gốc hơn / nặng hơn.
        self.weight: list[int] = [0]
        self.parent: list[int] = [-1]
        self.left: list[int] = [-1]
        self.right: list[int] = [-1]
        self.symbol: list[int] = [-1]
        self.order_of: list[int] = [_MAX_NODES]
        self.node_at: dict[int, int] = {_MAX_NODES: 0}
        self.leaf: list[int] = [-1] * 256
        self.nyt = 0
        self.root = 0

    def _new_node(self, parent: int, order: int, symbol: int) -> int:
        idx = len(self.weight)
        self.weight.append(0)
        self.parent.append(parent)
        self.left.append(-1)
        self.right.append(-1)
        self.symbol.append(symbol)
        self.order_of.append(order)
        self.node_at[order] = idx
        return idx

    def path_bits(self, node: int) -> tuple[int, int]:
        """Mã của nút: chuỗi bit từ gốc xuống (trái 0, phải 1)."""
        code = 0
        length = 0
        parent = self.parent
        right = self.right
        while node != self.root:
            p = parent[node]
            if right[p] == node:
                code |= 1 << length
            length += 1
            node = p
        return code, length

    def _swap(self, a: int, b: int) -> None:
        parent, left, right = self.parent, self.left, self.right
        pa, pb = parent[a], parent[b]
        if pa == pb:
            left[pa], right[pa] = right[pa], left[pa]
        else:
            if left[pa] == a:
                left[pa] = b
            else:
                right[pa] = b
            if left[pb] == b:
                left[pb] = a
            else:
                right[pb] = a
            parent[a], parent[b] = pb, pa
        oa, ob = self.order_of[a], self.order_of[b]
        self.order_of[a], self.order_of[b] = ob, oa
        self.node_at[oa], self.node_at[ob] = b, a

    def update(self, symbol: int) -> None:
        node = self.leaf[symbol]
        if node < 0:
            old = self.nyt
            o = self.order_of[old]
            leaf = self._new_node(old, o - 1, symbol)
            nyt = self._new_node(old, o - 2, -1)
            self.right[old] = leaf
            self.left[old] = nyt
            self.leaf[symbol] = leaf
            self.nyt = nyt
            node = leaf
        weight, parent, order_of, node_at = self.weight, self.parent, self.order_of, self.node_at
        while node >= 0:
            # Tìm nút dẫn đầu khối: số thứ tự lớn nhất có cùng trọng số.
            w = weight[node]
            o = order_of[node]
            leader = node
            nxt = node_at.get(o + 1)
            while nxt is not None and weight[nxt] == w:
                leader = nxt
                o += 1
                nxt = node_at.get(o + 1)
            if leader != node and leader != parent[node]:
                self._swap(node, leader)
            weight[node] = w + 1
            node = parent[node]


def compress(data: bytes) -> bytes:
    tree = _Tree()
    w = BitWriter()
    for b in data:
        leaf = tree.leaf[b]
        if leaf >= 0:
            code, length = tree.path_bits(leaf)
            w.write(code, length)
        else:
            code, length = tree.path_bits(tree.nyt)
            w.write(code, length)
            w.write(b, 8)
        tree.update(b)
    return pack_header(len(data)) + w.getvalue()


def decompress(packed: bytes) -> bytes:
    n = unpack_header(packed)
    tree = _Tree()
    r = BitReader(packed, HEADER_BYTES)
    read_bit = r.read_bit
    left, right, symbol = tree.left, tree.right, tree.symbol
    out = bytearray()
    for _ in range(n):
        node = tree.root
        while left[node] >= 0:  # nút trong
            node = right[node] if read_bit() else left[node]
        if node == tree.nyt:
            b = r.read(8)
        else:
            b = symbol[node]
        out.append(b)
        tree.update(b)
    return bytes(out)
