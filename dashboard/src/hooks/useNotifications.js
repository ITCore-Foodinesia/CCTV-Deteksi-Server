/**
 * useNotifications - Hook for managing notifications data
 *
 * Features:
 * - Real-time notification updates
 * - Mark as read/unread operations
 * - Broadcast notifications
 * - Filter by type and read status
 *
 * @example
 * const { notifications, unread, markAsRead, broadcast } = useNotifications();
 */

import { useMemo, useCallback } from 'react';
import { useSupabaseTable } from './useSupabaseTable';

/**
 * Notification type enum (from database)
 */
export const NOTIFICATION_TYPE = {
  LOADING_STARTED: 'loading_started',
  LOADING_COMPLETED: 'loading_completed',
  DOCK_ASSIGNED: 'dock_assigned',
  SYSTEM: 'system',
  ALERT: 'alert',
  INFO: 'info',
};

/**
 * Hook for notifications table operations
 *
 * @param {object} options - Additional options
 * @param {object} options.filter - Additional filters
 * @param {boolean} options.unreadOnly - Only fetch unread notifications (default: false)
 * @returns {object} Notifications data and operations
 */
export const useNotifications = (options = {}) => {
  const { filter = {}, unreadOnly = false } = options;

  // Build filter for unread if requested
  const activeFilter = unreadOnly
    ? { ...filter, is_read: false }
    : filter;

  const {
    data,
    loading,
    error,
    refetch,
    create,
    update,
    remove,
  } = useSupabaseTable('notifications', {
    select: `
      id,
      driver_id,
      tenant_id,
      type,
      title,
      message,
      is_read,
      action_data,
      created_at,
      read_at
    `,
    filter: activeFilter,
    orderBy: 'created_at',
    ascending: false,
  });

  /**
   * Unread notifications
   */
  const unreadNotifications = useMemo(() => {
    return data.filter((n) => !n.is_read);
  }, [data]);

  /**
   * Read notifications
   */
  const readNotifications = useMemo(() => {
    return data.filter((n) => n.is_read);
  }, [data]);

  /**
   * Group notifications by type
   */
  const byType = useMemo(() => {
    return data.reduce((acc, n) => {
      acc[n.type] = acc[n.type] || [];
      acc[n.type].push(n);
      return acc;
    }, {});
  }, [data]);

  /**
   * Stats
   */
  const stats = useMemo(() => ({
    total: data.length,
    unread: unreadNotifications.length,
    read: readNotifications.length,
    alerts: data.filter((n) => n.type === NOTIFICATION_TYPE.ALERT).length,
    byType: Object.keys(byType).reduce((acc, type) => {
      acc[type] = byType[type].length;
      return acc;
    }, {}),
  }), [data, unreadNotifications.length, readNotifications.length, byType]);

  /**
   * Mark a single notification as read
   */
  const markAsRead = useCallback(
    async (notificationId) => {
      return update(notificationId, {
        is_read: true,
        read_at: new Date().toISOString(),
      });
    },
    [update]
  );

  /**
   * Mark a single notification as unread
   */
  const markAsUnread = useCallback(
    async (notificationId) => {
      return update(notificationId, {
        is_read: false,
        read_at: null,
      });
    },
    [update]
  );

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(
    async () => {
      const promises = unreadNotifications.map((n) =>
        update(n.id, {
          is_read: true,
          read_at: new Date().toISOString(),
        })
      );
      return Promise.all(promises);
    },
    [update, unreadNotifications]
  );

  /**
   * Delete a notification
   */
  const deleteNotification = useCallback(
    async (notificationId) => {
      return remove(notificationId);
    },
    [remove]
  );

  /**
   * Clear all notifications
   */
  const clearAll = useCallback(
    async () => {
      const promises = data.map((n) => remove(n.id));
      return Promise.all(promises);
    },
    [remove, data]
  );

  /**
   * Send/broadcast a new notification
   */
  const broadcast = useCallback(
    async (notificationData) => {
      const newNotification = {
        driver_id: notificationData.driverId || null,
        tenant_id: notificationData.tenantId,
        type: notificationData.type || NOTIFICATION_TYPE.INFO,
        title: notificationData.title,
        message: notificationData.message,
        is_read: false,
        action_data: notificationData.actionData || {},
        created_at: new Date().toISOString(),
      };

      return create(newNotification);
    },
    [create]
  );

  /**
   * Get notification by ID
   */
  const getById = useCallback(
    (id) => data.find((n) => n.id === id),
    [data]
  );

  /**
   * Filter notifications by type
   */
  const filterByType = useCallback(
    (type) => data.filter((n) => n.type === type),
    [data]
  );

  return {
    // Data
    notifications: data,
    unreadNotifications,
    readNotifications,
    byType,
    loading,
    error,
    stats,

    // Actions
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
    clearAll,
    broadcast,
    getById,
    filterByType,
    refetch,
  };
};

export default useNotifications;
