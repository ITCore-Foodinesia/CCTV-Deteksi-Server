import os

# Root folder project (CCTV SOP)
BASE_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..")
)

ENGINE_FILE_NAME = "best.engine"

CONFIDENCE_THRESHOLD = 0.25
STABLE_TIME = 3  # detik

REQUIRED_SOP = {
    "Masker-SOP"
}
