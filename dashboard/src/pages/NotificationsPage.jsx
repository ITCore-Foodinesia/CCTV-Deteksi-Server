/**
 * NotificationsPage - View and manage notifications with broadcast functionality
 * Based on new_theme/app.js design patterns
 */

import React, { useState, useMemo } from 'react';
import { Bell, Send, CheckCircle, AlertTriangle, Info, Megaphone, Trash2, Check, X } from 'lucide-react';
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

// Mock data
const MOCK_NOTIFICATIONS = [
  {
    id: 'n-001',
    type: 'alert',
    title: 'Dock D-04 Under Maintenance',
    message: 'Dock D-04 is currently under maintenance for floor repairs. Estimated completion: 2 days.',
    target: 'all',
    created_at: '2024-03-15T09:00:00',
    read: false,
  },
  {
    id: 'n-002',
    type: 'info',
    title: 'New Driver Registered',
    message: 'Driver "Dedi Kurniawan" has registered and is pending approval.',
    target: 'operators',
    created_at: '2024-03-15T08:30:00',
    read: true,
  },
  {
    id: 'n-003',
    type: 'success',
    title: 'Session Completed',
    message: 'Loading session at D-01 completed successfully. 52 items processed.',
    target: 'operators',
    created_at: '2024-03-14T10:45:00',
    read: true,
  },
  {
    id: 'n-004',
    type: 'warning',
    title: 'Long Wait Time Alert',
    message: 'Driver "Eko Prasetyo" has been waiting for more than 30 minutes.',
    target: 'operators',
    created_at: '2024-03-15T10:30:00',
    read: false,
  },
  {
    id: 'n-005',
    type: 'broadcast',
    title: 'System Maintenance Notice',
    message: 'The system will undergo scheduled maintenance on Sunday 03:00-05:00 AM.',
    target: 'all',
    created_at: '2024-03-14T16:00:00',
    read: true,
  },
  {
    id: 'n-006',
    type: 'info',
    title: 'Queue Update',
    message: '3 trucks are currently waiting in queue. Average wait time: 25 minutes.',
    target: 'operators',
    created_at: '2024-03-15T10:15:00',
    read: false,
  },
];

const TYPE_OPTIONS = [
  { value: 'alert', label: 'Alert' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Info' },
  { value: 'success', label: 'Success' },
  { value: 'broadcast', label: 'Broadcast' },
];

const TARGET_OPTIONS = [
  { value: 'all', label: 'All Users' },
  { value: 'operators', label: 'Operators Only' },
  { value: 'drivers', label: 'Drivers Only' },
  { value: 'admins', label: 'Admins Only' },
];

const TYPE_ICONS = {
  alert: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle,
  broadcast: Megaphone,
};

const TYPE_COLORS = {
  alert: 'bg-red-100 text-red-600 border-red-200',
  warning: 'bg-amber-100 text-amber-600 border-amber-200',
  info: 'bg-blue-100 text-blue-600 border-blue-200',
  success: 'bg-emerald-100 text-emerald-600 border-emerald-200',
  broadcast: 'bg-purple-100 text-purple-600 border-purple-200',
};

const NotificationsPage = () => {
  // State
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    type: 'info',
    target: 'all',
  });

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      const matchesSearch =
        notif.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notif.message.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = !typeFilter || notif.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [notifications, searchQuery, typeFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: notifications.length,
    unread: notifications.filter((n) => !n.read).length,
    alerts: notifications.filter((n) => n.type === 'alert' || n.type === 'warning').length,
    broadcasts: notifications.filter((n) => n.type === 'broadcast').length,
  }), [notifications]);

  // Handlers
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000 / 60); // minutes
    
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  const handleMarkAsRead = (id) => {
    setNotifications(notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const handleDelete = (id) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const handleClearAll = () => {
    if (window.confirm('Clear all notifications?')) {
      setNotifications([]);
    }
  };

  const handleBroadcast = () => {
    setBroadcastForm({
      title: '',
      message: '',
      type: 'info',
      target: 'all',
    });
    setBroadcastModalOpen(true);
  };

  const handleBroadcastFormChange = (e) => {
    const { name, value } = e.target;
    setBroadcastForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSendBroadcast = (e) => {
    e.preventDefault();
    
    const newNotification = {
      id: `n-${Date.now()}`,
      type: broadcastForm.type,
      title: broadcastForm.title,
      message: broadcastForm.message,
      target: broadcastForm.target,
      created_at: new Date().toISOString(),
      read: false,
    };
    
    setNotifications([newNotification, ...notifications]);
    setBroadcastModalOpen(false);
  };

  const getTypeIcon = (type) => {
    const Icon = TYPE_ICONS[type] || Info;
    return Icon;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Notifications"
        subtitle={`Manage notifications and broadcasts (${stats.unread} unread)`}
      >
        <PrimaryButton onClick={handleBroadcast}>
          <span className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            New Broadcast
          </span>
        </PrimaryButton>
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
          <div className="text-sm text-gray-500">Broadcasts</div>
          <div className="mt-1 text-2xl font-semibold text-purple-600">{stats.broadcasts}</div>
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
            disabled={stats.unread === 0}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4" />
              Mark All Read
            </span>
          </button>
          <button
            onClick={handleClearAll}
            disabled={notifications.length === 0}
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
                  !notif.read ? 'border-l-4 border-l-blue-500' : ''
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
                        <h3 className={`font-semibold ${!notif.read ? 'text-gray-900' : 'text-gray-700'}`}>
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
                          {notif.type}
                        </span>
                        <span className="text-xs text-gray-400">
                          → {notif.target === 'all' ? 'All Users' : notif.target}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {!notif.read && (
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
                {!notif.read && (
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
          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              label="Type"
              name="type"
              value={broadcastForm.type}
              onChange={handleBroadcastFormChange}
              options={TYPE_OPTIONS}
              required
            />
            <FormSelect
              label="Target Audience"
              name="target"
              value={broadcastForm.target}
              onChange={handleBroadcastFormChange}
              options={TARGET_OPTIONS}
              required
            />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setBroadcastModalOpen(false)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <PrimaryButton type="submit">
              <span className="flex items-center gap-2">
                <Send className="h-4 w-4" />
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
