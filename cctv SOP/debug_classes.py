from ultralytics import YOLO
import os

model_path = r"d:\CCTV-Deteksi-Server\cctv SOP\models\best.engine"
if not os.path.exists(model_path):
    print("Model not found")
else:
    # Task='detect' is important for loading engine files
    model = YOLO(model_path, task='detect')
    print("Classes:", model.names)
