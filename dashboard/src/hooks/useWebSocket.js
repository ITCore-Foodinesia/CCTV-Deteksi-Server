import { useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

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
  });

  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'], // Prioritize websocket
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 20,
      secure: true, // Force secure since we are on https
      rejectUnauthorized: false // Self-signed certs fix (though CF uses valid certs)
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
