/**
 * DriversPage - Manage drivers with table, filters, and add/edit modal
 * Based on new_theme/app.js design patterns
 */

import React, { useState, useMemo } from 'react';
import { User, Plus, Phone, Edit2, Trash2, MoreHorizontal } from 'lucide-react';
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
const MOCK_DRIVERS = [
  {
    id: 'd-001',
    name: 'Budi Santoso',
    phone: '+62 812-3456-7890',
    license_plate: 'B 1234 XY',
    truck_type: 'Fuso',
    status: 'active',
    created_at: '2024-01-15',
  },
  {
    id: 'd-002',
    name: 'Ahmad Wijaya',
    phone: '+62 813-9876-5432',
    license_plate: 'B 5678 AB',
    truck_type: 'Hino',
    status: 'active',
    created_at: '2024-02-20',
  },
  {
    id: 'd-003',
    name: 'Dedi Kurniawan',
    phone: '+62 815-1111-2222',
    license_plate: 'B 9999 CD',
    truck_type: 'Isuzu',
    status: 'pending_approval',
    created_at: '2024-03-10',
  },
  {
    id: 'd-004',
    name: 'Eko Prasetyo',
    phone: '+62 816-3333-4444',
    license_plate: 'B 7777 EF',
    truck_type: 'Mitsubishi',
    status: 'suspended',
    created_at: '2024-01-05',
  },
  {
    id: 'd-005',
    name: 'Fajar Hidayat',
    phone: '+62 817-5555-6666',
    license_plate: 'B 2222 GH',
    truck_type: 'Fuso',
    status: 'active',
    created_at: '2024-03-25',
  },
  {
    id: 'd-006',
    name: 'Gunawan Setiawan',
    phone: '+62 818-7777-8888',
    license_plate: 'B 4444 IJ',
    truck_type: 'Hino',
    status: 'active',
    created_at: '2024-02-10',
  },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'inactive', label: 'Inactive' },
];

const TRUCK_TYPE_OPTIONS = [
  { value: 'Fuso', label: 'Fuso' },
  { value: 'Hino', label: 'Hino' },
  { value: 'Isuzu', label: 'Isuzu' },
  { value: 'Mitsubishi', label: 'Mitsubishi' },
  { value: 'UD Trucks', label: 'UD Trucks' },
];

const ITEMS_PER_PAGE = 10;

const DriversPage = () => {
  // State
  const [drivers, setDrivers] = useState(MOCK_DRIVERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    license_plate: '',
    truck_type: 'Fuso',
    status: 'pending_approval',
  });

  // Filter and search
  const filteredDrivers = useMemo(() => {
    return drivers.filter((driver) => {
      const matchesSearch =
        driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.phone.includes(searchQuery) ||
        driver.license_plate.toLowerCase().includes(searchQuery.toLowerCase());
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
            <div className="font-medium text-gray-900">{value}</div>
            <div className="text-xs text-gray-500">{row.phone}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'license_plate',
      label: 'License Plate',
      render: (value) => (
        <span className="font-mono text-sm">{value}</span>
      ),
    },
    {
      key: 'truck_type',
      label: 'Truck Type',
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: 'created_at',
      label: 'Joined',
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
    setEditingDriver(null);
    setFormData({
      name: '',
      phone: '',
      license_plate: '',
      truck_type: 'Fuso',
      status: 'pending_approval',
    });
    setModalOpen(true);
  };

  const handleEdit = (driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      phone: driver.phone,
      license_plate: driver.license_plate,
      truck_type: driver.truck_type,
      status: driver.status,
    });
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this driver?')) {
      setDrivers(drivers.filter((d) => d.id !== id));
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingDriver) {
      // Update existing
      setDrivers(drivers.map((d) =>
        d.id === editingDriver.id ? { ...d, ...formData } : d
      ));
    } else {
      // Add new
      const newDriver = {
        id: `d-${Date.now()}`,
        ...formData,
        created_at: new Date().toISOString().split('T')[0],
      };
      setDrivers([newDriver, ...drivers]);
    }
    
    setModalOpen(false);
  };

  // Stats
  const stats = useMemo(() => ({
    total: drivers.length,
    active: drivers.filter((d) => d.status === 'active').length,
    pending: drivers.filter((d) => d.status === 'pending_approval').length,
    suspended: drivers.filter((d) => d.status === 'suspended').length,
  }), [drivers]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Drivers"
        subtitle={`Manage your registered drivers (${stats.total} total)`}
      >
        <PrimaryButton onClick={handleAdd}>
          <span className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Driver
          </span>
        </PrimaryButton>
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
            placeholder="Search by name, phone, or plate..."
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
            required
          />
          <FormInput
            label="License Plate"
            name="license_plate"
            value={formData.license_plate}
            onChange={handleFormChange}
            placeholder="B 1234 XY"
            required
          />
          <FormSelect
            label="Truck Type"
            name="truck_type"
            value={formData.truck_type}
            onChange={handleFormChange}
            options={TRUCK_TYPE_OPTIONS}
            required
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
            >
              Cancel
            </button>
            <PrimaryButton type="submit">
              {editingDriver ? 'Save Changes' : 'Add Driver'}
            </PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DriversPage;
