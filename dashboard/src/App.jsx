/**
 * App.jsx - Main Application Component
 * Uses React Router v6 with RouterProvider
 */

import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { router } from './routes';

/**
 * Main App Component
 * Wraps the app with AuthProvider and RouterProvider
 */
function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;
