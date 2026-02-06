# 🏗️ LAPORAN SOFTWARE ARCHITECT

**Proyek:** Sistem Monitoring CCTV Gudang Berbasis AI  
**Tanggal:** 2 Februari 2026  
**Score:** 🟢 65%

---

## 📌 RINGKASAN

Arsitektur sistem monitoring CCTV berbasis AI dengan frontend React, backend Python, dan multiple integrations. Sistem didesain untuk single-server deployment dengan kemampuan real-time processing.

---

## 🏛️ ARCHITECTURE OVERVIEW

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SYSTEM ARCHITECTURE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                         DATA SOURCES                                 │  │
│   │                                                                     │  │
│   │   ┌───────────────┐    ┌───────────────┐    ┌───────────────┐      │  │
│   │   │  CCTV Camera  │    │  QR Scanner   │    │  Telegram     │      │  │
│   │   │  (RTSP)       │    │  (pyzbar)     │    │  (Commands)   │      │  │
│   │   └───────┬───────┘    └───────┬───────┘    └───────┬───────┘      │  │
│   │           │                    │                    │               │  │
│   └───────────┼────────────────────┼────────────────────┼───────────────┘  │
│               │                    │                    │                   │
│               ↓                    ↓                    ↓                   │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                       PROCESSING LAYER                               │  │
│   │                                                                     │  │
│   │   ┌─────────────────────────────────────────────────────────────┐  │  │
│   │   │                   DETECTION ENGINE                           │  │  │
│   │   │   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐       │  │  │
│   │   │   │ OpenCV      │──→│ YOLOv8      │──→│ Post-       │       │  │  │
│   │   │   │ Capture     │   │ TensorRT    │   │ Processing  │       │  │  │
│   │   │   └─────────────┘   └─────────────┘   └─────────────┘       │  │  │
│   │   └─────────────────────────────────────────────────────────────┘  │  │
│   │                                │                                    │  │
│   │                                ↓                                    │  │
│   │   ┌─────────────────────────────────────────────────────────────┐  │  │
│   │   │                    API SERVER                                │  │  │
│   │   │   ┌───────────┐   ┌───────────┐   ┌───────────┐             │  │  │
│   │   │   │ REST API  │   │ WebSocket │   │ Streaming │             │  │  │
│   │   │   │ (Flask)   │   │ (SocketIO)│   │ (MJPEG)   │             │  │  │
│   │   │   └───────────┘   └───────────┘   └───────────┘             │  │  │
│   │   └─────────────────────────────────────────────────────────────┘  │  │
│   │                                                                     │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                │                                            │
│               ┌────────────────┼────────────────┐                          │
│               ↓                ↓                ↓                          │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                         OUTPUT LAYER                                 │  │
│   │                                                                     │  │
│   │   ┌───────────────┐    ┌───────────────┐    ┌───────────────┐      │  │
│   │   │  Dashboard    │    │  Google       │    │  Telegram     │      │  │
│   │   │  (React)      │    │  Sheets       │    │  Bot          │      │  │
│   │   └───────────────┘    └───────────────┘    └───────────────┘      │  │
│   │                                                                     │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🧩 COMPONENT BREAKDOWN

### 1. Frontend (Dashboard)

| Aspect | Details |
|--------|---------|
| **Framework** | React 18 + Vite |
| **Styling** | Tailwind CSS |
| **State** | React Context + Hooks |
| **Real-time** | Socket.IO Client |
| **Auth** | Supabase Auth |
| **Hosting** | Vercel |

### 2. Backend (Detection Engine + API)

| Aspect | Details |
|--------|---------|
| **Language** | Python 3.11 |
| **AI Framework** | PyTorch + Ultralytics |
| **GPU Accel** | TensorRT / CUDA |
| **Web Framework** | Flask + Flask-SocketIO |
| **Video** | OpenCV |
| **Hosting** | Local Server |

### 3. Integrations

| Service | Purpose | Protocol |
|---------|---------|----------|
| Google Sheets | Data logging | REST API |
| Telegram | Notifications + Control | Bot API |
| Supabase | Auth + Database | REST + Realtime |
| RTSP Cameras | Video source | RTSP |

---

## 🔌 INTEGRATION PATTERNS

### REST API

```
Client ──HTTP GET/POST──→ Flask Server ──→ Response (JSON)
```

**Used for:**
- Status queries
- Statistics
- Activity logs

### WebSocket (Socket.IO)

```
Client ←──Socket.IO──→ Flask-SocketIO Server
         (bidirectional)
```

**Used for:**
- Real-time stats updates
- Activity notifications
- Connection status

### MJPEG Streaming

```
Client ──HTTP GET──→ Flask ──→ Continuous MJPEG Stream
```

**Used for:**
- Live video feed

### Event-Driven (Telegram)

```
User ──Telegram──→ Bot ──Commands──→ Detection Engine
Detection Engine ──Events──→ Bot ──Telegram──→ User
```

---

## 📊 DATA FLOW

### Detection Flow

