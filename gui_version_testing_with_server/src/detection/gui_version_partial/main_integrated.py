"""
Integrated Main Entry Point for CCTV Detection with Dual Database Support

This script runs the detection engine with:
1. Google Sheets integration (existing)
2. Supabase integration (new - for Flutter app)
3. QR Code scanning (existing)
4. Flutter app session listening (new)

Validation Methods:
- QR Scan: Operator scans plate QR code → starts counting
- Flutter App: Operator taps "Start Loading" in app → Supabase triggers counting

Both methods work simultaneously. Counts are written to BOTH databases.

Usage:
    python main_integrated.py --source rtsp://... --enable_supabase
    
    # With explicit Supabase credentials
    python main_integrated.py --source rtsp://... \
        --supabase_url https://xxx.supabase.co \
        --supabase_key your-service-role-key
    
    # Sheets only (no Supabase)
    python main_integrated.py --source rtsp://... --no_supabase

Environment Variables (alternative to CLI args):
    SUPABASE_URL=https://xxx.supabase.co
    SUPABASE_SERVICE_ROLE_KEY=your-key

ELI5: This is like a restaurant kitchen that can receive orders from both
the waiter (QR scan) AND the phone app (Flutter). It cooks the food (counts items)
and sends the receipt to both the old cash register (Sheets) and the new iPad (Supabase).
"""

import os
import sys
import time
import queue
import signal
import threading
import logging
from typing import Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(name)s] %(levelname)s: %(message)s'
)
logger = logging.getLogger('IntegratedMain')

# --- INTERNAL SERVER SETUP (Port 5002) ---
from flask import Flask, Response, jsonify
import cv2
import numpy as np

app = Flask(__name__)
# Disable Flask default logging
import logging as py_logging
py_logging.getLogger('werkzeug').setLevel(py_logging.ERROR)

current_shared_frame = None
current_shared_stats = {}
frame_lock = threading.Lock()

def update_shared_data(frame, stats):
    """Callback to receive frames from detector."""
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
            
            try:
                # Encode to JPEG
                ret, buffer = cv2.imencode('.jpg', current_shared_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 65])
                if not ret:
                    continue
                frame_bytes = buffer.tobytes()
            except Exception:
                continue

        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        time.sleep(0.05) # Cap at ~20 FPS

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/stats')
def stats_feed():
    with frame_lock:
        return jsonify(current_shared_stats)

def run_internal_server():
    """Start internal Flask server."""
    logger.info("Starting Internal Video Feed on Port 5002...")
    app.run(host='0.0.0.0', port=5002, debug=False, use_reloader=False, threaded=True)

# Add parent paths for imports
from pathlib import Path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Local imports
from .config import load_config
from .shared import DetectionPayload, ControlEvent, PROC_MAIN
from .session_manager import SessionManager, init_session_manager
from .dual_uploader import DualUploaderThread


def run_integrated():
    """
    Main entry point that runs:
    1. Session Manager (listens to Supabase + handles QR)
    2. Dual Uploader (writes to Sheets + Supabase)
    3. Detector (counts items)
    """
    print("=" * 60)
    print("CCTV Detection Engine - Integrated Mode")
    print("Dual Database: Google Sheets + Supabase")
    print("Dual Validation: QR Scan + Flutter App")
    print("=" * 60)
    
    # 1. Load Config
    config = load_config()
    
    # Determine if Supabase is enabled
    # FIX: Rely on no_supabase flag primarily. enable_supabase arg might be misleading depending on default behavior.
    # We want Supabase ENABLED by default unless explicitly disabled.
    enable_supabase = not config.no_supabase
    
    supabase_url = config.supabase_url
    supabase_key = config.supabase_key
    
    # Validation: If enabled but no creds, disable it
    if enable_supabase and (not supabase_url or not supabase_key):
        print("WARNING: Supabase enabled but missing URL/Key. Disabling integration.")
        enable_supabase = False
    
    print(f"\n[Config]")
    print(f"  Source: {config.source}")
    print(f"  Model: {config.model}")
    print(f"  Sheets: {config.worksheet} ({config.sheet_id[:20]}...)")
    print(f"  Supabase: {'Enabled' if enable_supabase else 'Disabled'}")
    if enable_supabase and supabase_url:
        print(f"  Supabase URL: {supabase_url[:30]}...")
    print()
    
    # 2. Create Upload Queue
    upload_queue = queue.Queue()
    
    # 3. Initialize Session Manager
    def on_session_change(session):
        """Callback when session starts/stops from any source."""
        if session:
            logger.info(f"Session active: {session.plate_number} (source: {session.source})")
            # If session started from Supabase (Flutter), notify uploader
            if session.source == "supabase":
                upload_queue.put(DetectionPayload(
                    timestamp=session.started_at,
                    plate=session.plate_number,
                    loading=session.loading_count,
                    rehab=session.rehab_count,
                    total=session.loading_count - session.rehab_count,
                    kloter="QR_START"  # Reuse existing event type
                ))
        else:
            logger.info("Session ended")
    
    session_manager = init_session_manager(
        on_session_change=on_session_change,
        supabase_url=supabase_url if enable_supabase else None,
        supabase_key=supabase_key if enable_supabase else None,
        enable_supabase=enable_supabase
    )
    
    # 4. Start Dual Uploader
    uploader = DualUploaderThread(
        config=config,
        input_queue=upload_queue,
        supabase_url=supabase_url if enable_supabase else None,
        supabase_key=supabase_key if enable_supabase else None,
        session_manager=session_manager
    )
    uploader.start()
    
    # 5. Start Session Manager (Supabase listener)
    session_manager.start()

    # 6. Start Internal Video Server (Thread)
    server_thread = threading.Thread(target=run_internal_server, daemon=True)
    server_thread.start()
    
    # 7. Run Detector with integration hooks
    # Import here to avoid circular imports
    from .detector_integrated import run_detector_integrated
    
    try:
        run_detector_integrated(
            config=config,
            upload_queue=upload_queue,
            session_manager=session_manager,
            callback_update=update_shared_data  # Pass the callback
        )
    except KeyboardInterrupt:
        logger.info("Keyboard interrupt received")
    except Exception as e:
        logger.error(f"Detector error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Cleanup
        logger.info("Shutting down...")
        session_manager.stop()
        upload_queue.put(ControlEvent(command="STOP"))
        uploader.join(timeout=5)
        logger.info("Shutdown complete")


def run_detector_with_session_manager():
    """
    Alternative: Run existing detector with session manager hooks.
    This modifies the existing detector.py behavior minimally.
    """
    from .config import load_config
    from .detector import run_detector_threaded
    
    config = load_config()
    enable_supabase = config.enable_supabase and not config.no_supabase
    
    # Initialize session manager
    session_manager = init_session_manager(
        supabase_url=config.supabase_url if enable_supabase else None,
        supabase_key=config.supabase_key if enable_supabase else None,
        enable_supabase=enable_supabase
    )
    session_manager.start()
    
    try:
        # Run existing detector
        run_detector_threaded(config)
    finally:
        session_manager.stop()


if __name__ == '__main__':
    run_integrated()
