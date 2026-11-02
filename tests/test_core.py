import random

from huffman.core import build_codes, build_tree, count_frequencies


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
    data = bytes(random.Random(2).randrange(256) for _ in range(3000))
    f = count_frequencies(data)
    assert build_codes(build_tree(f)) == build_codes(build_tree(f))
