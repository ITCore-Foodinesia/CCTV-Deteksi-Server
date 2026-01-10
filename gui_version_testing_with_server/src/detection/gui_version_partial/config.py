import argparse
import json
import os
from pathlib import Path

def parse_arguments():
    """
    Parses command line arguments, similar to main_v2.py.
    """
    parser = argparse.ArgumentParser(description="Icetube CCTV Refactored (Multiprocessing)")
    
    # RTSP / Input
    parser.add_argument("--source", type=str, default="rtsp://foodinesia:tenggarong1@192.168.10.17:554/stream1", help="RTSP URL or Webcam Index")
    
    # Model
    parser.add_argument("--model", type=str, default="bestbaru.engine", help="Path to YOLO/TensorRT model")
    parser.add_argument("--imgsz", type=int, default=320, help="Inference size")
    parser.add_argument("--conf", type=float, default=0.25, help="Confidence threshold")
    parser.add_argument("--iou", type=float, default=0.35, help="IoU threshold")
    
    # Google Sheets
    parser.add_argument("--creds", type=str, default="credentials.json", help="Path to Google Service Account JSON")
    parser.add_argument("--sheet_id", type=str, required=False, help="Google Sheet ID")
    parser.add_argument("--worksheet", type=str, default="FIX", help="Worksheet Name")
    
    # Telegram
    parser.add_argument("--notify_token", type=str, required=False, help="Telegram Token for Notifications")
    parser.add_argument("--notify_chat_id", type=str, required=False, help="Telegram Chat ID for Notifications")
    parser.add_argument("--system_token", type=str, required=False, help="Telegram Token for System Alerts")
    parser.add_argument("--system_chat_id", type=str, required=False, help="Telegram Chat ID for System Alerts")
    
    # State
    parser.add_argument("--plate", type=str, default="UNKNOWN", help="Initial Plate Number")
    
    # Advanced
    parser.add_argument("--half", action="store_true", help="Use FP16 for PyTorch (TensorRT usually handles this internally)")
    parser.add_argument("--min_area", type=float, default=0.001, help="Min bbox area prop to count")
    parser.add_argument("--width", type=int, default=1280, help="Display window width")
    parser.add_argument("--height", type=int, default=740, help="Display window height")
    parser.add_argument("--v4", action="store_true", help="Enable V4 Persistence Logic (3s wait)")

    return parser.parse_args()

def load_config():
    """
    Loads config from args and potentially merges with a json file if needed.
    For now, simply wraps argparse.
    """
    args = parse_arguments()
    
    # Validation / Default Path Fixes
    if not os.path.isabs(args.model) and os.path.exists(args.model):
        args.model = os.path.abspath(args.model)
        
    if not os.path.isabs(args.creds) and os.path.exists(args.creds):
        args.creds = os.path.abspath(args.creds)
        
    return args
