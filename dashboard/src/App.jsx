import React, { useState, useEffect } from 'react';
import { THEME } from './constants/theme';
import { LandingPage } from './pages';
import { LoginPage, SignupPage, ForgotPasswordPage } from './components/auth';
import WarehouseAIDashboard from './components/WarehouseAIDashboard';
import { AuthProvider, useAuth } from './contexts/AuthContext';

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
 * App Content Component
 * Handles routing and auth-based navigation
 */
const AppContent = () => {
  const { user, loading, isAuthenticated } = useAuth();
  const [currentPage, setCurrentPage] = useState('landing');

  // Redirect to dashboard if authenticated
  useEffect(() => {
    if (!loading && isAuthenticated && currentPage !== 'dashboard') {
      setCurrentPage('dashboard');
    }
  }, [isAuthenticated, loading, currentPage]);

  // Show loading while checking auth state
  if (loading) {
    return <LoadingSpinner />;
  }

  // Simple page router
  const renderPage = () => {
    // If user is authenticated and tries to access auth pages, redirect to dashboard
    if (isAuthenticated && ['login', 'signup', 'forgot-password'].includes(currentPage)) {
      return <WarehouseAIDashboard onNavigate={setCurrentPage} />;
    }

    // If user is not authenticated and tries to access dashboard, redirect to login
    if (!isAuthenticated && currentPage === 'dashboard') {
      return <LoginPage onNavigate={setCurrentPage} />;
    }

    switch (currentPage) {
      case 'landing':
        return <LandingPage onNavigate={setCurrentPage} />;
      case 'login':
        return <LoginPage onNavigate={setCurrentPage} />;
      case 'signup':
        return <SignupPage onNavigate={setCurrentPage} />;
      case 'forgot-password':
        return <ForgotPasswordPage onNavigate={setCurrentPage} />;
      case 'dashboard':
        return <WarehouseAIDashboard onNavigate={setCurrentPage} />;
      default:
        return <LandingPage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className={`${THEME.colors.bg} font-sans selection:bg-lime-200 selection:text-lime-900 min-h-screen`}>
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
