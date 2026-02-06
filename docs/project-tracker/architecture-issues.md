# Software Architect Issue Tracker - Complete Inventory

**Last Updated:** 6 Februari 2026 (Verified by Software Architect Mode)
**Total Issues:** 24
**Status Legend:** ✅ Done | 🔄 In Progress | ⏳ Pending | ❌ Blocked

---

## Summary

| Category | Total | Done | Pending |
|----------|-------|------|---------|
| Architecture Design | 6 | 5 | 1 |
| Integration Patterns | 4 | 4 | 0 |
| Technical Debt | 6 | 1 | 5 |
| Documentation | 4 | 1 | 3 |
| Scalability | 4 | 1 | 3 |
| **TOTAL** | **24** | **12** | **12** |

---

## Section A: Architecture Design (6)

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 1 | Design high-level system architecture | ✅ Done | - | Data sources → Processing → Output |
| 2 | Design frontend architecture (React + Vite) | ✅ Done | - | Component-based, Tailwind, Supabase Auth |
| 3 | Design backend architecture (Python + Flask) | ✅ Done | - | Detection engine + API server |
| 4 | Design modular backend structure (V3) | ✅ Done | - | `src/` with api, detection, gui, integrations |
| 5 | Design data flow architecture | ✅ Done | - | Detection → API/Sheets/Telegram |
| 6 | Create Architecture Decision Records (ADRs) | ⏳ Pending | 🟢 Low | ADR-001 to ADR-003 documented, need more |

---

## Section B: Integration Patterns (4) ✅

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 7 | Implement REST API pattern | ✅ Done | - | Flask endpoints for status/stats/activities |
| 8 | Implement WebSocket pattern (Socket.IO) | ✅ Done | - | Real-time bidirectional communication |
| 9 | Implement MJPEG streaming pattern | ✅ Done | - | Live video feed to dashboard |
| 10 | Implement event-driven pattern (Telegram) | ✅ Done | - | Commands → Engine → Notifications |

---

## Section C: Technical Debt (6)

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 11 | Implement API authentication (JWT) | ⏳ Pending | 🔴 Critical | Security risk |
| 12 | Add automated testing suite | ⏳ Pending | 🔴 High | Quality risk |
| 13 | Move hardcoded config to environment | ⏳ Pending | 🟡 Medium | Maintainability |
| 14 | Plan migration from Google Sheets to PostgreSQL | ⏳ Pending | 🔴 High | Scalability, ACID compliance |
| 15 | Setup CI/CD pipeline | ⏳ Pending | 🔴 High | Development velocity |
| 16 | Google Sheets as DB (accepted debt) | ✅ Done | - | ADR-001: Acceptable for MVP |

---

## Section D: Documentation (4)

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 17 | Document system architecture (diagrams) | ✅ Done | - | [`docs/laporan-per-role/08_Software_Architect.md`](../laporan-per-role/08_Software_Architect.md) |
| 18 | Document API endpoints (OpenAPI) | ⏳ Pending | 🟡 Medium | No Swagger/OpenAPI docs |
| 19 | Document ADRs formally | ⏳ Pending | 🟢 Low | ADR template needed |
| 20 | Document deployment architecture | ⏳ Pending | 🟡 Medium | Current vs future state |

---

