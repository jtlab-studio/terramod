import React from 'react';

type MessageType = 'error' | 'warning';

interface ValidationMessageProps {
  type: MessageType;
  message: string;
}

const ValidationMessage: React.FC<ValidationMessageProps> = ({ type, message }) => {
  const getIconForType = (msgType: MessageType): string => {
    return msgType === 'error' ? '✕' : '⚠';
  };

  const getColorForType = (msgType: MessageType): string => {
    return msgType === 'error' 
      ? 'bg-red-50 border-red-200 text-red-700'
      : 'bg-yellow-50 border-yellow-200 text-yellow-700';
  };

  return (
    <div className={`p-3 border rounded flex items-start gap-2 ${getColorForType(type)}`}>
      <span className="font-bold">{getIconForType(type)}</span>
      <span className="text-sm">{message}</span>
    </div>
  );
};

export default ValidationMessage;
