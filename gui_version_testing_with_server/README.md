# CCTV Detection System

Intelligent CCTV monitoring and object detection system for automated loading/unloading operations in warehouse/logistics environments.

## Features

- **Real-time Object Detection**: YOLOv8 with TensorRT optimization for high-performance detection
- **Multi-Camera Support**: Monitor RTSP camera streams
- **QR Code Integration**: Vehicle identification via QR code scanning
- **Google Sheets Integration**: Automatic logging of detection data
- **Multiple Control Interfaces**:
  - Desktop GUI (Tkinter control panel)
  - Telegram Bot (remote monitoring and control)
  - Web Dashboard (Flask + SocketIO)
- **Smart Detection**: Bi-directional line crossing with persistence logic and cooldown management
- **System Monitoring**: Telegram bot for health checks and auto-restart

## Project Structure

```
gui_version_testing_with_server/
├── src/                          # Source code
│   ├── detection/                # Detection engine modules
│   │   ├── main_v2.py           # Main detection engine (V2)
│   │   └── gui_version_partial/ # Modular detection (V3)
│   │       ├── main.py
│   │       ├── detector.py
│   │       ├── scanner.py
│   │       ├── uploader.py
│   │       ├── shared.py
│   │       └── config.py
│   ├── integrations/             # External service integrations
│   │   ├── telegram/            # Telegram bot integration
│   │   │   ├── telegram_monitor_bot.py
│   │   │   └── telegram_loading_dashboard.py
│   │   ├── firebase/            # Firebase Cloud Messaging
│   │   │   └── firebase_utils.py
│   │   └── sheets/              # Google Sheets (future)
│   ├── api/                      # API server
│   │   ├── api_server.py        # Flask + SocketIO server
│   │   └── api_server_gen_frames.py
│   ├── gui/                      # Desktop GUI
│   │   └── icetube_control_panel.py
│   └── utils/                    # Utility modules (future)
├── models/                       # YOLO model files
│   ├── bestbaru.pt              # PyTorch model
│   ├── bestbaru.onnx            # ONNX export
│   └── bestbaru.engine          # TensorRT optimized engine
├── config/                       # Configuration files
│   ├── control_panel_config.json
│   ├── state_main_new.json
│   └── v3_state.json
├── scripts/                      # Startup scripts
│   ├── start_control_panel.bat
│   ├── start_telegram_bot.bat
│   ├── start_multiprocess_test.bat
│   └── rebuild_engine.py
├── docs/                         # Documentation
│   ├── changelog.txt
│   ├── telegram_workflow.md
│   ├── REBUILD_ENGINE_GUIDE.md
│   └── REBUILD_ENGINE_320.md
├── archive/                      # Legacy code
│   └── icetube_main.py          # Old detection engine (V1)
├── tests/                        # Unit tests (future)
├── logs/                         # Log files (gitignored)
├── requirements.txt              # Python dependencies
└── .gitignore                    # Git ignore rules
```

## Prerequisites

- **Python**: 3.11+
- **GPU**: NVIDIA GPU with CUDA support (tested on RTX 3060)
- **CUDA**: 11.8+
- **Operating System**: Windows (can be adapted for Linux)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd gui_version_testing_with_server
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up credentials:
   - Place your Google Service Account credentials in `credentials.json` (root directory)
   - Configure RTSP camera URLs in the control panel or config files
   - Set up Telegram bot tokens in the respective bot files

4. (Optional) Rebuild TensorRT engine for your GPU:
```bash
python scripts/rebuild_engine.py
```

## Usage

### Option 1: Desktop Control Panel
```bash
scripts\start_control_panel.bat
```

### Option 2: Direct Detection (V2)
```bash
python src/detection/main_v2.py --source "<RTSP_URL>" --model "models/bestbaru.engine" --creds "credentials.json" --sheet_id "<SHEET_ID>" --worksheet "<WORKSHEET_NAME>"
```

