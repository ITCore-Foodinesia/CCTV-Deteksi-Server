import sys
import threading
import time
import cv2
import numpy as np
from flask import Flask, Response, jsonify
from .config import load_config
from .detector import run_detector_threaded

# --- INTERNAL SERVER STATE (PORT 5002) ---
app = Flask(__name__)
current_shared_frame = None
current_shared_stats = {}
frame_lock = threading.Lock()

def update_shared_data(frame, stats):
    """Callback passed to detector to update shared state."""
    global current_shared_frame, current_shared_stats
    with frame_lock:
        if frame is not None:
            current_shared_frame = frame.copy()
        if stats:
            current_shared_stats = stats

def generate_frames():
    """Generator for video feed."""
    while True:
        with frame_lock:
            if current_shared_frame is None:
                time.sleep(0.05)
                continue
            
            # Encode to JPEG
            try:
                ret, buffer = cv2.imencode('.jpg', current_shared_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 65])
                if not ret:
                    continue
                frame_bytes = buffer.tobytes()
            except Exception:
                continue

        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        time.sleep(0.05) # Cap at ~20 FPS for internal relay

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/stats')
def stats_feed():
    with frame_lock:
        return jsonify(current_shared_stats)

def run_internal_server():
    """Runs the internal Flask server on port 5002."""
    print("[INTERNAL] Starting Internal Feed on Port 5002...")
    # Disable default Flask logging to correct stdout
    import logging
    log = logging.getLogger('werkzeug')
    log.setLevel(logging.ERROR)
    app.run(host='0.0.0.0', port=5002, debug=False, use_reloader=False, threaded=True)

def main():
    try:
        config = load_config()
    except Exception as e:
        print(f"Error loading config: {e}")
        return

    print("="*40)
    print("   ICETUBE CCTV - THREADED MODULAR V3   ")
    print("   Starting Internal Relay (5002) -> API Proxy (5001)   ")
    print("="*40)
    
    # 1. Start Internal Server Thread
    server_thread = threading.Thread(target=run_internal_server, daemon=True)
    server_thread.start()

    # 2. Start Detector (Main Thread)
    # Pass the callback so detector can send us frames!
    try:
        run_detector_threaded(config, callback_update=update_shared_data)
    except Exception as e:
        print(f"FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        input("Press Enter to Exit...")


if __name__ == "__main__":
    main()
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    