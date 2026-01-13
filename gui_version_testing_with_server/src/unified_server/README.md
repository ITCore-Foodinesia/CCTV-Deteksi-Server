# Unified Stream Server

Single-worker architecture for CCTV Dashboard Backend.

## Overview

The Unified Stream Server combines all functionality into a single process:

- Video streaming to web dashboard
- REST API endpoints
- WebSocket real-time updates
- Google Sheets integration
- Telegram state management

### Two Operating Modes

1. **Relay Mode** (Default) - Reads stream from Main V3 (port 5002)

   - Main V3 does YOLO detection
   - Unified Server relays the stream to dashboard
   - Lower overhead, no duplicate detection

2. **Direct Mode** - Own RTSP capture with YOLO detection
   - Captures directly from camera
   - Runs its own YOLO detection
   - Standalone operation

## Integration with Icetube Control Panel

When you click **"Main V3"** in Icetube Control Panel:

1. Main V3 starts (YOLO detection) → Port 5002
2. Unified Server auto-starts (relay mode) → Port 5001
3. Cloudflare Tunnel exposes port 5001 → api.foodiserver.my.id
4. Dashboard connects to api.foodiserver.my.id

```
┌─────────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│   Main V3           │───▶│ Unified Server  │───▶│ Cloudflare Tunnel│
│   (Port 5002)       │    │  (Port 5001)    │    │                  │
│   YOLO Detection    │    │  Relay + API    │    │ api.foodiserver  │
└─────────────────────┘    └─────────────────┘    │    .my.id        │
                                   │              └──────────────────┘
                                   │                       │
                                   │                       ▼
                                   │              ┌──────────────────┐
                                   └─────────────▶│    Dashboard     │
                                                  │ dashboards.      │
                                                  │ foodiserver.my.id│
                                                  └──────────────────┘
```

## Benefits vs Old Architecture

| Aspect         | Old (2 Workers) | New (Unified) |
| -------------- | --------------- | ------------- |
| Latency        | 60-100ms        | 30-50ms       |
| Memory         | ~400MB          | ~250MB        |
| Processes      | 2               | 1             |
| Deployment     | Complex         | Simple        |
| MJPEG encoding | Double          | Single        |

## Quick Start

### 1. Install Dependencies

```bash
pip install flask flask-cors flask-socketio opencv-python ultralytics requests
pip install simple-websocket  # For WebSocket upgrades
pip install gspread oauth2client  # For Google Sheets (optional)
```

### 2. Configure

Copy the example config:

```bash
cp config/unified_server_example.json config/unified_server.json
```

Edit `config/unified_server.json`:

```json
{
  "capture": {
    "source": "rtsp://admin:password@192.168.1.100:554/stream1",
    "detection_enabled": true,
    "model_path": "best.engine"
  }
}
```

### 3. Run

**Automatic (Recommended):** Just click "Main V3" in Icetube Control Panel - Unified Server starts automatically!

**Manual:**

```bash
# Relay mode (read from Main V3) - DEFAULT
python -m src.unified_server.main --relay

# Direct mode (own RTSP capture)
python -m src.unified_server.main --direct --source rtsp://...

# Using batch script (Windows)
scripts/start_unified_server.bat
```

## CLI Options

```
--config PATH    Path to config file (default: config.json)
--port PORT      Server port (default: 5001)
--host HOST      Server host (default: 0.0.0.0)

# Mode selection
--relay          Enable relay mode (read from Main V3 at localhost:5002)
--direct         Enable direct capture mode (own RTSP + YOLO)
--relay-url URL  Custom Main V3 URL (default: http://localhost:5002/video_feed)

# Direct mode options
--source URL     Camera source (RTSP URL or device index)
--model PATH     Path to YOLO model file
--fps N          Target FPS (default: 15)
--quality N      JPEG quality 30-95 (default: 65)
--no-detection   Disable YOLO detection

# Display options
--tui            Enable TUI dashboard (requires 'rich' library)

--debug          Enable debug mode
```

## TUI Dashboard

The Unified Server supports a Terminal User Interface (TUI) for monitoring:

