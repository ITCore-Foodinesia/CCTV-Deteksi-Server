/**
 * Application Routes Configuration
 * Defines all routes using React Router v6
 */

import { createBrowserRouter, Navigate } from 'react-router-dom';

// Layouts
import DashboardLayout from '../layouts/DashboardLayout';

// Pages
import {
  LandingPage,
  DashboardOverview,
  LiveStreamingPage,
  ComingSoonPage,
  DriversPage,
  TrucksPage,
  DocksPage,
  HelpersPage,
  LoadersPage,
  SessionsPage,
  HistoryPage,
  NotificationsPage,
  CamerasPage,
  UsersPage,
  SettingsPage,
  ReportsPage,
  AnalyticsPage,
} from '../pages';

// Auth Pages
import { LoginPage, SignupPage, ForgotPasswordPage } from '../components/auth';

// Route Protection
import ProtectedRoute from './ProtectedRoute';

/**
 * Main Router Configuration
 */
export const router = createBrowserRouter([
  // Public Routes
  {
    path: '/',
    element: <LandingPage />,
  },
  
  // Auth Routes (each page uses AuthLayout internally)
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/signup',
    element: <SignupPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },

  // Protected Dashboard Routes
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      // Default redirect to overview
      {
        index: true,
        element: <Navigate to="/dashboard/overview" replace />,
      },
      
      // Main
      {
        path: 'overview',
        element: <DashboardOverview />,
      },
      {
        path: 'live-streaming',
        element: <LiveStreamingPage />,
      },

      // Operasional
      {
        path: 'drivers',
        element: <DriversPage />,
      },
      {
        path: 'trucks',
        element: <TrucksPage />,
      },
      {
        path: 'docks',
        element: <DocksPage />,
      },
      {
        path: 'helpers',
        element: <HelpersPage />,
      },
      {
        path: 'loaders',
        element: <LoadersPage />,
      },

      // Aktivitas
      {
        path: 'sessions',
        element: <SessionsPage />,
      },
      {
        path: 'history',
        element: <HistoryPage />,
      },
      {
        path: 'notifications',
        element: <NotificationsPage />,
      },

      // Sistem
      {
        path: 'cameras',
        element: <CamerasPage />,
      },
      {
        path: 'users',
        element: <UsersPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },

      // Laporan
      {
        path: 'reports',
        element: <ReportsPage />,
      },
      {
        path: 'analytics',
        element: <AnalyticsPage />,
      },

      // Catch-all for coming soon pages
      {
        path: '*',
        element: <ComingSoonPage />,
      },
    ],
  },

  // Catch-all redirect
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default router;
