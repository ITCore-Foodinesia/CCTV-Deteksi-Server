-- ============================================================
-- CCTV Dashboard - Supabase Migration (SaaS-Ready)
-- ============================================================
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- 
-- This migration adds:
-- 1. Tenants table (multi-tenant support)
-- 2. User-tenant relationship
-- 3. Adds tenant_id to existing tables
-- 4. Creates necessary indexes
-- 5. Enables RLS with policies
-- ============================================================

-- ============================================================
-- STEP 1: Create ENUMs (if not exists)
-- ============================================================

-- Status enum for loading sessions
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loading_status') THEN
        CREATE TYPE loading_status AS ENUM (
            'waiting',      -- Menunggu truk
            'loading',      -- Sedang loading
            'unloading',    -- Sedang unloading
            'completed',    -- Selesai
            'cancelled',    -- Dibatalkan
            'error'         -- Error
        );
    END IF;
END $$;

-- Event type enum for loading events
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loading_event_type') THEN
        CREATE TYPE loading_event_type AS ENUM (
            'truck_detected',       -- Truk terdeteksi
            'plate_recognized',     -- Plat terbaca
            'loading_started',      -- Loading dimulai
            'loading_progress',     -- Progress loading
            'loading_completed',    -- Loading selesai
            'truck_departed',       -- Truk pergi
            'alert',                -- Alert/warning
            'manual_entry'          -- Entry manual
        );
    END IF;
END $$;

-- User role enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM (
            'owner',        -- Owner tenant (full access)
            'admin',        -- Admin (manage users, settings)
            'operator',     -- Operator (manage sessions, events)
            'viewer'        -- Viewer (read-only)
        );
    END IF;
END $$;


-- ============================================================
-- STEP 2: Create Tenants Table
-- ============================================================

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic info
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,  -- URL-friendly: slug.yourapp.com
    
    -- Plan & billing (for future SaaS)
    plan TEXT DEFAULT 'free',   -- free, starter, pro, enterprise
    plan_expires_at TIMESTAMPTZ,
    
    -- Settings
    settings JSONB DEFAULT '{}'::jsonb,
    -- Example settings:
    -- {
    --   "timezone": "Asia/Makassar",
    --   "language": "id",
    --   "notifications": { "email": true, "telegram": true },
    --   "retention_days": 90
    -- }
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- STEP 3: Create User-Tenant Relationship Table
-- ============================================================

CREATE TABLE IF NOT EXISTS user_tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Role
    role user_role DEFAULT 'viewer',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, tenant_id)
);


-- ============================================================
-- STEP 4: Add tenant_id to Existing Tables (if missing)
-- ============================================================

-- Add tenant_id to cameras
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cameras' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE cameras ADD COLUMN tenant_id UUID REFERENCES tenants(id);
    END IF;
END $$;

-- Add tenant_id to trucks
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trucks' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE trucks ADD COLUMN tenant_id UUID REFERENCES tenants(id);
    END IF;
END $$;

-- Ensure loading_sessions has tenant_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'loading_sessions' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE loading_sessions ADD COLUMN tenant_id UUID REFERENCES tenants(id);
    END IF;
END $$;


-- ============================================================
-- STEP 5: Create Indexes (Critical for Performance)
-- ============================================================

-- Tenants
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_is_active ON tenants(is_active);

-- User-Tenants
CREATE INDEX IF NOT EXISTS idx_user_tenants_user ON user_tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant ON user_tenants(tenant_id);

-- Cameras
CREATE INDEX IF NOT EXISTS idx_cameras_tenant ON cameras(tenant_id);

-- Trucks
CREATE INDEX IF NOT EXISTS idx_trucks_tenant ON trucks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_trucks_plate_normalized ON trucks(plate_normalized);
CREATE INDEX IF NOT EXISTS idx_trucks_plate_number ON trucks(plate_number);

-- Loading Sessions
CREATE INDEX IF NOT EXISTS idx_sessions_tenant ON loading_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON loading_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON loading_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_truck ON loading_sessions(truck_id);
CREATE INDEX IF NOT EXISTS idx_sessions_camera ON loading_sessions(camera_id);
-- Composite index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_sessions_tenant_started 
    ON loading_sessions(tenant_id, started_at DESC);

-- Loading Events
CREATE INDEX IF NOT EXISTS idx_events_session ON loading_events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_ts ON loading_events(event_ts DESC);
CREATE INDEX IF NOT EXISTS idx_events_type ON loading_events(event_type);


