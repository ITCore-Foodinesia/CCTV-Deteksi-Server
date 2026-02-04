/**
 * DriversPage - Manage drivers with table, filters, and add/edit modal
 * 
 * UPDATED: Now uses useDrivers hook for real Supabase integration
 * - Data is fetched from Supabase PostgreSQL
 * - Realtime updates via Supabase Realtime
 * - CRUD operations sync with database
 */

import React, { useState, useMemo, useCallback } from 'react';
import { User, Plus, Phone, Edit2, Trash2, MoreHorizontal, RefreshCw, Loader2 } from 'lucide-react';
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

// Import the Supabase hook
import { useDrivers } from '../hooks';

// Status options for filter and form
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'inactive', label: 'Inactive' },
];

const ITEMS_PER_PAGE = 10;

const DriversPage = () => {
  // Use the Supabase hook instead of local state
  const {
    drivers,
    loading,
    error,
    stats,
    createDriver,
    updateDriver,
    deleteDriver,
    approveDriver,
    suspendDriver,
    refetch,
  } = useDrivers();

  // Local UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    driver_code: '',
    status: 'pending_approval',
  });

  // Filter and search
  const filteredDrivers = useMemo(() => {
    return drivers.filter((driver) => {
      const matchesSearch =
        driver.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.phone?.includes(searchQuery) ||
        driver.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.driver_code?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = !statusFilter || driver.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [drivers, searchQuery, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredDrivers.length / ITEMS_PER_PAGE);
  const paginatedDrivers = filteredDrivers.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  // Table columns
  const columns = [
    {
      key: 'name',
      label: 'Driver',
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gray-100">
            <User className="h-4 w-4 text-gray-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{value || 'Unknown'}</div>
            <div className="text-xs text-gray-500">{row.phone || 'No phone'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'driver_code',
      label: 'Code',
      render: (value) => (
        <span className="font-mono text-sm text-gray-600">{value || '-'}</span>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (value) => (
        <span className="text-sm text-gray-600">{value || '-'}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: 'created_at',
      label: 'Registered',
      render: (value) => (
        <span className="text-sm text-gray-500">
          {value ? new Date(value).toLocaleDateString() : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (_, row) => (
        <div className="flex justify-end gap-1">
          {row.status === 'pending_approval' && (
            <button
              onClick={() => handleApprove(row.id)}
              className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"
              title="Approve"
            >
              ✓
            </button>
          )}
          <button
            onClick={() => handleEdit(row)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="rounded-lg p-2 text-red-500 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  // Handlers
  const handleAdd = () => {
    setEditingDriver(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      driver_code: '',
      status: 'pending_approval',
    });
    setModalOpen(true);
  };

  const handleEdit = (driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name || '',
      phone: driver.phone || '',
      email: driver.email || '',
      driver_code: driver.driver_code || '',
      status: driver.status || 'pending_approval',
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this driver?')) {
      try {
        await deleteDriver(id, true); // hard delete
        // No need to update local state - realtime will handle it
      } catch (err) {
        alert(`Failed to delete: ${err.message}`);
      }
    }
  };

  const handleApprove = async (id) => {
    try {
      await approveDriver(id);
      // Realtime will update the UI
    } catch (err) {
      alert(`Failed to approve: ${err.message}`);
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
      if (editingDriver) {
        // Update existing
        await updateDriver(editingDriver.id, formData);
      } else {
        // Create new
        await createDriver(formData);
      }
      setModalOpen(false);
    } catch (err) {
      alert(`Failed to save: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading && drivers.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading drivers...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-center">
        <h3 className="text-lg font-medium text-red-800">Error loading drivers</h3>
        <p className="mt-2 text-sm text-red-600">{error}</p>
        <button
          onClick={refetch}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Drivers"
        subtitle={`Manage your registered drivers (${stats.total} total)`}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={refetch}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <PrimaryButton onClick={handleAdd}>
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Driver
            </span>
          </PrimaryButton>
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <div className="text-sm text-gray-500">Total Drivers</div>
          <div className="mt-1 text-2xl font-semibold">{stats.total}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Active</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-600">{stats.active}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Pending Approval</div>
          <div className="mt-1 text-2xl font-semibold text-amber-600">{stats.pending}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Suspended</div>
          <div className="mt-1 text-2xl font-semibold text-red-600">{stats.suspended}</div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by name, phone, email, or code..."
          />
        </div>
        <SelectFilter
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_OPTIONS}
          placeholder="All Status"
        />
      </div>

      {/* Realtime indicator */}
      {loading && drivers.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Syncing...</span>
        </div>
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        data={paginatedDrivers}
        emptyMessage="No drivers found"
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
        title={editingDriver ? 'Edit Driver' : 'Add New Driver'}
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <FormInput
            label="Full Name"
            name="name"
            value={formData.name}
            onChange={handleFormChange}
            placeholder="Enter driver's full name"
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
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleFormChange}
            placeholder="driver@example.com"
          />
          <FormInput
            label="Driver Code"
            name="driver_code"
            value={formData.driver_code}
            onChange={handleFormChange}
            placeholder="DRV-001"
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
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                editingDriver ? 'Save Changes' : 'Add Driver'
              )}
            </PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DriversPage;
