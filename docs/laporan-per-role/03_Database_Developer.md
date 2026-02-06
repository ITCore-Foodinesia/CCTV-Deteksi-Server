# 🗃️ LAPORAN DATABASE DEVELOPER

**Proyek:** Sistem Monitoring CCTV Gudang Berbasis AI  
**Tanggal:** 2 Februari 2026  
**Score:** 🟡 50%

---

## 📌 RINGKASAN

Sistem ini menggunakan multiple data storage: Google Sheets sebagai primary storage untuk data operasional, Supabase untuk autentikasi dan data dashboard, serta local JSON files untuk state persistence.

---

## 🗄️ DATABASE YANG DIGUNAKAN

### Overview

| Database | Type | Purpose | Location |
|----------|------|---------|----------|
| Google Sheets | Cloud Spreadsheet | Operational data logging | Cloud |
| Supabase | PostgreSQL | Auth & Dashboard data | Cloud |
| Local JSON | File-based | State persistence | Local |

---

## 📊 1. GOOGLE SHEETS (Primary Storage)

### Fungsi
- Menyimpan data deteksi dan aktivitas loading/unloading
- Accessible oleh stakeholder untuk reporting
- Real-time logging dari detection engine

### Connection Setup

```python
import gspread
from google.oauth2.service_account import Credentials

SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
]

creds = Credentials.from_service_account_file(
    'credentials.json',
    scopes=SCOPES
)
client = gspread.authorize(creds)
sheet = client.open_by_key(SHEET_ID).worksheet(WORKSHEET_NAME)
```

### Data Schema

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `Waktu Datang` | Timestamp | Waktu truk tiba | `14:15:36` |
| `Waktu Selesai` | Timestamp | Waktu selesai loading | `15:15:36` |
| `Nomor Polisi` | String | Plat nomor kendaraan | `KT 0960 PO-HINO` |
| `Nama Sopir` | String | Nama driver | `Budi Santoso` |
| `Jumlah Loading` | Integer | Jumlah barang masuk | `120` |
| `Jumlah Rehab` | Integer | Jumlah barang keluar | `1` |
| `Status` | String | Status operasi | `Selesai` |

### Sample Data Row

```
| Waktu Datang | Waktu Selesai | Nomor Polisi   | Nama Sopir   | Loading | Rehab | Status  |
|--------------|---------------|----------------|--------------|---------|-------|---------|
| 14:15:36     | 15:15:36      | KT 0960 PO-HINO| Budi Santoso | 120     | 1     | Selesai |
```

### Operations

| Operation | Method | Description |
|-----------|--------|-------------|
| Insert Row | `sheet.append_row()` | Add new detection record |
| Update Cell | `sheet.update_cell()` | Update existing value |
| Get All | `sheet.get_all_records()` | Fetch all data |
| Get Last Row | `sheet.row_values(sheet.row_count)` | Get latest entry |

### Limitations

| Limitation | Impact |
|------------|--------|
| Not ACID compliant | Data integrity risk |
| Rate limits (100 req/100s) | Throttling needed |
| No indexing | Slow queries on large data |
| No transactions | Concurrent write issues |
| No relationships | Flat data structure only |

---

## 🔐 2. SUPABASE (Dashboard Auth & Data)

### Location
```
dashboard/supabase/
├── migrations/
│   └── 001_saas_ready_schema.sql
└── seeds/
    └── 002_dummy_data.sql
```

### Configuration

**File:** `dashboard/src/lib/supabase.js`

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Schema (SaaS Ready)

**File:** `migrations/001_saas_ready_schema.sql`

Expected tables:

| Table | Purpose |
|-------|---------|
| `users` | User accounts |
| `organizations` | Multi-tenant orgs |
| `cameras` | Camera configurations |
| `detection_events` | Detection logs |
| `activity_logs` | Activity history |
| `settings` | User/org settings |

### Seed Data

**File:** `seeds/002_dummy_data.sql`

Provides initial test data for development.

### Features Used

| Feature | Status |
|---------|--------|
| Authentication | ✅ Active |
| Row Level Security | ⚠️ Review needed |
| Realtime | ❌ Not used |
| Storage | ❌ Not used |
| Edge Functions | ❌ Not used |

---

## 📁 3. LOCAL STATE FILES (JSON)

### Location
```
gui_version_testing_with_server/config/
├── control_panel_config.json
├── state_main_new.json
├── unified_server_example.json
├── unified_server_test.json
├── unified_server.json
└── v3_state.json
```

### File Descriptions

| File | Purpose | Contents |
|------|---------|----------|
| `control_panel_config.json` | GUI configuration | Camera URLs, detection params |
| `state_main_new.json` | V2 state persistence | Detection state, counts |
| `v3_state.json` | V3 modular state | Modular system state |
| `unified_server.json` | Server configuration | API settings, ports |
| `credentials.json` | Google credentials | Service account (gitignored) |

### Sample: `control_panel_config.json`

```json
{
  "camera_url": "rtsp://user:pass@192.168.1.100:554/stream",
  "model_path": "models/bestbaru.engine",
  "confidence": 0.5,
  "iou": 0.45,
  "detection_zone": {
    "x1": 100,
    "y1": 200,
    "x2": 500,
    "y2": 400
  }
}
```

