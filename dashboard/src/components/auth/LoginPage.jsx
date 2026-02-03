import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, AlertCircle } from 'lucide-react';
import { THEME } from '../../constants/theme';
import { InputField } from '../ui';
import AuthLayout from './AuthLayout';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Login Page Component
 * User authentication form with Email/Password and Google OAuth
 */
const LoginPage = () => {
  const navigate = useNavigate();
  const { signIn, signInWithGoogle, error: authError, clearError } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear errors when user starts typing
    if (localError) setLocalError('');
    if (authError) clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    
    // Basic validation
    if (!formData.email || !formData.password) {
      setLocalError('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    
    const result = await signIn(formData.email, formData.password);
    
    if (result.success) {
      // Navigate to dashboard on success
      navigate('/dashboard');
    } else {
      // Error is already set in auth context, but we can also set local error
      setLocalError(result.error || 'Login failed. Please try again.');
    }
    
    setIsSubmitting(false);
  };

  const handleGoogleSignIn = async () => {
    setLocalError('');
    const result = await signInWithGoogle();
    
    if (!result.success) {
      setLocalError(result.error || 'Google sign-in failed. Please try again.');
    }
    // On success, OAuth will redirect and the auth state change will handle navigation
  };

  // Display error from either local state or auth context
  const displayError = localError || authError;

  return (
    <AuthLayout 
      title="Welcome back" 
      subtitle="Enter your credentials to access your dashboard."
      visualIcon={<User size={24} />}
    >
      <form onSubmit={handleSubmit}>
        {/* Error Message */}
        {displayError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{displayError}</span>
          </div>
        )}

        <InputField 
          label="Email Address" 
          type="email" 
          name="email"
          placeholder="name@company.com" 
          icon={Mail}
          value={formData.email}
          onChange={handleChange}
          required
          disabled={isSubmitting}
        />
        <InputField 
          label="Password" 
          type="password" 
          name="password"
          placeholder="••••••••" 
          icon={Lock} 
          showPasswordToggle
          value={formData.password}
          onChange={handleChange}
          required
          disabled={isSubmitting}
        />
        
        <div className="flex items-center justify-between mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              name="rememberMe"
              checked={formData.rememberMe}
              onChange={handleChange}
              disabled={isSubmitting}
              className="w-4 h-4 rounded border-gray-300 text-[#a3e635] focus:ring-[#a3e635]" 
            />
            <span className="text-sm text-gray-600">Remember me</span>
          </label>
          <Link 
            to="/forgot-password"
            className="text-sm font-semibold text-[#a3e635] hover:text-[#84cc16]"
          >
            Forgot password?
          </Link>
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className={`${THEME.colors.primary} ${THEME.colors.primaryHover} ${THEME.button} mb-6 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Signing in...
            </span>
          ) : (
            'Sign In'
          )}
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        <button 
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isSubmitting}
          className="w-full py-3 border border-gray-200 rounded-xl flex items-center justify-center gap-2 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </button>

        <p className="mt-8 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link 
            to="/signup" 
            className="font-semibold text-[#a3e635] hover:underline"
          >
            Sign up
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;
