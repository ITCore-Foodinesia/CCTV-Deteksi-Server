/**
 * DashboardOverview Page
 * Main dashboard with KPIs, dock status, quick actions, and activity feed
 * Uses MOCK/STATIC data for UI demonstration
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
} from 'lucide-react';
import { THEME } from '../constants/theme';

// ============================================================
// MOCK DATA (Static for UI demonstration)
// ============================================================

const MOCK_KPIS = [
  { label: 'Active Sessions', value: 3, icon: Timer, trend: '+2 today', trendUp: true },
  { label: 'Available Docks', value: 2, icon: Building2, trend: '4 total', trendUp: null },
  { label: 'Total Drivers', value: 15, icon: User, trend: '+1 this week', trendUp: true },
  { label: 'Today Completed', value: 8, icon: CheckCircle, trend: '95% success', trendUp: true },
];

const MOCK_DOCKS = [
  { code: 'D-01', name: 'Dock Utama 1', status: 'available' },
  { code: 'D-02', name: 'Dock Utama 2', status: 'loading', plate: 'B 1234 XY', driver: 'Budi Santoso' },
  { code: 'D-03', name: 'Dock Samping', status: 'available' },
  { code: 'D-04', name: 'Dock Maintenance', status: 'maintenance', reason: 'Perbaikan lantai' },
];

const MOCK_ACTIVITY = [
  { icon: '🟢', text: 'Driver "Budi" started loading at D-02', time: '2 min ago', type: 'success' },
  { icon: '🟡', text: 'Dock D-04 set to maintenance', time: '18 min ago', type: 'warning' },
  { icon: '🔵', text: 'Driver "Ahmad" completed at D-01', time: '35 min ago', type: 'info' },
  { icon: '🟢', text: 'New driver "Rudi" registered', time: '55 min ago', type: 'success' },
  { icon: '🔵', text: 'System health check passed', time: '1 hr ago', type: 'info' },
];

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
        <Icon className="h-5 w-5 text-gray-600" />
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
            {statusLabels[status]}
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
          <span>Last updated: just now</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {MOCK_KPIS.map((kpi, idx) => (
          <KPICard key={idx} {...kpi} />
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
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {MOCK_DOCKS.map((dock, idx) => (
              <DockStatusCard key={idx} {...dock} />
            ))}
          </div>
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
            <div className="divide-y divide-gray-100">
              {MOCK_ACTIVITY.slice(0, 4).map((activity, idx) => (
                <ActivityItem key={idx} {...activity} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
