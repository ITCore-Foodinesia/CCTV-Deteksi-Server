import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { THEME } from '../../constants/theme';

/**
 * Reusable Input Field Component
 * Supports text, email, password with toggle visibility
 */
const InputField = ({ 
  label, 
  type = "text", 
  placeholder, 
  icon: Icon, 
  showPasswordToggle,
  value,
  onChange,
  name,
  required = false,
  disabled = false,
  error,
  autoComplete,
  id
}) => {
  const [show, setShow] = useState(false);
  const inputType = showPasswordToggle ? (show ? "text" : "password") : type;
  const inputId = id || name;

  return (
    <div className="mb-5">
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <Icon size={20} aria-hidden="true" />
          </div>
        )}
        <input 
          id={inputId}
          type={inputType}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          className={`${THEME.input} ${Icon ? 'pl-11' : ''} ${showPasswordToggle ? 'pr-11' : ''} ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/50' : ''} ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}`}
          placeholder={placeholder}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
        {showPasswordToggle && (
          <button 
            type="button"
            onClick={() => setShow(!show)}
            disabled={disabled}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} className="text-red-500 text-sm mt-1 ml-1" role="alert">{error}</p>
      )}
    </div>
  );
};

export default InputField;
