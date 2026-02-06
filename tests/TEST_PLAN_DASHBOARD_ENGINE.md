# Test Plan: Dashboard & CCTV Engine Integration

## 1. Executive Summary

**Scope**: Testing integrasi Dashboard React dengan Supabase + trigger-based CCTV detection dari Flutter App.

**Out of Scope**: Flutter app internal testing, YOLO model accuracy testing.

**Test Types**:
- Unit Tests (hooks, utilities)
- Integration Tests (API, Supabase connections)
- End-to-End Tests (full flow simulation)
- Manual Exploratory Testing

---

## 2. Risk Assessment

| Risk | Severity | Likelihood | Test Priority |
|------|----------|------------|---------------|
| Supabase Realtime tidak trigger engine | **Critical** | Medium | P0 |
| Data tidak sinkron antar komponen | **High** | Medium | P0 |
| RLS policy blocking data access | **High** | High | P0 |
| Counting logic error (over/under count) | **High** | Medium | P1 |
| Dashboard tidak update realtime | **Medium** | Medium | P1 |
| Session conflict (multiple active) | **Medium** | Low | P2 |
| Performance degradation | **Low** | Low | P3 |

---

## 3. Test Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TEST PYRAMID                                 │
│                                                                      │
│                           ┌─────────┐                                │
│                           │  E2E    │  ← Minimal (2-3 critical flows)│
│                           │ Tests   │                                │
│                           └────┬────┘                                │
│                      ┌─────────┴─────────┐                           │
│                      │   Integration     │  ← API + Database tests   │
│                      │      Tests        │                           │
│                      └─────────┬─────────┘                           │
│            ┌───────────────────┴───────────────────┐                 │
│            │              Unit Tests               │  ← Most tests   │
│            │         (Hooks, Utilities)            │                 │
│            └───────────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Test Cases

### 4.1 Unit Tests: React Hooks

#### TC-HOOK-001: useSupabaseTable - Initial Fetch
| ID | TC-HOOK-001 |
|----|-------------|
| **Priority** | P0 |
| **Preconditions** | Supabase mock setup |
| **Steps** | 1. Render component with useSupabaseTable('drivers') |
| | 2. Wait for loading to complete |
| **Expected** | - loading starts as true, then false |
| | - data array populated |
| | - error is null |

#### TC-HOOK-002: useSupabaseTable - Realtime INSERT
| ID | TC-HOOK-002 |
|----|-------------|
| **Priority** | P0 |
| **Preconditions** | Hook subscribed to table |
| **Steps** | 1. Simulate INSERT event via Supabase mock |
| **Expected** | - New item appears in data array |
| | - No full refetch (realtime handled) |

#### TC-HOOK-003: useSupabaseTable - Realtime UPDATE
| ID | TC-HOOK-003 |
|----|-------------|
| **Priority** | P0 |
| **Preconditions** | Hook has data with item id='123' |
| **Steps** | 1. Simulate UPDATE event for id='123' |
| **Expected** | - Item in array updated |
| | - Other items unchanged |

#### TC-HOOK-004: useSupabaseTable - Realtime DELETE
| ID | TC-HOOK-004 |
|----|-------------|
| **Priority** | P1 |
| **Preconditions** | Hook has data with item id='123' |
| **Steps** | 1. Simulate DELETE event for id='123' |
| **Expected** | - Item removed from array |

#### TC-HOOK-005: useSupabaseTable - Error Handling
| ID | TC-HOOK-005 |
|----|-------------|
| **Priority** | P1 |
| **Preconditions** | Supabase mock returns error |
| **Steps** | 1. Render hook |
| **Expected** | - error contains message |
| | - data is empty array |
| | - loading is false |

---

### 4.2 Integration Tests: Supabase Connection

#### TC-INT-001: Database Connection
| ID | TC-INT-001 |
|----|-------------|
| **Priority** | P0 |
| **Preconditions** | Valid Supabase credentials in .env |
| **Steps** | 1. Call supabase.from('loading_sessions').select('*').limit(1) |
| **Expected** | - Returns data (even if empty) |
| | - No connection error |

#### TC-INT-002: RLS Policy - Anon Access
| ID | TC-INT-002 |
|----|-------------|
| **Priority** | P0 |
| **Preconditions** | RLS enabled on table |
| **Steps** | 1. Use anon key to select from loading_sessions |
| **Expected** | - Returns only rows visible to anon |
| | - No RLS violation error |

