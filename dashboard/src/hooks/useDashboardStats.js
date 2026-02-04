/**
 * useDashboardStats - Hook for dashboard overview statistics
 *
 * Aggregates data from multiple tables to provide:
 * - Active sessions count
 * - Available docks count
 * - Total drivers count
 * - Today's completed sessions
 * - Recent activity feed
 *
 * @example
 * const { kpis, dockStatus, activity, loading } = useDashboardStats();
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook for aggregated dashboard statistics
 *
 * @returns {object} Dashboard stats and dock status
 */
export const useDashboardStats = () => {
  const [sessions, setSessions] = useState([]);
  const [docks, setDocks] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isMounted = useRef(true);

  /**
   * Fetch all required data
   */
  const fetchData = useCallback(async () => {
    if (!isMounted.current) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch sessions (last 24 hours for activity)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const [sessionsRes, docksRes, driversRes] = await Promise.all([
        supabase
          .from('loading_sessions')
          .select('id, status, started_at, finished_at, dock_id, driver_id, plate_number, loading_count, rehab_count, created_at')
          .gte('created_at', yesterday.toISOString())
          .order('created_at', { ascending: false }),
        supabase
          .from('docks')
          .select('id, dock_code, dock_name, status, maintenance_reason')
          .order('dock_code', { ascending: true }),
        supabase
          .from('drivers')
          .select('id, name, status')
          .eq('status', 'active'),
      ]);

      if (sessionsRes.error) throw sessionsRes.error;
      if (docksRes.error) throw docksRes.error;
      if (driversRes.error) throw driversRes.error;

      if (isMounted.current) {
        setSessions(sessionsRes.data || []);
        setDocks(docksRes.data || []);
        setDrivers(driversRes.data || []);
      }
    } catch (err) {
      console.error('[useDashboardStats] Error fetching data:', err);
      if (isMounted.current) {
        setError(err.message || 'Failed to fetch dashboard stats');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * Handle realtime updates
   */
  const handleRealtimeEvent = useCallback((tableName, payload) => {
    if (!isMounted.current) return;

    console.log(`[useDashboardStats] Realtime ${payload.eventType} on ${tableName}:`, payload);

    // Refetch on any change to keep stats up to date
    fetchData();
  }, [fetchData]);

  /**
   * Setup effect
   */
  useEffect(() => {
    isMounted.current = true;
    fetchData();

    // Subscribe to realtime changes on key tables
    const sessionChannel = supabase
      .channel('dashboard-sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loading_sessions' }, (payload) => handleRealtimeEvent('sessions', payload))
      .subscribe();

    const dockChannel = supabase
      .channel('dashboard-docks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'docks' }, (payload) => handleRealtimeEvent('docks', payload))
      .subscribe();

    const driverChannel = supabase
      .channel('dashboard-drivers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, (payload) => handleRealtimeEvent('drivers', payload))
      .subscribe();

    return () => {
      isMounted.current = false;
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(dockChannel);
      supabase.removeChannel(driverChannel);
    };
  }, [fetchData, handleRealtimeEvent]);

  /**
   * Compute KPIs
   */
  const kpis = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeSessions = sessions.filter((s) =>
      ['loading', 'waiting', 'pending_dock'].includes(s.status)
    );

    const todayCompleted = sessions.filter((s) => {
      if (s.status !== 'completed') return false;
      const completedAt = new Date(s.finished_at || s.created_at);
      return completedAt >= today;
    });

    const availableDocks = docks.filter((d) => d.status === 'available');

    // Calculate trend (compare with previous period)
    const yesterdayCompleted = sessions.filter((s) => {
      if (s.status !== 'completed') return false;
      const completedAt = new Date(s.finished_at || s.created_at);
      return completedAt < today;
    });

    const completedChange = todayCompleted.length - yesterdayCompleted.length;

    return [
      {
        label: 'Active Sessions',
        value: activeSessions.length,
        trend: `${activeSessions.length > 0 ? activeSessions.length : 0} ongoing`,
        trendUp: activeSessions.length > 0,
      },
      {
        label: 'Available Docks',
        value: availableDocks.length,
        trend: `${docks.length} total`,
        trendUp: null,
      },
      {
        label: 'Active Drivers',
        value: drivers.length,
        trend: 'registered',
        trendUp: null,
      },
      {
        label: 'Today Completed',
        value: todayCompleted.length,
        trend: completedChange >= 0 ? `+${completedChange} vs yesterday` : `${completedChange} vs yesterday`,
        trendUp: completedChange >= 0,
      },
    ];
  }, [sessions, docks, drivers]);

  /**
   * Dock status cards
   */
  const dockStatus = useMemo(() => {
    // Find which dock has which session
    const sessionByDock = sessions.reduce((acc, s) => {
      if (['loading', 'waiting'].includes(s.status) && s.dock_id) {
        acc[s.dock_id] = s;
      }
      return acc;
    }, {});

    return docks.map((dock) => {
      const session = sessionByDock[dock.id];
      return {
        code: dock.dock_code,
        name: dock.dock_name || dock.dock_code,
        status: dock.status,
        plate: session?.plate_number || null,
        driver: null, // Would need driver join
        reason: dock.status === 'maintenance' ? dock.maintenance_reason : null,
        sessionId: session?.id || null,
      };
    });
  }, [docks, sessions]);

  /**
   * Recent activity feed from sessions
   */
  const activity = useMemo(() => {
    const formatTimeAgo = (dateString) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);

      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins} min ago`;
      if (diffHours < 24) return `${diffHours} hr ago`;
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    };

    // Generate activity from sessions
    return sessions.slice(0, 10).map((s) => {
      let icon = '🔵';
      let text = '';
      let type = 'info';

      switch (s.status) {
        case 'loading':
          icon = '🟢';
          text = `Session started at dock ${s.dock_id?.slice(0, 8) || 'TBD'} - ${s.plate_number || 'Unknown plate'}`;
          type = 'success';
          break;
        case 'completed':
          icon = '✅';
          text = `Session completed - ${s.loading_count || 0} loaded, ${s.rehab_count || 0} rehab`;
          type = 'success';
          break;
        case 'cancelled':
          icon = '❌';
          text = `Session cancelled - ${s.plate_number || 'Unknown plate'}`;
          type = 'error';
          break;
        case 'waiting':
          icon = '🟡';
          text = `Truck waiting at dock - ${s.plate_number || 'Unknown plate'}`;
          type = 'warning';
          break;
        default:
          icon = '🔵';
          text = `Session ${s.status} - ${s.plate_number || 'Unknown plate'}`;
          type = 'info';
      }

      return {
        id: s.id,
        icon,
        text,
        time: formatTimeAgo(s.created_at),
        type,
      };
    });
  }, [sessions]);

  /**
   * Quick stats summary
   */
  const summary = useMemo(() => ({
    totalSessions: sessions.length,
    activeSessions: sessions.filter((s) => ['loading', 'waiting'].includes(s.status)).length,
    completedToday: sessions.filter((s) => s.status === 'completed').length,
    availableDocks: docks.filter((d) => d.status === 'available').length,
    totalDocks: docks.length,
    activeDrivers: drivers.length,
    loadingDocks: docks.filter((d) => d.status === 'loading').length,
    maintenanceDocks: docks.filter((d) => d.status === 'maintenance').length,
  }), [sessions, docks, drivers]);

  return {
    kpis,
    dockStatus,
    activity,
    summary,
    loading,
    error,
    refetch: fetchData,
  };
};

export default useDashboardStats;
