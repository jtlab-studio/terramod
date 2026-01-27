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

export const Input: React.FC<InputProps> = ({
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                    {required && <span className="text-red-600 ml-1">*</span>}
                </label>
            )}
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                placeholder={placeholder}
                disabled={disabled}
                className={`w-full px-3 py-2 border rounded-md transition-colors ${error
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    } focus:outline-none focus:ring-2 disabled:bg-gray-100 disabled:cursor-not-allowed`}
            />
            {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
        </div>
    );
};

export interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    error?: string;
    required?: boolean;
    className?: string;
}

export const Select: React.FC<SelectProps> = ({
    label,
    value,
    onChange,
    options,
    placeholder,
    error,
    required = false,
    className = '',
}) => {
    return (
        <div className={className}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                    {required && <span className="text-red-600 ml-1">*</span>}
                </label>
            )}
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-500' : 'border-gray-300'
                    }`}
            >
                {placeholder && (
                    <option value="" disabled>
                        {placeholder}
                    </option>
                )}
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
        </div>
    );
};

interface CheckboxProps {
    label?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
    label,
    checked,
    onChange,
    disabled = false,
    className = '',
}) => {
    return (
        <div className={`flex items-center ${className}`}>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                disabled={disabled}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            {label && (
                <label className="ml-2 text-sm font-medium">
                    {label}
                </label>
            )}
        </div>
    );
};

export type BadgeVariant = 'valid' | 'invalid' | 'required' | 'neutral';

interface BadgeProps {
    variant: BadgeVariant;
    children: React.ReactNode;
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant, children, className = '' }) => {
    const getVariantClasses = (v: BadgeVariant): string => {
        switch (v) {
            case 'valid':
                return 'bg-green-100 text-green-800';
            case 'invalid':
                return 'bg-red-100 text-red-800';
            case 'required':
                return 'bg-yellow-100 text-yellow-800';
            case 'neutral':
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <span
            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getVariantClasses(
                variant
            )} ${className}`}
        >
            {children}
        </span>
    );
};

export type ModalSize = 'sm' | 'md' | 'lg';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: ModalSize;
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'md',
}) => {
    React.useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            window.addEventListener('keydown', handleEscape);
            return () => window.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
                <div
                    className="fixed inset-0 bg-black opacity-50"
                    onClick={onClose}
                />
                <div
                    className={`relative bg-white rounded-lg shadow-xl ${sizeClasses[size]} w-full`}
                >
                    <div className="p-6">
                        <h2 className="text-xl font-bold mb-4">{title}</h2>
                        {children}
                    </div>
                    {footer && <div className="px-6 py-4 bg-gray-50 rounded-b-lg">{footer}</div>}
                </div>
            </div>
        </div>
    );
};

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastProps {
    message: string;
    variant: ToastVariant;
    duration?: number;
    onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
    message,
    variant,
    duration = 3000,
    onClose,
}) => {
    React.useEffect(() => {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const getVariantClasses = (v: ToastVariant): string => {
        switch (v) {
            case 'success':
                return 'bg-green-600 text-white';
            case 'error':
                return 'bg-red-600 text-white';
            case 'info':
                return 'bg-blue-600 text-white';
        }
    };

    return (
        <div
            className={`fixed top-4 right-4 px-6 py-3 rounded shadow-lg ${getVariantClasses(
                variant
            )}`}
        >
            <p className="text-sm font-medium">{message}</p>
        </div>
    );
};