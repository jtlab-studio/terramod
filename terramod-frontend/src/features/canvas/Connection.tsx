import React from 'react';
import { Arrow } from 'react-konva';
import { Connection as ConnectionType } from '../../types/connection';
import { useInfraStore } from '../../store/infraStore';
import { useUIStore } from '../../store/uiStore';
import { calculateConnectionPath } from './utils/geometry';

interface ConnectionProps {
  connection: ConnectionType;
}

const Connection: React.FC<ConnectionProps> = ({ connection }) => {
  const domains = useInfraStore((state) => state.domains);
  const resources = useInfraStore((state) => state.resources);
  const selectedId = useUIStore((state) => state.selectedId);
  const setSelectedId = useUIStore((state) => state.setSelectedId);

  const isSelected = selectedId === connection.id;

  const getElement = (id: string, type: 'resource' | 'domain') => {
    return type === 'resource' ? resources.get(id) : domains.get(id);
  };

  const sourceElement = getElement(connection.sourceId, connection.sourceType);
  const targetElement = getElement(connection.targetId, connection.targetType);

  if (!sourceElement || !targetElement) return null;

  const points = calculateConnectionPath(
    sourceElement.position,
    targetElement.position
  );

  const handleClick = () => {
    setSelectedId(connection.id);
  };

  return (
    <Arrow
      points={points}
      stroke={isSelected ? '#3B82F6' : '#6B7280'}
      strokeWidth={isSelected ? 3 : 2}
      fill={isSelected ? '#3B82F6' : '#6B7280'}
      onClick={handleClick}
    />
  );
};

export default Connection;
