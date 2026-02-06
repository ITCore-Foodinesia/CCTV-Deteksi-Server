# Diagram Relasi: CCTV-Deteksi ↔ Hello Flutter (Gudang Driver)

## 1. Overview

Dua project ini **TERHUBUNG** melalui **database Supabase yang sama**:

| Project | Lokasi | Teknologi | Fungsi |
|---------|--------|-----------|--------|
| **cctv-deteksi** | `projects/cctv-deteksi/` | React + Python + Supabase | Dashboard monitoring + CCTV detection engine |
| **hello_flutter** | `projects/hello_flutter/` | Flutter + Supabase | Mobile app untuk driver |

**Shared Supabase Project:**
- **URL**: `https://jqwitfnkdxomeeblhuqd.supabase.co`
- **Project ID**: `jqwitfnkdxomeeblhuqd`

---

## 2. System Architecture Diagram

```mermaid
flowchart TB
    subgraph "📱 Mobile Clients"
        Flutter["hello_flutter<br/>Flutter Mobile App<br/>(Gudang Driver)"]
    end
    
    subgraph "🖥️ Web Clients"
        Dashboard["cctv-deteksi/dashboard<br/>React Web Dashboard"]
    end
    
    subgraph "🔧 Backend Services"
        Python["cctv-deteksi/gui_version<br/>Python Detection Engine<br/>(Flask API + YOLO)"]
    end
    
    subgraph "📹 External"
        CCTV["CCTV Cameras<br/>(RTSP Stream)"]
        Telegram["Telegram Bot<br/>(Notifications)"]
        GSheets["Google Sheets<br/>(Logging)"]
    end
    
    subgraph "☁️ Supabase Cloud"
        SupaAuth["Supabase Auth"]
        SupaDB[("PostgreSQL<br/>jqwitfnkdxomeeblhuqd")]
        SupaRT["Supabase Realtime"]
    end
    
    %% Connections
    Flutter -->|REST API + Auth| SupaAuth
    Flutter <-->|Realtime| SupaRT
    Flutter -->|CRUD| SupaDB
    
    Dashboard -->|REST API + Auth| SupaAuth
    Dashboard <-->|Realtime| SupaRT
    Dashboard -->|CRUD| SupaDB
    
    Python -->|Service Role Key| SupaDB
    Python <-->|WebSocket| Dashboard
    
    CCTV -->|RTSP Stream| Python
    Python -->|Notifications| Telegram
    Python -->|Logging| GSheets
    
    SupaRT <-->|postgres_changes| SupaDB
    
    style SupaDB fill:#3ECF8E,color:#fff
    style Flutter fill:#02569B,color:#fff
    style Dashboard fill:#61DAFB,color:#000
    style Python fill:#FF6B6B,color:#fff
```

---

## 3. Shared Database Tables

Kedua project mengakses tabel yang sama di Supabase:

```mermaid
erDiagram
    tenants ||--o{ drivers : "owns"
    tenants ||--o{ trucks : "owns"
    tenants ||--o{ docks : "owns"
    tenants ||--o{ loading_sessions : "owns"
    tenants ||--o{ cameras : "owns"
    tenants ||--o{ helpers : "owns"
    tenants ||--o{ loaders : "owns"
    
    drivers ||--o{ loading_sessions : "performs"
    trucks ||--o{ loading_sessions : "involved_in"
    docks ||--o{ loading_sessions : "used_for"
    cameras ||--o{ loading_sessions : "monitors"
    
    helpers ||--o{ loading_sessions : "assists"
    loaders ||--o{ loading_sessions : "loads"
    
    drivers ||--o{ notifications : "receives"
    
    drivers {
        uuid id PK
        uuid tenant_id FK
        uuid auth_user_id FK
        text first_name
        text last_name
        text driver_code
        text phone
        text email
        text status
        text avatar_url
    }
    
    trucks {
        uuid id PK
        uuid tenant_id FK
        text plate_number
        text plate_normalized
        text truck_type
        text vehicle_type
        text brand_model
        boolean is_registered
        jsonb metadata
    }
    
    docks {
        uuid id PK
        uuid tenant_id FK
        text dock_code
        text dock_name
        text warehouse_zone
        text status
        integer capacity
        jsonb location_data
    }
    
    loading_sessions {
        uuid id PK
        uuid tenant_id FK
        uuid driver_id FK
        uuid truck_id FK
        uuid dock_id FK
        uuid camera_id FK
        text status
        text plate_number
        timestamp started_at
        timestamp finished_at
        integer duration_seconds
        integer items_in
        integer items_out
        text start_source
    }
    
    helpers {
        uuid id PK
        uuid tenant_id FK
        text name
        text phone
        text status
    }
    
    loaders {
        uuid id PK
        uuid tenant_id FK
        text name
        text phone
        text status
    }
```

