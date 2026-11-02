"""Dòng lệnh: python -m huffman {compress, decompress, stats} ..."""

from __future__ import annotations

import argparse
import os
import sys
import time

from PIL import UnidentifiedImageError

from huffman.codec import compress_file, decompress_file, stats


def _parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="python -m huffman",
                                description="Nén ảnh không mất dữ liệu bằng Huffman")
    sub = p.add_subparsers(dest="command", required=True)
    c = sub.add_parser("compress", help="nén ảnh thành file .huf")
    c.add_argument("input")
    c.add_argument("output")
    c.add_argument("--delta", action="store_true", help="biến đổi delta trước khi nén")
    d = sub.add_parser("decompress", help="giải nén file .huf thành ảnh .png")
    d.add_argument("input")
    d.add_argument("output")
    s = sub.add_parser("stats", help="thống kê entropy và tỉ lệ nén của một ảnh")
    s.add_argument("input")
    return p


def _run(args: argparse.Namespace) -> None:
    if args.command == "stats":
        for key, value in stats(args.input).items():
            print(f"{key:24} {value:.4f}" if isinstance(value, float) else f"{key:24} {value}")
        return
    start = time.perf_counter()
    if args.command == "compress":
        compress_file(args.input, args.output, use_delta=args.delta)
    else:
        decompress_file(args.input, args.output)
    elapsed = time.perf_counter() - start
    before, after = os.path.getsize(args.input), os.path.getsize(args.output)
    print(f"{args.input} ({before} byte) -> {args.output} ({after} byte) trong {elapsed:.2f} giây")


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        _run(args)
    except (OSError, ValueError, UnidentifiedImageError) as e:
        print(f"Lỗi: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
