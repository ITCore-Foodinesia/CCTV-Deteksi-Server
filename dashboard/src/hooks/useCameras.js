/**
 * useCameras - Hook for managing CCTV cameras data
 *
 * Features:
 * - Real-time camera status updates
 * - Camera CRUD operations
 * - Status filtering (online/offline/maintenance)
 * - Dock association management
 *
 * @example
 * const { cameras, onlineCameras, offlineCameras, updateStatus } = useCameras();
 */

import { useMemo, useCallback } from 'react';
import { useSupabaseTable } from './useSupabaseTable';

/**
 * Camera status enum (from database)
 */
export const CAMERA_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  MAINTENANCE: 'maintenance',
  ERROR: 'error',
};

/**
 * Hook for cameras table operations
 *
 * @param {object} options - Additional options
 * @param {object} options.filter - Additional filters
 * @returns {object} Cameras data and operations
 */
export const useCameras = (options = {}) => {
  const { filter = {} } = options;

  const {
    data,
    loading,
    error,
    refetch,
    create,
    update,
    remove,
  } = useSupabaseTable('cameras', {
    select: `
      id,
      name,
      location,
      longitude,
      latitude,
      description,
      status,
      tenant_id,
      dock_id,
      created_at
    `,
    filter,
    orderBy: 'created_at',
    ascending: false,
  });

  /**
   * Online cameras
   */
  const onlineCameras = useMemo(() => {
    return data.filter((c) => c.status === CAMERA_STATUS.ONLINE);
  }, [data]);

  /**
   * Offline cameras
   */
  const offlineCameras = useMemo(() => {
    return data.filter((c) => c.status === CAMERA_STATUS.OFFLINE);
  }, [data]);

  /**
   * Cameras in maintenance
   */
  const maintenanceCameras = useMemo(() => {
    return data.filter((c) => c.status === CAMERA_STATUS.MAINTENANCE);
  }, [data]);

  /**
   * Cameras with errors
   */
  const errorCameras = useMemo(() => {
    return data.filter((c) => c.status === CAMERA_STATUS.ERROR);
  }, [data]);

  /**
   * Stats
   */
  const stats = useMemo(() => ({
    total: data.length,
    online: onlineCameras.length,
    offline: offlineCameras.length,
    maintenance: maintenanceCameras.length,
    error: errorCameras.length,
    byStatus: {
      [CAMERA_STATUS.ONLINE]: onlineCameras.length,
      [CAMERA_STATUS.OFFLINE]: offlineCameras.length,
      [CAMERA_STATUS.MAINTENANCE]: maintenanceCameras.length,
      [CAMERA_STATUS.ERROR]: errorCameras.length,
    },
  }), [data.length, onlineCameras.length, offlineCameras.length, maintenanceCameras.length, errorCameras.length]);

  /**
   * Add a new camera
   */
  const addCamera = useCallback(
    async (cameraData) => {
      const newCamera = {
        name: cameraData.name,
        location: cameraData.location || null,
        longitude: cameraData.longitude || null,
        latitude: cameraData.latitude || null,
        description: cameraData.description || null,
        status: cameraData.status || CAMERA_STATUS.OFFLINE,
        tenant_id: cameraData.tenantId,
        dock_id: cameraData.dockId || null,
        created_at: new Date().toISOString(),
      };

      return create(newCamera);
    },
    [create]
  );

  /**
   * Update camera details
   */
  const updateCamera = useCallback(
    async (cameraId, updates) => {
      return update(cameraId, updates);
    },
    [update]
  );

  /**
   * Update camera status
   */
  const updateStatus = useCallback(
    async (cameraId, status) => {
      return update(cameraId, { status });
    },
    [update]
  );

  /**
   * Set camera to maintenance mode
   */
  const setMaintenance = useCallback(
    async (cameraId) => {
      return updateStatus(cameraId, CAMERA_STATUS.MAINTENANCE);
    },
    [updateStatus]
  );

  /**
   * Set camera online
   */
  const setOnline = useCallback(
    async (cameraId) => {
      return updateStatus(cameraId, CAMERA_STATUS.ONLINE);
    },
    [updateStatus]
  );

  /**
   * Set camera offline
   */
  const setOffline = useCallback(
    async (cameraId) => {
      return updateStatus(cameraId, CAMERA_STATUS.OFFLINE);
    },
    [updateStatus]
  );

  /**
   * Assign camera to a dock
   */
  const assignToDock = useCallback(
    async (cameraId, dockId) => {
      return update(cameraId, { dock_id: dockId });
    },
    [update]
  );

  /**
   * Remove dock assignment
   */
  const removeDockAssignment = useCallback(
    async (cameraId) => {
      return update(cameraId, { dock_id: null });
    },
    [update]
  );

  /**
   * Delete camera
   */
  const deleteCamera = useCallback(
    async (cameraId) => {
      return remove(cameraId);
    },
    [remove]
  );

  /**
   * Get camera by ID
   */
  const getById = useCallback(
    (id) => data.find((c) => c.id === id),
    [data]
  );

  /**
   * Get cameras by dock ID
   */
  const getByDock = useCallback(
    (dockId) => data.filter((c) => c.dock_id === dockId),
    [data]
  );

  /**
   * Filter by status
   */
  const filterByStatus = useCallback(
    (status) => data.filter((c) => c.status === status),
    [data]
  );

  return {
    // Data
    cameras: data,
    onlineCameras,
    offlineCameras,
    maintenanceCameras,
    errorCameras,
    loading,
    error,
    stats,

    // Actions
    addCamera,
    updateCamera,
    updateStatus,
    setMaintenance,
    setOnline,
    setOffline,
    assignToDock,
    removeDockAssignment,
    deleteCamera,
    getById,
    getByDock,
    filterByStatus,
    refetch,
  };
};

export default useCameras;
