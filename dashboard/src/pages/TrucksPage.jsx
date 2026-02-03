/**
 * TrucksPage - Manage trucks with table, filters, and add/edit modal
 * Based on new_theme/app.js design patterns
 */

import React, { useState, useMemo } from 'react';
import { Truck, Plus, Edit2, Trash2, Fuel, Gauge } from 'lucide-react';
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

// Mock data based on new_theme
const MOCK_TRUCKS = [
  {
    id: 't-001',
    license_plate: 'B 1234 XY',
    brand: 'Fuso',
    model: 'Fighter',
    year: 2022,
    capacity_tons: 10,
    status: 'active',
    driver_name: 'Budi Santoso',
    last_maintenance: '2024-01-15',
  },
  {
    id: 't-002',
    license_plate: 'B 5678 AB',
    brand: 'Hino',
    model: 'Ranger',
    year: 2021,
    capacity_tons: 8,
    status: 'active',
    driver_name: 'Ahmad Wijaya',
    last_maintenance: '2024-02-20',
  },
  {
    id: 't-003',
    license_plate: 'B 9999 CD',
    brand: 'Isuzu',
    model: 'Giga',
    year: 2020,
    capacity_tons: 12,
    status: 'maintenance',
    driver_name: 'Dedi Kurniawan',
    last_maintenance: '2024-03-10',
  },
  {
    id: 't-004',
    license_plate: 'B 7777 EF',
    brand: 'Mitsubishi',
    model: 'Canter',
    year: 2023,
    capacity_tons: 6,
    status: 'active',
    driver_name: 'Eko Prasetyo',
    last_maintenance: '2024-03-01',
  },
  {
    id: 't-005',
    license_plate: 'B 2222 GH',
    brand: 'Fuso',
    model: 'Super Great',
    year: 2022,
    capacity_tons: 15,
    status: 'inactive',
    driver_name: null,
    last_maintenance: '2023-12-15',
  },
  {
    id: 't-006',
    license_plate: 'B 4444 IJ',
    brand: 'Hino',
    model: '500 Series',
    year: 2021,
    capacity_tons: 10,
    status: 'active',
    driver_name: 'Gunawan Setiawan',
    last_maintenance: '2024-02-28',
  },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'maintenance', label: 'Under Maintenance' },
  { value: 'inactive', label: 'Inactive' },
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
  // State
  const [trucks, setTrucks] = useState(MOCK_TRUCKS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState(null);
  const [formData, setFormData] = useState({
    license_plate: '',
    brand: 'Fuso',
    model: '',
    year: new Date().getFullYear(),
    capacity_tons: 10,
    status: 'active',
  });

  // Filter and search
  const filteredTrucks = useMemo(() => {
    return trucks.filter((truck) => {
      const matchesSearch =
        truck.license_plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
        truck.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        truck.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (truck.driver_name && truck.driver_name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = !statusFilter || truck.status === statusFilter;
      const matchesBrand = !brandFilter || truck.brand === brandFilter;
      return matchesSearch && matchesStatus && matchesBrand;
    });
  }, [trucks, searchQuery, statusFilter, brandFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredTrucks.length / ITEMS_PER_PAGE);
  const paginatedTrucks = filteredTrucks.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  // Table columns
  const columns = [
    {
      key: 'license_plate',
      label: 'Truck',
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gray-100">
            <Truck className="h-4 w-4 text-gray-600" />
          </div>
          <div>
            <div className="font-mono font-medium text-gray-900">{value}</div>
            <div className="text-xs text-gray-500">{row.brand} {row.model}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'year',
      label: 'Year',
    },
    {
      key: 'capacity_tons',
      label: 'Capacity',
      render: (value) => (
        <div className="flex items-center gap-1">
          <Gauge className="h-4 w-4 text-gray-400" />
          <span>{value} tons</span>
        </div>
      ),
    },
    {
      key: 'driver_name',
      label: 'Assigned Driver',
      render: (value) => value || <span className="text-gray-400">Unassigned</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: 'last_maintenance',
      label: 'Last Maintenance',
      render: (value) => new Date(value).toLocaleDateString('id-ID'),
    },
    {
      key: 'actions',
      label: '',
      render: (_, row) => (
        <div className="flex items-center gap-1">
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
      license_plate: '',
      brand: 'Fuso',
      model: '',
      year: new Date().getFullYear(),
      capacity_tons: 10,
      status: 'active',
    });
    setModalOpen(true);
  };

  const handleEdit = (truck) => {
    setEditingTruck(truck);
    setFormData({
      license_plate: truck.license_plate,
      brand: truck.brand,
      model: truck.model,
      year: truck.year,
      capacity_tons: truck.capacity_tons,
      status: truck.status,
    });
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this truck?')) {
      setTrucks(trucks.filter((t) => t.id !== id));
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ 
      ...prev, 
      [name]: name === 'year' || name === 'capacity_tons' ? Number(value) : value 
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingTruck) {
      // Update existing
      setTrucks(trucks.map((t) =>
        t.id === editingTruck.id ? { ...t, ...formData } : t
      ));
    } else {
      // Add new
      const newTruck = {
        id: `t-${Date.now()}`,
        ...formData,
        driver_name: null,
        last_maintenance: new Date().toISOString().split('T')[0],
      };
      setTrucks([newTruck, ...trucks]);
    }
    
    setModalOpen(false);
  };

  // Stats
  const stats = useMemo(() => ({
    total: trucks.length,
    active: trucks.filter((t) => t.status === 'active').length,
    maintenance: trucks.filter((t) => t.status === 'maintenance').length,
    inactive: trucks.filter((t) => t.status === 'inactive').length,
    totalCapacity: trucks.filter((t) => t.status === 'active').reduce((sum, t) => sum + t.capacity_tons, 0),
  }), [trucks]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Trucks"
        subtitle={`Manage your fleet vehicles (${stats.total} total)`}
      >
        <PrimaryButton onClick={handleAdd}>
          <span className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Truck
          </span>
        </PrimaryButton>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Card>
          <div className="text-sm text-gray-500">Total Fleet</div>
          <div className="mt-1 text-2xl font-semibold">{stats.total}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Active</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-600">{stats.active}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Maintenance</div>
          <div className="mt-1 text-2xl font-semibold text-orange-600">{stats.maintenance}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Inactive</div>
          <div className="mt-1 text-2xl font-semibold text-gray-600">{stats.inactive}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Total Capacity</div>
          <div className="mt-1 text-2xl font-semibold text-blue-600">{stats.totalCapacity}t</div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by plate, brand, model, or driver..."
          />
        </div>
        <SelectFilter
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_OPTIONS}
          placeholder="All Status"
        />
        <SelectFilter
          value={brandFilter}
          onChange={setBrandFilter}
          options={BRAND_OPTIONS}
          placeholder="All Brands"
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
            label="License Plate"
            name="license_plate"
            value={formData.license_plate}
            onChange={handleFormChange}
            placeholder="B 1234 XY"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              label="Brand"
              name="brand"
              value={formData.brand}
              onChange={handleFormChange}
              options={BRAND_OPTIONS}
              required
            />
            <FormInput
              label="Model"
              name="model"
              value={formData.model}
              onChange={handleFormChange}
              placeholder="Fighter, Ranger, etc."
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Year"
              name="year"
              type="number"
              value={formData.year}
              onChange={handleFormChange}
              required
            />
            <FormInput
              label="Capacity (tons)"
              name="capacity_tons"
              type="number"
              value={formData.capacity_tons}
              onChange={handleFormChange}
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

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <PrimaryButton type="submit">
              {editingTruck ? 'Save Changes' : 'Add Truck'}
            </PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TrucksPage;
