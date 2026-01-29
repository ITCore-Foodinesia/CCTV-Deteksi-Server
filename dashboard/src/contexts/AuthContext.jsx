/**
 * Authentication Context
 * 
 * Provides authentication state and methods to the entire app.
 * Handles:
 * - User session management
 * - Sign in/up with email/password
 * - Google OAuth sign in
 * - Password reset
 * - Session persistence and auto-refresh
 * - DEMO MODE: For testing UI without real auth
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Demo mode flag - set to true to bypass auth for UI testing
const DEMO_MODE = true;

// Demo user for testing
const DEMO_USER = {
  id: 'demo-user-001',
  email: 'demo@gudangai.com',
  user_metadata: {
    full_name: 'Demo Admin',
    company: 'GudangAI Demo',
  },
};

// Create the context
const AuthContext = createContext(null);

/**
 * Custom hook to access auth context
 * @returns {Object} Auth context value
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Auth Provider Component
 * Wraps the app and provides auth state/methods
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(DEMO_MODE ? DEMO_USER : null);
  const [session, setSession] = useState(DEMO_MODE ? { user: DEMO_USER } : null);
  const [loading, setLoading] = useState(DEMO_MODE ? false : true);
  const [error, setError] = useState(null);

  // Initialize auth state on mount
  useEffect(() => {
    // Skip real auth in demo mode
    if (DEMO_MODE) {
      console.log('🎭 DEMO MODE: Auth bypassed for UI testing');
      return;
    }

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession }, error: sessionError } = 
          await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error getting session:', sessionError);
        }
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth event:', event);
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
        
        // Clear error on successful auth events
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setError(null);
        }
      }
    );

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Sign in with email and password
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const signIn = async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return { success: false, error: signInError.message };
      }

      return { success: true, user: data.user };
    } catch (err) {
      const errorMessage = err.message || 'An unexpected error occurred';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign up with email and password
   * @param {string} email 
   * @param {string} password 
   * @param {Object} metadata - Additional user metadata (fullName, company)
   * @returns {Promise<{success: boolean, error?: string, needsConfirmation?: boolean}>}
   */
  const signUp = async (email, password, metadata = {}) => {
    try {
      setError(null);
      setLoading(true);
      
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: metadata.fullName || '',
            company: metadata.company || '',
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return { success: false, error: signUpError.message };
      }

      // Check if email confirmation is required
      // If user.identities is empty, email confirmation is pending
      const needsConfirmation = data.user && 
        (!data.user.identities || data.user.identities.length === 0);

      return { 
        success: true, 
        user: data.user,
        needsConfirmation,
      };
    } catch (err) {
      const errorMessage = err.message || 'An unexpected error occurred';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign in with Google OAuth
   * Redirects to Google login page
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const signInWithGoogle = async () => {
    try {
      setError(null);
      
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        return { success: false, error: oauthError.message };
      }

      // OAuth redirects, so we won't reach here on success
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || 'An unexpected error occurred';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  /**
   * Sign out the current user
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const signOut = async () => {
    try {
      setError(null);
      
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        setError(signOutError.message);
        return { success: false, error: signOutError.message };
      }

      return { success: true };
    } catch (err) {
      const errorMessage = err.message || 'An unexpected error occurred';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  /**
   * Send password reset email
   * @param {string} email 
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const resetPassword = async (email) => {
    try {
      setError(null);
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
        return { success: false, error: resetError.message };
      }

      return { success: true };
    } catch (err) {
      const errorMessage = err.message || 'An unexpected error occurred';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  /**
   * Clear any auth errors
   */
  const clearError = () => {
    setError(null);
  };

  // Context value
  const value = {
    // State
    user,
    session,
    loading,
    error,
    isAuthenticated: !!user,
    
    // Methods
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
