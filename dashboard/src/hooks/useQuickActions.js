/**
 * useQuickActions Hook
 * 
 * Manages quick actions configuration per tenant.
 * Allows customization of order, visibility, and enabled state.
 * 
 * Stores config in localStorage with fallback to defaults.
 * Future: Sync with Supabase tenant_settings table.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Video, UserPlus, Users, Wrench, Truck, Building2 } from 'lucide-react';

// ============================================================
// AVAILABLE QUICK ACTIONS REGISTRY
// ============================================================

// All available quick actions that can be enabled
export const AVAILABLE_QUICK_ACTIONS = [
  {
    id: 'add-camera',
    label: 'Add Camera',
    description: 'Connect new CCTV to monitoring',
    iconName: 'Video',
    path: '/app/cameras?action=add',
    color: 'bg-blue-500 hover:bg-blue-600',
    category: 'setup',
  },
  {
    id: 'add-driver',
    label: 'Add Driver',
    description: 'Register truck driver',
    iconName: 'UserPlus',
    path: '/app/drivers?action=add',
    color: 'bg-green-500 hover:bg-green-600',
    category: 'personnel',
  },
  {
    id: 'add-helper',
    label: 'Add Helper',
    description: 'Register loading helper',
    iconName: 'Users',
    path: '/app/helpers?action=add',
    color: 'bg-emerald-500 hover:bg-emerald-600',
    category: 'personnel',
  },
  {
    id: 'add-loader',
    label: 'Add Loader',
    description: 'Register forklift/loader operator',
    iconName: 'Wrench',
    path: '/app/loaders?action=add',
    color: 'bg-teal-500 hover:bg-teal-600',
    category: 'personnel',
  },
  {
    id: 'add-truck',
    label: 'Add Truck',
    description: 'Register new truck/vehicle',
    iconName: 'Truck',
    path: '/app/trucks?action=add',
    color: 'bg-orange-500 hover:bg-orange-600',
    category: 'fleet',
  },
  {
    id: 'add-dock',
    label: 'Add Dock',
    description: 'Configure new loading dock',
    iconName: 'Building2',
    path: '/app/docks?action=add',
    color: 'bg-violet-500 hover:bg-violet-600',
    category: 'setup',
  },
];

// Icon mapping for dynamic rendering
const ICON_MAP = {
  Video,
  UserPlus,
  Users,
  Wrench,
  Truck,
  Building2,
};

// Default enabled actions
const DEFAULT_ENABLED = ['add-camera', 'add-driver', 'add-helper', 'add-loader'];

// Storage key
const STORAGE_KEY = 'warehouse_quick_actions_config';

// ============================================================
// HOOK
// ============================================================

const useQuickActions = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load config from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setConfig(JSON.parse(stored));
      } else {
        // Initialize with defaults
        const defaultConfig = DEFAULT_ENABLED.map((id, index) => ({
          id,
          enabled: true,
          order: index + 1,
        }));
        setConfig(defaultConfig);
      }
    } catch (err) {
      console.error('Failed to load quick actions config:', err);
      // Fallback to defaults
      const defaultConfig = DEFAULT_ENABLED.map((id, index) => ({
        id,
        enabled: true,
        order: index + 1,
      }));
      setConfig(defaultConfig);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save config to localStorage
  const saveConfig = useCallback((newConfig) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
      setConfig(newConfig);
    } catch (err) {
      console.error('Failed to save quick actions config:', err);
    }
  }, []);

  // Toggle action enabled/disabled
  const toggleAction = useCallback((actionId) => {
    setConfig((prev) => {
      const existing = prev?.find((a) => a.id === actionId);
      let newConfig;
      
      if (existing) {
        // Toggle existing
        newConfig = prev.map((a) =>
          a.id === actionId ? { ...a, enabled: !a.enabled } : a
        );
      } else {
        // Add new enabled action
        const maxOrder = Math.max(...(prev?.map((a) => a.order) || [0]));
        newConfig = [...(prev || []), { id: actionId, enabled: true, order: maxOrder + 1 }];
      }
      
      saveConfig(newConfig);
      return newConfig;
    });
  }, [saveConfig]);

  // Reorder actions (drag and drop)
  const reorderActions = useCallback((startIndex, endIndex) => {
    setConfig((prev) => {
      if (!prev) return prev;
      
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      
      // Update order numbers
      const newConfig = result.map((item, index) => ({
        ...item,
        order: index + 1,
      }));
      
      saveConfig(newConfig);
      return newConfig;
    });
  }, [saveConfig]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    const defaultConfig = DEFAULT_ENABLED.map((id, index) => ({
      id,
      enabled: true,
      order: index + 1,
    }));
    saveConfig(defaultConfig);
  }, [saveConfig]);

  // Get resolved actions with full data
  const resolvedActions = useMemo(() => {
    if (!config) return [];
    
    return config
      .filter((c) => c.enabled)
      .sort((a, b) => a.order - b.order)
      .map((c) => {
        const definition = AVAILABLE_QUICK_ACTIONS.find((a) => a.id === c.id);
        if (!definition) return null;
        
        return {
          ...definition,
          ...c,
          icon: ICON_MAP[definition.iconName],
        };
      })
      .filter(Boolean);
  }, [config]);

  // Get all actions with their current state (for settings page)
  const allActionsWithState = useMemo(() => {
    return AVAILABLE_QUICK_ACTIONS.map((action) => {
      const configItem = config?.find((c) => c.id === action.id);
      return {
        ...action,
        icon: ICON_MAP[action.iconName],
        enabled: configItem?.enabled ?? false,
        order: configItem?.order ?? 999,
      };
    });
  }, [config]);

  return {
    // Resolved actions ready for rendering
    actions: resolvedActions,
    
    // All actions with state for settings
    allActions: allActionsWithState,
    
    // Loading state
    loading,
    
    // Mutations
    toggleAction,
    reorderActions,
    resetToDefaults,
    
    // Raw config
    config,
  };
};

export default useQuickActions;
