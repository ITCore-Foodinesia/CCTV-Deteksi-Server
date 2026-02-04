# Test Plan: Mock Loading Dashboard & Flutter Integration + Live CCTV Dashboard

## 1. Overview

**Purpose**: Testing flow integrasi antara Flutter App → Supabase Database → Mock CCTV Engine → **React Dashboard Live Streaming** untuk fitur:
- **Streaming**: Menampilkan data driver yang sedang loading dari semua dock
- **Loading Confirmation**: Trigger saat driver klik "Mulai Loading" di Flutter
- **Dummy Counting**: Simulasi counting untuk testing tanpa CCTV asli
- **Dashboard Integration**: Terhubung dengan Live CCTV Dashboard (React)

**Scope**: 
- ✅ Mock Loading Dashboard (`mock_loading_dashboard.py`)
- ✅ Supabase Realtime Integration
- ✅ API Endpoints untuk display & simulation
- ✅ **Dashboard-Compatible Endpoints** (sama seperti api_server.py)
- ✅ **Socket.IO untuk realtime updates ke React Dashboard**
- ✅ **MJPEG Video Streaming untuk CCTVFeed component**
- ❌ Out of scope: Flutter app internal, YOLO detection accuracy

---

## 2. Test Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TEST FLOW DIAGRAM                                   │
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────────┐   │
│  │ Flutter App  │───▶│   Supabase   │───▶│ Mock Loading Dashboard       │   │
│  │              │    │   Database   │    │                              │   │
│  │ "Mulai       │    │              │    │ - Display all loading drivers│   │
│  │  Loading"    │    │ loading_     │    │ - From ALL docks             │   │
│  │  Button      │    │ sessions     │    │ - Live count updates         │   │
│  └──────────────┘    │ table        │    │ - Simulate counting          │   │
│         │            └──────────────┘    └──────────────────────────────┘   │
│         │                   │                         │                      │
│         ▼                   ▼                         ▼                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────────┐   │
│  │   INSERT     │    │  Realtime    │    │ Web Dashboard                │   │
│  │   status=    │───▶│  Event       │───▶│ http://localhost:5003        │   │
│  │   'loading'  │    │  Broadcast   │    │ /dashboard                   │   │
│  └──────────────┘    └──────────────┘    └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Components

### 3.1 Mock Loading Dashboard Server
**File**: `gui_version_testing_with_server/src/testing/mock_loading_dashboard.py`

| Feature | Description |
|---------|-------------|
| Supabase Connection | Auto-connect menggunakan env vars |
| Realtime Subscription | Subscribe ke `loading_sessions` table |
| Multi-Dock Display | Menampilkan semua sesi dari semua dock |
| Driver Info | Nama driver, kode, phone number |
| Counting Display | `loading_count`, `rehab_count` realtime |
| Simulation Mode | Optional auto-increment counts |
| **Socket.IO** | Realtime updates ke React Dashboard |
| **MJPEG Stream** | Video feed untuk CCTVFeed component |

### 3.2 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Server health check |
| `/stats` | GET | Server statistics |
| `/sessions` | GET | Semua active loading sessions |
| `/sessions/<id>` | GET | Session by ID |
| `/sessions/by-dock/<code>` | GET | Sessions filtered by dock |
| `/sessions/by-driver/<id>` | GET | Sessions by driver ID |
| `/dashboard` | GET | HTML dashboard (visual) |
| `/simulate/start-loading` | POST | Simulate Flutter "Mulai Loading" |
| `/simulate/stop-loading/<id>` | POST | Simulate "Selesai Loading" |
| `/simulate/increment-count/<id>` | POST | Manual count increment |

### 3.3 Dashboard-Compatible API Endpoints (untuk React Dashboard)

| Endpoint | Method | Description | Used By |
|----------|--------|-------------|---------|
| `/api/status` | GET | Status server | `useWebSocket.js` |
| `/api/stats` | GET | Stats (inbound/outbound/trucks) | `LiveStreamingPage.jsx` |
| `/api/activities` | GET | Activity log | `ActivityLog.jsx` |
| `/api/sheets/status` | GET | Google Sheets data format | `useWebSocket.js` |
| `/api/stream/video` | GET | MJPEG video stream | `CCTVFeed.jsx` |
| `/video_feed` | GET | Alias untuk video stream | `mock_main_v3.py` compatible |

### 3.4 Socket.IO Events (Realtime)

| Event | Direction | Data |
|-------|-----------|------|
| `connect` | Client→Server | - |
| `status_update` | Server→Client | `{status: 'Connected'}` |
| `stats_update` | Server→Client | `{inbound, outbound, trucks, fps}` |
| `sheets_update` | Server→Client | `{latest_plate, loading_count, rehab_count, ...}` |
| `request_stats` | Client→Server | - |
| `activities_update` | Server→Client | `[{id, type, description, timestamp}]` |

---

## 4. Test Cases

### 4.1 Unit Tests

