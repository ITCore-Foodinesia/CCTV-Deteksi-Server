# Diagram Relasi: CCTV-Deteksi ↔ Hello Flutter

## Executive Summary

Dokumen ini menggambarkan relasi arsitektur antara dua proyek utama dalam workspace ini:

| Proyek | Teknologi | Fungsi |
|--------|-----------|--------|
| **cctv-deteksi** | React Dashboard + Python Backend + Supabase | Sistem monitoring warehouse dengan CCTV dan deteksi kendaraan |
| **hello_flutter** | Flutter + Supabase | Aplikasi mobile driver untuk loading validation |

**Relasi Utama**: Kedua proyek **berbagi database Supabase yang sama** untuk sinkronisasi data real-time.

---

## 1. Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          CCTV WAREHOUSE MONITORING SYSTEM                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────────────────────┐    ┌──────────────────────────────────┐   │
│  │       CCTV-DETEKSI PROJECT       │    │     HELLO_FLUTTER PROJECT        │   │
│  │         (Web Dashboard)          │    │        (Mobile App)              │   │
│  ├──────────────────────────────────┤    ├──────────────────────────────────┤   │
│  │                                  │    │                                  │   │
│  │  ┌────────────────────────────┐  │    │  ┌────────────────────────────┐  │   │
│  │  │     React Dashboard        │  │    │  │      Flutter App           │  │   │
│  │  │  (dashboard/src/)          │  │    │  │   (lib/features/)          │  │   │
│  │  │                            │  │    │  │                            │  │   │
│  │  │  • Live CCTV Streaming     │  │    │  │  • Driver Login/Signup     │  │   │
│  │  │  • Real-time Stats         │  │    │  │  • Quick Setup (Truck)     │  │   │
│  │  │  • Loading Sessions        │  │    │  │  • Loading Timer           │  │   │
│  │  │  • Activity Logs           │  │    │  │  • Session History         │  │   │
│  │  │  • Multi-tenant Support    │  │    │  │  • Notifications           │  │   │
│  │  └─────────────┬──────────────┘  │    │  └─────────────┬──────────────┘  │   │
│  │                │                 │    │                │                 │   │
│  │  ┌─────────────▼──────────────┐  │    │  ┌─────────────▼──────────────┐  │   │
│  │  │   Python Backend (Flask)   │  │    │  │   Dart Services Layer      │  │   │
│  │  │ (gui_version_testing_with_ │  │    │  │  (lib/data/services/)      │  │   │
│  │  │  server/src/api/)          │  │    │  │                            │  │   │
│  │  │                            │  │    │  │  • auth_service.dart       │  │   │
│  │  │  • CCTV Stream Processing  │  │    │  │  • loading_service.dart    │  │   │
│  │  │  • Vehicle Detection (YOLO)│  │    │  │  • dock_service.dart       │  │   │
│  │  │  • Plate Recognition       │  │    │  │  • driver_service.dart     │  │   │
│  │  │  • WebSocket Server        │  │    │  │  • notification_service    │  │   │
│  │  │  • Google Sheets Sync      │  │    │  └─────────────┬──────────────┘  │   │
│  │  │  • Telegram Notifications  │  │    │                │                 │   │
│  │  └─────────────┬──────────────┘  │    │                │                 │   │
│  │                │                 │    │                │                 │   │
│  └────────────────┼─────────────────┘    └────────────────┼─────────────────┘   │
│                   │                                       │                     │
│                   │         ┌─────────────────────┐       │                     │
│                   │         │   SUPABASE CLOUD    │       │                     │
│                   │         │ (Shared Database)   │       │                     │
│                   └─────────►                     ◄───────┘                     │
│                             │  ┌───────────────┐  │                             │
│                             │  │  PostgreSQL   │  │                             │
│                             │  │               │  │                             │
│                             │  │  • tenants    │  │                             │
│                             │  │  • drivers    │  │                             │
│                             │  │  • trucks     │  │                             │
│                             │  │  • docks      │  │                             │
│                             │  │  • loading_   │  │                             │
│                             │  │    sessions   │  │                             │
│                             │  │  • cameras    │  │                             │
│                             │  │  • notif...   │  │                             │
│                             │  └───────────────┘  │                             │
│                             │                     │                             │
│                             │  ┌───────────────┐  │                             │
│                             │  │  Realtime     │  │                             │
│                             │  │  (WebSocket)  │  │                             │
│                             │  └───────────────┘  │                             │
│                             │                     │                             │
│                             │  ┌───────────────┐  │                             │
│                             │  │  Auth         │  │                             │
│                             │  │  (JWT/OAuth)  │  │                             │
│                             │  └───────────────┘  │                             │
│                             │                     │                             │
│                             │  ┌───────────────┐  │                             │
│                             │  │  RLS Policies │  │                             │
│                             │  │  (Security)   │  │                             │
│                             │  └───────────────┘  │                             │
│                             └─────────────────────┘                             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW DIAGRAM                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

                    ┌───────────────────────────────────────┐
                    │           PHYSICAL LAYER              │
                    │                                       │
                    │    📷 CCTV Camera ──► 🎥 Video Feed   │
                    │                                       │
                    └───────────────────┬───────────────────┘
                                        │
                                        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                         PYTHON BACKEND (Detection)                             │
