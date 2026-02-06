/**
 * HistoryPage - View completed loading/unloading sessions history
 * Based on new_theme/app.js design patterns
 */

import React, { useState, useMemo } from 'react';
import { History, Calendar, Download, Eye, Truck, Building2, Clock, Package } from 'lucide-react';
import {
  PageHeader,
  SearchInput,
  SelectFilter,
  SecondaryButton,
  DataTable,
  Pagination,
  Modal,
  Card,
} from '../components/shared';

// Mock data based on new_theme
const MOCK_HISTORY = [
  {
    id: 'h-001',
    dock_code: 'D-01',
    dock_name: 'Dock Utama 1',
    truck_plate: 'B 1234 XY',
    driver_name: 'Budi Santoso',
    type: 'loading',
    started_at: '2024-03-14T08:30:00',
    completed_at: '2024-03-14T10:45:00',
    duration_minutes: 135,
    items_count: 52,
    helper_name: 'Rizki Pratama',
    loader_name: 'Hendra Gunawan',
    notes: 'Completed without issues',
  },
  {
    id: 'h-002',
    dock_code: 'D-02',
    dock_name: 'Dock Utama 2',
    truck_plate: 'B 5678 AB',
    driver_name: 'Ahmad Wijaya',
    type: 'unloading',
    started_at: '2024-03-14T09:00:00',
    completed_at: '2024-03-14T11:30:00',
    duration_minutes: 150,
    items_count: 38,
    helper_name: 'Yoga Nugroho',
    loader_name: 'Irwan Setiawan',
    notes: '',
  },
  {
    id: 'h-003',
    dock_code: 'D-03',
    dock_name: 'Dock Samping',
    truck_plate: 'B 9999 CD',
    driver_name: 'Dedi Kurniawan',
    type: 'loading',
    started_at: '2024-03-14T13:00:00',
    completed_at: '2024-03-14T14:20:00',
    duration_minutes: 80,
    items_count: 25,
    helper_name: 'Dimas Saputra',
    loader_name: 'Joko Widodo',
    notes: '',
  },
  {
    id: 'h-004',
    dock_code: 'D-01',
    dock_name: 'Dock Utama 1',
    truck_plate: 'B 7777 EF',
    driver_name: 'Eko Prasetyo',
    type: 'loading',
    started_at: '2024-03-13T08:00:00',
    completed_at: '2024-03-13T10:00:00',
    duration_minutes: 120,
    items_count: 48,
    helper_name: 'Rizki Pratama',
    loader_name: 'Hendra Gunawan',
    notes: 'Minor delay due to rain',
  },
  {
    id: 'h-005',
    dock_code: 'D-05',
    dock_name: 'Dock Belakang 2',
    truck_plate: 'B 2222 GH',
    driver_name: 'Fajar Hidayat',
    type: 'unloading',
    started_at: '2024-03-13T14:30:00',
    completed_at: '2024-03-13T16:00:00',
    duration_minutes: 90,
    items_count: 30,
    helper_name: 'Bayu Wicaksono',
    loader_name: 'Lukman Hakim',
    notes: '',
  },
  {
    id: 'h-006',
    dock_code: 'D-02',
    dock_name: 'Dock Utama 2',
    truck_plate: 'B 4444 IJ',
    driver_name: 'Gunawan Setiawan',
    type: 'loading',
    started_at: '2024-03-12T09:15:00',
    completed_at: '2024-03-12T11:45:00',
    duration_minutes: 150,
    items_count: 55,
    helper_name: 'Yoga Nugroho',
    loader_name: 'Irwan Setiawan',
    notes: 'Large shipment',
  },
];

const TYPE_OPTIONS = [
  { value: 'loading', label: 'Loading' },
  { value: 'unloading', label: 'Unloading' },
];

const DATE_RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

const ITEMS_PER_PAGE = 10;

