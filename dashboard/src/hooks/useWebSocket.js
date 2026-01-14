import { useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

// Detect if accessed via Cloudflare tunnel (production domain)
const isCloudflare = window.location.hostname.includes('foodiserver.my.id');

// Use production API URL when accessed via Cloudflare tunnel
const getSocketUrl = () => {
  // If explicit VITE_API_URL is set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // If accessed via Cloudflare tunnel, use the API tunnel
  if (isCloudflare) {
    return 'https://api.foodiserver.my.id';
  }
  // Local development - connect to root (Vite proxy handles routing)
  return '/';
};

const SOCKET_URL = getSocketUrl();

export const useWebSocket = () => {
  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState({
    inbound: 0,
    outbound: 0,
    trucks: 0,
    capacity: 84,
    fps: 0,
    latency: 0,
  });
  const [activities, setActivities] = useState([]);
  const [status, setStatus] = useState('Disconnected');
  const [sheetsData, setSheetsData] = useState({
    latest_plate: 'N/A',
    latest_driver: 'Unknown',
    latest_items: 'Unknown',
    loading_count: 0,
    rehab_count: 0,
    latest_loading: 0,  // Last row loading value
    latest_rehab: 0,    // Last row rehab value
  });

  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 20,
      // Note: secure/rejectUnauthorized removed - they break Vite proxy
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('✓ WebSocket connected');
      setConnected(true);
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setStatus(`Error: ${error.message}`);
    });

    socket.on('disconnect', () => {
      console.log('✗ WebSocket disconnected');
      setConnected(false);
    });

    socket.on('status_update', (data) => {
      setStatus(data.status);
    });

    socket.on('stats_update', (data) => {
      setStats(data);
    });

    socket.on('activities_update', (data) => {
      setActivities(data);
    });

    socket.on('new_activity', (activity) => {
      setActivities((prev) => [activity, ...prev].slice(0, 50));
    });

    socket.on('sheets_update', (data) => {
      console.log('Sheets data received:', data);
      setSheetsData(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const requestStats = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('request_stats');
    }
  }, []);

  const requestActivities = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('request_activities');
    }
  }, []);

  return {
    connected,
    stats,
    activities,
    status,
    sheetsData,
    requestStats,
    requestActivities,
  };
};
