"""
Mock Main V3 - Simple CCTV Stream Without Detection

This is a lightweight test server that:
- Captures from RTSP/camera source
- Streams MJPEG on port 5002 (like Main V3)
- NO YOLO detection, NO bounding boxes
- Optional Google Sheets integration for testing
- For testing Cloudflare Tunnel connectivity

Features TUI dashboard (--tui flag) for monitoring.

Usage:
    python -m src.testing.mock_main_v3 --source "rtsp://..."
    python -m src.testing.mock_main_v3 --source 0  # Webcam
    python -m src.testing.mock_main_v3 --source 0 --tui  # With TUI dashboard
    python -m src.testing.mock_main_v3 --source 0 --tui --sheets  # With Sheets
"""

import argparse
import threading
import time
import cv2
import requests
from flask import Flask, Response, jsonify

# Flask app
app = Flask(__name__)

# Default webapp URL for Google Sheets
DEFAULT_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbyhZwx1prCzO9u25d_zi2U88R-A1NWfDkKoVbVDxWG_XDN6DmxYC--k2aJqR5ICoZvhKw/exec"

# Global state
current_frame = None
frame_lock = threading.Lock()
stats = {
    'frames_captured': 0,
    'fps': 0,
    'status': 'starting',
    'source': '',
    'clients_connected': 0
}
sheets_data = {
    'connected': False,
    'loading_count': 0,
    'rehab_count': 0,
    'latest_loading': 0,  # Last row loading value
    'latest_rehab': 0,    # Last row rehab value
    'latest_plate': 'N/A',
    'latest_driver': 'Driver',
    'latest_items': 'Items',
    'jam_datang': '',
    'jam_selesai': '',
    'last_update': 0,
    'error': None,
}
sheets_enabled = False
sheets_stop_event = threading.Event()
start_time = time.time()


