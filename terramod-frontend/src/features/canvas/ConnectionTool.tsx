import React, { useState, useCallback } from 'react';
import { Layer, Line, Circle, Group } from 'react-konva';
import { useInfraStore } from '../../store/infraStore';
import { useUIStore } from '../../store/uiStore';
import type { NodeType, ConnectionType } from '../../types/connection';

interface ConnectionToolProps {
  stageRef: React.RefObject<any>;
}

interface ConnectionStart {
  id: string;
  type: NodeType;
  x: number;
  y: number;
}

const ConnectionTool: React.FC<ConnectionToolProps> = ({ stageRef }) => {
  const [connectionStart, setConnectionStart] = useState<ConnectionStart | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  
  const mode = useUIStore((state) => state.mode);
  const viewport = useUIStore((state) => state.viewport);
  const addConnection = useInfraStore((state) => state.addConnection);
  const domains = useInfraStore((state) => state.domains);
  const resources = useInfraStore((state) => state.resources);

  const generateId = (prefix: string): string => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleStartConnection = useCallback((elementId: string, elementType: NodeType, x: number, y: number) => {
    if (mode !== 'connect') return;
    
    console.log('🔗 Starting connection from:', elementId);
    setConnectionStart({ id: elementId, type: elementType, x, y });
  }, [mode]);

  const handleMouseMove = useCallback(() => {
    if (!connectionStart || mode !== 'connect') return;

    const stage = stageRef.current;
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (pos) {
      const x = (pos.x - viewport.x) / viewport.zoom;
      const y = (pos.y - viewport.y) / viewport.zoom;
      setMousePos({ x, y });
    }
  }, [connectionStart, mode, viewport, stageRef]);

  const handleEndConnection = useCallback((targetId: string, targetType: NodeType) => {
    if (!connectionStart || mode !== 'connect') return;
    if (connectionStart.id === targetId) {
      // Can't connect to self
      setConnectionStart(null);
      setMousePos(null);
      return;
    }

    console.log('🔗 Completing connection to:', targetId);

    // Determine connection type
    let connectionType: ConnectionType = 'data';
    
    // If connecting domain to domain, it's usually implicit
    if (connectionStart.type === 'domain' && targetType === 'domain') {
      connectionType = 'implicit';
    }
    // If connecting resource to resource, check if it's a reference
    else if (connectionStart.type === 'resource' && targetType === 'resource') {
      connectionType = 'dependency';
    }

    const newConnection = {
      id: generateId('conn'),
      sourceId: connectionStart.id,
      targetId: targetId,
      sourceType: connectionStart.type,
      targetType: targetType,
      connectionType: connectionType,
      outputName: undefined,
      inputName: undefined
    };

    addConnection(newConnection);
    console.log('✅ Connection created:', newConnection.id);

    // Reset
    setConnectionStart(null);
    setMousePos(null);
  }, [connectionStart, mode, addConnection]);

  const handleCancel = useCallback(() => {
    setConnectionStart(null);
    setMousePos(null);
  }, []);

  // Expose handlers via context or props
  React.useEffect(() => {
    if (mode !== 'connect') {
      handleCancel();
    }
  }, [mode, handleCancel]);

  // Render connection line being drawn
  const renderDrawingLine = () => {
    if (!connectionStart || !mousePos || mode !== 'connect') return null;

    return (
      <Line
        points={[connectionStart.x, connectionStart.y, mousePos.x, mousePos.y]}
        stroke="#3B82F6"
        strokeWidth={2}
        dash={[5, 5]}
        opacity={0.7}
      />
    );
  };

  return (
    <Layer onMouseMove={handleMouseMove} onClick={handleCancel}>
      {renderDrawingLine()}
      
      {/* Render connection ports on resources when in connect mode */}
      {mode === 'connect' && (
        <>
          {Array.from(resources.values()).map((resource) => {
            const domain = domains.get(resource.domainId);
            if (!domain) return null;

            // Calculate absolute position
            const absX = domain.position.x + resource.position.x + 160; // Right edge
            const absY = domain.position.y + resource.position.y + 40; // Center

            return (
              <Group key={`port-${resource.id}`}>
                <Circle
                  x={absX}
                  y={absY}
                  radius={8}
                  fill={connectionStart?.id === resource.id ? '#3B82F6' : '#10B981'}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    if (!connectionStart) {
                      handleStartConnection(resource.id, 'resource', absX, absY);
                    } else {
                      handleEndConnection(resource.id, 'resource');
                    }
                  }}
                  onMouseEnter={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) {
                      container.style.cursor = 'crosshair';
                    }
                  }}
                  onMouseLeave={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) {
                      container.style.cursor = 'default';
                    }
                  }}
                />
              </Group>
            );
          })}
        </>
      )}
    </Layer>
  );
};

export default ConnectionTool;

// Hook to manage connection mode
export const useConnectionMode = () => {
  const mode = useUIStore((state) => state.mode);
  const setMode = useUIStore((state) => state.setMode);

  const startConnecting = () => setMode('connect');
  const stopConnecting = () => setMode('select');

  return {
    isConnecting: mode === 'connect',
    startConnecting,
    stopConnecting
  };
};
