/**
 * SessionsPage - Manage active and waiting loading/unloading sessions
 * Based on new_theme/app.js design patterns
 */

import React, { useState, useMemo } from 'react';
import { Timer, Play, Pause, CheckCircle, Clock, Truck, Building2, User, AlertCircle } from 'lucide-react';
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

// Mock data based on new_theme
const MOCK_SESSIONS = [
  {
    id: 's-001',
    dock_code: 'D-02',
    dock_name: 'Dock Utama 2',
    truck_plate: 'B 1234 XY',
    driver_name: 'Budi Santoso',
    driver_phone: '+62 812-3456-7890',
    type: 'loading',
    status: 'loading',
    started_at: '2024-03-15T08:30:00',
    helper_name: 'Rizki Pratama',
    loader_name: 'Hendra Gunawan',
    items_count: 45,
    progress: 65,
  },
  {
    id: 's-002',
    dock_code: 'D-05',
    dock_name: 'Dock Belakang 2',
    truck_plate: 'B 5678 AB',
    driver_name: 'Ahmad Wijaya',
    driver_phone: '+62 813-9876-5432',
    type: 'unloading',
    status: 'unloading',
    started_at: '2024-03-15T09:15:00',
    helper_name: 'Yoga Nugroho',
    loader_name: 'Irwan Setiawan',
    items_count: 32,
    progress: 40,
  },
  {
    id: 's-003',
    dock_code: null,
    dock_name: null,
    truck_plate: 'B 9999 CD',
    driver_name: 'Dedi Kurniawan',
    driver_phone: '+62 815-1111-2222',
    type: 'loading',
    status: 'waiting',
    queued_at: '2024-03-15T09:45:00',
    queue_position: 1,
    estimated_wait: '~15 min',
  },
  {
    id: 's-004',
    dock_code: null,
    dock_name: null,
    truck_plate: 'B 7777 EF',
    driver_name: 'Eko Prasetyo',
    driver_phone: '+62 816-3333-4444',
    type: 'loading',
    status: 'waiting',
    queued_at: '2024-03-15T10:00:00',
    queue_position: 2,
    estimated_wait: '~30 min',
  },
  {
    id: 's-005',
    dock_code: null,
    dock_name: null,
    truck_plate: 'B 2222 GH',
    driver_name: 'Fajar Hidayat',
    driver_phone: '+62 817-5555-6666',
    type: 'unloading',
    status: 'waiting',
    queued_at: '2024-03-15T10:15:00',
    queue_position: 3,
    estimated_wait: '~45 min',
  },
];

const STATUS_OPTIONS = [
  { value: 'loading', label: 'Loading' },
  { value: 'unloading', label: 'Unloading' },
  { value: 'waiting', label: 'Waiting' },
];

const TYPE_OPTIONS = [
  { value: 'loading', label: 'Loading' },
  { value: 'unloading', label: 'Unloading' },
];

const DOCK_OPTIONS = [
  { value: 'D-01', label: 'D-01 - Dock Utama 1' },
  { value: 'D-03', label: 'D-03 - Dock Samping' },
];