-- ============================================================
-- STEP 6: Enable Row Level Security (RLS)
-- ============================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE cameras ENABLE ROW LEVEL SECURITY;
ALTER TABLE trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE loading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loading_events ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- STEP 7: Create RLS Policies
-- ============================================================

-- Helper function: Get user's tenant IDs
CREATE OR REPLACE FUNCTION get_user_tenant_ids()
RETURNS SETOF UUID AS $$
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function: Check if user has role in tenant
CREATE OR REPLACE FUNCTION user_has_role(target_tenant_id UUID, required_roles user_role[])
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_tenants 
        WHERE user_id = auth.uid() 
        AND tenant_id = target_tenant_id
        AND role = ANY(required_roles)
        AND is_active = true
    )
$$ LANGUAGE sql SECURITY DEFINER;


-- ----- TENANTS POLICIES -----
DROP POLICY IF EXISTS tenant_select ON tenants;
CREATE POLICY tenant_select ON tenants FOR SELECT USING (
    id IN (SELECT get_user_tenant_ids())
);

DROP POLICY IF EXISTS tenant_update ON tenants;
CREATE POLICY tenant_update ON tenants FOR UPDATE USING (
    user_has_role(id, ARRAY['owner'::user_role, 'admin'::user_role])
);


-- ----- USER_TENANTS POLICIES -----
DROP POLICY IF EXISTS user_tenants_select ON user_tenants;
CREATE POLICY user_tenants_select ON user_tenants FOR SELECT USING (
    tenant_id IN (SELECT get_user_tenant_ids())
);

DROP POLICY IF EXISTS user_tenants_insert ON user_tenants;
CREATE POLICY user_tenants_insert ON user_tenants FOR INSERT WITH CHECK (
    user_has_role(tenant_id, ARRAY['owner'::user_role, 'admin'::user_role])
);

DROP POLICY IF EXISTS user_tenants_update ON user_tenants;
CREATE POLICY user_tenants_update ON user_tenants FOR UPDATE USING (
    user_has_role(tenant_id, ARRAY['owner'::user_role, 'admin'::user_role])
);

DROP POLICY IF EXISTS user_tenants_delete ON user_tenants;
CREATE POLICY user_tenants_delete ON user_tenants FOR DELETE USING (
    user_has_role(tenant_id, ARRAY['owner'::user_role])
);


-- ----- CAMERAS POLICIES -----
DROP POLICY IF EXISTS cameras_select ON cameras;
CREATE POLICY cameras_select ON cameras FOR SELECT USING (
    tenant_id IN (SELECT get_user_tenant_ids())
);

DROP POLICY IF EXISTS cameras_insert ON cameras;
CREATE POLICY cameras_insert ON cameras FOR INSERT WITH CHECK (
    user_has_role(tenant_id, ARRAY['owner'::user_role, 'admin'::user_role, 'operator'::user_role])
);

DROP POLICY IF EXISTS cameras_update ON cameras;
CREATE POLICY cameras_update ON cameras FOR UPDATE USING (
    user_has_role(tenant_id, ARRAY['owner'::user_role, 'admin'::user_role, 'operator'::user_role])
);

DROP POLICY IF EXISTS cameras_delete ON cameras;
CREATE POLICY cameras_delete ON cameras FOR DELETE USING (
    user_has_role(tenant_id, ARRAY['owner'::user_role, 'admin'::user_role])
);


-- ----- TRUCKS POLICIES -----
DROP POLICY IF EXISTS trucks_select ON trucks;
CREATE POLICY trucks_select ON trucks FOR SELECT USING (
    tenant_id IN (SELECT get_user_tenant_ids())
);

DROP POLICY IF EXISTS trucks_insert ON trucks;
CREATE POLICY trucks_insert ON trucks FOR INSERT WITH CHECK (
    user_has_role(tenant_id, ARRAY['owner'::user_role, 'admin'::user_role, 'operator'::user_role])
);

DROP POLICY IF EXISTS trucks_update ON trucks;
CREATE POLICY trucks_update ON trucks FOR UPDATE USING (
    user_has_role(tenant_id, ARRAY['owner'::user_role, 'admin'::user_role, 'operator'::user_role])
);

DROP POLICY IF EXISTS trucks_delete ON trucks;
CREATE POLICY trucks_delete ON trucks FOR DELETE USING (
    user_has_role(tenant_id, ARRAY['owner'::user_role, 'admin'::user_role])
);


-- ----- LOADING_SESSIONS POLICIES -----
DROP POLICY IF EXISTS sessions_select ON loading_sessions;
CREATE POLICY sessions_select ON loading_sessions FOR SELECT USING (
    tenant_id IN (SELECT get_user_tenant_ids())
);