```
1. RTSP Camera → OpenCV capture (30 fps)
2. OpenCV → YOLOv8 TensorRT inference
3. YOLOv8 → Detection results (boxes, classes, confidence)
4. Post-processing → Line crossing detection
5. Results → Multiple outputs:
   a. API Server (WebSocket broadcast)
   b. Google Sheets (append row)
   c. Telegram (notification)
```

### Dashboard Flow

```
1. User opens Dashboard → Initial HTTP requests:
   - GET /api/status
   - GET /api/stats
   - GET /api/activities
2. WebSocket connection established
3. Dashboard receives real-time updates:
   - stats_update
   - new_activity
   - status_update
4. Video stream via MJPEG:
   - GET /api/stream/video
```

---

## 🎯 DESIGN DECISIONS

### Why These Technologies?

| Decision | Rationale |
|----------|-----------|
| **React** | Modern UI, component-based, large ecosystem |
| **Tailwind** | Rapid development, consistent styling |
| **Python** | AI/ML ecosystem, OpenCV support |
| **Flask** | Simple, Flask-SocketIO for WebSocket |
| **TensorRT** | 3-5x speed improvement on NVIDIA GPUs |
| **Google Sheets** | Accessible, no setup, stakeholder-friendly |
| **Supabase** | Managed auth, PostgreSQL, realtime |

### Trade-offs

| Decision | Pros | Cons |
|----------|------|------|
| Google Sheets as DB | Easy access, no DB setup | Not ACID, rate limits |
| Single server | Simple deployment | Single point of failure |
| MJPEG streaming | Universal browser support | Higher bandwidth |
| Flask (not FastAPI) | Flask-SocketIO mature | Less performant for REST |

---

## 🏗️ MODULE ARCHITECTURE

### Backend Modules

```
src/
├── api/                    # API Layer
│   ├── api_server.py       # REST + WebSocket server
│   └── api_server_gen_frames.py
│
├── detection/              # AI Detection
│   └── gui_version_partial/
│       ├── main.py         # Orchestration
│       ├── detector.py     # YOLOv8 wrapper
│       ├── scanner.py      # QR code
│       ├── uploader.py     # Google Sheets
│       ├── shared.py       # State management
│       └── config.py       # Configuration
│
├── unified_server/         # Combined Server
│   ├── main.py
│   ├── config.py
│   └── api/
│       ├── routes.py
│       ├── streaming.py
│       └── websocket.py
│
├── gui/                    # Desktop GUI
│   └── icetube_control_panel.py
│
└── integrations/           # External Services
    ├── telegram/
    └── sheets/
```

### Dependency Graph

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    MAIN ORCHESTRATOR                    │
│                         │                               │
│         ┌───────────────┼───────────────┐               │
│         ↓               ↓               ↓               │
│    ┌─────────┐    ┌─────────┐    ┌─────────┐           │
│    │ Detector│    │ Scanner │    │ Uploader│           │
│    └────┬────┘    └────┬────┘    └────┬────┘           │
│         │              │              │                 │
│         └──────────────┼──────────────┘                 │
│                        ↓                                │
│                  ┌─────────┐                            │
│                  │ Shared  │                            │
│                  │ State   │                            │
│                  └─────────┘                            │
│                        ↓                                │
│                  ┌─────────┐                            │
│                  │ Config  │                            │
│                  └─────────┘                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📈 SCALABILITY ASSESSMENT

### Current Capacity

| Metric | Capacity |
|--------|----------|
| Cameras | 1-2 (single GPU) |
| Concurrent users | ~100 (WebSocket) |
| Detection FPS | ~25 |
| Data throughput | ~1000 events/hour |

### Scaling Options

| Scenario | Strategy |
|----------|----------|
| More cameras | Multiple GPU or distributed processing |
| More users | WebSocket server scaling |
| Data volume | Migrate to PostgreSQL + time-series |
| Geographic | Multi-region deployment |

### Bottlenecks

| Component | Bottleneck | Mitigation |
|-----------|------------|------------|
| GPU | Single GPU limit | Multi-GPU or distributed |
| Google Sheets | Rate limits | Queue + batch write |
| WebSocket | Connection limit | Horizontal scaling |
| MJPEG | Bandwidth | Adaptive quality |

---

## 🔒 SECURITY ARCHITECTURE

### Current State

