"""Huffman tĩnh (hai lượt) với mã chính tắc (canonical).

Lượt 1 đếm tần suất, dựng cây bằng hàng đợi ưu tiên (heap) trong O(n log n)
với n là số ký hiệu phân biệt. Lượt 2 mã hóa từng byte.

Định dạng: [4 byte: độ dài gốc][2 byte: số ký hiệu k][k cặp (ký hiệu, độ dài mã)][dòng bit].
Chỉ cần lưu độ dài mã vì mã chính tắc được suy ra duy nhất từ độ dài.
"""

from __future__ import annotations

import heapq

from .bitio import BitReader, BitWriter, pack_header, unpack_header, HEADER_BYTES


def _depths(parent: list[int], n_leaves: int) -> list[int]:
    """Độ sâu của n_leaves lá đầu tiên, biết cha của mọi nút (gốc là nút cuối).

    Nút trong được tạo sau hai con nên chỉ số cha luôn lớn hơn chỉ số con;
    duyệt ngược từ gốc cho ra độ sâu trong O(số nút).
    """
    depth = [0] * len(parent)
    for v in range(len(parent) - 2, -1, -1):
        depth[v] = depth[parent[v]] + 1
    return depth[:n_leaves]


def _lengths_from_tree(freqs: list[int], merge) -> list[int]:
    lengths = [0] * len(freqs)
    present = [s for s, f in enumerate(freqs) if f > 0]
    if len(present) == 1:
        lengths[present[0]] = 1
    if len(present) <= 1:
        return lengths
    weights = [freqs[s] for s in present]
    parent = merge(weights)
    for s, d in zip(present, _depths(parent, len(present))):
        lengths[s] = d
    return lengths


def _merge_heap(weights: list[int]) -> list[int]:
    """Gộp tham lam bằng heap nhị phân: n-1 lần lấy 2 min và chèn 1 nút. O(n log n)."""
    n = len(weights)
    parent = [0] * (2 * n - 1)
    heap = [(w, i) for i, w in enumerate(weights)]
    heapq.heapify(heap)  # O(n)
    nxt = n
    while len(heap) > 1:
        wa, a = heapq.heappop(heap)  # hai cây có trọng số nhỏ nhất: lựa chọn tham lam
        wb, b = heapq.heappop(heap)
        parent[a] = parent[b] = nxt
        heapq.heappush(heap, (wa + wb, nxt))
        nxt += 1
    return parent


def _merge_naive(weights: list[int]) -> list[int]:
    """Cùng phép gộp tham lam nhưng tìm 2 min bằng quét tuyến tính. O(n^2)."""
    n = len(weights)
    parent = [0] * (2 * n - 1)
    alive = list(range(n))
    w = list(weights) + [0] * (n - 1)
    nxt = n
    while len(alive) > 1:
        i1 = min(range(len(alive)), key=lambda i: (w[alive[i]], alive[i]))
        a = alive.pop(i1)
        i2 = min(range(len(alive)), key=lambda i: (w[alive[i]], alive[i]))
        b = alive.pop(i2)
        parent[a] = parent[b] = nxt
        w[nxt] = w[a] + w[b]
        alive.append(nxt)
        nxt += 1
    return parent


def _merge_two_queues(weights: list[int]) -> list[int]:
    """Sắp xếp lá một lần rồi dùng hai hàng đợi FIFO (lá / nút trong).

    Nút trong sinh ra có trọng số không giảm, nên min luôn ở đầu một trong
    hai hàng đợi: phần gộp chỉ tốn O(n), tổng O(n log n) do bước sắp xếp
    (O(n) nếu tần suất đã được sắp sẵn).
    """
    n = len(weights)
    parent = [0] * (2 * n - 1)
    leaves = sorted(range(n), key=lambda i: (weights[i], i))
    w = list(weights) + [0] * (n - 1)
    q1, h1 = leaves, 0          # hàng đợi lá
    q2, h2 = [], 0              # hàng đợi nút trong
    nxt = n

    def pop_min():
        nonlocal h1, h2
        if h2 >= len(q2) or (h1 < len(q1) and w[q1[h1]] <= w[q2[h2]]):
            h1 += 1
            return q1[h1 - 1]
        h2 += 1
        return q2[h2 - 1]

    while nxt < 2 * n - 1:
        a = pop_min()
        b = pop_min()
        parent[a] = parent[b] = nxt
        w[nxt] = w[a] + w[b]
        q2.append(nxt)
        nxt += 1
    return parent


def code_lengths(freqs: list[int]) -> list[int]:
    """Độ dài mã Huffman cho từng ký hiệu (0 nếu ký hiệu không xuất hiện)."""
    return _lengths_from_tree(freqs, _merge_heap)


def code_lengths_naive(freqs: list[int]) -> list[int]:
    return _lengths_from_tree(freqs, _merge_naive)


def code_lengths_two_queues(freqs: list[int]) -> list[int]:
    return _lengths_from_tree(freqs, _merge_two_queues)


def canonical_codes(lengths: list[int]) -> dict[int, tuple[int, int]]:
    """Gán mã chính tắc: sắp theo (độ dài, ký hiệu), mã tăng dần."""
    code = 0
    prev_len = 0
    codes: dict[int, tuple[int, int]] = {}
    for length, sym in sorted((l, s) for s, l in enumerate(lengths) if l > 0):
        code <<= length - prev_len
        codes[sym] = (code, length)
        code += 1
        prev_len = length
    return codes


def compress(data: bytes) -> bytes:
    freqs = [0] * 256
    for b in data:
        freqs[b] += 1
    lengths = code_lengths(freqs)
    codes = canonical_codes(lengths)
    head = bytearray(pack_header(len(data)))
    head += len(codes).to_bytes(2, "big")
    for sym in sorted(codes):
        head += bytes([sym, lengths[sym]])
    w = BitWriter()
    write = w.write
    table = [codes.get(s, (0, 0)) for s in range(256)]
    for b in data:
        code, length = table[b]
        write(code, length)
    return bytes(head) + w.getvalue()


def decompress(packed: bytes) -> bytes:
    n = unpack_header(packed)
    pos = HEADER_BYTES
    if len(packed) < pos + 2:
        raise ValueError("thiếu bảng độ dài mã")
    k = int.from_bytes(packed[pos:pos + 2], "big")
    pos += 2
    if len(packed) < pos + 2 * k:
        raise ValueError("bảng độ dài mã bị cụt")
    lengths = [0] * 256
    for i in range(k):
        lengths[packed[pos + 2 * i]] = packed[pos + 2 * i + 1]
    pos += 2 * k
    if n and not k:
        raise ValueError("bảng mã rỗng")
    codes = canonical_codes(lengths)
    # Giải mã chính tắc: đọc từng bit, tra (độ dài, mã) -> ký hiệu.
    lookup = {(length, code): sym for sym, (code, length) in codes.items()}
    max_len = max((l for l in lengths), default=0)
    r = BitReader(packed, pos)
    read_bit = r.read_bit
    out = bytearray()
    for _ in range(n):
        code = 0
        for length in range(1, max_len + 1):
            code = (code << 1) | read_bit()
            sym = lookup.get((length, code))
            if sym is not None:
                out.append(sym)
                break
        else:
            raise ValueError("mã không hợp lệ")
    return bytes(out)
