import React from 'react';

export type ModalSize = 'sm' | 'md' | 'lg';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: ModalSize;
}

const Modal: React.FC<ModalProps> = ({
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

export default Modal;