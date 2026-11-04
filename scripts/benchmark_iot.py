"""Thực nghiệm cho báo cáo cuối kỳ: nén dữ liệu cảm biến IoT.

Ba thực nghiệm, kết quả ghi vào docs/ket-qua/iot_results.json:

1. Tỉ lệ nén và thời gian của Huffman tĩnh, Huffman thích nghi (FGK), LZ77,
   LZ78 trên từng tệp trong data/iot/ (chạy scripts/fetch_iot_datasets.py trước).
   Mỗi phép đo thời gian lặp REPEATS lần, lấy trung vị. Mỗi lần đều kiểm tra
   giải nén khớp từng byte với dữ liệu gốc. DEFLATE (zlib, viết bằng C) chỉ
   được ghi tỉ lệ nén để tham chiếu.
2. Thời gian dựng cây Huffman theo số ký hiệu n: heap O(n log n),
   hai hàng đợi (sắp xếp + O(n)) và quét tuyến tính O(n^2).
3. Nén theo từng gói nhỏ (mô phỏng nút IoT gửi gói độc lập): so sánh Huffman
   tĩnh (phải gửi kèm bảng mã) với Huffman thích nghi (không cần bảng mã).
"""

from __future__ import annotations

import hashlib
import json
import math
import platform
import random
import statistics
import sys
import time
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from iot_compression import CODECS  # noqa: E402
from iot_compression.static_huffman import (  # noqa: E402
    code_lengths, code_lengths_naive, code_lengths_two_queues)

DATA_DIR = ROOT / "data" / "iot"
OUT = ROOT / "docs" / "ket-qua" / "iot_results.json"
REPEATS = 3
SCALING_REPEATS = 7  # dựng cây rất nhanh nên lặp nhiều hơn để giảm nhiễu


def entropy_bits(data: bytes) -> float:
    """Entropy bậc 0 (bit/ký hiệu) theo tần suất byte."""
    n = len(data)
    freqs = [0] * 256
    for b in data:
        freqs[b] += 1
    return -sum(f / n * math.log2(f / n) for f in freqs if f)


def timed(fn, arg):
    t = time.perf_counter()
    out = fn(arg)
    return out, time.perf_counter() - t


def run_datasets() -> list[dict]:
    rows = []
    for path in sorted(DATA_DIR.iterdir()):
        data = path.read_bytes()
        n = len(data)
        row = {
            "file": path.name,
            "bytes": n,
            "sha256": hashlib.sha256(data).hexdigest(),
            "distinct_symbols": len(set(data)),
            "entropy_bits": entropy_bits(data),
            "deflate_bytes": len(zlib.compress(data, 9)),
            "codecs": {},
        }
        for name, (compress, decompress) in CODECS.items():
            enc_times, dec_times = [], []
            packed = b""
            for _ in range(REPEATS):
                packed, te = timed(compress, data)
                restored, td = timed(decompress, packed)
                if restored != data:
                    raise AssertionError(f"{name} giải nén sai trên {path.name}")
                enc_times.append(te)
                dec_times.append(td)
            row["codecs"][name] = {
                "bytes": len(packed),
                "ratio": len(packed) / n,
                "encode_s": statistics.median(enc_times),
                "decode_s": statistics.median(dec_times),
            }
            print(f"{path.name:30s} {name:17s} {len(packed) / n:6.3f} "
                  f"{statistics.median(enc_times):7.3f}s {statistics.median(dec_times):7.3f}s",
                  flush=True)
        rows.append(row)
    return rows


def run_tree_scaling() -> list[dict]:
    rng = random.Random(2026)
    rows = []
    for exp in range(8, 18):
        n = 1 << exp
        freqs = [rng.randint(1, 10**6) for _ in range(n)]
        row = {"n": n}
        builders = [("heap", code_lengths), ("two_queues", code_lengths_two_queues)]
        if n <= 1 << 13:
            builders.append(("naive", code_lengths_naive))
        costs = set()
        for name, fn in builders:
            times = []
            for _ in range(SCALING_REPEATS):
                lengths, t = timed(fn, freqs)
                times.append(t)
            costs.add(sum(f * l for f, l in zip(freqs, lengths)))
            row[name + "_s"] = statistics.median(times)
        if len(costs) != 1:
            raise AssertionError("các cách dựng cây cho chi phí khác nhau")
        row["cost"] = costs.pop()
        print(row, flush=True)
        rows.append(row)
    return rows


def run_packets(file_name: str = "occupancy_datatraining.txt") -> list[dict]:
    data = (DATA_DIR / file_name).read_bytes()
    rows = []
    for size in (64, 128, 256, 512, 1024, 2048, 4096, 16384):
        totals = {name: 0 for name in CODECS}
        packets = [data[i:i + size] for i in range(0, len(data), size)]
        for pkt in packets:
            for name, (compress, decompress) in CODECS.items():
                packed = compress(pkt)
                if decompress(packed) != pkt:
                    raise AssertionError(f"{name} sai ở gói {size}")
                totals[name] += len(packed)
        row = {"packet_bytes": size, "packets": len(packets),
               "ratio": {k: v / len(data) for k, v in totals.items()}}
        print(row, flush=True)
        rows.append(row)
    return rows


def main() -> None:
    if sys.argv[1:] == ["--scaling-only"]:
        results = json.loads(OUT.read_text())
        results["tree_scaling"] = run_tree_scaling()
        results["scaling_repeats"] = SCALING_REPEATS
        OUT.write_text(json.dumps(results, indent=2, ensure_ascii=False))
        print(f"Đã cập nhật {OUT}")
        return
    results = {
        "environment": {
            "python": platform.python_version(),
            "machine": platform.machine(),
            "processor": platform.processor(),
            "platform": platform.platform(),
        },
        "repeats": REPEATS,
        "scaling_repeats": SCALING_REPEATS,
        "datasets": run_datasets(),
        "tree_scaling": run_tree_scaling(),
        "packets": run_packets(),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(results, indent=2, ensure_ascii=False))
    print(f"Đã ghi {OUT}")


if __name__ == "__main__":
    main()
