/**
 * DocksPage - Manage docks with status cards and maintenance toggle
 * Based on new_theme/app.js design patterns
 */

import React, { useState, useMemo } from 'react';
import { Building2, Plus, Wrench, CheckCircle, Clock, AlertTriangle, Edit2, Truck } from 'lucide-react';
import {
  PageHeader,
  SearchInput,
  SelectFilter,
  PrimaryButton,
  Modal,
  FormInput,
  FormSelect,
  Card,
  DOCK_STATUS_CLASSES,
} from '../components/shared';

// Mock data based on new_theme
const MOCK_DOCKS = [
  {
    id: 'dock-001',
    code: 'D-01',
    name: 'Dock Utama 1',
    type: 'loading',
    status: 'available',
    capacity: 'Large (>10t)',
    current_truck: null,
    current_driver: null,
    notes: '',
  },
  {
    id: 'dock-002',
    code: 'D-02',
    name: 'Dock Utama 2',
    type: 'loading',
    status: 'loading',
    capacity: 'Large (>10t)',
    current_truck: 'B 1234 XY',
    current_driver: 'Budi Santoso',
    session_start: '2024-03-15T08:30:00',
    notes: '',
  },
  {
    id: 'dock-003',
    code: 'D-03',
    name: 'Dock Samping',
    type: 'unloading',
    status: 'available',
    capacity: 'Medium (5-10t)',
    current_truck: null,
    current_driver: null,
    notes: '',
  },
  {
    id: 'dock-004',
    code: 'D-04',
    name: 'Dock Belakang 1',
    type: 'loading',
    status: 'maintenance',
    capacity: 'Small (<5t)',
    current_truck: null,
    current_driver: null,
    notes: 'Perbaikan lantai - estimasi selesai 2 hari',
  },
  {
    id: 'dock-005',
    code: 'D-05',
    name: 'Dock Belakang 2',
    type: 'unloading',
    status: 'unloading',
    capacity: 'Medium (5-10t)',
    current_truck: 'B 5678 AB',
    current_driver: 'Ahmad Wijaya',
    session_start: '2024-03-15T09:15:00',
    notes: '',
  },
  {
    id: 'dock-006',
    code: 'D-06',
    name: 'Dock Cadangan',
    type: 'loading',
    status: 'closed',
    capacity: 'Large (>10t)',
    current_truck: null,
    current_driver: null,
    notes: 'Tidak digunakan untuk sementara',
  },
];

const STATUS_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'loading', label: 'Loading' },
  { value: 'unloading', label: 'Unloading' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'closed', label: 'Closed' },
];

const TYPE_OPTIONS = [
  { value: 'loading', label: 'Loading' },
  { value: 'unloading', label: 'Unloading' },
  { value: 'both', label: 'Both' },
];

const CAPACITY_OPTIONS = [
  { value: 'Small (<5t)', label: 'Small (<5t)' },
  { value: 'Medium (5-10t)', label: 'Medium (5-10t)' },
  { value: 'Large (>10t)', label: 'Large (>10t)' },
];

const STATUS_ICONS = {
  available: CheckCircle,
  loading: Clock,
  unloading: Clock,
  maintenance: Wrench,
  reserved: Clock,
  closed: AlertTriangle,
};

