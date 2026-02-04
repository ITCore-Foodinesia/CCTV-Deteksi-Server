# Rencana Integrasi: Flutter App → Database → CCTV Detection Engine

## Executive Summary

Dokumen ini menjabarkan rencana teknis untuk integrasi trigger-based detection, di mana **Flutter App memulai loading session → Database mengaktifkan CCTV detection engine untuk mulai menghitung**.

---

## 1. Arsitektur Saat Ini (Before)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ALUR SAAT INI (QR/Telegram)                         │
│                                                                             │
│   ┌───────────────┐        ┌─────────────────┐        ┌─────────────────┐  │
│   │ QR Code Scan  │───────►│  Python Detector │◄──────│  Telegram Bot   │  │
│   │ (Fisik CCTV)  │        │  (detector.py)   │        │  (Start/Stop)   │  │
│   └───────────────┘        └────────┬─────────┘        └─────────────────┘  │
│                                     │                                        │
│                                     ▼                                        │
│                           ┌─────────────────┐                                │
│                           │  API Server     │                                │
│                           │  (port 5001)    │                                │
│                           └────────┬────────┘                                │
│                                    │                                         │
│                                    ▼                                         │
│                           ┌─────────────────┐                                │
│                           │  Google Sheets  │                                │
│                           │  (Logging)      │                                │
│                           └─────────────────┘                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Masalah dengan alur ini:**
- Driver harus scan QR fisik di area CCTV
- Atau operator harus trigger via Telegram
- Tidak ada integrasi dengan mobile app Flutter
- Tidak ada data tersentralisasi di Supabase

---

## 2. Arsitektur Target (After)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ALUR BARU (Flutter → Supabase → Engine)                  │
│                                                                             │
│   ┌─────────────────┐                                                       │
│   │  FLUTTER APP    │                                                       │
│   │  (Driver Login) │                                                       │
│   └────────┬────────┘                                                       │
│            │ 1. Create loading_session                                      │
│            │    status = 'pending_dock' atau 'loading'                      │
│            ▼                                                                │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                      SUPABASE (PostgreSQL)                           │  │
│   │  ┌─────────────────────────────────────────────────────────────┐    │  │
│   │  │  loading_sessions                                            │    │  │
│   │  │  - id, driver_id, truck_id, dock_id, status                  │    │  │
│   │  │  - plate_number (denormalized for quick lookup)              │    │  │
│   │  │  - counting_active BOOLEAN (NEW!)                            │    │  │
│   │  └─────────────────────────────────────────────────────────────┘    │  │
│   │                              │                                       │  │
│   │              2. Postgres Realtime Trigger                            │  │
│   │                  (NOTIFY on status change)                           │  │
│   │                              │                                       │  │
│   └──────────────────────────────┼──────────────────────────────────────┘  │
│                                  │                                          │
│                                  ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                 PYTHON DETECTOR (ENHANCED)                          │  │
│   │                                                                      │  │
│   │  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │  │
│   │  │ Supabase        │    │ Detection       │    │ Event           │ │  │
│   │  │ Realtime Client │───►│ Engine          │───►│ Publisher       │ │  │
│   │  │ (Listener)      │    │ (count logic)   │    │ (back to DB)    │ │  │
│   │  └─────────────────┘    └─────────────────┘    └─────────────────┘ │  │
│   │                                                                      │  │
│   │  - Subscribe to loading_sessions changes                             │  │
│   │  - When status='loading' → START counting                            │  │
│   │  - When status='completed' → STOP counting                           │  │
│   │  - Write loading_events back to Supabase                             │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                  │                                          │
│                                  ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                    REACT DASHBOARD                                   │  │
│   │                                                                      │  │
│   │  - Subscribe to same Supabase Realtime channel                       │  │
│   │  - Display live counting updates                                     │  │
│   │  - Show session status changes                                       │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema Changes

### 3.1 New Columns for `loading_sessions`

