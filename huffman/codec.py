"""Ghép các phần: đọc ảnh -> (delta) -> Huffman -> file .huf, và chiều ngược lại."""

from __future__ import annotations

from huffman.container import HufHeader, read_huf, write_huf
from huffman.core import build_codes, build_tree, count_frequencies, decode, encode
from huffman.delta import delta_decode, delta_encode
from huffman.image_io import CHANNELS, load_image, save_image


def _huffman_encode(data: bytes) -> tuple[list[int], dict[int, str], bytes, int]:
    """Đếm tần suất, dựng cây, sinh mã, mã hóa. Trả về (freqs, codes, payload, bit_length)."""
    freqs = count_frequencies(data)
    codes = build_codes(build_tree(freqs))
    payload, bit_length = encode(data, codes)
    return freqs, codes, payload, bit_length


def compress_file(input_path, output_path, use_delta: bool = False) -> None:
    mode, width, height, pixels = load_image(input_path)
    data = delta_encode(pixels, width, CHANNELS[mode]) if use_delta else pixels
    freqs, _, payload, bit_length = _huffman_encode(data)
    write_huf(output_path, HufHeader(use_delta, mode, width, height, freqs, bit_length), payload)


def decompress_file(input_path, output_path) -> None:
    header, payload = read_huf(input_path)
    channels = CHANNELS[header.mode]
    if sum(header.freqs) != header.width * header.height * channels:
        raise ValueError("File .huf không hợp lệ")
    data = decode(payload, header.bit_length, build_tree(header.freqs))
    if len(data) != header.width * header.height * channels:
        raise ValueError("File .huf không hợp lệ")
    if header.use_delta:
        data = delta_decode(data, header.width, channels)
    save_image(output_path, header.mode, header.width, header.height, data)
