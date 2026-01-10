import axios from 'axios';

// Use the existing api_server.py on port 5001 for video stream
// Engine API runs on port 8080 for detection data
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Stream URL from existing api_server.py
export const getStreamUrl = () => `${API_BASE_URL}/api/stream/video?t=${Date.now()}`;
export const getStreamRawUrl = () => `${API_BASE_URL}/api/stream/video_raw?t=${Date.now()}`;

// Direct stream URL from main_v2.py Edge Node (bypass api_server for video)
// If using api_server (5001), endpoint is /api/stream/video
// If using main_v2 (5002), endpoint is /video_feed
const EDGE_STREAM_URL = import.meta.env.VITE_EDGE_URL || '';
export const getDirectStreamUrl = () => {
  // Detect if using api_server (port 5001 or public api domain) or main_v2 edge node (port 5002)
  // If URL contains 'api.' or ':5001', it means we are going through api_server.py
  if (EDGE_STREAM_URL.includes(':5001') || EDGE_STREAM_URL.includes('api.')) {
    return `${EDGE_STREAM_URL}/api/stream/video?t=${Date.now()}`;
  }
  return `${EDGE_STREAM_URL}/video_feed`;
};


// API calls to existing api_server.py
export const streamApi = {
  // Status endpoints
  getStatus: () => api.get('/api/status'),
  getStats: () => api.get('/api/stats'),
  getActivities: () => api.get('/api/activities'),

  // Stream control
  start: () => api.get('/api/stream/start'),
  stop: () => api.get('/api/stream/stop'),

  // Settings
  getSettings: () => api.get('/api/settings'),
  setQuality: (quality) => api.get(`/api/settings/quality/${quality}`),
  setFrameSkip: (skip) => api.get(`/api/settings/frameskip/${skip}`),
  setDetection: (enabled) => api.get(`/api/settings/detection/${enabled ? 1 : 0}`),

  // Google Sheets integration
  getSheetsStatus: () => api.get('/api/sheets/status'),
  refreshSheets: () => api.get('/api/sheets/refresh'),
  reconnectSheets: () => api.get('/api/sheets/reconnect'),
};

export default api;
