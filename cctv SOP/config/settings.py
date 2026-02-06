import os

# Root folder project (CCTV SOP)
BASE_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..")
)
MODELS_DIR = os.path.join(BASE_DIR, "models")

ENGINE_FILE_NAME = "best.engine"

CONFIDENCE_THRESHOLD = 0.40  # kept somewhat low for testing
IOU_THRESHOLD = 0.5           # untuk filter overlapping
MIN_BOX_AREA = 2500           # minimum area bbox (50x50 pixel)
STABLE_TIME = 3               # detik

REQUIRED_SOP = {
    "Masker-SOP"
}
