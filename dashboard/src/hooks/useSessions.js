/**
 * useSessions - Hook for managing loading_sessions data
 *
 * This is the CRITICAL hook for Flutter ↔ Dashboard ↔ CCTV Engine integration.
 * It provides:
 * - Real-time session monitoring
 * - Session lifecycle management (start/complete/cancel)
 * - Counting data from CCTV engine
 * - Statistics for dashboard overview
 *
 * @example
 * const { sessions, activeSessions, stats, startSession, completeSession } = useSessions();
 */

import { useMemo, useCallback } from 'react';
import { useSupabaseTable } from './useSupabaseTable';
import { supabase } from '../lib/supabase';

/**
 * Session status enum values
 */
export const SESSION_STATUS = {
  PENDING_DOCK: 'pending_dock', // Driver selected, waiting for dock assignment
  WAITING: 'waiting', // Dock assigned, waiting for truck to arrive
  LOADING: 'loading', // Active loading in progress (CCTV counting)
  COMPLETED: 'completed', // Session finished successfully
  CANCELLED: 'cancelled', // Session cancelled
};

/**
 * Hook for loading_sessions table operations
 *
 * @param {object} options - Additional options
 * @param {object} options.filter - Additional filters
 * @param {boolean} options.activeOnly - Only fetch active sessions (default: false)
 * @returns {object} Sessions data and operations
 */
