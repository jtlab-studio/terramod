import React, { useState, useRef } from 'react';
import { Group, Rect, Text, Circle } from 'react-konva';
import Konva from 'konva';
import { Resource } from '../../types/resource';
import { useUIStore } from '../../store/uiStore';
import { useInfraStore } from '../../store/infraStore';
import { GRID_SIZE } from '../../config/constants';

interface ResourceCardProps {
  resource: Resource;
  onConnectionStart: (resourceId: string, x: number, y: number) => void;
  onConnectionEnd: (targetId: string | null) => void;
  isConnectionDragging: boolean;
}

const ResourceCard: React.FC<ResourceCardProps> = ({
  resource,
  onConnectionStart,
  onConnectionEnd,
  isConnectionDragging
}) => {
  const groupRef = useRef<Konva.Group>(null);
  const selectedId = useUIStore((state) => state.selectedId);
  const setSelectedId = useUIStore((state) => state.setSelectedId);
  const updateResource = useInfraStore((state) => state.updateResource);
  const domains = useInfraStore((state) => state.domains);
  const viewport = useUIStore((state) => state.viewport);

  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const isSelected = selectedId === resource.id;
  const domain = domains.get(resource.domainId);

  const getDomainColor = (domainType: string): string => {
    const colors: Record<string, string> = {
      networking: '#3B82F6',
      compute: '#10B981',
      serverless: '#8B5CF6',
      data: '#F59E0B',
      storage: '#F97316',
      messaging: '#EC4899',
      identity: '#EF4444',
      observability: '#6366F1',
      edge: '#14B8A6',
    };
    return colors[domainType] || '#6B7280';
  };

  const handleClick = (e: any) => {
    e.cancelBubble = true;
    setSelectedId(resource.id);
  };

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (e: any) => {
    e.cancelBubble = true;
    setIsDragging(false);

    const newX = e.target.x();
    const newY = e.target.y();

    const snappedX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.round(newY / GRID_SIZE) * GRID_SIZE;

    updateResource(resource.id, {
      position: { x: snappedX, y: snappedY }
    });
  };

  const handleMouseEnter = (e: any) => {
    setIsHovering(true);
    const container = e.target.getStage()?.container();
    if (container) {
      container.style.cursor = 'move';
    }
  };

  const handleMouseLeave = (e: any) => {
    setIsHovering(false);
    const container = e.target.getStage()?.container();
    if (container) {
      container.style.cursor = 'default';
    }
  };

  const handleConnectionDotMouseDown = (e: any) => {
    e.cancelBubble = true;

    const stage = e.target.getStage();
    if (!stage) return;

    const absPos = e.target.getAbsolutePosition();
    const x = (absPos.x - viewport.x) / viewport.zoom;
    const y = (absPos.y - viewport.y) / viewport.zoom;

    onConnectionStart(resource.id, x, y);
  };

  const handleConnectionDotMouseUp = (e: any) => {
    e.cancelBubble = true;

    if (isConnectionDragging) {
      onConnectionEnd(resource.id);
    }
  };

  const handleConnectionDotMouseEnter = (e: any) => {
    const container = e.target.getStage()?.container();
    if (container) {
      container.style.cursor = 'crosshair';
    }
  };

  const handleConnectionDotMouseLeave = (e: any) => {
    const container = e.target.getStage()?.container();
    if (container) {
      container.style.cursor = isHovering ? 'move' : 'default';
    }
  };

  const displayName = resource.name.length > 18
    ? resource.name.substring(0, 15) + '...'
    : resource.name;

  const displayType = resource.type.replace('aws_', '').replace(/_/g, ' ');
  const shortType = displayType.length > 20
    ? displayType.substring(0, 17) + '...'
    : displayType;

  return (
    <Group
      ref={groupRef}
      x={resource.position.x}
      y={resource.position.y}
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Main card - grey theme */}
      <Rect
        width={160}
        height={80}
        fill="#1F2937" // gray-800
        stroke={isSelected ? '#D1D5DB' : '#374151'} // gray-300 : gray-700
        strokeWidth={isSelected ? 3 : 2}
        cornerRadius={4}
        onClick={handleClick}
        shadowColor="rgba(0,0,0,0.5)"
        shadowBlur={isHovering || isSelected ? 10 : 6}
        shadowOffset={{ x: 0, y: 2 }}
        shadowOpacity={0.5}
      />

      {/* Hover overlay */}
      {isHovering && !isDragging && (
        <Rect
          width={160}
          height={80}
          fill="rgba(156, 163, 175, 0.08)" // gray-400 with low opacity
          cornerRadius={4}
          listening={false}
        />
      )}

      {/* Domain badge (top-left) */}
      {domain && (
        <Group x={4} y={4}>
          <Rect
            width={12}
            height={12}
            fill={getDomainColor(domain.type)}
            cornerRadius={2}
          />
        </Group>
      )}

      {/* Resource type */}
      <Text
        text={shortType}
        fontSize={11}
        fill="#9CA3AF" // gray-400
        x={20}
        y={12}
        width={120}
        listening={false}
      />

      {/* Resource name */}
      <Text
        text={displayName}
        fontSize={14}
        fontStyle="bold"
        fill="#F3F4F6" // gray-100
        x={10}
        y={32}
        width={140}
        listening={false}
      />

      {/* Resource ID or metadata */}
      <Text
        text={`ID: ${resource.id.substring(0, 12)}...`}
        fontSize={9}
        fill="#6B7280" // gray-500
        x={10}
        y={55}
        width={140}
        listening={false}
      />

      {/* Connection dot - grey when not dragging */}
      <Group x={160} y={40}>
        <Circle
          radius={8}
          fill={isConnectionDragging ? '#9CA3AF' : '#6B7280'} // gray-400 : gray-500
          stroke="#1F2937" // Match card background
          strokeWidth={2}
          shadowColor="rgba(0,0,0,0.3)"
          shadowBlur={4}
          shadowOffset={{ x: 0, y: 1 }}
          shadowOpacity={0.5}
          onMouseDown={handleConnectionDotMouseDown}
          onMouseUp={handleConnectionDotMouseUp}
          onMouseEnter={handleConnectionDotMouseEnter}
          onMouseLeave={handleConnectionDotMouseLeave}
        />
        {/* Inner dot for visual depth */}
        <Circle
          radius={3}
          fill="#D1D5DB" // gray-300
          x={0}
          y={0}
          listening={false}
          opacity={0.9}
        />
      </Group>

      {/* Connection dot hover effect */}
      {isConnectionDragging && (
        <Group x={160} y={40}>
          <Circle
            radius={12}
            stroke="#9CA3AF" // gray-400
            strokeWidth={2}
            opacity={0.5}
            listening={false}
          />
        </Group>
      )}
    </Group>
  );
};

export default ResourceCard;