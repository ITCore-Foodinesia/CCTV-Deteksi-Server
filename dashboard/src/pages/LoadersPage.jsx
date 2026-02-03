/**
 * LoadersPage - Manage loaders/forklift operators with table and status management
 * Based on new_theme/app.js design patterns
 */

import React, { useState, useMemo } from 'react';
import { Package, Plus, Edit2, Trash2, UserCheck, UserX, Forklift } from 'lucide-react';
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
const MOCK_LOADERS = [
  {
    id: 'l-001',
    name: 'Hendra Gunawan',
    phone: '+62 812-2222-3333',
    license_type: 'Forklift',
    license_number: 'FL-2024-001',
    status: 'active',
    assigned_dock: 'D-01',
    shift: 'morning',
    experience_years: 5,
    created_at: '2024-01-08',
  },
  {
    id: 'l-002',
    name: 'Irwan Setiawan',
    phone: '+62 813-4444-5555',
    license_type: 'Forklift',
    license_number: 'FL-2024-002',
    status: 'active',
    assigned_dock: 'D-02',
    shift: 'morning',
    experience_years: 3,
    created_at: '2024-02-12',
  },
  {
    id: 'l-003',
    name: 'Joko Widodo',
    phone: '+62 815-6666-7777',
    license_type: 'Hand Pallet',
    license_number: 'HP-2024-001',
    status: 'active',
    assigned_dock: 'D-03',
    shift: 'afternoon',
    experience_years: 2,
    created_at: '2024-01-20',
  },
  {
    id: 'l-004',
    name: 'Kurniawan Adi',
    phone: '+62 816-8888-9999',
    license_type: 'Forklift',
    license_number: 'FL-2024-003',
    status: 'inactive',
    assigned_dock: null,
    shift: 'morning',
    experience_years: 4,
    created_at: '2024-03-05',
  },
  {
    id: 'l-005',
    name: 'Lukman Hakim',
    phone: '+62 817-0000-1111',
    license_type: 'Reach Truck',
    license_number: 'RT-2024-001',
    status: 'active',
    assigned_dock: 'D-05',
    shift: 'afternoon',
    experience_years: 6,
    created_at: '2024-02-25',
  },
  {
    id: 'l-006',
    name: 'Mulyadi Santoso',
    phone: '+62 818-2323-4545',
    license_type: 'Hand Pallet',
    license_number: 'HP-2024-002',
    status: 'suspended',
    assigned_dock: null,
    shift: 'morning',
    experience_years: 1,
    created_at: '2024-01-15',
  },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
];

const LICENSE_TYPE_OPTIONS = [
  { value: 'Forklift', label: 'Forklift' },
  { value: 'Reach Truck', label: 'Reach Truck' },
  { value: 'Hand Pallet', label: 'Hand Pallet' },
  { value: 'Order Picker', label: 'Order Picker' },
];

const SHIFT_OPTIONS = [
  { value: 'morning', label: 'Morning (06:00 - 14:00)' },
  { value: 'afternoon', label: 'Afternoon (14:00 - 22:00)' },
  { value: 'night', label: 'Night (22:00 - 06:00)' },
];

const DOCK_OPTIONS = [
  { value: '', label: 'Unassigned' },
  { value: 'D-01', label: 'D-01 - Dock Utama 1' },
  { value: 'D-02', label: 'D-02 - Dock Utama 2' },
  { value: 'D-03', label: 'D-03 - Dock Samping' },
  { value: 'D-04', label: 'D-04 - Dock Belakang 1' },
  { value: 'D-05', label: 'D-05 - Dock Belakang 2' },
  { value: 'D-06', label: 'D-06 - Dock Cadangan' },
];

const ITEMS_PER_PAGE = 10;

