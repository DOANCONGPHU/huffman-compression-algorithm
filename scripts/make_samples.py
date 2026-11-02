"""Tạo ảnh mẫu tất định vào thư mục samples/."""

from __future__ import annotations

import random
from pathlib import Path

from PIL import Image, ImageDraw

SIZE = 512


def make_samples(out_dir) -> list[Path]:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    # Ảnh phẳng kiểu logo: nền trắng, vài hình khối, tối đa 5 màu.
    flat = Image.new("RGB", (SIZE, SIZE), (255, 255, 255))
    draw = ImageDraw.Draw(flat)
    draw.rectangle((40, 40, 260, 200), fill=(220, 40, 40))
    draw.rectangle((300, 80, 470, 450), fill=(30, 90, 200))
    draw.ellipse((80, 260, 280, 460), fill=(250, 190, 20))
    draw.rectangle((0, 490, SIZE, SIZE), fill=(20, 20, 20))

    # Dải xám chuyển dần theo đường chéo.
    gradient = Image.frombytes(
        "L", (SIZE, SIZE), bytes((x + y) // 4 for y in range(SIZE) for x in range(SIZE)))

    # Nhiễu ngẫu nhiên đều, seed cố định.
    rng = random.Random(42)
    noise = Image.frombytes("L", (SIZE, SIZE), bytes(rng.randrange(256) for _ in range(SIZE * SIZE)))

    paths = []
    for name, img in [("flat.png", flat), ("gradient.png", gradient), ("noise.png", noise)]:
        path = out / name
        img.save(path)
        paths.append(path)
    return paths


if __name__ == "__main__":
    for p in make_samples(Path(__file__).resolve().parents[1] / "samples"):
        print(p)
