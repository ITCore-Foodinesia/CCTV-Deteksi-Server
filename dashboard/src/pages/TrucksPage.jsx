/**
 * TrucksPage - Manage trucks with table, filters, and add/edit modal
 * Based on new_theme/app.js design patterns
 * 
 * Updated to use Supabase with real-time sync via useTrucks hook
 */

import React, { useState, useMemo } from 'react';
import { Truck, Plus, Edit2, Trash2, Gauge, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
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
import { useTrucks } from '../hooks';

// Status options mapped to is_registered boolean
const STATUS_OPTIONS = [
  { value: 'registered', label: 'Registered' },
  { value: 'unregistered', label: 'Unregistered' },
];

// Vehicle type options (from database schema)
const TYPE_OPTIONS = [
  { value: 'truck', label: 'Truck' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'van', label: 'Van' },
  { value: 'container', label: 'Container' },
];

const BRAND_OPTIONS = [
  { value: 'Fuso', label: 'Fuso' },
  { value: 'Hino', label: 'Hino' },
  { value: 'Isuzu', label: 'Isuzu' },
  { value: 'Mitsubishi', label: 'Mitsubishi' },
  { value: 'UD Trucks', label: 'UD Trucks' },
];

const ITEMS_PER_PAGE = 10;

const TrucksPage = () => {
  // Use Supabase hook for real data with realtime sync
  const {
    trucks,
    loading,
    error,
    stats,
    createTruck,
    updateTruck,
    deleteTruck,
    registerTruck,
    unregisterTruck,
    refetch,
  } = useTrucks();

  // Local UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    plate_number: '',
    vehicle_type: 'truck',
    brand: 'Fuso',
    model: '',
    year: new Date().getFullYear(),
    capacity_kg: 10000,
    is_registered: true,
  });

  // Filter and search
  const filteredTrucks = useMemo(() => {
    return trucks.filter((truck) => {
      // Search across plate number, brand, model
      const plateNumber = truck.plate_number || '';
      const brand = truck.brand || '';
      const model = truck.model || '';
      const vehicleType = truck.vehicle_type || '';
      
      const matchesSearch =
        plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicleType.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter (registered/unregistered)
      const matchesStatus =
        !statusFilter ||
        (statusFilter === 'registered' && truck.is_registered) ||
        (statusFilter === 'unregistered' && !truck.is_registered);
      
      // Type filter
      const matchesType = !typeFilter || truck.vehicle_type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [trucks, searchQuery, statusFilter, typeFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredTrucks.length / ITEMS_PER_PAGE);
  const paginatedTrucks = filteredTrucks.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  useMemo(() => {
    setPage(1);
  }, [searchQuery, statusFilter, typeFilter]);

  // Table columns - mapped to database schema
  const columns = [
    {
      key: 'plate_number',
      label: 'Truck',
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gray-100">
            <Truck className="h-4 w-4 text-gray-600" />
          </div>
          <div>
            <div className="font-mono font-medium text-gray-900">
              {value || '-'}
            </div>
            <div className="text-xs text-gray-500">
              {row.brand || ''} {row.model || ''} {row.year ? `(${row.year})` : ''}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'vehicle_type',
      label: 'Type',
      render: (value) => (
        <span className="capitalize">{value || 'Unknown'}</span>
      ),
    },
    {
      key: 'capacity_kg',
      label: 'Capacity',
      render: (value) => (
        <div className="flex items-center gap-1">
          <Gauge className="h-4 w-4 text-gray-400" />
          <span>{value ? `${(value / 1000).toFixed(1)}t` : '-'}</span>
        </div>
      ),
    },
    {
      key: 'is_registered',
      label: 'Status',
      render: (value) => (
        <StatusBadge status={value ? 'active' : 'inactive'}>
          {value ? 'Registered' : 'Unregistered'}
        </StatusBadge>
      ),
    },
    {
      key: 'created_at',
      label: 'Added',
      render: (value) => value ? new Date(value).toLocaleDateString('id-ID') : '-',
    },
    {
      key: 'actions',
      label: '',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          {/* Toggle registration button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleRegistration(row);
            }}
            className={`rounded-lg p-2 ${
              row.is_registered
                ? 'text-gray-500 hover:bg-orange-50 hover:text-orange-600'
                : 'text-gray-500 hover:bg-emerald-50 hover:text-emerald-600'
            }`}
            title={row.is_registered ? 'Unregister' : 'Register'}
          >
            {row.is_registered ? (
              <XCircle className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
          </button>
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
    setEditingTruck(null);
    setFormData({
      plate_number: '',
      vehicle_type: 'truck',
      brand: 'Fuso',
      model: '',
      year: new Date().getFullYear(),
      capacity_kg: 10000,
      is_registered: true,
    });
    setModalOpen(true);
  };

  const handleEdit = (truck) => {
    setEditingTruck(truck);
    setFormData({
      plate_number: truck.plate_number || '',
      vehicle_type: truck.vehicle_type || 'truck',
      brand: truck.brand || 'Fuso',
      model: truck.model || '',
      year: truck.year || new Date().getFullYear(),
      capacity_kg: truck.capacity_kg || 10000,
      is_registered: truck.is_registered ?? true,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this truck?')) {
      try {
        await deleteTruck(id);
      } catch (err) {
        console.error('Failed to delete truck:', err);
        alert('Failed to delete truck. Please try again.');
      }
    }
  };

  const handleToggleRegistration = async (truck) => {
    try {
      if (truck.is_registered) {
        await unregisterTruck(truck.id);
      } else {
        await registerTruck(truck.id);
      }
    } catch (err) {
      console.error('Failed to toggle registration:', err);
      alert('Failed to update truck status. Please try again.');
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox'
        ? checked
        : (name === 'year' || name === 'capacity_kg')
          ? Number(value)
          : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingTruck) {
        // Update existing
        await updateTruck(editingTruck.id, formData);
      } else {
        // Create new
        await createTruck(formData);
      }
      setModalOpen(false);
    } catch (err) {
      console.error('Failed to save truck:', err);
      alert(err.message || 'Failed to save truck. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Computed stats (use stats from hook + local computation for capacity)
  const computedStats = useMemo(() => {
    const totalCapacity = trucks
      .filter((t) => t.is_registered)
      .reduce((sum, t) => sum + (t.capacity_kg || 0), 0);
    
    return {
      ...stats,
      totalCapacity: Math.round(totalCapacity / 1000), // Convert to tons
    };
  }, [stats, trucks]);

  // Loading state
  if (loading && trucks.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-500">Loading trucks...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && trucks.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <p className="text-sm text-gray-700">Failed to load trucks</p>
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
        title="Trucks"
        subtitle={`Manage your fleet vehicles (${computedStats.total} total)`}
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
              Add Truck
            </span>
          </PrimaryButton>
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <div className="text-sm text-gray-500">Total Fleet</div>
          <div className="mt-1 text-2xl font-semibold">{computedStats.total}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Registered</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-600">
            {computedStats.registered}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Unregistered</div>
          <div className="mt-1 text-2xl font-semibold text-orange-600">
            {computedStats.unregistered}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Total Capacity</div>
          <div className="mt-1 text-2xl font-semibold text-blue-600">
            {computedStats.totalCapacity}t
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by plate, brand, model, or type..."
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

      {/* Table */}
      <DataTable
        columns={columns}
        data={paginatedTrucks}
        emptyMessage="No trucks found"
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
        title={editingTruck ? 'Edit Truck' : 'Add New Truck'}
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <FormInput
            label="Plate Number"
            name="plate_number"
            value={formData.plate_number}
            onChange={handleFormChange}
            placeholder="B 1234 XY"
            required
          />
          
          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              label="Vehicle Type"
              name="vehicle_type"
              value={formData.vehicle_type}
              onChange={handleFormChange}
              options={TYPE_OPTIONS}
              required
            />
            <FormSelect
              label="Brand"
              name="brand"
              value={formData.brand}
              onChange={handleFormChange}
              options={BRAND_OPTIONS}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Model"
              name="model"
              value={formData.model}
              onChange={handleFormChange}
              placeholder="Fighter, Ranger, etc."
            />
            <FormInput
              label="Year"
              name="year"
              type="number"
              value={formData.year}
              onChange={handleFormChange}
              min="1990"
              max={new Date().getFullYear() + 1}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Capacity (kg)"
              name="capacity_kg"
              type="number"
              value={formData.capacity_kg}
              onChange={handleFormChange}
              min="0"
              step="100"
            />
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="is_registered"
                name="is_registered"
                checked={formData.is_registered}
                onChange={handleFormChange}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="is_registered" className="text-sm text-gray-700">
                Registered
              </label>
            </div>
          </div>

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
              ) : editingTruck ? (
                'Save Changes'
              ) : (
                'Add Truck'
              )}
            </PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TrucksPage;
