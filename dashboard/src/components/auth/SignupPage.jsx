import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Building2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { THEME } from '../../constants/theme';
import { InputField } from '../ui';
import AuthLayout from './AuthLayout';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Signup Page Component
 * New user registration form with Email/Password and Google OAuth
 */
const SignupPage = () => {
  const navigate = useNavigate();
  const { signUp, signInWithGoogle, error: authError, clearError } = useAuth();
  
  const [formData, setFormData] = useState({
    fullName: '',
    company: '',
    email: '',
    password: '',
    agreeToTerms: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

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
    if (!formData.email || !formData.password || !formData.fullName) {
      setLocalError('Please fill in all required fields');
      return;
    }

    if (formData.password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    if (!formData.agreeToTerms) {
      setLocalError('Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    setIsSubmitting(true);
    
    const result = await signUp(formData.email, formData.password, {
      fullName: formData.fullName,
      company: formData.company,
    });
    
    if (result.success) {
      if (result.needsConfirmation) {
        // Show email confirmation message
        setShowConfirmation(true);
      } else {
        // Navigate to dashboard on success (if no email confirmation required)
        navigate('/app/dashboard');
      }
    } else {
      setLocalError(result.error || 'Signup failed. Please try again.');
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

  // Simple password strength calculation
  const getPasswordStrength = () => {
    const password = formData.password;
    if (!password) return { level: 0, text: '' };
    if (password.length < 6) return { level: 1, text: 'Weak' };
    if (password.length < 8) return { level: 2, text: 'Medium' };
    if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
      return { level: 4, text: 'Strong' };
    }
    return { level: 3, text: 'Good' };
  };

  const passwordStrength = getPasswordStrength();
  const displayError = localError || authError;

  // Show email confirmation screen
  if (showConfirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#F5F7F2]">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 text-center animate-in zoom-in-95">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
          <p className="text-gray-500 mb-8">
            We've sent a confirmation link to{' '}
            <span className="font-semibold text-gray-800">{formData.email}</span>
          </p>
          <p className="text-sm text-gray-400 mb-6">
            Please click the link in the email to verify your account before logging in.
          </p>
          <Link 
            to="/login"
            className={`${THEME.colors.primary} ${THEME.colors.primaryHover} ${THEME.button} inline-block text-center`}
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AuthLayout 
      title="Create account" 
      subtitle="Start monitoring your warehouse with AI today."
      visualIcon={<Building2 size={24} />}
    >
      <form onSubmit={handleSubmit}>
        {/* Error Message */}
        {displayError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{displayError}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <InputField 
            label="Full Name" 
            name="fullName"
            placeholder="John Doe" 
            icon={User}
            value={formData.fullName}
            onChange={handleChange}
            required
            disabled={isSubmitting}
          />
          <InputField 
            label="Company" 
            name="company"
            placeholder="Warehouse Inc" 
            icon={Building2}
            value={formData.company}
            onChange={handleChange}
            disabled={isSubmitting}
          />
        </div>
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
          placeholder="Min. 6 characters" 
          icon={Lock} 
          showPasswordToggle
          value={formData.password}
          onChange={handleChange}
          required
          disabled={isSubmitting}
        />
        
        {/* Password Strength Indicator */}
        {formData.password && (
          <div className="flex gap-1 mb-6 mt-[-10px]">
            {[1, 2, 3, 4].map((level) => (
              <div 
                key={level}
                className={`h-1 w-full rounded-full ${
                  level <= passwordStrength.level 
                    ? passwordStrength.level >= 3 ? 'bg-green-500' : passwordStrength.level >= 2 ? 'bg-yellow-500' : 'bg-red-500'
                    : 'bg-gray-200'
                }`}
              />
            ))}
            <p className="text-xs text-gray-400 ml-2 whitespace-nowrap">{passwordStrength.text}</p>
          </div>
        )}

        <label className="flex items-start gap-2 cursor-pointer mb-6">
          <input 
            type="checkbox" 
            name="agreeToTerms"
            checked={formData.agreeToTerms}
            onChange={handleChange}
            required
            disabled={isSubmitting}
            className="mt-1 w-4 h-4 rounded border-gray-300 text-[#a3e635] focus:ring-[#a3e635]" 
          />
          <span className="text-sm text-gray-600 leading-tight">
            I agree to the{' '}
            <a href="#" className="text-gray-900 underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-gray-900 underline">Privacy Policy</a>
          </span>
        </label>

        <button 
          type="submit"
          disabled={isSubmitting}
          className={`${THEME.colors.primary} ${THEME.colors.primaryHover} ${THEME.button} mb-6 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Creating account...
            </span>
          ) : (
            'Create Account'
          )}
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or sign up with</span>
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
          Already have an account?{' '}
          <Link 
            to="/login" 
            className="font-semibold text-[#a3e635] hover:underline"
          >
            Log in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default SignupPage;