### Sample: `state_main_new.json`

```json
{
  "is_running": false,
  "current_plate": null,
  "current_driver": null,
  "loading_count": 0,
  "rehab_count": 0,
  "session_start": null,
  "last_detection": null
}
```

---

## 🔄 DATA FLOW ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          DATA FLOW                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌──────────────────┐                                                  │
│   │  Detection       │                                                  │
│   │  Engine          │                                                  │
│   │  (YOLOv8)        │                                                  │
│   └────────┬─────────┘                                                  │
│            │                                                            │
│            │ Detection Events                                           │
│            ↓                                                            │
│   ┌────────────────────────────────────────────────────────────┐       │
│   │                    DATA ROUTING                             │       │
│   └────────┬───────────────┬───────────────────┬───────────────┘       │
│            │               │                   │                        │
│            ↓               ↓                   ↓                        │
│   ┌────────────────┐ ┌───────────────┐ ┌────────────────┐              │
│   │ Google Sheets  │ │ Local JSON    │ │ WebSocket      │              │
│   │ (Permanent     │ │ (State        │ │ (Real-time     │              │
│   │  Storage)      │ │  Persistence) │ │  to Dashboard) │              │
│   └────────────────┘ └───────────────┘ └────────────────┘              │
│                                                 │                       │
│                                                 ↓                       │
│                                        ┌────────────────┐              │
│                                        │ Supabase       │              │
│                                        │ (Auth + Future │              │
│                                        │  Data Storage) │              │
│                                        └────────────────┘              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 DATA CONSISTENCY

### Current State

| Aspect | Status |
|--------|--------|
| Single source of truth | ❌ Multiple sources |
| Data synchronization | ⚠️ Manual/Event-based |
| Conflict resolution | ❌ None |
| Backup strategy | ❌ None |
| Data validation | ⚠️ Partial (app-level) |

### Data Integrity Issues

| Issue | Risk | Mitigation |
|-------|------|------------|
| Google Sheets failure | Data loss | Retry queue (implemented) |
| Concurrent writes | Data corruption | Unlikely (single writer) |
| Network interruption | Missing records | Circuit breaker pattern |
| Local state corruption | Session loss | JSON backup on each change |

---

## 🔒 DATA SECURITY

| Aspect | Implementation |
|--------|----------------|
| Credentials storage | `credentials.json` (gitignored) |
| Data encryption | ❌ Not implemented |
| Access control | Google IAM + Supabase RLS |
| Audit logging | ⚠️ Basic (no comprehensive audit) |
| PII handling | ⚠️ Driver names stored plain |

---

## 📈 QUERY PATTERNS

### Google Sheets

```python
# Get all records
records = sheet.get_all_records()

# Get last row
last_row = sheet.row_values(sheet.row_count)

# Append new row
sheet.append_row([
    time_arrived,
    time_finished,
    plate_number,
    driver_name,
    loading_count,
    rehab_count,
    status
])

# Update cell
sheet.update_cell(row, col, value)
```

### Supabase (JavaScript)

```javascript
// Auth
const { user, error } = await supabase.auth.signIn({
  email,
  password
})

// Query (future)
const { data, error } = await supabase
  .from('detection_events')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(50)
```

---

## ⚠️ CATATAN & REKOMENDASI

| Area | Status | Catatan |
|------|--------|---------|
| Data Integrity | ⚠️ Perlu Review | Google Sheets tidak ACID-compliant |
| Backup | ❌ Belum Ada | Perlu backup strategy |
| Indexing | N/A | Google Sheets tidak support |
| Migration | ✅ Ada | Supabase migrations tersedia |
| Query Performance | ⚠️ Terbatas | Pertimbangkan PostgreSQL |
| Data Validation | ⚠️ Partial | Perlu schema validation |
| Monitoring | ❌ Belum Ada | Perlu query monitoring |

---

## 🎯 ACTION ITEMS

| Priority | Task | Effort | Rationale |
|----------|------|--------|-----------|
| 🔴 High | Implement backup strategy | Medium | Data protection |
| 🔴 High | Add data validation layer | Medium | Data integrity |
| 🟡 Medium | Migrate to PostgreSQL | High | Scalability, ACID |
| 🟡 Medium | Add audit logging | Medium | Compliance |
| 🟡 Medium | Encrypt sensitive data | Medium | Security |
| 🟢 Low | Setup monitoring | Low | Performance tracking |
| 🟢 Low | Data archival strategy | Low | Storage management |

---

## 🔮 MIGRATION ROADMAP

### Phase 1: Hybrid (Current)
- Google Sheets untuk operational logging
- Supabase untuk auth
- Local JSON untuk state

### Phase 2: Consolidation (Recommended)
- Migrate to Supabase PostgreSQL for all data
- Keep Google Sheets as export/report format
- Remove local JSON dependency

### Phase 3: Enterprise (Future)
- Dedicated PostgreSQL/TimescaleDB
- Data warehouse for analytics
- Proper ETL pipeline

---

*Laporan dibuat oleh: Software Orchestrator*
*Tanggal: 2 Februari 2026*
