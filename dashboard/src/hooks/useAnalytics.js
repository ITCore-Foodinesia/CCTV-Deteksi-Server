/**
 * useAnalytics - Hook for analytics page data
 *
 * Computes analytics from loading_sessions:
 * - Hourly/daily trends
 * - Dock utilization
 * - Driver performance
 * - Session KPIs
 *
 * @example
 * const { kpis, hourlyData, dockStats, driverStats, loading } = useAnalytics();
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook for analytics data
 *
 * @param {object} options - Options
 * @param {string} options.period - 'today', 'week', 'month' (default: 'week')
 * @returns {object} Analytics data
 */
export const useAnalytics = (options = {}) => {
  const { period = 'week' } = options;

  const [sessions, setSessions] = useState([]);
  const [docks, setDocks] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isMounted = useRef(true);

  /**
   * Calculate date range based on period
   */
  const getDateRange = useCallback(() => {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      default:
        start.setDate(start.getDate() - 7);
    }

    return { start, end };
  }, [period]);

  /**
   * Fetch analytics data
   */
  const fetchData = useCallback(async () => {
    if (!isMounted.current) return;

    setLoading(true);
    setError(null);

    try {
      const { start } = getDateRange();

      const [sessionsRes, docksRes, driversRes] = await Promise.all([
        supabase
          .from('loading_sessions')
          .select('id, status, started_at, finished_at, duration_seconds, dock_id, driver_id, loading_count, rehab_count, items_in, items_out, created_at')
          .gte('created_at', start.toISOString())
          .order('created_at', { ascending: true }),
        supabase
          .from('docks')
          .select('id, dock_code, dock_name, status')
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
      console.error('[useAnalytics] Error fetching data:', err);
      if (isMounted.current) {
        setError(err.message || 'Failed to fetch analytics data');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [getDateRange]);

  /**
   * Setup effect
   */
  useEffect(() => {
    isMounted.current = true;
    fetchData();

    return () => {
      isMounted.current = false;
    };
  }, [fetchData]);

  /**
   * KPIs calculation
   */
  const kpis = useMemo(() => {
    const completed = sessions.filter((s) => s.status === 'completed');
    const totalDuration = completed.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
    const avgDuration = completed.length > 0 ? Math.round(totalDuration / completed.length / 60) : 0;
    const totalItems = completed.reduce((sum, s) => sum + (s.loading_count || 0) + (s.rehab_count || 0), 0);

    // Calculate wait time (time from created_at to started_at)
    const waitTimes = completed
      .filter((s) => s.started_at)
      .map((s) => {
        const created = new Date(s.created_at);
        const started = new Date(s.started_at);
        return Math.max(0, (started - created) / 60000); // in minutes
      });
    const avgWaitTime = waitTimes.length > 0
      ? Math.round(waitTimes.reduce((sum, w) => sum + w, 0) / waitTimes.length)
      : 0;

    // Previous period for trend comparison
    const midPoint = new Date(getDateRange().start);
    midPoint.setTime(midPoint.getTime() + (new Date() - midPoint) / 2);

    const firstHalfCompleted = completed.filter((s) => new Date(s.created_at) < midPoint).length;
    const secondHalfCompleted = completed.filter((s) => new Date(s.created_at) >= midPoint).length;
    const completedTrend = firstHalfCompleted > 0
      ? Math.round(((secondHalfCompleted - firstHalfCompleted) / firstHalfCompleted) * 100)
      : 0;

    return {
      dailySessions: {
        value: Math.round(completed.length / (period === 'today' ? 1 : period === 'week' ? 7 : 30)),
        change: completedTrend,
        trend: completedTrend >= 0 ? 'up' : 'down',
      },
      avgDuration: {
        value: avgDuration,
        unit: 'min',
        change: 0, // Would need historical data to calculate
        trend: 'stable',
      },
      avgWaitTime: {
        value: avgWaitTime,
        unit: 'min',
        change: 0,
        trend: avgWaitTime < 20 ? 'down' : 'up', // Good if under 20 min
      },
      totalItems: {
        value: totalItems,
        change: 0,
        trend: 'stable',
      },
      completionRate: {
        value: sessions.length > 0 ? Math.round((completed.length / sessions.length) * 100) : 0,
        unit: '%',
        change: 0,
        trend: 'stable',
      },
      totalSessions: {
        value: sessions.length,
        change: completedTrend,
        trend: completedTrend >= 0 ? 'up' : 'down',
      },
    };
  }, [sessions, period, getDateRange]);

  /**
   * Hourly data for charts
   */
  const hourlyData = useMemo(() => {
    // Group sessions by hour
    const hourlyMap = {};
    for (let i = 0; i < 24; i++) {
      hourlyMap[i] = { hour: i, sessions: 0, items: 0, avgDuration: 0 };
    }

    sessions.forEach((s) => {
      const hour = new Date(s.created_at).getHours();
      hourlyMap[hour].sessions += 1;
      hourlyMap[hour].items += (s.loading_count || 0) + (s.rehab_count || 0);
    });

    // Convert to array and format for charts
    return Object.values(hourlyMap).map((h) => ({
      hour: `${h.hour.toString().padStart(2, '0')}:00`,
      sessions: h.sessions,
      items: h.items,
    }));
  }, [sessions]);

  /**
   * Daily data for charts
   */
  const dailyData = useMemo(() => {
    const dailyMap = {};
    const { start } = getDateRange();
    const days = period === 'today' ? 1 : period === 'week' ? 7 : 30;

    // Initialize all days
    for (let i = 0; i < days; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const key = date.toISOString().split('T')[0];
      dailyMap[key] = { date: key, sessions: 0, items: 0, completed: 0 };
    }

    // Populate with session data
    sessions.forEach((s) => {
      const key = new Date(s.created_at).toISOString().split('T')[0];
      if (dailyMap[key]) {
        dailyMap[key].sessions += 1;
        dailyMap[key].items += (s.loading_count || 0) + (s.rehab_count || 0);
        if (s.status === 'completed') {
          dailyMap[key].completed += 1;
        }
      }
    });

    return Object.values(dailyMap);
  }, [sessions, period, getDateRange]);

  /**
   * Dock utilization stats
   */
  const dockStats = useMemo(() => {
    // Count sessions per dock
    const sessionsByDock = sessions.reduce((acc, s) => {
      if (s.dock_id) {
        acc[s.dock_id] = (acc[s.dock_id] || 0) + 1;
      }
      return acc;
    }, {});

    // Calculate duration per dock
    const durationByDock = sessions.reduce((acc, s) => {
      if (s.dock_id && s.duration_seconds) {
        if (!acc[s.dock_id]) {
          acc[s.dock_id] = { total: 0, count: 0 };
        }
        acc[s.dock_id].total += s.duration_seconds;
        acc[s.dock_id].count += 1;
      }
      return acc;
    }, {});

    return docks.map((dock) => ({
      id: dock.id,
      code: dock.dock_code,
      name: dock.dock_name || dock.dock_code,
      status: dock.status,
      sessions: sessionsByDock[dock.id] || 0,
      avgDuration: durationByDock[dock.id]
        ? Math.round(durationByDock[dock.id].total / durationByDock[dock.id].count / 60)
        : 0,
      utilization: sessions.length > 0
        ? Math.round(((sessionsByDock[dock.id] || 0) / sessions.length) * 100)
        : 0,
    }));
  }, [sessions, docks]);

  /**
   * Driver performance stats
   */
  const driverStats = useMemo(() => {
    // Count sessions per driver
    const sessionsByDriver = sessions.reduce((acc, s) => {
      if (s.driver_id) {
        if (!acc[s.driver_id]) {
          acc[s.driver_id] = { sessions: 0, completed: 0, items: 0, duration: 0 };
        }
        acc[s.driver_id].sessions += 1;
        if (s.status === 'completed') {
          acc[s.driver_id].completed += 1;
        }
        acc[s.driver_id].items += (s.loading_count || 0) + (s.rehab_count || 0);
        acc[s.driver_id].duration += s.duration_seconds || 0;
      }
      return acc;
    }, {});

    return drivers.map((driver) => {
      const stats = sessionsByDriver[driver.id] || { sessions: 0, completed: 0, items: 0, duration: 0 };
      return {
        id: driver.id,
        name: driver.name,
        status: driver.status,
        sessions: stats.sessions,
        completed: stats.completed,
        completionRate: stats.sessions > 0 ? Math.round((stats.completed / stats.sessions) * 100) : 0,
        totalItems: stats.items,
        avgDuration: stats.completed > 0 ? Math.round(stats.duration / stats.completed / 60) : 0,
      };
    }).sort((a, b) => b.sessions - a.sessions);
  }, [sessions, drivers]);

  return {
    kpis,
    hourlyData,
    dailyData,
    dockStats,
    driverStats,
    loading,
    error,
    refetch: fetchData,
  };
};

export default useAnalytics;
