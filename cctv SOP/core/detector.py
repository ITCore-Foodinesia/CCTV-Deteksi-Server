from ultralytics import YOLO
from utils.file_finder import find_file
from config.settings import BASE_DIR, ENGINE_FILE_NAME, CONFIDENCE_THRESHOLD

class SOPDetector:
    def __init__(self):
        engine_path = find_file(BASE_DIR, ENGINE_FILE_NAME)
        print(f"✅ Loading YOLO engine: {engine_path}")
        self.model = YOLO(engine_path, task="detect")

    def track(self, frame):
        return self.model.track(
            frame,
            conf=CONFIDENCE_THRESHOLD,
            iou=0.5,              # IoU threshold untuk NMS
            persist=True,         # Track ID persist antar frame
            tracker="botsort.yaml",  # BoT-SORT tracker lebih stabil
            verbose=False
        )