| ID | Test Case | Priority | Expected Result |
|----|-----------|----------|-----------------|
| UT-01 | Format session extracts driver info | P0 | Driver name, phone, code extracted |
| UT-02 | Format session extracts dock info | P0 | Dock code, name extracted |
| UT-03 | Format handles missing joins | P1 | Graceful default values |
| UT-04 | INSERT event adds to active | P0 | Session added to dict |
| UT-05 | UPDATE event updates counts | P0 | Counts updated in-place |
| UT-06 | DELETE/complete removes session | P0 | Session removed from dict |

### 4.2 Integration Tests

| ID | Test Case | Priority | Expected Result |
|----|-----------|----------|-----------------|
| IT-01 | Health endpoint returns ok | P0 | `{"status": "ok"}` |
| IT-02 | Sessions endpoint returns list | P0 | `count` and `sessions` array |
| IT-03 | Filter by dock works | P1 | Only matching dock sessions |
| IT-04 | Start loading requires fields | P0 | 400 error on missing fields |
| IT-05 | Start loading creates session | P0 | Session created in Supabase |
| IT-06 | Increment count updates | P1 | Count increases correctly |
| IT-07 | Stop loading completes session | P0 | Status → 'completed' |

### 4.3 E2E Flow Tests

| ID | Test Case | Priority | Steps |
|----|-----------|----------|-------|
| E2E-01 | Full loading flow | P0 | 1. Start → 2. Count updates → 3. Complete |
| E2E-02 | Multi-dock concurrent | P1 | 2 docks loading simultaneously |
| E2E-03 | Driver switch dock | P2 | Complete one, start another |

---

## 5. How to Run Tests

### 5.1 Prerequisites

```bash
# Install dependencies
pip install flask supabase python-dotenv pytest requests

# Set environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
# Or use SUPABASE_SERVICE_ROLE_KEY for full access
```

### 5.2 Start Mock Server

```bash
# Option 1: Using batch script (Windows)
cd gui_version_testing_with_server
scripts\start_mock_loading_dashboard.bat

# Option 2: Direct Python
cd gui_version_testing_with_server
python -m src.testing.mock_loading_dashboard

# Option 3: With TUI dashboard
python -m src.testing.mock_loading_dashboard --tui

# Option 4: With counting simulation
python -m src.testing.mock_loading_dashboard --simulate --interval 2
```

### 5.3 Run Tests

```bash
# Unit tests only (no server needed)
pytest tests/integration/test_loading_dashboard_flow.py -v -m "not integration"

# Integration tests (server must be running)
pytest tests/integration/test_loading_dashboard_flow.py -v -m "integration"

# All tests with coverage
pytest tests/integration/test_loading_dashboard_flow.py -v --cov=gui_version_testing_with_server
```

---

## 6. Manual Testing Guide

### 6.1 Visual Dashboard Test

1. Start the mock server:
   ```bash
   python -m src.testing.mock_loading_dashboard
   ```

2. Open browser: `http://localhost:5003/dashboard`

3. In another terminal, simulate Flutter action:
   ```bash
   curl -X POST http://localhost:5003/simulate/start-loading \
     -H "Content-Type: application/json" \
     -d '{"driver_id":"driver-001","dock_id":"dock-001","plate_number":"B 1234 ABC"}'
   ```

4. Watch the dashboard - should show new loading session

5. Simulate counting:
   ```bash
   curl -X POST http://localhost:5003/simulate/increment-count/<session-id> \
     -H "Content-Type: application/json" \
     -d '{"loading_increment": 5}'
   ```

6. Complete session:
   ```bash
   curl -X POST http://localhost:5003/simulate/stop-loading/<session-id>
   ```

### 6.2 Multi-Dock Test

1. Open 2 terminal windows

2. Terminal 1 - Dock 1:
   ```bash
   curl -X POST http://localhost:5003/simulate/start-loading \
     -d '{"driver_id":"driver-001","dock_id":"dock-001","plate_number":"B 1111 AAA"}'
   ```

3. Terminal 2 - Dock 2:
   ```bash
   curl -X POST http://localhost:5003/simulate/start-loading \
     -d '{"driver_id":"driver-002","dock_id":"dock-002","plate_number":"B 2222 BBB"}'
   ```

4. Verify both appear on dashboard

5. Filter by dock:
   ```bash
   curl http://localhost:5003/sessions/by-dock/D01
   curl http://localhost:5003/sessions/by-dock/D02
   ```

### 6.3 Connect to React Live CCTV Dashboard

**YA, mock test ini terhubung ke Dashboard Live CCTV Streaming!**

Untuk menghubungkan React Dashboard ke mock server:

1. **Start Mock Server:**
   ```bash
   cd gui_version_testing_with_server
   python -m src.testing.mock_loading_dashboard --simulate
   ```

2. **Create `.env.local` di folder dashboard:**
   ```bash
   # dashboard/.env.local
   VITE_API_URL=http://localhost:5003
   VITE_EDGE_URL=http://localhost:5003
   ```