```
┌─────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Internet                                              │
│       │                                                 │
│       ↓                                                 │
│   ┌─────────────────────────────────────────────────┐  │
│   │           FRONTEND (Vercel)                      │  │
│   │   ✅ HTTPS (Vercel default)                      │  │
│   │   ✅ Supabase Auth                               │  │
│   └─────────────────────────────────────────────────┘  │
│       │                                                 │
│       ↓                                                 │
│   ┌─────────────────────────────────────────────────┐  │
│   │           BACKEND (Local/Cloud)                  │  │
│   │   ❌ No API Auth                                 │  │
│   │   ❌ No Rate Limiting                            │  │
│   │   ⚠️ CORS (potentially open)                     │  │
│   └─────────────────────────────────────────────────┘  │
│       │                                                 │
│       ↓                                                 │
│   ┌─────────────────────────────────────────────────┐  │
│   │           EXTERNAL SERVICES                      │  │
│   │   ✅ Google: Service Account                     │  │
│   │   ✅ Telegram: Bot Token                         │  │
│   │   ✅ Supabase: Row Level Security               │  │
│   └─────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Recommended Improvements

1. **API Authentication** - JWT or API keys
2. **Network Segmentation** - Separate detection network
3. **TLS Everywhere** - HTTPS for all endpoints
4. **Secrets Management** - Vault or similar

---

## 📋 TECHNICAL DEBT

### High Priority

| Item | Impact | Effort | Recommendation |
|------|--------|--------|----------------|
| No API auth | Security risk | Medium | Implement JWT |
| No testing | Quality risk | Medium | Add test suite |
| Hardcoded config | Maintainability | Low | Environment-based |
| Google Sheets as DB | Scalability | High | Migrate to PostgreSQL |

### Medium Priority

| Item | Impact | Effort | Recommendation |
|------|--------|--------|----------------|
| No CI/CD | Development velocity | Medium | GitHub Actions |
| No Docker | Deployment consistency | Medium | Containerize |
| Manual deployment | Reliability | Medium | Automate |
| No monitoring | Observability | Medium | Add Grafana/Loki |

### Low Priority

| Item | Impact | Effort | Recommendation |
|------|--------|--------|----------------|
| No API versioning | Future compatibility | Low | Add /api/v1 |
| No health endpoints | Operations | Low | Add /health |
| No OpenAPI docs | Developer experience | Low | Add Swagger |

---

## 🗺️ ARCHITECTURE ROADMAP

### Phase 1: Stabilization (Current + 1 Month)

```
┌─────────────────────────────────────────────────────────┐
│ PHASE 1: STABILIZATION                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   □ Add API authentication (JWT)                        │
│   □ Implement automated testing                         │
│   □ Add CI/CD pipeline                                  │
│   □ Containerize with Docker                            │
│   □ Add health check endpoints                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Phase 2: Reliability (Month 2-3)

```
┌─────────────────────────────────────────────────────────┐
│ PHASE 2: RELIABILITY                                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   □ Migrate to PostgreSQL (Supabase or dedicated)       │
│   □ Add centralized logging                             │
│   □ Add metrics & monitoring                            │
│   □ Implement proper backup strategy                    │
│   □ Create disaster recovery plan                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Phase 3: Scalability (Month 4-6)

```
┌─────────────────────────────────────────────────────────┐
│ PHASE 3: SCALABILITY                                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   □ Kubernetes deployment                               │
│   □ Multi-camera support                                │
│   □ WebSocket scaling                                   │
│   □ CDN for static assets                               │
│   □ Evaluate microservices (if needed)                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📚 ARCHITECTURE DECISION RECORDS (ADRs)

### ADR-001: Use Google Sheets for Data Storage

**Status:** Accepted (with plan to migrate)

**Context:** Need simple, accessible data storage for MVP.

**Decision:** Use Google Sheets via gspread.

**Consequences:**
- ✅ Easy stakeholder access
- ✅ No database setup
- ❌ Not ACID compliant
- ❌ Rate limits
- ❌ Not scalable

**Future:** Migrate to PostgreSQL when needed.

---

### ADR-002: Flask over FastAPI for Backend

**Status:** Accepted

**Context:** Need WebSocket support with video streaming.

**Decision:** Use Flask + Flask-SocketIO.

**Consequences:**
- ✅ Mature WebSocket support
- ✅ Simple to use
- ❌ Less performant than ASGI
- ❌ No async by default

---

### ADR-003: Single Server Deployment

**Status:** Accepted (for MVP)

**Context:** Simple deployment, GPU processing required.

**Decision:** Deploy all components on single server.

**Consequences:**
- ✅ Simple deployment
- ✅ Low latency between components
- ❌ Single point of failure
- ❌ Harder to scale

---

## ⚠️ CATATAN & REKOMENDASI

| Area | Status | Catatan |
|------|--------|---------|
| Overall Architecture | ✅ Solid for MVP | Works well for current scale |
| Security | ⚠️ Needs Work | API auth required |
| Scalability | ⚠️ Limited | Single server bottleneck |
| Observability | ❌ Minimal | Need logging + monitoring |
| Documentation | ⚠️ Partial | ADRs + API docs needed |
| Technical Debt | ⚠️ Accumulating | Prioritize cleanup |

---

## 🎯 ACTION ITEMS

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| 🔴 High | API authentication | Medium | Security |
| 🔴 High | Database migration plan | Low | Scalability |
| 🔴 High | CI/CD pipeline | Medium | Reliability |
| 🟡 Medium | Docker containerization | Medium | Deployment |
| 🟡 Medium | Monitoring setup | Medium | Observability |
| 🟢 Low | API documentation | Low | DX |
| 🟢 Low | ADR documentation | Low | Knowledge |

---

*Laporan dibuat oleh: Software Orchestrator*
*Tanggal: 2 Februari 2026*
