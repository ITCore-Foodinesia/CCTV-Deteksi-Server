/**
 * useDocks - Hook for managing docks data
 *
 * Wraps useSupabaseTable with dock-specific logic:
 * - Computed stats (available, occupied, maintenance counts)
 * - Custom actions (toggle status, assign/release dock)
 * - Proper column selection from database schema
 *
 * @example
 * const { docks, loading, stats, toggleDockStatus, releaseDock } = useDocks();
 */

import { useMemo, useCallback } from 'react';
import { useSupabaseTable } from './useSupabaseTable';

/**
 * Dock status enum values
 */
export const DOCK_STATUS = {
  AVAILABLE: 'available',
  OCCUPIED: 'occupied',
  MAINTENANCE: 'maintenance',
  RESERVED: 'reserved',
};

/**
 * Hook for docks table operations
 *
 * @param {object} options - Additional options
 * @param {object} options.filter - Additional filters
 * @returns {object} Docks data and operations
 */
export const useDocks = (options = {}) => {
  const { filter = {} } = options;

  const {
    data,
    loading,
    error,
    refetch,
    create,
    update,
    remove,
  } = useSupabaseTable('docks', {
    select: `
      id,
      dock_code,
      dock_name,
      warehouse_zone,
      status,
      capacity,
      maintenance_reason,
      location_data,
      tenant_id,
      created_at,
      updated_at
    `,
    filter,
    orderBy: 'dock_code',
    ascending: true,
  });

  /**
   * Computed stats from docks data
   */
  const stats = useMemo(() => {
    return {
      total: data.length,
      available: data.filter((d) => d.status === DOCK_STATUS.AVAILABLE).length,
      occupied: data.filter((d) => d.status === DOCK_STATUS.OCCUPIED).length,
      maintenance: data.filter((d) => d.status === DOCK_STATUS.MAINTENANCE).length,
      reserved: data.filter((d) => d.status === DOCK_STATUS.RESERVED).length,
    };
  }, [data]);

  /**
   * Get dock by ID
   */
  const getById = useCallback(
    (id) => {
      return data.find((dock) => dock.id === id);
    },
    [data]
  );

  /**
   * Get dock by code
   */
  const getByCode = useCallback(
    (code) => {
      return data.find((dock) => dock.dock_code === code);
    },
    [data]
  );

  /**
   * Get available docks
   */
  const getAvailableDocks = useMemo(() => {
    return data.filter((dock) => dock.status === DOCK_STATUS.AVAILABLE);
  }, [data]);

  /**
   * Set dock to maintenance mode
   * @param {string} id - Dock ID
   * @param {string} reason - Maintenance reason
   */
  const setMaintenance = useCallback(
    async (id, reason = '') => {
      return update(id, {
        status: DOCK_STATUS.MAINTENANCE,
        maintenance_reason: reason,
        updated_at: new Date().toISOString(),
      });
    },
    [update]
  );

  /**
   * Set dock to available
   * @param {string} id - Dock ID
   */
  const setAvailable = useCallback(
    async (id) => {
      return update(id, {
        status: DOCK_STATUS.AVAILABLE,
        maintenance_reason: null,
        updated_at: new Date().toISOString(),
      });
    },
    [update]
  );

  /**
   * Toggle dock status (quick action for UI)
   * Available → Maintenance → Available
   * @param {string} id - Dock ID
   */
  const toggleDockStatus = useCallback(
    async (id) => {
      const dock = getById(id);
      if (!dock) return;

      if (dock.status === DOCK_STATUS.AVAILABLE) {
        return setMaintenance(id, 'Quick toggle from dashboard');
      } else if (dock.status === DOCK_STATUS.MAINTENANCE) {
        return setAvailable(id);
      }
      // Cannot toggle occupied or reserved docks
      console.warn('Cannot toggle occupied or reserved dock');
    },
    [getById, setMaintenance, setAvailable]
  );

  /**
   * Occupy a dock (when loading session starts)
   * @param {string} id - Dock ID
   * @param {object} sessionInfo - Info about the session using this dock
   */
  const occupyDock = useCallback(
    async (id, sessionInfo = {}) => {
      const dock = getById(id);
      if (dock?.status !== DOCK_STATUS.AVAILABLE) {
        throw new Error('Dock is not available');
      }

      return update(id, {
        status: DOCK_STATUS.OCCUPIED,
        location_data: {
          ...(dock.location_data || {}),
          current_session: sessionInfo,
          occupied_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      });
    },
    [update, getById]
  );

  /**
   * Release a dock (when loading session ends)
   * @param {string} id - Dock ID
   */
  const releaseDock = useCallback(
    async (id) => {
      const dock = getById(id);
      if (!dock) return;

      return update(id, {
        status: DOCK_STATUS.AVAILABLE,
        location_data: {
          ...(dock.location_data || {}),
          current_session: null,
          last_session: dock.location_data?.current_session,
          released_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      });
    },
    [update, getById]
  );

  /**
   * Create a new dock
   * @param {object} dockData - Dock data
   */
  const createDock = useCallback(
    async (dockData) => {
      const newDock = {
        ...dockData,
        status: dockData.status || DOCK_STATUS.AVAILABLE,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return create(newDock);
    },
    [create]
  );

  /**
   * Update dock data
   * @param {string} id - Dock ID
   * @param {object} updates - Fields to update
   */
  const updateDock = useCallback(
    async (id, updates) => {
      return update(id, {
        ...updates,
        updated_at: new Date().toISOString(),
      });
    },
    [update]
  );

  /**
   * Delete a dock
   * @param {string} id - Dock ID
   */
  const deleteDock = useCallback(
    async (id) => {
      const dock = getById(id);
      if (dock?.status === DOCK_STATUS.OCCUPIED) {
        throw new Error('Cannot delete an occupied dock');
      }
      return remove(id);
    },
    [remove, getById]
  );

  return {
    // Data
    docks: data,
    loading,
    error,
    stats,
    availableDocks: getAvailableDocks,

    // Actions
    createDock,
    updateDock,
    deleteDock,
    toggleDockStatus,
    setMaintenance,
    setAvailable,
    occupyDock,
    releaseDock,
    getById,
    getByCode,
    refetch,
  };
};

export default useDocks;
