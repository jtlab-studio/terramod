import React from 'react';
import { Circle } from 'react-konva';

interface ConnectionPortProps {
  domainId: string;
  portType: 'input' | 'output';
  portName: string;
}

const ConnectionPort: React.FC<ConnectionPortProps> = ({ 
  domainId, 
  portType, 
  portName 
}) => {
  const handleDragStart = () => {
    // Initiate connection creation
  };

  const handleDragEnd = () => {
    // Complete connection creation
  };

  return (
    <Circle
      x={portType === 'input' ? 0 : 200}
      y={50}
      radius={6}
      fill={portType === 'input' ? '#3B82F6' : '#10B981'}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    />
  );
};

export default ConnectionPort;