#### TC-INT-003: Realtime Subscription Works
| ID | TC-INT-003 |
|----|-------------|
| **Priority** | P0 |
| **Preconditions** | Realtime enabled for table |
| **Steps** | 1. Subscribe to loading_sessions changes |
| | 2. Insert new row via another client |
| | 3. Wait for event |
| **Expected** | - Event received within 5 seconds |
| | - Event contains new row data |

#### TC-INT-004: Insert Session with Required Fields
| ID | TC-INT-004 |
|----|-------------|
| **Priority** | P0 |
| **Preconditions** | Valid driver_id, truck_id exist |
| **Steps** | 1. Insert loading_session with status='loading' |
| **Expected** | - Row created with all fields |
| | - plate_number stored correctly |

#### TC-INT-005: Session Status Update Triggers Event
| ID | TC-INT-005 |
|----|-------------|
| **Priority** | P0 |
| **Preconditions** | Session exists with status='pending' |
| **Steps** | 1. Subscribe to realtime |
| | 2. Update status to 'loading' |
| **Expected** | - Realtime event fired |
| | - Event type is UPDATE |

---

### 4.3 Integration Tests: Python Detector ↔ Supabase

#### TC-PYINT-001: Session Listener Starts
| ID | TC-PYINT-001 |
|----|-------------|
| **Priority** | P0 |
| **Preconditions** | Python environment with supabase-py |
| **Steps** | 1. Initialize SessionListener |
| | 2. Call start() |
| **Expected** | - No exceptions |
| | - Subscribed message logged |

#### TC-PYINT-002: On Session Start Callback
| ID | TC-PYINT-002 |
|----|-------------|
| **Priority** | P0 |
| **Preconditions** | Listener running |
| **Steps** | 1. Insert session with status='loading' via Supabase |
| **Expected** | - on_session_start callback fires |
| | - session_data contains plate_number |

#### TC-PYINT-003: Count Push to Supabase
| ID | TC-PYINT-003 |
|----|-------------|
| **Priority** | P0 |
| **Preconditions** | Active session in DB |
| **Steps** | 1. Call listener.update_counts(session_id, 10, 5) |
| **Expected** | - loading_sessions row updated |
| | - loading_count = 10, rehab_count = 5 |

#### TC-PYINT-004: On Session Stop Callback
| ID | TC-PYINT-004 |
|----|-------------|
| **Priority** | P0 |
| **Preconditions** | Active session, listener running |
| **Steps** | 1. Update session status to 'completed' |
| **Expected** | - on_session_stop callback fires |
| | - session_id passed correctly |

---

### 4.4 End-to-End Tests

#### TC-E2E-001: Full Loading Session Flow
| ID | TC-E2E-001 |
|----|-------------|
| **Priority** | P0 |
| **Preconditions** | All systems running (Flutter sim, Python, Dashboard) |
| **Steps** | 1. Create session via mock Flutter call (Supabase insert) |
| | 2. Verify Python detector receives trigger |
| | 3. Simulate counting (manual increment) |
| | 4. Verify Dashboard shows live count |
| | 5. Complete session |
| | 6. Verify counting stopped |
| **Expected** | - All systems synchronized |
| | - Dashboard reflects final counts |

#### TC-E2E-002: Dashboard Realtime Update
| ID | TC-E2E-002 |
|----|-------------|
| **Priority** | P0 |
| **Preconditions** | Dashboard open in browser |
| **Steps** | 1. Open SessionsPage |
| | 2. Insert session via Supabase SQL |
| | 3. Observe dashboard |
| **Expected** | - New session appears without refresh |
| | - < 3 second delay |

#### TC-E2E-003: Multiple Concurrent Sessions
| ID | TC-E2E-003 |
|----|-------------|
| **Priority** | P2 |
| **Preconditions** | System supports multi-session |
| **Steps** | 1. Create session A (dock 1) |
| | 2. Create session B (dock 2) |
| | 3. Update counts for both |
| **Expected** | - Both sessions tracked independently |
| | - No data mixing |

---

## 5. Test Data

### 5.1 Seed Data for Testing

