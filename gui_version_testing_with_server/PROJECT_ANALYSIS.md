# 🏗️ CCTV Detection System - Project Structure Analysis

**Analysis Date:** January 10, 2026  
**Analyst:** Rovo Dev  
**Project:** Warehouse AI CCTV Detection & Monitoring System

---

## 📋 Executive Summary

This project is a **warehouse AI monitoring system** that uses CCTV cameras with YOLOv8-based object detection to track truck loading operations, count items (boxes/pallets), and integrate with Google Sheets for inventory management. The system includes:

- **Real-time AI detection** (trucks, persons, boxes)
- **Multi-version architecture** (legacy, integrated, modular)
- **Web dashboard** (React + Vite + TailwindCSS)
- **API server** (Flask + SocketIO)
- **Telegram bot integration** for remote control
- **Google Sheets integration** for data logging

---

## 🗂️ Project Structure Overview

The workspace contains **two main project folders**:

### 1️⃣ **`api-db-cctv-main/`** - Production System
The current production-ready implementation with:
- Flask API server with WebSocket support
- Modern React dashboard
- Modular detection engine
- Integration scripts

### 2️⃣ **`gui_version_testing_with_server/`** - Development/Testing Version
Legacy and experimental versions with:
- Archived legacy implementations
- Modular V3 detection system
- Control panel GUI (Tkinter)
- Testing scripts

---

## 📁 Detailed Directory Structure

### **api-db-cctv-main/** (Production System)

```
api-db-cctv-main/
├── 🐍 Python Backend
│   ├── api_server.py              # Main Flask API + WebSocket server (Port 5001)
│   ├── api_server_gen_frames.py   # Frame generation utilities
│   ├── integrated_main.py         # Integrated detection + server
│   ├── main_v2.py                 # Standalone detection script
│   ├── icetube_control_panel.py   # GUI control panel (Tkinter)
│   └── telegram_monitor_bot.py    # Telegram bot for remote monitoring
│
├── 🎨 Dashboard (React Frontend)
│   ├── src/
│   │   ├── components/
│   │   │   ├── WarehouseAIDashboard.jsx        # Main dashboard
│   │   │   ├── WarehouseAIDashboardStandalone.jsx
│   │   │   ├── Header.jsx                      # Top bar
│   │   │   ├── StatsCard.jsx                   # Metrics cards
│   │   │   ├── CCTVFeed.jsx                    # Video stream viewer
│   │   │   └── ActivityLog.jsx                 # Activity list
│   │   ├── hooks/
│   │   │   └── useWebSocket.js                 # WebSocket integration
│   │   ├── services/
│   │   │   └── api.js                          # API client
│   │   ├── App.jsx                             # Main app
│   │   └── main.jsx                            # Entry point
│   ├── package.json
│   └── vite.config.js
│
├── 🔧 Engine (Modular Detection System)
│   ├── __init__.py
│   ├── core.py                    # CCTVDetectionEngine orchestrator
│   ├── camera_stream.py           # Camera connection & streaming
│   ├── detection_processor.py     # YOLO detection logic
│   ├── streaming_server.py        # Video stream server
│   ├── output_plugin.py           # Plugin system (Sheets, Telegram, etc.)
│   └── config_manager.py          # Configuration loader
│
├── 📝 Batch Scripts
│   ├── start_dashboard.bat        # Launch React dev server
│   ├── start_integrated.bat       # Launch integrated system
│   └── start_tunnel.bat           # Start Cloudflare Tunnel
│
└── 🌐 Tunnel Config
    └── config.yml                 # Cloudflare Tunnel configuration
```

### **gui_version_testing_with_server/** (Development/Testing)

