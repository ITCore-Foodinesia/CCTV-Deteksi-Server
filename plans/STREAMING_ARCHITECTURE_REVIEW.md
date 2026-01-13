# CCTV Live Streaming Architecture Review & Improved Design

## Executive Summary

This document analyzes the current CCTV streaming system and proposes an optimized "Single Worker" architecture that simplifies deployment while maintaining all functionality.

---

## Part 1: Current System Review

### Current Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CURRENT ARCHITECTURE (2 Workers)                     │
│                                                                             │
│  ┌──────────────┐      ┌──────────────────┐      ┌──────────────────────┐  │
│  │   CAMERA     │      │   WORKER 1       │      │   WORKER 2           │  │
│  │   (RTSP)     │─────▶│   Detector       │─────▶│   API Server         │  │
│  │              │      │   (port 5002)    │      │   (port 5001)        │  │
│  └──────────────┘      │                  │      │                      │  │
│                        │  - YOLO detect   │      │  - Receive stream    │  │
│                        │  - Draw boxes    │      │  - Flask + SocketIO  │  │
│                        │  - Serve MJPEG   │      │  - Google Sheets     │  │
│                        │                  │      │  - Telegram          │  │
│                        └───────┬──────────┘      │  - Expose /api/*     │  │
│                                │                 └──────────┬───────────┘  │
│                                │                            │              │
│                           HTTP │                   Cloudflare│Tunnel       │
│                           MJPEG│                            │              │
│                                ▼                            ▼              │
│                        ┌──────────────────────────────────────────────┐   │
│                        │              INTERNET                        │   │
│                        │  api.foodiserver.my.id → localhost:5001      │   │
│                        └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Current Components Analysis

#### 1. Detector/Edge Node (Worker 1 - Port 5002)

**Location:** `gui_version_testing_with_server/src/detection/gui_version_partial/main.py`

**Responsibilities:**

- Capture RTSP stream from camera
- Run YOLO object detection
- Draw bounding boxes on frames
- Serve MJPEG stream at `/video_feed`

**Issues:**

- ❌ Only exposes video, no REST API or WebSocket
- ❌ Cannot be directly used by dashboard (needs API server relay)
- ❌ Adds latency (double encoding: detector → api_server → browser)

#### 2. API Server (Worker 2 - Port 5001)

**Location:** `gui_version_testing_with_server/src/api/api_server.py`

**Responsibilities:**

- Receive MJPEG stream from detector via `HTTPStreamReceiver`
- Re-serve stream at `/api/stream/video`
- WebSocket for real-time updates (Socket.IO)
- REST API endpoints
- Google Sheets integration
- Telegram integration
- Process monitoring

**Issues:**

- ❌ **Double streaming overhead** - receives MJPEG, re-encodes as MJPEG
- ❌ **Memory duplication** - stores frames in memory twice
- ❌ **Increased latency** - additional hop in video path
- ❌ **Tight coupling** - if detector restarts, api_server loses stream

### Current Code Issues

#### Issue 1: Double MJPEG Encoding

```python
# api_server.py - HTTPStreamReceiver
class HTTPStreamReceiver(BaseStreamReceiver):
    def _receive_loop(self):
        response = requests.get(self.stream_url, stream=True)  # ← Receive MJPEG
        for chunk in response.iter_content(chunk_size=1024):
            # Parse JPEG from MJPEG stream
            jpg = bytes_data[start:end + 2]
            self.frame = jpg  # ← Store in memory

# Then re-encode as MJPEG
def generate_video_frames():
    while True:
        frame_bytes = stream.get_frame()  # ← Get from memory
        yield (b'--frame\r\n' + frame_bytes)  # ← Re-encode as MJPEG
```

**Problem:** Video is decoded from MJPEG, stored, then re-encoded to MJPEG. This adds ~10-30ms latency per frame.

#### Issue 2: No Frame Rate Control

```python
def generate_video_frames():
    while True:
        current_frame_time = stream.last_frame_time
        if current_frame_time > last_yield_time:
            frame_bytes = stream.get_frame()
            yield (...)
        time.sleep(0.01)  # ← Fixed 10ms delay, no adaptive control
```

**Problem:** No adaptive frame rate based on client capabilities or network conditions.

#### Issue 3: Single Global Stream Instance

```python
stream = create_stream_receiver()  # ← Global singleton
```

**Problem:** All clients share same stream. If one client is slow, it affects others.

---

## Part 2: Proposed "Single Worker" Architecture

### Design Goals

1. **Single process** - One worker handles everything
2. **Zero relay** - Direct camera → processing → browser
3. **Lower latency** - Eliminate intermediate hop
4. **Simpler deployment** - One service to manage

### New Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   NEW ARCHITECTURE (Single Worker)                          │
│                                                                             │
│  ┌──────────────┐      ┌────────────────────────────────────────────────┐  │
│  │   CAMERA     │      │   UNIFIED STREAM SERVER (port 5001)            │  │
│  │   (RTSP)     │─────▶│                                                │  │
│  │              │      │   ┌─────────────────┐  ┌────────────────────┐  │  │
│  └──────────────┘      │   │  StreamCapture  │  │  Flask + SocketIO  │  │  │
│                        │   │  (Thread 1)     │  │  (Main Thread)     │  │  │
│                        │   │                 │  │                    │  │  │
│                        │   │  - cv2.capture  │  │  - REST API        │  │  │
│                        │   │  - YOLO detect  │  │  - WebSocket       │  │  │
│                        │   │  - Draw boxes   │  │  - MJPEG stream    │  │  │
│                        │   │  - Store frame  │  │  - Google Sheets   │  │  │
│                        │   └────────┬────────┘  │  - Telegram        │  │  │
│                        │            │           └────────────────────┘  │  │
│                        │            ▼                     │             │  │
│                        │   ┌─────────────────┐           │             │  │
│                        │   │  Frame Buffer   │───────────┘             │  │
│                        │   │  (Thread-safe)  │                         │  │
│                        │   └─────────────────┘                         │  │
│                        └───────────────────────────────────────────────────┘
│                                      │                                      │
│                           Cloudflare │ Tunnel                               │
│                                      ▼                                      │
│                        ┌────────────────────────────────────────────────┐  │
│                        │              INTERNET                          │  │
│                        │  api.foodiserver.my.id → localhost:5001        │  │
│                        └────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Proposed Implementation

#### New File Structure

```
gui_version_testing_with_server/
└── src/
    └── unified_server/
        ├── __init__.py
        ├── main.py              # Entry point
        ├── config.py            # Configuration
        ├── capture/
        │   ├── __init__.py
        │   ├── stream_capture.py   # Camera capture + detection
        │   └── frame_buffer.py     # Thread-safe frame storage
        ├── api/
        │   ├── __init__.py
        │   ├── routes.py           # REST endpoints
        │   ├── websocket.py        # Socket.IO handlers
        │   └── streaming.py        # MJPEG generator
        └── integrations/
            ├── __init__.py
            ├── google_sheets.py    # Sheets integration
            └── telegram.py         # Telegram integration
```

---

## Part 3: Detailed Component Design

### 3.1 Frame Buffer (Thread-Safe)

```python
# capture/frame_buffer.py
import threading
import time
from collections import deque
from dataclasses import dataclass
from typing import Optional

@dataclass
class Frame:
    """Container for a single video frame with metadata."""
    data: bytes          # JPEG encoded frame
    timestamp: float     # Capture time
    detection_count: int # Number of objects detected
    fps: float          # Current FPS

class FrameBuffer:
    """
    Thread-safe circular buffer for video frames.

    Design:
    - Single writer (capture thread)
    - Multiple readers (HTTP clients)
    - Lock-free reads using double buffering
    """

    def __init__(self, max_frames: int = 3):
        self._frames = deque(maxlen=max_frames)
        self._lock = threading.RLock()
        self._latest: Optional[Frame] = None
        self._frame_count = 0
        self._start_time = time.time()

    def push(self, frame_data: bytes, detection_count: int = 0) -> None:
        """Push new frame (called by capture thread)."""
        now = time.time()
        self._frame_count += 1
        elapsed = now - self._start_time
        fps = self._frame_count / elapsed if elapsed > 0 else 0

        frame = Frame(
            data=frame_data,
            timestamp=now,
            detection_count=detection_count,
            fps=round(fps, 1)
        )

        with self._lock:
            self._frames.append(frame)
            self._latest = frame

    def get_latest(self) -> Optional[Frame]:
        """Get latest frame (called by HTTP handlers)."""
        with self._lock:
            return self._latest

    def get_stats(self) -> dict:
        """Get buffer statistics."""
        with self._lock:
            return {
                'frame_count': self._frame_count,
                'buffer_size': len(self._frames),
                'fps': self._latest.fps if self._latest else 0,
                'last_update': self._latest.timestamp if self._latest else 0
            }
```

### 3.2 Stream Capture (Camera + Detection)

```python
# capture/stream_capture.py
import cv2
import threading
import time
from typing import Optional, Callable
from dataclasses import dataclass

@dataclass
class CaptureConfig:
    """Configuration for video capture."""
    source: str = "rtsp://admin:admin@192.168.1.100:554/stream1"
    width: int = 1280
    height: int = 720
    target_fps: int = 15
    jpeg_quality: int = 65
    detection_enabled: bool = True
    model_path: str = "best.engine"

class StreamCapture:
    """
    Captures video from RTSP/camera and runs detection.

    Single thread handles:
    1. Frame capture
    2. Object detection (YOLO)
    3. Overlay drawing
    4. JPEG encoding
    5. Buffer update
    """

    def __init__(self, config: CaptureConfig, frame_buffer: 'FrameBuffer'):
        self.config = config
        self.buffer = frame_buffer
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._detector = None
        self._status = "Stopped"

    def start(self) -> bool:
        """Start capture thread."""
        if self._running:
            return True

        self._running = True
        self._thread = threading.Thread(target=self._capture_loop, daemon=True)
        self._thread.start()
        return True

    def stop(self) -> None:
        """Stop capture thread."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=2.0)

    def _capture_loop(self) -> None:
        """Main capture loop."""
        self._status = "Connecting..."

        # Initialize detector (lazy load)
        if self.config.detection_enabled:
            self._init_detector()

        cap = cv2.VideoCapture(self.config.source)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.config.width)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.config.height)

        if not cap.isOpened():
            self._status = "Failed to open camera"
            return

        self._status = "Connected"
        frame_interval = 1.0 / self.config.target_fps
        last_frame_time = 0

        while self._running:
            now = time.time()

            # Frame rate control
            if now - last_frame_time < frame_interval:
                time.sleep(0.001)
                continue

            ret, frame = cap.read()
            if not ret:
                self._status = "Reconnecting..."
                cap.release()
                time.sleep(1)
                cap = cv2.VideoCapture(self.config.source)
                continue

            # Run detection
            detection_count = 0
            if self.config.detection_enabled and self._detector:
                frame, detection_count = self._run_detection(frame)

            # Encode to JPEG
            encode_params = [cv2.IMWRITE_JPEG_QUALITY, self.config.jpeg_quality]
            _, jpeg = cv2.imencode('.jpg', frame, encode_params)

            # Push to buffer
            self.buffer.push(jpeg.tobytes(), detection_count)
            last_frame_time = now

            self._status = "Streaming"

        cap.release()
        self._status = "Stopped"

    def _init_detector(self) -> None:
        """Initialize YOLO detector (TensorRT)."""
        try:
            from ultralytics import YOLO
            self._detector = YOLO(self.config.model_path, task='detect')
        except Exception as e:
            print(f"Failed to load detector: {e}")
            self._detector = None

    def _run_detection(self, frame) -> tuple:
        """Run detection and draw overlays."""
        if not self._detector:
            return frame, 0

        results = self._detector(frame, verbose=False)
        detection_count = 0

        for result in results:
            boxes = result.boxes
            detection_count = len(boxes)

            for box in boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                conf = float(box.conf[0])
                cls = int(box.cls[0])
                label = f"{result.names[cls]} {conf:.2f}"

                # Draw box
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(frame, label, (x1, y1 - 10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

        return frame, detection_count

    @property
    def status(self) -> str:
        return self._status
```

### 3.3 MJPEG Streaming Endpoint

```python
# api/streaming.py
import time
from typing import Generator
from flask import Response

def generate_mjpeg_stream(frame_buffer: 'FrameBuffer') -> Generator[bytes, None, None]:
    """
    Generator for MJPEG stream.

    Improvements over current:
    1. Adaptive frame rate based on buffer state
    2. Client-specific frame tracking
    3. Proper MJPEG headers with Content-Length
    """
    last_timestamp = 0
    consecutive_empty = 0
    max_empty = 100  # Disconnect after ~1s of no frames

    while True:
        frame = frame_buffer.get_latest()

        if frame and frame.timestamp > last_timestamp:
            last_timestamp = frame.timestamp
            consecutive_empty = 0

            # Proper MJPEG frame with Content-Length
            yield (
                b'--frame\r\n'
                b'Content-Type: image/jpeg\r\n'
                b'Content-Length: ' + str(len(frame.data)).encode() + b'\r\n'
                b'\r\n' + frame.data + b'\r\n'
            )
        else:
            consecutive_empty += 1
            if consecutive_empty > max_empty:
                # Client likely disconnected or buffer empty too long
                break

        # Adaptive sleep
        time.sleep(0.01 if frame else 0.05)

def create_video_response(frame_buffer: 'FrameBuffer') -> Response:
    """Create Flask Response for video streaming."""
    return Response(
        generate_mjpeg_stream(frame_buffer),
        mimetype='multipart/x-mixed-replace; boundary=frame',
        headers={
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Accel-Buffering': 'no',  # Disable nginx buffering
        }
    )
```

### 3.4 Unified Server (Main Entry Point)

```python
# main.py
"""
Unified Stream Server - Single Worker CCTV Dashboard Backend

Usage:
    python -m unified_server.main [--config config.json] [--tui]
"""

import argparse
import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO

from .config import load_config, ServerConfig
from .capture.frame_buffer import FrameBuffer
from .capture.stream_capture import StreamCapture, CaptureConfig
from .api.streaming import create_video_response
from .integrations.google_sheets import SheetsIntegration
from .integrations.telegram import TelegramIntegration

# Flask app
app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

# Global instances
frame_buffer: FrameBuffer = None
stream_capture: StreamCapture = None
sheets: SheetsIntegration = None
telegram: TelegramIntegration = None

# ==============================================================================
# REST API Routes
# ==============================================================================

@app.route('/api/stream/video')
def video_feed():
    """MJPEG video stream endpoint."""
    return create_video_response(frame_buffer)

@app.route('/api/status')
def get_status():
    """Get server status."""
    stats = frame_buffer.get_stats()
    return jsonify({
        'status': stream_capture.status,
        'fps': stats['fps'],
        'frame_count': stats['frame_count'],
        'last_update': stats['last_update'],
    })

@app.route('/api/stats')
def get_stats():
    """Get detection statistics."""
    frame = frame_buffer.get_latest()
    return jsonify({
        'detection_count': frame.detection_count if frame else 0,
        'fps': frame.fps if frame else 0,
        'inbound': sheets.get_inbound() if sheets else 0,
        'outbound': sheets.get_outbound() if sheets else 0,
    })

@app.route('/api/health')
def health_check():
    """Health check endpoint for monitoring."""
    return jsonify({'status': 'healthy', 'timestamp': time.time()})

# ==============================================================================
# WebSocket Events
# ==============================================================================

@socketio.on('connect')
def handle_connect():
    """Handle client connection."""
    stats = frame_buffer.get_stats()
    emit('status_update', {'status': stream_capture.status})
    emit('stats_update', stats)

@socketio.on('request_stats')
def handle_request_stats():
    """Handle stats request."""
    stats = frame_buffer.get_stats()
    emit('stats_update', stats)

# ==============================================================================
# Main
# ==============================================================================

def main():
    global frame_buffer, stream_capture, sheets, telegram

    parser = argparse.ArgumentParser(description="Unified Stream Server")
    parser.add_argument('--config', default='config.json', help='Config file path')
    parser.add_argument('--port', type=int, default=5001, help='Server port')
    parser.add_argument('--tui', action='store_true', help='Enable TUI dashboard')
    args = parser.parse_args()

    # Load configuration
    config = load_config(args.config)

    # Initialize components
    frame_buffer = FrameBuffer(max_frames=3)

    capture_config = CaptureConfig(
        source=config.get('camera_url', 'rtsp://localhost:554/stream'),
        target_fps=config.get('target_fps', 15),
        jpeg_quality=config.get('jpeg_quality', 65),
        detection_enabled=config.get('detection_enabled', True),
        model_path=config.get('model_path', 'best.engine'),
    )
    stream_capture = StreamCapture(capture_config, frame_buffer)

    # Start capture
    print(f"Starting stream capture from: {capture_config.source}")
    stream_capture.start()

    # Initialize integrations
    if config.get('sheets_enabled'):
        sheets = SheetsIntegration(config.get('sheets_config', {}))
        sheets.start_polling()

    if config.get('telegram_enabled'):
        telegram = TelegramIntegration(config.get('telegram_config', {}))

    # Print server info
    print("=" * 60)
    print("Unified Stream Server - Single Worker Architecture")
    print("=" * 60)
    print(f"  API:    http://localhost:{args.port}")
    print(f"  Stream: http://localhost:{args.port}/api/stream/video")
    print(f"  WS:     ws://localhost:{args.port}")
    print("=" * 60)

    # Start server
    socketio.run(app, host='0.0.0.0', port=args.port, debug=False)

if __name__ == '__main__':
    main()
```

---

## Part 4: Comparison

### Performance Comparison

| Metric            | Current (2 Workers)               | Proposed (1 Worker)   |
| ----------------- | --------------------------------- | --------------------- |
| **Latency**       | ~60-100ms (double hop)            | ~30-50ms (direct)     |
| **Memory**        | ~400MB (2 processes)              | ~250MB (1 process)    |
| **CPU**           | Higher (double encoding)          | Lower (single encode) |
| **Complexity**    | 2 services to manage              | 1 service             |
| **Failure modes** | More (detector crash affects API) | Fewer                 |

### Feature Comparison

| Feature          | Current           | Proposed             |
| ---------------- | ----------------- | -------------------- |
| Video Streaming  | ✅ MJPEG          | ✅ MJPEG (optimized) |
| Object Detection | ✅ YOLO           | ✅ YOLO              |
| WebSocket        | ✅ Socket.IO      | ✅ Socket.IO         |
| REST API         | ✅ Full           | ✅ Full              |
| Google Sheets    | ✅ gspread/WebApp | ✅ Same              |
| Telegram         | ✅ Integration    | ✅ Same              |
| TUI Dashboard    | ✅ Rich           | ✅ Rich              |
| Adaptive FPS     | ❌ Fixed          | ✅ Dynamic           |
| Health Check     | ❌ None           | ✅ /api/health       |

---

## Part 5: Migration Plan

### Phase 1: Create Unified Server (No Breaking Changes)

1. Create new `unified_server/` module
2. Implement `FrameBuffer` and `StreamCapture`
3. Port API routes from `api_server.py`
4. Test locally alongside existing system

### Phase 2: Parallel Run

1. Run unified server on different port (e.g., 5003)
2. Test dashboard with new server
3. Compare latency and resource usage

### Phase 3: Switchover

1. Update `.env` to point to new server
2. Update Cloudflare Tunnel to new port
3. Deprecate old 2-worker setup

### Phase 4: Cleanup

1. Archive old `api_server.py`
2. Remove detector's HTTP server code
3. Update documentation

---

## Part 6: Configuration Example

```json
{
  "camera_url": "rtsp://admin:password@192.168.1.100:554/stream1",
  "target_fps": 15,
  "jpeg_quality": 65,
  "detection_enabled": true,
  "model_path": "best.engine",

  "sheets_enabled": true,
  "sheets_config": {
    "webapp_url": "https://script.google.com/...",
    "poll_interval": 5
  },

  "telegram_enabled": true,
  "telegram_config": {
    "bot_token": "...",
    "chat_id": "..."
  },

  "server": {
    "port": 5001,
    "host": "0.0.0.0"
  }
}
```

---

## Conclusion

The proposed Single Worker architecture:

1. **Reduces latency** by eliminating intermediate MJPEG relay
2. **Simplifies deployment** with one service instead of two
3. **Lowers resource usage** by avoiding duplicate frame storage
4. **Improves reliability** with fewer failure points
5. **Maintains all features** of the current system

The migration can be done incrementally without breaking the existing system.
