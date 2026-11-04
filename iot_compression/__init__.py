"""Các bộ nén không mất dữ liệu dùng trong thực nghiệm dữ liệu cảm biến IoT.

Tất cả đều được tự cài đặt bằng Python thuần để so sánh công bằng về thời gian.
"""

from . import adaptive_huffman, lz77, lz78, static_huffman

CODECS = {
    "static_huffman": (static_huffman.compress, static_huffman.decompress),
    "adaptive_huffman": (adaptive_huffman.compress, adaptive_huffman.decompress),
    "lz77": (lz77.compress, lz77.decompress),
    "lz78": (lz78.compress, lz78.decompress),
}
