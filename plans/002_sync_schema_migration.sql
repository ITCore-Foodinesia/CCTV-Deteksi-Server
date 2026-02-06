-- ============================================================
-- CCTV-Deteksi + Hello Flutter - Sync Schema Migration
-- ============================================================
-- Run this AFTER 001_saas_ready_schema.sql
--
-- This migration adds:
-- 1. New ENUMs for driver, dock, camera, notification status
-- 2. Drivers table
-- 3. Docks table
-- 4. Driver-Vehicle relationship table (OPTIONAL, for favorites)
-- 5. Notifications table
-- 6. Updates to existing tables for sync support
-- 7. RLS policies for new tables
--
-- DESIGN PRINCIPLE: FLEXIBLE DRIVER-TRUCK RELATIONSHIP
-- =====================================================
-- - Driver can choose ANY truck at session start (quick setup)
-- - loading_sessions.truck_id does NOT require truck in driver_vehicles
-- - driver_vehicles is OPTIONAL for storing "favorite" trucks
-- - Helper = Driver (no role distinction, same permissions)
-- - Truck selection is per-session, not permanent
-- ============================================================

-- ============================================================
-- STEP 1: Create New ENUMs
-- ============================================================

-- Driver status enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'driver_status') THEN
        CREATE TYPE driver_status AS ENUM (
            'pending_approval',  -- Menunggu approval admin
            'active',            -- Aktif
            'suspended',         -- Ditangguhkan
            'inactive'           -- Non-aktif
        );
    END IF;
END $$;

-- Dock status enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dock_status') THEN
        CREATE TYPE dock_status AS ENUM (
            'available',         -- Tersedia
            'loading',           -- Sedang loading
            'unloading',         -- Sedang unloading
            'maintenance',       -- Dalam perbaikan
            'reserved',          -- Direservasi
            'closed'             -- Ditutup
        );
    END IF;
END $$;

-- Camera status enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'camera_status') THEN
        CREATE TYPE camera_status AS ENUM (
            'online',            -- Online dan aktif
            'offline',           -- Tidak aktif
            'maintenance',       -- Dalam perbaikan
            'error'              -- Error
        );
    END IF;
END $$;

-- Notification type enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM (
            'loading_started',   -- Loading dimulai
            'loading_completed', -- Loading selesai
            'dock_assigned',     -- Dock ditugaskan
            'system',            -- Notifikasi sistem
            'alert',             -- Alert/warning
            'info'               -- Informasi umum
        );
    END IF;
END $$;


-- ============================================================
-- STEP 2: Create Drivers Table
-- ============================================================

CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tenant relationship
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Auth relationship (optional, jika driver punya akun Supabase Auth)
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Basic info
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    company_name TEXT,
    
    -- Driver identification
    driver_code TEXT,
    
    -- Status
    status driver_status DEFAULT 'pending_approval',
    
    -- Additional data (flexible)
    profile_data JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(tenant_id, phone)
);

-- Trigger to update updated_at
CREATE TRIGGER update_drivers_updated_at
    BEFORE UPDATE ON drivers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate driver_code function
CREATE OR REPLACE FUNCTION generate_driver_code()
RETURNS TRIGGER AS $$
DECLARE
    next_num INTEGER;
BEGIN
    IF NEW.driver_code IS NULL THEN
        SELECT COALESCE(MAX(CAST(SUBSTRING(driver_code FROM 5) AS INTEGER)), 0) + 1
        INTO next_num
        FROM drivers 
        WHERE tenant_id = NEW.tenant_id
        AND driver_code ~ '^DRV-[0-9]+$';
        
        NEW.driver_code := 'DRV-' || LPAD(next_num::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_driver_code
    BEFORE INSERT ON drivers
    FOR EACH ROW
    EXECUTE FUNCTION generate_driver_code();


-- ============================================================
-- STEP 3: Create Docks Table
-- ============================================================

CREATE TABLE IF NOT EXISTS docks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tenant relationship
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Dock identification
    dock_code TEXT NOT NULL,
    dock_name TEXT,
    warehouse_zone TEXT,
    
    -- Status
    status dock_status DEFAULT 'available',
    maintenance_reason TEXT,
    
    -- Capacity
    capacity INTEGER DEFAULT 1,
    
    -- Location data (for future GPS/map integration)
    location_data JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(tenant_id, dock_code)
);

