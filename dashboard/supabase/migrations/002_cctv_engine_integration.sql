-- Migration: 002_cctv_engine_integration.sql
-- Description: Add columns for CCTV engine integration with Flutter app
-- 
-- This migration adds:
-- 1. Counting-related columns to loading_sessions
-- 2. Realtime trigger function for pg_notify
-- 3. cctv_engine_state table for tracking detection status
-- 4. helpers and loaders tables if they don't exist
--
-- Rollback: See bottom of file for rollback statements

-- ============================================================================
-- PART 1: Add columns to loading_sessions
-- ============================================================================

-- Add plate_number for quick lookup (denormalized from trucks table)
ALTER TABLE loading_sessions 
ADD COLUMN IF NOT EXISTS plate_number TEXT;

-- Add plate_detected for OCR result from CCTV
ALTER TABLE loading_sessions 
ADD COLUMN IF NOT EXISTS plate_detected TEXT;

-- Add counting control columns
ALTER TABLE loading_sessions 
ADD COLUMN IF NOT EXISTS counting_active BOOLEAN DEFAULT FALSE;

ALTER TABLE loading_sessions 
ADD COLUMN IF NOT EXISTS counting_started_at TIMESTAMPTZ;

-- Add counting result columns
ALTER TABLE loading_sessions 
ADD COLUMN IF NOT EXISTS loading_count INTEGER DEFAULT 0;

ALTER TABLE loading_sessions 
ADD COLUMN IF NOT EXISTS rehab_count INTEGER DEFAULT 0;

-- Index for quick lookup by plate number
CREATE INDEX IF NOT EXISTS idx_loading_sessions_plate_number 
ON loading_sessions(plate_number);

CREATE INDEX IF NOT EXISTS idx_loading_sessions_plate_detected 
ON loading_sessions(plate_detected);

-- Index for active sessions (status + counting_active)
CREATE INDEX IF NOT EXISTS idx_loading_sessions_active 
ON loading_sessions(status) 
WHERE status IN ('loading', 'waiting', 'pending_dock');

-- ============================================================================
-- PART 2: Create realtime trigger function
-- ============================================================================

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_session_change ON loading_sessions;

-- Create trigger function for pg_notify
CREATE OR REPLACE FUNCTION notify_session_change()
RETURNS trigger AS $$
BEGIN
  -- Send notification with session data
  PERFORM pg_notify('session_changes', json_build_object(
    'id', NEW.id,
    'old_status', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
    'new_status', NEW.status,
    'plate_number', NEW.plate_number,
    'dock_id', NEW.dock_id,
    'camera_id', NEW.camera_id,
    'counting_active', NEW.counting_active,
    'loading_count', NEW.loading_count,
    'rehab_count', NEW.rehab_count,
    'operation', TG_OP,
    'timestamp', now()
  )::text);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on loading_sessions
CREATE TRIGGER trg_session_change
  AFTER INSERT OR UPDATE ON loading_sessions
  FOR EACH ROW 
  EXECUTE FUNCTION notify_session_change();

-- ============================================================================
-- PART 3: Create cctv_engine_state table
-- ============================================================================

CREATE TABLE IF NOT EXISTS cctv_engine_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id UUID REFERENCES cameras(id) ON DELETE SET NULL,
  session_id UUID REFERENCES loading_sessions(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Engine status
  status TEXT DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'paused', 'error')),
  
  -- Counting data
  loading_count INTEGER DEFAULT 0,
  rehab_count INTEGER DEFAULT 0,
  
  -- Performance metrics
  fps REAL DEFAULT 0,
  last_detection_at TIMESTAMPTZ,
  
  -- Health tracking
  last_heartbeat TIMESTAMPTZ DEFAULT now(),
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_cctv_engine_state_session 
ON cctv_engine_state(session_id);

CREATE INDEX IF NOT EXISTS idx_cctv_engine_state_camera 
ON cctv_engine_state(camera_id);

-- Enable RLS
ALTER TABLE cctv_engine_state ENABLE ROW LEVEL SECURITY;

