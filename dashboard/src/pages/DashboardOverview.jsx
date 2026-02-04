/**
 * DashboardOverview Page
 * Main dashboard with KPIs, dock status, quick actions, and activity feed
 * Uses Supabase Real-time for live updates.
 */

import React from 'react';
import { 
  Timer, 
  Building2, 
  User, 
  CheckCircle,
  Plus,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Activity,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { THEME } from '../constants/theme';
import { useDashboardStats } from '../hooks';

// ============================================================
// Quick Actions (static)
// ============================================================

const QUICK_ACTIONS = [
  { label: 'Start Loading', icon: Plus, color: 'bg-emerald-500 hover:bg-emerald-600' },
  { label: 'Report Issue', icon: AlertTriangle, color: 'bg-orange-500 hover:bg-orange-600' },
  { label: 'View Reports', icon: TrendingUp, color: 'bg-blue-500 hover:bg-blue-600' },
];

// ============================================================
// SUB-COMPONENTS
// ============================================================

/**
 * KPI Card - displays a single metric
 */
const KPICard = ({ label, value, icon: Icon, trend, trendUp }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm text-gray-500">{label}</div>
        <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
        {trend && (
          <div className={`mt-1 text-xs flex items-center gap-1 ${
            trendUp === true ? 'text-emerald-600' : 
            trendUp === false ? 'text-red-600' : 
            'text-gray-500'
          }`}>
            {trendUp === true && <TrendingUp className="h-3 w-3" />}
            {trend}
          </div>
        )}
      </div>
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gray-100">
        {Icon && <Icon className="h-5 w-5 text-gray-600" />}
      </div>
    </div>
  </div>
);

/**
 * Dock Status Card - shows dock availability
 */
const DockStatusCard = ({ code, name, status, plate, driver, reason }) => {
  const statusClass = THEME.dockStatus[status] || THEME.dockStatus.closed;
  
  const statusLabels = {
    available: 'Available',
    loading: 'Loading',
    unloading: 'Unloading',
    maintenance: 'Maintenance',
    reserved: 'Reserved',
    closed: 'Closed',
  };

  return (
    <div className={`rounded-2xl border-2 p-4 shadow-sm ${statusClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="text-sm font-semibold">{code}</div>
          <div className="text-xs opacity-80">{name}</div>
          <div className="mt-1 text-xs uppercase tracking-wider opacity-80 font-medium">
            {statusLabels[status] || status}
          </div>
          {plate && (
            <div className="mt-2 text-xs font-medium">
              🚚 {plate}
              {driver && <span className="opacity-80"> • {driver}</span>}
            </div>
          )}
          {reason && (
            <div className="mt-2 text-xs opacity-80">
              ⚠️ {reason}
            </div>
          )}
        </div>
        <button className="rounded-xl bg-white/70 px-3 py-2 text-xs font-semibold hover:bg-white transition-colors">
          Details
        </button>
      </div>
    </div>
  );
};

/**
 * Quick Action Button
 */
const QuickActionButton = ({ label, icon: Icon, color }) => (
  <button className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors ${color}`}>
    <Icon className="h-4 w-4" />
    {label}
  </button>
);

/**
 * Activity Item
 */
const ActivityItem = ({ icon, text, time }) => (
  <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
    <span className="text-lg">{icon}</span>
    <div className="flex-1 min-w-0">
      <p className="text-sm text-gray-700 truncate">{text}</p>
      <p className="text-xs text-gray-400 mt-0.5">{time}</p>
    </div>
  </div>
);

// ============================================================
// MAIN COMPONENT
// ============================================================

const DashboardOverview = () => {
  const { kpis, dockStatus, activity, summary, loading, error, refetch } = useDashboardStats();

  // Map KPIs to icons
  const kpiIcons = [Timer, Building2, User, CheckCircle];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading dashboard...</span>
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back! Here's what's happening today.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Activity className="h-4 w-4" />
          <span>Live updates enabled</span>
          <button
            onClick={refetch}
            className="ml-2 rounded-lg p-1 hover:bg-gray-100"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <KPICard key={idx} {...kpi} icon={kpiIcons[idx]} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Dock Status */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Dock Status</h2>
            <button className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
              View all <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          
          {dockStatus.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
              <Building2 className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">No docks configured</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {dockStatus.slice(0, 6).map((dock, idx) => (
                <DockStatusCard key={idx} {...dock} />
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Quick Actions & Activity */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
            <div className="flex flex-wrap gap-2">
              {QUICK_ACTIONS.map((action, idx) => (
                <QuickActionButton key={idx} {...action} />
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
              <button className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                View all
              </button>
            </div>
            {activity.length === 0 ? (
              <div className="py-4 text-center text-sm text-gray-500">
                No recent activity
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {activity.slice(0, 5).map((item, idx) => (
                  <ActivityItem key={idx} {...item} />
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats Summary */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Active Sessions</span>
                <span className="font-medium">{summary.activeSessions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Available Docks</span>
                <span className="font-medium text-emerald-600">{summary.availableDocks}/{summary.totalDocks}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Loading</span>
                <span className="font-medium text-blue-600">{summary.loadingDocks}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Maintenance</span>
                <span className="font-medium text-amber-600">{summary.maintenanceDocks}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
