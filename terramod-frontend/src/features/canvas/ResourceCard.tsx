import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import { Resource } from '../../types/resource';
import { useUIStore } from '../../store/uiStore';

interface ResourceCardProps {
  resource: Resource;
}

const ResourceCard: React.FC<ResourceCardProps> = ({ resource }) => {
  const selectedId = useUIStore((state) => state.selectedId);
  const setSelectedId = useUIStore((state) => state.setSelectedId);

  const isSelected = selectedId === resource.id;

  const getValidationColor = (): string => {
    if (!resource.validationState.isValid) return '#EF4444';
    if (resource.validationState.warnings.length > 0) return '#F59E0B';
    return '#10B981';
  };

  const handleClick = () => {
    setSelectedId(resource.id);
  };

  return (
    <Group x={resource.position.x} y={resource.position.y}>
      <Rect
        width={160}
        height={80}
        fill="#FFFFFF"
        stroke={getValidationColor()}
        strokeWidth={isSelected ? 3 : 2}
        cornerRadius={4}
        onClick={handleClick}
      />
      <Text
        text={resource.type}
        fontSize={12}
        x={10}
        y={10}
        width={140}
      />
      <Text
        text={resource.name}
        fontSize={14}
        fontStyle="bold"
        x={10}
        y={30}
        width={140}
      />
    </Group>
  );
};

export default ResourceCard;