```
gui_version_testing_with_server/
├── 📦 Source Code
│   ├── src/
│   │   ├── api/                   # API server implementations
│   │   │   ├── api_server.py
│   │   │   └── api_server_gen_frames.py
│   │   ├── detection/
│   │   │   └── gui_version_partial/   # Modular V3 detection
│   │   │       ├── main.py
│   │   │       ├── detector.py
│   │   │       ├── scanner.py         # QR code scanner
│   │   │       ├── uploader.py        # Google Sheets uploader
│   │   │       ├── config.py
│   │   │       └── shared.py          # Shared data structures
│   │   ├── gui/
│   │   │   └── icetube_control_panel.py
│   │   └── integrations/
│   │       ├── sheets/
│   │       └── telegram/
│   │           ├── telegram_loading_dashboard.py
│   │           └── telegram_monitor_bot.py
│
├── 🗄️ Archive (Legacy Versions)
│   ├── firebase_utils.py
│   ├── icetube_main.py           # Original monolithic version
│   └── main_v2_legacy.py
│
├── 📚 Documentation
│   ├── docs/
│   │   ├── REBUILD_ENGINE_GUIDE.md
│   │   ├── REBUILD_ENGINE_320.md
│   │   ├── telegram_workflow.md
│   │   └── changelog.txt
│   ├── README.md
│   ├── MIGRATION.md
│   └── REORGANIZATION_SUMMARY.md
│
├── 🤖 AI Models
│   ├── models/
│   │   ├── bestbaru.pt           # PyTorch model
│   │   ├── bestbaru.onnx         # ONNX format
│   │   ├── bestbaru.engine       # TensorRT engine (640x640)
│   │   └── bestbaru.engine.backup_640
│
├── ⚙️ Configuration
│   ├── config/
│   │   ├── control_panel_config.json
│   │   ├── state_main_new.json
│   │   └── v3_state.json
│
└── 🚀 Scripts
    ├── scripts/
    │   ├── rebuild_engine.py
    │   ├── start_control_panel.bat
    │   ├── start_multiprocess_test.bat
    │   └── start_telegram_bot.bat
    └── requirements.txt
```

---

## 🏛️ Architecture Overview

### **System Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERFACES                          │
├──────────────────┬──────────────────┬──────────────────────┤
│  Web Dashboard   │  Telegram Bot    │  Control Panel GUI   │
│  (React + Vite)  │  (python-telegram-bot) │  (Tkinter)     │
│  Port: 5173      │                  │                      │
└────────┬─────────┴────────┬─────────┴──────────┬───────────┘
         │                  │                    │
         │ WebSocket/HTTP   │ HTTP               │ File State
         │                  │                    │
         ▼                  ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│              API SERVER (Flask + SocketIO)                   │
│              Port: 5001                                      │
│  • REST API endpoints                                        │
│  • WebSocket real-time updates                              │
│  • Video stream proxy                                       │
│  • Google Sheets integration                                │
└────────┬────────────────────────────────────────────────────┘
         │
         │ Internal Relay / ZMQ
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│           DETECTION ENGINE (Multiple Versions)               │
├─────────────────┬─────────────────┬─────────────────────────┤
│  Integrated     │  Main V2        │  Modular V3             │
│  (Port 5001)    │  (Port 5002)    │  (Port 5002)            │
│                 │                 │                         │
│  • All-in-one   │  • Standalone   │  • Threaded/Multi-proc  │
│  • Flask+YOLO   │  • Flask server │  • Plugin architecture  │
│                 │  • Detection    │  • QR Scanner support   │
└─────────────────┴─────────────────┴─────────────────────────┘
         │                  │                    │
         │                  │                    │
         ▼                  ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                   AI DETECTION LAYER                         │