│                                                                                │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                    │
│   │  ZMQ/HTTP    │───►│ YOLO Object  │───►│    Plate     │                    │
│   │  Receiver    │    │  Detection   │    │  Recognition │                    │
│   └──────────────┘    └──────────────┘    └──────┬───────┘                    │
│                                                   │                            │
│                                                   ▼                            │
│                           ┌─────────────────────────────────────┐              │
│                           │  Detection Results:                 │              │
│                           │  • Truck detected ✓                 │              │
│                           │  • Plate: B 1234 XYZ               │              │
│                           │  • Confidence: 95%                  │              │
│                           └─────────────────────────────────────┘              │
│                                                                                │
└──────────────────────────────────────┬─────────────────────────────────────────┘
                                       │
           ┌───────────────────────────┼───────────────────────────┐
           │                           │                           │
           ▼                           ▼                           ▼
┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
│   React Dashboard    │    │   Supabase (DB)      │    │   External Services  │
│                      │    │                      │    │                      │
│  • WebSocket Update  │◄──►│  • loading_sessions  │    │  • Google Sheets     │
│  • Live Stats        │    │  • trucks            │    │  • Telegram Bot      │
│  • Session Mgmt      │    │  • loading_events    │    │                      │
└──────────────────────┘    └──────────────────────┘    └──────────────────────┘
                                       ▲
                                       │
                                       │ Realtime Sync
                                       │
                            ┌──────────┴──────────┐
                            │                     │
                            ▼                     ▼
               ┌──────────────────────┐    ┌──────────────────────┐
               │   Flutter App        │    │   Web Dashboard      │
               │   (Driver Mobile)    │    │   (Admin View)       │
               │                      │    │                      │
               │  • Start Session     │    │  • Monitor All       │
               │  • Timer Running     │    │  • View Analytics    │
               │  • Complete Loading  │    │  • Manage Trucks     │
               │  • View History      │    │  • Manage Drivers    │
               └──────────────────────┘    └──────────────────────┘