const SessionsPage = () => {
  // State
  const [sessions, setSessions] = useState(MOCK_SESSIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedDock, setSelectedDock] = useState('');

  // Filter sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      const matchesSearch =
        session.truck_plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.driver_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (session.dock_code && session.dock_code.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = !statusFilter || session.status === statusFilter;
      const matchesType = !typeFilter || session.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [sessions, searchQuery, statusFilter, typeFilter]);

  // Separate active and waiting sessions
  const activeSessions = filteredSessions.filter((s) => s.status === 'loading' || s.status === 'unloading');
  const waitingSessions = filteredSessions.filter((s) => s.status === 'waiting');

  // Stats
  const stats = useMemo(() => ({
    total: sessions.length,
    active: sessions.filter((s) => s.status === 'loading' || s.status === 'unloading').length,
    waiting: sessions.filter((s) => s.status === 'waiting').length,
    loading: sessions.filter((s) => s.type === 'loading').length,
    unloading: sessions.filter((s) => s.type === 'unloading').length,
  }), [sessions]);

  // Handlers
  const formatDuration = (startTime) => {
    if (!startTime) return '';
    const start = new Date(startTime);
    const now = new Date();
    const diff = Math.floor((now - start) / 1000 / 60);
    if (diff < 60) return `${diff}m`;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return `${hours}h ${mins}m`;
  };

  const handleCompleteSession = (session) => {
    if (window.confirm(`Complete session for ${session.driver_name}?`)) {
      setSessions(sessions.filter((s) => s.id !== session.id));
    }
  };

  const handleAssignDock = (session) => {
    setSelectedSession(session);
    setSelectedDock('');
    setAssignModalOpen(true);
  };

  const handleConfirmAssign = () => {
    if (selectedSession && selectedDock) {
      setSessions(sessions.map((s) =>
        s.id === selectedSession.id
          ? {
              ...s,
              status: s.type,
              dock_code: selectedDock,
              dock_name: DOCK_OPTIONS.find((d) => d.value === selectedDock)?.label.split(' - ')[1] || selectedDock,
              started_at: new Date().toISOString(),
              progress: 0,
            }
          : s
      ));
    }
    setAssignModalOpen(false);
  };

  const handleCancelWaiting = (session) => {
    if (window.confirm(`Remove ${session.driver_name} from queue?`)) {
      setSessions(sessions.filter((s) => s.id !== session.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Loading Sessions"
        subtitle={`Monitor active and waiting sessions (${stats.total} total)`}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Card>
          <div className="text-sm text-gray-500">Total Sessions</div>
          <div className="mt-1 text-2xl font-semibold">{stats.total}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Active</div>
          <div className="mt-1 text-2xl font-semibold text-orange-600">{stats.active}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Waiting</div>
          <div className="mt-1 text-2xl font-semibold text-blue-600">{stats.waiting}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Loading</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-600">{stats.loading}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Unloading</div>
          <div className="mt-1 text-2xl font-semibold text-purple-600">{stats.unloading}</div>
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
        <SelectFilter
          value={typeFilter}
          onChange={setTypeFilter}
          options={TYPE_OPTIONS}
          placeholder="All Types"
        />
      </div>

      {/* Active Sessions */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Play className="h-5 w-5 text-orange-500" />
          Active Sessions ({activeSessions.length})
        </h2>
        
        {activeSessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <div className="text-3xl">⏸️</div>
            <div className="mt-2 text-base font-semibold text-gray-900">No active sessions</div>
            <div className="mt-1 text-sm text-gray-500">All docks are currently available</div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {activeSessions.map((session) => (
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
                      <div className="font-semibold text-orange-900">{session.dock_code}</div>
                      <div className="text-sm text-orange-700">{session.dock_name}</div>
                    </div>
                  </div>
                  <StatusBadge status={session.status} />
                </div>

                {/* Truck & Driver */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Truck className="h-4 w-4 text-orange-600" />
                    <span className="font-mono font-medium">{session.truck_plate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-orange-600" />
                    <span>{session.driver_name}</span>
                  </div>
                </div>

                {/* Progress */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-orange-700">Progress</span>
                    <span className="font-semibold">{session.progress}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-orange-200">
                    <div
                      className="h-full bg-orange-500 transition-all"
                      style={{ width: `${session.progress}%` }}
                    />
                  </div>
                </div>

                {/* Duration & Items */}
                <div className="mt-3 flex items-center justify-between text-xs text-orange-700">
                  <span>⏱️ {formatDuration(session.started_at)}</span>
                  <span>📦 {session.items_count} items</span>
                </div>

                {/* Staff */}
                <div className="mt-3 rounded-lg bg-white/50 p-2 text-xs">
                  <div>👷 Helper: {session.helper_name}</div>
                  <div>🏗️ Loader: {session.loader_name}</div>
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
          Waiting Queue ({waitingSessions.length})
        </h2>
        
        {waitingSessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <div className="text-3xl">✅</div>
            <div className="mt-2 text-base font-semibold text-gray-900">No waiting trucks</div>
            <div className="mt-1 text-sm text-gray-500">Queue is empty</div>
          </div>
        ) : (
          <div className="space-y-3">
            {waitingSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-2xl border border-blue-200 bg-blue-50 p-4"
              >
                <div className="flex items-center gap-4">
                  {/* Queue Position */}
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-blue-200 text-lg font-bold text-blue-700">
                    #{session.queue_position}
                  </div>
                  
                  {/* Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold">{session.truck_plate}</span>
                      <span className="rounded bg-blue-200 px-2 py-0.5 text-xs font-medium uppercase text-blue-800">
                        {session.type}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-blue-700">
                      {session.driver_name} • {session.driver_phone}
                    </div>
                    <div className="mt-1 text-xs text-blue-600">
                      ⏳ Est. wait: {session.estimated_wait}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAssignDock(session)}
                    className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
                  >
                    Assign Dock
                  </button>
                  <button
                    onClick={() => handleCancelWaiting(session)}
                    className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Cancel
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
            Assign a dock to <strong>{selectedSession?.driver_name}</strong> ({selectedSession?.truck_plate})
          </p>
          
          <FormSelect
            label="Select Available Dock"
            name="dock"
            value={selectedDock}
            onChange={(e) => setSelectedDock(e.target.value)}
            options={[{ value: '', label: 'Select a dock...' }, ...DOCK_OPTIONS]}
            required
          />

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setAssignModalOpen(false)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <PrimaryButton onClick={handleConfirmAssign} disabled={!selectedDock}>
              Assign
            </PrimaryButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SessionsPage;
