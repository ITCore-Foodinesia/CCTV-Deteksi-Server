/**
 * DashboardOverview Page - Hybrid Operator Layout
 * 
 * Layout Structure:
 * - Top: KPI Ribbon (Active Sessions, Avail Docks, Active Drivers, Today Completed)
 * - Left (65%): Dock Status Grid + CCTV Thumbnails Section
 * - Right (35%): Quick Actions + Live Activity Feed
 * 
 * Accessibility: WCAG 2.1 AA compliant
 * Performance: Uses useMemo for computed values
 */

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Timer, 
  Building2, 
  Users, 
  CheckCircle2,
  Plus,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Activity,
  Loader2,
  RefreshCw,
  Truck,
  Clock,
  Video,
  Eye,
  Wrench,
  ChevronRight,
  Bell,
} from 'lucide-react';
import { useDashboardStats } from '../hooks';
import QuickActions from '../components/QuickActions';

// ============================================================
// CONSTANTS
// ============================================================

const DOCK_STATUS_STYLES = {
  available: {
    border: 'border-emerald-500',
    bg: 'bg-emerald-50',
    text: 'text-emerald-900',
    badge: 'bg-emerald-100 text-emerald-700',
    icon: CheckCircle2,
  },
  loading: {
    border: 'border-orange-500',
    bg: 'bg-orange-50',
    text: 'text-orange-900',
    badge: 'bg-orange-100 text-orange-700',
    icon: Loader2,
  },
  unloading: {
    border: 'border-blue-500',
    bg: 'bg-blue-50',
    text: 'text-blue-900',
    badge: 'bg-blue-100 text-blue-700',
    icon: Loader2,
  },
  maintenance: {
    border: 'border-red-500',
    bg: 'bg-red-50',
    text: 'text-red-900',
    badge: 'bg-red-100 text-red-700',
    icon: Wrench,
  },
  reserved: {
    border: 'border-violet-500',
    bg: 'bg-violet-50',
    text: 'text-violet-900',
    badge: 'bg-violet-100 text-violet-700',
    icon: Clock,
  },
  closed: {
    border: 'border-gray-400',
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    badge: 'bg-gray-100 text-gray-600',
    icon: Building2,
  },
};

const STATUS_LABELS = {
  available: 'Available',
  loading: 'Loading',
  unloading: 'Unloading',
  maintenance: 'Maintenance',
  reserved: 'Reserved',
  closed: 'Closed',
};

// ============================================================
// SUB-COMPONENTS
// ============================================================

/**
 * KPI Card - Hero style for key metrics
 */
const KPICard = ({ icon: Icon, label, value, trend, trendUp, color }) => (
  <article 
    className={`rounded-2xl border p-4 shadow-sm hover:shadow-md transition-shadow ${color}`}
    role="region"
    aria-label={`${label}: ${value}`}
  >
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-4 w-4 opacity-70" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
            {label}
          </span>
        </div>
        <div className="text-3xl font-black">{value}</div>
        {trend && (
          <div className={`mt-1 text-xs flex items-center gap-1 opacity-80`}>
            {trendUp === true && <TrendingUp className="h-3 w-3" aria-hidden="true" />}
            {trendUp === false && <TrendingDown className="h-3 w-3" aria-hidden="true" />}
            <span>{trend}</span>
          </div>
        )}
      </div>
    </div>
  </article>
);

/**
 * Dock Status Card - Compact without CCTV preview
 */
const DockCard = ({ code, name, status, plate, driver, reason }) => {
  const style = DOCK_STATUS_STYLES[status] || DOCK_STATUS_STYLES.closed;
  const StatusIcon = style.icon;
  const statusLabel = STATUS_LABELS[status] || status;
  
  return (
    <article 
      className={`rounded-2xl border-2 p-4 shadow-sm hover:shadow-md transition-all min-h-[140px] ${style.border} ${style.bg}`}
      role="listitem"
      aria-label={`${code} - ${statusLabel}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StatusIcon 
            className={`h-5 w-5 ${style.text} ${status === 'loading' || status === 'unloading' ? 'animate-spin' : ''}`} 
            aria-hidden="true" 
          />
          <div>
            <h3 className={`font-bold text-sm ${style.text}`}>{code}</h3>
            <p className="text-xs opacity-70">{name || code}</p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase ${style.badge}`}>
          {statusLabel}
        </span>
      </div>

      {/* Content */}
      {(plate || driver || reason) && (
        <div className={`pt-3 border-t ${style.border} border-opacity-30 space-y-1`}>
          {plate && (
            <div className="flex items-center gap-2 text-xs">
              <Truck className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
              <span className="font-mono font-medium">{plate}</span>
            </div>
          )}
          {driver && (
            <div className="flex items-center gap-2 text-xs opacity-80">
              <Users className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
              <span>{driver}</span>
            </div>
          )}
          {reason && (
            <div className="flex items-center gap-2 text-xs opacity-70">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{reason}</span>
            </div>
          )}
        </div>
      )}
    </article>
  );
};

/**
 * Activity Item
 */
