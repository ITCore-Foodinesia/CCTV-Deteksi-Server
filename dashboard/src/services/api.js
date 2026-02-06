import axios from 'axios';

// Detect if accessed via Cloudflare tunnel (production domain)
const isCloudflare = window.location.hostname.includes('foodiserver.my.id');

// Use production API URL when accessed via Cloudflare tunnel
// Use empty string (Vite proxy) when accessed locally
const getApiBaseUrl = () => {
  // If explicit VITE_API_URL is set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // If accessed via Cloudflare tunnel, use the API tunnel
  if (isCloudflare) {
    return 'https://api.foodiserver.my.id';
  }
  // Local development - use Vite proxy (empty = relative path)
  return '';
};

const API_BASE_URL = getApiBaseUrl();

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
const getEdgeUrl = () => {
  if (import.meta.env.VITE_EDGE_URL) {
    return import.meta.env.VITE_EDGE_URL;
  }
  if (isCloudflare) {
    return 'https://api.foodiserver.my.id';
  }
  return '';
};

const EDGE_STREAM_URL = getEdgeUrl();

export const getDirectStreamUrl = () => {
  // Detect if using api_server (port 5001 or public api domain) or main_v2 edge node (port 5002)
  // If URL contains 'api.' or ':5001', it means we are going through api_server.py
  if (EDGE_STREAM_URL.includes(':5001') || EDGE_STREAM_URL.includes('api.')) {
    return `${EDGE_STREAM_URL}/api/stream/video?t=${Date.now()}`;
  }
  return `${EDGE_STREAM_URL}/video_feed`;
};

// Debug: Log which mode we're using
console.log(`[API] Mode: ${isCloudflare ? 'Cloudflare Tunnel' : 'Local Development'}`);
console.log(`[API] Base URL: ${API_BASE_URL || '(Vite Proxy)'}`);


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
