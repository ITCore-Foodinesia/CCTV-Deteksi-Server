/**
 * Hooks Index
 *
 * Central export for all custom hooks used in the Dashboard.
 * Import hooks from here for cleaner imports.
 *
 * @example
 * import { useDrivers, useSessions, useDocks } from '../hooks';
 */

// Generic Supabase hook
export { useSupabaseTable } from './useSupabaseTable';

// Entity-specific hooks (Phase 1 - Core Data)
export { useDrivers } from './useDrivers';
export { useDocks, DOCK_STATUS } from './useDocks';
export { useTrucks } from './useTrucks';
export { useSessions, SESSION_STATUS } from './useSessions';
export { useHelpers, HELPER_STATUS } from './useHelpers';
export { useLoaders, LOADER_STATUS } from './useLoaders';

// Phase 2 - Additional Features
export { useNotifications, NOTIFICATION_TYPE } from './useNotifications';
export { useCameras, CAMERA_STATUS } from './useCameras';
export { useDashboardStats } from './useDashboardStats';
export { useAnalytics } from './useAnalytics';
export { useTenantSettings, DEFAULT_SETTINGS } from './useTenantSettings';
export { useUserTenants, USER_ROLE, ROLE_DESCRIPTIONS } from './useUserTenants';

// WebSocket hook (existing)
export { useWebSocket } from './useWebSocket';
