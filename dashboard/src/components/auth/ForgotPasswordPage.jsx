import React, { useState } from 'react';
import { Mail, Camera, CheckCircle2, ArrowRight } from 'lucide-react';
import { THEME } from '../../constants/theme';
import { InputField } from '../ui';

/**
 * Forgot Password Page Component
 * Password reset request form
 */
const ForgotPasswordPage = ({ onNavigate }) => {
  const [isSent, setIsSent] = useState(false);
  const [email, setEmail] = useState('');

  const handleReset = (e) => {
    e.preventDefault();
    // Simulate sending reset email
    console.log('Password reset requested for:', email);
    setIsSent(true);
  };

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
          <button 
            onClick={() => onNavigate('login')}
            className={`${THEME.colors.primary} ${THEME.colors.primaryHover} ${THEME.button} mb-4`}
          >
            Back to Login
          </button>
          <button 
            onClick={() => setIsSent(false)} 
            className="text-gray-500 text-sm hover:text-gray-800"
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
        <div 
          onClick={() => onNavigate('login')}
          className="flex items-center gap-2 mb-8 cursor-pointer w-fit"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('login')}
        >
          <div className="w-8 h-8 rounded-lg bg-[#a3e635] flex items-center justify-center">
            <Camera className="text-white w-4 h-4" />
          </div>
          <span className="text-lg font-bold text-gray-800">
            Gudang<span className="text-[#65a30d]">AI</span>
          </span>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset password</h2>
        <p className="text-gray-500 mb-8">
          Enter the email associated with your account and we'll send you a link to reset your password.
        </p>

        <form onSubmit={handleReset}>
          <InputField 
            label="Email Address" 
            type="email" 
            name="email"
            placeholder="name@company.com" 
            icon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          
          <button 
            type="submit" 
            className={`${THEME.colors.primary} ${THEME.colors.primaryHover} ${THEME.button} mb-6`}
          >
            Send Reset Link
          </button>
        </form>

        <div className="text-center">
          <button 
            onClick={() => onNavigate('login')} 
            className="text-sm font-semibold text-gray-600 hover:text-gray-900 flex items-center justify-center gap-1 mx-auto"
          >
            <ArrowRight className="rotate-180 w-4 h-4" /> Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
