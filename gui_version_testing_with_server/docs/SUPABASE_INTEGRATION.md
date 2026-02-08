# Supabase Integration for CCTV Detection Engine

## Overview

This integration connects the CCTV detection counting system to **Supabase** database, enabling:

1. **Flutter App Integration**: Operators can start/stop loading sessions from the mobile app
2. **Dual Database Writing**: Counts are written to BOTH Google Sheets AND Supabase
3. **Real-time Updates**: Flutter app receives live count updates via Supabase Realtime

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        VALIDATION SOURCES                            │
├────────────────────────────┬────────────────────────────────────────┤
│     QR Code Scanner        │         Flutter App                    │
│  (Operator scans plate)    │  (Operator taps "Start Loading")       │
└────────────┬───────────────┴───────────────────┬────────────────────┘
             │                                   │
             ▼                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SESSION MANAGER                                 │
│  - Listens to Supabase Realtime for Flutter-initiated sessions     │
│  - Accepts QR scan events from detector                             │
│  - Provides unified session state                                   │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DETECTOR                                     │
│  - Counts items crossing detection line                             │
│  - Uses session state from Session Manager                          │
│  - Sends count updates to Dual Uploader                             │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       DUAL UPLOADER                                  │
│  - Writes to Google Sheets (existing flow)                          │
│  - Writes to Supabase (new flow for Flutter)                        │
└───────────────────┬─────────────────────────────┬───────────────────┘
                    │                             │
                    ▼                             ▼
           ┌───────────────┐             ┌───────────────┐
           │ Google Sheets │             │   Supabase    │
           │   (Legacy)    │             │  (Flutter)    │
           └───────────────┘             └───────────────┘
```

## Files Created

| File | Purpose |
|------|---------|
| `session_manager.py` | Unified session state management (Supabase + QR) |
| `dual_uploader.py` | Writes counts to both Sheets and Supabase |
| `detector_integrated.py` | Detector using session manager |
| `main_integrated.py` | Entry point for integrated mode |
| `config.py` | Updated with Supabase config options |

## Setup

### 1. Install Dependencies

```bash
pip install supabase python-dotenv
```

### 2. Configure Supabase Credentials

Create a `.env` file in project root:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

Or pass via command line:

```bash
python -m src.detection.gui_version_partial.main_integrated \
    --supabase_url https://your-project.supabase.co \
    --supabase_key your-service-role-key
```

### 3. Required Supabase Tables

The Flutter app should have created these tables:

```sql
-- loading_sessions table
CREATE TABLE loading_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES drivers(id),
    truck_id UUID REFERENCES trucks(id),
    dock_id UUID,
    camera_id UUID,
    plate_number TEXT,
    plate_detected TEXT,
    status TEXT DEFAULT 'pending', -- pending, loading, completed, cancelled
    counting_active BOOLEAN DEFAULT FALSE,
    loading_count INT DEFAULT 0,
    rehab_count INT DEFAULT 0,
    items_in INT DEFAULT 0,
    items_out INT DEFAULT 0,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_seconds INT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- loading_events table (optional, for audit)
CREATE TABLE loading_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES loading_sessions(id),
    event_type TEXT,
    description TEXT,
    event_data JSONB,
    source TEXT,
    event_ts TIMESTAMPTZ DEFAULT NOW()
);
```

## Usage

### Run Integrated Mode (Sheets + Supabase)

```bash
python -m src.detection.gui_version_partial.main_integrated \
    --source rtsp://user:pass@camera-ip/stream
```

### Run Sheets-Only Mode (No Supabase)

```bash
python -m src.detection.gui_version_partial.main_integrated \
    --source rtsp://user:pass@camera-ip/stream \
    --no_supabase
```

### Run Original Detector (Unchanged Behavior)

```bash
python -m src.detection.gui_version_partial.main \
    --source rtsp://user:pass@camera-ip/stream
```

## How It Works

### Session Start

**From QR Scan:**
1. Operator scans QR code with plate number
2. QR Worker detects and validates plate format
3. Session Manager creates local session
4. Uploader creates row in Google Sheets
5. (Optional) If session exists in Supabase, links to it

**From Flutter App:**
1. Operator taps "Start Loading" in app
2. Flutter inserts/updates row in `loading_sessions` with status='loading'
3. Session Manager receives Supabase Realtime event
4. Session Manager creates session with Supabase ID
5. Detector starts counting

### Count Updates

1. Detector detects item crossing line
2. Session Manager increments count
3. Dual Uploader pushes to:
   - Google Sheets (update cell)
   - Supabase (update loading_count/rehab_count)
4. Flutter app receives Realtime update

### Session End

**From Timer (10 min):**
1. Detector timeout triggers
2. Session Manager ends session
3. Uploader finalizes Sheets row
4. Uploader updates Supabase status='completed'

**From Flutter App:**
1. Operator taps "Complete" in app
2. Flutter updates status='completed'
3. Session Manager receives event and stops counting

## Configuration Options

| CLI Argument | Env Variable | Default | Description |
|--------------|--------------|---------|-------------|
| `--supabase_url` | `SUPABASE_URL` | - | Supabase project URL |
| `--supabase_key` | `SUPABASE_SERVICE_ROLE_KEY` | - | Service role key |
| `--enable_supabase` | - | `True` | Enable Supabase integration |
| `--no_supabase` | - | `False` | Disable Supabase (Sheets only) |

## Troubleshooting

### "supabase-py not installed"
```bash
pip install supabase
```

### "Supabase credentials not found"
- Check `.env` file exists in project root
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- Or pass credentials via CLI arguments

### "Failed to subscribe to realtime"
- Verify Supabase URL is correct
- Check service role key has proper permissions
- Ensure Realtime is enabled for `loading_sessions` table

### Counts not syncing to Flutter
- Verify session was started from Flutter app (has `session_id`)
- Check Supabase Realtime is enabled
- Look for errors in uploader logs

## Migration Notes

- Existing QR scan flow unchanged
- Google Sheets integration unchanged
- Original `detector.py` and `main.py` still work
- New integrated mode is opt-in via `main_integrated.py`