export const useSessions = (options = {}) => {
  const { filter = {}, activeOnly = false } = options;

  // Build filter for active sessions if requested
  const activeFilter = activeOnly
    ? { ...filter }
    : filter;

  const {
    data,
    loading,
    error,
    refetch,
    create,
    update,
    remove,
  } = useSupabaseTable('loading_sessions', {
    select: `
      id,
      driver_id,
      truck_id,
      dock_id,
      camera_id,
      tenant_id,
      status,
      plate_number,
      plate_detected,
      started_at,
      finished_at,
      duration_seconds,
      items_in,
      items_out,
      loading_count,
      rehab_count,
      counting_active,
      counting_started_at,
      start_source,
      helper_id,
      loader1_id,
      loader2_id,
      metadata,
      created_at,
      updated_at
    `,
    filter: activeFilter,
    orderBy: 'created_at',
    ascending: false,
  });

  /**
   * Filter active sessions (in loading or waiting status)
   */
  const activeSessions = useMemo(() => {
    return data.filter((s) =>
      [SESSION_STATUS.LOADING, SESSION_STATUS.WAITING, SESSION_STATUS.PENDING_DOCK].includes(
        s.status
      )
    );
  }, [data]);

  /**
   * Filter sessions currently being counted (CCTV active)
   */
  const countingSessions = useMemo(() => {
    return data.filter((s) => s.counting_active === true);
  }, [data]);

  /**
   * Completed sessions (for history)
   */
  const completedSessions = useMemo(() => {
    return data.filter((s) =>
      [SESSION_STATUS.COMPLETED, SESSION_STATUS.CANCELLED].includes(s.status)
    );
  }, [data]);

  /**
   * Computed stats
   */
  const stats = useMemo(() => {
    const completed = data.filter((s) => s.status === SESSION_STATUS.COMPLETED);
    const totalItems = completed.reduce(
      (sum, s) => sum + (s.items_in || 0) + (s.items_out || 0),
      0
    );
    const totalDuration = completed.reduce(
      (sum, s) => sum + (s.duration_seconds || 0),
      0
    );

    return {
      total: data.length,
      active: activeSessions.length,
      counting: countingSessions.length,
      completed: completed.length,
      cancelled: data.filter((s) => s.status === SESSION_STATUS.CANCELLED).length,
      averageDuration: completed.length > 0 ? totalDuration / completed.length : 0,
      totalItems,
      byStatus: data.reduce((acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      }, {}),
    };
  }, [data, activeSessions.length, countingSessions.length]);

  /**
   * Get session by ID
   */
  const getById = useCallback(
    (id) => {
      return data.find((session) => session.id === id);
    },
    [data]
  );

  /**
   * Get active session by plate number
   */
  const getActiveByPlate = useCallback(
    (plateNumber) => {
      return activeSessions.find(
        (s) =>
          s.plate_number === plateNumber ||
          s.plate_detected === plateNumber
      );
    },
    [activeSessions]
  );

  /**
   * Get active session by dock ID
   */
  const getActiveByDock = useCallback(
    (dockId) => {
      return activeSessions.find((s) => s.dock_id === dockId);
    },
    [activeSessions]
  );

  /**
   * Start a new loading session
   * This is typically called from Flutter App
   * @param {object} sessionData - Session details
   */
  const startSession = useCallback(
    async (sessionData) => {
      const newSession = {
        driver_id: sessionData.driverId,
        truck_id: sessionData.truckId,
        dock_id: sessionData.dockId || null,
        plate_number: sessionData.plateNumber,
        status: sessionData.dockId ? SESSION_STATUS.WAITING : SESSION_STATUS.PENDING_DOCK,
        start_source: sessionData.startSource || 'dashboard',
        started_at: new Date().toISOString(),
        tenant_id: sessionData.tenantId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return create(newSession);
    },
    [create]
  );

  /**
   * Assign a dock to a pending session
   * @param {string} sessionId - Session ID
   * @param {string} dockId - Dock ID to assign
   */
  const assignDock = useCallback(
    async (sessionId, dockId) => {
      return update(sessionId, {
        dock_id: dockId,
        status: SESSION_STATUS.WAITING,
        updated_at: new Date().toISOString(),
      });
    },
    [update]
  );

  /**
   * Activate counting (transition to LOADING status)
   * This is triggered by CCTV engine when truck is detected
   * @param {string} sessionId - Session ID
   * @param {string} cameraId - Camera that detected the truck
   */
  const activateCounting = useCallback(
    async (sessionId, cameraId = null) => {
      return update(sessionId, {
        status: SESSION_STATUS.LOADING,
        counting_active: true,
        counting_started_at: new Date().toISOString(),
        camera_id: cameraId,
        updated_at: new Date().toISOString(),
      });
    },
    [update]
  );

  /**
   * Update counting values (called by CCTV engine periodically)
   * @param {string} sessionId - Session ID
   * @param {object} counts - { loadingCount, rehabCount }
   */
  const updateCounts = useCallback(
    async (sessionId, counts) => {
      return update(sessionId, {
        loading_count: counts.loadingCount ?? 0,
        rehab_count: counts.rehabCount ?? 0,
        updated_at: new Date().toISOString(),
      });
    },
    [update]
  );

  /**
   * Complete a session (finish loading)
   * @param {string} sessionId - Session ID
   * @param {object} finalData - Optional final data (items_in, items_out, etc)
   */
  const completeSession = useCallback(
    async (sessionId, finalData = {}) => {
      const session = getById(sessionId);
      const startedAt = session?.started_at ? new Date(session.started_at) : new Date();
      const endedAt = new Date();
      const durationSeconds = Math.floor((endedAt - startedAt) / 1000);

      return update(sessionId, {
        status: SESSION_STATUS.COMPLETED,
        counting_active: false,
        ended_at: endedAt.toISOString(),
        duration_seconds: durationSeconds,
        items_in: finalData.itemsIn ?? session?.loading_count ?? 0,
        items_out: finalData.itemsOut ?? session?.rehab_count ?? 0,
        updated_at: endedAt.toISOString(),
      });
    },
    [update, getById]
  );

  /**
   * Cancel a session
   * @param {string} sessionId - Session ID
   * @param {string} reason - Cancellation reason
   */
  const cancelSession = useCallback(
    async (sessionId, reason = '') => {
      const session = getById(sessionId);
      return update(sessionId, {
        status: SESSION_STATUS.CANCELLED,
        counting_active: false,
        ended_at: new Date().toISOString(),
        metadata: {
          ...(session?.metadata || {}),
          cancellation_reason: reason,
          cancelled_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      });
    },
    [update, getById]
  );

  /**
   * Update plate detected (from CCTV OCR)
   * @param {string} sessionId - Session ID
   * @param {string} plateDetected - Plate number detected by CCTV
   * @param {number} confidence - OCR confidence (0-100)
   */
  const updatePlateDetected = useCallback(
    async (sessionId, plateDetected, confidence = 0) => {
      const session = getById(sessionId);
      return update(sessionId, {
        plate_detected: plateDetected,
        metadata: {
          ...(session?.metadata || {}),
          plate_confidence: confidence,
          plate_detected_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      });
    },
    [update, getById]
  );

  /**
   * Fetch session with full relations (drivers, trucks, docks)
   * @param {string} sessionId - Session ID
   */
  const fetchSessionWithRelations = useCallback(
    async (sessionId) => {
      const { data: session, error } = await supabase
        .from('loading_sessions')
        .select(`
          *,
          drivers:driver_id(*),
          trucks:truck_id(*),
          docks:dock_id(*),
          cameras:camera_id(*)
        `)
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      return session;
    },
    []
  );

  return {
    // Data
    sessions: data,
    activeSessions,
    countingSessions,
    completedSessions,
    loading,
    error,
    stats,

    // Actions
    startSession,
    assignDock,
    activateCounting,
    updateCounts,
    completeSession,
    cancelSession,
    updatePlateDetected,
    getById,
    getActiveByPlate,
    getActiveByDock,
    fetchSessionWithRelations,
    refetch,
  };
};

export default useSessions;
