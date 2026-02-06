/**
 * HelpersPage - Manage helpers with table and status management
 * Based on new_theme/app.js design patterns
 * 
 * Updated to use Supabase with real-time sync via useHelpers hook
 */

import React, { useState, useMemo } from 'react';
import { HardHat, Plus, Edit2, Trash2, UserCheck, UserX, Coffee, Clock, RefreshCw, AlertCircle } from 'lucide-react';
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
import { useHelpers, HELPER_STATUS, useDocks } from '../hooks';

const STATUS_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'on_break', label: 'On Break' },
  { value: 'off_duty', label: 'Off Duty' },
];

const ITEMS_PER_PAGE = 10;

const HelpersPage = () => {
  // Use Supabase hooks for real data with realtime sync
  const {
    helpers,
    loading,
    error,
    stats,
    createHelper,
    updateHelper,
    deleteHelper,
    setAvailable,
    setOnBreak,
    setOffDuty,
    releaseHelper,
    refetch,
  } = useHelpers();

  // Get docks for assignment dropdown
  const { docks } = useDocks();

  // Local UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHelper, setEditingHelper] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    helper_code: '',
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
  const filteredHelpers = useMemo(() => {
    return helpers.filter((helper) => {
      const name = helper.name || '';
      const phone = helper.phone || '';
      const helperCode = helper.helper_code || '';
      
      const matchesSearch =
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        phone.includes(searchQuery) ||
        helperCode.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = !statusFilter || helper.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [helpers, searchQuery, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredHelpers.length / ITEMS_PER_PAGE);
  const paginatedHelpers = filteredHelpers.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  useMemo(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

  // Get status badge variant
  const getStatusVariant = (status) => {
    switch (status) {
      case HELPER_STATUS.AVAILABLE:
        return 'success';
      case HELPER_STATUS.ASSIGNED:
        return 'warning';
      case HELPER_STATUS.ON_BREAK:
        return 'info';
      case HELPER_STATUS.OFF_DUTY:
        return 'inactive';
      default:
        return 'default';
    }
  };

  // Table columns
  const columns = [
    {
      key: 'name',
      label: 'Helper',
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-amber-100">
            <HardHat className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{value || 'Unnamed'}</div>
            <div className="text-xs text-gray-500">
              {row.helper_code && <span className="font-mono">{row.helper_code} • </span>}
              {row.phone || '-'}
            </div>
          </div>
        </div>
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
          <span className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
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
          {row.status === HELPER_STATUS.ASSIGNED && (
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
          {row.status === HELPER_STATUS.AVAILABLE && (
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
          {(row.status === HELPER_STATUS.ON_BREAK || row.status === HELPER_STATUS.OFF_DUTY) && (
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
    setEditingHelper(null);
    setFormData({
      name: '',
      phone: '',
      helper_code: '',
      status: 'available',
    });
    setModalOpen(true);
  };

  const handleEdit = (helper) => {
    setEditingHelper(helper);
    setFormData({
      name: helper.name || '',
      phone: helper.phone || '',
      helper_code: helper.helper_code || '',
      status: helper.status || 'available',
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this helper?')) {
      try {
        await deleteHelper(id);
      } catch (err) {
        console.error('Failed to delete helper:', err);
        alert('Failed to delete helper. Please try again.');
      }
    }
  };

  const handleSetAvailable = async (id) => {
    try {
      await setAvailable(id);
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update helper status.');
    }
  };

  const handleSetOnBreak = async (id) => {
    try {
      await setOnBreak(id);
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update helper status.');
    }
  };

  const handleSetOffDuty = async (id) => {
    try {
      await setOffDuty(id);
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update helper status.');
    }
  };

  const handleRelease = async (id) => {
    try {
      await releaseHelper(id);
    } catch (err) {
      console.error('Failed to release helper:', err);
      alert('Failed to release helper.');
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
      if (editingHelper) {
        // Update existing
        await updateHelper(editingHelper.id, formData);
      } else {
        // Create new
        await createHelper(formData);
      }
      setModalOpen(false);
    } catch (err) {
      console.error('Failed to save helper:', err);
      alert(err.message || 'Failed to save helper. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading && helpers.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-500">Loading helpers...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && helpers.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <p className="text-sm text-gray-700">Failed to load helpers</p>
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
        title="Helpers"
        subtitle={`Manage dock helpers and assistants (${stats.total} total)`}
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
              Add Helper
            </span>
          </PrimaryButton>
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Card>
          <div className="text-sm text-gray-500">Total Helpers</div>
          <div className="mt-1 text-2xl font-semibold">{stats.total}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Available</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-600">{stats.available}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Assigned</div>
          <div className="mt-1 text-2xl font-semibold text-orange-600">{stats.assigned}</div>
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
            placeholder="Search by name, phone, or code..."
          />
        </div>
        <SelectFilter
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_OPTIONS}
          placeholder="All Status"
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={paginatedHelpers}
        emptyMessage="No helpers found"
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
        title={editingHelper ? 'Edit Helper' : 'Add New Helper'}
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <FormInput
            label="Full Name"
            name="name"
            value={formData.name}
            onChange={handleFormChange}
            placeholder="Enter helper's full name"
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
            label="Helper Code"
            name="helper_code"
            value={formData.helper_code}
            onChange={handleFormChange}
            placeholder="H001"
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
              ) : editingHelper ? (
                'Save Changes'
              ) : (
                'Add Helper'
              )}
            </PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default HelpersPage;
