/**
 * useLoaders - Hook for managing loaders data
 *
 * Loaders are the personnel who physically load/unload items from trucks.
 * Similar to helpers but typically focused on the physical loading work.
 *
 * @example
 * const { loaders, loading, stats, createLoader, assignLoader } = useLoaders();
 */

import { useMemo, useCallback } from 'react';
import { useSupabaseTable } from './useSupabaseTable';

/**
 * Loader status enum values
 */
export const LOADER_STATUS = {
  AVAILABLE: 'available',
  ASSIGNED: 'assigned',
  ON_BREAK: 'on_break',
  OFF_DUTY: 'off_duty',
};

/**
 * Hook for loaders table operations
 *
 * @param {object} options - Additional options
 * @param {object} options.filter - Additional filters
 * @returns {object} Loaders data and operations
 */
export const useLoaders = (options = {}) => {
  const { filter = {} } = options;

  const {
    data,
    loading,
    error,
    refetch,
    create,
    update,
    remove,
  } = useSupabaseTable('loaders', {
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
   * Computed stats from loaders data
   */
  const stats = useMemo(() => {
    return {
      total: data.length,
      available: data.filter((l) => l.status === LOADER_STATUS.AVAILABLE).length,
      assigned: data.filter((l) => l.status === LOADER_STATUS.ASSIGNED).length,
      onBreak: data.filter((l) => l.status === LOADER_STATUS.ON_BREAK).length,
      offDuty: data.filter((l) => l.status === LOADER_STATUS.OFF_DUTY).length,
    };
  }, [data]);

  /**
   * Get available loaders
   */
  const availableLoaders = useMemo(() => {
    return data.filter((l) => l.status === LOADER_STATUS.AVAILABLE);
  }, [data]);

  /**
   * Get loader by ID
   */
  const getById = useCallback(
    (id) => {
      return data.find((loader) => loader.id === id);
    },
    [data]
  );

  /**
   * Get loaders by dock
   */
  const getByDock = useCallback(
    (dockId) => {
      return data.filter((l) => l.current_dock_id === dockId);
    },
    [data]
  );

  /**
   * Get loaders by session
   */
  const getBySession = useCallback(
    (sessionId) => {
      return data.filter((l) => l.current_session_id === sessionId);
    },
    [data]
  );

  /**
   * Assign loader to a dock/session
   * @param {string} loaderId - Loader ID
   * @param {string} dockId - Dock ID
   * @param {string} sessionId - Optional session ID
   */
  const assignLoader = useCallback(
    async (loaderId, dockId, sessionId = null) => {
      return update(loaderId, {
        status: LOADER_STATUS.ASSIGNED,
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
   * Release loader from assignment
   * @param {string} loaderId - Loader ID
   */
  const releaseLoader = useCallback(
    async (loaderId) => {
      const loader = getById(loaderId);
      return update(loaderId, {
        status: LOADER_STATUS.AVAILABLE,
        current_dock_id: null,
        current_session_id: null,
        metadata: {
          ...(loader?.metadata || {}),
          last_assignment_ended: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      });
    },
    [update, getById]
  );

  /**
   * Set loader on break
   * @param {string} loaderId - Loader ID
   */
  const setOnBreak = useCallback(
    async (loaderId) => {
      return update(loaderId, {
        status: LOADER_STATUS.ON_BREAK,
        updated_at: new Date().toISOString(),
      });
    },
    [update]
  );

  /**
   * Set loader off duty
   * @param {string} loaderId - Loader ID
   */
  const setOffDuty = useCallback(
    async (loaderId) => {
      return update(loaderId, {
        status: LOADER_STATUS.OFF_DUTY,
        current_dock_id: null,
        current_session_id: null,
        updated_at: new Date().toISOString(),
      });
    },
    [update]
  );

  /**
   * Set loader available
   * @param {string} loaderId - Loader ID
   */
  const setAvailable = useCallback(
    async (loaderId) => {
      return update(loaderId, {
        status: LOADER_STATUS.AVAILABLE,
        updated_at: new Date().toISOString(),
      });
    },
    [update]
  );

  /**
   * Create a new loader
   * @param {object} loaderData - Loader data
   */
  const createLoader = useCallback(
    async (loaderData) => {
      const newLoader = {
        ...loaderData,
        status: loaderData.status || LOADER_STATUS.AVAILABLE,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return create(newLoader);
    },
    [create]
  );

  /**
   * Update loader data
   * @param {string} id - Loader ID
   * @param {object} updates - Fields to update
   */
  const updateLoader = useCallback(
    async (id, updates) => {
      return update(id, {
        ...updates,
        updated_at: new Date().toISOString(),
      });
    },
    [update]
  );

  /**
   * Delete a loader
   * @param {string} id - Loader ID
   */
  const deleteLoader = useCallback(
    async (id) => {
      return remove(id);
    },
    [remove]
  );

  /**
   * Bulk assign loaders to a session
   * @param {string[]} loaderIds - Array of loader IDs
   * @param {string} dockId - Dock ID
   * @param {string} sessionId - Session ID
   */
  const bulkAssign = useCallback(
    async (loaderIds, dockId, sessionId) => {
      const promises = loaderIds.map((id) => assignLoader(id, dockId, sessionId));
      return Promise.all(promises);
    },
    [assignLoader]
  );

  /**
   * Bulk release loaders
   * @param {string[]} loaderIds - Array of loader IDs
   */
  const bulkRelease = useCallback(
    async (loaderIds) => {
      const promises = loaderIds.map((id) => releaseLoader(id));
      return Promise.all(promises);
    },
    [releaseLoader]
  );

  return {
    // Data
    loaders: data,
    loading,
    error,
    stats,
    availableLoaders,

    // Actions
    createLoader,
    updateLoader,
    deleteLoader,
    assignLoader,
    releaseLoader,
    setOnBreak,
    setOffDuty,
    setAvailable,
    bulkAssign,
    bulkRelease,
    getById,
    getByDock,
    getBySession,
    refetch,
  };
};

export default useLoaders;
