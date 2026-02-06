import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Camera, CheckCircle2, ArrowRight, AlertCircle } from 'lucide-react';
import { THEME } from '../../constants/theme';
import { InputField } from '../ui';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Forgot Password Page Component
 * Password reset request form using Supabase
 */
const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const { resetPassword, error: authError, clearError } = useAuth();
  
  const [isSent, setIsSent] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (localError) setLocalError('');
    if (authError) clearError();
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setLocalError('');
    
    if (!email) {
      setLocalError('Please enter your email address');
      return;
    }

    setIsSubmitting(true);
    
    const result = await resetPassword(email);
    
    if (result.success) {
      setIsSent(true);
    } else {
      setLocalError(result.error || 'Failed to send reset email. Please try again.');
    }
    
    setIsSubmitting(false);
  };

  const handleResend = () => {
    setIsSent(false);
    // Email is preserved, user can submit again
  };

  const displayError = localError || authError;

  // Success State
  if (isSent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#F5F7F2]">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 text-center animate-in zoom-in-95">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
          <p className="text-gray-500 mb-8">
            We've sent a password reset link to{' '}
            <span className="font-semibold text-gray-800">{email || 'your@email.com'}</span>
          </p>
          <p className="text-sm text-gray-400 mb-6">
            Click the link in the email to reset your password. The link will expire in 24 hours.
          </p>
          <Link 
            to="/login"
            className={`${THEME.colors.primary} ${THEME.colors.primaryHover} ${THEME.button} mb-4 inline-block text-center`}
          >
            Back to Login
          </Link>
          <button 
            onClick={handleResend} 
            className="block mx-auto text-gray-500 text-sm hover:text-gray-800"
          >
            Didn't receive it? Click to resend
          </button>
        </div>
      </div>
    );
  }

  // Request Form State
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F5F7F2]">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 animate-in zoom-in-95">
        <Link 
          to="/login"
          className="flex items-center gap-2 mb-8 w-fit"
        >
          <div className="w-8 h-8 rounded-lg bg-[#a3e635] flex items-center justify-center">
            <Camera className="text-white w-4 h-4" />
          </div>
          <span className="text-lg font-bold text-gray-800">
            Gudang<span className="text-[#65a30d]">AI</span>
          </span>
        </Link>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset password</h2>
        <p className="text-gray-500 mb-8">
          Enter the email associated with your account and we'll send you a link to reset your password.
        </p>

        <form onSubmit={handleReset}>
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
            value={email}
            onChange={handleEmailChange}
            required
            disabled={isSubmitting}
          />
          
          <button 
            type="submit"
            disabled={isSubmitting}
            className={`${THEME.colors.primary} ${THEME.colors.primaryHover} ${THEME.button} mb-6 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Sending...
              </span>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>

        <div className="text-center">
          <Link 
            to="/login" 
            className="text-sm font-semibold text-gray-600 hover:text-gray-900 flex items-center justify-center gap-1 mx-auto"
          >
            <ArrowRight className="rotate-180 w-4 h-4" /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