DROP POLICY IF EXISTS sessions_insert ON loading_sessions;
CREATE POLICY sessions_insert ON loading_sessions FOR INSERT WITH CHECK (
    user_has_role(tenant_id, ARRAY['owner'::user_role, 'admin'::user_role, 'operator'::user_role])
);

DROP POLICY IF EXISTS sessions_update ON loading_sessions;
CREATE POLICY sessions_update ON loading_sessions FOR UPDATE USING (
    user_has_role(tenant_id, ARRAY['owner'::user_role, 'admin'::user_role, 'operator'::user_role])
);

DROP POLICY IF EXISTS sessions_delete ON loading_sessions;
CREATE POLICY sessions_delete ON loading_sessions FOR DELETE USING (
    user_has_role(tenant_id, ARRAY['owner'::user_role, 'admin'::user_role])
);


-- ----- LOADING_EVENTS POLICIES -----
-- Events inherit access from their session's tenant
DROP POLICY IF EXISTS events_select ON loading_events;
CREATE POLICY events_select ON loading_events FOR SELECT USING (
    session_id IN (
        SELECT id FROM loading_sessions 
        WHERE tenant_id IN (SELECT get_user_tenant_ids())
    )
);

DROP POLICY IF EXISTS events_insert ON loading_events;
CREATE POLICY events_insert ON loading_events FOR INSERT WITH CHECK (
    session_id IN (
        SELECT id FROM loading_sessions 
        WHERE tenant_id IN (SELECT get_user_tenant_ids())
        AND user_has_role(tenant_id, ARRAY['owner'::user_role, 'admin'::user_role, 'operator'::user_role])
    )
);


-- ============================================================
-- STEP 8: Insert Default Tenant (Your Company)
-- ============================================================

-- Insert your company as the first tenant
INSERT INTO tenants (name, slug, plan, settings)
VALUES (
    'My Company',           -- Change to your company name
    'default',              -- Default slug
    'free',                 -- Start with free plan
    '{
        "timezone": "Asia/Makassar",
        "language": "id",
        "notifications": {
            "email": true,
            "telegram": true
        },
        "retention_days": 90
    }'::jsonb
)
ON CONFLICT (slug) DO NOTHING;


-- ============================================================
-- STEP 9: Helper Function to Setup First User
-- ============================================================

-- Call this after user signs up to make them owner of default tenant
CREATE OR REPLACE FUNCTION setup_first_user()
RETURNS TRIGGER AS $$
DECLARE
    default_tenant_id UUID;
    user_count INTEGER;
BEGIN
    -- Get default tenant
    SELECT id INTO default_tenant_id FROM tenants WHERE slug = 'default' LIMIT 1;
    
    -- Count existing users in default tenant
    SELECT COUNT(*) INTO user_count FROM user_tenants WHERE tenant_id = default_tenant_id;
    
    -- If this is the first user, make them owner
    IF default_tenant_id IS NOT NULL THEN
        IF user_count = 0 THEN
            INSERT INTO user_tenants (user_id, tenant_id, role, accepted_at)
            VALUES (NEW.id, default_tenant_id, 'owner', NOW());
        ELSE
            -- Subsequent users get viewer role (can be changed by admin)
            INSERT INTO user_tenants (user_id, tenant_id, role, accepted_at)
            VALUES (NEW.id, default_tenant_id, 'viewer', NOW());
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-setup user on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION setup_first_user();


-- ============================================================
-- STEP 10: Update Existing Data with Default Tenant
-- ============================================================

-- Update cameras without tenant_id
UPDATE cameras 
SET tenant_id = (SELECT id FROM tenants WHERE slug = 'default' LIMIT 1)
WHERE tenant_id IS NULL;

-- Update trucks without tenant_id
UPDATE trucks 
SET tenant_id = (SELECT id FROM tenants WHERE slug = 'default' LIMIT 1)
WHERE tenant_id IS NULL;

-- Update loading_sessions without tenant_id
UPDATE loading_sessions 
SET tenant_id = (SELECT id FROM tenants WHERE slug = 'default' LIMIT 1)
WHERE tenant_id IS NULL;


-- ============================================================
-- DONE! Migration Complete
-- ============================================================

-- Verification queries (run manually to check):
-- 
-- SELECT * FROM tenants;
-- SELECT * FROM user_tenants;
-- SELECT COUNT(*) as cameras FROM cameras WHERE tenant_id IS NOT NULL;
-- SELECT COUNT(*) as trucks FROM trucks WHERE tenant_id IS NOT NULL;
-- SELECT COUNT(*) as sessions FROM loading_sessions WHERE tenant_id IS NOT NULL;
