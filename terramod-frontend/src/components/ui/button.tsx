import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps {
    variant?: ButtonVariant;
    disabled?: boolean;
    loading?: boolean;
    onClick?: () => void;
    children: React.ReactNode;
    className?: string;
}

const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    disabled = false,
    loading = false,
    onClick,
    children,
    className = '',
}) => {
    const getVariantClasses = (v: ButtonVariant): string => {
        switch (v) {
            case 'primary':
                return 'bg-blue-600 hover:bg-blue-700 text-white';
            case 'secondary':
                return 'bg-gray-600 hover:bg-gray-700 text-white';
            case 'danger':
                return 'bg-red-600 hover:bg-red-700 text-white';
        }
    };

    return (
        <button
      onClick= { onClick }
    disabled = { disabled || loading
}
className = {`px-4 py-2 rounded font-medium transition-colors ${getVariantClasses(variant)} ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''
    } ${className}`}
    >
    { loading? 'Loading...': children }
    </button>
  );
};

export default Button;