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
  onDragStart: () => void;
  onDragMove: (resourceId: string, x: number, y: number) => void;
  onDragEnd: () => void;
  isConnectionDragging: boolean;
}

const ResourceCard: React.FC<ResourceCardProps> = ({
  resource,
  onConnectionStart,
  onConnectionEnd,
  onDragStart,
  onDragMove,
  onDragEnd,
  isConnectionDragging
}) => {
  const groupRef = useRef<Konva.Group>(null);
  const selectedId = useUIStore((state) => state.selectedId);
  const setSelectedId = useUIStore((state) => state.setSelectedId);
  const updateResource = useInfraStore((state) => state.updateResource);
  const domains = useInfraStore((state) => state.domains);
  const viewport = useUIStore((state) => state.viewport);

  const [isHovering, setIsHovering] = useState(false);

  const isSelected = selectedId === resource.id;
  const domain = domains.get(resource.domainId);

  const getDomainColor = (domainType: string): string => {
    const colors: Record<string, string> = {
      networking: '#3B82F6', compute: '#10B981', serverless: '#8B5CF6',
      data: '#F59E0B', storage: '#F97316', messaging: '#EC4899',
      identity: '#EF4444', observability: '#6366F1', edge: '#14B8A6'
    };
    return colors[domainType] || '#6B7280';
  };

  const displayName = resource.name.length > 18 ? resource.name.substring(0, 15) + '...' : resource.name;
  const displayType = resource.type.replace('aws_', '').replace(/_/g, ' ');
  const shortType = displayType.length > 20 ? displayType.substring(0, 17) + '...' : displayType;

  return (
    <Group
      ref={groupRef}
      x={resource.position.x}
      y={resource.position.y}
      draggable={true}
      dragBoundFunc={function (pos) {
        // Allow dragging anywhere - no restrictions
        return pos;
      }}
      onDragStart={(e) => {
        // Ensure drag is not prevented
        e.cancelBubble = false;

        onDragStart();
        const container = e.target.getStage()?.container();
        if (container) container.style.cursor = 'grabbing';
        console.log('🎯 DRAG START:', resource.name, resource.id);
      }}
      onDragMove={(e) => {
        const x = e.target.x();
        const y = e.target.y();
        onDragMove(resource.id, x, y);

        // Force stage update
        const stage = e.target.getStage();
        if (stage) {
          stage.batchDraw();
        }
      }}
      onDragEnd={(e) => {
        const newX = Math.round(e.target.x() / GRID_SIZE) * GRID_SIZE;
        const newY = Math.round(e.target.y() / GRID_SIZE) * GRID_SIZE;

        // Update position in store
        updateResource(resource.id, { position: { x: newX, y: newY } });

        // Notify parent
        onDragEnd();

        // Force stage update
        const stage = e.target.getStage();
        if (stage) {
          stage.batchDraw();
          const container = stage.container();
          if (container) container.style.cursor = 'grab';
        }

        console.log('🎯 DRAG END:', resource.name, 'moved to:', newX, newY);
      }}
      onMouseEnter={(e) => {
        setIsHovering(true);
        if (!isConnectionDragging) {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = 'grab';
        }
      }}
      onMouseLeave={(e) => {
        setIsHovering(false);
        const container = e.target.getStage()?.container();
        if (container) container.style.cursor = 'default';
      }}
    >
      {/* Main card - IMPORTANT: listening must be true for drag to work */}
      <Rect
        width={160}
        height={80}
        fill="#1F2937"
        stroke={isSelected ? '#D1D5DB' : '#374151'}
        strokeWidth={isSelected ? 3 : 2}
        cornerRadius={4}
        listening={true}
        onClick={(e) => {
          e.cancelBubble = true;
          const pos = groupRef.current?.getRelativePointerPosition();
          if (pos && pos.x >= 30 && pos.x <= 130 && pos.y >= 10 && pos.y <= 70) {
            setSelectedId(resource.id);
            console.log('🖱️ SELECTED:', resource.name);
          }
        }}
        shadowColor="rgba(0,0,0,0.5)"
        shadowBlur={isHovering || isSelected ? 10 : 6}
        shadowOffset={{ x: 0, y: 2 }}
        shadowOpacity={0.5}
      />

      {isHovering && <Rect width={160} height={80} fill="rgba(156, 163, 175, 0.08)" cornerRadius={4} listening={false} />}

      {domain && <Rect x={4} y={4} width={12} height={12} fill={getDomainColor(domain.type)} cornerRadius={2} listening={false} />}

      <Text text={shortType} fontSize={11} fill="#9CA3AF" x={20} y={12} width={120} listening={false} />
      <Text text={displayName} fontSize={14} fontStyle="bold" fill="#F3F4F6" x={10} y={32} width={140} listening={false} />
      <Text text={`ID: ${resource.id.substring(0, 12)}...`} fontSize={9} fill="#6B7280" x={10} y={55} width={140} listening={false} />

      {/* LEFT Connection dot */}
      <Group x={0} y={40}>
        <Circle
          radius={8}
          fill={isConnectionDragging ? '#9CA3AF' : '#6B7280'}
          stroke="#1F2937"
          strokeWidth={2}
          listening={true}
          onClick={(e) => {
            e.cancelBubble = true;
            const stage = e.target.getStage();
            if (!stage) return;

            const absPos = e.target.getAbsolutePosition();
            const x = (absPos.x - viewport.x) / viewport.zoom;
            const y = (absPos.y - viewport.y) / viewport.zoom;

            if (!isConnectionDragging) {
              onConnectionStart(resource.id, x, y);
              console.log('🔗 Connection START from', resource.name, 'LEFT dot');
            } else {
              onConnectionEnd(resource.id);
              console.log('🔗 Connection END at', resource.name, 'LEFT dot');
            }
          }}
          onMouseEnter={(e) => {
            const c = e.target.getStage()?.container();
            if (c) c.style.cursor = 'crosshair';
          }}
          onMouseLeave={(e) => {
            const c = e.target.getStage()?.container();
            if (c) c.style.cursor = isHovering ? 'grab' : 'default';
          }}
        />
        <Circle radius={3} fill="#D1D5DB" listening={false} opacity={0.9} />
        {isConnectionDragging && <Circle radius={12} stroke="#9CA3AF" strokeWidth={2} opacity={0.5} listening={false} />}
      </Group>

      {/* RIGHT Connection dot */}
      <Group x={160} y={40}>
        <Circle
          radius={8}
          fill={isConnectionDragging ? '#9CA3AF' : '#6B7280'}
          stroke="#1F2937"
          strokeWidth={2}
          listening={true}
          onClick={(e) => {
            e.cancelBubble = true;
            const stage = e.target.getStage();
            if (!stage) return;

            const absPos = e.target.getAbsolutePosition();
            const x = (absPos.x - viewport.x) / viewport.zoom;
            const y = (absPos.y - viewport.y) / viewport.zoom;

            if (!isConnectionDragging) {
              onConnectionStart(resource.id, x, y);
              console.log('🔗 Connection START from', resource.name, 'RIGHT dot');
            } else {
              onConnectionEnd(resource.id);
              console.log('🔗 Connection END at', resource.name, 'RIGHT dot');
            }
          }}
          onMouseEnter={(e) => {
            const c = e.target.getStage()?.container();
            if (c) c.style.cursor = 'crosshair';
          }}
          onMouseLeave={(e) => {
            const c = e.target.getStage()?.container();
            if (c) c.style.cursor = isHovering ? 'grab' : 'default';
          }}
        />
        <Circle radius={3} fill="#D1D5DB" listening={false} opacity={0.9} />
        {isConnectionDragging && <Circle radius={12} stroke="#9CA3AF" strokeWidth={2} opacity={0.5} listening={false} />}
      </Group>
    </Group>
  );
};

export default ResourceCard;