```

---

## 3. Entity Relationship Diagram (Database)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       UNIFIED DATABASE SCHEMA (Supabase)                         │
└─────────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │     tenants     │
    │─────────────────│
    │ id (PK)         │
    │ name            │
    │ slug (UK)       │
    │ plan            │
    │ settings        │
    │ is_active       │
    └────────┬────────┘
             │
             │ 1:N
             │
    ┌────────┴────────────────────────────────────────────────────────────┐
    │                                                                      │
    ▼                    ▼                    ▼                    ▼       ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   drivers   │   │   trucks    │   │    docks    │   │   cameras   │   │user_tenants │
│─────────────│   │─────────────│   │─────────────│   │─────────────│   │─────────────│
│ id (PK)     │   │ id (PK)     │   │ id (PK)     │   │ id (PK)     │   │ id (PK)     │
│ tenant_id   │   │ tenant_id   │   │ tenant_id   │   │ tenant_id   │   │ user_id     │
│ auth_user_id│   │ plate_number│   │ dock_code   │   │ dock_id     │   │ tenant_id   │
│ name        │   │ plate_norm  │   │ dock_name   │   │ name        │   │ role        │
│ phone       │   │ vehicle_type│   │ warehouse   │   │ stream_url  │   │ is_active   │
│ status      │   │ is_registered│  │ status      │   │ status      │   └─────────────┘
│ profile_data│   │ metadata    │   │ capacity    │   │ config      │
└──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
       │                 │                 │                 │
       │                 │                 │                 │
       │    ┌────────────┼─────────────────┼─────────────────┘
       │    │            │                 │
       │    │            │                 │
       │    ▼            ▼                 ▼
       │   ┌─────────────────────────────────────────┐
       │   │          loading_sessions               │
       │   │─────────────────────────────────────────│
       │   │ id (PK)                                 │
       └──►│ driver_id (FK)  ◄── dari Flutter App    │
           │ truck_id (FK)   ◄── pilih saat session  │
           │ dock_id (FK)    ◄── assigned dock       │
           │ camera_id (FK)  ◄── camera monitoring   │
           │ tenant_id (FK)                          │
           │ status (enum)                           │
           │ plate_detected  ◄── dari CCTV detection │
           │ started_at                              │
           │ ended_at                                │
           │ duration_seconds                        │
           │ items_in / items_out                    │
           │ start_source (manual/cctv)              │
           │ metadata                                │
           └───────────────────┬─────────────────────┘
                               │
                               │ 1:N
                               ▼
                   ┌─────────────────────────┐
                   │     loading_events      │
                   │─────────────────────────│
                   │ id (PK)                 │
                   │ session_id (FK)         │
                   │ event_type (enum)       │
                   │ description             │
                   │ event_data              │
                   │ source                  │
                   │ event_ts                │
                   └─────────────────────────┘


    ┌─────────────┐
    │notifications│ ◄── untuk Flutter App
    │─────────────│
    │ id (PK)     │
    │ driver_id   │
    │ tenant_id   │
    │ type        │
    │ title       │
    │ message     │
    │ is_read     │
    │ action_data │
    └─────────────┘


    ┌─────────────────┐
    │driver_vehicles  │ ◄── relasi fleksibel (optional)
    │─────────────────│
    │ id (PK)         │
    │ driver_id (FK)  │
    │ truck_id (FK)   │
    │ is_primary      │
    │ registered_at   │
    └─────────────────┘
```

---

## 4. Sync Direction Matrix

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         DATA SYNC DIRECTION                                      │
├──────────────────┬────────────────┬──────────────────┬───────────────────────────┤
│ Data Entity      │ CCTV Dashboard │ Flutter App      │ Sync Direction            │
├──────────────────┼────────────────┼──────────────────┼───────────────────────────┤
│ Drivers          │ ❌ (view only) │ ✅ (register)    │ Flutter → Supabase → Web  │
│ Trucks           │ ✅ (detect)    │ ✅ (select)      │ Bidirectional             │
│ Loading Sessions │ ✅ (monitor)   │ ✅ (start/stop)  │ Bidirectional             │
│ Docks            │ ✅ (manage)    │ ✅ (view status) │ Web → Supabase → Flutter  │
│ Cameras          │ ✅ (configure) │ ❌               │ Web only                  │
│ Notifications    │ ✅ (send)      │ ✅ (receive)     │ Web → Supabase → Flutter  │
│ Loading Events   │ ✅ (create)    │ ✅ (view)        │ Both → Supabase           │
└──────────────────┴────────────────┴──────────────────┴───────────────────────────┘
```

---

## 5. Component Mapping

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      COMPONENT MAPPING: CCTV ↔ FLUTTER                           │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────┐         ┌─────────────────────────────┐
│       CCTV-DETEKSI          │         │      HELLO_FLUTTER          │
├─────────────────────────────┤         ├─────────────────────────────┤
│                             │         │                             │
│ dashboard/                  │         │ lib/                        │
│ ├── src/                    │         │ ├── core/                   │
│ │   ├── components/         │         │ │   ├── config/             │
│ │   │   ├── CCTVFeed.jsx   ║════════════╬══════ supabase_config.dart│
│ │   │   ├── ActivityLog    ║  SHARED  ║│   └── constants/          │
│ │   │   └── StatsCard      ║ SUPABASE ║│                            │
│ │   ├── pages/             ║  DATA    ║├── data/                    │
│ │   │   ├── SessionsPage   ║◄════════►║│   ├── models/              │
│ │   │   ├── TrucksPage     ║          ║│   │   ├── driver_model    │
│ │   │   └── DriversPage    ║          ║│   │   ├── truck_model     │
│ │   └── lib/               ║          ║│   │   └── loading_session │
│ │       └── supabase.js    ║══════════╬══├── services/              │
│ │                          ║          ║│   ├── auth_service        │
│ ├── supabase/migrations/   ║          ║│   └── loading_service     │
│ │   └── 001_saas_ready.sql ║          ║│                            │
│ │                          ║          ║├── features/                │
│ │                          ║          ║│   ├── auth/                │
│ └──────────────────────────┘         ║│   ├── home/                │
│                                       ║│   ├── loading/             │
│ gui_version_testing_with_server/      ║│   └── history/             │
│ ├── src/api/                          ║│                            │
│ │   └── api_server.py ════════════════╬═► WebSocket Updates         │
│ ├── src/detection/                    ║│                            │
│ │   └── detector.py                   ║├── plans/                   │
│ └── config/                           ║│   └── DATABASE_SYNC_       │
│     └── unified_server.json           ║│       CCTV_FLUTTER_PLAN.md │
│                                       ║│                            │
└───────────────────────────────────────╝└─────────────────────────────┘
```

