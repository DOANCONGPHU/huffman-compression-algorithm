"""Vẽ biểu đồ cho báo cáo từ docs/ket-qua/iot_results.json."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
RESULTS = ROOT / "docs" / "ket-qua" / "iot_results.json"
FIG_DIR = ROOT / "docs" / "ket-qua"

# Bảng màu phân loại (thứ tự cố định) đã kiểm tra khả năng phân biệt với người mù màu.
COLORS = {
    "static_huffman": "#2a78d6",
    "adaptive_huffman": "#eb6834",
    "lz77": "#1baf7a",
    "lz78": "#eda100",
}
HATCH = {"static_huffman": "", "adaptive_huffman": "////", "lz77": "", "lz78": "\\\\\\\\"}
LABELS = {
    "static_huffman": "Huffman tĩnh",
    "adaptive_huffman": "Huffman thích nghi (FGK)",
    "lz77": "LZ77",
    "lz78": "LZ78",
}
INK = "#0b0b0b"
INK2 = "#52514e"
GRID = "#e4e3df"

plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "font.size": 9,
    "axes.edgecolor": INK2,
    "axes.labelcolor": INK,
    "xtick.color": INK2,
    "ytick.color": INK2,
    "axes.spines.top": False,
    "axes.spines.right": False,
    "legend.frameon": False,
})


def ratio_chart(res: dict) -> None:
    rows = res["datasets"]
    names = [r["file"].rsplit(".", 1)[0] for r in rows]
    fig, ax = plt.subplots(figsize=(7.2, 6.4))
    k = len(COLORS)
    bar_h = 0.8 / k
    for j, codec in enumerate(COLORS):
        ys = [i + (j - (k - 1) / 2) * bar_h for i in range(len(rows))]
        vals = [r["codecs"][codec]["ratio"] * 100 for r in rows]
        ax.barh(ys, vals, height=bar_h * 0.85, color=COLORS[codec], hatch=HATCH[codec],
                edgecolor="white", linewidth=0.6, label=LABELS[codec])
    ax.axvline(100, color=INK2, linewidth=1, linestyle="--")
    ax.text(101, len(rows) - 0.4, "100 % (không nén được)", color=INK2, fontsize=8, va="bottom")
    ax.set_yticks(range(len(rows)), names)
    ax.invert_yaxis()
    ax.set_xlabel("Tỉ lệ nén = kích thước sau nén / kích thước gốc (%) — càng nhỏ càng tốt")
    ax.grid(axis="x", color=GRID, linewidth=0.8)
    ax.set_axisbelow(True)
    ax.legend(loc="upper center", bbox_to_anchor=(0.45, 1.07), ncol=4, fontsize=8)
    fig.tight_layout()
    fig.savefig(FIG_DIR / "hinh_ti_le_nen.png", dpi=200)
    plt.close(fig)


def scaling_chart(res: dict) -> None:
    rows = res["tree_scaling"]
    fig, ax = plt.subplots(figsize=(6.4, 3.8))
    series = [("heap", "Heap nhị phân — O(n log n)", "#2a78d6", "o"),
              ("two_queues", "Sắp xếp + hai hàng đợi — O(n log n)", "#eb6834", "s"),
              ("naive", "Quét tuyến tính tìm min — O(n²)", "#1baf7a", "^")]
    for key, label, color, marker in series:
        pts = [(r["n"], r[key + "_s"]) for r in rows if key + "_s" in r]
        ax.plot([p[0] for p in pts], [p[1] * 1000 for p in pts], color=color, linewidth=2,
                marker=marker, markersize=6, label=label)
    ax.set_xscale("log", base=2)
    ax.set_yscale("log")
    ax.set_xlabel("Số ký hiệu phân biệt n")
    ax.set_ylabel("Thời gian dựng cây (ms, thang log)")
    ax.grid(color=GRID, linewidth=0.8, which="major")
    ax.legend(fontsize=8)
    fig.tight_layout()
    fig.savefig(FIG_DIR / "hinh_do_phuc_tap.png", dpi=200)
    plt.close(fig)


def packet_chart(res: dict) -> None:
    rows = res["packets"]
    fig, ax = plt.subplots(figsize=(6.4, 3.8))
    markers = {"static_huffman": "o", "adaptive_huffman": "s", "lz77": "^", "lz78": "D"}
    xs = [r["packet_bytes"] for r in rows]
    for codec in COLORS:
        ax.plot(xs, [r["ratio"][codec] * 100 for r in rows], color=COLORS[codec], linewidth=2,
                marker=markers[codec], markersize=6, label=LABELS[codec])
    ax.axhline(100, color=INK2, linewidth=1, linestyle="--")
    ax.set_xscale("log", base=2)
    ax.set_xticks(xs, [str(x) for x in xs])
    ax.set_xlabel("Kích thước gói (byte), mỗi gói được nén độc lập")
    ax.set_ylabel("Tỉ lệ nén (%)")
    ax.grid(color=GRID, linewidth=0.8)
    ax.legend(fontsize=8)
    fig.tight_layout()
    fig.savefig(FIG_DIR / "hinh_goi_tin.png", dpi=200)
    plt.close(fig)


def main() -> None:
    res = json.loads(RESULTS.read_text())
    ratio_chart(res)
    scaling_chart(res)
    packet_chart(res)
    print("Đã vẽ:", *sorted(p.name for p in FIG_DIR.glob("hinh_*.png")), file=sys.stdout)


if __name__ == "__main__":
    main()