-- Trigger to update updated_at
CREATE TRIGGER update_docks_updated_at
    BEFORE UPDATE ON docks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- STEP 4: Create Driver-Vehicles Relationship Table
-- ============================================================

CREATE TABLE IF NOT EXISTS driver_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    truck_id UUID NOT NULL REFERENCES trucks(id) ON DELETE CASCADE,
    
    -- Settings
    is_primary BOOLEAN DEFAULT false,
    
    -- Timestamps
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(driver_id, truck_id)
);

-- Ensure only one primary vehicle per driver
CREATE UNIQUE INDEX IF NOT EXISTS idx_driver_primary_vehicle 
    ON driver_vehicles(driver_id) 
    WHERE is_primary = true;


-- ============================================================
-- STEP 5: Create Notifications Table
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Target
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Content
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    
    -- Action data (untuk deep link)
    action_data JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);


-- ============================================================
-- STEP 6: Alter Existing Tables for Sync Support
-- ============================================================

-- Add driver_id to loading_sessions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'loading_sessions' AND column_name = 'driver_id'
    ) THEN
        ALTER TABLE loading_sessions ADD COLUMN driver_id UUID REFERENCES drivers(id);
    END IF;
END $$;

-- Add dock_id to loading_sessions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'loading_sessions' AND column_name = 'dock_id'
    ) THEN
        ALTER TABLE loading_sessions ADD COLUMN dock_id UUID REFERENCES docks(id);
    END IF;
END $$;

-- Add duration_seconds to loading_sessions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'loading_sessions' AND column_name = 'duration_seconds'
    ) THEN
        ALTER TABLE loading_sessions ADD COLUMN duration_seconds INTEGER;
    END IF;
END $$;

-- Add items_in to loading_sessions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'loading_sessions' AND column_name = 'items_in'
    ) THEN
        ALTER TABLE loading_sessions ADD COLUMN items_in INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add items_out to loading_sessions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'loading_sessions' AND column_name = 'items_out'
    ) THEN
        ALTER TABLE loading_sessions ADD COLUMN items_out INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add start_source to loading_sessions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'loading_sessions' AND column_name = 'start_source'
    ) THEN
        ALTER TABLE loading_sessions ADD COLUMN start_source TEXT DEFAULT 'cctv';
    END IF;
END $$;

-- Add plate_detected to loading_sessions (for CCTV detection matching)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'loading_sessions' AND column_name = 'plate_detected'
    ) THEN
        ALTER TABLE loading_sessions ADD COLUMN plate_detected TEXT;
    END IF;
END $$;

-- Add dock_id to cameras
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cameras' AND column_name = 'dock_id'
    ) THEN
        ALTER TABLE cameras ADD COLUMN dock_id UUID REFERENCES docks(id);
    END IF;
END $$;

-- Add status to cameras (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cameras' AND column_name = 'status'
    ) THEN
        ALTER TABLE cameras ADD COLUMN status camera_status DEFAULT 'offline';
    END IF;
END $$;

-- Add source to loading_events
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'loading_events' AND column_name = 'source'
    ) THEN
        ALTER TABLE loading_events ADD COLUMN source TEXT DEFAULT 'system';
    END IF;
END $$;


-- ============================================================
-- STEP 7: Create Indexes for Performance
-- ============================================================

