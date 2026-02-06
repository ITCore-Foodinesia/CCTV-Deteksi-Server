/**
 * UsersPage - Manage users and roles (owner only)
 * Based on new_theme/app.js design patterns
 */

import React, { useState, useMemo } from 'react';
import { Users, Plus, Edit2, Trash2, Shield, UserCheck, UserX, Key } from 'lucide-react';
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

// Mock data
const MOCK_USERS = [
  {
    id: 'u-001',
    name: 'Admin Demo',
    email: 'admin@gudangdriver.com',
    role: 'owner',
    status: 'active',
    last_login: '2024-03-15T10:30:00',
    created_at: '2024-01-01',
  },
  {
    id: 'u-002',
    name: 'Operator Satu',
    email: 'operator1@gudangdriver.com',
    role: 'operator',
    status: 'active',
    last_login: '2024-03-15T09:15:00',
    created_at: '2024-01-15',
  },
  {
    id: 'u-003',
    name: 'Operator Dua',
    email: 'operator2@gudangdriver.com',
    role: 'operator',
    status: 'active',
    last_login: '2024-03-14T16:45:00',
    created_at: '2024-02-01',
  },
  {
    id: 'u-004',
    name: 'Viewer Tamu',
    email: 'viewer@gudangdriver.com',
    role: 'viewer',
    status: 'active',
    last_login: '2024-03-10T11:00:00',
    created_at: '2024-02-20',
  },
  {
    id: 'u-005',
    name: 'Operator Lama',
    email: 'oldoperator@gudangdriver.com',
    role: 'operator',
    status: 'inactive',
    last_login: '2024-01-20T08:00:00',
    created_at: '2024-01-10',
  },
];

