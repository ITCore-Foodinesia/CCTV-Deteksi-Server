# Back-End Issue Tracker - Complete Inventory

**Last Updated:** 6 Februari 2026 (Verified)  
**Total Issues:** 28  
**Status Legend:** ✅ Done | 🔄 In Progress | ⏳ Pending | ❌ Blocked

---

## Summary

| Category | Total | Done | Pending |
|----------|-------|------|---------|
| Core Infrastructure | 8 | 7 | 1 |
| API Development | 6 | 5 | 1 |
| Detection Engine | 6 | 5 | 1 |
| External Integrations | 4 | 4 | 0 |
| Security & Quality | 4 | 1 | 3 |
| **TOTAL** | **28** | **22** | **6** |

---

## Section A: Core Infrastructure (8)

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 1 | Setup Python 3.11+ environment | ✅ Done | - | `requirements.txt` configured |
| 2 | Install Flask + Flask-SocketIO | ✅ Done | - | Web framework + WebSocket support |
| 3 | Install OpenCV for video processing | ✅ Done | - | Video capture and frame processing |
| 4 | Install PyTorch + Ultralytics (YOLOv8) | ✅ Done | - | Deep learning framework |
| 5 | Setup TensorRT for GPU acceleration | ✅ Done | - | 3-5x speed improvement on NVIDIA GPUs |
| 6 | Create modular project structure (src/) | ✅ Done | - | `gui_version_testing_with_server/src/` |
| 7 | Setup configuration management (JSON configs) | ✅ Done | - | `config/` folder with unified_server.json |
| 8 | Migrate from V2 to V3 modular architecture | ⏳ Pending | 🟡 Medium | V3 in development, V2 in production |

---

## Section B: API Development (6)

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 9 | Implement GET /api/status endpoint | ✅ Done | - | Returns system status JSON |
| 10 | Implement GET /api/stats endpoint | ✅ Done | - | Returns statistics JSON |
| 11 | Implement GET /api/activities endpoint | ✅ Done | - | Returns activity log array |
| 12 | Implement GET /api/stream/video endpoint (MJPEG) | ✅ Done | - | Live video streaming |
| 13 | Add OpenAPI/Swagger documentation | ⏳ Pending | 🟡 Medium | No API docs currently |
| 14 | Add API versioning (/api/v1/*) | ✅ Done | - | V3 unified_server uses `/api` prefix with Blueprint |

---

## Section C: Detection Engine (6)

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 15 | Build Detector module (YOLOv8 wrapper) | ✅ Done | - | `detector.py` - object detection |
| 16 | Build Scanner module (QR code) | ✅ Done | - | `scanner.py` - pyzbar integration |
| 17 | Build Uploader module (Google Sheets) | ✅ Done | - | `uploader.py` - data upload |
| 18 | Build Shared state management | ✅ Done | - | `shared.py` - state persistence |
| 19 | Implement Circuit Breaker pattern | ✅ Done | - | V2: Retry queue for reliability |
| 20 | Improve detection accuracy (false positives) | ⏳ Pending | 🟡 Medium | Occasional false positive (BUG-03) |

---

## Section D: External Integrations (4)

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 21 | Google Sheets integration (gspread) | ✅ Done | - | Service account auth configured |
| 22 | Telegram Bot integration (/start, /status) | ✅ Done | - | `telegram_monitor_bot.py`, `telegram_loading_dashboard.py` |
| 23 | WebSocket events (status_update, stats_update, new_activity) | ✅ Done | - | Real-time push to dashboard |
| 24 | Supabase integration for dashboard auth | ✅ Done | - | Auth handled by dashboard frontend |

---

## Section E: Security & Quality (4)

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 25 | Implement API authentication (JWT/API key) | ⏳ Pending | 🔴 Critical | **No auth currently** - anyone can access API |
| 26 | Add rate limiting to API endpoints | ⏳ Pending | 🟡 Medium | DoS protection needed |
| 27 | Setup log rotation policy | ⏳ Pending | 🟡 Medium | Logs can grow unbounded |
| 28 | Add health check endpoint (/api/health) | ✅ Done | - | Implemented in [`routes.py`](../../gui_version_testing_with_server/src/unified_server/api/routes.py:132) |

---

## WebSocket Events Reference

| Event | Direction | Payload | Status |
|-------|-----------|---------|--------|
| `status_update` | Server → Client | `{streaming, detection_active, ...}` | ✅ Done |
| `stats_update` | Server → Client | `{loading, rehab, trucks_active}` | ✅ Done |
| `new_activity` | Server → Client | `{type, plate, driver, count, time}` | ✅ Done |
| `activities_update` | Server → Client | `[...activities]` | ✅ Done |

---

## API Endpoints Reference

| Endpoint | Method | Response | Status |
|----------|--------|----------|--------|
| `/api/status` | GET | System status JSON | ✅ Done |
| `/api/stats` | GET | Statistics JSON | ✅ Done |
| `/api/activities` | GET | Activity log array | ✅ Done |
| `/api/stream/video` | GET | MJPEG stream | ✅ Done |
| `/api/health` | GET | Health check | ✅ Done |
| `/api/v1/*` | GET | Versioned endpoints | ✅ Done (Blueprint) |

---

## Sources

This inventory was compiled from:
- [`docs/laporan-per-role/02_Backend_Developer.md`](../laporan-per-role/02_Backend_Developer.md)
- [`gui_version_testing_with_server/README.md`](../../gui_version_testing_with_server/README.md)
- Codebase analysis of backend structure

---

## GitHub Projects Labels

Recommended labels for these issues:
- `backend`
- `priority:critical` / `priority:high` / `priority:medium` / `priority:low`
- `type:bug` / `type:feature` / `type:enhancement`
- `security`
- `api`
- `status:done` / `status:in-progress` / `status:pending`