---

## 4. Data Flow Diagram

### 4.1 Loading Session Flow

```mermaid
sequenceDiagram
    participant Driver as 📱 Flutter App
    participant Supabase as ☁️ Supabase
    participant Dashboard as 🖥️ React Dashboard
    participant Python as 🔧 Python Engine
    participant CCTV as 📹 CCTV Camera
    
    Note over Driver,CCTV: === SCENARIO: Driver Memulai Loading ===
    
    Driver->>Supabase: 1. POST /loading_sessions<br/>(start_source: 'mobile_app')
    Supabase-->>Driver: Session ID returned
    
    Supabase->>Dashboard: 2. Realtime: INSERT event
    Dashboard->>Dashboard: UI updates: new session
    
    Note over Driver,CCTV: === CCTV Mendeteksi Plat ===
    
    CCTV->>Python: 3. Video stream
    Python->>Python: YOLO detection → plate OCR
    
    Python->>Supabase: 4. Match session by truck_id<br/>UPDATE plate_detected
    
    Supabase->>Dashboard: 5. Realtime: UPDATE event
    Supabase->>Driver: 5. Realtime: UPDATE event
    
    Note over Driver,CCTV: === Loading Selesai ===
    
    Driver->>Supabase: 6. PATCH /loading_sessions/:id<br/>(status: 'completed')
    
    Supabase->>Dashboard: 7. Realtime: UPDATE event
    Supabase->>Driver: 7. Notification created
```

### 4.2 Data Sync Direction

| Table | Flutter → DB | DB → Dashboard | Python → DB |
|-------|--------------|----------------|-------------|
| `drivers` | ✅ Create/Update profile | ✅ Read all | ❌ |
| `trucks` | ✅ Register vehicle | ✅ Read all | ✅ Upsert detected |
| `docks` | ❌ Read only | ✅ Read/Manage | ❌ |
| `loading_sessions` | ✅ Start/Complete | ✅ Read all | ✅ Update plate_detected |
| `helpers` | ❌ Read only | ✅ Read/Manage | ❌ |
| `loaders` | ❌ Read only | ✅ Read/Manage | ❌ |
| `notifications` | ✅ Read/Mark read | ❌ | ✅ Create alerts |

---

## 5. Component Diagram per Project

### 5.1 cctv-deteksi Structure

```
cctv-deteksi/
├── dashboard/                   # React Web Dashboard
│   ├── src/
│   │   ├── components/         # UI Components
│   │   ├── contexts/           # AuthContext (Supabase)
│   │   ├── hooks/              # useDrivers, useDocks, etc.
│   │   ├── lib/supabase.js     # Supabase client
│   │   └── pages/              # DriversPage, SessionsPage, etc.
│   └── .env                    # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
│
├── gui_version_testing_with_server/  # Python Backend
│   ├── src/
│   │   ├── api/                # Flask API server
│   │   ├── detection/          # YOLO + plate detection
│   │   └── integrations/
│   │       ├── supabase/       # Supabase listener
│   │       └── telegram/       # Telegram bot
│   └── .env                    # SUPABASE_URL, SUPABASE_SERVICE_KEY
│
└── docs/                       # Documentation
```

### 5.2 hello_flutter Structure

```
hello_flutter/
├── lib/
│   ├── core/
│   │   └── config/
│   │       └── supabase_config.dart  # Same Supabase project!
│   ├── data/
│   │   ├── models/
│   │   │   ├── driver_model.dart     # Maps to `drivers` table
│   │   │   ├── truck_model.dart      # Maps to `trucks` table
│   │   │   ├── dock_model.dart       # Maps to `docks` table
│   │   │   ├── loading_session_model.dart
│   │   │   ├── helper_model.dart
│   │   │   └── loader_model.dart
│   │   └── services/
│   │       ├── auth_service.dart     # Supabase Auth
│   │       ├── driver_service.dart   # CRUD drivers
│   │       └── loading_service.dart  # CRUD sessions
│   └── features/
│       ├── auth/                     # Login/Signup screens
│       ├── home/                     # Dashboard
│       ├── loading/                  # Loading session screen
│       └── history/                  # Session history
│
├── mock-admin/                       # Simple HTML admin panel
├── plans/
│   └── DATABASE_SYNC_CCTV_FLUTTER_PLAN.md
└── pubspec.yaml                      # supabase_flutter: ^2.8.0
```

---

## 6. Integration Points

