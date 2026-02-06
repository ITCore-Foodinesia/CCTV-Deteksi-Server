/**
 * useHelpers - Hook for managing helpers data
 *
 * Wraps useSupabaseTable with helper-specific logic:
 * - Computed stats (active, available, assigned)
 * - Assignment tracking
 * - Proper column selection from database schema
 *
 * @example
 * const { helpers, loading, stats, createHelper, assignHelper } = useHelpers();
 */

import { useMemo, useCallback } from 'react';
import { useSupabaseTable } from './useSupabaseTable';

/**
 * Helper status enum values
 */
export const HELPER_STATUS = {
  AVAILABLE: 'available',
  ASSIGNED: 'assigned',
  ON_BREAK: 'on_break',
  OFF_DUTY: 'off_duty',
};

/**
 * Hook for helpers table operations
 *
 * @param {object} options - Additional options
 * @param {object} options.filter - Additional filters
 * @returns {object} Helpers data and operations
 */
export const useHelpers = (options = {}) => {
  const { filter = {} } = options;

  const {
    data,
    loading,
    error,
    refetch,
    create,
    update,
    remove,
  } = useSupabaseTable('helpers', {
    select: `
      id,
      name,
      phone,
      status,
      tenant_id,
      created_at
    `,
    filter,
    orderBy: 'name',
    ascending: true,
  });

  /**
   * Computed stats from helpers data
   */
  const stats = useMemo(() => {
    return {
      total: data.length,
      available: data.filter((h) => h.status === HELPER_STATUS.AVAILABLE).length,
      assigned: data.filter((h) => h.status === HELPER_STATUS.ASSIGNED).length,
      onBreak: data.filter((h) => h.status === HELPER_STATUS.ON_BREAK).length,
      offDuty: data.filter((h) => h.status === HELPER_STATUS.OFF_DUTY).length,
    };
  }, [data]);

  /**
   * Get available helpers
   */
  const availableHelpers = useMemo(() => {
    return data.filter((h) => h.status === HELPER_STATUS.AVAILABLE);
  }, [data]);

  /**
   * Get helper by ID
   */
  const getById = useCallback(
    (id) => {
      return data.find((helper) => helper.id === id);
    },
    [data]
  );

  /**
   * Get helpers by dock
   */
  const getByDock = useCallback(
    (dockId) => {
      return data.filter((h) => h.current_dock_id === dockId);
    },
    [data]
  );

  /**
   * Assign helper to a dock/session
   * @param {string} helperId - Helper ID
   * @param {string} dockId - Dock ID
   * @param {string} sessionId - Optional session ID
   */
  const assignHelper = useCallback(
    async (helperId, dockId, sessionId = null) => {
      return update(helperId, {
        status: HELPER_STATUS.ASSIGNED,
        current_dock_id: dockId,
        current_session_id: sessionId,
        metadata: {
          assigned_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      });
    },
    [update]
  );

  /**
   * Release helper from assignment
   * @param {string} helperId - Helper ID
   */
  const releaseHelper = useCallback(
    async (helperId) => {
      const helper = getById(helperId);
      return update(helperId, {
        status: HELPER_STATUS.AVAILABLE,
        current_dock_id: null,
        current_session_id: null,
        metadata: {
          ...(helper?.metadata || {}),
          last_assignment_ended: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      });
    },
    [update, getById]
  );

  /**
   * Set helper on break
   * @param {string} helperId - Helper ID
   */
  const setOnBreak = useCallback(
    async (helperId) => {
      return update(helperId, {
        status: HELPER_STATUS.ON_BREAK,
        updated_at: new Date().toISOString(),
      });
    },
    [update]
  );

  /**
   * Set helper off duty
   * @param {string} helperId - Helper ID
   */
  const setOffDuty = useCallback(
    async (helperId) => {
      return update(helperId, {
        status: HELPER_STATUS.OFF_DUTY,
        current_dock_id: null,
        current_session_id: null,
        updated_at: new Date().toISOString(),
      });
    },
    [update]
  );

  /**
   * Set helper available
   * @param {string} helperId - Helper ID
   */
  const setAvailable = useCallback(
    async (helperId) => {
      return update(helperId, {
        status: HELPER_STATUS.AVAILABLE,
        updated_at: new Date().toISOString(),
      });
    },
    [update]
  );

  /**
   * Create a new helper
   * @param {object} helperData - Helper data
   */
  const createHelper = useCallback(
    async (helperData) => {
      const newHelper = {
        ...helperData,
        status: helperData.status || HELPER_STATUS.AVAILABLE,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return create(newHelper);
    },
    [create]
  );

  /**
   * Update helper data
   * @param {string} id - Helper ID
   * @param {object} updates - Fields to update
   */
  const updateHelper = useCallback(
    async (id, updates) => {
      return update(id, {
        ...updates,
        updated_at: new Date().toISOString(),
      });
    },
    [update]
  );

  /**
   * Delete a helper
   * @param {string} id - Helper ID
   */
  const deleteHelper = useCallback(
    async (id) => {
      return remove(id);
    },
    [remove]
  );

  return {
    // Data
    helpers: data,
    loading,
    error,
    stats,
    availableHelpers,

    // Actions
    createHelper,
    updateHelper,
    deleteHelper,
    assignHelper,
    releaseHelper,
    setOnBreak,
    setOffDuty,
    setAvailable,
    getById,
    getByDock,
    refetch,
  };
};

export default useHelpers;
