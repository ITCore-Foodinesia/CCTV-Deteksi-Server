/**
 * HelpersPage - Manage helpers with table and status management
 * Based on new_theme/app.js design patterns
 */

import React, { useState, useMemo } from 'react';
import { HardHat, Plus, Phone, Edit2, Trash2, UserCheck, UserX } from 'lucide-react';
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
const MOCK_HELPERS = [
  {
    id: 'h-001',
    name: 'Rizki Pratama',
    phone: '+62 812-1111-2222',
    role: 'Senior Helper',
    status: 'active',
    assigned_dock: 'D-01',
    shift: 'morning',
    created_at: '2024-01-10',
  },
  {
    id: 'h-002',
    name: 'Yoga Nugroho',
    phone: '+62 813-3333-4444',
    role: 'Helper',
    status: 'active',
    assigned_dock: 'D-02',
    shift: 'morning',
    created_at: '2024-02-15',
  },
  {
    id: 'h-003',
    name: 'Dimas Saputra',
    phone: '+62 815-5555-6666',
    role: 'Helper',
    status: 'active',
    assigned_dock: 'D-03',
    shift: 'afternoon',
    created_at: '2024-01-25',
  },
  {
    id: 'h-004',
    name: 'Andi Permana',
    phone: '+62 816-7777-8888',
    role: 'Junior Helper',
    status: 'inactive',
    assigned_dock: null,
    shift: 'morning',
    created_at: '2024-03-01',
  },
  {
    id: 'h-005',
    name: 'Bayu Wicaksono',
    phone: '+62 817-9999-0000',
    role: 'Senior Helper',
    status: 'active',
    assigned_dock: 'D-05',
    shift: 'afternoon',
    created_at: '2024-02-20',
  },
  {
    id: 'h-006',
    name: 'Candra Wijaya',
    phone: '+62 818-1212-3434',
    role: 'Helper',
    status: 'suspended',
    assigned_dock: null,
    shift: 'morning',
    created_at: '2024-01-05',
  },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
];

const ROLE_OPTIONS = [
  { value: 'Junior Helper', label: 'Junior Helper' },
  { value: 'Helper', label: 'Helper' },
  { value: 'Senior Helper', label: 'Senior Helper' },
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

const HelpersPage = () => {
  // State
  const [helpers, setHelpers] = useState(MOCK_HELPERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHelper, setEditingHelper] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    role: 'Helper',
    status: 'active',
    assigned_dock: '',
    shift: 'morning',
  });

  // Filter and search
  const filteredHelpers = useMemo(() => {
    return helpers.filter((helper) => {
      const matchesSearch =
        helper.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        helper.phone.includes(searchQuery) ||
        (helper.assigned_dock && helper.assigned_dock.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = !statusFilter || helper.status === statusFilter;
      const matchesShift = !shiftFilter || helper.shift === shiftFilter;
      return matchesSearch && matchesStatus && matchesShift;
    });
  }, [helpers, searchQuery, statusFilter, shiftFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredHelpers.length / ITEMS_PER_PAGE);
  const paginatedHelpers = filteredHelpers.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

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
            <div className="font-medium text-gray-900">{value}</div>
            <div className="text-xs text-gray-500">{row.phone}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (value) => (
        <span className="text-sm">{value}</span>
      ),
    },
    {
      key: 'assigned_dock',
      label: 'Assigned Dock',
      render: (value) => value ? (
        <span className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
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
    setEditingHelper(null);
    setFormData({
      name: '',
      phone: '',
      role: 'Helper',
      status: 'active',
      assigned_dock: '',
      shift: 'morning',
    });
    setModalOpen(true);
  };

  const handleEdit = (helper) => {
    setEditingHelper(helper);
    setFormData({
      name: helper.name,
      phone: helper.phone,
      role: helper.role,
      status: helper.status,
      assigned_dock: helper.assigned_dock || '',
      shift: helper.shift,
    });
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this helper?')) {
      setHelpers(helpers.filter((h) => h.id !== id));
    }
  };

  const handleToggleStatus = (helper) => {
    const newStatus = helper.status === 'active' ? 'inactive' : 'active';
    setHelpers(helpers.map((h) =>
      h.id === helper.id ? { ...h, status: newStatus, assigned_dock: newStatus === 'inactive' ? null : h.assigned_dock } : h
    ));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingHelper) {
      // Update existing
      setHelpers(helpers.map((h) =>
        h.id === editingHelper.id ? { ...h, ...formData, assigned_dock: formData.assigned_dock || null } : h
      ));
    } else {
      // Add new
      const newHelper = {
        id: `h-${Date.now()}`,
        ...formData,
        assigned_dock: formData.assigned_dock || null,
        created_at: new Date().toISOString().split('T')[0],
      };
      setHelpers([newHelper, ...helpers]);
    }
    
    setModalOpen(false);
  };

  // Stats
  const stats = useMemo(() => ({
    total: helpers.length,
    active: helpers.filter((h) => h.status === 'active').length,
    assigned: helpers.filter((h) => h.status === 'active' && h.assigned_dock).length,
    inactive: helpers.filter((h) => h.status === 'inactive').length,
    suspended: helpers.filter((h) => h.status === 'suspended').length,
  }), [helpers]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Helpers"
        subtitle={`Manage dock helpers and assistants (${stats.total} total)`}
      >
        <PrimaryButton onClick={handleAdd}>
          <span className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Helper
          </span>
        </PrimaryButton>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Card>
          <div className="text-sm text-gray-500">Total Helpers</div>
          <div className="mt-1 text-2xl font-semibold">{stats.total}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Active</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-600">{stats.active}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">On Duty</div>
          <div className="mt-1 text-2xl font-semibold text-blue-600">{stats.assigned}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Inactive</div>
          <div className="mt-1 text-2xl font-semibold text-gray-600">{stats.inactive}</div>
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
            placeholder="Search by name, phone, or dock..."
          />
        </div>
        <SelectFilter
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_OPTIONS}
          placeholder="All Status"
        />
        <SelectFilter
          value={shiftFilter}
          onChange={setShiftFilter}
          options={SHIFT_OPTIONS}
          placeholder="All Shifts"
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
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              label="Role"
              name="role"
              value={formData.role}
              onChange={handleFormChange}
              options={ROLE_OPTIONS}
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
              {editingHelper ? 'Save Changes' : 'Add Helper'}
            </PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default HelpersPage;
