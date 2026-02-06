/**
 * QuickActionsSettings Component
 * 
 * Settings panel for customizing Quick Actions on the dashboard.
 * Allows users to:
 * - Enable/disable individual actions
 * - Reorder actions (drag and drop - future)
 * - Reset to defaults
 * 
 * Accessibility: WCAG 2.1 AA compliant
 */

import React from 'react';
import { 
  RotateCcw, 
  GripVertical,
  CheckCircle2,
  Circle,
  ChevronRight,
} from 'lucide-react';
import { useQuickActions, AVAILABLE_QUICK_ACTIONS } from '../hooks';

// ============================================================
// SUB-COMPONENTS
// ============================================================

/**
 * Category Header
 */
const CategoryHeader = ({ title, count }) => (
  <div className="flex items-center justify-between py-2">
    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
      {title}
    </h4>
    <span className="text-xs text-gray-400">{count} actions</span>
  </div>
);

/**
 * Action Item Toggle
 */
const ActionToggle = ({ action, enabled, onToggle }) => {
  const Icon = action.icon;
  
  return (
    <button
      onClick={() => onToggle(action.id)}
      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all
                  ${enabled 
                    ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                  }
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-500`}
      aria-pressed={enabled}
      aria-label={`${enabled ? 'Disable' : 'Enable'} ${action.label}`}
    >
      {/* Drag Handle (for future drag-and-drop) */}
      <span className="text-gray-300 cursor-move" aria-hidden="true">
        <GripVertical className="h-4 w-4" />
      </span>
      
      {/* Icon */}
      <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
                        ${enabled ? action.color : 'bg-gray-100'}`}>
        <Icon className={`h-4 w-4 ${enabled ? 'text-white' : 'text-gray-400'}`} />
      </span>
      
      {/* Label & Description */}
      <div className="flex-1 text-left min-w-0">
        <div className={`font-medium text-sm ${enabled ? 'text-gray-900' : 'text-gray-500'}`}>
          {action.label}
        </div>
        <div className="text-xs text-gray-400 truncate">{action.description}</div>
      </div>
      
      {/* Status Indicator */}
      <span className="flex-shrink-0">
        {enabled ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden="true" />
        ) : (
          <Circle className="h-5 w-5 text-gray-300" aria-hidden="true" />
        )}
      </span>
    </button>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

const QuickActionsSettings = () => {
  const { 
    allActions, 
    toggleAction, 
    resetToDefaults, 
    loading,
    actions: enabledActions,
  } = useQuickActions();

  // Group actions by category
  const categories = {
    setup: { title: 'Setup & Configuration', actions: [] },
    personnel: { title: 'Personnel Management', actions: [] },
    fleet: { title: 'Fleet Management', actions: [] },
  };

  allActions.forEach((action) => {
    const category = action.category || 'setup';
    if (categories[category]) {
      categories[category].actions.push(action);
    }
  });

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          <p className="text-sm text-gray-500 mt-1">
            Customize which actions appear on your dashboard. 
            {enabledActions.length > 0 && (
              <span className="text-emerald-600 font-medium ml-1">
                {enabledActions.length} enabled
              </span>
            )}
          </p>
        </div>
        <button
          onClick={resetToDefaults}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 
                     hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
          aria-label="Reset to default quick actions"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Reset</span>
        </button>
      </div>

      {/* Preview */}
      {enabledActions.length > 0 && (
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-xs font-medium text-gray-500 mb-3">PREVIEW ORDER</p>
          <div className="flex flex-wrap gap-2">
            {enabledActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <div
                  key={action.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200 text-sm"
                >
                  <span className="text-xs text-gray-400">{index + 1}.</span>
                  <Icon className="h-3.5 w-3.5 text-gray-600" />
                  <span className="text-gray-700">{action.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Categories */}
      {Object.entries(categories).map(([key, category]) => {
        if (category.actions.length === 0) return null;
        
        return (
          <div key={key}>
            <CategoryHeader 
              title={category.title} 
              count={category.actions.length} 
            />
            <div className="space-y-2 mt-2">
              {category.actions.map((action) => (
                <ActionToggle
                  key={action.id}
                  action={action}
                  enabled={action.enabled}
                  onToggle={toggleAction}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Empty State */}
      {enabledActions.length === 0 && (
        <div className="text-center py-8 border border-dashed border-gray-300 rounded-xl">
          <p className="text-sm text-gray-500">No quick actions enabled</p>
          <p className="text-xs text-gray-400 mt-1">
            Enable at least one action to show on dashboard
          </p>
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-gray-400 flex items-start gap-2 p-3 bg-blue-50 rounded-xl">
        <span className="text-blue-500">💡</span>
        <p>
          Quick actions appear on your dashboard for fast access to common tasks. 
          Click an action to toggle its visibility. Drag to reorder (coming soon).
        </p>
      </div>
    </div>
  );
};

export default QuickActionsSettings;