const LoadersPage = () => {
  // State
  const [loaders, setLoaders] = useState(MOCK_LOADERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [licenseFilter, setLicenseFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLoader, setEditingLoader] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    license_type: 'Forklift',
    license_number: '',
    status: 'active',
    assigned_dock: '',
    shift: 'morning',
    experience_years: 0,
  });

  // Filter and search
  const filteredLoaders = useMemo(() => {
    return loaders.filter((loader) => {
      const matchesSearch =
        loader.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loader.phone.includes(searchQuery) ||
        loader.license_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (loader.assigned_dock && loader.assigned_dock.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = !statusFilter || loader.status === statusFilter;
      const matchesLicense = !licenseFilter || loader.license_type === licenseFilter;
      return matchesSearch && matchesStatus && matchesLicense;
    });
  }, [loaders, searchQuery, statusFilter, licenseFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredLoaders.length / ITEMS_PER_PAGE);
  const paginatedLoaders = filteredLoaders.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

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
            <div className="font-medium text-gray-900">{value}</div>
            <div className="text-xs text-gray-500">{row.phone}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'license_type',
      label: 'License Type',
      render: (value, row) => (
        <div>
          <div className="text-sm font-medium">{value}</div>
          <div className="text-xs text-gray-500">{row.license_number}</div>
        </div>
      ),
    },
    {
      key: 'experience_years',
      label: 'Experience',
      render: (value) => (
        <span className="text-sm">{value} {value === 1 ? 'year' : 'years'}</span>
      ),
    },
    {
      key: 'assigned_dock',
      label: 'Assigned Dock',
      render: (value) => value ? (
        <span className="rounded-lg bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700">
          {value}
        </span>
      ) : (
        <span className="text-gray-400">Unassigned</span>
      ),
    },
    {
      key: 'shift',
      label: 'Shift',
      render: (value) => (
        <span className="capitalize">{value}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: 'actions',
      label: '',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleStatus(row);
            }}
            className={`rounded-lg p-2 ${
              row.status === 'active' 
                ? 'text-gray-500 hover:bg-red-50 hover:text-red-600' 
                : 'text-gray-500 hover:bg-emerald-50 hover:text-emerald-600'
            }`}
            title={row.status === 'active' ? 'Deactivate' : 'Activate'}
          >
            {row.status === 'active' ? (
              <UserX className="h-4 w-4" />
            ) : (
              <UserCheck className="h-4 w-4" />
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
    setEditingLoader(null);
    setFormData({
      name: '',
      phone: '',
      license_type: 'Forklift',
      license_number: '',
      status: 'active',
      assigned_dock: '',
      shift: 'morning',
      experience_years: 0,
    });
    setModalOpen(true);
  };

  const handleEdit = (loader) => {
    setEditingLoader(loader);
    setFormData({
      name: loader.name,
      phone: loader.phone,
      license_type: loader.license_type,
      license_number: loader.license_number,
      status: loader.status,
      assigned_dock: loader.assigned_dock || '',
      shift: loader.shift,
      experience_years: loader.experience_years,
    });
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this loader?')) {
      setLoaders(loaders.filter((l) => l.id !== id));
    }
  };

  const handleToggleStatus = (loader) => {
    const newStatus = loader.status === 'active' ? 'inactive' : 'active';
    setLoaders(loaders.map((l) =>
      l.id === loader.id ? { ...l, status: newStatus, assigned_dock: newStatus === 'inactive' ? null : l.assigned_dock } : l
    ));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ 
      ...prev, 
      [name]: name === 'experience_years' ? Number(value) : value 
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingLoader) {
      // Update existing
      setLoaders(loaders.map((l) =>
        l.id === editingLoader.id ? { ...l, ...formData, assigned_dock: formData.assigned_dock || null } : l
      ));
    } else {
      // Add new
      const newLoader = {
        id: `l-${Date.now()}`,
        ...formData,
        assigned_dock: formData.assigned_dock || null,
        created_at: new Date().toISOString().split('T')[0],
      };
      setLoaders([newLoader, ...loaders]);
    }
    
    setModalOpen(false);
  };

  // Stats
  const stats = useMemo(() => ({
    total: loaders.length,
    active: loaders.filter((l) => l.status === 'active').length,
    onDuty: loaders.filter((l) => l.status === 'active' && l.assigned_dock).length,
    forklift: loaders.filter((l) => l.license_type === 'Forklift' && l.status === 'active').length,
    avgExperience: loaders.length > 0 
      ? Math.round(loaders.reduce((sum, l) => sum + l.experience_years, 0) / loaders.length * 10) / 10
      : 0,
  }), [loaders]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Loaders"
        subtitle={`Manage forklift operators and loaders (${stats.total} total)`}
      >
        <PrimaryButton onClick={handleAdd}>
          <span className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Loader
          </span>
        </PrimaryButton>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Card>
          <div className="text-sm text-gray-500">Total Loaders</div>
          <div className="mt-1 text-2xl font-semibold">{stats.total}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Active</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-600">{stats.active}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">On Duty</div>
          <div className="mt-1 text-2xl font-semibold text-purple-600">{stats.onDuty}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Forklift Licensed</div>
          <div className="mt-1 text-2xl font-semibold text-blue-600">{stats.forklift}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Avg. Experience</div>
          <div className="mt-1 text-2xl font-semibold text-orange-600">{stats.avgExperience}y</div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by name, phone, license, or dock..."
          />
        </div>
        <SelectFilter
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_OPTIONS}
          placeholder="All Status"
        />
        <SelectFilter
          value={licenseFilter}
          onChange={setLicenseFilter}
          options={LICENSE_TYPE_OPTIONS}
          placeholder="All License Types"
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
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              label="License Type"
              name="license_type"
              value={formData.license_type}
              onChange={handleFormChange}
              options={LICENSE_TYPE_OPTIONS}
              required
            />
            <FormInput
              label="License Number"
              name="license_number"
              value={formData.license_number}
              onChange={handleFormChange}
              placeholder="FL-2024-XXX"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Experience (years)"
              name="experience_years"
              type="number"
              value={formData.experience_years}
              onChange={handleFormChange}
              required
            />
            <FormSelect
              label="Shift"
              name="shift"
              value={formData.shift}
              onChange={handleFormChange}
              options={SHIFT_OPTIONS}
              required
            />
          </div>
          <FormSelect
            label="Assigned Dock"
            name="assigned_dock"
            value={formData.assigned_dock}
            onChange={handleFormChange}
            options={DOCK_OPTIONS}
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
              {editingLoader ? 'Save Changes' : 'Add Loader'}
            </PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default LoadersPage;
