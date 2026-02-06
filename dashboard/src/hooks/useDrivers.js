/**
 * useDrivers - Hook for managing drivers data
 *
 * Wraps useSupabaseTable with driver-specific logic:
 * - Computed stats (active, pending, suspended counts)
 * - Custom actions (approve, suspend)
 * - Proper column selection from database schema
 *
 * @example
 * const { drivers, loading, stats, createDriver, approveDriver } = useDrivers();
 */

import { useMemo, useCallback } from 'react';
import { useSupabaseTable } from './useSupabaseTable';

/**
 * Hook for drivers table operations
 *
 * @param {object} options - Additional options
 * @param {object} options.filter - Additional filters
 * @returns {object} Drivers data and operations
 */
export const useDrivers = (options = {}) => {
  const { filter = {} } = options;

  const {
    data,
    loading,
    error,
    refetch,
    create,
    update,
    remove,
  } = useSupabaseTable('drivers', {
    select: `
      id,
      name,
      phone,
      email,
      driver_code,
      status,
      profile_data,
      auth_user_id,
      tenant_id,
      created_at,
      updated_at
    `,
    filter,
    orderBy: 'created_at',
    ascending: false,
  });

  /**
   * Computed stats from drivers data
   */
  const stats = useMemo(() => {
    return {
      total: data.length,
      active: data.filter((d) => d.status === 'active').length,
      pending: data.filter((d) => d.status === 'pending_approval').length,
      suspended: data.filter((d) => d.status === 'suspended').length,
      inactive: data.filter((d) => d.status === 'inactive').length,
    };
  }, [data]);

  /**
   * Get driver by ID
   */
  const getById = useCallback(
    (id) => {
      return data.find((driver) => driver.id === id);
    },
    [data]
  );

  /**
   * Approve a pending driver
   * @param {string} id - Driver ID
   */
  const approveDriver = useCallback(
    async (id) => {
      return update(id, {
        status: 'active',
        updated_at: new Date().toISOString(),
      });
    },
    [update]
  );

  /**
   * Suspend a driver
   * @param {string} id - Driver ID
   * @param {string} reason - Optional suspension reason
   */
  const suspendDriver = useCallback(
    async (id, reason = '') => {
      const updates = {
        status: 'suspended',
        updated_at: new Date().toISOString(),
      };

      // Store reason in profile_data if provided
      if (reason) {
        const driver = getById(id);
        updates.profile_data = {
          ...(driver?.profile_data || {}),
          suspension_reason: reason,
          suspended_at: new Date().toISOString(),
        };
      }

      return update(id, updates);
    },
    [update, getById]
  );

  /**
   * Reactivate a suspended driver
   * @param {string} id - Driver ID
   */
  const reactivateDriver = useCallback(
    async (id) => {
      return update(id, {
        status: 'active',
        updated_at: new Date().toISOString(),
      });
    },
    [update]
  );

  /**
   * Create a new driver
   * @param {object} driverData - Driver data
   */
  const createDriver = useCallback(
    async (driverData) => {
      // Set default status if not provided
      const newDriver = {
        ...driverData,
        status: driverData.status || 'pending_approval',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return create(newDriver);
    },
    [create]
  );

  /**
   * Update driver data
   * @param {string} id - Driver ID
   * @param {object} updates - Fields to update
   */
  const updateDriver = useCallback(
    async (id, updates) => {
      return update(id, {
        ...updates,
        updated_at: new Date().toISOString(),
      });
    },
    [update]
  );

  /**
   * Delete a driver (soft delete by setting inactive)
   * @param {string} id - Driver ID
   * @param {boolean} hardDelete - If true, permanently delete
   */
  const deleteDriver = useCallback(
    async (id, hardDelete = false) => {
      if (hardDelete) {
        return remove(id);
      }
      // Soft delete - set status to inactive
      return update(id, {
        status: 'inactive',
        updated_at: new Date().toISOString(),
      });
    },
    [remove, update]
  );

  return {
    // Data
    drivers: data,
    loading,
    error,
    stats,

    // Actions
    createDriver,
    updateDriver,
    deleteDriver,
    approveDriver,
    suspendDriver,
    reactivateDriver,
    getById,
    refetch,
  };
};

export default useDrivers;