def generate_frames():
    """Generator for MJPEG stream."""
    global stats
    
    stats['clients_connected'] += 1
    
    try:
        while True:
            with frame_lock:
                if current_frame is None:
                    time.sleep(0.05)
                    continue
                
                # Encode to JPEG
                try:
                    ret, buffer = cv2.imencode('.jpg', current_frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
                    if not ret:
                        continue
                    frame_bytes = buffer.tobytes()
                except Exception as e:
                    print(f"Encode error: {e}")
                    continue
            
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            time.sleep(0.033)  # ~30 FPS max
    finally:
        stats['clients_connected'] -= 1


@app.route('/video_feed')
def video_feed():
    """MJPEG video stream endpoint."""
    return Response(
        generate_frames(),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )


@app.route('/stats')
def get_stats():
    """Stats endpoint."""
    return jsonify(stats)


@app.route('/health')
def health():
    """Health check endpoint."""
    return jsonify({'status': 'ok', 'mode': 'mock_main_v3'})


@app.route('/sheets/status')
def sheets_status():
    """Google Sheets status endpoint."""
    return jsonify(sheets_data)


def capture_loop(source):
    """Camera capture loop (runs in thread)."""
    global current_frame, stats
    
    print(f"[MockMain] Connecting to: {source}")
    stats['status'] = 'connecting'
    stats['source'] = str(source)
    
    # Parse source (int for webcam, string for RTSP)
    try:
        source_int = int(source)
        cap_source = source_int
    except ValueError:
        cap_source = source
    
    cap = cv2.VideoCapture(cap_source)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Low latency
    
    if not cap.isOpened():
        print(f"[MockMain] ERROR: Cannot open source: {source}")
        stats['status'] = 'error'
        return
    
    print(f"[MockMain] Connected! Streaming...")
    stats['status'] = 'streaming'
    
    frame_count = 0
    fps_start_time = time.time()
    
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("[MockMain] Frame capture failed, reconnecting...")
                stats['status'] = 'reconnecting'
                cap.release()
                time.sleep(2)
                cap = cv2.VideoCapture(cap_source)
                continue
            
            # Add timestamp overlay (optional, for debugging)
            timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
            cv2.putText(
                frame, f"Mock Stream - {timestamp}",
                (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2
            )
            cv2.putText(
                frame, "NO DETECTION (Test Mode)",
                (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1
            )
            
            # Update global frame
            with frame_lock:
                current_frame = frame.copy()
            
            # Update stats
            frame_count += 1
            stats['frames_captured'] += 1
            
            elapsed = time.time() - fps_start_time
            if elapsed >= 1.0:
                stats['fps'] = round(frame_count / elapsed, 1)
                frame_count = 0
                fps_start_time = time.time()
            
            stats['status'] = 'streaming'
            
    except KeyboardInterrupt:
        pass
    finally:
        cap.release()
        stats['status'] = 'stopped'


def run_flask_server(port=5002):
    """Run Flask server."""
    # Suppress Flask logs
    import logging
    log = logging.getLogger('werkzeug')
    log.setLevel(logging.ERROR)
    
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)


def sheets_poll_loop(webapp_url: str, interval: int = 5):
    """Background thread to poll Google Sheets."""
    global sheets_data
    
    print(f"[Sheets] Starting polling from: {webapp_url[:50]}...")
    
    while not sheets_stop_event.is_set():
        try:
            response = requests.get(webapp_url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('status') == 'success':
                    result = data.get('data', {})
                    sheets_data['connected'] = True
                    sheets_data['loading_count'] = _safe_int(result.get('loading_count', 0))
                    sheets_data['rehab_count'] = _safe_int(result.get('rehab_count', 0))
                    # Also store latest_loading/latest_rehab (from last row)
                    sheets_data['latest_loading'] = _safe_int(result.get('latest_loading', 0))
                    sheets_data['latest_rehab'] = _safe_int(result.get('latest_rehab', 0))
                    sheets_data['latest_plate'] = str(result.get('latest_plate', 'N/A'))
                    sheets_data['latest_driver'] = str(result.get('latest_driver', 'Driver'))
                    sheets_data['latest_items'] = str(result.get('latest_items', 'Items'))
                    sheets_data['jam_datang'] = str(result.get('jam_datang', ''))
                    sheets_data['jam_selesai'] = str(result.get('jam_selesai', ''))
                    sheets_data['last_update'] = time.time()
                    sheets_data['error'] = None
                    print(f"[Sheets] Updated: plate={sheets_data['latest_plate']}, latest_loading={sheets_data['latest_loading']}, latest_rehab={sheets_data['latest_rehab']}")
                else:
                    sheets_data['connected'] = False
                    sheets_data['error'] = data.get('message', 'Unknown error')
            else:
                sheets_data['connected'] = False
                sheets_data['error'] = f"HTTP {response.status_code}"
                
        except requests.Timeout:
            sheets_data['connected'] = False
            sheets_data['error'] = "Timeout"
            print("[Sheets] Request timeout")
        except Exception as e:
            sheets_data['connected'] = False
            sheets_data['error'] = str(e)
            print(f"[Sheets] Error: {e}")
        
        sheets_stop_event.wait(interval)
    
    print("[Sheets] Polling stopped")


def _safe_int(value, default: int = 0) -> int:
    """Safely convert value to integer."""
    try:
        if value is None or value == '':
            return default
        return int(float(str(value)))
    except (ValueError, TypeError):
        return default


def get_tui_stats():
    """Get stats for enhanced TUI display."""
    uptime_seconds = int(time.time() - start_time)
    
    # Stream status
    status = stats.get('status', 'unknown')
    
    # Performance metrics
    fps_current = stats.get('fps', 0)
    frames_total = stats.get('frames_captured', 0)
    clients = stats.get('clients_connected', 0)
    source = stats.get('source', 'N/A')
    
    # Sheets data for TUI
    sheets_connected = sheets_data.get('connected', False)
    sheets_latest = sheets_data.get('latest_plate', 'N/A')
    sheets_age = int(time.time() - sheets_data.get('last_update', 0)) if sheets_data.get('last_update', 0) > 0 else 0
    
    return {
        'status': status,
        'mode': 'MOCK',
        'port': 5002,
        'uptime_seconds': uptime_seconds,
        'stream': {
            'status': status,
            'source': str(source)[:30],
            'clients': clients,
            'frames_total': frames_total,
        },
        'performance': {
            'fps': {'current': fps_current, 'max': 30},
            'buffer': {'current': 1, 'max': 3},
            'latency_ms': 20,
        },
        'integrations': {
            'sheets': {
                'connected': sheets_connected,
                'latest': sheets_latest if sheets_enabled else 'Disabled (use --sheets)',
                'age_seconds': sheets_age,
            },
            'telegram': {'active': False, 'plate': '', 'status': 'N/A (Mock)'},
        },
        'urls': {
            'video': 'http://localhost:5002/video_feed',
            'stats': 'http://localhost:5002/stats',
            'sheets': 'http://localhost:5002/sheets/status',
        },
    }


def main():
    global stats, sheets_enabled
    
    parser = argparse.ArgumentParser(description="Mock Main V3 - CCTV Stream Without Detection")
    parser.add_argument(
        '--source', '-s',
        type=str,
        default="0",  # Default to webcam
        help='Camera source (RTSP URL or device index, default: 0 for webcam)'
    )
    parser.add_argument(
        '--port', '-p',
        type=int,
        default=5002,
        help='Server port (default: 5002)'
    )
    parser.add_argument(
        '--tui',
        action='store_true',
        help='Enable TUI dashboard (requires rich library)'
    )
    parser.add_argument(
        '--sheets',
        action='store_true',
        help='Enable Google Sheets integration'
    )
    parser.add_argument(
        '--webapp-url',
        type=str,
        default=DEFAULT_WEBAPP_URL,
        help='Google Apps Script Web App URL'
    )
    
    args = parser.parse_args()
    stats['source'] = args.source
    sheets_enabled = args.sheets
    
    # Enable TUI if requested
    tui = None
    if args.tui:
        try:
            from src.utils.tui import ServerTUI
            tui = ServerTUI(
                title=f"Mock Main V3 - Port {args.port} (Test Mode)",
                get_stats=get_tui_stats
            )
            if not tui.start():
                tui = None
                print("[TUI] Failed to start. Running without TUI.")
        except ImportError:
            print("[TUI] TUI module not found. Running without TUI.")
    
    if not tui:
        print("=" * 60)
        print("Mock Main V3 - CCTV Stream Without Detection")
        print("=" * 60)
        print()
        print(f"Source: {args.source}")
        print(f"Port: {args.port}")
        print(f"Sheets: {'Enabled' if args.sheets else 'Disabled'}")
        print(f"Video Feed: http://localhost:{args.port}/video_feed")
        print()
        print("This is a TEST server - no YOLO detection, no bounding boxes.")
        print("Use this to test if Cloudflare Tunnel is working.")
        print()
        print("Press Ctrl+C to stop")
        print("=" * 60)
    
    # Start capture thread
    capture_thread = threading.Thread(target=capture_loop, args=(args.source,), daemon=True)
    capture_thread.start()
    
    # Start sheets polling if enabled
    if args.sheets:
        sheets_thread = threading.Thread(
            target=sheets_poll_loop,
            args=(args.webapp_url, 5),
            daemon=True
        )
        sheets_thread.start()
        print(f"[Sheets] Integration enabled")
    
    # Run Flask server (blocking)
    print(f"[MockMain] Starting server on port {args.port}...")
    run_flask_server(args.port)


if __name__ == '__main__':
    main()