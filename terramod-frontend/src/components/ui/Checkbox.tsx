import React from 'react';

interface CheckboxProps {
    label?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    className?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({
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
                className="w-4 h-4 text-gray-600 bg-gray-800 border-gray-700 rounded focus:ring-2 focus:ring-gray-600"
            />
            {label && (
                <label className="ml-2 text-sm font-medium text-gray-300">
                    {label}
                </label>
            )}
        </div>
    );
};

export default Checkbox;