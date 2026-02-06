/**
 * NotificationPanel Component
 * Dropdown panel for displaying notifications from TopHeader bell icon
 * 
 * Features:
 * - Real-time notification list
 * - Mark as read/unread
 * - Mark all as read
 * - Delete notification
 * - Navigate to full notifications page
 * - Click outside to close
 */

import React, { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  ExternalLink,
  Truck,
  Package,
  AlertTriangle,
  Info,
  X,
  Loader2
} from 'lucide-react';
import { useNotifications, NOTIFICATION_TYPE } from '../../hooks/useNotifications';

/**
 * Get icon and color based on notification type
 */
const getNotificationStyle = (type) => {
  switch (type) {
    case NOTIFICATION_TYPE.LOADING_STARTED:
      return {
        icon: Truck,
        bgColor: 'bg-blue-100',
        iconColor: 'text-blue-600',
      };
    case NOTIFICATION_TYPE.LOADING_COMPLETED:
      return {
        icon: Check,
        bgColor: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
      };
    case NOTIFICATION_TYPE.DOCK_ASSIGNED:
      return {
        icon: Package,
        bgColor: 'bg-purple-100',
        iconColor: 'text-purple-600',
      };
    case NOTIFICATION_TYPE.ALERT:
      return {
        icon: AlertTriangle,
        bgColor: 'bg-amber-100',
        iconColor: 'text-amber-600',
      };
    case NOTIFICATION_TYPE.SYSTEM:
      return {
        icon: Bell,
        bgColor: 'bg-gray-100',
        iconColor: 'text-gray-600',
      };
    case NOTIFICATION_TYPE.INFO:
    default:
      return {
        icon: Info,
        bgColor: 'bg-blue-50',
        iconColor: 'text-blue-500',
      };
  }
};

/**
 * Format relative time
 */
const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays < 7) return `${diffDays} hari lalu`;
  
  return date.toLocaleDateString('id-ID', { 
    day: 'numeric', 
    month: 'short' 
  });
};

/**
 * Single notification item
 */
const NotificationItem = ({ notification, onMarkAsRead, onDelete }) => {
  const style = getNotificationStyle(notification.type);
  const IconComponent = style.icon;

  return (
    <div 
      className={`
        flex gap-3 p-3 hover:bg-gray-50 transition-colors cursor-pointer
        ${notification.is_read ? 'opacity-60' : ''}
      `}
      onClick={() => !notification.is_read && onMarkAsRead(notification.id)}
    >
      {/* Icon */}
      <div className={`
        flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center
        ${style.bgColor}
      `}>
        <IconComponent className={`w-4 h-4 ${style.iconColor}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`
            text-sm font-medium text-gray-900 line-clamp-1
            ${notification.is_read ? 'font-normal' : ''}
          `}>
            {notification.title}
          </p>
          {!notification.is_read && (
            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-lime-500 mt-1.5" />
          )}
        </div>
        <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
          {notification.message}
        </p>
        <p className="text-[10px] text-gray-400 mt-1">
          {formatRelativeTime(notification.created_at)}
        </p>
      </div>

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notification.id);
        }}
        className="flex-shrink-0 p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
        aria-label="Hapus notifikasi"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

/**
 * Empty state when no notifications
 */
const EmptyState = () => (
  <div className="py-8 px-4 text-center">
    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
      <Bell className="w-6 h-6 text-gray-400" />
    </div>
    <p className="text-sm font-medium text-gray-900">Tidak ada notifikasi</p>
    <p className="text-xs text-gray-500 mt-1">Anda sudah membaca semuanya!</p>
  </div>
);

/**
 * Loading state
 */
const LoadingState = () => (
  <div className="py-8 px-4 text-center">
    <Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto" />
    <p className="text-xs text-gray-500 mt-2">Memuat notifikasi...</p>
  </div>
);

/**
 * Main NotificationPanel component
 */
const NotificationPanel = ({ isOpen, onClose }) => {
  const panelRef = useRef(null);
  
  const {
    notifications,
    unreadNotifications,
    loading,
    stats,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        // Check if click is on the bell button (parent handles this)
        const bellButton = event.target.closest('[data-notification-trigger]');
        if (!bellButton) {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Take only the latest 5 notifications for the panel
  const recentNotifications = notifications.slice(0, 5);

  return (
    <>
      {/* Backdrop for mobile */}
      <div 
        className="fixed inset-0 bg-black/20 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="
          absolute right-0 top-full mt-2 z-50
          w-80 sm:w-96
          bg-white rounded-xl shadow-xl border border-gray-200
          overflow-hidden
          animate-in slide-in-from-top-5 duration-200
        "
        role="dialog"
        aria-label="Notifikasi"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">Notifikasi</h3>
            {stats.unread > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-lime-100 text-lime-700 rounded-full">
                {stats.unread} baru
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {stats.unread > 0 && (
              <button
                onClick={markAllAsRead}
                className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Tandai semua sudah dibaca"
                title="Tandai semua sudah dibaca"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors lg:hidden"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notification list */}
        <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
          {loading ? (
            <LoadingState />
          ) : recentNotifications.length === 0 ? (
            <EmptyState />
          ) : (
            recentNotifications.map((notification) => (
              <div key={notification.id} className="group">
                <NotificationItem
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                />
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
          <Link
            to="/dashboard/notifications"
            onClick={onClose}
            className="
              flex items-center justify-center gap-2 w-full
              py-2 px-4 rounded-lg
              text-sm font-medium text-gray-700
              hover:bg-gray-100 transition-colors
            "
          >
            Lihat semua notifikasi
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </>
  );
};

export default NotificationPanel;
