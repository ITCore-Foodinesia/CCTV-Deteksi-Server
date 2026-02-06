/**
 * TopHeader Component (React Router Version)
 * Sticky header with mobile menu, connection status, notifications, and user profile
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Menu, 
  Bell, 
  Wifi, 
  WifiOff, 
  User, 
  LogOut, 
  Settings,
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
import { useAuth } from '../contexts/AuthContext';
import { useNotifications, NOTIFICATION_TYPE } from '../hooks/useNotifications';

/**
 * Connection Indicator - shows WebSocket connection status
 */
const ConnectionIndicator = ({ connected }) => (
  <div className={`
    flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium
    ${connected 
      ? 'bg-emerald-50 text-emerald-700' 
      : 'bg-red-50 text-red-700'
    }
  `}>
    {connected ? (
      <>
        <Wifi className="h-4 w-4" />
        <span className="hidden sm:inline">Connected</span>
      </>
    ) : (
      <>
        <WifiOff className="h-4 w-4" />
        <span className="hidden sm:inline">Disconnected</span>
      </>
    )}
  </div>
);

/**
 * Get page title from pathname
 */
const getPageTitle = (pathname) => {
  const titles = {
    '/app/dashboard': 'Dashboard',
    '/app/live-streaming': 'Live Streaming',
    '/app/drivers': 'Drivers',
    '/app/trucks': 'Trucks',
    '/app/docks': 'Docks',
    '/app/helpers': 'Helpers',
    '/app/loaders': 'Loaders',
    '/app/sessions': 'Loading Sessions',
    '/app/history': 'History',
    '/app/notifications': 'Notifications',
    '/app/cameras': 'Cameras',
    '/app/users': 'Users & Roles',
    '/app/settings': 'Settings',
    '/app/reports': 'Reports',
    '/app/analytics': 'Analytics',
    // Also support /dashboard prefix
    '/dashboard/overview': 'Dashboard',
    '/dashboard/live-streaming': 'Live Streaming',
    '/dashboard/drivers': 'Drivers',
    '/dashboard/trucks': 'Trucks',
    '/dashboard/docks': 'Docks',
    '/dashboard/helpers': 'Helpers',
    '/dashboard/loaders': 'Loaders',
    '/dashboard/sessions': 'Loading Sessions',
    '/dashboard/history': 'History',
    '/dashboard/notifications': 'Notifications',
    '/dashboard/cameras': 'Cameras',
    '/dashboard/users': 'Users & Roles',
    '/dashboard/settings': 'Settings',
    '/dashboard/reports': 'Reports',
    '/dashboard/analytics': 'Analytics',
  };
  return titles[pathname] || 'Dashboard';
};

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
        group flex gap-3 p-3 hover:bg-gray-50 transition-colors cursor-pointer
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
 * Notification Panel Component
 */
const NotificationPanel = ({ isOpen, onClose, panelRef }) => {
  const navigate = useNavigate();
  
  const {
    notifications,
    loading,
    stats,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  if (!isOpen) return null;

  // Take only the latest 5 notifications for the panel
  const recentNotifications = notifications.slice(0, 5);

  const handleViewAll = () => {
    onClose();
    navigate('/dashboard/notifications');
  };

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
        "
        style={{
          animation: 'slideIn 0.2s ease-out'
        }}
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
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onDelete={deleteNotification}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={handleViewAll}
            className="
              flex items-center justify-center gap-2 w-full
              py-2 px-4 rounded-lg
              text-sm font-medium text-gray-700
              hover:bg-gray-100 transition-colors
            "
          >
            Lihat semua notifikasi
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Inline styles for animation */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
};

const TopHeader = ({ connected, onMenuClick }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  
  const notificationRef = useRef(null);
  const notificationButtonRef = useRef(null);
  
  const { stats } = useNotifications();
  const unreadCount = stats?.unread || 0;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const pageTitle = getPageTitle(location.pathname);

  // Close notification panel on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationOpen &&
        notificationRef.current &&
        !notificationRef.current.contains(event.target) &&
        notificationButtonRef.current &&
        !notificationButtonRef.current.contains(event.target)
      ) {
        setNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [notificationOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setNotificationOpen(false);
        setProfileOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Mobile menu button */}
        <button 
          onClick={onMenuClick}
          className="lg:hidden rounded-xl p-2 hover:bg-gray-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5 text-gray-600" />
        </button>

        {/* Page Title (mobile) */}
        <h1 className="lg:hidden text-lg font-semibold text-gray-900">
          {pageTitle}
        </h1>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Connection status */}
        <ConnectionIndicator connected={connected} />

        {/* Notifications */}
        <div className="relative">
          <button 
            ref={notificationButtonRef}
            onClick={() => {
              setNotificationOpen(!notificationOpen);
              setProfileOpen(false);
            }}
            className={`
              relative rounded-xl p-2 transition-colors
              ${notificationOpen 
                ? 'bg-lime-100 text-lime-700' 
                : 'hover:bg-gray-100 text-gray-600'
              }
            `}
            aria-label="Notifications"
            aria-expanded={notificationOpen}
            aria-haspopup="true"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Panel */}
          <NotificationPanel
            isOpen={notificationOpen}
            onClose={() => setNotificationOpen(false)}
            panelRef={notificationRef}
          />
        </div>

        {/* Profile Dropdown */}
        <div className="relative">
          <button 
            onClick={() => {
              setProfileOpen(!profileOpen);
              setNotificationOpen(false);
            }}
            className="rounded-xl bg-[#1A2E35] px-3 py-2 text-sm font-semibold text-white hover:bg-[#243a42] transition-colors flex items-center gap-2"
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">
              {user?.user_metadata?.full_name || user?.email || 'Admin Demo'}
            </span>
          </button>

          {/* Dropdown Menu */}
          {profileOpen && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setProfileOpen(false)}
              />
              
              {/* Menu */}
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg z-20">
                <div className="px-3 py-2 border-b border-gray-100 mb-2">
                  <div className="text-sm font-semibold text-gray-900">
                    {user?.user_metadata?.full_name || 'Admin Demo'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {user?.email || 'demo@gudangai.com'}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setProfileOpen(false);
                    navigate('/dashboard/settings');
                  }}
                  className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>

                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopHeader;