-- RLS Policy: tenant isolation
CREATE POLICY cctv_engine_state_tenant_isolation ON cctv_engine_state
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- Allow service role to bypass RLS for backend operations
-- Note: Service role key automatically bypasses RLS

-- ============================================================================
-- PART 4: Create helpers table (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS helpers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Basic info
  name TEXT NOT NULL,
  phone TEXT,
  helper_code TEXT,
  
  -- Status
  status TEXT DEFAULT 'available' 
    CHECK (status IN ('available', 'assigned', 'on_break', 'off_duty')),
  
  -- Current assignment
  current_dock_id UUID REFERENCES docks(id) ON DELETE SET NULL,
  current_session_id UUID REFERENCES loading_sessions(id) ON DELETE SET NULL,
  
  -- Skills/capabilities
  skills JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_helpers_tenant ON helpers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_helpers_status ON helpers(status);
CREATE INDEX IF NOT EXISTS idx_helpers_dock ON helpers(current_dock_id);

-- Enable RLS
ALTER TABLE helpers ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY helpers_tenant_isolation ON helpers
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- ============================================================================
-- PART 5: Create loaders table (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS loaders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Basic info
  name TEXT NOT NULL,
  phone TEXT,
  loader_code TEXT,
  
  -- Status
  status TEXT DEFAULT 'available' 
    CHECK (status IN ('available', 'assigned', 'on_break', 'off_duty')),
  
  -- Current assignment
  current_dock_id UUID REFERENCES docks(id) ON DELETE SET NULL,
  current_session_id UUID REFERENCES loading_sessions(id) ON DELETE SET NULL,
  
  -- Specialty (e.g., heavy items, fragile, etc.)
  specialty TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_loaders_tenant ON loaders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_loaders_status ON loaders(status);
CREATE INDEX IF NOT EXISTS idx_loaders_dock ON loaders(current_dock_id);
CREATE INDEX IF NOT EXISTS idx_loaders_session ON loaders(current_session_id);

-- Enable RLS
ALTER TABLE loaders ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY loaders_tenant_isolation ON loaders
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- ============================================================================
-- PART 6: Enable Realtime for new tables
-- ============================================================================

-- Enable realtime publication for the tables
-- Note: This may need to be run by admin
DO $$
BEGIN
  -- Check if publication exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  
  -- Add tables to publication (ignoring errors if already added)
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE loading_sessions;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE loading_events;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE cctv_engine_state;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE helpers;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE loaders;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- ============================================================================
-- ROLLBACK STATEMENTS (use if needed)
-- ============================================================================
/*
-- Remove columns from loading_sessions
ALTER TABLE loading_sessions DROP COLUMN IF EXISTS plate_number;
ALTER TABLE loading_sessions DROP COLUMN IF EXISTS plate_detected;
ALTER TABLE loading_sessions DROP COLUMN IF EXISTS counting_active;
ALTER TABLE loading_sessions DROP COLUMN IF EXISTS counting_started_at;
ALTER TABLE loading_sessions DROP COLUMN IF EXISTS loading_count;
ALTER TABLE loading_sessions DROP COLUMN IF EXISTS rehab_count;

-- Remove indexes
DROP INDEX IF EXISTS idx_loading_sessions_plate_number;
DROP INDEX IF EXISTS idx_loading_sessions_plate_detected;
DROP INDEX IF EXISTS idx_loading_sessions_active;

-- Remove trigger
DROP TRIGGER IF EXISTS trg_session_change ON loading_sessions;
DROP FUNCTION IF EXISTS notify_session_change();

-- Remove tables
DROP TABLE IF EXISTS cctv_engine_state;
DROP TABLE IF EXISTS helpers;
DROP TABLE IF EXISTS loaders;
*/

-- ============================================================================
-- DONE
-- ============================================================================
COMMENT ON TABLE cctv_engine_state IS 'Tracks CCTV detection engine status per camera/session';
COMMENT ON TABLE helpers IS 'Warehouse helpers who assist with loading operations';
COMMENT ON TABLE loaders IS 'Personnel who physically load/unload items from trucks';
