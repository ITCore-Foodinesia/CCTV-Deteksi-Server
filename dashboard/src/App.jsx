import React, { useState } from 'react';
import { THEME } from './constants/theme';
import { LandingPage } from './pages';
import { LoginPage, SignupPage, ForgotPasswordPage } from './components/auth';
import WarehouseAIDashboard from './components/WarehouseAIDashboard';

/**
 * Main App Component
 * Handles routing between landing, auth, and dashboard pages
 */
function App() {
  const [currentPage, setCurrentPage] = useState('landing');

  // Simple page router
  const renderPage = () => {
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
}

export default App;
