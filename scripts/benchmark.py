"""In bảng số liệu cho báo cáo: tỉ lệ nén trên ảnh mẫu và thời gian theo kích thước ảnh."""

from __future__ import annotations

import random
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from PIL import Image  # noqa: E402

from huffman.codec import stats  # noqa: E402

IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".bmp"}


def sample_table(samples_dir) -> str:
    rows = [
        "| Ảnh | Chế độ | N (byte) | k | H (bit) | L̄ (bit) | Tỉ lệ nén | Tỉ lệ nén + delta |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for path in sorted(Path(samples_dir).iterdir()):
        if path.suffix.lower() not in IMAGE_SUFFIXES:
            continue
        s = stats(path)
        rows.append(
            f"| {path.name} | {s['mode']} | {s['raw_bytes']} | {s['distinct_symbols']} "
            f"| {s['entropy']:.3f} | {s['avg_code_length']:.3f} "
            f"| {s['ratio']:.3f} | {s['ratio_delta']:.3f} |")
    return "\n".join(rows)


def timing_table(sizes: list[int]) -> str:
    rows = [
        "| Cạnh | N (byte) | Nén (giây) | Giải nén (giây) | Nén (µs/byte) | Giải nén (µs/byte) |",
        "|---|---|---|---|---|---|",
    ]
    rng = random.Random(7)
    with tempfile.TemporaryDirectory() as tmp:
        for side in sizes:
            path = Path(tmp) / f"noise_{side}.png"
            data = bytes(rng.randrange(256) for _ in range(side * side))
            Image.frombytes("L", (side, side), data).save(path)
            s = stats(path)
            n = s["raw_bytes"]
            rows.append(
                f"| {side} | {n} | {s['encode_seconds']:.3f} | {s['decode_seconds']:.3f} "
                f"| {s['encode_seconds'] / n * 1e6:.3f} | {s['decode_seconds'] / n * 1e6:.3f} |")
    return "\n".join(rows)


if __name__ == "__main__":
    print("## Tỉ lệ nén trên ảnh mẫu\n")
    print(sample_table(ROOT / "samples"))
    print("\n## Thời gian theo kích thước ảnh (ảnh nhiễu xám)\n")
    print(timing_table([128, 256, 512, 1024]))
