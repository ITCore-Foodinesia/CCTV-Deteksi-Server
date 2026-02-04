/**
 * useSupabaseTable - Generic hook for Supabase CRUD + Realtime
 *
 * Features:
 * - Fetches data from a Supabase table
 * - Subscribes to realtime changes (INSERT, UPDATE, DELETE)
 * - Provides CRUD operations (create, update, remove)
 * - Handles loading and error states
 *
 * @example
 * const { data, loading, error, create, update, remove } = useSupabaseTable('drivers');
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Generic hook for CRUD operations + Realtime subscription
 *
 * @param {string} tableName - Supabase table name
 * @param {object} options - Configuration options
 * @param {string} options.select - Columns to select (default: '*')
 * @param {object} options.filter - Key-value filters (eq conditions)
 * @param {string} options.orderBy - Column to order by (default: 'created_at')
 * @param {boolean} options.ascending - Sort direction (default: false = DESC)
 * @param {boolean} options.enableRealtime - Enable realtime subscription (default: true)
 * @param {string[]} options.realtimeFilters - Array of filter values for realtime filtering
 * @returns {object} { data, loading, error, refetch, create, update, remove }
 */
export const useSupabaseTable = (tableName, options = {}) => {
  const {
    select = '*',
    filter = {},
    orderBy = 'created_at',
    ascending = false,
    enableRealtime = true,
  } = options;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);

  // Memoize filter string for dependency array
  const filterString = JSON.stringify(filter);

  /**
   * Fetch data from Supabase
   */
  const fetchData = useCallback(async () => {
    if (!isMounted.current) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase.from(tableName).select(select);

      // Apply eq filters
      const filterObj = JSON.parse(filterString);
      Object.entries(filterObj).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          query = query.eq(key, value);
        }
      });

      // Apply ordering
      if (orderBy) {
        query = query.order(orderBy, { ascending });
      }

      const { data: result, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      if (isMounted.current) {
        setData(result || []);
      }
    } catch (err) {
      console.error(`[useSupabaseTable] Error fetching ${tableName}:`, err);
      if (isMounted.current) {
        setError(err.message || 'Failed to fetch data');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [tableName, select, filterString, orderBy, ascending]);

  /**
   * Handle realtime events
   */
  const handleRealtimeEvent = useCallback(
    (payload) => {
      if (!isMounted.current) return;

      const { eventType, new: newRecord, old: oldRecord } = payload;

      console.log(`[useSupabaseTable] Realtime ${eventType} on ${tableName}:`, payload);

      switch (eventType) {
        case 'INSERT':
          // Add new record at the beginning (most recent first)
          setData((prev) => [newRecord, ...prev]);
          break;

        case 'UPDATE':
          // Replace the updated record
          setData((prev) =>
            prev.map((item) => (item.id === newRecord.id ? newRecord : item))
          );
          break;

        case 'DELETE':
          // Remove the deleted record
          setData((prev) => prev.filter((item) => item.id !== oldRecord.id));
          break;

        default:
          console.warn(`[useSupabaseTable] Unknown event type: ${eventType}`);
      }
    },
    [tableName]
  );

  /**
   * Setup effect: fetch data + subscribe to realtime
   */
  useEffect(() => {
    isMounted.current = true;

    // Fetch initial data
    fetchData();

    // Setup realtime subscription
    let channel = null;
    if (enableRealtime) {
      channel = supabase
        .channel(`realtime-${tableName}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: tableName,
          },
          handleRealtimeEvent
        )
        .subscribe((status) => {
          console.log(`[useSupabaseTable] Realtime subscription ${tableName}:`, status);
        });
    }

    // Cleanup on unmount
    return () => {
      isMounted.current = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchData, handleRealtimeEvent, tableName, enableRealtime]);

  /**
   * Create a new record
   * @param {object} newData - Data to insert
   * @returns {Promise<object>} Created record
   */
  const create = async (newData) => {
    try {
      const { data: result, error: createError } = await supabase
        .from(tableName)
        .insert(newData)
        .select()
        .single();

      if (createError) throw createError;

      // Note: Realtime will handle adding to state, but we return for immediate use
      return result;
    } catch (err) {
      console.error(`[useSupabaseTable] Error creating ${tableName}:`, err);
      throw err;
    }
  };

  /**
   * Update an existing record
   * @param {string} id - Record ID
   * @param {object} updates - Fields to update
   * @returns {Promise<object>} Updated record
   */
  const update = async (id, updates) => {
    try {
      const { data: result, error: updateError } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Note: Realtime will handle updating state
      return result;
    } catch (err) {
      console.error(`[useSupabaseTable] Error updating ${tableName}:`, err);
      throw err;
    }
  };

  /**
   * Delete a record
   * @param {string} id - Record ID
   */
  const remove = async (id) => {
    try {
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // Note: Realtime will handle removing from state
    } catch (err) {
      console.error(`[useSupabaseTable] Error deleting ${tableName}:`, err);
      throw err;
    }
  };

  /**
   * Bulk create records
   * @param {object[]} records - Array of records to insert
   * @returns {Promise<object[]>} Created records
   */
  const bulkCreate = async (records) => {
    try {
      const { data: result, error: createError } = await supabase
        .from(tableName)
        .insert(records)
        .select();

      if (createError) throw createError;
      return result;
    } catch (err) {
      console.error(`[useSupabaseTable] Error bulk creating ${tableName}:`, err);
      throw err;
    }
  };

  /**
   * Upsert a record (insert or update if exists)
   * @param {object} record - Record to upsert
   * @param {string} onConflict - Column to check for conflict
   * @returns {Promise<object>} Upserted record
   */
  const upsert = async (record, onConflict = 'id') => {
    try {
      const { data: result, error: upsertError } = await supabase
        .from(tableName)
        .upsert(record, { onConflict })
        .select()
        .single();

      if (upsertError) throw upsertError;
      return result;
    } catch (err) {
      console.error(`[useSupabaseTable] Error upserting ${tableName}:`, err);
      throw err;
    }
  };

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    create,
    update,
    remove,
    bulkCreate,
    upsert,
  };
};

export default useSupabaseTable;