│  • YOLOv8 (PyTorch/ONNX/TensorRT)                           │
│  • Object Detection (Truck, Person, Box)                    │
│  • Counting & Tracking                                      │
│  • QR Code Detection (pyzbar)                               │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                   CAMERA INPUT                               │
│  • RTSP Stream (IP Camera)                                  │
│  • Webcam (USB/Built-in)                                    │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                   OUTPUT INTEGRATIONS                        │
├──────────────────┬──────────────────┬───────────────────────┤
│  Google Sheets   │  Telegram        │  File Logging         │
│  (gspread)       │  Notifications   │  (JSON/CSV)           │
└──────────────────┴──────────────────┴───────────────────────┘
```

---

## 🔑 Key Components Breakdown

### **1. API Server (`api_server.py`)**

**Role:** Central backend server for the web dashboard

**Key Features:**
- Flask + SocketIO for WebSocket real-time updates
- REST API endpoints for status, stats, activities
- Video stream proxy (ZMQ receiver or direct generation)
- Google Sheets integration
- Settings management
- CORS enabled for cross-origin requests

**Endpoints:**
```python
GET  /api/status              # System status
GET  /api/stats               # Detection statistics
GET  /api/activities          # Activity log
GET  /api/stream/video        # Video feed (MJPEG)
GET  /api/stream/video_raw    # Raw video feed
GET  /api/stream/start        # Start stream
GET  /api/stream/stop         # Stop stream
GET  /api/settings            # Get settings
GET  /api/sheets/status       # Sheets connection status
GET  /api/sheets/refresh      # Refresh sheets data
```

**WebSocket Events:**
```javascript
'status_update'     -> System status changes
'stats_update'      -> Detection stats
'activities_update' -> Activity log
'new_activity'      -> Single activity event
'sheets_update'     -> Google Sheets data
```

---

### **2. Detection Engine Versions**

#### **A. Integrated Main (`integrated_main.py`)**
- **All-in-one** solution combining detection + API server
- Runs detection in background thread
- Flask server serves both API and detection
- Best for simple deployments

#### **B. Main V2 (`main_v2.py`)**
- **Standalone detection** script
- Can run independently or with API server
- Flask server on port 5002 for video feed
- Google Sheets integration
- Telegram notifications
- QR code scanning support

#### **C. Modular V3 (`src/detection/gui_version_partial/`)**
- **Most advanced** modular architecture
- Multi-threaded/multi-process design
- Plugin-based output system
- Separate modules:
  - `detector.py` - Detection logic
  - `scanner.py` - QR code scanning
  - `uploader.py` - Google Sheets upload
  - `config.py` - Configuration management
  - `shared.py` - Shared data structures

#### **D. Engine Module (`engine/`)**
- **Reusable detection engine** library
- Object-oriented design
- Plugin architecture for outputs
- Components:
  - `CCTVDetectionEngine` - Main orchestrator
  - `CameraStream` - Camera connection management
  - `DetectionProcessor` - YOLO detection
  - `StreamingServer` - Video streaming
  - `OutputPlugin` - Extensible output system
  - `ConfigManager` - Configuration loader

---

### **3. Web Dashboard**

**Technology Stack:**
- React 18.2.0
- Vite 5.0.8 (build tool)
- TailwindCSS 3.4.0
- Socket.IO Client 4.7.0
- Axios 1.13.2
- Lucide React (icons)

**Components:**
1. **WarehouseAIDashboard.jsx** - Main container
2. **Header.jsx** - Top bar with status
3. **StatsCard.jsx** - Metric cards (Inbound, Outbound, Trucks, Capacity)
4. **CCTVFeed.jsx** - Live video stream with AI overlays
5. **ActivityLog.jsx** - Recent activity list

**Key Features:**
- Real-time WebSocket updates
- Live video streaming (MJPEG)
- Glass morphism UI design
- Responsive layout
- AI detection bounding box overlays
- Activity logging with driver info
- Google Sheets status indicator

---

### **4. AI Detection System**

**Model Information:**
- **Base Model:** YOLOv8 (Ultralytics)
- **Model File:** `bestbaru.pt` (PyTorch)
- **Formats Available:**
  - `.pt` - PyTorch (original)
  - `.onnx` - ONNX (cross-platform)
  - `.engine` - TensorRT (GPU optimized)

**Detection Classes:**
- Truck
- Person
- Box/Pallet

**Detection Features:**
- Object counting with persistence logic
- Zone crossing detection
- Movement tracking
- Cooldown timers to prevent double-counting
- QR code scanning for plate identification
- Bounding box visualization

**Configuration:**
```python
--imgsz 320/640    # Inference size
--conf 0.25-0.35   # Confidence threshold
--iou 0.35         # IoU threshold for NMS
```

**TensorRT Engine Issue:**
- Engine built with TensorRT v239
- System using TensorRT v240 (10.10.0.31)
- **Solution:** Rebuild engine with current version
- Script provided: `scripts/rebuild_engine.py`

---

### **5. Integration Systems**

#### **Google Sheets Integration**
- Library: `gspread` + `oauth2client`
- Service account authentication
- Real-time data logging
- Retry mechanism for failed operations
- Configurable worksheet selection

**Data Fields:**
- Plate number
- Driver name
- Item count
- Loading/Rehab status
- Timestamp

#### **Telegram Bot Integration**
- Library: `python-telegram-bot`
- Remote control capabilities
- Start/Stop loading operations
- System status monitoring
- Notification system
- Dashboard control via bot

**Bot Commands:**
```
/start           - Show main menu
/status          - System status
Action buttons:
  ▶️ START LOADING
  ⏹️ STOP LOADING