```sql
-- Migration: Add fields for CCTV integration
ALTER TABLE loading_sessions ADD COLUMN IF NOT EXISTS plate_number TEXT;
ALTER TABLE loading_sessions ADD COLUMN IF NOT EXISTS counting_active BOOLEAN DEFAULT FALSE;
ALTER TABLE loading_sessions ADD COLUMN IF NOT EXISTS counting_started_at TIMESTAMPTZ;
ALTER TABLE loading_sessions ADD COLUMN IF NOT EXISTS loading_count INTEGER DEFAULT 0;
ALTER TABLE loading_sessions ADD COLUMN IF NOT EXISTS rehab_count INTEGER DEFAULT 0;

-- Index for quick lookup by plate
CREATE INDEX IF NOT EXISTS idx_sessions_plate ON loading_sessions(plate_number);

-- Realtime trigger function
CREATE OR REPLACE FUNCTION notify_session_change()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('session_changes', json_build_object(
    'id', NEW.id,
    'status', NEW.status,
    'plate_number', NEW.plate_number,
    'dock_id', NEW.dock_id,
    'counting_active', NEW.counting_active,
    'operation', TG_OP
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on loading_sessions
DROP TRIGGER IF EXISTS trg_session_change ON loading_sessions;
CREATE TRIGGER trg_session_change
  AFTER INSERT OR UPDATE ON loading_sessions
  FOR EACH ROW EXECUTE FUNCTION notify_session_change();
```

### 3.2 New Table: `cctv_engine_state`

```sql
-- Track detection engine status
CREATE TABLE IF NOT EXISTS cctv_engine_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id UUID REFERENCES cameras(id),
  session_id UUID REFERENCES loading_sessions(id),
  status TEXT DEFAULT 'idle', -- 'idle', 'running', 'error'
  loading_count INTEGER DEFAULT 0,
  rehab_count INTEGER DEFAULT 0,
  fps REAL DEFAULT 0,
  last_heartbeat TIMESTAMPTZ DEFAULT now(),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 4. Python Detector: Supabase Integration

### 4.1 New File: `src/integrations/supabase/supabase_listener.py`

```python
"""
Supabase Realtime Listener for CCTV Detection Engine
Subscribes to loading_sessions changes and triggers detection start/stop
"""

import json
import threading
import time
from supabase import create_client, Client
from realtime.connection import Socket

# Configuration
SUPABASE_URL = "https://jqwitfnkdxomeeblhuqd.supabase.co"
SUPABASE_ANON_KEY = "your-anon-key"  # From env

