import numpy as np
from core.detector import SOPDetector

if __name__ == "__main__":
    detector = SOPDetector()

    # dummy image (hitam)
    dummy_frame = np.zeros((640, 640, 3), dtype=np.uint8)

    results = detector.detect(dummy_frame)
    print("✅ YOLO ENGINE BERHASIL DI-LOAD & INFERENCE")
