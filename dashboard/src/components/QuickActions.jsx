/**
 * QuickActions Component - Dashboard Quick Actions Panel
 * 
 * Features:
 * - Compact muted design (not visually competing with main content)
 * - Subtle left border color accent
 * - Customizable via Settings (uses useQuickActions hook)
 * - Accessible: WCAG 2.1 AA compliant
 * 
 * Design: Muted cards with colored left border, white background
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Settings, ChevronRight } from 'lucide-react';
import { useQuickActions } from '../hooks';

// ============================================================
// COLOR MAPPING (for left border accent)
// ============================================================

const BORDER_COLORS = {
  'bg-blue-500 hover:bg-blue-600': 'border-l-blue-500',
  'bg-green-500 hover:bg-green-600': 'border-l-green-500',
  'bg-emerald-500 hover:bg-emerald-600': 'border-l-emerald-500',
  'bg-teal-500 hover:bg-teal-600': 'border-l-teal-500',
  'bg-orange-500 hover:bg-orange-600': 'border-l-orange-500',
  'bg-violet-500 hover:bg-violet-600': 'border-l-violet-500',
};

const ICON_COLORS = {
  'bg-blue-500 hover:bg-blue-600': 'text-blue-600 bg-blue-50',
  'bg-green-500 hover:bg-green-600': 'text-green-600 bg-green-50',
  'bg-emerald-500 hover:bg-emerald-600': 'text-emerald-600 bg-emerald-50',
  'bg-teal-500 hover:bg-teal-600': 'text-teal-600 bg-teal-50',
  'bg-orange-500 hover:bg-orange-600': 'text-orange-600 bg-orange-50',
  'bg-violet-500 hover:bg-violet-600': 'text-violet-600 bg-violet-50',
};

// ============================================================
// SUB-COMPONENTS
// ============================================================

/**
 * Individual Quick Action Button - Muted/Subtle Style
 */
const QuickActionButton = ({ icon: Icon, label, color, path }) => {
  const borderColor = BORDER_COLORS[color] || 'border-l-gray-400';
  const iconColor = ICON_COLORS[color] || 'text-gray-600 bg-gray-100';
  
  return (
    <Link
      to={path}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border-l-4 
                  bg-white hover:bg-gray-50 transition-all duration-150
                  border border-gray-100 hover:border-gray-200
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-500
                  ${borderColor}`}
      aria-label={label}
    >
      <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${iconColor}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="flex-1 text-sm font-medium text-gray-700">
        {label}
      </span>
      <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" aria-hidden="true" />
    </Link>
  );
};

/**
 * Loading Skeleton
 */
const LoadingSkeleton = () => (
  <div className="space-y-2">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
    ))}
  </div>
);

// ============================================================
// MAIN COMPONENT
// ============================================================

/**
 * QuickActions Panel
 * 
 * @param {boolean} showCustomizeLink - Show link to customize in settings (default: true)
 * @param {number} maxItems - Maximum number of items to show (default: all)
 */
const QuickActions = ({ 
  showCustomizeLink = true,
  maxItems = null,
}) => {
  const { actions, loading } = useQuickActions();
  
  // Apply max items limit if specified
  const visibleActions = maxItems ? actions.slice(0, maxItems) : actions;

  return (
    <section 
      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
      aria-label="Quick Actions"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Quick Actions</h3>
        {showCustomizeLink && (
          <Link 
            to="/dashboard/settings?tab=quick-actions"
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
            aria-label="Customize quick actions"
          >
            <Settings className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Customize</span>
          </Link>
        )}
      </div>

      {/* Loading State */}
      {loading && <LoadingSkeleton />}

      {/* Actions List */}
      {!loading && visibleActions.length === 0 && (
        <div className="py-6 text-center">
          <p className="text-sm text-gray-500">No quick actions enabled</p>
          <Link 
            to="/dashboard/settings?tab=quick-actions"
            className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700"
          >
            <Settings className="h-3.5 w-3.5" />
            Configure in Settings
          </Link>
        </div>
      )}

      {!loading && visibleActions.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {visibleActions.map((action) => (
            <QuickActionButton
              key={action.id}
              icon={action.icon}
              label={action.label}
              color={action.color}
              path={action.path}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default QuickActions;
