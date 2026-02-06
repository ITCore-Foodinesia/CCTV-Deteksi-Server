/**
 * Supabase Client Configuration
 * 
 * This creates a singleton Supabase client for authentication and database operations.
 * The client uses environment variables for configuration.
 * 
 * Required env vars:
 * - VITE_SUPABASE_URL: Your Supabase project URL
 * - VITE_SUPABASE_ANON_KEY: Your Supabase anon/public key
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

/**
 * Supabase client instance
 * - Handles authentication (signIn, signUp, signOut, OAuth)
 * - Manages session persistence in localStorage
 * - Auto-refreshes tokens before expiry
 */
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    // Persist session in localStorage
    persistSession: true,
    // Auto-refresh token before it expires
    autoRefreshToken: true,
    // Detect session from URL (for OAuth redirects)
    detectSessionInUrl: true,
  },
});

export default supabase;