---

## 6. Use Case Flow

### 6.1 Driver Loading Session (Flutter → CCTV Integration)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    USE CASE: Driver Melakukan Loading Session                    │
└─────────────────────────────────────────────────────────────────────────────────┘

 FLUTTER APP                      SUPABASE                    CCTV DASHBOARD
 ───────────                      ────────                    ──────────────
      │                               │                             │
      │  1. Driver Login              │                             │
      ├──────────────────────────────►│                             │
      │                               │                             │
      │  2. Quick Setup               │                             │
      │     (Pilih Truck)             │                             │
      ├──────────────────────────────►│                             │
      │                               │  ► INSERT loading_sessions  │
      │                               │    status = 'loading'       │
      │                               ├────────────────────────────►│
      │                               │                             │
      │                               │  Realtime Update            │
      │                               │◄────────────────────────────┤
      │                               │                             │  3. Dashboard
      │                               │                             │     sees new
      │  4. Loading Timer             │                             │     session
      │     Running...                │                             │
      ├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─►│                             │
      │                               │                             │
      │                               │  5. CCTV Detection         │
      │                               │◄────────────────────────────┤
      │                               │     plate_detected =        │
      │                               │     'B 1234 XYZ'            │
      │                               │                             │
      │  6. Driver Finish Loading     │                             │
      ├──────────────────────────────►│                             │
      │                               │  ► UPDATE loading_sessions  │
      │                               │    status = 'completed'     │
      │                               │    ended_at = NOW()         │
      │                               ├────────────────────────────►│
      │                               │                             │
      │  7. Show History              │                             │  8. Show
      │◄──────────────────────────────┤                             │     Analytics
      │                               │                             │
```

### 6.2 CCTV Auto-Detection Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    USE CASE: CCTV Auto-Detect Truck                              │
└─────────────────────────────────────────────────────────────────────────────────┘

 CCTV CAMERA            PYTHON BACKEND           SUPABASE            FLUTTER APP
 ───────────            ──────────────           ────────            ───────────
      │                       │                       │                    │
      │  Video Stream         │                       │                    │
      ├──────────────────────►│                       │                    │
      │                       │                       │                    │
      │                       │ 1. YOLO Detection     │                    │
      │                       │    Truck Detected!    │                    │
      │                       │                       │                    │
      │                       │ 2. OCR Plate          │                    │
      │                       │    'B 1234 XYZ'       │                    │
      │                       │                       │                    │
      │                       │ 3. Check if session   │                    │
      │                       │    exists for plate   │                    │
      │                       ├──────────────────────►│                    │
      │                       │                       │                    │
      │                       │    ► Session exists!  │                    │
      │                       │◄──────────────────────┤                    │
      │                       │                       │                    │
      │                       │ 4. Update session     │                    │
      │                       │    with camera_id     │                    │
      │                       ├──────────────────────►│                    │
      │                       │                       │  Realtime Sync     │
      │                       │                       ├───────────────────►│
      │                       │                       │                    │
      │                       │                       │ 5. Flutter shows   │
      │                       │                       │    "CCTV Verified" │
      │                       │                       │                    │
```

---