```sql
-- Test Tenant
INSERT INTO tenants (id, name, slug) 
VALUES ('test-tenant-001', 'Test Warehouse', 'test-warehouse');

-- Test Drivers
INSERT INTO drivers (id, name, phone, email, status, tenant_id) VALUES
('driver-001', 'Test Driver 1', '08123456001', 'driver1@test.com', 'active', 'test-tenant-001'),
('driver-002', 'Test Driver 2', '08123456002', 'driver2@test.com', 'active', 'test-tenant-001');

-- Test Trucks
INSERT INTO trucks (id, plate_number, truck_type, status, tenant_id) VALUES
('truck-001', 'B 1234 ABC', 'Box', 'available', 'test-tenant-001'),
('truck-002', 'B 5678 DEF', 'Fuso', 'available', 'test-tenant-001');

-- Test Docks
INSERT INTO docks (id, dock_code, dock_name, status, capacity, tenant_id) VALUES
('dock-001', 'D01', 'Dock 1', 'available', 40, 'test-tenant-001'),
('dock-002', 'D02', 'Dock 2', 'available', 40, 'test-tenant-001');

-- Test Session (for integration tests)
INSERT INTO loading_sessions (id, driver_id, truck_id, dock_id, plate_number, status, tenant_id) VALUES
('session-test-001', 'driver-001', 'truck-001', 'dock-001', 'B 1234 ABC', 'pending', 'test-tenant-001');
```

### 5.2 Mock Data Constants (JavaScript)

```javascript
// tests/fixtures/mockData.js

export const MOCK_DRIVER = {
  id: 'driver-001',
  name: 'Test Driver 1',
  phone: '08123456001',
  email: 'driver1@test.com',
  status: 'active',
  tenant_id: 'test-tenant-001'
};

export const MOCK_SESSION = {
  id: 'session-test-001',
  driver_id: 'driver-001',
  truck_id: 'truck-001',
  dock_id: 'dock-001',
  plate_number: 'B 1234 ABC',
  status: 'loading',
  loading_count: 0,
  rehab_count: 0,
  created_at: new Date().toISOString()
};

export const MOCK_REALTIME_INSERT_EVENT = {
  eventType: 'INSERT',
  new: MOCK_SESSION,
  old: {}
};

export const MOCK_REALTIME_UPDATE_EVENT = {
  eventType: 'UPDATE',
  new: { ...MOCK_SESSION, loading_count: 5 },
  old: MOCK_SESSION
};
```

---

## 6. Test Environment Setup

### 6.1 Requirements

| Component | Version | Purpose |
|-----------|---------|---------|
| Node.js | 18+ | Run React tests |
| Python | 3.10+ | Run detector tests |
| Vitest | latest | React unit/integration tests |
| Pytest | latest | Python unit/integration tests |
| Supabase CLI | latest | Local Supabase for testing |

### 6.2 Environment Variables

```bash
# .env.test
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJhb...local-anon-key
VITE_SUPABASE_SERVICE_KEY=eyJhb...local-service-key
```

### 6.3 Local Supabase Setup

```bash
# Start local Supabase
supabase start

# Apply migrations
supabase db reset

# Seed test data
supabase db seed
```

---

## 7. Entry/Exit Criteria

### Entry Criteria (Ready to Test)
- [ ] All migrations applied successfully
- [ ] Supabase local or staging environment accessible
- [ ] React hooks implemented
- [ ] Python listener implemented
- [ ] Test data seeded

### Exit Criteria (Testing Complete)
- [ ] All P0 test cases pass
- [ ] All P1 test cases pass or have accepted workaround
- [ ] No blocking bugs open
- [ ] Performance within acceptable thresholds (< 5s realtime delay)

---

## 8. Bug Report Template

```markdown
## Bug: [Short Description]

**Environment**: [Local/Staging/Production]
**Build**: [Version/Commit]
**Tested By**: [Name]
**Date**: [YYYY-MM-DD]

### Steps to Reproduce
1. ...
2. ...
3. ...

### Expected Result
- ...

### Actual Result
- ...

### Evidence
- Screenshot/Video: [link]
- Console logs: 
```
[paste logs here]
```

### Impact
- **Severity**: S0/S1/S2/S3
- **Priority**: P0/P1/P2
- **Affected Users**: [who is impacted]

### Workaround
- [if any]

### Suspected Cause
- [optional analysis]
```

---

*Test Plan Version 1.0 - Dashboard & Engine Integration*
