import React, { useState, useEffect } from 'react';
import { THEME } from './constants/theme';
import { LandingPage, DashboardOverview } from './pages';
import { LoginPage, SignupPage, ForgotPasswordPage } from './components/auth';
import { DashboardShell } from './components/layout';
import WarehouseAIDashboard from './components/WarehouseAIDashboard';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useWebSocket } from './hooks/useWebSocket';

/**
 * Loading Spinner Component
 * Shown while checking auth state
 */
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#F5F7F2]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-[#a3e635] border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

/**
 * Dashboard Content Router
 * Renders the appropriate page content inside DashboardShell
 */
const DashboardContentRouter = ({ currentPage, onNavigate }) => {
  // WebSocket connection for real-time data
  const { connected } = useWebSocket();

  // Render the appropriate dashboard page
  const renderDashboardPage = () => {
    switch (currentPage) {
      case 'dashboard-overview':
        return <DashboardOverview />;
      case 'live-streaming':
        // Wrap existing WarehouseAIDashboard as Live Streaming page
        return <WarehouseAIDashboard onNavigate={onNavigate} embedded={true} />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <DashboardShell
      currentPage={currentPage}
      onNavigate={onNavigate}
      connected={connected}
    >
      {renderDashboardPage()}
    </DashboardShell>
  );
};

/**
 * App Content Component
 * Handles routing and auth-based navigation
 */
const AppContent = () => {
  const { user, loading, isAuthenticated } = useAuth();
  const [currentPage, setCurrentPage] = useState('landing');

  // Redirect to dashboard-overview if authenticated
  useEffect(() => {
    if (!loading && isAuthenticated && !isDashboardPage(currentPage)) {
      setCurrentPage('dashboard-overview');
    }
  }, [isAuthenticated, loading, currentPage]);

  // Check if current page is a dashboard page
  const isDashboardPage = (page) => {
    const dashboardPages = [
      'dashboard-overview',
      'live-streaming',
      'drivers',
      'trucks',
      'docks',
      'helpers',
      'loaders',
      'sessions',
      'history',
      'notifications',
      'cameras',
      'users',
      'settings',
      'reports',
      'analytics',
    ];
    return dashboardPages.includes(page);
  };

  // Show loading while checking auth state
  if (loading) {
    return <LoadingSpinner />;
  }

  // Simple page router
  const renderPage = () => {
    // If user is authenticated and tries to access auth pages, redirect to dashboard
    if (isAuthenticated && ['login', 'signup', 'forgot-password'].includes(currentPage)) {
      return <DashboardContentRouter currentPage="dashboard-overview" onNavigate={setCurrentPage} />;
    }

    // If user is not authenticated and tries to access dashboard pages, redirect to login
    if (!isAuthenticated && isDashboardPage(currentPage)) {
      return <LoginPage onNavigate={setCurrentPage} />;
    }

    // Route to appropriate page
    switch (currentPage) {
      case 'landing':
        return <LandingPage onNavigate={setCurrentPage} />;
      case 'login':
        return <LoginPage onNavigate={setCurrentPage} />;
      case 'signup':
        return <SignupPage onNavigate={setCurrentPage} />;
      case 'forgot-password':
        return <ForgotPasswordPage onNavigate={setCurrentPage} />;
      
      // Dashboard pages (wrapped in DashboardShell)
      case 'dashboard-overview':
      case 'live-streaming':
      case 'drivers':
      case 'trucks':
      case 'docks':
      case 'helpers':
      case 'loaders':
      case 'sessions':
      case 'history':
      case 'notifications':
      case 'cameras':
      case 'users':
      case 'settings':
      case 'reports':
      case 'analytics':
        return <DashboardContentRouter currentPage={currentPage} onNavigate={setCurrentPage} />;
      
      // Legacy dashboard route (redirect to new overview)
      case 'dashboard':
        return <DashboardContentRouter currentPage="dashboard-overview" onNavigate={setCurrentPage} />;
      
      default:
        return <LandingPage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className={`font-sans selection:bg-lime-200 selection:text-lime-900 min-h-screen`}>
      {renderPage()}
    </div>
  );
};

/**
 * Main App Component
 * Wraps the app with AuthProvider for global auth state
 */
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
