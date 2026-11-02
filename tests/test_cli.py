from PIL import Image

from huffman.__main__ import main


def test_compress_decompress_stats(tmp_path, capsys):
    src = tmp_path / "a.png"
    Image.new("L", (16, 16), 7).save(src)
    assert main(["compress", str(src), str(tmp_path / "a.huf"), "--delta"]) == 0
    assert main(["decompress", str(tmp_path / "a.huf"), str(tmp_path / "b.png")]) == 0
    assert Image.open(tmp_path / "b.png").tobytes() == bytes([7]) * 256
    assert main(["stats", str(src)]) == 0
    assert "entropy" in capsys.readouterr().out


def test_missing_input(tmp_path, capsys):
    assert main(["compress", str(tmp_path / "nope.png"), str(tmp_path / "x.huf")]) == 1
    err = capsys.readouterr().err
    assert err.strip() and "Traceback" not in err


def test_not_an_image(tmp_path, capsys):
    p = tmp_path / "a.png"
    p.write_text("không phải ảnh")
    assert main(["compress", str(p), str(tmp_path / "x.huf")]) == 1
    assert "Traceback" not in capsys.readouterr().err
