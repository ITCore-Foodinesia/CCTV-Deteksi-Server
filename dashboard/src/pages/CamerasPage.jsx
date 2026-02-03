/**
 * CamerasPage - Manage CCTV cameras
 * Based on new_theme/app.js design patterns
 */

import React, { useState, useMemo } from 'react';
import { Camera, Plus, Edit2, Trash2, Video, VideoOff, Settings, Eye } from 'lucide-react';
import {
  PageHeader,
  SearchInput,
  SelectFilter,
  PrimaryButton,
  Modal,
  FormInput,
  FormSelect,
  StatusBadge,
  Card,
} from '../components/shared';

// Mock data
const MOCK_CAMERAS = [
  {
    id: 'cam-001',
    name: 'Dock 01 - Main View',
    location: 'Dock Utama 1',
    stream_url: 'rtsp://192.168.1.101:554/stream1',
    status: 'online',
    resolution: '1920x1080',
    fps: 30,
    recording: true,
    last_seen: '2024-03-15T10:30:00',
  },
  {
    id: 'cam-002',
    name: 'Dock 02 - Main View',
    location: 'Dock Utama 2',
    stream_url: 'rtsp://192.168.1.102:554/stream1',
    status: 'online',
    resolution: '1920x1080',
    fps: 30,
    recording: true,
    last_seen: '2024-03-15T10:30:00',
  },
  {
    id: 'cam-003',
    name: 'Dock 03 - Side View',
    location: 'Dock Samping',
    stream_url: 'rtsp://192.168.1.103:554/stream1',
    status: 'online',
    resolution: '1280x720',
    fps: 25,
    recording: true,
    last_seen: '2024-03-15T10:30:00',
  },
  {
    id: 'cam-004',
    name: 'Entrance Gate',
    location: 'Main Entrance',
    stream_url: 'rtsp://192.168.1.104:554/stream1',
    status: 'offline',
    resolution: '1920x1080',
    fps: 30,
    recording: false,
    last_seen: '2024-03-15T08:15:00',
  },
  {
    id: 'cam-005',
    name: 'Parking Area',
    location: 'Truck Parking',
    stream_url: 'rtsp://192.168.1.105:554/stream1',
    status: 'online',
    resolution: '1280x720',
    fps: 15,
    recording: true,
    last_seen: '2024-03-15T10:30:00',
  },
  {
    id: 'cam-006',
    name: 'Warehouse Interior',
    location: 'Inside Warehouse',
    stream_url: 'rtsp://192.168.1.106:554/stream1',
    status: 'online',
    resolution: '1920x1080',
    fps: 30,
    recording: true,
    last_seen: '2024-03-15T10:30:00',
  },
];

const STATUS_OPTIONS = [
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
];

const RESOLUTION_OPTIONS = [
  { value: '1920x1080', label: '1080p (1920x1080)' },
  { value: '1280x720', label: '720p (1280x720)' },
  { value: '640x480', label: '480p (640x480)' },
];

const FPS_OPTIONS = [
  { value: '30', label: '30 FPS' },
  { value: '25', label: '25 FPS' },
  { value: '15', label: '15 FPS' },
];

