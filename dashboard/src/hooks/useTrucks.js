/**
 * useTrucks - Hook for managing trucks data
 *
 * Wraps useSupabaseTable with truck-specific logic:
 * - Computed stats (total, registered, active)
 * - Plate number lookup and validation
 * - Proper column selection from database schema
 *
 * @example
 * const { trucks, loading, stats, getByPlate, createTruck } = useTrucks();
 */

import { useMemo, useCallback } from 'react';
import { useSupabaseTable } from './useSupabaseTable';

/**
 * Normalize plate number for comparison
 * Removes spaces and converts to uppercase
 */
const normalizePlate = (plate) => {
  if (!plate) return '';
  return plate.replace(/\s+/g, '').toUpperCase();
};

/**
 * Hook for trucks table operations
 *
 * @param {object} options - Additional options
 * @param {object} options.filter - Additional filters
 * @returns {object} Trucks data and operations
 */
export const useTrucks = (options = {}) => {
  const { filter = {} } = options;

  const {
    data,
    loading,
    error,
    refetch,
    create,
    update,
    remove,
  } = useSupabaseTable('trucks', {
    select: `
      id,
      plate_number,
      plate_normalized,
      vehicle_type,
      truck_type,
      brand_model,
      is_registered,
      meta,
      metadata,
      tenant_id,
      created_at
    `,
    filter,
    orderBy: 'created_at',
    ascending: false,
  });

  /**
   * Computed stats from trucks data
   */
  const stats = useMemo(() => {
    return {
      total: data.length,
      registered: data.filter((t) => t.is_registered).length,
      unregistered: data.filter((t) => !t.is_registered).length,
      byType: data.reduce((acc, truck) => {
        const type = truck.vehicle_type || 'Unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {}),
    };
  }, [data]);

  /**
   * Get truck by ID
   */
  const getById = useCallback(
    (id) => {
      return data.find((truck) => truck.id === id);
    },
    [data]
  );

  /**
   * Get truck by plate number (exact or normalized)
   */
  const getByPlate = useCallback(
    (plateNumber) => {
      const normalized = normalizePlate(plateNumber);
      return data.find(
        (truck) =>
          truck.plate_normalized === normalized ||
          normalizePlate(truck.plate_number) === normalized
      );
    },
    [data]
  );

  /**
   * Check if plate number exists
   */
  const plateExists = useCallback(
    (plateNumber, excludeId = null) => {
      const normalized = normalizePlate(plateNumber);
      return data.some(
        (truck) =>
          (truck.plate_normalized === normalized ||
            normalizePlate(truck.plate_number) === normalized) &&
          truck.id !== excludeId
      );
    },
    [data]
  );

  /**
   * Get trucks by vehicle type
   */
  const getByType = useCallback(
    (vehicleType) => {
      return data.filter((truck) => truck.vehicle_type === vehicleType);
    },
    [data]
  );

  /**
   * Get registered trucks only
   */
  const registeredTrucks = useMemo(() => {
    return data.filter((truck) => truck.is_registered);
  }, [data]);

  /**
   * Register a truck (mark as registered)
   * @param {string} id - Truck ID
   */
  const registerTruck = useCallback(
    async (id) => {
      return update(id, {
        is_registered: true,
        updated_at: new Date().toISOString(),
      });
    },
    [update]
  );

  /**
   * Unregister a truck
   * @param {string} id - Truck ID
   */
  const unregisterTruck = useCallback(
    async (id) => {
      return update(id, {
        is_registered: false,
        updated_at: new Date().toISOString(),
      });
    },
    [update]
  );

  /**
   * Create a new truck
   * @param {object} truckData - Truck data
   */
  const createTruck = useCallback(
    async (truckData) => {
      // Check for duplicate plate
      if (plateExists(truckData.plate_number)) {
        throw new Error('Plate number already exists');
      }

      const newTruck = {
        ...truckData,
        plate_normalized: normalizePlate(truckData.plate_number),
        is_registered: truckData.is_registered ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return create(newTruck);
    },
    [create, plateExists]
  );

  /**
   * Update truck data
   * @param {string} id - Truck ID
   * @param {object} updates - Fields to update
   */
  const updateTruck = useCallback(
    async (id, updates) => {
      const patchData = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // Update normalized plate if plate_number changes
      if (updates.plate_number) {
        // Check for duplicate plate (excluding current truck)
        if (plateExists(updates.plate_number, id)) {
          throw new Error('Plate number already exists');
        }
        patchData.plate_normalized = normalizePlate(updates.plate_number);
      }

      return update(id, patchData);
    },
    [update, plateExists]
  );

  /**
   * Delete a truck
   * @param {string} id - Truck ID
   */
  const deleteTruck = useCallback(
    async (id) => {
      return remove(id);
    },
    [remove]
  );

  return {
    // Data
    trucks: data,
    loading,
    error,
    stats,
    registeredTrucks,

    // Actions
    createTruck,
    updateTruck,
    deleteTruck,
    registerTruck,
    unregisterTruck,
    getById,
    getByPlate,
    getByType,
    plateExists,
    refetch,
  };
};

export default useTrucks;
