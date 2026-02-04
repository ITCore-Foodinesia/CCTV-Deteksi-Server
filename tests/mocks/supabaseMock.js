/**
 * Supabase Mock for Testing
 * 
 * Provides a mock implementation of Supabase client for unit testing.
 * Allows controlling responses and simulating realtime events.
 * 
 * Usage:
 * import { createMockSupabase, mockSupabase } from './supabaseMock';
 * 
 * beforeEach(() => {
 *   mockSupabase.reset();
 * });
 */

import { vi } from 'vitest';

// =============================================================================
// MOCK STATE
// =============================================================================

const mockState = {
  // Store mock responses per table
  tables: {},
  // Store realtime callbacks
  realtimeCallbacks: {},
  // Track method calls for assertions
  calls: {
    select: [],
    insert: [],
    update: [],
    delete: [],
    subscribe: [],
  },
  // Custom error to throw
  error: null,
};

// =============================================================================
// QUERY BUILDER MOCK
// =============================================================================

const createQueryBuilder = (tableName) => {
  const builder = {
    _table: tableName,
    _query: {},
    _filters: [],

    select: vi.fn((columns = '*') => {
      mockState.calls.select.push({ table: tableName, columns });
      builder._query.select = columns;
      return builder;
    }),

    insert: vi.fn((data) => {
      mockState.calls.insert.push({ table: tableName, data });
      builder._query.insert = data;
      return builder;
    }),

    update: vi.fn((data) => {
      mockState.calls.update.push({ table: tableName, data });
      builder._query.update = data;
      return builder;
    }),

    delete: vi.fn(() => {
      mockState.calls.delete.push({ table: tableName });
      builder._query.delete = true;
      return builder;
    }),

    eq: vi.fn((column, value) => {
      builder._filters.push({ type: 'eq', column, value });
      return builder;
    }),

    neq: vi.fn((column, value) => {
      builder._filters.push({ type: 'neq', column, value });
      return builder;
    }),

    in: vi.fn((column, values) => {
      builder._filters.push({ type: 'in', column, values });
      return builder;
    }),

    order: vi.fn((column, options) => {
      builder._query.order = { column, ...options };
      return builder;
    }),

    limit: vi.fn((count) => {
      builder._query.limit = count;
      return builder;
    }),

    single: vi.fn(() => {
      builder._query.single = true;
      return builder;
    }),

    maybeSingle: vi.fn(() => {
      builder._query.maybeSingle = true;
      return builder;
    }),

    // Execute the query (returns Promise)
    then: (resolve, reject) => {
      return builder.execute().then(resolve, reject);
    },

    execute: async () => {
      // Check for forced error
      if (mockState.error) {
        return {
          data: null,
          error: mockState.error,
          count: null,
          status: 400,
          statusText: 'Bad Request'
        };
      }

      // Get mock data for this table
      let data = mockState.tables[tableName] || [];

      // Apply filters
      for (const filter of builder._filters) {
        if (filter.type === 'eq') {
          data = data.filter(item => item[filter.column] === filter.value);
        } else if (filter.type === 'neq') {
          data = data.filter(item => item[filter.column] !== filter.value);
        } else if (filter.type === 'in') {
          data = data.filter(item => filter.values.includes(item[filter.column]));
        }
      }

      // Handle single
      if (builder._query.single) {
        if (data.length === 0) {
          return {
            data: null,
            error: { message: 'The result contains 0 rows', code: 'PGRST116' },
            count: 0,
            status: 406,
            statusText: 'Not Acceptable'
          };
        }
        data = data[0];
      }

      // Handle maybeSingle
      if (builder._query.maybeSingle) {
        data = data.length > 0 ? data[0] : null;
      }

      // Handle insert
      if (builder._query.insert) {
        const newItem = { id: `mock-${Date.now()}`, ...builder._query.insert };
        if (!mockState.tables[tableName]) {
          mockState.tables[tableName] = [];
        }
        mockState.tables[tableName].push(newItem);
        data = builder._query.single ? newItem : [newItem];
      }

      // Handle update
      if (builder._query.update) {
        const updateData = builder._query.update;
        data = data.map(item => ({ ...item, ...updateData }));
        
        // Update in mock state
        if (builder._filters.length > 0) {
          mockState.tables[tableName] = mockState.tables[tableName].map(item => {
            const shouldUpdate = builder._filters.every(f => {
              if (f.type === 'eq') return item[f.column] === f.value;
              return true;
            });
            return shouldUpdate ? { ...item, ...updateData } : item;
          });
        }
        
        if (builder._query.single) data = data[0];
      }

      // Handle delete
      if (builder._query.delete) {
        const toDelete = data.map(d => d.id);
        mockState.tables[tableName] = (mockState.tables[tableName] || [])
          .filter(item => !toDelete.includes(item.id));
        data = [];
      }

      return {
        data,
        error: null,
        count: Array.isArray(data) ? data.length : 1,
        status: 200,
        statusText: 'OK'
      };
    }
  };

  return builder;
};

