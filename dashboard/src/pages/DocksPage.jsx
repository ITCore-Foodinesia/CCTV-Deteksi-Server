/**
 * DocksPage - Manage docks with status cards and maintenance toggle
 * Based on new_theme/app.js design patterns
 *
 * UPDATED: Now uses useDocks hook for real Supabase data with realtime sync
 */

import React, { useState, useMemo } from 'react';
import { Building2, Plus, Wrench, CheckCircle, Clock, AlertTriangle, Edit2, Truck, Loader2, RefreshCw } from 'lucide-react';
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
import { useDocks, DOCK_STATUS } from '../hooks';

const STATUS_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'loading', label: 'Loading' },
  { value: 'unloading', label: 'Unloading' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'closed', label: 'Closed' },
];

const CAPACITY_OPTIONS = [
  { value: '1', label: '1 truck' },
  { value: '2', label: '2 trucks' },
  { value: '3', label: '3 trucks' },
];

const STATUS_ICONS = {
  available: CheckCircle,
  loading: Clock,
  unloading: Clock,
  maintenance: Wrench,
  reserved: Clock,
  closed: AlertTriangle,
  occupied: Clock,
};

const DocksPage = () => {
  // Use Supabase hook for real data with realtime sync
  const {
    docks,
    loading,
    error,
    stats,
    createDock,
    updateDock,
    setMaintenance,
    setAvailable,
    refetch,
  } = useDocks();

  // Local UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [selectedDock, setSelectedDock] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    dock_code: '',
    dock_name: '',
    warehouse_zone: '',
    capacity: 1,
    status: 'available',
    maintenance_reason: '',
  });
  const [maintenanceNote, setMaintenanceNote] = useState('');

  // Filter and search
  const filteredDocks = useMemo(() => {
    return docks.filter((dock) => {
      const code = dock.dock_code || '';
      const name = dock.dock_name || '';
      const matchesSearch =
        code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = !statusFilter || dock.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [docks, searchQuery, statusFilter]);

  // Computed stats
  const displayStats = useMemo(() => ({
    total: stats.total,
    available: stats.available,
    inUse: docks.filter((d) => ['loading', 'unloading', 'occupied'].includes(d.status)).length,
    maintenance: stats.maintenance,
    closed: docks.filter((d) => d.status === 'closed').length,
  }), [stats, docks]);

  // Handlers
  const handleAdd = () => {
    setSelectedDock(null);
    setFormData({
      dock_code: '',
      dock_name: '',
      warehouse_zone: '',
      capacity: 1,
      status: 'available',
      maintenance_reason: '',
    });
    setModalOpen(true);
  };

  const handleEdit = (dock) => {
    setSelectedDock(dock);
    setFormData({
      dock_code: dock.dock_code || '',
      dock_name: dock.dock_name || '',
      warehouse_zone: dock.warehouse_zone || '',
      capacity: dock.capacity || 1,
      status: dock.status || 'available',
      maintenance_reason: dock.maintenance_reason || '',
    });
    setModalOpen(true);
  };

  const handleToggleMaintenance = async (dock) => {
    try {
      if (dock.status === 'maintenance') {
        await setAvailable(dock.id);
      } else {
        setSelectedDock(dock);
        setMaintenanceNote('');
        setMaintenanceModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to toggle maintenance:', err);
    }
  };

  const handleConfirmMaintenance = async () => {
    if (selectedDock) {
      try {
        await setMaintenance(selectedDock.id, maintenanceNote);
      } catch (err) {
        console.error('Failed to set maintenance:', err);
      }
    }
    setMaintenanceModalOpen(false);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      if (selectedDock) {
        await updateDock(selectedDock.id, {
          dock_code: formData.dock_code,
          dock_name: formData.dock_name,
          warehouse_zone: formData.warehouse_zone,
          capacity: parseInt(formData.capacity) || 1,
          status: formData.status,
          maintenance_reason: formData.maintenance_reason,
        });
      } else {
        await createDock({
          dock_code: formData.dock_code,
          dock_name: formData.dock_name,
          warehouse_zone: formData.warehouse_zone,
          capacity: parseInt(formData.capacity) || 1,
          status: formData.status,
          maintenance_reason: formData.maintenance_reason,
        });
      }
      setModalOpen(false);
    } catch (err) {
      console.error('Failed to save dock:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status) => {
    const Icon = STATUS_ICONS[status] || Building2;
    return Icon;
  };

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

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading docks...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="h-5 w-5" />
          <span>Failed to load docks: {error.message}</span>
        </div>
        <button onClick={refetch} className="mt-2 text-sm text-red-600 underline">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Docks"
        subtitle={`Manage loading/unloading docks (${displayStats.total} total)`}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={refetch}
            className="rounded-lg border border-gray-200 bg-white p-2 hover:bg-gray-50"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <PrimaryButton onClick={handleAdd}>
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Dock
            </span>
          </PrimaryButton>
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Card>
          <div className="text-sm text-gray-500">Total Docks</div>
          <div className="mt-1 text-2xl font-semibold">{displayStats.total}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Available</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-600">{displayStats.available}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">In Use</div>
          <div className="mt-1 text-2xl font-semibold text-orange-600">{displayStats.inUse}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Maintenance</div>
          <div className="mt-1 text-2xl font-semibold text-red-600">{displayStats.maintenance}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Closed</div>
          <div className="mt-1 text-2xl font-semibold text-gray-600">{displayStats.closed}</div>
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
                    <div className="font-semibold">{dock.dock_code}</div>
                    <div className="text-sm opacity-80">{dock.dock_name}</div>
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

              {/* Status & Info */}
              <div className="mt-3 flex items-center gap-2">
                <span className="rounded-full bg-white/50 px-2 py-0.5 text-xs font-medium uppercase tracking-wider">
                  {dock.status}
                </span>
                {dock.warehouse_zone && (
                  <span className="text-xs opacity-70">• {dock.warehouse_zone}</span>
                )}
                <span className="text-xs opacity-70">• Capacity: {dock.capacity}</span>
              </div>

              {/* Current Activity (from metadata) */}
              {dock.metadata?.current_session && (
                <div className="mt-3 rounded-xl bg-white/50 p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Truck className="h-4 w-4" />
                    <span className="font-mono font-medium">Active Session</span>
                  </div>
                  {dock.metadata.occupied_at && (
                    <div className="mt-1 text-xs opacity-70">
                      Duration: {formatDuration(dock.metadata.occupied_at)}
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {dock.maintenance_reason && (
                <div className="mt-3 text-sm opacity-80">
                  📝 {dock.maintenance_reason}
                </div>
              )}

              {/* Actions */}
              <div className="mt-4 flex gap-2">
                {dock.status !== 'loading' && dock.status !== 'unloading' && dock.status !== 'occupied' && (
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
                {['loading', 'unloading', 'occupied'].includes(dock.status) && (
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
              name="dock_code"
              value={formData.dock_code}
              onChange={handleFormChange}
              placeholder="D-01"
              required
            />
            <FormInput
              label="Dock Name"
              name="dock_name"
              value={formData.dock_name}
              onChange={handleFormChange}
              placeholder="Dock Utama 1"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Warehouse Zone"
              name="warehouse_zone"
              value={formData.warehouse_zone}
              onChange={handleFormChange}
              placeholder="Zone A"
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
            name="maintenance_reason"
            value={formData.maintenance_reason}
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
            <PrimaryButton type="submit" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : selectedDock ? (
                'Save Changes'
              ) : (
                'Add Dock'
              )}
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
            Setting dock <strong>{selectedDock?.dock_code}</strong> to maintenance mode.
          </p>
          <FormInput
            label="Reason (optional)"
            name="maintenanceNote"
            value={maintenanceNote}
            onChange={(e) => setMaintenanceNote(e.target.value)}
            placeholder="Describe the maintenance issue..."
          />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setMaintenanceModalOpen(false)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <PrimaryButton onClick={handleConfirmMaintenance}>
              Confirm Maintenance
            </PrimaryButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DocksPage;
