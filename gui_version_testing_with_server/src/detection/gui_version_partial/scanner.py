import time
import cv2
import queue
import traceback
from multiprocessing import Queue

from .shared import QREvent, ControlEvent, PROC_SCANNER

def run_scanner(config, frame_queue: Queue, result_queue: Queue):
    """
    Main loop for QR Scanner Process.
    Receives frames from detector, scans them, and sends results back.
    
    Args:
        config: Config object
        frame_queue: Queue receiving numpy arrays (frames)
        result_queue: Queue to send QREvent
    """
    print(f"[{PROC_SCANNER}] Process Started")
    
    # Initialize detector (OpenCV's standard or WeChatQRCode if needed)
    # Using standard QRCodeDetector for simplicity initially
    detector = cv2.QRCodeDetector()
    
    while True:
        try:
            # Non-blocking get with small timeout to check for exit signals (if any)
            try:
                # We grab the LATEST frame only. If queue has pile up, we might skip some?
                # Actually for QR, we definitely want the latest.
                # Logic: Get a frame, if empty wait.
                frame = frame_queue.get(timeout=1.0)
            except queue.Empty:
                continue
            
            # --- SCAN LOGIC ---
            if frame is None:
                continue
                
            # Gray scale for speed
            if len(frame.shape) == 3:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            else:
                gray = frame
                
            data, bbox, _ = detector.detectAndDecode(gray)
            
            if data:
                print(f"[{PROC_SCANNER}] QR FOUND: {data}")
                event = QREvent(
                    timestamp=time.time(),
                    qr_data=data,
                    event_type="SCAN"
                )
                result_queue.put(event)
                
                # Cooldown logic to prevent spamming the same QR
                # Can be handled here or in Main/Detector. 
                # For now just sleep a bit to let other processes breathe
                time.sleep(1) 
                
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"[{PROC_SCANNER}] Error: {e}")
            traceback.print_exc()
            time.sleep(0.1)

    print(f"[{PROC_SCANNER}] Process Stopped")
