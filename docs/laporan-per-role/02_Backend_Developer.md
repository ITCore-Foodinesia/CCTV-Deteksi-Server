# 🔧 LAPORAN BACKEND DEVELOPER

**Proyek:** Sistem Monitoring CCTV Gudang Berbasis AI  
**Tanggal:** 2 Februari 2026  
**Score:** 🟢 70%

---

## 📌 RINGKASAN

Backend system untuk deteksi objek menggunakan AI (YOLOv8), API server untuk streaming dan data, serta integrasi dengan external services (Google Sheets, Telegram).

---

## 🛠️ TEKNOLOGI YANG DIGUNAKAN

| Teknologi | Versi/Keterangan |
|-----------|------------------|
| **Python** | 3.11+ |
| **Flask** | Web framework + API |
| **Flask-SocketIO** | WebSocket support |
| **FastAPI** | Alternative ASGI server |
| **Uvicorn** | ASGI server |
| **OpenCV** | Video/image processing |
| **YOLOv8 (Ultralytics)** | Object detection |
| **PyTorch** | Deep learning framework |
| **TensorRT** | GPU acceleration |
| **gspread** | Google Sheets API |
| **python-telegram-bot** | Telegram integration |
| **psutil** | System monitoring |
| **GPUtil** | GPU monitoring |
| **pyzbar** | QR code scanning |

---

## 📁 STRUKTUR FOLDER BACKEND

```
gui_version_testing_with_server/
├── src/
│   ├── __init__.py
│   ├── api/                          # API Server
│   │   ├── __init__.py
│   │   ├── api_server.py             # Flask + SocketIO
│   │   └── api_server_gen_frames.py  # Frame generator
│   │
│   ├── detection/                    # AI Detection Engine
│   │   ├── __init__.py
│   │   └── gui_version_partial/      # V3 Modular
│   │       ├── main.py               # Entry point
│   │       ├── detector.py           # Object detection
│   │       ├── scanner.py            # QR scanner
│   │       ├── uploader.py           # Data uploader
│   │       ├── shared.py             # Shared state
│   │       └── config.py             # Configuration
│   │
│   ├── gui/                          # Desktop GUI
│   │   ├── __init__.py
│   │   └── icetube_control_panel.py  # Tkinter control panel
│   │
│   ├── integrations/                 # External Services
│   │   ├── __init__.py
│   │   ├── telegram/
│   │   │   ├── __init__.py
│   │   │   ├── telegram_monitor_bot.py
│   │   │   └── telegram_loading_dashboard.py
│   │   └── sheets/
│   │       └── __init__.py
│   │
│   ├── unified_server/               # Unified Server Architecture
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── README.md
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── routes.py
│   │   │   ├── streaming.py
│   │   │   └── websocket.py
│   │   └── capture/
│   │
│   └── testing/                      # Testing utilities
│       ├── __init__.py
│       └── mock_main_v3.py
│
├── models/                           # AI Model files
│   ├── bestbaru.pt                   # PyTorch model
│   ├── bestbaru.onnx                 # ONNX export
│   └── bestbaru.engine               # TensorRT engine
│
├── config/                           # Configuration files
│   ├── .gitkeep
│   ├── control_panel_config.json
│   ├── credentials.json              # Google credentials (gitignored)
│   ├── state_main_new.json
│   ├── unified_server_example.json
│   ├── unified_server_test.json
│   ├── unified_server.json
│   └── v3_state.json
│
├── scripts/                          # Startup scripts
│   ├── rebuild_engine.py
│   ├── start_control_panel.bat
│   ├── start_multiprocess_test.bat
│   ├── start_telegram_bot.bat
│   ├── start_test_stream.bat
│   └── start_unified_server.bat
│
├── docs/                             # Documentation
│   ├── changelog.txt
│   ├── telegram_workflow.md
│   ├── REBUILD_ENGINE_GUIDE.md
│   └── REBUILD_ENGINE_320.md
│
├── archive/                          # Legacy code
│   ├── firebase_utils.py
│   ├── icetube_main.py               # V1
│   └── main_v2_legacy.py
│
├── .gitignore
├── requirements.txt
├── README.md
├── MIGRATION.md
├── PROJECT_ANALYSIS.md
└── REORGANIZATION_SUMMARY.md
```