### 6.1 Supabase Configuration Comparison

| Config | cctv-deteksi/dashboard | hello_flutter |
|--------|------------------------|---------------|
| URL | `VITE_SUPABASE_URL` in `.env` | `SupabaseConfig.url` in dart |
| Anon Key | `VITE_SUPABASE_ANON_KEY` in `.env` | `SupabaseConfig.anonKey` in dart |
| Value | `https://jqwitfnkdxomeeblhuqd.supabase.co` | `https://jqwitfnkdxomeeblhuqd.supabase.co` |

**✅ CONFIRMED: Both use the SAME Supabase project!**

### 6.2 Shared Models Mapping

| Flutter Model | React Hook | Database Table |
|---------------|------------|----------------|
| `DriverModel` | `useDrivers()` | `drivers` |
| `TruckModel` | `useTrucks()` | `trucks` |
| `DockModel` | `useDocks()` | `docks` |
| `LoadingSessionModel` | `useSessions()` | `loading_sessions` |
| `HelperModel` | `useHelpers()` | `helpers` |
| `LoaderModel` | `useLoaders()` | `loaders` |
| `NotificationModel` | - | `notifications` |

---

## 7. Real-time Synchronization

Kedua project dapat menerima update real-time melalui **Supabase Realtime**:

```mermaid
flowchart LR
    subgraph "Database Events"
        INSERT["INSERT"]
        UPDATE["UPDATE"]
        DELETE["DELETE"]
    end
    
    subgraph "Supabase Realtime"
        Channel["postgres_changes<br/>channel"]
    end
    
    subgraph "Subscribers"
        React["React Dashboard<br/>useSupabaseTable hook"]
        Flutter["Flutter App<br/>RealtimeChannel"]
    end
    
    INSERT --> Channel
    UPDATE --> Channel
    DELETE --> Channel
    
    Channel -->|broadcast| React
    Channel -->|broadcast| Flutter
```

**Example: When Flutter creates a session:**
1. Flutter: `supabase.from('loading_sessions').insert(...)`
2. Supabase: Stores data + broadcasts INSERT event
3. React Dashboard: Receives event → UI auto-updates (via `useSupabaseTable`)
4. Flutter App: Receives confirmation

---

## 8. Summary Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           UNIFIED WAREHOUSE SYSTEM                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────┐          ┌──────────────────────────────────────┐ │
│  │                     │          │                                      │ │
│  │   hello_flutter     │          │         cctv-deteksi                 │ │
│  │   (Mobile App)      │          │                                      │ │
│  │                     │          │  ┌────────────┐  ┌────────────────┐  │ │
│  │  • Driver login     │          │  │  Dashboard │  │ Python Engine  │  │ │
│  │  • Start loading    │          │  │  (React)   │  │ (Detection)    │  │ │
│  │  • View history     │          │  │            │  │                │  │ │
│  │  • Notifications    │          │  │  • Monitor │  │ • CCTV stream  │  │ │
│  │                     │          │  │  • Reports │  │ • Plate OCR    │  │ │
│  └──────────┬──────────┘          │  │  • Manage  │  │ • Alerts       │  │ │
│             │                     │  └─────┬──────┘  └───────┬────────┘  │ │
│             │                     │        │                 │           │ │
│             │                     └────────┼─────────────────┼───────────┘ │
│             │                              │                 │             │
│             └──────────────┬───────────────┘                 │             │
│                            │                                 │             │
│                            ▼                                 │             │
│              ┌─────────────────────────────┐                 │             │
│              │                             │◄────────────────┘             │
│              │       SUPABASE              │                               │
│              │  jqwitfnkdxomeeblhuqd       │                               │
│              │                             │                               │
│              │  • PostgreSQL (data)        │                               │
│              │  • Auth (users)             │                               │
│              │  • Realtime (sync)          │                               │
│              │  • Storage (files)          │                               │
│              │                             │                               │
│              └─────────────────────────────┘                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Key Findings

| Aspect | Finding |
|--------|---------|
| **Database** | ✅ Shared Supabase project (`jqwitfnkdxomeeblhuqd`) |
| **Auth** | ✅ Same Supabase Auth (drivers login via Flutter, admins via Dashboard) |
| **Real-time** | ✅ Both use Supabase Realtime for live updates |
| **Tables** | ✅ All tables accessible by both projects |
| **RLS** | ✅ Row Level Security enabled for tenant isolation |
| **Sync Design** | ✅ Documented in `hello_flutter/plans/DATABASE_SYNC_CCTV_FLUTTER_PLAN.md` |

---

_Document generated: 2026-02-03_
_Based on analysis of both project codebases_
