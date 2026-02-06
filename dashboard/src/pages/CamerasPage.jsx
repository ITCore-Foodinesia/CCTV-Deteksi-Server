/**
 * CamerasPage - View and manage CCTV cameras
 * Based on new_theme/app.js design patterns
 * 
 * Uses Supabase Real-time for live updates.
 */

import React, { useState, useMemo } from 'react';
import { Camera, Plus, Edit2, Trash2, Video, VideoOff, AlertTriangle, Loader2, RefreshCw, Settings } from 'lucide-react';
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
import { useCameras, CAMERA_STATUS, useDocks } from '../hooks';

const STATUS_OPTIONS = [
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'error', label: 'Error' },
];

const STATUS_COLORS = {
  online: 'bg-emerald-100 text-emerald-700',
  offline: 'bg-gray-100 text-gray-700',
  maintenance: 'bg-amber-100 text-amber-700',
  error: 'bg-red-100 text-red-700',
};

const ITEMS_PER_PAGE = 10;

const CamerasPage = () => {
  // Supabase hooks
  const {
    cameras,
    loading,
    error,
    stats,
    addCamera,
    updateCamera,
    updateStatus,
    deleteCamera,
    refetch,
  } = useCameras();

  const { docks } = useDocks();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    description: '',
    status: 'offline',
    dock_id: '',
  });

  // Build dock options
  const dockOptions = useMemo(() => {
    return docks.map((dock) => ({
      value: dock.id,
      label: `${dock.dock_code} - ${dock.dock_name || 'Unnamed'}`,
    }));
  }, [docks]);

  // Filter cameras
  const filteredCameras = useMemo(() => {
    return cameras.filter((camera) => {
      const matchesSearch =
        camera.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        camera.location?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = !statusFilter || camera.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [cameras, searchQuery, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredCameras.length / ITEMS_PER_PAGE);
  const paginatedCameras = filteredCameras.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  // Handlers
  const handleAdd = () => {
    setEditingCamera(null);
    setFormData({
      name: '',
      location: '',
      description: '',
      status: 'offline',
      dock_id: '',
    });
    setModalOpen(true);
  };

  const handleEdit = (camera) => {
    setEditingCamera(camera);
    setFormData({
      name: camera.name || '',
      location: camera.location || '',
      description: camera.description || '',
      status: camera.status || 'offline',
      dock_id: camera.dock_id || '',
    });
    setModalOpen(true);
  };

  const handleDelete = async (camera) => {
    if (window.confirm(`Delete camera "${camera.name}"?`)) {
      try {
        await deleteCamera(camera.id);
      } catch (err) {
        console.error('Failed to delete camera:', err);
        alert('Failed to delete camera: ' + err.message);
      }
    }
  };

  const handleToggleStatus = async (camera) => {
    const newStatus = camera.status === 'online' ? 'offline' : 'online';
    try {
      await updateStatus(camera.id, newStatus);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      if (editingCamera) {
        await updateCamera(editingCamera.id, {
          name: formData.name,
          location: formData.location || null,
          description: formData.description || null,
          status: formData.status,
          dock_id: formData.dock_id || null,
        });
      } else {
        await addCamera({
          name: formData.name,
          location: formData.location || null,
          description: formData.description || null,
          status: formData.status,
          dockId: formData.dock_id || null,
        });
      }
      setModalOpen(false);
    } catch (err) {
      console.error('Failed to save camera:', err);
      alert('Failed to save camera: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Table columns
  const columns = [
    {
      key: 'name',
      label: 'Camera',
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <div className={`grid h-9 w-9 place-items-center rounded-lg ${
            row.status === 'online' ? 'bg-emerald-100' : 'bg-gray-100'
          }`}>
            {row.status === 'online' ? (
              <Video className="h-4 w-4 text-emerald-600" />
            ) : (
              <VideoOff className="h-4 w-4 text-gray-500" />
            )}
          </div>
          <div>
            <div className="font-medium text-gray-900">{value}</div>
            <div className="text-xs text-gray-500">{row.location || 'No location'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_COLORS[value]}`}>
          {value}
        </span>
      ),
    },
    {
      key: 'dock_id',
      label: 'Dock',
      render: (value) => {
        const dock = docks.find((d) => d.id === value);
        return dock ? (
          <span className="text-sm">{dock.dock_code}</span>
        ) : (
          <span className="text-sm text-gray-400">Not assigned</span>
        );
      },
    },
    {
      key: 'description',
      label: 'Description',
      render: (value) => (
        <span className="text-sm text-gray-500 line-clamp-1">{value || '-'}</span>
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
              handleToggleStatus(row);
            }}
            className={`rounded-lg p-2 ${
              row.status === 'online'
                ? 'text-emerald-500 hover:bg-emerald-50'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
            title={row.status === 'online' ? 'Set Offline' : 'Set Online'}
          >
            {row.status === 'online' ? (
              <Video className="h-4 w-4" />
            ) : (
              <VideoOff className="h-4 w-4" />
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
            className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading cameras...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
        <p className="mt-2 text-sm text-red-700">{error}</p>
        <button 
          onClick={refetch}
          className="mt-4 rounded-xl bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Cameras"
        subtitle={`Manage CCTV cameras (${stats.total} total)`}
      >
        <div className="flex gap-2">
          <button
            onClick={refetch}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-700 hover:bg-gray-50"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <PrimaryButton onClick={handleAdd}>
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Camera
            </span>
          </PrimaryButton>
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <div className="text-sm text-gray-500">Total</div>
          <div className="mt-1 text-2xl font-semibold">{stats.total}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Online</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-600">{stats.online}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Offline</div>
          <div className="mt-1 text-2xl font-semibold text-gray-600">{stats.offline}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Maintenance</div>
          <div className="mt-1 text-2xl font-semibold text-amber-600">{stats.maintenance}</div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search cameras..."
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
      {cameras.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <Camera className="mx-auto h-10 w-10 text-gray-300" />
          <div className="mt-3 text-base font-semibold text-gray-900">No cameras configured</div>
          <div className="mt-1 text-sm text-gray-500">Add your first camera to get started</div>
          <PrimaryButton onClick={handleAdd} className="mt-4">
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Camera
            </span>
          </PrimaryButton>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={paginatedCameras}
            emptyMessage="No cameras found"
          />
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCamera ? 'Edit Camera' : 'Add New Camera'}
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <FormInput
            label="Camera Name"
            name="name"
            value={formData.name}
            onChange={handleFormChange}
            placeholder="e.g., Dock 01 - Main View"
            required
          />
          <FormInput
            label="Location"
            name="location"
            value={formData.location}
            onChange={handleFormChange}
            placeholder="e.g., Warehouse A, Loading Bay 1"
          />
          <FormInput
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleFormChange}
            placeholder="Optional description"
          />
          <FormSelect
            label="Status"
            name="status"
            value={formData.status}
            onChange={handleFormChange}
            options={STATUS_OPTIONS}
            required
          />
          <FormSelect
            label="Assign to Dock"
            name="dock_id"
            value={formData.dock_id}
            onChange={handleFormChange}
            options={[{ value: '', label: 'No dock assigned' }, ...dockOptions]}
          />

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <PrimaryButton type="submit" disabled={actionLoading}>
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingCamera ? (
                'Save Changes'
              ) : (
                'Add Camera'
              )}
            </PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CamerasPage;
