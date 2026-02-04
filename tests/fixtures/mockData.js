/**
 * Test Fixtures: Mock Data for Dashboard Integration Tests
 * 
 * Usage:
 * import { MOCK_DRIVER, MOCK_SESSION } from './mockData';
 */

// =============================================================================
// ENTITIES
// =============================================================================

export const MOCK_TENANT = {
  id: 'test-tenant-001',
  name: 'Test Warehouse',
  slug: 'test-warehouse',
  created_at: '2024-01-01T00:00:00Z'
};

export const MOCK_DRIVER = {
  id: 'driver-001',
  name: 'Test Driver 1',
  phone: '08123456001',
  email: 'driver1@test.com',
  driver_code: 'DRV001',
  status: 'active',
  tenant_id: 'test-tenant-001',
  profile_data: {},
  created_at: '2024-01-01T00:00:00Z'
};

export const MOCK_DRIVER_2 = {
  id: 'driver-002',
  name: 'Test Driver 2',
  phone: '08123456002',
  email: 'driver2@test.com',
  driver_code: 'DRV002',
  status: 'active',
  tenant_id: 'test-tenant-001',
  profile_data: {},
  created_at: '2024-01-02T00:00:00Z'
};

export const MOCK_DRIVERS = [MOCK_DRIVER, MOCK_DRIVER_2];

export const MOCK_TRUCK = {
  id: 'truck-001',
  plate_number: 'B 1234 ABC',
  truck_type: 'Box',
  status: 'available',
  tenant_id: 'test-tenant-001',
  created_at: '2024-01-01T00:00:00Z'
};

export const MOCK_TRUCK_2 = {
  id: 'truck-002',
  plate_number: 'B 5678 DEF',
  truck_type: 'Fuso',
  status: 'available',
  tenant_id: 'test-tenant-001',
  created_at: '2024-01-02T00:00:00Z'
};

export const MOCK_TRUCKS = [MOCK_TRUCK, MOCK_TRUCK_2];

export const MOCK_DOCK = {
  id: 'dock-001',
  dock_code: 'D01',
  dock_name: 'Dock 1',
  status: 'available',
  capacity: 40,
  tenant_id: 'test-tenant-001',
  maintenance_reason: null,
  created_at: '2024-01-01T00:00:00Z'
};

export const MOCK_DOCK_2 = {
  id: 'dock-002',
  dock_code: 'D02',
  dock_name: 'Dock 2',
  status: 'loading',
  capacity: 40,
  tenant_id: 'test-tenant-001',
  maintenance_reason: null,
  created_at: '2024-01-02T00:00:00Z'
};

export const MOCK_DOCKS = [MOCK_DOCK, MOCK_DOCK_2];

// =============================================================================
// SESSIONS
// =============================================================================

export const MOCK_SESSION_PENDING = {
  id: 'session-001',
  driver_id: 'driver-001',
  truck_id: 'truck-001',
  dock_id: null,
  plate_number: 'B 1234 ABC',
  status: 'pending_dock',
  loading_count: 0,
  rehab_count: 0,
  counting_active: false,
  started_at: null,
  ended_at: null,
  tenant_id: 'test-tenant-001',
  created_at: '2024-01-10T08:00:00Z'
};

export const MOCK_SESSION_LOADING = {
  id: 'session-002',
  driver_id: 'driver-001',
  truck_id: 'truck-001',
  dock_id: 'dock-001',
  plate_number: 'B 1234 ABC',
  status: 'loading',
  loading_count: 15,
  rehab_count: 3,
  counting_active: true,
  started_at: '2024-01-10T08:30:00Z',
  ended_at: null,
  tenant_id: 'test-tenant-001',
  created_at: '2024-01-10T08:00:00Z'
};

export const MOCK_SESSION_COMPLETED = {
  id: 'session-003',
  driver_id: 'driver-002',
  truck_id: 'truck-002',
  dock_id: 'dock-002',
  plate_number: 'B 5678 DEF',
  status: 'completed',
  loading_count: 42,
  rehab_count: 5,
  counting_active: false,
  started_at: '2024-01-09T08:00:00Z',
  ended_at: '2024-01-09T12:00:00Z',
  tenant_id: 'test-tenant-001',
  created_at: '2024-01-09T07:30:00Z'
};