---

## 🌐 API SERVER

### REST Endpoints (Port 5001)

| Endpoint | Method | Fungsi | Response |
|----------|--------|--------|----------|
| `/api/stream/video` | GET | MJPEG video stream | Video stream |
| `/api/status` | GET | Status sistem | JSON |
| `/api/stats` | GET | Statistik | JSON |
| `/api/activities` | GET | Log aktivitas | JSON Array |

### Example Responses

**GET /api/status**
```json
{
  "streaming": true,
  "camera_connected": true,
  "detection_active": true,
  "model": "bestbaru.engine",
  "fps": 25.4,
  "uptime": "2h 34m"
}
```

**GET /api/stats**
```json
{
  "loading": 150,
  "rehab": 12,
  "trucks_active": 2,
  "last_loading": {
    "plate": "KT 0960 PO-HINO",
    "driver": "Budi Santoso",
    "count": 120
  }
}
```

### WebSocket Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `status_update` | Server → Client | `{streaming, detection_active, ...}` |
| `stats_update` | Server → Client | `{loading, rehab, trucks_active}` |
| `new_activity` | Server → Client | `{type, plate, driver, count, time}` |
| `activities_update` | Server → Client | `[...activities]` |

---

## 🤖 DETECTION ENGINE

### Version History

| Version | File | Status | Features |
|---------|------|--------|----------|
| V1 | `archive/icetube_main.py` | ❌ Archived | Single-threaded |
| V2 | `detection/main_v2.py` | ✅ Production | Multi-threaded, circuit breaker |
| V3 | `detection/gui_version_partial/` | ✅ Development | Modular architecture |

### V2 Features (Recommended for Production)

| Feature | Keterangan |
|---------|------------|
| Circuit Breaker | Pattern untuk Google Sheets reliability |
| Retry Queue | Menyimpan failed operations untuk retry |
| Background Internet Check | Monitor koneksi internet |
| Async QR Scanning | Thread terpisah untuk QR |
| Async Telegram | Non-blocking notifications |
| V4 Mode | 3-second persistence logic |
| Directional Tracking | Loading vs Rehab detection |

### V3 Modular Architecture

| Module | File | Fungsi |
|--------|------|--------|
| Main | `main.py` | Entry point & orchestration |
| Detector | `detector.py` | YOLOv8 object detection |
| Scanner | `scanner.py` | QR code scanning |
| Uploader | `uploader.py` | Google Sheets upload |
| Shared | `shared.py` | Shared state management |
| Config | `config.py` | Configuration loading |

---

## 📊 AI MODEL

### Model Specifications

| Property | Value |
|----------|-------|
| Architecture | YOLOv8 |
| Input Size | 320x320 (optimized) |
| Classes | Truck, Person, Box |
| Format | TensorRT Engine |
| GPU | NVIDIA RTX 3060+ |

### Model Files

| File | Format | Usage |
|------|--------|-------|
| `bestbaru.pt` | PyTorch | Training/Development |
| `bestbaru.onnx` | ONNX | Export/Conversion |
| `bestbaru.engine` | TensorRT | Production (GPU optimized) |

### Rebuild Engine

```bash
python scripts/rebuild_engine.py
```

Lihat: `docs/REBUILD_ENGINE_GUIDE.md`

---

## 🔗 INTEGRASI EXTERNAL

### 1. Google Sheets

**Library:** `gspread`

**Configuration:**
- Service Account credentials di `config/credentials.json`
- Sheet ID dan worksheet name di config

**Data Schema:**

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| Waktu Datang | Timestamp | Waktu truk tiba |
| Waktu Selesai | Timestamp | Waktu selesai |
| Nomor Polisi | String | Plat kendaraan |
| Nama Sopir | String | Nama driver |
| Jumlah Loading | Integer | Barang masuk |
| Jumlah Rehab | Integer | Barang keluar |
| Status | String | Status operasi |

