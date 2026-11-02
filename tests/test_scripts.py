import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from benchmark import sample_table, timing_table  # noqa: E402
from make_samples import make_samples  # noqa: E402


def test_make_samples(tmp_path):
    make_samples(tmp_path)
    expected = {"flat.png": "RGB", "gradient.png": "L", "noise.png": "L"}
    for name, mode in expected.items():
        img = Image.open(tmp_path / name)
        assert (img.mode, img.size) == (mode, (512, 512))


def test_tables(tmp_path):
    make_samples(tmp_path)
    t = sample_table(tmp_path)
    assert t.startswith("|") and "noise.png" in t
    assert "| 64 |" in timing_table([64])   # cột đầu là cạnh ảnh, số nguyên