const DocksPage = () => {
  // State
  const [docks, setDocks] = useState(MOCK_DOCKS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [selectedDock, setSelectedDock] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'loading',
    capacity: 'Medium (5-10t)',
    status: 'available',
    notes: '',
  });
  const [maintenanceNote, setMaintenanceNote] = useState('');

  // Filter and search
  const filteredDocks = useMemo(() => {
    return docks.filter((dock) => {
      const matchesSearch =
        dock.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dock.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = !statusFilter || dock.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [docks, searchQuery, statusFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: docks.length,
    available: docks.filter((d) => d.status === 'available').length,
    inUse: docks.filter((d) => ['loading', 'unloading'].includes(d.status)).length,
    maintenance: docks.filter((d) => d.status === 'maintenance').length,
    closed: docks.filter((d) => d.status === 'closed').length,
  }), [docks]);

  // Handlers
  const handleAdd = () => {
    setSelectedDock(null);
    setFormData({
      code: '',
      name: '',
      type: 'loading',
      capacity: 'Medium (5-10t)',
      status: 'available',
      notes: '',
    });
    setModalOpen(true);
  };

  const handleEdit = (dock) => {
    setSelectedDock(dock);
    setFormData({
      code: dock.code,
      name: dock.name,
      type: dock.type,
      capacity: dock.capacity,
      status: dock.status,
      notes: dock.notes,
    });
    setModalOpen(true);
  };

  const handleToggleMaintenance = (dock) => {
    if (dock.status === 'maintenance') {
      // Remove from maintenance
      setDocks(docks.map((d) =>
        d.id === dock.id ? { ...d, status: 'available', notes: '' } : d
      ));
    } else {
      // Open maintenance modal
      setSelectedDock(dock);
      setMaintenanceNote('');
      setMaintenanceModalOpen(true);
    }
  };

  const handleConfirmMaintenance = () => {
    if (selectedDock) {
      setDocks(docks.map((d) =>
        d.id === selectedDock.id ? { ...d, status: 'maintenance', notes: maintenanceNote } : d
      ));
    }
    setMaintenanceModalOpen(false);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (selectedDock) {
      // Update existing
      setDocks(docks.map((d) =>
        d.id === selectedDock.id ? { ...d, ...formData } : d
      ));
    } else {
      // Add new
      const newDock = {
        id: `dock-${Date.now()}`,
        ...formData,
        current_truck: null,
        current_driver: null,
      };
      setDocks([...docks, newDock]);
    }
    
    setModalOpen(false);
  };

  const getStatusIcon = (status) => {
    const Icon = STATUS_ICONS[status] || Building2;
    return Icon;
  };

  const formatDuration = (startTime) => {
    if (!startTime) return '';
    const start = new Date(startTime);
    const now = new Date();
    const diff = Math.floor((now - start) / 1000 / 60); // minutes
    if (diff < 60) return `${diff}m`;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Docks"
        subtitle={`Manage loading/unloading docks (${stats.total} total)`}
      >
        <PrimaryButton onClick={handleAdd}>
          <span className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Dock
          </span>
        </PrimaryButton>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Card>
          <div className="text-sm text-gray-500">Total Docks</div>
          <div className="mt-1 text-2xl font-semibold">{stats.total}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Available</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-600">{stats.available}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">In Use</div>
          <div className="mt-1 text-2xl font-semibold text-orange-600">{stats.inUse}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Maintenance</div>
          <div className="mt-1 text-2xl font-semibold text-red-600">{stats.maintenance}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Closed</div>
          <div className="mt-1 text-2xl font-semibold text-gray-600">{stats.closed}</div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by dock code or name..."
          />
        </div>
        <SelectFilter
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_OPTIONS}
          placeholder="All Status"
        />
      </div>

      {/* Dock Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredDocks.map((dock) => {
          const StatusIcon = getStatusIcon(dock.status);
          const statusClass = DOCK_STATUS_CLASSES[dock.status] || DOCK_STATUS_CLASSES.closed;
          
          return (
            <div
              key={dock.id}
              className={`rounded-2xl border-2 p-4 shadow-sm transition-shadow hover:shadow-md ${statusClass}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/70">
                    <StatusIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold">{dock.code}</div>
                    <div className="text-sm opacity-80">{dock.name}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleEdit(dock)}
                  className="rounded-lg bg-white/70 p-2 hover:bg-white"
                  title="Edit"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>

              {/* Status & Type */}
              <div className="mt-3 flex items-center gap-2">
                <span className="rounded-full bg-white/50 px-2 py-0.5 text-xs font-medium uppercase tracking-wider">
                  {dock.status}
                </span>
                <span className="text-xs opacity-70">• {dock.type}</span>
                <span className="text-xs opacity-70">• {dock.capacity}</span>
              </div>

              {/* Current Activity */}
              {dock.current_truck && (
                <div className="mt-3 rounded-xl bg-white/50 p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Truck className="h-4 w-4" />
                    <span className="font-mono font-medium">{dock.current_truck}</span>
                  </div>
                  <div className="mt-1 text-xs opacity-70">
                    Driver: {dock.current_driver}
                  </div>
                  {dock.session_start && (
                    <div className="mt-1 text-xs opacity-70">
                      Duration: {formatDuration(dock.session_start)}
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {dock.notes && (
                <div className="mt-3 text-sm opacity-80">
                  📝 {dock.notes}
                </div>
              )}

              {/* Actions */}
              <div className="mt-4 flex gap-2">
                {dock.status !== 'loading' && dock.status !== 'unloading' && (
                  <button
                    onClick={() => handleToggleMaintenance(dock)}
                    className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                      dock.status === 'maintenance'
                        ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                        : 'bg-white/70 hover:bg-white'
                    }`}
                  >
                    {dock.status === 'maintenance' ? (
                      <span className="flex items-center justify-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Mark Available
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-1">
                        <Wrench className="h-3 w-3" />
                        Set Maintenance
                      </span>
                    )}
                  </button>
                )}
                {(dock.status === 'loading' || dock.status === 'unloading') && (
                  <div className="flex-1 rounded-xl bg-white/50 px-3 py-2 text-center text-xs font-medium">
                    🔒 In Progress
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredDocks.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <div className="text-3xl">🏗️</div>
          <div className="mt-3 text-base font-semibold text-gray-900">No docks found</div>
          <div className="mt-1 text-sm text-gray-500">Try adjusting your filters</div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedDock ? 'Edit Dock' : 'Add New Dock'}
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Dock Code"
              name="code"
              value={formData.code}
              onChange={handleFormChange}
              placeholder="D-01"
              required
            />
            <FormInput
              label="Dock Name"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              placeholder="Dock Utama 1"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              label="Type"
              name="type"
              value={formData.type}
              onChange={handleFormChange}
              options={TYPE_OPTIONS}
              required
            />
            <FormSelect
              label="Capacity"
              name="capacity"
              value={formData.capacity}
              onChange={handleFormChange}
              options={CAPACITY_OPTIONS}
              required
            />
          </div>
          <FormSelect
            label="Status"
            name="status"
            value={formData.status}
            onChange={handleFormChange}
            options={STATUS_OPTIONS}
            required
          />
          <FormInput
            label="Notes (optional)"
            name="notes"
            value={formData.notes}
            onChange={handleFormChange}
            placeholder="Additional notes..."
          />

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <PrimaryButton type="submit">
              {selectedDock ? 'Save Changes' : 'Add Dock'}
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      {/* Maintenance Modal */}
      <Modal
        open={maintenanceModalOpen}
        onClose={() => setMaintenanceModalOpen(false)}
        title="Set Dock to Maintenance"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Setting <strong>{selectedDock?.code}</strong> to maintenance mode will make it unavailable for loading/unloading.
          </p>
          <FormInput
            label="Maintenance Reason"
            name="reason"
            value={maintenanceNote}
            onChange={(e) => setMaintenanceNote(e.target.value)}
            placeholder="e.g., Floor repair, equipment check..."
          />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setMaintenanceModalOpen(false)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmMaintenance}
              className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
            >
              Confirm Maintenance
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DocksPage;
