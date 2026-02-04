/**
 * NotificationsPage - View and manage notifications with broadcast functionality
 * Based on new_theme/app.js design patterns
 * 
 * Uses Supabase Real-time for live updates.
 */

import React, { useState, useMemo } from 'react';
import { Bell, Send, CheckCircle, AlertTriangle, Info, Megaphone, Trash2, Check, X, RefreshCw, Loader2 } from 'lucide-react';
import {
  PageHeader,
  SearchInput,
  SelectFilter,
  PrimaryButton,
  Modal,
  FormInput,
  FormSelect,
  Card,
} from '../components/shared';
import { useNotifications, NOTIFICATION_TYPE } from '../hooks';

// Type options for filter (includes DB types + UI-only types)
const TYPE_OPTIONS = [
  { value: 'loading_started', label: 'Loading Started' },
  { value: 'loading_completed', label: 'Loading Completed' },
  { value: 'dock_assigned', label: 'Dock Assigned' },
  { value: 'system', label: 'System' },
  { value: 'alert', label: 'Alert' },
  { value: 'info', label: 'Info' },
];

const TYPE_ICONS = {
  loading_started: CheckCircle,
  loading_completed: CheckCircle,
  dock_assigned: Info,
  system: Megaphone,
  alert: AlertTriangle,
  info: Info,
};

const TYPE_COLORS = {
  loading_started: 'bg-emerald-100 text-emerald-600 border-emerald-200',
  loading_completed: 'bg-emerald-100 text-emerald-600 border-emerald-200',
  dock_assigned: 'bg-blue-100 text-blue-600 border-blue-200',
  system: 'bg-purple-100 text-purple-600 border-purple-200',
  alert: 'bg-red-100 text-red-600 border-red-200',
  info: 'bg-blue-100 text-blue-600 border-blue-200',
};

const NotificationsPage = () => {
  // Supabase hook
  const {
    notifications,
    unreadNotifications,
    loading,
    error,
    stats,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    broadcast,
    refetch,
  } = useNotifications();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    type: NOTIFICATION_TYPE.INFO,
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      const matchesSearch =
        notif.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notif.message?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = !typeFilter || notif.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [notifications, searchQuery, typeFilter]);

  // Handlers
  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000 / 60); // minutes
    
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  const handleMarkAsRead = async (id) => {
    try {
      await markAsRead(id);
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    setActionLoading(true);
    try {
      await markAllAsRead();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNotification(id);
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Clear all notifications?')) {
      setActionLoading(true);
      try {
        await clearAll();
      } catch (err) {
        console.error('Failed to clear all:', err);
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleBroadcast = () => {
    setBroadcastForm({
      title: '',
      message: '',
      type: NOTIFICATION_TYPE.INFO,
    });
    setBroadcastModalOpen(true);
  };

  const handleBroadcastFormChange = (e) => {
    const { name, value } = e.target;
    setBroadcastForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    
    try {
      // TODO: Get actual tenant ID from auth context
      await broadcast({
        title: broadcastForm.title,
        message: broadcastForm.message,
        type: broadcastForm.type,
        tenantId: null, // Will be set by RLS or hook
      });
      
      setBroadcastModalOpen(false);
    } catch (err) {
      console.error('Failed to send broadcast:', err);
      alert('Failed to send broadcast: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const getTypeIcon = (type) => {
    const Icon = TYPE_ICONS[type] || Info;
    return Icon;
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading notifications...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
        <p className="mt-2 text-sm text-red-700">{error}</p>
        <button 
          onClick={refetch}
          className="mt-4 rounded-xl bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Notifications"
        subtitle={`Manage notifications and broadcasts (${stats.unread} unread)`}
      >
        <div className="flex gap-2">
          <button
            onClick={refetch}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-700 hover:bg-gray-50"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <PrimaryButton onClick={handleBroadcast}>
            <span className="flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              New Broadcast
            </span>
          </PrimaryButton>
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <div className="text-sm text-gray-500">Total</div>
          <div className="mt-1 text-2xl font-semibold">{stats.total}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Unread</div>
          <div className="mt-1 text-2xl font-semibold text-blue-600">{stats.unread}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Alerts</div>
          <div className="mt-1 text-2xl font-semibold text-red-600">{stats.alerts}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Read</div>
          <div className="mt-1 text-2xl font-semibold text-gray-600">{stats.read}</div>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-4">
          <div className="flex-1">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search notifications..."
            />
          </div>
          <SelectFilter
            value={typeFilter}
            onChange={setTypeFilter}
            options={TYPE_OPTIONS}
            placeholder="All Types"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleMarkAllAsRead}
            disabled={stats.unread === 0 || actionLoading}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4" />
              Mark All Read
            </span>
          </button>
          <button
            onClick={handleClearAll}
            disabled={notifications.length === 0 || actionLoading}
            className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <span className="flex items-center gap-1">
              <Trash2 className="h-4 w-4" />
              Clear All
            </span>
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <div className="text-4xl">🔔</div>
            <div className="mt-3 text-base font-semibold text-gray-900">No notifications</div>
            <div className="mt-1 text-sm text-gray-500">You're all caught up!</div>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const TypeIcon = getTypeIcon(notif.type);
            const colorClass = TYPE_COLORS[notif.type] || TYPE_COLORS.info;
            
            return (
              <div
                key={notif.id}
                className={`relative rounded-2xl border bg-white p-4 shadow-sm transition-all ${
                  !notif.is_read ? 'border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="flex gap-4">
                  {/* Icon */}
                  <div className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl border ${colorClass}`}>
                    <TypeIcon className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className={`font-semibold ${!notif.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                          {notif.title}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600 line-clamp-2">{notif.message}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        {formatTime(notif.created_at)}
                      </div>
                    </div>

                    {/* Meta & Actions */}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colorClass}`}>
                          {notif.type?.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {!notif.is_read && (
                          <button
                            onClick={() => handleMarkAsRead(notif.id)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notif.id)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                          title="Delete"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Unread indicator */}
                {!notif.is_read && (
                  <div className="absolute right-4 top-4 h-2 w-2 rounded-full bg-blue-500" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Broadcast Modal */}
      <Modal
        open={broadcastModalOpen}
        onClose={() => setBroadcastModalOpen(false)}
        title="Send Broadcast"
        size="md"
      >
        <form onSubmit={handleSendBroadcast}>
          <FormInput
            label="Title"
            name="title"
            value={broadcastForm.title}
            onChange={handleBroadcastFormChange}
            placeholder="Notification title"
            required
          />
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              name="message"
              value={broadcastForm.message}
              onChange={handleBroadcastFormChange}
              placeholder="Enter your message..."
              required
              rows={4}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <FormSelect
            label="Type"
            name="type"
            value={broadcastForm.type}
            onChange={handleBroadcastFormChange}
            options={TYPE_OPTIONS}
            required
          />

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setBroadcastModalOpen(false)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <PrimaryButton type="submit" disabled={actionLoading}>
              <span className="flex items-center gap-2">
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send Broadcast
              </span>
            </PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default NotificationsPage;