const CamerasPage = () => {
  // State
  const [cameras, setCameras] = useState(MOCK_CAMERAS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState(null);
  const [previewCamera, setPreviewCamera] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    stream_url: '',
    resolution: '1920x1080',
    fps: '30',
    recording: true,
  });

  // Filter cameras
  const filteredCameras = useMemo(() => {
    return cameras.filter((camera) => {
      const matchesSearch =
        camera.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        camera.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = !statusFilter || camera.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [cameras, searchQuery, statusFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: cameras.length,
    online: cameras.filter((c) => c.status === 'online').length,
    offline: cameras.filter((c) => c.status === 'offline').length,
    recording: cameras.filter((c) => c.recording && c.status === 'online').length,
  }), [cameras]);

  // Handlers
  const handleAdd = () => {
    setEditingCamera(null);
    setFormData({
      name: '',
      location: '',
      stream_url: '',
      resolution: '1920x1080',
      fps: '30',
      recording: true,
    });
    setModalOpen(true);
  };

  const handleEdit = (camera) => {
    setEditingCamera(camera);
    setFormData({
      name: camera.name,
      location: camera.location,
      stream_url: camera.stream_url,
      resolution: camera.resolution,
      fps: String(camera.fps),
      recording: camera.recording,
    });
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this camera?')) {
      setCameras(cameras.filter((c) => c.id !== id));
    }
  };

  const handleToggleRecording = (camera) => {
    setCameras(cameras.map((c) =>
      c.id === camera.id ? { ...c, recording: !c.recording } : c
    ));
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingCamera) {
      setCameras(cameras.map((c) =>
        c.id === editingCamera.id
          ? { ...c, ...formData, fps: Number(formData.fps) }
          : c
      ));
    } else {
      const newCamera = {
        id: `cam-${Date.now()}`,
        ...formData,
        fps: Number(formData.fps),
        status: 'offline',
        last_seen: null,
      };
      setCameras([...cameras, newCamera]);
    }
    
    setModalOpen(false);
  };

  const formatLastSeen = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Cameras"
        subtitle={`Manage CCTV cameras and streams (${stats.total} cameras)`}
      >
        <PrimaryButton onClick={handleAdd}>
          <span className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Camera
          </span>
        </PrimaryButton>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <div className="text-sm text-gray-500">Total Cameras</div>
          <div className="mt-1 text-2xl font-semibold">{stats.total}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Online</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-600">{stats.online}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Offline</div>
          <div className="mt-1 text-2xl font-semibold text-red-600">{stats.offline}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Recording</div>
          <div className="mt-1 text-2xl font-semibold text-blue-600">{stats.recording}</div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by name or location..."
          />
        </div>
        <SelectFilter
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_OPTIONS}
          placeholder="All Status"
        />
      </div>

      {/* Camera Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredCameras.map((camera) => (
          <div
            key={camera.id}
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
          >
            {/* Preview Area */}
            <div className="relative aspect-video bg-gray-900">
              {camera.status === 'online' ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Video className="mx-auto h-12 w-12 opacity-50" />
                    <div className="mt-2 text-sm">Live Preview</div>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div className="text-center text-gray-500">
                    <VideoOff className="mx-auto h-12 w-12" />
                    <div className="mt-2 text-sm">Offline</div>
                  </div>
                </div>
              )}
              
              {/* Status Badge */}
              <div className="absolute left-3 top-3">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                  camera.status === 'online'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-red-500 text-white'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    camera.status === 'online' ? 'bg-white animate-pulse' : 'bg-white/50'
                  }`} />
                  {camera.status}
                </span>
              </div>

              {/* Recording Indicator */}
              {camera.recording && camera.status === 'online' && (
                <div className="absolute right-3 top-3">
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-1 text-xs font-medium text-white">
                    <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                    REC
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{camera.name}</h3>
                  <p className="text-sm text-gray-500">{camera.location}</p>
                </div>
              </div>

              {/* Details */}
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                <span className="rounded bg-gray-100 px-2 py-1">{camera.resolution}</span>
                <span className="rounded bg-gray-100 px-2 py-1">{camera.fps} FPS</span>
              </div>

              <div className="mt-2 text-xs text-gray-400">
                Last seen: {formatLastSeen(camera.last_seen)}
              </div>

              {/* Actions */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setPreviewCamera(camera)}
                  disabled={camera.status === 'offline'}
                  className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="flex items-center justify-center gap-1">
                    <Eye className="h-4 w-4" />
                    View
                  </span>
                </button>
                <button
                  onClick={() => handleToggleRecording(camera)}
                  disabled={camera.status === 'offline'}
                  className={`rounded-xl px-3 py-2 text-sm font-medium ${
                    camera.recording
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {camera.recording ? 'Stop' : 'Record'}
                </button>
                <button
                  onClick={() => handleEdit(camera)}
                  className="rounded-xl border border-gray-200 bg-white p-2 text-gray-500 hover:bg-gray-50"
                >
                  <Settings className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(camera.id)}
                  className="rounded-xl border border-gray-200 bg-white p-2 text-gray-500 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredCameras.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <div className="text-4xl">📹</div>
          <div className="mt-3 text-base font-semibold text-gray-900">No cameras found</div>
          <div className="mt-1 text-sm text-gray-500">Add a camera to get started</div>
        </div>
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
            placeholder="e.g., Dock Utama 1"
            required
          />
          <FormInput
            label="Stream URL"
            name="stream_url"
            value={formData.stream_url}
            onChange={handleFormChange}
            placeholder="rtsp://192.168.1.100:554/stream1"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              label="Resolution"
              name="resolution"
              value={formData.resolution}
              onChange={handleFormChange}
              options={RESOLUTION_OPTIONS}
              required
            />
            <FormSelect
              label="Frame Rate"
              name="fps"
              value={formData.fps}
              onChange={handleFormChange}
              options={FPS_OPTIONS}
              required
            />
          </div>
          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="recording"
                checked={formData.recording}
                onChange={handleFormChange}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm font-medium text-gray-700">Enable recording</span>
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <PrimaryButton type="submit">
              {editingCamera ? 'Save Changes' : 'Add Camera'}
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      {/* Preview Modal */}
      <Modal
        open={!!previewCamera}
        onClose={() => setPreviewCamera(null)}
        title={previewCamera?.name || 'Camera Preview'}
        size="lg"
      >
        <div className="aspect-video rounded-xl bg-gray-900 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <Video className="mx-auto h-16 w-16 opacity-50" />
            <div className="mt-3 text-lg">Live Stream Preview</div>
            <div className="mt-1 text-sm opacity-70">
              {previewCamera?.stream_url}
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setPreviewCamera(null)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default CamerasPage;
