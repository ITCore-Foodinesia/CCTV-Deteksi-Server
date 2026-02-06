/**
 * LoadersPage - Manage loaders/forklift operators with table and status management
 * Based on new_theme/app.js design patterns
 * 
 * Updated to use Supabase with real-time sync via useLoaders hook
 */

import React, { useState, useMemo } from 'react';
import { Package, Plus, Edit2, Trash2, UserCheck, UserX, Coffee, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import {
  PageHeader,
  SearchInput,
  SelectFilter,
  PrimaryButton,
  DataTable,
  Pagination,
  Modal,
  FormInput,
  FormSelect,
  StatusBadge,
  Card,
} from '../components/shared';
import { useLoaders, LOADER_STATUS, useDocks } from '../hooks';

const STATUS_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'on_break', label: 'On Break' },
  { value: 'off_duty', label: 'Off Duty' },
];

const SPECIALTY_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'forklift', label: 'Forklift' },
  { value: 'reach_truck', label: 'Reach Truck' },
  { value: 'hand_pallet', label: 'Hand Pallet' },
  { value: 'order_picker', label: 'Order Picker' },
  { value: 'general', label: 'General' },
];

const ITEMS_PER_PAGE = 10;

const LoadersPage = () => {
  // Use Supabase hooks for real data with realtime sync
  const {
    loaders,
    loading,
    error,
    stats,
    createLoader,
    updateLoader,
    deleteLoader,
    setAvailable,
    setOnBreak,
    setOffDuty,
    releaseLoader,
    refetch,
  } = useLoaders();

  // Get docks for assignment dropdown
  const { docks } = useDocks();

  // Local UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLoader, setEditingLoader] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    loader_code: '',
    specialty: '',
    status: 'available',
  });

  // Build dock options
  const dockOptions = useMemo(() => {
    return [
      { value: '', label: 'Unassigned' },
      ...docks.map((dock) => ({
        value: dock.id,
        label: `${dock.dock_code || dock.code || dock.id} - ${dock.dock_name || dock.name || 'Unnamed'}`,
      })),
    ];
  }, [docks]);

  // Filter and search
  const filteredLoaders = useMemo(() => {
    return loaders.filter((loader) => {
      const name = loader.name || '';
      const phone = loader.phone || '';
      const loaderCode = loader.loader_code || '';
      const specialty = loader.specialty || '';
      
      const matchesSearch =
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        phone.includes(searchQuery) ||
        loaderCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        specialty.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = !statusFilter || loader.status === statusFilter;
      const matchesSpecialty = !specialtyFilter || loader.specialty === specialtyFilter;
      
      return matchesSearch && matchesStatus && matchesSpecialty;
    });
  }, [loaders, searchQuery, statusFilter, specialtyFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredLoaders.length / ITEMS_PER_PAGE);
  const paginatedLoaders = filteredLoaders.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  useMemo(() => {
    setPage(1);
  }, [searchQuery, statusFilter, specialtyFilter]);

  // Get status badge variant
  const getStatusVariant = (status) => {
    switch (status) {
      case LOADER_STATUS.AVAILABLE:
        return 'success';
      case LOADER_STATUS.ASSIGNED:
        return 'warning';
      case LOADER_STATUS.ON_BREAK:
        return 'info';
      case LOADER_STATUS.OFF_DUTY:
        return 'inactive';
      default:
        return 'default';
    }
  };

  // Table columns
  const columns = [
    {
      key: 'name',
      label: 'Loader',
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-purple-100">
            <Package className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{value || 'Unnamed'}</div>
            <div className="text-xs text-gray-500">
              {row.loader_code && <span className="font-mono">{row.loader_code} • </span>}
              {row.phone || '-'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'specialty',
      label: 'Specialty',
      render: (value) => (
        <span className="capitalize text-sm">
          {value?.replace('_', ' ') || 'General'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <StatusBadge status={getStatusVariant(value)}>
          <span className="capitalize">{value?.replace('_', ' ') || 'Unknown'}</span>
        </StatusBadge>
      ),
    },
    {
      key: 'current_dock_id',
      label: 'Current Dock',
      render: (value) => {
        if (!value) {
          return <span className="text-gray-400">-</span>;
        }
        // Find dock name
        const dock = docks.find((d) => d.id === value);
        return (
          <span className="rounded-lg bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700">
            {dock?.dock_code || dock?.code || value}
          </span>
        );
      },
    },
    {
      key: 'created_at',
      label: 'Joined',
      render: (value) => value ? new Date(value).toLocaleDateString('id-ID') : '-',
    },
    {
      key: 'actions',
      label: '',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          {/* Status toggle buttons */}
          {row.status === LOADER_STATUS.ASSIGNED && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRelease(row.id);
              }}
              className="rounded-lg p-2 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600"
              title="Release (Make Available)"
            >
              <UserCheck className="h-4 w-4" />
            </button>
          )}
          {row.status === LOADER_STATUS.AVAILABLE && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetOnBreak(row.id);
                }}
                className="rounded-lg p-2 text-gray-500 hover:bg-amber-50 hover:text-amber-600"
                title="Set On Break"
              >
                <Coffee className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetOffDuty(row.id);
                }}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                title="Set Off Duty"
              >
                <Clock className="h-4 w-4" />
              </button>
            </>
          )}
          {(row.status === LOADER_STATUS.ON_BREAK || row.status === LOADER_STATUS.OFF_DUTY) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSetAvailable(row.id);
              }}
              className="rounded-lg p-2 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600"
              title="Set Available"
            >
              <UserCheck className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(row);
            }}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            title="Edit"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row.id);
            }}
            className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  // Handlers
  const handleAdd = () => {
    setEditingLoader(null);
    setFormData({
      name: '',
      phone: '',
      loader_code: '',
      specialty: '',
      status: 'available',
    });
    setModalOpen(true);
  };

  const handleEdit = (loader) => {
    setEditingLoader(loader);
    setFormData({
      name: loader.name || '',
      phone: loader.phone || '',
      loader_code: loader.loader_code || '',
      specialty: loader.specialty || '',
      status: loader.status || 'available',
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this loader?')) {
      try {
        await deleteLoader(id);
      } catch (err) {
        console.error('Failed to delete loader:', err);
        alert('Failed to delete loader. Please try again.');
      }
    }
  };

  const handleSetAvailable = async (id) => {
    try {
      await setAvailable(id);
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update loader status.');
    }
  };

  const handleSetOnBreak = async (id) => {
    try {
      await setOnBreak(id);
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update loader status.');
    }
  };

  const handleSetOffDuty = async (id) => {
    try {
      await setOffDuty(id);
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update loader status.');
    }
  };

  const handleRelease = async (id) => {
    try {
      await releaseLoader(id);
    } catch (err) {
      console.error('Failed to release loader:', err);
      alert('Failed to release loader.');
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingLoader) {
        // Update existing
        await updateLoader(editingLoader.id, formData);
      } else {
        // Create new
        await createLoader(formData);
      }
      setModalOpen(false);
    } catch (err) {
      console.error('Failed to save loader:', err);
      alert(err.message || 'Failed to save loader. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading && loaders.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-500">Loading loaders...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && loaders.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <p className="text-sm text-gray-700">Failed to load loaders</p>
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
        title="Loaders"
        subtitle={`Manage forklift operators and loaders (${stats.total} total)`}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={refetch}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            title="Refresh"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <PrimaryButton onClick={handleAdd}>
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Loader
            </span>
          </PrimaryButton>
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Card>
          <div className="text-sm text-gray-500">Total Loaders</div>
          <div className="mt-1 text-2xl font-semibold">{stats.total}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Available</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-600">{stats.available}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Assigned</div>
          <div className="mt-1 text-2xl font-semibold text-purple-600">{stats.assigned}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">On Break</div>
          <div className="mt-1 text-2xl font-semibold text-blue-600">{stats.onBreak}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Off Duty</div>
          <div className="mt-1 text-2xl font-semibold text-gray-600">{stats.offDuty}</div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by name, phone, code, or specialty..."
          />
        </div>
        <SelectFilter
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_OPTIONS}
          placeholder="All Status"
        />
        <SelectFilter
          value={specialtyFilter}
          onChange={setSpecialtyFilter}
          options={SPECIALTY_OPTIONS}
          placeholder="All Specialties"
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={paginatedLoaders}
        emptyMessage="No loaders found"
      />

      {/* Pagination */}
      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingLoader ? 'Edit Loader' : 'Add New Loader'}
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <FormInput
            label="Full Name"
            name="name"
            value={formData.name}
            onChange={handleFormChange}
            placeholder="Enter loader's full name"
            required
          />
          <FormInput
            label="Phone Number"
            name="phone"
            value={formData.phone}
            onChange={handleFormChange}
            placeholder="+62 8xx-xxxx-xxxx"
          />
          <FormInput
            label="Loader Code"
            name="loader_code"
            value={formData.loader_code}
            onChange={handleFormChange}
            placeholder="L001"
          />
          <FormSelect
            label="Specialty"
            name="specialty"
            value={formData.specialty}
            onChange={handleFormChange}
            options={SPECIALTY_OPTIONS}
          />
          <FormSelect
            label="Status"
            name="status"
            value={formData.status}
            onChange={handleFormChange}
            options={STATUS_OPTIONS}
            required
          />

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={submitting}
            >
              Cancel
            </button>
            <PrimaryButton type="submit" disabled={submitting}>
              {submitting ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Saving...
                </span>
              ) : editingLoader ? (
                'Save Changes'
              ) : (
                'Add Loader'
              )}
            </PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default LoadersPage;
