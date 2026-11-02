import random

import pytest

from huffman.delta import delta_decode, delta_encode


def test_gray_example():
    data = bytes([10, 12, 15, 15, 200, 190, 190, 0])
    assert delta_encode(data, 4, 1) == bytes([10, 2, 3, 0, 200, 246, 0, 66])


def test_rgb_example():
    data = bytes([10, 20, 30, 15, 18, 40])
    assert delta_encode(data, 2, 3) == bytes([10, 20, 30, 5, 254, 10])


def test_roundtrip_random():
    data = random.Random(3).randbytes(7 * 3 * 5)
    assert delta_decode(delta_encode(data, 7, 3), 7, 3) == data


def test_width_one_is_identity():
    data = bytes([5, 9, 200, 0])
    assert delta_encode(data, 1, 1) == data
    assert delta_decode(data, 1, 1) == data


def test_bad_length():
    with pytest.raises(ValueError):
        delta_encode(bytes(5), 2, 1)
