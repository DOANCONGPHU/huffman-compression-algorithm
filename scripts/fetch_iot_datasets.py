"""Tải các bộ dữ liệu cảm biến công khai dùng trong thực nghiệm vào data/iot/.

Do môi trường chạy không truy cập được trực tiếp archive.ics.uci.edu và
kaggle.com, các tệp được lấy từ bản sao công khai trên GitHub (kho của tác
giả bộ dữ liệu hoặc kho tổng hợp jbrownlee/Datasets). Mã băm SHA-256 của
từng tệp được in ra để người khác kiểm tra lại đúng phiên bản.
"""

from __future__ import annotations

import hashlib
import io
import sys
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data" / "iot"

JB = "https://raw.githubusercontent.com/jbrownlee/Datasets/master/"
LM = "https://raw.githubusercontent.com/LuisM78/"

# (tên tệp lưu, URL, nguồn gốc)
DATASETS = [
    ("occupancy_datatraining.txt", LM + "Occupancy-detection-data/master/datatraining.txt",
     "UCI Occupancy Detection (Candanedo & Feldheim, 2016)"),
    ("occupancy_datatest.txt", LM + "Occupancy-detection-data/master/datatest.txt",
     "UCI Occupancy Detection (Candanedo & Feldheim, 2016)"),
    ("occupancy_datatest2.txt", LM + "Occupancy-detection-data/master/datatest2.txt",
     "UCI Occupancy Detection (Candanedo & Feldheim, 2016)"),
    ("appliances_energy.csv", LM + "Appliances-energy-prediction-data/master/energydata_complete.csv",
     "UCI Appliances Energy Prediction (Candanedo et al., 2017)"),
    ("beijing_pollution.csv", JB + "pollution.csv",
     "UCI Beijing PM2.5 (Liang et al., 2015), bản đã làm sạch trong jbrownlee/Datasets"),
    ("household_power_30days.txt", JB + "household_power_consumption.zip",
     "UCI Individual Household Electric Power Consumption (Hébrail & Bérard), 30 ngày đầu"),
    ("daily_min_temperatures.csv", JB + "daily-min-temperatures.csv",
     "Kaggle: Daily minimum temperatures in Melbourne 1981–1990"),
    ("monthly_sunspots.csv", JB + "monthly-sunspots.csv",
     "Monthly sunspots (chuỗi dùng trong Nasif và cs., 2021)"),
    ("ionosphere.csv", JB + "ionosphere.csv", "UCI Ionosphere (Sigillito et al., 1989)"),
    ("daily_female_births.csv", JB + "daily-total-female-births.csv",
     "Daily total female births, California 1959 (dùng trong Nasif và cs., 2021)"),
    ("shampoo_sales.csv", JB + "shampoo.csv", "Sales of shampoo over a three year period (dùng trong Nasif và cs., 2021)"),
]

HOUSEHOLD_ROWS = 30 * 24 * 60  # 30 ngày, mỗi phút một dòng


def _download(url: str) -> bytes:
    with urllib.request.urlopen(url, timeout=120) as resp:
        return resp.read()


def _household_slice(zipped: bytes) -> bytes:
    with zipfile.ZipFile(io.BytesIO(zipped)) as zf:
        name = next(n for n in zf.namelist() if n.endswith(".txt"))
        with zf.open(name) as fh:
            lines = [fh.readline() for _ in range(HOUSEHOLD_ROWS + 1)]  # + dòng tiêu đề
    return b"".join(lines)


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    for name, url, source in DATASETS:
        path = DATA_DIR / name
        if not path.exists():
            raw = _download(url)
            if name.startswith("household_power"):
                raw = _household_slice(raw)
            path.write_bytes(raw)
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        print(f"{name}\t{path.stat().st_size}\t{digest}\t{source}", file=sys.stdout)


if __name__ == "__main__":
    main()