export const MOCK_SESSIONS = [
  MOCK_SESSION_PENDING,
  MOCK_SESSION_LOADING,
  MOCK_SESSION_COMPLETED
];

// =============================================================================
// REALTIME EVENTS (Simulating Supabase postgres_changes)
// =============================================================================

export const createRealtimeEvent = (eventType, newData, oldData = {}) => ({
  eventType,
  new: newData,
  old: oldData,
  schema: 'public',
  table: 'loading_sessions',
  commit_timestamp: new Date().toISOString()
});

export const MOCK_REALTIME_INSERT = createRealtimeEvent('INSERT', MOCK_SESSION_PENDING);

export const MOCK_REALTIME_UPDATE_STATUS = createRealtimeEvent(
  'UPDATE',
  { ...MOCK_SESSION_PENDING, status: 'loading', counting_active: true },
  MOCK_SESSION_PENDING
);

export const MOCK_REALTIME_UPDATE_COUNTS = createRealtimeEvent(
  'UPDATE',
  { ...MOCK_SESSION_LOADING, loading_count: 20, rehab_count: 4 },
  MOCK_SESSION_LOADING
);

export const MOCK_REALTIME_DELETE = createRealtimeEvent(
  'DELETE',
  {},
  MOCK_SESSION_COMPLETED
);

// =============================================================================
// SUPABASE MOCK RESPONSES
// =============================================================================

export const createSuccessResponse = (data) => ({
  data,
  error: null,
  count: Array.isArray(data) ? data.length : 1,
  status: 200,
  statusText: 'OK'
});

export const createErrorResponse = (message, code = 'PGRST116') => ({
  data: null,
  error: {
    message,
    code,
    details: null,
    hint: null
  },
  count: null,
  status: 400,
  statusText: 'Bad Request'
});

export const MOCK_SUPABASE_DRIVERS_RESPONSE = createSuccessResponse(MOCK_DRIVERS);
export const MOCK_SUPABASE_SESSIONS_RESPONSE = createSuccessResponse(MOCK_SESSIONS);
export const MOCK_SUPABASE_DOCKS_RESPONSE = createSuccessResponse(MOCK_DOCKS);

export const MOCK_SUPABASE_ERROR_RLS = createErrorResponse(
  'new row violates row-level security policy',
  '42501'
);

export const MOCK_SUPABASE_ERROR_NOT_FOUND = createErrorResponse(
  'The result contains 0 rows',
  'PGRST116'
);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a mock session with custom overrides
 */
export const createMockSession = (overrides = {}) => ({
  id: `session-${Date.now()}`,
  driver_id: 'driver-001',
  truck_id: 'truck-001',
  dock_id: null,
  plate_number: 'B 1234 ABC',
  status: 'pending_dock',
  loading_count: 0,
  rehab_count: 0,
  counting_active: false,
  started_at: null,
  ended_at: null,
  tenant_id: 'test-tenant-001',
  created_at: new Date().toISOString(),
  ...overrides
});

/**
 * Create a mock driver with custom overrides
 */
export const createMockDriver = (overrides = {}) => ({
  id: `driver-${Date.now()}`,
  name: 'New Driver',
  phone: '08100000000',
  email: 'new@test.com',
  driver_code: `DRV${Date.now()}`,
  status: 'active',
  tenant_id: 'test-tenant-001',
  profile_data: {},
  created_at: new Date().toISOString(),
  ...overrides
});

/**
 * Simulate delay (for testing loading states)
 */
export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Create Supabase channel mock
 */
export const createMockChannel = (eventCallbacks = {}) => ({
  on: jest.fn((event, schema, callback) => {
    if (eventCallbacks[event]) {
      eventCallbacks[event].push(callback);
    }
    return createMockChannel(eventCallbacks);
  }),
  subscribe: jest.fn(() => Promise.resolve('SUBSCRIBED')),
  unsubscribe: jest.fn(() => Promise.resolve())
});