```

---

## 🔄 Data Flow

### **Detection → Dashboard Flow**

```
1. Camera (RTSP) 
   ↓
2. Detection Engine (YOLO inference)
   ↓
3. Processing (counting, tracking, zones)
   ↓
4. State Update (JSON file / memory)
   ↓
5. API Server (REST/WebSocket)
   ↓
6. Dashboard (React)
   ↓
7. User Display
```

### **Telegram Control Flow**

```
1. User presses button in Telegram Bot
   ↓
2. Bot receives callback
   ↓
3. Bot executes command (START/STOP)
   ↓
4. Bot spawns/kills main_v2.py process
   ↓
5. Bot updates API server via HTTP POST
   ↓
6. API server broadcasts via WebSocket
   ↓
7. Dashboard updates UI
```

### **Google Sheets Flow**

```
1. Detection event occurs
   ↓
2. Detection engine prepares data
   ↓
3. Uploader thread queues operation
   ↓
4. Sheets API call (with retry)
   ↓
5. Success/Failure logged
   ↓
6. Status sent to dashboard
```

---

## 📊 State Management

### **State Files:**

1. **`state_main_new.json`** (Main V2)
   - Current plate
   - Item counts
   - Detection status
   - Timer info

2. **`v3_state.json`** (Modular V3)
   - Similar structure
   - Multi-process safe

3. **`control_panel_config.json`**
   - GUI configuration
   - Camera settings
   - Model paths
   - Integration credentials

### **State Synchronization:**
- File-based state (JSON)
- Memory state (in-process)
- API state polling (every 1 second)
- WebSocket broadcasts for real-time updates

---

## 🚀 Deployment Options

### **Option 1: Integrated System**
```bash
python integrated_main.py --source <RTSP_URL>
```
- All-in-one solution
- Easiest to deploy
- Single process

### **Option 2: Separate Detection + API**
```bash
# Terminal 1: Detection
python main_v2.py --source <RTSP_URL> --plate <PLATE>

# Terminal 2: API Server
python api_server.py
```
- Separation of concerns
- Better for debugging
- Independent scaling

### **Option 3: Modular V3**
```bash
cd src/detection/gui_version_partial
python main.py
```
- Most flexible
- Multi-process architecture
- Best for development

### **Option 4: Engine Module**
```python
from engine import CCTVDetectionEngine

engine = CCTVDetectionEngine(config_path="config.yaml")
engine.start()
```
- Library-style usage
- Embedded in other applications
- Programmatic control

---

## 🌐 Network Architecture

### **Ports:**
- `5001` - API Server (Flask + SocketIO)
- `5002` - Detection Engine (Internal relay)
- `5173` - React Dashboard (Vite dev server)
- `8080` - Engine Streaming Server

### **External Services:**
- Google Sheets API
- Telegram Bot API
- RTSP Camera Stream
- Cloudflare Tunnel (optional)

### **Cloudflare Tunnel:**
- Config: `tunnel/config.yml`
- Exposes local services to internet
- Secure HTTPS access
- No port forwarding needed

---

## 📦 Dependencies

### **Python Backend:**
```
Core:
- ultralytics (YOLO)
- torch (PyTorch)
- opencv-python (cv2)
- numpy

API Server:
- flask
- flask-cors
- flask-socketio
- eventlet (optional)

Integrations:
- gspread (Google Sheets)
- oauth2client
- python-telegram-bot
- requests

Utilities:
- psutil (system monitoring)
- GPUtil (GPU monitoring)
- pyzbar (QR code)
```

### **JavaScript Frontend:**
```
Framework:
- react ^18.2.0
- react-dom ^18.2.0
- vite ^5.0.8

UI:
- tailwindcss ^3.4.0
- lucide-react ^0.300.0
- clsx ^2.1.0