class SessionListener:
    """
    Listens to Supabase loading_sessions table for changes.
    Triggers detection engine start/stop based on session status.
    """
    
    def __init__(self, on_session_start, on_session_stop):
        """
        Args:
            on_session_start: Callback(session_data) when counting should start
            on_session_stop: Callback(session_id) when counting should stop
        """
        self.on_session_start = on_session_start
        self.on_session_stop = on_session_stop
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        self.active_sessions = {}  # {session_id: session_data}
        self._running = False
        
    def start(self):
        """Start listening to Supabase Realtime"""
        self._running = True
        
        # Initial fetch of active sessions
        self._fetch_active_sessions()
        
        # Subscribe to realtime changes
        self.supabase.realtime.channel('loading_sessions_changes').on(
            'postgres_changes',
            event='*',
            schema='public',
            table='loading_sessions',
            callback=self._handle_change
        ).subscribe()
        
        print("[SupabaseListener] Subscribed to loading_sessions realtime")
        
    def _fetch_active_sessions(self):
        """Fetch sessions that are currently in 'loading' status"""
        result = self.supabase.table('loading_sessions').select('*').eq(
            'status', 'loading'
        ).execute()
        
        for session in result.data:
            self.active_sessions[session['id']] = session
            self.on_session_start(session)
        
        print(f"[SupabaseListener] Found {len(result.data)} active sessions")
        
    def _handle_change(self, payload):
        """Handle realtime change events"""
        event_type = payload.get('eventType')
        new_data = payload.get('new', {})
        old_data = payload.get('old', {})
        
        session_id = new_data.get('id') or old_data.get('id')
        new_status = new_data.get('status')
        old_status = old_data.get('status')
        
        print(f"[SupabaseListener] Event: {event_type}, Session: {session_id}, Status: {old_status} -> {new_status}")
        
        # Session started loading
        if new_status == 'loading' and old_status != 'loading':
            self.active_sessions[session_id] = new_data
            self.on_session_start(new_data)
            
        # Session completed/stopped
        elif old_status == 'loading' and new_status != 'loading':
            if session_id in self.active_sessions:
                del self.active_sessions[session_id]
            self.on_session_stop(session_id)
            
    def update_counts(self, session_id, loading_count, rehab_count):
        """Push count updates back to Supabase"""
        try:
            self.supabase.table('loading_sessions').update({
                'loading_count': loading_count,
                'rehab_count': rehab_count,
                'updated_at': 'now()'
            }).eq('id', session_id).execute()
        except Exception as e:
            print(f"[SupabaseListener] Failed to update counts: {e}")
            
    def log_event(self, session_id, event_type, data):
        """Insert a loading_event"""
        try:
            self.supabase.table('loading_events').insert({
                'session_id': session_id,
                'event_type': event_type,
                'event_data': json.dumps(data),
                'created_at': 'now()'
            }).execute()
        except Exception as e:
            print(f"[SupabaseListener] Failed to log event: {e}")
            
    def stop(self):
        """Stop listening"""
        self._running = False
        self.supabase.realtime.close()
```

### 4.2 Modified Detector: Integration Points

```python
# In detector.py - Add integration with Supabase

from src.integrations.supabase.supabase_listener import SessionListener

# Global session tracker
active_session = None

def on_session_start(session_data):
    """Called when Flutter app starts a loading session"""
    global active_session, current_plate, loading, rehab, counting_active
    
    active_session = session_data
    current_plate = session_data.get('plate_number', 'UNKNOWN')
    counting_active = True
    loading = 0
    rehab = 0
    
    print(f"*** SESSION STARTED: {current_plate} (Session ID: {session_data['id']}) ***")
    
def on_session_stop(session_id):
    """Called when Flutter app completes/cancels session"""
    global active_session, counting_active
    
    if active_session and active_session['id'] == session_id:
        print(f"*** SESSION STOPPED: {current_plate} ***")
        counting_active = False
        active_session = None

# In main detection loop, periodically push counts:
def push_counts_to_supabase():
    if active_session:
        listener.update_counts(
            active_session['id'],
            loading,
            rehab
        )

# Initialize listener
listener = SessionListener(on_session_start, on_session_stop)
listener.start()
```

---

## 5. Flutter App Changes

### 5.1 Start Loading Session (Triggers Detection)

```dart
// lib/features/loading/data/loading_repository.dart