// =============================================================================
// REALTIME MOCK
// =============================================================================

const createRealtimeMock = () => ({
  channel: vi.fn((channelName) => {
    const channel = {
      _name: channelName,
      _callbacks: [],

      on: vi.fn((event, config, callback) => {
        // Handle postgres_changes
        if (event === 'postgres_changes') {
          const table = config.table;
          if (!mockState.realtimeCallbacks[table]) {
            mockState.realtimeCallbacks[table] = [];
          }
          mockState.realtimeCallbacks[table].push(callback);
        }
        return channel;
      }),

      subscribe: vi.fn((callback) => {
        mockState.calls.subscribe.push({ channel: channelName });
        if (callback) callback('SUBSCRIBED');
        return channel;
      }),

      unsubscribe: vi.fn(() => Promise.resolve())
    };

    return channel;
  }),

  removeChannel: vi.fn(() => Promise.resolve())
});

// =============================================================================
// MAIN MOCK CLIENT
// =============================================================================

export const createMockSupabase = () => ({
  from: vi.fn((tableName) => createQueryBuilder(tableName)),
  
  realtime: createRealtimeMock(),

  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    signInWithPassword: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    signOut: vi.fn(() => Promise.resolve({ error: null })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
  }
});

// =============================================================================
// MOCK CONTROL API
// =============================================================================

export const mockSupabase = {
  /**
   * Reset all mock state
   */
  reset: () => {
    mockState.tables = {};
    mockState.realtimeCallbacks = {};
    mockState.calls = {
      select: [],
      insert: [],
      update: [],
      delete: [],
      subscribe: [],
    };
    mockState.error = null;
  },

  /**
   * Set mock data for a table
   */
  setTableData: (tableName, data) => {
    mockState.tables[tableName] = [...data];
  },

  /**
   * Get current mock data for a table
   */
  getTableData: (tableName) => {
    return mockState.tables[tableName] || [];
  },

  /**
   * Set an error to be thrown on next query
   */
  setError: (error) => {
    mockState.error = error;
  },

  /**
   * Clear the error
   */
  clearError: () => {
    mockState.error = null;
  },

  /**
   * Simulate a realtime event for a table
   */
  simulateRealtimeEvent: (tableName, eventType, newData, oldData = {}) => {
    const callbacks = mockState.realtimeCallbacks[tableName] || [];
    const payload = {
      eventType,
      new: newData,
      old: oldData,
      schema: 'public',
      table: tableName,
      commit_timestamp: new Date().toISOString()
    };

    callbacks.forEach(callback => callback(payload));
  },

  /**
   * Get call history for assertions
   */
  getCalls: () => ({ ...mockState.calls }),

  /**
   * Check if a specific table query was made
   */
  wasTableQueried: (tableName) => {
    return mockState.calls.select.some(c => c.table === tableName);
  }
};

// Default export for easy import
export default createMockSupabase;
