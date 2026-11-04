"""Kiểm thử các bộ nén dùng cho thực nghiệm dữ liệu cảm biến IoT."""

import math
import random

import pytest

from iot_compression import CODECS
from iot_compression.bitio import BitReader, BitWriter
from iot_compression.static_huffman import code_lengths, code_lengths_naive, code_lengths_two_queues

SAMPLES = {
    "empty": b"",
    "one_byte": b"A",
    "one_symbol": b"\x07" * 1000,
    "two_symbols": b"AB" * 500 + b"A",
    "csv": b"date,temp,humidity\n" + b"".join(
        f"2015-02-04 17:{m:02d}:00,23.{m % 10},27.{(m * 7) % 10}\n".encode() for m in range(60)),
    "all_bytes": bytes(range(256)) * 3,
    "random": random.Random(3).randbytes(5000),
    "skewed": bytes(random.Random(4).choices(range(20), weights=range(1, 21), k=8000)),
    "long_repeat": b"0123456789" * 2000,
}


@pytest.mark.parametrize("codec", sorted(CODECS))
@pytest.mark.parametrize("name", sorted(SAMPLES))
def test_round_trip(codec, name):
    compress, decompress = CODECS[codec]
    data = SAMPLES[name]
    packed = compress(data)
    assert isinstance(packed, bytes)
    assert decompress(packed) == data


def test_bitio_round_trip():
    w = BitWriter()
    items = [(1, 1), (0, 3), (5, 3), (1023, 10), (0, 1), (123456, 17)]
    for value, width in items:
        w.write(value, width)
    r = BitReader(w.getvalue())
    assert [r.read(width) for _, width in items] == [v for v, _ in items]


def test_static_huffman_lengths_are_optimal_for_textbook_example():
    # Ví dụ CLRS: f=45,13,12,16,9,5 -> độ dài 1,3,3,3,4,4, tổng chi phí 224.
    freqs = [0] * 256
    for sym, f in zip(b"abcdef", [45, 13, 12, 16, 9, 5]):
        freqs[sym] = f
    lengths = code_lengths(freqs)
    assert sum(freqs[s] * lengths[s] for s in range(256)) == 224


def test_static_huffman_average_length_within_entropy_bound():
    data = SAMPLES["skewed"]
    freqs = [0] * 256
    for b in data:
        freqs[b] += 1
    lengths = code_lengths(freqs)
    n = len(data)
    avg = sum(freqs[s] * lengths[s] for s in range(256)) / n
    entropy = -sum(f / n * math.log2(f / n) for f in freqs if f)
    assert entropy <= avg < entropy + 1


def test_static_huffman_lengths_satisfy_kraft_equality():
    lengths = code_lengths([random.Random(5).randint(0, 50) for _ in range(256)])
    assert sum(2.0 ** -l for l in lengths if l) == pytest.approx(1.0)


@pytest.mark.parametrize("n", [2, 3, 17, 256, 1000])
def test_heap_naive_and_two_queue_builders_give_same_cost(n):
    rng = random.Random(n)
    freqs = [rng.randint(1, 1000) for _ in range(n)]
    costs = []
    for fn in (code_lengths, code_lengths_naive, code_lengths_two_queues):
        lengths = fn(freqs)
        costs.append(sum(f * l for f, l in zip(freqs, lengths)))
    assert costs[0] == costs[1] == costs[2]


def test_adaptive_huffman_tree_keeps_sibling_property():
    from iot_compression.adaptive_huffman import _Tree

    tree = _Tree()
    data = SAMPLES["skewed"][:2000] + SAMPLES["csv"]
    for i, b in enumerate(data):
        tree.update(b)
        if i % 97:
            continue
        nodes = [tree.node_at[o] for o in sorted(tree.node_at)]
        weights = [tree.weight[v] for v in nodes]
        assert weights == sorted(weights)  # trọng số không giảm theo số thứ tự
        for k in range(0, len(nodes) - 1, 2):  # hai nút liên tiếp (2j-1, 2j) là anh em
            assert tree.parent[nodes[k]] == tree.parent[nodes[k + 1]]
        for v in nodes:  # nút trong có trọng số bằng tổng hai con
            if tree.left[v] >= 0:
                assert tree.weight[v] == tree.weight[tree.left[v]] + tree.weight[tree.right[v]]


def test_adaptive_huffman_compresses_skewed_data():
    compress, _ = CODECS["adaptive_huffman"]
    data = SAMPLES["skewed"]
    assert len(compress(data)) < 0.7 * len(data)


def test_lz_codecs_exploit_long_repeats():
    for name in ("lz77", "lz78"):
        compress, _ = CODECS[name]
        assert len(compress(SAMPLES["long_repeat"])) < 0.3 * len(SAMPLES["long_repeat"])


def test_corrupted_stream_is_rejected():
    for name, (compress, decompress) in CODECS.items():
        with pytest.raises(ValueError):
            decompress(b"\x01")
