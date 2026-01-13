from ultralytics import YOLO
from utils.file_finder import find_file
from config.settings import BASE_DIR, ENGINE_FILE_NAME, CONFIDENCE_THRESHOLD

class SOPDetector:
    def __init__(self):
        engine_path = find_file(BASE_DIR, ENGINE_FILE_NAME)
        print(f"✅ Loading YOLO engine: {engine_path}")
        self.model = YOLO(engine_path, task="detect")

    def detect(self, frame):
        return self.model(
            frame,
            conf=CONFIDENCE_THRESHOLD,
            imgsz=640,
            verbose=False
        )