Data:
- axios ^1.13.2
- socket.io-client ^4.7.0
- recharts ^2.10.0
```

---

## 🎯 Key Features Summary

### ✅ **Implemented Features:**

1. **Real-time AI Detection**
   - YOLOv8 object detection
   - Multi-class support (Truck, Person, Box)
   - TensorRT optimization

2. **Web Dashboard**
   - Live video streaming
   - Real-time statistics
   - Activity logging
   - Glass morphism UI

3. **API Server**
   - REST API
   - WebSocket real-time updates
   - Video stream proxy
   - CORS support

4. **Google Sheets Integration**
   - Automatic data logging
   - Retry mechanism
   - Status monitoring

5. **Telegram Bot**
   - Remote control
   - Status monitoring
   - Notifications
   - Dashboard interface

6. **Multiple Deployment Options**
   - Integrated system
   - Modular architecture
   - Standalone components

7. **QR Code Support**
   - Plate identification
   - Automatic scanning

### 🔄 **Version History:**

1. **V1 (icetube_main.py)** - Monolithic, archived
2. **V2 (main_v2.py)** - Improved, standalone
3. **V3 (gui_version_partial/)** - Modular, multi-process
4. **Engine Module** - Reusable library

---

## 🐛 Known Issues & Technical Debt

### **Critical Issues:**
1. ⚠️ **TensorRT Version Mismatch**
   - Engine file built with v239
   - System using v240
   - **Fix:** Run `rebuild_engine.py`

### **Technical Debt:**
1. 🔧 **Debug Print Statements**
   - Multiple DEBUG prints in production code
   - Should use proper logging

2. 🔧 **Duplicate Code**
   - Multiple versions of similar logic
   - Consider consolidation

3. 🔧 **Configuration Management**
   - Mix of file-based and command-line args
   - Need unified config system

4. 🔧 **Error Handling**
   - Some bare except clauses
   - Could be more specific

5. 🔧 **Documentation**
   - Some modules lack docstrings
   - API documentation incomplete

---

## 📈 Recommendations

### **Short-term (Priority):**
1. ✅ **Rebuild TensorRT Engine**
   - Fix version compatibility
   - Optimize for current hardware

2. ✅ **Replace DEBUG Prints**
   - Use Python logging module
   - Add log levels (INFO, WARNING, ERROR)

3. ✅ **Consolidate Configuration**
   - Single config file format
   - Environment variable support

### **Medium-term:**
1. 🔄 **Standardize on One Version**
   - Choose between V2, V3, or Engine
   - Deprecate unused versions
   - Reduce maintenance burden

2. 🔄 **Improve Error Handling**
   - Add specific exception handling
   - Implement circuit breakers
   - Better retry logic

3. 🔄 **Add Unit Tests**
   - Test detection logic
   - Test API endpoints
   - Test integrations

### **Long-term:**
1. 🎯 **Containerization**
   - Docker support
   - Kubernetes deployment
   - Easier scaling

2. 🎯 **Database Integration**
   - Replace file-based state
   - Use PostgreSQL/MongoDB
   - Better data persistence

3. 🎯 **Authentication & Authorization**
   - User management
   - Role-based access
   - API keys

4. 🎯 **Analytics & Reporting**
   - Historical data analysis
   - Performance metrics
   - Export reports

---

## 🎓 Learning Resources

### **Technology Documentation:**
- [Ultralytics YOLOv8](https://docs.ultralytics.com/)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [React Documentation](https://react.dev/)
- [Socket.IO](https://socket.io/docs/)
- [TensorRT](https://docs.nvidia.com/deeplearning/tensorrt/)

### **Project-Specific Docs:**
- `IMPLEMENTATION.md` - Dashboard implementation
- `README_INTEGRATION.md` - Integration guide
- `REBUILD_ENGINE_GUIDE.md` - TensorRT rebuild
- `telegram_workflow.md` - Telegram bot workflow
- `REORGANIZATION_SUMMARY.md` - Project restructuring

---

## 📞 Next Steps

Based on this analysis, here are suggested next steps:

1. **Immediate:** Fix TensorRT engine compatibility
2. **Clean up:** Remove debug prints, consolidate code
3. **Document:** Add API documentation, update README files
4. **Test:** Create test suite for critical components
5. **Optimize:** Profile performance, optimize bottlenecks
6. **Deploy:** Set up production environment with proper monitoring

---

**Analysis Complete! 🎉**

This document provides a comprehensive overview of the CCTV Detection System architecture, components, and recommendations for improvement.