### Option 3: Modular Version (V3)
```bash
scripts\start_multiprocess_test.bat
```

### Option 4: API Server + Web Dashboard
```bash
python src/api/api_server.py
```

### Option 5: Telegram Bot
```bash
scripts\start_telegram_bot.bat
```

## Configuration

### Detection Settings
- **Confidence Threshold**: Adjust in control panel or via `--conf` argument
- **IoU Threshold**: Adjust in control panel or via `--iou` argument
- **V4 Mode**: Enable advanced persistence logic with 3-second timer
- **Detection Zones**: Configure via GUI control panel

### RTSP Camera
Edit camera URLs in:
- Control panel GUI
- Configuration files in `config/`
- Command line arguments

### Google Sheets
- Create a Google Service Account
- Download credentials JSON
- Share your Google Sheet with the service account email
- Configure Sheet ID and worksheet name

## Tech Stack

### Core
- **Python 3.11**
- **OpenCV** - Video/image processing
- **YOLOv8** (Ultralytics) - Object detection
- **PyTorch** - Deep learning framework
- **TensorRT** - GPU acceleration

### Web
- **Flask** + **Flask-SocketIO** - Web API and WebSocket
- **Flask-CORS** - Cross-origin resource sharing
- **Uvicorn** + **FastAPI** - Alternative ASGI server

### Integrations
- **gspread** - Google Sheets API
- **python-telegram-bot** - Telegram bot framework
- **firebase-admin** - Firebase Cloud Messaging

### GUI
- **Tkinter** - Desktop control panel

### Utilities
- **psutil** - System monitoring
- **GPUtil** - GPU monitoring
- **pyzbar** - QR code scanning

## Versions

The project has 3 versions:

1. **V1 (icetube_main.py)** - Legacy, single-threaded (archived)
2. **V2 (main_v2.py)** - Enhanced with circuit breaker, retry queue, async operations
3. **V3 (gui_version_partial/)** - Modular architecture with separated concerns

**Recommended**: Use V2 for production, V3 for development.

## Key Features by Version

### V2 Features
- Circuit breaker pattern for Google Sheets
- Retry queue for failed operations
- Background internet checking
- QR scanning in separate thread
- Asynchronous Telegram messaging
- V4 mode with 3-second persistence
- Directional tracking (Loading vs Rehab)

### V3 Features
- Separated modules (detector, scanner, uploader)
- Cleaner architecture
- Internal Flask server on port 5002
- Type hints throughout
- Better error handling

## Troubleshooting

### TensorRT Engine Issues
If detection fails or shows errors:
```bash
python scripts/rebuild_engine.py
```
See `docs/REBUILD_ENGINE_GUIDE.md` for details.

### Log Files Growing Too Large
Logs are automatically stored in `logs/` directory. Clean up periodically:
```bash
del logs\*.txt
```

### RTSP Connection Fails
- Verify camera is online
- Check network connectivity
- Validate RTSP URL format
- Test with VLC media player first

## Security Note

**IMPORTANT**: This project requires credentials (RTSP passwords, Telegram tokens, Google credentials).

- Never commit `credentials.json` to version control
- Keep `.env` file out of git (use `.env.example` template)
- Rotate passwords and tokens regularly
- Use the provided `.gitignore` to prevent accidental commits

## Performance Optimization

- **320x320 input**: 2x speed improvement over 640x640
- **TensorRT engine**: GPU acceleration
- **Low-latency RTSP**: `fflags nobuffer` settings
- **Frame buffering**: Buffer size 1-2 for minimal delay

## Contributing

1. Keep credentials out of commits
2. Follow existing code structure
3. Add type hints for new functions
4. Update documentation when adding features
5. Test with different camera streams

## License

[Add license information]

## Support

For issues, questions, or contributions, please open an issue in the repository.

## Changelog

See `docs/changelog.txt` for version history.

---

**Generated**: 2026-01-10
**Version**: 4.0.5
**Maintainer**: [Add maintainer info]