```bash
# Enable TUI with --tui flag
python -m src.unified_server.main --relay --tui
```

### TUI Features

- **Status Panel**: Server status, mode, port, uptime
- **Stream Panel**: Source URL, buffer size, connection status
- **Google Sheets Panel**: Connection status, latest plate
- **Telegram Panel**: Current state, active plate
- **URLs Panel**: All available endpoints
- **Logs Panel**: Real-time server logs

### TUI Requirements

Install the `rich` library:

```bash
pip install rich
```

### Example TUI Output

```
┌─ Unified Server - Port 5001 (RELAY mode)  |  Ctrl+C to stop ─┐
├──────────────────────────────────────────────────────────────┤
│ Server           │ Stream           │ URLs                   │
│ Status: RUNNING  │ Source: Main V3  │ Video: localhost:5001  │
│ Mode: RELAY      │ Buffer: 3        │ API: /api/status       │
│ Uptime: 5m 23s   │                  │ WS: ws://localhost     │
├──────────────────────────────────────────────────────────────┤
│ Logs                                                         │
│ [Capture] Started successfully                               │
│ [Sheets] Polling started                                     │
│ [Server] TUI mode active                                     │
└──────────────────────────────────────────────────────────────┘
```

## Testing with Mock Server

For testing Cloudflare Tunnel without running full detection:

```bash
# Start mock server + unified server
scripts/start_test_stream.bat

# With TUI enabled
scripts/start_test_stream.bat --tui
```

This starts:

1. **Mock Main V3** (port 5002) - Simple CCTV stream, NO detection
2. **Unified Server** (port 5001) - Relay for dashboard

Perfect for verifying Cloudflare Tunnel is working correctly.

## API Endpoints

### Video Streaming

- `GET /api/stream/video` - MJPEG video stream
- `GET /api/stream/video_raw` - Raw MJPEG stream
- `GET /api/stream/snapshot` - Single frame JPEG
- `GET /api/stream/start` - Start streaming
- `GET /api/stream/stop` - Stop streaming

### Status & Stats

- `GET /api/status` - Server and stream status
- `GET /api/stats` - Detection and warehouse stats
- `GET /api/health` - Health check
- `GET /api/activities` - Activity logs

### Settings

- `GET /api/settings` - Current settings
- `GET /api/settings/quality/<n>` - Set JPEG quality
- `GET /api/settings/fps/<n>` - Set target FPS
- `GET /api/settings/detection/<0|1>` - Enable/disable detection

### Google Sheets

- `GET /api/sheets/status` - Connection status
- `GET /api/sheets/refresh` - Manual refresh
- `GET /api/sheets/reconnect` - Reconnect
- `POST /api/sheets/webhook` - Webhook for push updates

### Telegram

- `POST /api/telegram_update` - Update from Telegram bot
- `GET /api/state` - Get current Telegram state

## WebSocket Events

### Server → Client

- `status_update` - Stream status changes
- `stats_update` - Statistics updates
- `sheets_update` - Google Sheets data
- `telegram_status` - Telegram state
- `detection_event` - Object detections
- `new_activity` - New activity logged

### Client → Server

- `request_stats` - Request current stats
- `request_activities` - Request activity log
- `request_status` - Request status
- `ping` - Ping/pong for connection check

## Configuration

### Environment Variables

```bash
# Server
UNIFIED_HOST=0.0.0.0
UNIFIED_PORT=5001

# Capture mode
CAPTURE_MODE=relay  # or "direct"
RELAY_URL=http://localhost:5002/video_feed  # For relay mode
MAIN_V3_URL=http://localhost:5002/video_feed  # Alternative

# Direct mode settings
CAMERA_URL=rtsp://admin:pass@192.168.1.100:554/stream1
TARGET_FPS=15
JPEG_QUALITY=65
DETECTION_ENABLED=true
MODEL_PATH=best.engine

# Google Sheets
WEBAPP_URL=https://script.google.com/...
```

### Config File (JSON)

**Relay Mode (Default):**