## 7. Technology Stack Summary

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              TECHNOLOGY STACK                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                           FRONTEND LAYER                                  │  │
│  ├───────────────────────────────────────────────────────────────────────────┤  │
│  │                                                                           │  │
│  │  ┌────────────────────────┐      ┌────────────────────────┐              │  │
│  │  │    React Dashboard     │      │    Flutter Mobile      │              │  │
│  │  │   (dashboard/)         │      │   (hello_flutter/)     │              │  │
│  │  ├────────────────────────┤      ├────────────────────────┤              │  │
│  │  │ • React 18             │      │ • Flutter 3.x          │              │  │
│  │  │ • Vite                 │      │ • Dart                 │              │  │
│  │  │ • TailwindCSS          │      │ • GetX / Provider      │              │  │
│  │  │ • Supabase JS Client   │      │ • Supabase Flutter     │              │  │
│  │  │ • React Router         │      │ • Clean Architecture   │              │  │
│  │  └────────────────────────┘      └────────────────────────┘              │  │
│  │                                                                           │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                           BACKEND LAYER                                   │  │
│  ├───────────────────────────────────────────────────────────────────────────┤  │
│  │                                                                           │  │
│  │  ┌────────────────────────┐      ┌────────────────────────┐              │  │
│  │  │    Python Backend      │      │    Supabase Backend    │              │  │
│  │  │ (gui_version_testing/) │      │    (as BaaS)           │              │  │
│  │  ├────────────────────────┤      ├────────────────────────┤              │  │
│  │  │ • Flask + SocketIO     │      │ • PostgreSQL           │              │  │
│  │  │ • OpenCV + YOLO        │      │ • Row Level Security   │              │  │
│  │  │ • ZeroMQ               │      │ • Realtime Subscriptions│             │  │
│  │  │ • gspread (Sheets)     │      │ • Auth (JWT)           │              │  │
│  │  │ • Telegram Bot API     │      │ • Edge Functions       │              │  │
│  │  └────────────────────────┘      └────────────────────────┘              │  │
│  │                                                                           │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                        INFRASTRUCTURE LAYER                               │  │
│  ├───────────────────────────────────────────────────────────────────────────┤  │
│  │ • Supabase Cloud (Database + Auth + Realtime + Storage)                   │  │
│  │ • Vercel (Dashboard hosting - optional)                                   │  │
│  │ • Google Play / App Store (Flutter app distribution)                      │  │
│  │ • Local Server (Python backend for CCTV processing)                       │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Key Integration Points

| Integration Point | Source | Target | Mechanism |
|-------------------|--------|--------|-----------|
| **Auth** | Flutter App | Supabase Auth | JWT tokens |
| **Sessions CRUD** | Both | `loading_sessions` | REST API + Realtime |
| **Plate Detection** | Python Backend | `loading_sessions.plate_detected` | API call |
| **Notifications** | Dashboard | Flutter via `notifications` table | Supabase Realtime |
| **Driver Lookup** | Python Backend | `drivers` table | Query by phone/plate |
| **Live Updates** | Supabase | React Dashboard | WebSocket subscription |

---

## 9. Folder Structure Comparison

```
cctv-deteksi/                           hello_flutter/
├── dashboard/                          ├── lib/
│   ├── src/                            │   ├── core/
│   │   ├── components/                 │   │   ├── config/
│   │   ├── pages/                      │   │   ├── constants/
│   │   ├── lib/supabase.js  ◄──SAME──► │   │   └── di/
│   │   └── ...                         │   ├── data/
│   └── supabase/migrations/ ◄──SHARED──┤   │   ├── models/
│                                       │   │   └── services/
├── gui_version_testing_with_server/    │   └── features/
│   ├── src/                            │       ├── auth/
│   │   ├── api/                        │       ├── home/
│   │   └── detection/                  │       └── loading/
│   └── config/                         │
│                                       ├── plans/
├── docs/                               │   └── DATABASE_SYNC_
│                                       │       CCTV_FLUTTER_PLAN.md
└── ...                                 └── tests/
```

---

## 10. Conclusion

**Relasi Utama**:
1. **Shared Database**: Kedua proyek menggunakan Supabase instance yang sama (`jqwitfnkdxomeeblhuqd.supabase.co`)
2. **Unified Schema**: Skema database didesain untuk mendukung kedua aplikasi dengan tabel yang terhubung
3. **Realtime Sync**: Supabase Realtime memungkinkan sinkronisasi data real-time antar platform
4. **Role Separation**: 
   - **CCTV Dashboard**: Admin/Operator monitoring & management
   - **Flutter App**: Driver-facing mobile interface untuk loading operations

**Dokumen Referensi Terkait**:
- [`hello_flutter/plans/DATABASE_SYNC_CCTV_FLUTTER_PLAN.md`](../hello_flutter/plans/DATABASE_SYNC_CCTV_FLUTTER_PLAN.md)
- [`dashboard/supabase/migrations/001_saas_ready_schema.sql`](../dashboard/supabase/migrations/001_saas_ready_schema.sql)
- [`hello_flutter/plans/001_saas_ready_schema.sql`](../hello_flutter/plans/001_saas_ready_schema.sql)

---

*Generated: 2026-02-03*