### 2. Telegram Bot

**Files:**
- `telegram_monitor_bot.py` - System monitoring
- `telegram_loading_dashboard.py` - Loading dashboard

**Commands:**

| Command | Fungsi |
|---------|--------|
| `/start` | Menu utama |
| `/status` | Status sistem |
| `▶️ START LOADING` | Mulai deteksi |
| `⏹️ STOP LOADING` | Stop deteksi |
| `/today` | Ringkasan hari ini |

### 3. Desktop GUI (Tkinter)

**File:** `gui/icetube_control_panel.py`

**Features:**
- Camera selection
- Detection parameters (confidence, IoU)
- Start/Stop controls
- Live preview
- Status monitoring

---

## 🚀 STARTUP SCRIPTS

| Script | Fungsi | Port |
|--------|--------|------|
| `start_control_panel.bat` | Start GUI | - |
| `start_telegram_bot.bat` | Start Telegram | - |
| `start_multiprocess_test.bat` | Start V3 | 5002 |
| `start_unified_server.bat` | Start unified | 5001 |
| `start_test_stream.bat` | Test streaming | - |

### Command Line Arguments (V2)

```bash
python src/detection/main_v2.py \
  --source "<RTSP_URL>" \
  --model "models/bestbaru.engine" \
  --creds "credentials.json" \
  --sheet_id "<SHEET_ID>" \
  --worksheet "<WORKSHEET_NAME>" \
  --conf 0.5 \
  --iou 0.45
```

---

## ⚡ PERFORMANCE OPTIMIZATION

| Optimization | Impact | Implementation |
|--------------|--------|----------------|
| 320x320 input | 2x speed | Model configuration |
| TensorRT engine | 3-5x speed | GPU acceleration |
| Low-latency RTSP | Minimal delay | `fflags nobuffer` |
| Frame buffering | Smooth stream | Buffer size 1-2 |
| Async operations | Non-blocking | Threading/AsyncIO |

### Resource Usage (Typical)

| Resource | Usage |
|----------|-------|
| CPU | 15-25% |
| GPU | 40-60% |
| RAM | 2-4 GB |
| VRAM | 1-2 GB |

---

## 📋 DEPENDENCIES

**File:** `requirements.txt`

### Core
- `ultralytics` - YOLOv8
- `opencv-python` - Video processing
- `torch` - PyTorch
- `tensorrt` - GPU optimization

### Web
- `flask` - Web framework
- `flask-socketio` - WebSocket
- `flask-cors` - CORS support

### Integrations
- `gspread` - Google Sheets
- `python-telegram-bot` - Telegram
- `firebase-admin` - FCM (optional)

### Utilities
- `psutil` - System monitoring
- `GPUtil` - GPU monitoring
- `pyzbar` - QR scanning

---

## ⚠️ CATATAN & REKOMENDASI

| Area | Status | Catatan |
|------|--------|---------|
| API Structure | ✅ Baik | RESTful + WebSocket |
| Error Handling | ✅ Baik | Circuit breaker pattern |
| Performance | ✅ Baik | TensorRT optimization |
| Testing | ❌ Belum Ada | Perlu unit tests |
| Documentation | ⚠️ Partial | Perlu API docs (OpenAPI) |
| Logging | ✅ Ada | Perlu rotation policy |
| API Auth | ❌ Belum Ada | Perlu JWT/API key |
| Rate Limiting | ❌ Belum Ada | Perlu implementasi |

---

## 🎯 ACTION ITEMS

| Priority | Task | Effort |
|----------|------|--------|
| 🔴 High | API authentication (JWT) | Medium |
| 🔴 High | Unit tests (pytest) | Medium |
| 🟡 Medium | OpenAPI documentation | Low |
| 🟡 Medium | Rate limiting | Low |
| 🟡 Medium | Log rotation | Low |
| 🟢 Low | Health check endpoint | Low |
| 🟢 Low | Metrics endpoint | Medium |

---

*Laporan dibuat oleh: Software Orchestrator*
*Tanggal: 2 Februari 2026*
