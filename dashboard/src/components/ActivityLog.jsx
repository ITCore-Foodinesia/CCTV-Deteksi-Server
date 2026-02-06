import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Truck, Package, Inbox } from 'lucide-react';

/**
 * Color class mapping for Tailwind
 * IMPORTANT: Do NOT use dynamic class construction like `bg-${color}-100`
 * Tailwind purges unused classes at build time, so dynamic classes won't work.
 */
const COLOR_CLASSES = {
  emerald: {
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-600',
    badge: 'bg-emerald-50 text-emerald-600',
  },
  rose: {
    iconBg: 'bg-rose-100',
    iconText: 'text-rose-600',
    badge: 'bg-rose-50 text-rose-600',
  },
};

/**
 * Empty state component when no logs available
 */
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-12 px-4">
    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
      <Inbox className="w-8 h-8 text-gray-400" />
    </div>
    <h3 className="text-sm font-semibold text-gray-700 mb-1">
      Belum ada aktivitas
    </h3>
    <p className="text-xs text-gray-500 text-center max-w-[200px]">
      Aktivitas loading dan unloading akan muncul di sini secara real-time.
    </p>
  </div>
);

/**
 * Avatar component with fallback
 */
const DriverAvatar = ({ driverName }) => {
  const [hasError, setHasError] = React.useState(false);
  const initials = driverName
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'DR';

  if (hasError) {
    return (
      <div 
        className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-xs font-bold text-gray-600"
        aria-label={`Avatar for ${driverName}`}
      >
        {initials}
      </div>
    );
  }

  return (
    <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden">
      <img
        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${driverName}`}
        alt={`Avatar for ${driverName}`}
        onError={() => setHasError(true)}
        loading="lazy"
      />
    </div>
  );
};

/**
 * Single activity log item
 */
const ActivityItem = ({ log }) => {
  const isOut = log.type === 'outbound';
  const colorKey = isOut ? 'rose' : 'emerald';
  const colors = COLOR_CLASSES[colorKey];
  const Icon = isOut ? ArrowUpRight : ArrowDownLeft;
  const activityLabel = isOut ? 'Barang Keluar' : 'Barang Masuk';

  return (
    <article
      className="bg-white/60 p-4 rounded-2xl border border-white shadow-sm hover:shadow-md transition-all group focus-within:ring-2 focus-within:ring-lime-500"
      role="listitem"
      aria-label={`${activityLabel}: ${log.count} unit oleh ${log.driver}`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full ${colors.iconBg} flex items-center justify-center ${colors.iconText}`}
            aria-hidden="true"
          >
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-gray-800 text-sm">
              {activityLabel}
            </h4>
            <p className="text-xs text-gray-400 font-mono">{log.time} WIB</p>
          </div>
        </div>
        <span
          className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${colors.badge}`}
        >
          {log.item}
        </span>
      </div>

      <div className="bg-white/50 rounded-xl p-3 border border-white/50">
        <div className="flex items-center gap-3 mb-2">
          <DriverAvatar driverName={log.driver} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-700 truncate">{log.driver}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Truck className="w-3 h-3" aria-hidden="true" />
              <span>{log.plate}</span>
            </p>
          </div>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1 text-xs text-gray-600 font-bold">
            <Package className="w-3 h-3 text-amber-500" aria-hidden="true" />
            <span>{log.count} Unit</span>
          </div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            {log.status}
          </span>
        </div>
      </div>
    </article>
  );
};

/**
 * ActivityLog Component
 * Displays real-time activity feed with proper accessibility
 */
const ActivityLog = ({ logs = [] }) => {
  return (
    <div role="feed" aria-label="Activity Log" aria-busy={false}>
      {/* Live indicator */}
      <div className="flex items-center gap-2 mb-4 justify-center" aria-live="polite">
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
        </span>
        <span className="text-xs font-bold text-sky-500 uppercase tracking-widest">
          Listening for events...
        </span>
      </div>

      {/* Activity list or empty state */}
      {logs.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3" role="list">
          {logs.map((log) => (
            <ActivityItem key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityLog;
