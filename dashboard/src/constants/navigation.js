/**
 * Navigation Configuration for GudangAI Admin Panel
 * Defines sidebar menu structure with groups and items
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

export const NAVIGATION = [
  {
    group: 'main',
    label: 'MAIN',
    items: [
      {
        key: 'dashboard-overview',
        label: 'Dashboard',
        icon: LayoutDashboard,
        page: 'dashboard-overview',
        enabled: true,
      },
      {
        key: 'live-streaming',
        label: 'Live Streaming',
        icon: Video,
        page: 'live-streaming',
        enabled: true,
        indent: true,
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
        page: 'drivers',
        enabled: false,
      },
      {
        key: 'trucks',
        label: 'Trucks',
        icon: Truck,
        page: 'trucks',
        enabled: false,
      },
      {
        key: 'docks',
        label: 'Docks',
        icon: Building2,
        page: 'docks',
        enabled: false,
      },
      {
        key: 'helpers',
        label: 'Helpers',
        icon: HardHat,
        page: 'helpers',
        enabled: false,
      },
      {
        key: 'loaders',
        label: 'Loaders',
        icon: Package,
        page: 'loaders',
        enabled: false,
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
        page: 'sessions',
        enabled: false,
      },
      {
        key: 'history',
        label: 'History',
        icon: History,
        page: 'history',
        enabled: false,
      },
      {
        key: 'notifications',
        label: 'Notifications',
        icon: Bell,
        page: 'notifications',
        enabled: false,
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
        page: 'cameras',
        enabled: false,
      },
      {
        key: 'users',
        label: 'Users & Roles',
        icon: Users,
        page: 'users',
        enabled: false,
      },
      {
        key: 'settings',
        label: 'Settings',
        icon: Settings,
        page: 'settings',
        enabled: false,
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
        page: 'reports',
        enabled: false,
      },
      {
        key: 'analytics',
        label: 'Analytics',
        icon: TrendingUp,
        page: 'analytics',
        enabled: false,
      },
    ],
  },
];

export default NAVIGATION;
