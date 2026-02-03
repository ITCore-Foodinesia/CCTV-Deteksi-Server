/**
 * Navigation Configuration
 * Defines sidebar menu structure with React Router paths
 */

import {
  LayoutDashboard,
  Video,
  User,
  Truck,
  Building2,
  HardHat,
  Package,
  Timer,
  History,
  Bell,
  Camera,
  Users,
  Settings,
  BarChart3,
  TrendingUp,
} from 'lucide-react';

/**
 * Navigation menu configuration
 * Each item has:
 * - key: unique identifier
 * - label: display text
 * - icon: Lucide icon component
 * - path: React Router path (relative to /dashboard)
 * - enabled: whether the menu item is clickable
 * - roles: (optional) which roles can see this item
 */
export const NAVIGATION = [
  {
    group: 'main',
    label: 'MAIN',
    items: [
      {
        key: 'dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        path: '/dashboard/overview',
        enabled: true,
      },
      {
        key: 'live-streaming',
        label: 'Live Streaming',
        icon: Video,
        path: '/dashboard/live-streaming',
        enabled: true,
      },
    ],
  },
  {
    group: 'operasional',
    label: 'OPERASIONAL',
    items: [
      {
        key: 'drivers',
        label: 'Drivers',
        icon: User,
        path: '/dashboard/drivers',
        enabled: true,
      },
      {
        key: 'trucks',
        label: 'Trucks',
        icon: Truck,
        path: '/dashboard/trucks',
        enabled: true,
      },
      {
        key: 'docks',
        label: 'Docks',
        icon: Building2,
        path: '/dashboard/docks',
        enabled: true,
      },
      {
        key: 'helpers',
        label: 'Helpers',
        icon: HardHat,
        path: '/dashboard/helpers',
        enabled: true,
      },
      {
        key: 'loaders',
        label: 'Loaders',
        icon: Package,
        path: '/dashboard/loaders',
        enabled: true,
      },
    ],
  },
  {
    group: 'aktivitas',
    label: 'AKTIVITAS',
    items: [
      {
        key: 'sessions',
        label: 'Loading Sessions',
        icon: Timer,
        path: '/dashboard/sessions',
        enabled: true,
      },
      {
        key: 'history',
        label: 'History',
        icon: History,
        path: '/dashboard/history',
        enabled: true,
      },
      {
        key: 'notifications',
        label: 'Notifications',
        icon: Bell,
        path: '/dashboard/notifications',
        enabled: true,
      },
    ],
  },
  {
    group: 'sistem',
    label: 'SISTEM',
    items: [
      {
        key: 'cameras',
        label: 'Cameras',
        icon: Camera,
        path: '/dashboard/cameras',
        enabled: true,
      },
      {
        key: 'users',
        label: 'Users & Roles',
        icon: Users,
        path: '/dashboard/users',
        enabled: true,
        roles: ['owner'], // Only visible to owner
      },
      {
        key: 'settings',
        label: 'Settings',
        icon: Settings,
        path: '/dashboard/settings',
        enabled: true,
        roles: ['owner'], // Only visible to owner
      },
    ],
  },
  {
    group: 'laporan',
    label: 'LAPORAN',
    items: [
      {
        key: 'reports',
        label: 'Reports',
        icon: BarChart3,
        path: '/dashboard/reports',
        enabled: true,
      },
      {
        key: 'analytics',
        label: 'Analytics',
        icon: TrendingUp,
        path: '/dashboard/analytics',
        enabled: true,
      },
    ],
  },
];

/**
 * Get flat list of all navigation items
 */
export const getAllNavItems = () => {
  return NAVIGATION.flatMap((group) => group.items);
};

/**
 * Find navigation item by path
 */
export const findNavItemByPath = (path) => {
  return getAllNavItems().find((item) => item.path === path);
};

/**
 * Check if user role has access to navigation item
 */
export const hasAccessToNavItem = (item, userRole) => {
  if (!item.roles) return true;
  return item.roles.includes(userRole);
};

export default NAVIGATION;
