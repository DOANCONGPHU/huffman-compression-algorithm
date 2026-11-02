"""Ghép các phần: đọc ảnh -> (delta) -> Huffman -> file .huf, và chiều ngược lại."""

from __future__ import annotations

import math
import os
import time

from huffman.container import HEADER_SIZE, HufHeader, read_huf, write_huf
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


def _entropy(freqs: list[int], n: int) -> float:
    """Entropy Shannon H = -Σ p·log2(p), tính trên các tần suất khác 0 (bit/symbol)."""
    if n == 0:
        return 0.0
    return -sum(f / n * math.log2(f / n) for f in freqs if f)


def _describe(freqs: list[int], codes: dict[int, str], bit_length: int) -> tuple[float, float, int]:
    """Trả về (entropy, độ dài mã trung bình, kích thước file .huf)."""
    n = sum(freqs)
    avg = sum(f * len(codes[s]) for s, f in enumerate(freqs) if f) / n if n else 0.0
    return _entropy(freqs, n), avg, HEADER_SIZE + (bit_length + 7) // 8


def stats(input_path) -> dict:
    """Thống kê nén cho một ảnh, có và không có delta."""
    mode, width, height, pixels = load_image(input_path)
    n = len(pixels)
    delta = delta_encode(pixels, width, CHANNELS[mode])

    t0 = time.perf_counter()
    freqs, codes, payload, bit_length = _huffman_encode(pixels)
    t1 = time.perf_counter()
    decode(payload, bit_length, build_tree(freqs))
    t2 = time.perf_counter()

    entropy, avg, huf = _describe(freqs, codes, bit_length)
    freqs_d, codes_d, _, bit_length_d = _huffman_encode(delta)
    entropy_d, avg_d, huf_d = _describe(freqs_d, codes_d, bit_length_d)
    return {
        "mode": mode,
        "width": width,
        "height": height,
        "raw_bytes": n,
        "file_bytes": os.path.getsize(input_path),
        "distinct_symbols": sum(1 for f in freqs if f),
        "entropy": entropy,
        "avg_code_length": avg,
        "huf_bytes": huf,
        "ratio": huf / n if n else 0.0,
        "entropy_delta": entropy_d,
        "avg_code_length_delta": avg_d,
        "huf_bytes_delta": huf_d,
        "ratio_delta": huf_d / n if n else 0.0,
        "encode_seconds": t1 - t0,
        "decode_seconds": t2 - t1,
    }