```json
{
  "host": "0.0.0.0",
  "port": 5001,
  "capture": {
    "mode": "relay",
    "relay_url": "http://localhost:5002/video_feed",
    "relay_stats_url": "http://localhost:5002/stats"
  },
  "sheets": {
    "enabled": true,
    "webapp_url": "https://..."
  }
}
```

**Direct Mode:**

```json
{
  "host": "0.0.0.0",
  "port": 5001,
  "capture": {
    "mode": "direct",
    "source": "rtsp://...",
    "target_fps": 15,
    "jpeg_quality": 65,
    "detection_enabled": true,
    "model_path": "best.engine"
  },
  "sheets": {
    "enabled": true,
    "webapp_url": "https://..."
  }
}
```

## Architecture

### Relay Mode (Default)

```
Main V3 (Port 5002)              Unified Server (Port 5001)
┌─────────────────────┐         ┌─────────────────────────────┐
│ StreamCapture       │ ──────▶ │ HTTPStreamRelay             │
│ - RTSP capture      │  HTTP   │ - Read MJPEG from Main V3   │
│ - YOLO detection    │  MJPEG  │ - Push to FrameBuffer       │
│ - JPEG encode       │         │                             │
└─────────────────────┘         │ Flask + SocketIO            │
                                │ - REST API                  │
                                │ - WebSocket                 │
                                │ - MJPEG to dashboard        │
                                │ - Sheets integration        │
                                └─────────────────────────────┘
```

### Direct Mode

```
┌─────────────────────────────────────────────────────────────┐
│                    Unified Stream Server                    │
│                                                             │
│  ┌─────────────────┐     ┌─────────────────────────────┐   │
│  │  StreamCapture  │     │    Flask + SocketIO         │   │
│  │  (Thread)       │     │    (Main Thread)            │   │
│  │                 │     │                             │   │
│  │  - cv2.capture  │     │  - REST API                 │   │
│  │  - YOLO detect  │     │  - WebSocket                │   │
│  │  - Draw boxes   │     │  - MJPEG streaming          │   │
│  │  - JPEG encode  │     │  - Sheets integration       │   │
│  └────────┬────────┘     │  - Telegram state           │   │
│           │              └──────────────┬──────────────┘   │
│           ▼                             │                  │
│  ┌─────────────────┐                    │                  │
│  │  Frame Buffer   │◀───────────────────┘                  │
│  │  (Thread-safe)  │                                       │
│  └─────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
```

## Dashboard Integration

Update dashboard `.env`:

```env
VITE_API_URL=https://api.foodiserver.my.id
VITE_EDGE_URL=https://api.foodiserver.my.id
```

For local development:

```env
VITE_API_URL=http://localhost:5001
VITE_EDGE_URL=http://localhost:5001
```

## Cloudflare Tunnel

Configure tunnel to forward to port 5001:

```bash
cloudflared tunnel --url localhost:5001 run icetube-api
```

Or in `config.yml`:

```yaml
ingress:
  - hostname: api.foodiserver.my.id
    service: http://localhost:5001
```

## Troubleshooting

### Stream not loading (Relay Mode)

1. Make sure Main V3 is running (started via Icetube Control Panel)
2. Check Main V3 output: `http://localhost:5002/video_feed`
3. Check Unified Server logs for connection errors
4. Verify VITE_API_URL points to correct server

### Stream not loading (Direct Mode)

1. Check camera source is accessible: `ffplay rtsp://...`
2. Check server logs for connection errors
3. Verify VITE_API_URL points to correct server

### Low FPS

1. Lower JPEG quality: `--quality 50`
2. Reduce target FPS: `--fps 10`
3. Disable detection: `--no-detection` (direct mode only)
4. Check network bandwidth

### Detection not working (Direct Mode)

1. Verify model file exists: `best.engine`
2. Check CUDA/TensorRT installation
3. Try ONNX model: `--model best.onnx`

### WebSocket not connecting

1. Install simple-websocket: `pip install simple-websocket`
2. Check firewall allows WebSocket upgrade
3. Verify Cloudflare tunnel supports WebSocket

### Unified Server not auto-starting

1. Check Python path is correct
2. Verify `src.unified_server.main` module is accessible
3. Start manually: `python -m src.unified_server.main --relay`
