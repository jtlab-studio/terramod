import React from 'react';
import { Group, Rect, Text, Circle } from 'react-konva';
import { Resource } from '../../types/resource';
import { useUIStore } from '../../store/uiStore';
import { useValidationStore } from '../../store/validationStore';

interface ResourceCardProps {
  resource: Resource;
}

const ResourceCard: React.FC<ResourceCardProps> = ({ resource }) => {
  const selectedId = useUIStore((state) => state.selectedId);
  const setSelectedId = useUIStore((state) => state.setSelectedId);
  const validationState = useValidationStore((state) => 
    state.getValidationState(resource.id)
  );

  const isSelected = selectedId === resource.id;

  const getValidationColor = (): string => {
    if (!validationState.isValid && validationState.errors.length > 0) {
      return '#EF4444'; // Red for errors
    }
    if (validationState.warnings.length > 0) {
      return '#F59E0B'; // Yellow for warnings
    }
    return '#10B981'; // Green for valid
  };

  const getValidationBadge = (): { color: string; symbol: string } | null => {
    if (!validationState.isValid && validationState.errors.length > 0) {
      return { color: '#EF4444', symbol: '✕' };
    }
    if (validationState.warnings.length > 0) {
      return { color: '#F59E0B', symbol: '⚠' };
    }
    if (validationState.isValid && validationState.errors.length === 0) {
      return { color: '#10B981', symbol: '✓' };
    }
    return null;
  };

  const handleClick = () => {
    setSelectedId(resource.id);
  };

  const badge = getValidationBadge();
  const borderColor = getValidationColor();

  // Truncate long names
  const displayName = resource.name.length > 18 
    ? resource.name.substring(0, 15) + '...' 
    : resource.name;

  // Truncate resource type
  const displayType = resource.type.replace('aws_', '').replace(/_/g, ' ');
  const shortType = displayType.length > 20 
    ? displayType.substring(0, 17) + '...' 
    : displayType;

  return (
    <Group x={resource.position.x} y={resource.position.y}>
      {/* Main card */}
      <Rect
        width={160}
        height={80}
        fill="#FFFFFF"
        stroke={borderColor}
        strokeWidth={isSelected ? 3 : 2}
        cornerRadius={4}
        onClick={handleClick}
        shadowColor="rgba(0,0,0,0.1)"
        shadowBlur={5}
        shadowOffset={{ x: 0, y: 2 }}
        shadowOpacity={0.3}
      />
      
      {/* Resource type */}
      <Text
        text={shortType}
        fontSize={11}
        fill="#6B7280"
        x={10}
        y={12}
        width={140}
      />
      
      {/* Resource name */}
      <Text
        text={displayName}
        fontSize={14}
        fontStyle="bold"
        fill="#1F2937"
        x={10}
        y={32}
        width={140}
      />

      {/* Validation count */}
      {(validationState.errors.length > 0 || validationState.warnings.length > 0) && (
        <Text
          text={`${validationState.errors.length} errors, ${validationState.warnings.length} warnings`}
          fontSize={9}
          fill="#9CA3AF"
          x={10}
          y={55}
          width={140}
        />
      )}
      
      {/* Validation badge */}
      {badge && (
        <Group x={140} y={10}>
          <Circle
            radius={10}
            fill={badge.color}
            stroke="#FFFFFF"
            strokeWidth={2}
          />
          <Text
            text={badge.symbol}
            fontSize={12}
            fill="#FFFFFF"
            x={-6}
            y={-6}
            fontStyle="bold"
          />
        </Group>
      )}

      {/* Hover effect */}
      <Rect
        width={160}
        height={80}
        fill="transparent"
        cornerRadius={4}
        onMouseEnter={(e) => {
          const container = e.target.getStage()?.container();
          if (container) {
            container.style.cursor = 'pointer';
          }
        }}
        onMouseLeave={(e) => {
          const container = e.target.getStage()?.container();
          if (container) {
            container.style.cursor = 'default';
          }
        }}
        onClick={handleClick}
      />
    </Group>
  );
};

export default ResourceCard;