-- Drivers indexes
CREATE INDEX IF NOT EXISTS idx_drivers_tenant ON drivers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_drivers_phone ON drivers(phone);
CREATE INDEX IF NOT EXISTS idx_drivers_auth_user ON drivers(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_drivers_code ON drivers(driver_code);

-- Docks indexes
CREATE INDEX IF NOT EXISTS idx_docks_tenant ON docks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_docks_code ON docks(dock_code);
CREATE INDEX IF NOT EXISTS idx_docks_status ON docks(status);

-- Driver vehicles indexes
CREATE INDEX IF NOT EXISTS idx_driver_vehicles_driver ON driver_vehicles(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_vehicles_truck ON driver_vehicles(truck_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_driver ON notifications(driver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(driver_id) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Loading sessions new indexes
CREATE INDEX IF NOT EXISTS idx_sessions_driver ON loading_sessions(driver_id);
CREATE INDEX IF NOT EXISTS idx_sessions_dock ON loading_sessions(dock_id);
CREATE INDEX IF NOT EXISTS idx_sessions_source ON loading_sessions(start_source);
CREATE INDEX IF NOT EXISTS idx_sessions_plate_detected ON loading_sessions(plate_detected);

-- Cameras new indexes
CREATE INDEX IF NOT EXISTS idx_cameras_dock ON cameras(dock_id);
CREATE INDEX IF NOT EXISTS idx_cameras_status ON cameras(status);


-- ============================================================
-- STEP 8: Enable Row Level Security
-- ============================================================

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE docks ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- STEP 9: Create RLS Policies for Drivers
-- ============================================================

-- Helper function: Check if user is the driver
CREATE OR REPLACE FUNCTION is_current_driver(target_driver_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM drivers 
        WHERE id = target_driver_id 
        AND auth_user_id = auth.uid()
    )
$$ LANGUAGE sql SECURITY DEFINER;

-- Drivers can read their own profile
DROP POLICY IF EXISTS drivers_self_read ON drivers;
CREATE POLICY drivers_self_read ON drivers
    FOR SELECT USING (auth_user_id = auth.uid());

-- Drivers can update their own profile
DROP POLICY IF EXISTS drivers_self_update ON drivers;
CREATE POLICY drivers_self_update ON drivers
    FOR UPDATE USING (auth_user_id = auth.uid());

-- Admins can read all drivers in their tenant
DROP POLICY IF EXISTS drivers_admin_read ON drivers;
CREATE POLICY drivers_admin_read ON drivers
    FOR SELECT USING (
        tenant_id IN (SELECT get_user_tenant_ids())
    );

-- Admins can insert new drivers
DROP POLICY IF EXISTS drivers_admin_insert ON drivers;
CREATE POLICY drivers_admin_insert ON drivers
    FOR INSERT WITH CHECK (
        user_has_role(tenant_id, ARRAY['owner'::user_role, 'admin'::user_role])
        OR auth_user_id = auth.uid()  -- Driver can register themselves
    );

-- Admins can update any driver
DROP POLICY IF EXISTS drivers_admin_update ON drivers;
CREATE POLICY drivers_admin_update ON drivers
    FOR UPDATE USING (
        user_has_role(tenant_id, ARRAY['owner'::user_role, 'admin'::user_role])
    );

-- Only owners can delete drivers
DROP POLICY IF EXISTS drivers_delete ON drivers;
CREATE POLICY drivers_delete ON drivers
    FOR DELETE USING (
        user_has_role(tenant_id, ARRAY['owner'::user_role])
    );


-- ============================================================
-- STEP 10: Create RLS Policies for Docks
-- ============================================================

-- Anyone in tenant can read docks
DROP POLICY IF EXISTS docks_select ON docks;
CREATE POLICY docks_select ON docks
    FOR SELECT USING (
        tenant_id IN (SELECT get_user_tenant_ids())
        OR EXISTS (
            SELECT 1 FROM drivers 
            WHERE drivers.tenant_id = docks.tenant_id 
            AND drivers.auth_user_id = auth.uid()
        )
    );

-- Only admins can insert docks
DROP POLICY IF EXISTS docks_insert ON docks;
CREATE POLICY docks_insert ON docks
    FOR INSERT WITH CHECK (
        user_has_role(tenant_id, ARRAY['owner'::user_role, 'admin'::user_role])
    );

-- Only admins can update docks
DROP POLICY IF EXISTS docks_update ON docks;
CREATE POLICY docks_update ON docks
    FOR UPDATE USING (
        user_has_role(tenant_id, ARRAY['owner'::user_role, 'admin'::user_role])
    );

-- Only owners can delete docks
DROP POLICY IF EXISTS docks_delete ON docks;
CREATE POLICY docks_delete ON docks
    FOR DELETE USING (
        user_has_role(tenant_id, ARRAY['owner'::user_role])
    );


-- ============================================================
-- STEP 11: Create RLS Policies for Driver Vehicles
-- ============================================================

-- Drivers can see their own vehicles
DROP POLICY IF EXISTS driver_vehicles_self_read ON driver_vehicles;
CREATE POLICY driver_vehicles_self_read ON driver_vehicles
    FOR SELECT USING (
        is_current_driver(driver_id)
    );

-- Drivers can add vehicles to themselves
DROP POLICY IF EXISTS driver_vehicles_self_insert ON driver_vehicles;
CREATE POLICY driver_vehicles_self_insert ON driver_vehicles
    FOR INSERT WITH CHECK (
        is_current_driver(driver_id)
    );

-- Drivers can update their own vehicle settings
DROP POLICY IF EXISTS driver_vehicles_self_update ON driver_vehicles;
CREATE POLICY driver_vehicles_self_update ON driver_vehicles
    FOR UPDATE USING (
        is_current_driver(driver_id)
    );

-- Drivers can remove their own vehicles
DROP POLICY IF EXISTS driver_vehicles_self_delete ON driver_vehicles;
CREATE POLICY driver_vehicles_self_delete ON driver_vehicles
    FOR DELETE USING (
        is_current_driver(driver_id)
    );

-- Admins can manage all driver vehicles in their tenant
DROP POLICY IF EXISTS driver_vehicles_admin ON driver_vehicles;
CREATE POLICY driver_vehicles_admin ON driver_vehicles
    FOR ALL USING (
        driver_id IN (
            SELECT id FROM drivers 
            WHERE tenant_id IN (SELECT get_user_tenant_ids())
            AND user_has_role(tenant_id, ARRAY['owner'::user_role, 'admin'::user_role])
        )
    );


-- ============================================================
-- STEP 12: Create RLS Policies for Notifications
-- ============================================================

-- Drivers can only read their own notifications
DROP POLICY IF EXISTS notifications_self_read ON notifications;
CREATE POLICY notifications_self_read ON notifications
    FOR SELECT USING (
        is_current_driver(driver_id)
    );

-- Drivers can mark their notifications as read
DROP POLICY IF EXISTS notifications_self_update ON notifications;
CREATE POLICY notifications_self_update ON notifications
    FOR UPDATE USING (
        is_current_driver(driver_id)
    );

-- System/admins can insert notifications
DROP POLICY IF EXISTS notifications_insert ON notifications;
CREATE POLICY notifications_insert ON notifications
    FOR INSERT WITH CHECK (
        user_has_role(tenant_id, ARRAY['owner'::user_role, 'admin'::user_role, 'operator'::user_role])
    );

-- Admins can view all notifications in tenant
DROP POLICY IF EXISTS notifications_admin_read ON notifications;
CREATE POLICY notifications_admin_read ON notifications
    FOR SELECT USING (
        user_has_role(tenant_id, ARRAY['owner'::user_role, 'admin'::user_role])
    );


-- ============================================================
-- STEP 13: Update Loading Sessions Policies
-- ============================================================

-- Drivers can see their own sessions
DROP POLICY IF EXISTS sessions_driver_read ON loading_sessions;
CREATE POLICY sessions_driver_read ON loading_sessions
    FOR SELECT USING (
        driver_id IN (
            SELECT id FROM drivers WHERE auth_user_id = auth.uid()
        )
    );

-- Drivers can start their own sessions
DROP POLICY IF EXISTS sessions_driver_insert ON loading_sessions;
CREATE POLICY sessions_driver_insert ON loading_sessions
    FOR INSERT WITH CHECK (
        driver_id IN (
            SELECT id FROM drivers WHERE auth_user_id = auth.uid()
        )
        AND tenant_id IN (
            SELECT tenant_id FROM drivers WHERE auth_user_id = auth.uid()
        )
    );

-- Drivers can update their own active sessions
DROP POLICY IF EXISTS sessions_driver_update ON loading_sessions;
CREATE POLICY sessions_driver_update ON loading_sessions
    FOR UPDATE USING (
        driver_id IN (
            SELECT id FROM drivers WHERE auth_user_id = auth.uid()
        )
        AND status IN ('waiting', 'loading', 'unloading')
    );


-- ============================================================
-- STEP 14: Helper Functions for Mobile App
-- ============================================================

-- Function to get driver's active session
CREATE OR REPLACE FUNCTION get_driver_active_session(p_driver_id UUID)
RETURNS SETOF loading_sessions AS $$
    SELECT * FROM loading_sessions
    WHERE driver_id = p_driver_id
    AND status IN ('waiting', 'loading', 'unloading')
    ORDER BY started_at DESC
    LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to start a loading session from mobile app
CREATE OR REPLACE FUNCTION start_loading_session(
    p_driver_id UUID,
    p_truck_id UUID,
    p_dock_id UUID DEFAULT NULL
)
RETURNS loading_sessions AS $$
DECLARE
    v_tenant_id UUID;
    v_session loading_sessions;
BEGIN
    -- Get driver's tenant
    SELECT tenant_id INTO v_tenant_id 
    FROM drivers 
    WHERE id = p_driver_id;
    
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Driver not found';
    END IF;
    
    -- Check if driver already has active session
    IF EXISTS (
        SELECT 1 FROM loading_sessions 
        WHERE driver_id = p_driver_id 
        AND status IN ('waiting', 'loading', 'unloading')
    ) THEN
        RAISE EXCEPTION 'Driver already has an active session';
    END IF;
    
    -- Create session
    INSERT INTO loading_sessions (
        tenant_id,
        driver_id,
        truck_id,
        dock_id,
        status,
        started_at,
        start_source
    ) VALUES (
        v_tenant_id,
        p_driver_id,
        p_truck_id,
        p_dock_id,
        'loading',
        NOW(),
        'mobile_app'
    )
    RETURNING * INTO v_session;
    
    -- Update dock status if specified
    IF p_dock_id IS NOT NULL THEN
        UPDATE docks 
        SET status = 'loading', updated_at = NOW()
        WHERE id = p_dock_id;
    END IF;
    
    RETURN v_session;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete a loading session
CREATE OR REPLACE FUNCTION complete_loading_session(
    p_session_id UUID,
    p_items_in INTEGER DEFAULT 0,
    p_items_out INTEGER DEFAULT 0
)
RETURNS loading_sessions AS $$
DECLARE
    v_session loading_sessions;
    v_duration INTEGER;
BEGIN
    -- Get and lock session
    SELECT * INTO v_session 
    FROM loading_sessions 
    WHERE id = p_session_id
    FOR UPDATE;
    
    IF v_session IS NULL THEN
        RAISE EXCEPTION 'Session not found';
    END IF;
    
    IF v_session.status NOT IN ('loading', 'unloading') THEN
        RAISE EXCEPTION 'Session is not active';
    END IF;
    
    -- Calculate duration
    v_duration := EXTRACT(EPOCH FROM (NOW() - v_session.started_at))::INTEGER;
    
    -- Update session
    UPDATE loading_sessions SET
        status = 'completed',
        ended_at = NOW(),
        duration_seconds = v_duration,
        items_in = p_items_in,
        items_out = p_items_out
    WHERE id = p_session_id
    RETURNING * INTO v_session;
    
    -- Update dock status if applicable
    IF v_session.dock_id IS NOT NULL THEN
        UPDATE docks 
        SET status = 'available', updated_at = NOW()
        WHERE id = v_session.dock_id;
    END IF;
    
    -- Create notification for driver
    INSERT INTO notifications (
        driver_id,
        tenant_id,
        type,
        title,
        message,
        action_data
    ) VALUES (
        v_session.driver_id,
        v_session.tenant_id,
        'loading_completed',
        'Loading Selesai',
        'Loading selesai dalam ' || (v_duration / 60) || ' menit',
        jsonb_build_object('session_id', p_session_id)
    );
    
    -- Log event
    INSERT INTO loading_events (
        session_id,
        event_type,
        description,
        event_data,
        source
    ) VALUES (
        p_session_id,
        'loading_completed',
        'Loading completed via mobile app',
        jsonb_build_object(
            'duration_seconds', v_duration,
            'items_in', p_items_in,
            'items_out', p_items_out
        ),
        'mobile_app'
    );
    
    RETURN v_session;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to match CCTV plate detection with active session
CREATE OR REPLACE FUNCTION match_plate_detection(
    p_plate TEXT,
    p_tenant_id UUID
)
RETURNS loading_sessions AS $$
DECLARE
    v_normalized TEXT;
    v_session loading_sessions;
BEGIN
    -- Normalize plate
    v_normalized := UPPER(REPLACE(REPLACE(p_plate, ' ', ''), '-', ''));
    
    -- Find matching active session
    SELECT ls.* INTO v_session
    FROM loading_sessions ls
    JOIN trucks t ON ls.truck_id = t.id
    WHERE ls.tenant_id = p_tenant_id
    AND ls.status IN ('loading', 'unloading')
    AND ls.plate_detected IS NULL
    AND t.plate_normalized = v_normalized;
    
    IF v_session IS NOT NULL THEN
        -- Update session with detected plate
        UPDATE loading_sessions
        SET plate_detected = p_plate
        WHERE id = v_session.id
        RETURNING * INTO v_session;
        
        -- Log event
        INSERT INTO loading_events (
            session_id,
            event_type,
            description,
            event_data,
            source
        ) VALUES (
            v_session.id,
            'plate_recognized',
            'Plate detected by CCTV: ' || p_plate,
            jsonb_build_object('plate', p_plate, 'normalized', v_normalized),
            'cctv_detection'
        );
    END IF;
    
    RETURN v_session;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- STEP 15: Seed Sample Docks for Default Tenant
-- ============================================================

-- Insert sample docks
INSERT INTO docks (tenant_id, dock_code, dock_name, warehouse_zone, status)
SELECT 
    t.id,
    dock.code,
    dock.name,
    dock.zone,
    dock.status::dock_status
FROM tenants t
CROSS JOIN (VALUES
    ('A1', 'Dock A-01', 'Zone A', 'available'),
    ('A2', 'Dock A-02', 'Zone A', 'available'),
    ('A3', 'Dock A-03', 'Zone A', 'available'),
    ('B1', 'Dock B-01', 'Zone B', 'available'),
    ('B2', 'Dock B-02', 'Zone B', 'available'),
    ('B3', 'Dock B-03', 'Zone B', 'maintenance'),
    ('C1', 'Dock C-01', 'Zone C', 'available'),
    ('C2', 'Dock C-02', 'Zone C', 'available'),
    ('C3', 'Dock C-03', 'Zone C', 'available')
) AS dock(code, name, zone, status)
WHERE t.slug = 'default'
ON CONFLICT (tenant_id, dock_code) DO NOTHING;


-- ============================================================
-- STEP 16: Create Realtime Publication
-- ============================================================

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE drivers;
ALTER PUBLICATION supabase_realtime ADD TABLE docks;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE driver_vehicles;


-- ============================================================
-- DONE! Sync Schema Migration Complete
-- ============================================================

-- Verification queries (run manually to check):
-- 
-- SELECT * FROM drivers;
-- SELECT * FROM docks;
-- SELECT * FROM driver_vehicles;
-- SELECT * FROM notifications;
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'loading_sessions';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'cameras';
