import multiprocessing
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
import datetime

# === EVENT TYPES ===
# Data structures sent between processes via Queues

@dataclass
class DetectionPayload:
    """Payload sent from Detector to Uploader when counts change"""
    timestamp: float
    plate: str
    loading: int
    rehab: int
    total: int
    kloter: str
    
    # Optional debugging info (won't be uploaded, just for logs)
    fps: float = 0.0

@dataclass
class QREvent:
    """Payload sent from Scanner to Detector/Uploader"""
    timestamp: float
    qr_data: str
    # Type of QR event if needed (e.g., "SCAN", "ERROR")
    event_type: str = "SCAN"

@dataclass
class ControlEvent:
    """Control commands sent from Main to Workers"""
    command: str  # e.g., "STOP", "RESET", "UPDATE_CONFIG"
    payload: Optional[Dict[str, Any]] = None

# === SHARED CONSTANTS ===
QUEUE_SIZE = 100  # Size for multiprocessing queues

# Process Names for Logging
PROC_MAIN = "Main"
PROC_DETECTOR = "Detector"
PROC_UPLOADER = "Uploader"
PROC_SCANNER = "Scanner"
