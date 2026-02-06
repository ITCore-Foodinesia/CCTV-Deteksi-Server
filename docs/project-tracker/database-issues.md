# Database Developer Issue Tracker - Complete Inventory

**Last Updated:** 6 Februari 2026 (Verified)  
**Total Issues:** 22  
**Status Legend:** ✅ Done | 🔄 In Progress | ⏳ Pending | ❌ Blocked

---

## Summary

| Category | Total | Done | Pending |
|----------|-------|------|---------|
| Google Sheets Setup | 4 | 4 | 0 |
| Supabase Setup | 5 | 5 | 0 |
| Local State Management | 3 | 3 | 0 |
| Data Integrity & Backup | 5 | 1 | 4 |
| Migration & Optimization | 5 | 1 | 4 |
| **TOTAL** | **22** | **14** | **8** |

---

## Section A: Google Sheets Setup (4) ✅

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 1 | Setup gspread library for Google Sheets API | ✅ Done | - | Library installed and configured |
| 2 | Configure Service Account credentials | ✅ Done | - | `config/credentials.json` (gitignored) |
| 3 | Define data schema (Waktu, Nomor Polisi, Sopir, Loading, Rehab, Status) | ✅ Done | - | Schema documented |
| 4 | Implement CRUD operations (append_row, update_cell, get_all_records) | ✅ Done | - | Full CRUD available |

---

## Section B: Supabase Setup (5) ✅

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 5 | Setup Supabase project and client | ✅ Done | - | [`dashboard/src/lib/supabase.js`](../../dashboard/src/lib/supabase.js) |
| 6 | Create SaaS-ready schema migration | ✅ Done | - | [`dashboard/supabase/migrations/001_saas_ready_schema.sql`](../../dashboard/supabase/migrations/001_saas_ready_schema.sql) |
| 7 | Create CCTV engine integration migration | ✅ Done | - | [`dashboard/supabase/migrations/002_cctv_engine_integration.sql`](../../dashboard/supabase/migrations/002_cctv_engine_integration.sql) |
| 8 | Create seed data for development | ✅ Done | - | [`dashboard/supabase/seeds/002_dummy_data.sql`](../../dashboard/supabase/seeds/002_dummy_data.sql) |
| 9 | Review and enhance Row Level Security (RLS) policies | ✅ Done | - | Comprehensive RLS implemented with helper functions + role-based policies |

---

## Section C: Local State Management (3) ✅

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 10 | Setup control_panel_config.json for GUI settings | ✅ Done | - | Camera URLs, detection params |
| 11 | Setup state_main_new.json for V2 state persistence | ✅ Done | - | Detection state, counts |
| 12 | Setup v3_state.json for V3 modular state | ✅ Done | - | Modular system state |

---

## Section D: Data Integrity & Backup (5)

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 13 | Implement retry queue for Google Sheets (Circuit Breaker) | ✅ Done | - | V2: Retry queue implemented |
| 14 | Implement automated backup strategy | ⏳ Pending | 🔴 Critical | No backup for local data currently |
| 15 | Add data validation layer | ⏳ Pending | 🔴 High | Schema validation needed before write |
| 16 | Implement audit logging for data changes | ⏳ Pending | 🟡 Medium | Track who/when/what changed |
| 17 | Encrypt sensitive data (PII - driver names) | ⏳ Pending | 🟡 Medium | Driver names stored in plain text |

---

## Section E: Migration & Optimization (5)

| # | Issue | Status | Priority | Notes |
|---|-------|--------|----------|-------|
| 18 | Plan migration from Google Sheets to PostgreSQL | ⏳ Pending | 🟡 Medium | Scalability, ACID compliance |
| 19 | Supabase Realtime integration (not currently used) | ⏳ Pending | 🟢 Low | Enable real-time subscriptions |
| 20 | Setup database monitoring/query performance | ⏳ Pending | 🟢 Low | Track slow queries |
| 21 | Implement data archival strategy | ⏳ Pending | 🟢 Low | Old records to cold storage |
| 22 | Document data flow architecture | ✅ Done | - | Documented in [`docs/laporan-per-role/03_Database_Developer.md`](../laporan-per-role/03_Database_Developer.md) |

---

## Database Overview

### Current Storage Types

| Database | Type | Purpose | Location |
|----------|------|---------|----------|
| Google Sheets | Cloud Spreadsheet | Operational data logging | Cloud |
| Supabase | PostgreSQL | Auth & Dashboard data | Cloud |
| Local JSON | File-based | State persistence | Local |

### Google Sheets Schema

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `Waktu Datang` | Timestamp | Waktu truk tiba | `14:15:36` |
| `Waktu Selesai` | Timestamp | Waktu selesai loading | `15:15:36` |
| `Nomor Polisi` | String | Plat nomor kendaraan | `KT 0960 PO-HINO` |
| `Nama Sopir` | String | Nama driver | `Budi Santoso` |
| `Jumlah Loading` | Integer | Jumlah barang masuk | `120` |
| `Jumlah Rehab` | Integer | Jumlah barang keluar | `1` |
| `Status` | String | Status operasi | `Selesai` |

### Supabase Tables (Expected)

| Table | Purpose |
|-------|---------|
| `users` | User accounts |
| `organizations` | Multi-tenant orgs |
| `cameras` | Camera configurations |
| `detection_events` | Detection logs |
| `activity_logs` | Activity history |
| `settings` | User/org settings |

---

## Known Limitations

| Limitation | Impact | Database |
|------------|--------|----------|
| Not ACID compliant | Data integrity risk | Google Sheets |
| Rate limits (100 req/100s) | Throttling needed | Google Sheets |
| No indexing | Slow queries on large data | Google Sheets |
| No transactions | Concurrent write issues | Google Sheets |
| No relationships | Flat data structure only | Google Sheets |

---

## Migration Roadmap

### Phase 1: Hybrid (Current)
- ✅ Google Sheets for operational logging
- ✅ Supabase for auth
- ✅ Local JSON for state

### Phase 2: Consolidation (Recommended)
- ⏳ Migrate to Supabase PostgreSQL for all data
- ⏳ Keep Google Sheets as export/report format
- ⏳ Remove local JSON dependency

### Phase 3: Enterprise (Future)
- ⏳ Dedicated PostgreSQL/TimescaleDB
- ⏳ Data warehouse for analytics
- ⏳ Proper ETL pipeline

---

## Sources

This inventory was compiled from:
- [`docs/laporan-per-role/03_Database_Developer.md`](../laporan-per-role/03_Database_Developer.md)
- [`dashboard/supabase/migrations/`](../../dashboard/supabase/migrations/)
- Codebase analysis of database integrations

---

## GitHub Projects Labels

Recommended labels for these issues:
- `database`
- `priority:critical` / `priority:high` / `priority:medium` / `priority:low`
- `type:bug` / `type:feature` / `type:enhancement`
- `data-integrity`
- `migration`
- `status:done` / `status:in-progress` / `status:pending`
