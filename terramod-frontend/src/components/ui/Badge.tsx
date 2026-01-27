import React from 'react';

export type BadgeVariant = 'valid' | 'invalid' | 'required' | 'neutral';

interface BadgeProps {
    variant: BadgeVariant;
    children: React.ReactNode;
    className?: string;
}

const Badge: React.FC<BadgeProps> = ({ variant, children, className = '' }) => {
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

export default Badge;