3. **Start React Dashboard:**
   ```bash
   cd dashboard
   npm run dev
   ```

4. **Open Dashboard in Browser:**
   - Go to: `http://localhost:5173/dashboard/live`
   - CCTVFeed component akan mengambil video dari `/api/stream/video`
   - Stats (Barang Masuk, Barang Keluar) akan update via Socket.IO
   - Loading Dock indicator akan menampilkan driver yang sedang loading

5. **Verify Integration:**
   - Video stream shows mock CCTV dengan info session
   - Stats update realtime saat counting
   - "LIVE" badge muncul di video
   - Activity log menampilkan loading sessions

**Architecture:**
```
┌──────────────────┐     ┌─────────────────────────────────────┐
│  React Dashboard │     │     Mock Loading Dashboard           │
│  (localhost:5173)│     │     (localhost:5003)                 │
│                  │     │                                      │
│  - CCTVFeed ─────│────▶│─── /api/stream/video (MJPEG)        │
│  - useWebSocket ─│────▶│─── Socket.IO (realtime stats)       │
│  - LiveStreaming │     │─── /api/sheets/status               │
│                  │     │                                      │
└──────────────────┘     └─────────────────────────────────────┘
                                        │
                                        ▼
                               ┌────────────────┐
                               │   Supabase     │
                               │   Database     │
                               │                │
                               │ loading_sessions│
                               │    (realtime)  │
                               └────────────────┘
                                        ▲
                                        │
                               ┌────────────────┐
                               │  Flutter App   │
                               │ "Mulai Loading"│
                               └────────────────┘
```

---

## 7. Test Data Setup

### 7.1 Seed Data (Supabase)

Ensure these exist in your database:

```sql
-- Test Drivers
INSERT INTO drivers (id, name, phone, driver_code, status, tenant_id) VALUES
('driver-001', 'Pak Budi', '08123456001', 'DRV001', 'active', 'test-tenant-001'),
('driver-002', 'Pak Andi', '08123456002', 'DRV002', 'active', 'test-tenant-001');

-- Test Docks
INSERT INTO docks (id, dock_code, dock_name, status, tenant_id) VALUES
('dock-001', 'D01', 'Dock 1', 'available', 'test-tenant-001'),
('dock-002', 'D02', 'Dock 2', 'available', 'test-tenant-001'),
('dock-003', 'D03', 'Dock 3', 'available', 'test-tenant-001');

-- Test Trucks
INSERT INTO trucks (id, plate_number, truck_type, status, tenant_id) VALUES
('truck-001', 'B 1234 ABC', 'Box', 'available', 'test-tenant-001'),
('truck-002', 'B 5678 DEF', 'Fuso', 'available', 'test-tenant-001');
```

---

## 8. Expected Behavior Matrix

| Flutter Action | Supabase Event | Dashboard Response |
|----------------|----------------|-------------------|
| Klik "Mulai Loading" | INSERT status='loading' | Driver appears on dashboard |
| Counting berlangsung | UPDATE loading_count | Count updates realtime |
| Klik "Selesai" | UPDATE status='completed' | Driver removed from list |
| Cancel session | UPDATE status='cancelled' | Driver removed from list |

---

## 9. Troubleshooting

### Problem: Supabase not connected

**Symptoms**: Server starts but shows "Running without Supabase connection"

**Solution**:
```bash
# Check env vars are set
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY

# Or create .env file in gui_version_testing_with_server/
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-key
```

### Problem: Realtime events not received

**Symptoms**: Dashboard doesn't update when sessions created externally

**Solution**:
1. Check Realtime is enabled on `loading_sessions` table
2. Verify RLS policies allow SELECT for the key being used
3. Check Supabase Realtime quota

### Problem: Sessions not showing driver names

**Symptoms**: Driver shows as "Unknown Driver"

**Solution**:
1. Verify foreign key relationship exists
2. Check RLS on `drivers` table allows SELECT
3. Ensure `driver_id` in session matches existing driver

---

## 10. Files Created

| File | Purpose |
|------|---------|
| `gui_version_testing_with_server/src/testing/mock_loading_dashboard.py` | Main mock server |
| `gui_version_testing_with_server/scripts/start_mock_loading_dashboard.bat` | Windows starter script |
| `tests/integration/test_loading_dashboard_flow.py` | Test cases |
| `tests/MOCK_LOADING_DASHBOARD_TEST_GUIDE.md` | This documentation |

---

## 11. Entry/Exit Criteria

### Entry Criteria (Ready to Test)
- [ ] Supabase credentials configured
- [ ] Seed data inserted
- [ ] Mock server starts without error
- [ ] `/health` endpoint returns 200

### Exit Criteria (Testing Complete)
- [ ] All P0 test cases pass
- [ ] Multi-dock display verified
- [ ] Counting simulation works
- [ ] Session lifecycle complete (start → count → stop)
- [ ] No blocking bugs

---

*Version 1.0 - Mock Loading Dashboard Test Guide*