const ROLE_OPTIONS = [
  { value: 'owner', label: 'Owner' },
  { value: 'operator', label: 'Operator' },
  { value: 'viewer', label: 'Viewer' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const ROLE_DESCRIPTIONS = {
  owner: 'Full access to all features including user management and settings',
  operator: 'Can manage drivers, trucks, docks, sessions, and view reports',
  viewer: 'Read-only access to dashboard and reports',
};

const ROLE_COLORS = {
  owner: 'bg-purple-100 text-purple-700 ring-1 ring-purple-200',
  operator: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200',
  viewer: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200',
};

const ITEMS_PER_PAGE = 10;

const UsersPage = () => {
  // State
  const [users, setUsers] = useState(MOCK_USERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resetPasswordModal, setResetPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'operator',
    status: 'active',
    password: '',
  });

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = !roleFilter || user.role === roleFilter;
      const matchesStatus = !statusFilter || user.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  // Stats
  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((u) => u.status === 'active').length,
    owners: users.filter((u) => u.role === 'owner').length,
    operators: users.filter((u) => u.role === 'operator').length,
    viewers: users.filter((u) => u.role === 'viewer').length,
  }), [users]);

  // Handlers
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleAdd = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      role: 'operator',
      status: 'active',
      password: '',
    });
    setModalOpen(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      password: '',
    });
    setModalOpen(true);
  };

  const handleDelete = (user) => {
    if (user.role === 'owner') {
      alert('Cannot delete owner account');
      return;
    }
    if (window.confirm(`Delete user "${user.name}"?`)) {
      setUsers(users.filter((u) => u.id !== user.id));
    }
  };

  const handleToggleStatus = (user) => {
    if (user.role === 'owner') {
      alert('Cannot deactivate owner account');
      return;
    }
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    setUsers(users.map((u) =>
      u.id === user.id ? { ...u, status: newStatus } : u
    ));
  };

  const handleResetPassword = (user) => {
    setSelectedUser(user);
    setResetPasswordModal(true);
  };

  const handleConfirmResetPassword = () => {
    alert(`Password reset link sent to ${selectedUser?.email}`);
    setResetPasswordModal(false);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingUser) {
      setUsers(users.map((u) =>
        u.id === editingUser.id
          ? { ...u, name: formData.name, email: formData.email, role: formData.role, status: formData.status }
          : u
      ));
    } else {
      const newUser = {
        id: `u-${Date.now()}`,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        status: formData.status,
        last_login: null,
        created_at: new Date().toISOString().split('T')[0],
      };
      setUsers([...users, newUser]);
    }
    
    setModalOpen(false);
  };

  // Table columns
  const columns = [
    {
      key: 'name',
      label: 'User',
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gray-100">
            <Users className="h-4 w-4 text-gray-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{value}</div>
            <div className="text-xs text-gray-500">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (value) => (
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${ROLE_COLORS[value]}`}>
          <Shield className="h-3 w-3" />
          {value}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: 'last_login',
      label: 'Last Login',
      render: (value) => (
        <span className="text-sm text-gray-500">{formatDateTime(value)}</span>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (value) => (
        <span className="text-sm text-gray-500">{formatDate(value)}</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleResetPassword(row);
            }}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            title="Reset Password"
          >
            <Key className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleStatus(row);
            }}
            disabled={row.role === 'owner'}
            className={`rounded-lg p-2 ${
              row.role === 'owner'
                ? 'text-gray-300 cursor-not-allowed'
                : row.status === 'active'
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
              handleDelete(row);
            }}
            disabled={row.role === 'owner'}
            className={`rounded-lg p-2 ${
              row.role === 'owner'
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-500 hover:bg-red-50 hover:text-red-600'
            }`}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Users & Roles"
        subtitle={`Manage user accounts and permissions (${stats.total} users)`}
      >
        <PrimaryButton onClick={handleAdd}>
          <span className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add User
          </span>
        </PrimaryButton>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Card>
          <div className="text-sm text-gray-500">Total Users</div>
          <div className="mt-1 text-2xl font-semibold">{stats.total}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Active</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-600">{stats.active}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Owners</div>
          <div className="mt-1 text-2xl font-semibold text-purple-600">{stats.owners}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Operators</div>
          <div className="mt-1 text-2xl font-semibold text-blue-600">{stats.operators}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Viewers</div>
          <div className="mt-1 text-2xl font-semibold text-gray-600">{stats.viewers}</div>
        </Card>
      </div>

      {/* Role Permissions Info */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <h3 className="mb-3 font-semibold text-gray-900">Role Permissions</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {ROLE_OPTIONS.map((role) => (
            <div key={role.value} className="rounded-xl bg-gray-50 p-3">
              <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_COLORS[role.value]}`}>
                <Shield className="h-3 w-3" />
                {role.label}
              </div>
              <p className="mt-2 text-xs text-gray-600">{ROLE_DESCRIPTIONS[role.value]}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by name or email..."
          />
        </div>
        <SelectFilter
          value={roleFilter}
          onChange={setRoleFilter}
          options={ROLE_OPTIONS}
          placeholder="All Roles"
        />
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
        data={paginatedUsers}
        emptyMessage="No users found"
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
        title={editingUser ? 'Edit User' : 'Add New User'}
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <FormInput
            label="Full Name"
            name="name"
            value={formData.name}
            onChange={handleFormChange}
            placeholder="Enter user's full name"
            required
          />
          <FormInput
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleFormChange}
            placeholder="user@example.com"
            required
          />
          {!editingUser && (
            <FormInput
              label="Initial Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleFormChange}
              placeholder="Enter initial password"
              required
            />
          )}
          <FormSelect
            label="Role"
            name="role"
            value={formData.role}
            onChange={handleFormChange}
            options={ROLE_OPTIONS}
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
              {editingUser ? 'Save Changes' : 'Add User'}
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        open={resetPasswordModal}
        onClose={() => setResetPasswordModal(false)}
        title="Reset Password"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Send password reset link to <strong>{selectedUser?.email}</strong>?
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setResetPasswordModal(false)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <PrimaryButton onClick={handleConfirmResetPassword}>
              Send Reset Link
            </PrimaryButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UsersPage;
