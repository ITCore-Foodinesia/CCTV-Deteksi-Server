/**
 * SessionsPage - Manage active and waiting loading/unloading sessions
 * Based on new_theme/app.js design patterns
 * 
 * Updated to use Supabase with real-time sync via useSessions hook
 * This is the CRITICAL page for monitoring Flutter → Database → CCTV integration
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Timer, Play, Pause, CheckCircle, Clock, Truck, Building2, User, AlertCircle, RefreshCw, XCircle, Activity } from 'lucide-react';
import {
  PageHeader,
  SearchInput,
  SelectFilter,
  PrimaryButton,
  StatusBadge,
  Card,
  Modal,
  FormSelect,
} from '../components/shared';
import { useSessions, SESSION_STATUS, useDocks } from '../hooks';

const STATUS_OPTIONS = [
  { value: 'loading', label: 'Loading' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'pending_dock', label: 'Pending Dock' },
  { value: 'completed', label: 'Completed' },
];

const SessionsPage = () => {
  // Use Supabase hooks for real data with realtime sync
  const {
    sessions,
    activeSessions,
    loading,
    error,
    stats,
    assignDock,
    completeSession,
    cancelSession,
    refetch,
  } = useSessions();

  // Get available docks for assignment
  const { docks: allDocks } = useDocks();

  // Local UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedDock, setSelectedDock] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Available docks (not currently in use)
  const availableDocks = useMemo(() => {
    const usedDockIds = activeSessions
      .filter((s) => s.dock_id)
      .map((s) => s.dock_id);
    
    return allDocks.filter((dock) => 
      !usedDockIds.includes(dock.id) && 
      (dock.is_active || dock.status === 'available')
    );
  }, [allDocks, activeSessions]);

  // Convert to dock options for FormSelect
  const dockOptions = useMemo(() => {
    return availableDocks.map((dock) => ({
      value: dock.id,
      label: `${dock.dock_code || dock.code || dock.id} - ${dock.dock_name || dock.name || 'Unnamed'}`,
    }));
  }, [availableDocks]);

  // Filter sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      // Extract searchable fields with fallbacks
      const plateNumber = session.plate_number || session.plate_detected || '';
      const driverName = session.drivers?.name || '';
      const dockCode = session.docks?.dock_code || '';
      
      const matchesSearch =
        plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dockCode.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = !statusFilter || session.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [sessions, searchQuery, statusFilter]);

  // Separate active and waiting sessions
  const activeFilteredSessions = filteredSessions.filter((s) => 
    s.status === SESSION_STATUS.LOADING
  );
  
  const waitingFilteredSessions = filteredSessions.filter((s) => 
    s.status === SESSION_STATUS.WAITING || s.status === SESSION_STATUS.PENDING_DOCK
  );

  // Format duration from start time
  const formatDuration = (startTime) => {
    if (!startTime) return '-';
    const start = new Date(startTime);
    const now = new Date();
    const diff = Math.floor((now - start) / 1000 / 60);
    if (diff < 0) return '-';
    if (diff < 60) return `${diff}m`;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return `${hours}h ${mins}m`;
  };

  // Format time ago
  const formatTimeAgo = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString('id-ID');
  };

  // Handlers
  const handleCompleteSession = async (session) => {
    if (window.confirm(`Complete session for ${session.drivers?.name || session.plate_number}?`)) {
      try {
        await completeSession(session.id);
      } catch (err) {
        console.error('Failed to complete session:', err);
        alert('Failed to complete session. Please try again.');
      }
    }
  };

  const handleAssignDock = (session) => {
    setSelectedSession(session);
    setSelectedDock('');
    setAssignModalOpen(true);
  };

  const handleConfirmAssign = async () => {
    if (!selectedSession || !selectedDock) return;
    
    setSubmitting(true);
    try {
      await assignDock(selectedSession.id, selectedDock);
      setAssignModalOpen(false);
    } catch (err) {
      console.error('Failed to assign dock:', err);
      alert('Failed to assign dock. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSession = async (session) => {
    if (window.confirm(`Remove ${session.drivers?.name || session.plate_number} from queue?`)) {
      try {
        await cancelSession(session.id, 'Cancelled by operator');
      } catch (err) {
        console.error('Failed to cancel session:', err);
        alert('Failed to cancel session. Please try again.');
      }
    }
  };

  // Get status badge variant
  const getStatusVariant = (status) => {
    switch (status) {
      case SESSION_STATUS.LOADING:
        return 'warning';
      case SESSION_STATUS.WAITING:
        return 'info';
      case SESSION_STATUS.PENDING_DOCK:
        return 'pending';
      case SESSION_STATUS.COMPLETED:
        return 'success';
      case SESSION_STATUS.CANCELLED:
        return 'error';
      default:
        return 'default';
    }
  };

  // Loading state
  if (loading && sessions.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-500">Loading sessions...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && sessions.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <p className="text-sm text-gray-700">Failed to load sessions</p>
          <p className="text-xs text-gray-500">{error.message}</p>
          <button
            onClick={refetch}
            className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Loading Sessions"
        subtitle={`Monitor active and waiting sessions (${stats.total} total)`}
      >
        <div className="flex items-center gap-2">
          {stats.counting > 0 && (
            <div className="flex items-center gap-1 rounded-lg bg-green-100 px-3 py-1 text-sm text-green-700">
              <Activity className="h-4 w-4 animate-pulse" />
              <span>{stats.counting} counting</span>
            </div>
          )}
          <button
            onClick={refetch}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            title="Refresh"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Card>
          <div className="text-sm text-gray-500">Total Sessions</div>
          <div className="mt-1 text-2xl font-semibold">{stats.total}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Active (Loading)</div>
          <div className="mt-1 text-2xl font-semibold text-orange-600">
            {stats.byStatus?.[SESSION_STATUS.LOADING] || 0}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Waiting</div>
          <div className="mt-1 text-2xl font-semibold text-blue-600">
            {(stats.byStatus?.[SESSION_STATUS.WAITING] || 0) + 
             (stats.byStatus?.[SESSION_STATUS.PENDING_DOCK] || 0)}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Completed</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-600">
            {stats.completed}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Total Items</div>
          <div className="mt-1 text-2xl font-semibold text-purple-600">
            {stats.totalItems}
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by truck, driver, or dock..."
          />
        </div>
        <SelectFilter
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_OPTIONS}
          placeholder="All Status"
        />
      </div>

      {/* Active Sessions */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Play className="h-5 w-5 text-orange-500" />
          Active Sessions ({activeFilteredSessions.length})
        </h2>
        
        {activeFilteredSessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <div className="text-3xl">⏸️</div>
            <div className="mt-2 text-base font-semibold text-gray-900">No active sessions</div>
            <div className="mt-1 text-sm text-gray-500">All docks are currently available</div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {activeFilteredSessions.map((session) => (
              <div
                key={session.id}
                className="rounded-2xl border-2 border-orange-200 bg-orange-50 p-4 shadow-sm"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-200">
                      <Building2 className="h-5 w-5 text-orange-700" />
                    </div>
                    <div>
                      <div className="font-semibold text-orange-900">
                        {session.docks?.dock_code || 'No Dock'}
                      </div>
                      <div className="text-sm text-orange-700">
                        {session.docks?.dock_name || '-'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {session.counting_active && (
                      <span className="flex items-center gap-1 rounded bg-green-200 px-2 py-0.5 text-xs font-medium text-green-800">
                        <Activity className="h-3 w-3 animate-pulse" />
                        Counting
                      </span>
                    )}
                    <StatusBadge status="loading" />
                  </div>
                </div>

                {/* Truck & Driver */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Truck className="h-4 w-4 text-orange-600" />
                    <span className="font-mono font-medium">
                      {session.plate_number || session.plate_detected || '-'}
                    </span>
                    {session.plate_detected && session.plate_number !== session.plate_detected && (
                      <span className="rounded bg-yellow-100 px-1 text-xs text-yellow-700">
                        Detected: {session.plate_detected}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-orange-600" />
                    <span>{session.drivers?.name || 'Unknown Driver'}</span>
                  </div>
                </div>

                {/* Counting Progress */}
                <div className="mt-4 rounded-lg bg-white/50 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-orange-700">Counting</span>
                    <div className="flex gap-4">
                      <span className="text-emerald-600">
                        📦 In: {session.loading_count || 0}
                      </span>
                      <span className="text-purple-600">
                        🔄 Rehab: {session.rehab_count || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Duration */}
                <div className="mt-3 flex items-center justify-between text-xs text-orange-700">
                  <span>⏱️ Duration: {formatDuration(session.started_at)}</span>
                  <span>Started: {formatTimeAgo(session.started_at)}</span>
                </div>

                {/* Action */}
                <button
                  onClick={() => handleCompleteSession(session)}
                  className="mt-4 w-full rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
                >
                  <span className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Complete Session
                  </span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Waiting Queue */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Clock className="h-5 w-5 text-blue-500" />
          Waiting Queue ({waitingFilteredSessions.length})
        </h2>
        
        {waitingFilteredSessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <div className="text-3xl">✅</div>
            <div className="mt-2 text-base font-semibold text-gray-900">No waiting trucks</div>
            <div className="mt-1 text-sm text-gray-500">Queue is empty</div>
          </div>
        ) : (
          <div className="space-y-3">
            {waitingFilteredSessions.map((session, index) => (
              <div
                key={session.id}
                className={`flex items-center justify-between rounded-2xl border p-4 ${
                  session.status === SESSION_STATUS.PENDING_DOCK
                    ? 'border-yellow-200 bg-yellow-50'
                    : 'border-blue-200 bg-blue-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Queue Position */}
                  <div className={`grid h-10 w-10 place-items-center rounded-full text-lg font-bold ${
                    session.status === SESSION_STATUS.PENDING_DOCK
                      ? 'bg-yellow-200 text-yellow-700'
                      : 'bg-blue-200 text-blue-700'
                  }`}>
                    #{index + 1}
                  </div>
                  
                  {/* Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold">
                        {session.plate_number || '-'}
                      </span>
                      <StatusBadge status={getStatusVariant(session.status)}>
                        {session.status === SESSION_STATUS.PENDING_DOCK ? 'Needs Dock' : 'Waiting'}
                      </StatusBadge>
                    </div>
                    <div className={`mt-1 text-sm ${
                      session.status === SESSION_STATUS.PENDING_DOCK
                        ? 'text-yellow-700'
                        : 'text-blue-700'
                    }`}>
                      {session.drivers?.name || 'Unknown Driver'}
                      {session.drivers?.phone && ` • ${session.drivers.phone}`}
                    </div>
                    <div className={`mt-1 text-xs ${
                      session.status === SESSION_STATUS.PENDING_DOCK
                        ? 'text-yellow-600'
                        : 'text-blue-600'
                    }`}>
                      {session.docks?.dock_code 
                        ? `🏢 Dock: ${session.docks.dock_code}`
                        : '⏳ No dock assigned'}
                      {' • '}
                      Queued: {formatTimeAgo(session.created_at)}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {session.status === SESSION_STATUS.PENDING_DOCK && (
                    <button
                      onClick={() => handleAssignDock(session)}
                      className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
                    >
                      Assign Dock
                    </button>
                  )}
                  <button
                    onClick={() => handleCancelSession(session)}
                    className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assign Dock Modal */}
      <Modal
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Dock"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Assign a dock to{' '}
            <strong>{selectedSession?.drivers?.name || selectedSession?.plate_number}</strong>{' '}
            ({selectedSession?.plate_number})
          </p>
          
          {dockOptions.length === 0 ? (
            <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700">
              ⚠️ No available docks. All docks are currently in use or inactive.
            </div>
          ) : (
            <FormSelect
              label="Select Available Dock"
              name="dock"
              value={selectedDock}
              onChange={(e) => setSelectedDock(e.target.value)}
              options={[{ value: '', label: 'Select a dock...' }, ...dockOptions]}
              required
            />
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setAssignModalOpen(false)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={submitting}
            >
              Cancel
            </button>
            <PrimaryButton 
              onClick={handleConfirmAssign} 
              disabled={!selectedDock || submitting}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Assigning...
                </span>
              ) : (
                'Assign'
              )}
            </PrimaryButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SessionsPage;