Future<void> startLoadingSession({
  required String driverId,
  required String truckId,
  required String plateNumber,
  required String dockId,
}) async {
  await supabase.from('loading_sessions').insert({
    'driver_id': driverId,
    'truck_id': truckId,
    'plate_number': plateNumber,  // For CCTV engine lookup
    'dock_id': dockId,
    'status': 'loading',          // This triggers the detection engine!
    'started_at': DateTime.now().toIso8601String(),
  });
}
```

### 5.2 Complete/Stop Session

```dart
Future<void> completeSession(String sessionId) async {
  await supabase.from('loading_sessions').update({
    'status': 'completed',        // This stops the detection engine
    'ended_at': DateTime.now().toIso8601String(),
  }).eq('id', sessionId);
}
```

### 5.3 Listen to Count Updates

```dart
// Real-time subscription to see live counts
Stream<LoadingSession> watchSession(String sessionId) {
  return supabase
      .from('loading_sessions')
      .stream(primaryKey: ['id'])
      .eq('id', sessionId)
      .map((data) => LoadingSession.fromJson(data.first));
}
```

---

## 6. Alur Lengkap (Sequence Diagram)

```
Driver (Flutter)     Supabase DB        Python Detector      Dashboard (React)
       │                  │                    │                    │
       │ 1. Start Session │                    │                    │
       │ (status=loading) │                    │                    │
       │─────────────────►│                    │                    │
       │                  │                    │                    │
       │                  │ 2. Realtime Event  │                    │
       │                  │───────────────────►│                    │
       │                  │                    │                    │
       │                  │                    │ 3. Start Counting  │
       │                  │                    │ (plate = session   │
       │                  │                    │  plate_number)     │
       │                  │                    │                    │
       │                  │                    │                    │
       │                  │ 4. Push Counts     │                    │
       │                  │◄───────────────────│                    │
       │                  │ (loading_count++)  │                    │
       │                  │                    │                    │
       │                  │ 5. Realtime Update │                    │
       │                  │────────────────────┼───────────────────►│
       │                  │                    │                    │
       │ 6. See Count     │                    │                    │
       │◄─────────────────│                    │                    │
       │                  │                    │                    │
       │ 7. Stop Session  │                    │                    │
       │ (status=done)    │                    │                    │
       │─────────────────►│                    │                    │
       │                  │                    │                    │
       │                  │ 8. Realtime Event  │                    │
       │                  │───────────────────►│                    │
       │                  │                    │                    │
       │                  │                    │ 9. Stop Counting   │
       │                  │                    │                    │
```

---

## 7. Backwards Compatibility

### 7.1 Hybrid Mode: Support Both Old and New Flow

```python
# detector.py - Support both QR/Telegram AND Supabase triggers

# Option 1: QR Scan (existing)
def on_qr(data):
    # Legacy flow - still works
    sync_with_api(data, "START")

# Option 2: Supabase Session (new)
def on_session_start(session_data):
    # New flow - from Flutter
    plate = session_data.get('plate_number')
    sync_with_api(plate, "START")

# Priority: If Supabase session exists, use it; else fallback to QR
```

### 7.2 Graceful Migration

1. **Phase 1**: Deploy Supabase listener alongside existing QR/Telegram
2. **Phase 2**: Test with Flutter app creating sessions
3. **Phase 3**: Gradually deprecate Telegram commands
4. **Phase 4**: Remove QR scanning (optional - may keep as fallback)

---

## 8. Checklist Implementasi

### Database (Supabase)
- [ ] Add `plate_number` to `loading_sessions`
- [ ] Add `counting_active`, `loading_count`, `rehab_count` columns
- [ ] Create realtime trigger function
- [ ] Create `cctv_engine_state` table

### Python Detector
- [ ] Create `src/integrations/supabase/supabase_listener.py`
- [ ] Add `supabase-py` to requirements.txt
- [ ] Modify `detector.py` to use SessionListener
- [ ] Add periodic count push (every 5 seconds)
- [ ] Add event logging to `loading_events`

### Flutter App
- [ ] Add Supabase client configuration
- [ ] Create loading session with `plate_number`
- [ ] Subscribe to realtime count updates
- [ ] Display live loading/rehab counts

### React Dashboard
- [ ] Subscribe to `loading_sessions` realtime
- [ ] Display live counting status per session
- [ ] Show which sessions have active detection

---

## 9. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| Supabase Realtime lag | Count delay | Keep local API as fallback |
| Network disconnect | Engine doesn't start | Heartbeat + auto-reconnect |
| Multiple cameras/sessions | Confusion | Map camera → dock → session |
| RLS blocks Python access | No data | Use service_role key for Python |

---

*Dokumen ini merupakan rencana teknis untuk integrasi trigger-based detection.*
*Flutter App → Database → CCTV Engine → Dashboard*