## Section E: Scalability (4)

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 21 | Add Docker containerization | ⏳ Pending | 🟡 Medium | Deployment consistency |
| 22 | Setup monitoring/observability | ⏳ Pending | 🟡 Medium | Grafana, Loki, metrics |
| 23 | Add health check endpoints | ✅ Done | - | `/api/health` endpoint implemented in [`routes.py`](../../gui_version_testing_with_server/src/unified_server/api/routes.py:132) |
| 24 | Plan multi-camera scaling | ⏳ Pending | 🟢 Low | Currently 1-2 cameras on single GPU |

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SYSTEM ARCHITECTURE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                         DATA SOURCES                                 │  │
│   │   ┌───────────────┐    ┌───────────────┐    ┌───────────────┐      │  │
│   │   │  CCTV Camera  │    │  QR Scanner   │    │  Telegram     │      │  │
│   │   │  (RTSP)       │    │  (pyzbar)     │    │  (Commands)   │      │  │
│   │   └───────────────┘    └───────────────┘    └───────────────┘      │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                       PROCESSING LAYER                               │  │
│   │   ┌─────────────────────────────────────────────────────────────┐  │  │
│   │   │                   DETECTION ENGINE                           │  │  │
│   │   │   OpenCV Capture → YOLOv8 TensorRT → Post-Processing        │  │  │
│   │   └─────────────────────────────────────────────────────────────┘  │  │
│   │   ┌─────────────────────────────────────────────────────────────┐  │  │
│   │   │                    API SERVER                                │  │  │
│   │   │   REST API (Flask) │ WebSocket (SocketIO) │ Streaming       │  │  │
│   │   └─────────────────────────────────────────────────────────────┘  │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                         OUTPUT LAYER                                 │  │
│   │   ┌───────────────┐    ┌───────────────┐    ┌───────────────┐      │  │
│   │   │  Dashboard    │    │  Google       │    │  Telegram     │      │  │
│   │   │  (React)      │    │  Sheets       │    │  Bot          │      │  │
│   │   └───────────────┘    └───────────────┘    └───────────────┘      │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### Frontend (Dashboard)

| Aspect | Details |
|--------|---------|
| **Framework** | React 18 + Vite |
| **Styling** | Tailwind CSS |
| **State** | React Context + Hooks |
| **Real-time** | Socket.IO Client |
| **Auth** | Supabase Auth |
| **Hosting** | Vercel |

### Backend (Detection Engine + API)

| Aspect | Details |
|--------|---------|
| **Language** | Python 3.11 |
| **AI Framework** | PyTorch + Ultralytics |
| **GPU Accel** | TensorRT / CUDA |
| **Web Framework** | Flask + Flask-SocketIO |
| **Video** | OpenCV |
| **Hosting** | Local Server |

### Integrations

| Service | Purpose | Protocol |
|---------|---------|----------|
| Google Sheets | Data logging | REST API |
| Telegram | Notifications + Control | Bot API |
| Supabase | Auth + Database | REST + Realtime |
| RTSP Cameras | Video source | RTSP |

---

## Design Decisions (ADRs)

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

## Current Capacity

| Metric | Capacity |
|--------|----------|
| Cameras | 1-2 (single GPU) |
| Concurrent users | ~100 (WebSocket) |
| Detection FPS | ~25 |
| Data throughput | ~1000 events/hour |

---

## Scaling Options

| Scenario | Strategy |
|----------|----------|
| More cameras | Multiple GPU or distributed processing |
| More users | WebSocket server scaling |
| Data volume | Migrate to PostgreSQL + time-series |
| Geographic | Multi-region deployment |

---

## Architecture Roadmap

### Phase 1: Stabilization (Current + 1 Month)

- ⏳ Add API authentication (JWT)
- ⏳ Implement automated testing
- ⏳ Add CI/CD pipeline
- ⏳ Containerize with Docker
- ⏳ Add health check endpoints

### Phase 2: Reliability (Month 2-3)

- ⏳ Migrate to PostgreSQL (Supabase or dedicated)
- ⏳ Add centralized logging
- ⏳ Add metrics & monitoring
- ⏳ Implement proper backup strategy
- ⏳ Create disaster recovery plan

### Phase 3: Scalability (Month 4-6)

- ⏳ Kubernetes deployment
- ⏳ Multi-camera support
- ⏳ WebSocket scaling
- ⏳ CDN for static assets
- ⏳ Evaluate microservices (if needed)

---

## Bottlenecks Identified

| Component | Bottleneck | Mitigation |
|-----------|------------|------------|
| GPU | Single GPU limit | Multi-GPU or distributed |
| Google Sheets | Rate limits | Queue + batch write |
| WebSocket | Connection limit | Horizontal scaling |
| MJPEG | Bandwidth | Adaptive quality |

---

## Sources

This inventory was compiled from:
- [`docs/laporan-per-role/08_Software_Architect.md`](../laporan-per-role/08_Software_Architect.md)
- System architecture analysis
- Codebase structure review

---

## GitHub Projects Labels

Recommended labels for these issues:
- `architecture`
- `priority:critical` / `priority:high` / `priority:medium` / `priority:low`
- `type:tech-debt` / `type:documentation` / `type:scalability`
- `adr`
- `design-decision`
- `status:done` / `status:in-progress` / `status:pending`
