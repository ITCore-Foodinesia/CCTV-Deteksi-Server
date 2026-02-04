# Tests Directory

This folder contains all test assets for the CCTV Dashboard & Engine Integration project.

## Structure

```
tests/
├── README.md                      # This file
├── TEST_PLAN_DASHBOARD_ENGINE.md  # Comprehensive test plan
│
├── fixtures/                      # Test data and fixtures
│   └── mockData.js               # Mock entities, sessions, realtime events
│
├── mocks/                         # Mock implementations
│   └── supabaseMock.js           # Supabase client mock for unit testing
│
├── hooks/                         # React hook unit tests
│   └── useSupabaseTable.test.js  # Tests for the core Supabase hook
│
├── integration/                   # Integration tests
│   └── test_session_listener.py  # Python SessionListener tests
│
└── e2e/                          # End-to-End tests
    └── test_full_flow_manual.py  # Manual E2E test script
```

## Running Tests

### JavaScript/React Tests (Vitest)

```bash
# From dashboard/ directory
cd dashboard

# Run all tests
npm test

# Run specific test file
npm test -- hooks/useSupabaseTable.test.js

# Run with coverage
npm test -- --coverage
```

### Python Tests (Pytest)

```bash
# From project root
cd gui_version_testing_with_server

# Install test dependencies
pip install pytest pytest-mock

# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/integration/test_session_listener.py -v

# Run with coverage
pytest tests/ --cov=src -v
```

### E2E Manual Tests

```bash
# Run with mock (no real Supabase needed)
python tests/e2e/test_full_flow_manual.py

# Run with real Supabase
export SUPABASE_KEY="your-service-key"
python tests/e2e/test_full_flow_manual.py --real
```

## Test Data Setup

### Seed Test Data to Supabase

```sql
-- Run this in Supabase SQL Editor for integration tests

-- Test Tenant
INSERT INTO tenants (id, name, slug) 
VALUES ('test-tenant-001', 'Test Warehouse', 'test-warehouse')
ON CONFLICT (id) DO NOTHING;

-- Test Drivers
INSERT INTO drivers (id, name, phone, email, status, tenant_id) VALUES
('driver-test-001', 'E2E Test Driver', '08100000001', 'test@test.com', 'active', 'test-tenant-001')
ON CONFLICT (id) DO NOTHING;

-- Test Trucks
INSERT INTO trucks (id, plate_number, truck_type, status, tenant_id) VALUES
('truck-test-001', 'TEST 1234 E2E', 'Box', 'available', 'test-tenant-001')
ON CONFLICT (id) DO NOTHING;

-- Test Docks
INSERT INTO docks (id, dock_code, dock_name, status, capacity, tenant_id) VALUES
('dock-test-001', 'D-TEST', 'Test Dock', 'available', 40, 'test-tenant-001')
ON CONFLICT (id) DO NOTHING;
```

## Environment Variables

Create `.env.test` for test environment:

```bash
# JavaScript tests
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=local-anon-key

# Python tests
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
```

## Test Coverage Goals

| Component | Target Coverage | Priority |
|-----------|-----------------|----------|
| React Hooks | 80% | P0 |
| Python SessionListener | 80% | P0 |
| API Endpoints | 70% | P1 |
| E2E Critical Flows | 2-3 flows | P0 |

## Test Types

### Unit Tests
- Fast, isolated
- Mock external dependencies
- Run on every commit

### Integration Tests
- Test actual Supabase queries (local or staging)
- Run before merge to main

### E2E Tests
- Full flow validation
- Run before release
- Can be manual or automated

## Reporting Bugs

Use the bug template in `TEST_PLAN_DASHBOARD_ENGINE.md` section 8.
