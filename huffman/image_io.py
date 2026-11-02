"""Đọc/ghi ảnh bằng Pillow. Pillow chỉ dùng để lấy và ghi dãy byte pixel thô."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

CHANNELS = {"L": 1, "RGB": 3, "RGBA": 4}
# Các chế độ chuyển sang RGBA mà không mất thông tin.
_LOSSLESS_TO_RGBA = {"P", "PA", "LA", "1"}


def load_image(path) -> tuple[str, int, int, bytes]:
    """Trả về (mode, width, height, pixels). Các kênh xen kẽ: R, G, B, R, G, B, ..."""
    with Image.open(path) as img:
        if getattr(img, "n_frames", 1) > 1:
            raise ValueError("Ảnh nhiều khung hình (ảnh động) chưa được hỗ trợ")
        if any(";16" in str(tile.args) for tile in img.tile):
            raise ValueError("Ảnh 16 bit/kênh chưa được hỗ trợ")
        if img.mode in _LOSSLESS_TO_RGBA:
            img = img.convert("RGBA")
        elif img.mode not in CHANNELS:
            raise ValueError(f"Chế độ ảnh {img.mode} chưa được hỗ trợ")
        return img.mode, img.width, img.height, img.tobytes()


def save_image(path, mode: str, width: int, height: int, pixels: bytes) -> None:
    """Ghi ảnh ra file .png (PNG không mất dữ liệu)."""
    if Path(path).suffix.lower() != ".png":
        raise ValueError("Chỉ ghi ra file .png để ảnh giữ nguyên từng pixel")
    Image.frombytes(mode, (width, height), pixels).save(path)
