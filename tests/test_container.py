import pytest

from huffman.container import HEADER_SIZE, HufHeader, read_huf, write_huf


def _header():
    return HufHeader(use_delta=True, mode="RGB", width=3, height=2,
                     freqs=list(range(256)), bit_length=13)


def test_roundtrip(tmp_path):
    p = tmp_path / "a.huf"
    write_huf(p, _header(), b"\xab\xcd")
    assert read_huf(p) == (_header(), b"\xab\xcd")
    assert HEADER_SIZE == 1046 and p.stat().st_size == 1046 + 2


@pytest.mark.parametrize("corrupt", [
    lambda b: b"XXXX" + b[4:],                  # sai magic
    lambda b: b[:100],                          # file bị cắt
    lambda b: b[:5] + bytes([9]) + b[6:],       # mã chế độ màu không hợp lệ
    lambda b: b + b"\x00",                      # thừa payload
])
def test_corrupt_files_raise(tmp_path, corrupt):
    p = tmp_path / "a.huf"
    write_huf(p, _header(), b"\xab\xcd")
    p.write_bytes(corrupt(p.read_bytes()))
    with pytest.raises(ValueError):
        read_huf(p)