const HistoryPage = () => {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  // Filter sessions
  const filteredHistory = useMemo(() => {
    return MOCK_HISTORY.filter((session) => {
      const matchesSearch =
        session.truck_plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.driver_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.dock_code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = !typeFilter || session.type === typeFilter;
      // For demo, ignore date filter logic
      return matchesSearch && matchesType;
    });
  }, [searchQuery, typeFilter, dateFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE);
  const paginatedHistory = filteredHistory.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  // Stats
  const stats = useMemo(() => {
    const totalDuration = MOCK_HISTORY.reduce((sum, s) => sum + s.duration_minutes, 0);
    const totalItems = MOCK_HISTORY.reduce((sum, s) => sum + s.items_count, 0);
    return {
      total: MOCK_HISTORY.length,
      loading: MOCK_HISTORY.filter((s) => s.type === 'loading').length,
      unloading: MOCK_HISTORY.filter((s) => s.type === 'unloading').length,
      avgDuration: MOCK_HISTORY.length > 0 ? Math.round(totalDuration / MOCK_HISTORY.length) : 0,
      totalItems,
    };
  }, []);

  // Handlers
  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleViewDetails = (session) => {
    setSelectedSession(session);
    setDetailModalOpen(true);
  };

  const handleExport = () => {
    alert('Export functionality would generate CSV/PDF report');
  };

  // Table columns
  const columns = [
    {
      key: 'completed_at',
      label: 'Date',
      render: (value) => (
        <div>
          <div className="text-sm font-medium">{formatDate(value)}</div>
          <div className="text-xs text-gray-500">{formatTime(value)}</div>
        </div>
      ),
    },
    {
      key: 'dock_code',
      label: 'Dock',
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-gray-400" />
          <span className="font-medium">{value}</span>
        </div>
      ),
    },
    {
      key: 'truck_plate',
      label: 'Truck',
      render: (value, row) => (
        <div>
          <div className="font-mono text-sm font-medium">{value}</div>
          <div className="text-xs text-gray-500">{row.driver_name}</div>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (value) => (
        <span className={`rounded-full px-2 py-1 text-xs font-medium uppercase ${
          value === 'loading' 
            ? 'bg-emerald-100 text-emerald-700' 
            : 'bg-purple-100 text-purple-700'
        }`}>
          {value}
        </span>
      ),
    },
    {
      key: 'duration_minutes',
      label: 'Duration',
      render: (value) => (
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4 text-gray-400" />
          <span>{formatDuration(value)}</span>
        </div>
      ),
    },
    {
      key: 'items_count',
      label: 'Items',
      render: (value) => (
        <div className="flex items-center gap-1">
          <Package className="h-4 w-4 text-gray-400" />
          <span>{value}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (_, row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleViewDetails(row);
          }}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          title="View Details"
        >
          <Eye className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Session History"
        subtitle={`View completed loading/unloading sessions (${stats.total} records)`}
      >
        <SecondaryButton onClick={handleExport}>
          <span className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </span>
        </SecondaryButton>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Card>
          <div className="text-sm text-gray-500">Total Sessions</div>
          <div className="mt-1 text-2xl font-semibold">{stats.total}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Loading</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-600">{stats.loading}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Unloading</div>
          <div className="mt-1 text-2xl font-semibold text-purple-600">{stats.unloading}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Avg. Duration</div>
          <div className="mt-1 text-2xl font-semibold text-blue-600">{formatDuration(stats.avgDuration)}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Total Items</div>
          <div className="mt-1 text-2xl font-semibold text-orange-600">{stats.totalItems}</div>
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
          value={typeFilter}
          onChange={setTypeFilter}
          options={TYPE_OPTIONS}
          placeholder="All Types"
        />
        <SelectFilter
          value={dateFilter}
          onChange={setDateFilter}
          options={DATE_RANGE_OPTIONS}
          placeholder="All Time"
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={paginatedHistory}
        emptyMessage="No history records found"
      />

      {/* Pagination */}
      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {/* Detail Modal */}
      <Modal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Session Details"
        size="md"
      >
        {selectedSession && (
          <div className="space-y-4">
            {/* Header Info */}
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">{selectedSession.dock_code}</div>
                  <div className="text-sm text-gray-500">{selectedSession.dock_name}</div>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-medium uppercase ${
                  selectedSession.type === 'loading' 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  {selectedSession.type}
                </span>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Truck</div>
                <div className="font-mono font-medium">{selectedSession.truck_plate}</div>
              </div>
              <div>
                <div className="text-gray-500">Driver</div>
                <div className="font-medium">{selectedSession.driver_name}</div>
              </div>
              <div>
                <div className="text-gray-500">Started</div>
                <div className="font-medium">
                  {formatDate(selectedSession.started_at)} {formatTime(selectedSession.started_at)}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Completed</div>
                <div className="font-medium">
                  {formatDate(selectedSession.completed_at)} {formatTime(selectedSession.completed_at)}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Duration</div>
                <div className="font-medium">{formatDuration(selectedSession.duration_minutes)}</div>
              </div>
              <div>
                <div className="text-gray-500">Items Processed</div>
                <div className="font-medium">{selectedSession.items_count} items</div>
              </div>
              <div>
                <div className="text-gray-500">Helper</div>
                <div className="font-medium">{selectedSession.helper_name}</div>
              </div>
              <div>
                <div className="text-gray-500">Loader</div>
                <div className="font-medium">{selectedSession.loader_name}</div>
              </div>
            </div>

            {/* Notes */}
            {selectedSession.notes && (
              <div className="rounded-xl bg-amber-50 p-3">
                <div className="text-xs font-medium text-amber-700">Notes</div>
                <div className="mt-1 text-sm">{selectedSession.notes}</div>
              </div>
            )}

            {/* Close button */}
            <div className="flex justify-end">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default HistoryPage;