const ActivityItem = ({ icon, text, time, type }) => {
  const typeStyles = {
    success: 'bg-emerald-100 text-emerald-600',
    warning: 'bg-amber-100 text-amber-600',
    error: 'bg-red-100 text-red-600',
    info: 'bg-blue-100 text-blue-600',
  };
  
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <span 
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${typeStyles[type] || typeStyles.info}`}
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700">{text}</p>
        <p className="text-xs text-gray-400 mt-0.5">{time}</p>
      </div>
    </div>
  );
};

/**
 * CCTV Preview Grid (Separate Section)
 */
const CCTVPreviewSection = () => (
  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <Video className="h-4 w-4 text-gray-500" aria-hidden="true" />
        Live Cameras
      </h3>
      <Link 
        to="/dashboard/live-streaming" 
        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
      >
        View all <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
    
    {/* Camera Grid - 2x2 preview */}
    <div className="grid grid-cols-2 gap-2">
      {[1, 2, 3, 4].map((cam) => (
        <div 
          key={cam}
          className="aspect-video bg-gray-900 rounded-xl flex items-center justify-center relative overflow-hidden group cursor-pointer"
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <Video className="h-8 w-8 text-gray-600" />
          </div>
          <div className="absolute bottom-2 left-2 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-white font-mono">CAM-0{cam}</span>
          </div>
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Eye className="h-6 w-6 text-white" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/**
 * Empty State for Docks
 */
const EmptyDocks = () => (
  <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
    <Building2 className="mx-auto h-10 w-10 text-gray-300" aria-hidden="true" />
    <p className="mt-2 text-sm font-medium text-gray-900">No docks configured</p>
    <p className="text-xs text-gray-500 mt-1">Add docks to start monitoring operations</p>
    <Link 
      to="/dashboard/docks"
      className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-lime-500 text-gray-900 font-semibold text-sm hover:bg-lime-600 transition-colors"
    >
      <Plus className="h-4 w-4" />
      Add Dock
    </Link>
  </div>
);

/**
 * Loading Skeleton
 */
const LoadingSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    {/* KPI Skeleton */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-24 bg-gray-200 rounded-2xl" />
      ))}
    </div>
    {/* Content Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 h-96 bg-gray-200 rounded-2xl" />
      <div className="h-96 bg-gray-200 rounded-2xl" />
    </div>
  </div>
);

/**
 * Error State
 */
const ErrorState = ({ message, onRetry }) => (
  <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
    <AlertTriangle className="mx-auto h-8 w-8 text-red-500" aria-hidden="true" />
    <p className="mt-2 text-sm font-medium text-red-800">Failed to load dashboard</p>
    <p className="text-xs text-red-600 mt-1">{message}</p>
    <button 
      onClick={onRetry}
      className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-100 text-red-700 font-semibold text-sm hover:bg-red-200 transition-colors"
    >
      <RefreshCw className="h-4 w-4" />
      Retry
    </button>
  </div>
);

// ============================================================
// MAIN COMPONENT
// ============================================================

const DashboardOverview = () => {
  const { kpis, dockStatus, activity, summary, loading, error, refetch } = useDashboardStats();

  // Map KPIs to styled cards
  const styledKPIs = useMemo(() => {
    const colors = [
      'border-emerald-200 bg-emerald-50 text-emerald-900',
      'border-blue-200 bg-blue-50 text-blue-900',
      'border-amber-200 bg-amber-50 text-amber-900',
      'border-violet-200 bg-violet-50 text-violet-900',
    ];
    const icons = [Activity, Building2, Users, CheckCircle2];
    
    return kpis.map((kpi, idx) => ({
      ...kpi,
      icon: icons[idx] || Activity,
      color: colors[idx] || colors[0],
    }));
  }, [kpis]);

  // Loading state
  if (loading) {
    return <LoadingSkeleton />;
  }

  // Error state
  if (error) {
    return <ErrorState message={error} onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back! Here's what's happening today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-white px-3 py-2 rounded-xl border border-gray-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live updates</span>
          </div>
          <button
            onClick={refetch}
            className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
            title="Refresh dashboard"
            aria-label="Refresh dashboard"
          >
            <RefreshCw className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </header>

      {/* KPI Ribbon */}
      <section aria-label="Key Performance Indicators">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {styledKPIs.map((kpi, idx) => (
            <KPICard key={idx} {...kpi} />
          ))}
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Dock Status + CCTV */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dock Status Section */}
          <section aria-label="Dock Status">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Dock Status</h2>
              <Link 
                to="/dashboard/docks" 
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
              >
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            
            {dockStatus.length === 0 ? (
              <EmptyDocks />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" role="list">
                {dockStatus.slice(0, 6).map((dock, idx) => (
                  <DockCard key={dock.code || idx} {...dock} />
                ))}
              </div>
            )}
          </section>

          {/* CCTV Preview Section */}
          <CCTVPreviewSection />
        </div>

        {/* Right Column - Actions & Activity */}
        <div className="space-y-6">
          {/* Quick Actions - Uses customizable component */}
          <QuickActions />

          {/* Recent Activity */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Bell className="h-4 w-4 text-gray-500" />
                Recent Activity
              </h3>
              <Link 
                to="/dashboard/history" 
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
              >
                View all
              </Link>
            </div>
            {activity.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                No recent activity
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                {activity.slice(0, 5).map((item) => (
                  <ActivityItem key={item.id} {...item} />
                ))}
              </div>
            )}
          </section>

          {/* Quick Summary */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Active Sessions</span>
                <span className="font-semibold text-gray-900">{summary.activeSessions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Available Docks</span>
                <span className="font-semibold text-emerald-600">
                  {summary.availableDocks}/{summary.totalDocks}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Loading</span>
                <span className="font-semibold text-orange-600">{summary.loadingDocks}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Maintenance</span>
                <span className="font-semibold text-red-600">{summary.maintenanceDocks}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
