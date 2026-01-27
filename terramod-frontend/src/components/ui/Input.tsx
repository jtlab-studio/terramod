import React from 'react';

interface InputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  type?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

const Input: React.FC<InputProps> = ({
  label,
  value,
  onChange,
  onBlur,
  type = 'text',
  placeholder,
  error,
  required = false,
  className = '',
  disabled = false
}) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-1">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-3 py-2 bg-gray-800 border rounded-md transition-colors text-gray-200 placeholder-gray-500 ${error
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
            : 'border-gray-700 focus:border-gray-600 focus:ring-gray-600'
          } focus:outline-none focus:ring-2 disabled:bg-gray-900 disabled:cursor-not-allowed disabled:text-gray-600`}
      />
      {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
    </div>
  );
};

export default Input;