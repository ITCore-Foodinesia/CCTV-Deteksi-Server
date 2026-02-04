/**
 * App.jsx - Main Application Component
 * Uses React Router v6 with RouterProvider
 * Wrapped with ErrorBoundary for global error handling
 */

import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorBoundary } from './components/shared';
import { router } from './routes';

/**
 * Main App Component
 * Wraps the app with ErrorBoundary, AuthProvider, and RouterProvider
 * 
 * Error Boundary catches runtime errors and shows a fallback UI
 * instead of crashing the entire application
 */
function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
