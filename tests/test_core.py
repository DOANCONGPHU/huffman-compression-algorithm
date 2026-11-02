import random

from huffman.core import build_codes, build_tree, count_frequencies, decode, encode


def test_count_frequencies():
    f = count_frequencies(b"AAAABBCD")
    assert len(f) == 256
    assert (f[65], f[66], f[67], f[68]) == (4, 2, 1, 1)
    assert sum(f) == 8


def test_example_code_lengths():
    codes = build_codes(build_tree(count_frequencies(b"AAAABBCD")))
    assert {chr(s): len(c) for s, c in codes.items()} == {"A": 1, "B": 2, "C": 3, "D": 3}


def test_codes_are_prefix_free():
    rng = random.Random(1)
    data = bytes(rng.choice(range(40)) for _ in range(5000))
    codes = list(build_codes(build_tree(count_frequencies(data))).values())
    for a in codes:
        for b in codes:
            assert a == b or not b.startswith(a)


def test_single_symbol():
    assert build_codes(build_tree(count_frequencies(b"\x07" * 10))) == {7: "0"}


def test_empty():
    assert build_tree([0] * 256) is None
    assert build_codes(None) == {}


def test_tree_is_deterministic():
    data = random.Random(2).randbytes(3000)
    f = count_frequencies(data)
    assert build_codes(build_tree(f)) == build_codes(build_tree(f))


def _roundtrip(data):
    root = build_tree(count_frequencies(data))
    payload, n = encode(data, build_codes(root))
    return payload, n, decode(payload, n, root)


def test_example_bit_length():
    payload, n, out = _roundtrip(b"AAAABBCD")
    assert n == 14 and len(payload) == 2 and out == b"AAAABBCD"


def test_roundtrip_random():
    data = random.Random(0).randbytes(10_000)
    assert _roundtrip(data)[2] == data


def test_encode_single_symbol():
    payload, n, out = _roundtrip(b"\x07" * 10)
    assert (payload, n, out) == (b"\x00\x00", 10, b"\x07" * 10)


def test_encode_empty():
    assert encode(b"", {}) == (b"", 0)
    assert decode(b"", 0, None) == b""


def test_decode_memory_is_small():
    import tracemalloc

    data = random.Random(5).randbytes(300_000)
    root = build_tree(count_frequencies(data))
    payload, n = encode(data, build_codes(root))
    tracemalloc.start()
    out = decode(payload, n, root)
    peak = tracemalloc.get_traced_memory()[1]
    tracemalloc.stop()
    assert out == data
    assert peak < 16 * len(payload)
