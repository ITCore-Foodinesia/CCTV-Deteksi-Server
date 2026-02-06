-- ============================================================
-- CCTV Dashboard - Dummy Data for Testing
-- ============================================================
-- Run this AFTER the migration (001_saas_ready_schema.sql)
-- This creates realistic sample data for testing the dashboard
-- ============================================================

-- ============================================================
-- 1. Ensure Default Tenant Exists
-- ============================================================
INSERT INTO tenants (id, name, slug, plan, settings)
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'PT Icetube Indonesia',
    'default',
    'pro',
    '{
        "timezone": "Asia/Makassar",
        "language": "id",
        "notifications": {"email": true, "telegram": true},
        "retention_days": 90
    }'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    settings = EXCLUDED.settings;


-- ============================================================
-- 2. Insert Cameras
-- ============================================================
INSERT INTO cameras (id, name, location, longitude, latitude, description, tenant_id, created_at)
VALUES
    ('cam-001', 'Camera Dock 1', 'Loading Dock Area A', 119.4327, -5.1477, 'Main loading dock camera - HD 1080p', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', NOW() - INTERVAL '30 days'),
    ('cam-002', 'Camera Dock 2', 'Loading Dock Area B', 119.4328, -5.1478, 'Secondary dock camera', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', NOW() - INTERVAL '30 days'),
    ('cam-003', 'Camera Entrance', 'Main Gate', 119.4320, -5.1470, 'Entrance gate camera for plate recognition', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', NOW() - INTERVAL '30 days')
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 3. Insert Trucks (Realistic Indonesian Plates)
-- ============================================================
INSERT INTO trucks (id, plate_number, plate_normalized, truck_type, meta, tenant_id, created_at)
VALUES
    ('truck-001', 'B 1234 ABC', 'B1234ABC', 'box', '{"owner": "PT Logistik Nusantara", "capacity_kg": 5000}', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', NOW() - INTERVAL '60 days'),
    ('truck-002', 'B 5678 DEF', 'B5678DEF', 'box', '{"owner": "CV Maju Bersama", "capacity_kg": 3000}', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', NOW() - INTERVAL '55 days'),
    ('truck-003', 'DD 9999 XYZ', 'DD9999XYZ', 'trailer', '{"owner": "PT Ekspedisi Sulawesi", "capacity_kg": 10000}', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', NOW() - INTERVAL '50 days'),
    ('truck-004', 'B 1111 GHI', 'B1111GHI', 'box', '{"owner": "Koperasi Angkutan", "capacity_kg": 4000}', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', NOW() - INTERVAL '45 days'),
    ('truck-005', 'DD 2222 JKL', 'DD2222JKL', 'pickup', '{"owner": "Toko Segar Selalu", "capacity_kg": 1500}', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', NOW() - INTERVAL '40 days'),
    ('truck-006', 'B 3333 MNO', 'B3333MNO', 'box', '{"owner": "PT Cold Chain Indonesia", "capacity_kg": 6000}', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', NOW() - INTERVAL '35 days'),
    ('truck-007', 'DD 4444 PQR', 'DD4444PQR', 'trailer', '{"owner": "CV Dingin Sejuk", "capacity_kg": 8000}', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', NOW() - INTERVAL '30 days'),
    ('truck-008', 'B 5555 STU', 'B5555STU', 'box', '{"owner": "PT Es Abadi", "capacity_kg": 4500}', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', NOW() - INTERVAL '25 days')
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 4. Insert Loading Sessions (Last 7 Days)
-- ============================================================

-- Day 1 (Today)
INSERT INTO loading_sessions (id, truck_id, camera_id, tenant_id, status, started_at, finished_at, metadata, created_at)
VALUES
    ('sess-001', 'truck-001', 'cam-001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'completed', 
     NOW() - INTERVAL '6 hours', NOW() - INTERVAL '5 hours 15 minutes',
     '{"driver": "Budi Santoso", "items": "Es Batu Kristal 50kg x 10", "loading": 50, "rehab": 0, "notes": "Pengiriman reguler"}',
     NOW() - INTERVAL '6 hours'),
    
    ('sess-002', 'truck-002', 'cam-001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'completed', 
     NOW() - INTERVAL '4 hours', NOW() - INTERVAL '3 hours 30 minutes',
     '{"driver": "Andi Wijaya", "items": "Es Balok 25kg x 20", "loading": 30, "rehab": 10, "notes": "Sebagian rehab karena melt"}',
     NOW() - INTERVAL '4 hours'),
    
    ('sess-003', 'truck-003', 'cam-002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'loading', 
     NOW() - INTERVAL '1 hour', NULL,
     '{"driver": "Joko Prasetyo", "items": "Es Kristal Premium 75kg x 15", "loading": 45, "rehab": 5, "notes": "Masih dalam proses"}',
     NOW() - INTERVAL '1 hour'),
    
    ('sess-004', 'truck-004', 'cam-001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'completed', 
     NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour 30 minutes',
     '{"driver": "Rudi Hartono", "items": "Es Batu Curah 100kg", "loading": 60, "rehab": 0, "notes": "Pengiriman cepat"}',
     NOW() - INTERVAL '2 hours');

-- Day 2 (Yesterday)
INSERT INTO loading_sessions (id, truck_id, camera_id, tenant_id, status, started_at, finished_at, metadata, created_at)
VALUES
    ('sess-005', 'truck-005', 'cam-001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'completed', 
     NOW() - INTERVAL '1 day 7 hours', NOW() - INTERVAL '1 day 6 hours',
     '{"driver": "Slamet Riyadi", "items": "Es Serut 20kg x 25", "loading": 40, "rehab": 0, "notes": ""}',
     NOW() - INTERVAL '1 day 7 hours'),
    
    ('sess-006', 'truck-006', 'cam-002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'completed', 
     NOW() - INTERVAL '1 day 5 hours', NOW() - INTERVAL '1 day 4 hours',
     '{"driver": "Hendra Gunawan", "items": "Es Balok Premium 50kg x 30", "loading": 100, "rehab": 5, "notes": "Order besar"}',
     NOW() - INTERVAL '1 day 5 hours'),
    
    ('sess-007', 'truck-007', 'cam-001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'completed', 
     NOW() - INTERVAL '1 day 3 hours', NOW() - INTERVAL '1 day 2 hours',
     '{"driver": "Agus Supriyadi", "items": "Es Kristal 100kg x 20", "loading": 150, "rehab": 10, "notes": "Pengiriman antar pulau"}',
     NOW() - INTERVAL '1 day 3 hours');

-- Day 3-7 (Previous days - more samples)
INSERT INTO loading_sessions (id, truck_id, camera_id, tenant_id, status, started_at, finished_at, metadata, created_at)
VALUES
    ('sess-008', 'truck-001', 'cam-001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'completed', 
     NOW() - INTERVAL '2 days 8 hours', NOW() - INTERVAL '2 days 7 hours',
     '{"driver": "Budi Santoso", "items": "Es Batu 50kg x 8", "loading": 35, "rehab": 0, "notes": ""}',
     NOW() - INTERVAL '2 days 8 hours'),
    
    ('sess-009', 'truck-008', 'cam-002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'completed', 
     NOW() - INTERVAL '2 days 4 hours', NOW() - INTERVAL '2 days 3 hours',
     '{"driver": "Dedi Kusuma", "items": "Es Balok 25kg x 40", "loading": 80, "rehab": 8, "notes": "Kondisi baik"}',
     NOW() - INTERVAL '2 days 4 hours'),
    
    ('sess-010', 'truck-002', 'cam-001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'completed', 
     NOW() - INTERVAL '3 days 6 hours', NOW() - INTERVAL '3 days 5 hours',
     '{"driver": "Andi Wijaya", "items": "Es Kristal 75kg x 12", "loading": 65, "rehab": 3, "notes": ""}',
     NOW() - INTERVAL '3 days 6 hours'),
    
    ('sess-011', 'truck-004', 'cam-002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'completed', 
     NOW() - INTERVAL '4 days 7 hours', NOW() - INTERVAL '4 days 6 hours',
     '{"driver": "Rudi Hartono", "items": "Es Batu Curah 150kg", "loading": 90, "rehab": 0, "notes": "Order besar"}',
     NOW() - INTERVAL '4 days 7 hours'),
    
    ('sess-012', 'truck-006', 'cam-001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'completed', 
     NOW() - INTERVAL '5 days 5 hours', NOW() - INTERVAL '5 days 4 hours',
     '{"driver": "Hendra Gunawan", "items": "Es Balok 50kg x 20", "loading": 70, "rehab": 5, "notes": ""}',
     NOW() - INTERVAL '5 days 5 hours'),
    
    ('sess-013', 'truck-003', 'cam-002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'completed', 
     NOW() - INTERVAL '6 days 8 hours', NOW() - INTERVAL '6 days 7 hours',
     '{"driver": "Joko Prasetyo", "items": "Es Kristal 100kg x 25", "loading": 180, "rehab": 12, "notes": "Pengiriman besar"}',
     NOW() - INTERVAL '6 days 8 hours'),
    
    ('sess-014', 'truck-007', 'cam-001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'completed', 
     NOW() - INTERVAL '7 days 6 hours', NOW() - INTERVAL '7 days 5 hours',
     '{"driver": "Agus Supriyadi", "items": "Es Balok Premium 75kg x 15", "loading": 85, "rehab": 7, "notes": ""}',
     NOW() - INTERVAL '7 days 6 hours')
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 5. Insert Loading Events (Detailed Detection Events)
-- ============================================================

-- Events for session 1 (Today, completed)
INSERT INTO loading_events (id, session_id, truck_id, camera_id, event_type, event_ts, confidence, bbox, frame_url, raw_payload, created_at)
VALUES
    ('evt-001', 'sess-001', 'truck-001', 'cam-003', 'truck_detected', NOW() - INTERVAL '6 hours 5 minutes', 0.92, 
     '{"x": 100, "y": 200, "width": 400, "height": 300}', 
     'https://storage.supabase.co/frames/evt-001.jpg',
     '{"source": "yolo_v8", "model": "best.engine"}',
     NOW() - INTERVAL '6 hours 5 minutes'),
    
    ('evt-002', 'sess-001', 'truck-001', 'cam-003', 'plate_recognized', NOW() - INTERVAL '6 hours 4 minutes', 0.95, 
     '{"x": 150, "y": 280, "width": 120, "height": 40}', 
     'https://storage.supabase.co/frames/evt-002.jpg',
     '{"plate_raw": "B 1234 ABC", "ocr_confidence": 0.95}',
     NOW() - INTERVAL '6 hours 4 minutes'),
    
    ('evt-003', 'sess-001', 'truck-001', 'cam-001', 'loading_started', NOW() - INTERVAL '6 hours', 1.0, 
     NULL, NULL,
     '{"manual_entry": false, "operator": null}',
     NOW() - INTERVAL '6 hours'),
    
    ('evt-004', 'sess-001', 'truck-001', 'cam-001', 'loading_progress', NOW() - INTERVAL '5 hours 30 minutes', 1.0, 
     NULL, NULL,
     '{"progress_percent": 50, "items_loaded": 25}',
     NOW() - INTERVAL '5 hours 30 minutes'),
    
    ('evt-005', 'sess-001', 'truck-001', 'cam-001', 'loading_completed', NOW() - INTERVAL '5 hours 15 minutes', 1.0, 
     NULL, NULL,
     '{"total_items": 50, "duration_minutes": 45}',
     NOW() - INTERVAL '5 hours 15 minutes'),
    
    ('evt-006', 'sess-001', 'truck-001', 'cam-003', 'truck_departed', NOW() - INTERVAL '5 hours 10 minutes', 0.88, 
     '{"x": 500, "y": 200, "width": 350, "height": 280}', 
     'https://storage.supabase.co/frames/evt-006.jpg',
     '{"direction": "exit"}',
     NOW() - INTERVAL '5 hours 10 minutes');

-- Events for session 2 (Today, completed)
INSERT INTO loading_events (id, session_id, truck_id, camera_id, event_type, event_ts, confidence, bbox, frame_url, raw_payload, created_at)
VALUES
    ('evt-007', 'sess-002', 'truck-002', 'cam-003', 'truck_detected', NOW() - INTERVAL '4 hours 5 minutes', 0.89, 
     '{"x": 120, "y": 180, "width": 380, "height": 290}', 
     'https://storage.supabase.co/frames/evt-007.jpg',
     '{"source": "yolo_v8"}',
     NOW() - INTERVAL '4 hours 5 minutes'),
    
    ('evt-008', 'sess-002', 'truck-002', 'cam-003', 'plate_recognized', NOW() - INTERVAL '4 hours 4 minutes', 0.92, 
     '{"x": 160, "y": 260, "width": 110, "height": 35}', 
     'https://storage.supabase.co/frames/evt-008.jpg',
     '{"plate_raw": "B 5678 DEF", "ocr_confidence": 0.92}',
     NOW() - INTERVAL '4 hours 4 minutes'),
    
    ('evt-009', 'sess-002', 'truck-002', 'cam-001', 'loading_started', NOW() - INTERVAL '4 hours', 1.0, NULL, NULL,
     '{"manual_entry": false}', NOW() - INTERVAL '4 hours'),
    
    ('evt-010', 'sess-002', 'truck-002', 'cam-001', 'loading_completed', NOW() - INTERVAL '3 hours 30 minutes', 1.0, NULL, NULL,
     '{"total_items": 40, "rehab_items": 10}', NOW() - INTERVAL '3 hours 30 minutes');

-- Events for session 3 (Today, still loading)
INSERT INTO loading_events (id, session_id, truck_id, camera_id, event_type, event_ts, confidence, bbox, frame_url, raw_payload, created_at)
VALUES
    ('evt-011', 'sess-003', 'truck-003', 'cam-003', 'truck_detected', NOW() - INTERVAL '1 hour 5 minutes', 0.94, 
     '{"x": 80, "y": 150, "width": 450, "height": 350}', 
     'https://storage.supabase.co/frames/evt-011.jpg',
     '{"source": "yolo_v8"}',
     NOW() - INTERVAL '1 hour 5 minutes'),
    
    ('evt-012', 'sess-003', 'truck-003', 'cam-003', 'plate_recognized', NOW() - INTERVAL '1 hour 4 minutes', 0.88, 
     '{"x": 130, "y": 300, "width": 130, "height": 45}', 
     'https://storage.supabase.co/frames/evt-012.jpg',
     '{"plate_raw": "DD 9999 XYZ", "ocr_confidence": 0.88}',
     NOW() - INTERVAL '1 hour 4 minutes'),
    
    ('evt-013', 'sess-003', 'truck-003', 'cam-002', 'loading_started', NOW() - INTERVAL '1 hour', 1.0, NULL, NULL,
     '{"manual_entry": false}', NOW() - INTERVAL '1 hour'),
    
    ('evt-014', 'sess-003', 'truck-003', 'cam-002', 'loading_progress', NOW() - INTERVAL '30 minutes', 1.0, NULL, NULL,
     '{"progress_percent": 60, "items_loaded": 27}', NOW() - INTERVAL '30 minutes');

-- Events for session 4 (Today, completed)
INSERT INTO loading_events (id, session_id, truck_id, camera_id, event_type, event_ts, confidence, bbox, frame_url, raw_payload, created_at)
VALUES
    ('evt-015', 'sess-004', 'truck-004', 'cam-003', 'plate_recognized', NOW() - INTERVAL '2 hours', 0.97, 
     '{"x": 140, "y": 270, "width": 115, "height": 38}', 
     'https://storage.supabase.co/frames/evt-015.jpg',
     '{"plate_raw": "B 1111 GHI", "ocr_confidence": 0.97}',
     NOW() - INTERVAL '2 hours'),
    
    ('evt-016', 'sess-004', 'truck-004', 'cam-001', 'loading_completed', NOW() - INTERVAL '1 hour 30 minutes', 1.0, NULL, NULL,
     '{"total_items": 60, "duration_minutes": 30}', NOW() - INTERVAL '1 hour 30 minutes');

-- More events for older sessions (sampling)
INSERT INTO loading_events (id, session_id, truck_id, camera_id, event_type, event_ts, confidence, bbox, frame_url, raw_payload, created_at)
VALUES
    ('evt-017', 'sess-005', 'truck-005', 'cam-003', 'plate_recognized', NOW() - INTERVAL '1 day 7 hours', 0.91, NULL, NULL,
     '{"plate_raw": "DD 2222 JKL"}', NOW() - INTERVAL '1 day 7 hours'),
    ('evt-018', 'sess-006', 'truck-006', 'cam-003', 'plate_recognized', NOW() - INTERVAL '1 day 5 hours', 0.93, NULL, NULL,
     '{"plate_raw": "B 3333 MNO"}', NOW() - INTERVAL '1 day 5 hours'),
    ('evt-019', 'sess-007', 'truck-007', 'cam-003', 'plate_recognized', NOW() - INTERVAL '1 day 3 hours', 0.90, NULL, NULL,
     '{"plate_raw": "DD 4444 PQR"}', NOW() - INTERVAL '1 day 3 hours'),
    ('evt-020', 'sess-008', 'truck-001', 'cam-003', 'plate_recognized', NOW() - INTERVAL '2 days 8 hours', 0.94, NULL, NULL,
     '{"plate_raw": "B 1234 ABC"}', NOW() - INTERVAL '2 days 8 hours')
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 6. Verification Queries
-- ============================================================

-- Run these to verify data:

-- Check counts
-- SELECT 'tenants' as table_name, COUNT(*) as count FROM tenants
-- UNION ALL SELECT 'cameras', COUNT(*) FROM cameras
-- UNION ALL SELECT 'trucks', COUNT(*) FROM trucks
-- UNION ALL SELECT 'loading_sessions', COUNT(*) FROM loading_sessions
-- UNION ALL SELECT 'loading_events', COUNT(*) FROM loading_events;

-- Get dashboard summary (like Google Sheets output)
-- SELECT 
--     SUM((metadata->>'loading')::int) as loading_count,
--     SUM((metadata->>'rehab')::int) as rehab_count,
--     COUNT(*) as total_sessions
-- FROM loading_sessions
-- WHERE tenant_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

-- Get latest session details
-- SELECT 
--     t.plate_number,
--     s.metadata->>'driver' as driver,
--     s.metadata->>'items' as items,
--     s.status,
--     s.started_at,
--     s.finished_at
-- FROM loading_sessions s
-- JOIN trucks t ON s.truck_id = t.id
-- ORDER BY s.started_at DESC
-- LIMIT 5;
