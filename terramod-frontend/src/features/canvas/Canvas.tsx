import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Stage, Layer, Line, Arrow } from 'react-konva';
import Konva from 'konva';
import { useInfraStore } from '../../store/infraStore';
import { useUIStore } from '../../store/uiStore';
import { useZoomPan } from './hooks/useZoomPan';
import ResourceCard from './ResourceCard';
import { CANVAS_MIN_WIDTH, GRID_SIZE } from '../../config/constants';
import { ServiceDefinition } from '../../api/registry';

interface ConnectionDraft {
  sourceId: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const Canvas: React.FC = () => {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const domains = useInfraStore((state) => Array.from(state.domains.values()));
  const resources = useInfraStore((state) => Array.from(state.resources.values()));
  const connections = useInfraStore((state) => Array.from(state.connections.values()));
  const addDomain = useInfraStore((state) => state.addDomain);
  const addResource = useInfraStore((state) => state.addResource);
  const addConnection = useInfraStore((state) => state.addConnection);

  const viewport = useUIStore((state) => state.viewport);
  const selectedId = useUIStore((state) => state.selectedId);
  const setSelectedId = useUIStore((state) => state.setSelectedId);

  const [dimensions, setDimensions] = React.useState({ width: 800, height: 600 });
  const [dropFeedback, setDropFeedback] = React.useState<{ x: number; y: number } | null>(null);
  const [connectionDraft, setConnectionDraft] = useState<ConnectionDraft | null>(null);

  const { handleWheel } = useZoomPan(stageRef);

  // Handle window resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = Math.max(containerRef.current.offsetWidth, CANVAS_MIN_WIDTH);
        const height = containerRef.current.offsetHeight;
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedId(null);
        setConnectionDraft(null);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          const resource = resources.find(r => r.id === selectedId);
          if (resource && confirm(`Delete ${resource.name}?`)) {
            useInfraStore.getState().deleteResource(selectedId);
            setSelectedId(null);
          }
        }
      }
    };

    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, [selectedId, resources, setSelectedId]);

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      setSelectedId(null);
    }
  }, [setSelectedId]);

  const generateId = (prefix: string): string => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const snapToGrid = (value: number): number => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  };

  const getDefaultArguments = (service: ServiceDefinition): Record<string, any> => {
    const defaults: Record<string, any> = {};

    if (service.resource_type === 'aws_vpc') {
      defaults.cidr_block = '10.0.0.0/16';
      defaults.enable_dns_hostnames = true;
      defaults.enable_dns_support = true;
    } else if (service.resource_type === 'aws_subnet') {
      defaults.cidr_block = '10.0.1.0/24';
      defaults.availability_zone = 'us-east-1a';
    } else if (service.resource_type === 'aws_security_group') {
      defaults.description = 'Managed by Terramod';
      defaults.egress = [{
        from_port: 0,
        to_port: 0,
        protocol: '-1',
        cidr_blocks: ['0.0.0.0/0']
      }];
    } else if (service.resource_type === 'aws_instance') {
      defaults.ami = 'ami-0c55b159cbfafe1f0';
      defaults.instance_type = 't3.micro';
    } else if (service.resource_type === 'aws_lambda_function') {
      defaults.runtime = 'python3.11';
      defaults.handler = 'index.handler';
      defaults.memory_size = 128;
      defaults.timeout = 30;
    } else if (service.resource_type === 'aws_iam_role') {
      defaults.assume_role_policy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [{
          Action: 'sts:AssumeRole',
          Effect: 'Allow',
          Principal: { Service: 'lambda.amazonaws.com' }
        }]
      }, null, 2);
    } else if (service.resource_type === 'aws_cloudwatch_log_group') {
      defaults.retention_in_days = 7;
    }

    return defaults;
  };

  const getResourceCountByDomain = (domainType: string): number => {
    return resources.filter(r => {
      const domain = domains.find(d => d.id === r.domainId);
      return domain?.type === domainType;
    }).length;
  };

  const handleStageDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDropFeedback(null);

    const stage = stageRef.current;
    if (!stage) return;

    try {
      const serviceData = e.dataTransfer.getData('service');
      if (!serviceData) {
        console.warn('⚠️ No service data in drop event');
        return;
      }

      const service: ServiceDefinition = JSON.parse(serviceData);
      console.log('✅ Dropped service:', service.resource_type);

      const stageBox = stage.container().getBoundingClientRect();
      const rawX = (e.clientX - stageBox.left - viewport.x) / viewport.zoom;
      const rawY = (e.clientY - stageBox.top - viewport.y) / viewport.zoom;

      const x = snapToGrid(rawX);
      const y = snapToGrid(rawY);

      console.log('📍 Drop position (snapped):', { x, y, viewport });

      const resourceId = generateId(service.resource_type);
      const resourceName = service.resource_type.replace('aws_', '').replace(/_/g, '_');

      let targetDomain = domains.find(d => d.type === service.domain);

      if (!targetDomain) {
        console.log('🆕 Creating new domain:', service.domain);

        const domainId = generateId(`domain_${service.domain}`);
        const resourceCount = getResourceCountByDomain(service.domain);

        const newDomain = {
          id: domainId,
          name: `${service.domain}_${resourceCount + 1}`,
          type: service.domain,
          resourceIds: [resourceId],
          inputs: [],
          outputs: [],
          position: { x: 0, y: 0 },
          width: 0,
          height: 0
        };

        addDomain(newDomain);
        targetDomain = newDomain;
      } else {
        console.log('➕ Adding to existing domain:', targetDomain.name);
      }

      const newResource = {
        id: resourceId,
        type: service.resource_type,
        domainId: targetDomain.id,
        name: `${resourceName}_${targetDomain.resourceIds.length + 1}`,
        arguments: getDefaultArguments(service),
        position: { x, y },
        validationState: { isValid: true, errors: [], warnings: [] }
      };

      addResource(newResource);
      setSelectedId(resourceId);
      console.log('✅ Created resource:', resourceId);
    } catch (error) {
      console.error('❌ Failed to handle drop:', error);
    }
  }, [domains, viewport, addDomain, addResource, setSelectedId, resources]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';

    const stage = stageRef.current;
    if (stage) {
      const stageBox = stage.container().getBoundingClientRect();
      const rawX = (e.clientX - stageBox.left - viewport.x) / viewport.zoom;
      const rawY = (e.clientY - stageBox.top - viewport.y) / viewport.zoom;
      const x = snapToGrid(rawX);
      const y = snapToGrid(rawY);
      setDropFeedback({ x, y });
    }
  }, [viewport]);

  const handleDragLeave = useCallback(() => {
    setDropFeedback(null);
  }, []);

  const handleConnectionStart = useCallback((resourceId: string, x: number, y: number) => {
    console.log('🔗 Starting connection from:', resourceId);
    setConnectionDraft({
      sourceId: resourceId,
      startX: x,
      startY: y,
      currentX: x,
      currentY: y
    });
  }, []);

  const handleConnectionDrag = useCallback((x: number, y: number) => {
    if (connectionDraft) {
      setConnectionDraft({
        ...connectionDraft,
        currentX: x,
        currentY: y
      });
    }
  }, [connectionDraft]);

  const handleConnectionEnd = useCallback((targetId: string | null) => {
    if (!connectionDraft) return;

    if (targetId && targetId !== connectionDraft.sourceId) {
      console.log('🔗 Completing connection to:', targetId);

      const newConnection = {
        id: generateId('conn'),
        sourceId: connectionDraft.sourceId,
        targetId: targetId,
        sourceType: 'resource' as const,
        targetType: 'resource' as const,
        connectionType: 'dependency' as const,
        outputName: undefined,
        inputName: undefined
      };

      addConnection(newConnection);
      console.log('✅ Connection created:', newConnection.id);
    }

    setConnectionDraft(null);
  }, [connectionDraft, addConnection]);

  const handleStageMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (connectionDraft) {
      const stage = stageRef.current;
      if (!stage) return;

      const pos = stage.getPointerPosition();
      if (pos) {
        const x = (pos.x - viewport.x) / viewport.zoom;
        const y = (pos.y - viewport.y) / viewport.zoom;
        handleConnectionDrag(x, y);
      }
    }
  }, [connectionDraft, viewport, handleConnectionDrag]);

  const renderGrid = () => {
    const lines = [];
    const gridColor = '#374151'; // gray-700
    const gridOpacity = 0.3;

    for (let i = 0; i < dimensions.width / GRID_SIZE + 10; i++) {
      lines.push(
        <Line
          key={`v-${i}`}
          points={[i * GRID_SIZE, 0, i * GRID_SIZE, dimensions.height]}
          stroke={gridColor}
          strokeWidth={1}
          opacity={gridOpacity}
        />
      );
    }

    for (let i = 0; i < dimensions.height / GRID_SIZE + 10; i++) {
      lines.push(
        <Line
          key={`h-${i}`}
          points={[0, i * GRID_SIZE, dimensions.width, i * GRID_SIZE]}
          stroke={gridColor}
          strokeWidth={1}
          opacity={gridOpacity}
        />
      );
    }

    return lines;
  };

  const renderConnections = () => {
    return connections.map((connection) => {
      const sourceResource = resources.find(r => r.id === connection.sourceId);
      const targetResource = resources.find(r => r.id === connection.targetId);

      if (!sourceResource || !targetResource) return null;

      const isSelected = selectedId === connection.id;

      const startX = sourceResource.position.x + 160;
      const startY = sourceResource.position.y + 40;
      const endX = targetResource.position.x;
      const endY = targetResource.position.y + 40;

      return (
        <Arrow
          key={connection.id}
          points={[startX, startY, endX, endY]}
          stroke={isSelected ? '#D1D5DB' : '#6B7280'} // gray-300 : gray-500
          strokeWidth={isSelected ? 3 : 2}
          fill={isSelected ? '#D1D5DB' : '#6B7280'}
          onClick={() => setSelectedId(connection.id)}
          onMouseEnter={(e) => {
            const container = e.target.getStage()?.container();
            if (container) container.style.cursor = 'pointer';
          }}
          onMouseLeave={(e) => {
            const container = e.target.getStage()?.container();
            if (container) container.style.cursor = 'default';
          }}
        />
      );
    });
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-gray-900 overflow-hidden relative"
      onDrop={handleStageDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Zoom indicator */}
      <div className="absolute top-4 right-4 z-10 bg-gray-800 border border-gray-700 px-3 py-2 rounded shadow-lg text-sm text-gray-300">
        Zoom: {Math.round(viewport.zoom * 100)}%
      </div>

      {/* Keyboard shortcuts */}
      <div className="absolute bottom-4 left-4 z-10 bg-gray-800 border border-gray-700 px-3 py-2 rounded shadow-lg text-xs text-gray-400">
        <div className="font-semibold mb-1 text-gray-300">💡 Tips:</div>
        <div>• Click resource to configure</div>
        <div>• Drag resource to move</div>
        <div>• Drag connection dot to connect</div>
        <div>• Del/Backspace to delete</div>
        <div>• Esc to deselect</div>
      </div>

      {/* Drop feedback */}
      {dropFeedback && (
        <div
          className="absolute z-10 w-40 h-20 border-2 border-dashed border-gray-500 bg-gray-500 opacity-20 rounded pointer-events-none"
          style={{
            left: dropFeedback.x * viewport.zoom + viewport.x,
            top: dropFeedback.y * viewport.zoom + viewport.y,
            transform: 'translate(0, 0)'
          }}
        />
      )}

      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onMouseMove={handleStageMouseMove}
        onMouseUp={() => handleConnectionEnd(null)}
        scaleX={viewport.zoom}
        scaleY={viewport.zoom}
        x={viewport.x}
        y={viewport.y}
        draggable={false}
      >
        <Layer listening={false}>
          {renderGrid()}
        </Layer>

        <Layer>
          {renderConnections()}

          {connectionDraft && (
            <Line
              points={[
                connectionDraft.startX,
                connectionDraft.startY,
                connectionDraft.currentX,
                connectionDraft.currentY
              ]}
              stroke="#9CA3AF" // gray-400
              strokeWidth={2}
              dash={[5, 5]}
              opacity={0.7}
            />
          )}
        </Layer>

        <Layer>
          {resources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              onConnectionStart={handleConnectionStart}
              onConnectionEnd={handleConnectionEnd}
              isConnectionDragging={!!connectionDraft}
            />
          ))}
        </Layer>
      </Stage>

      {resources.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-gray-500">
            <p className="text-lg font-medium mb-2">🚀 Start Building Your Infrastructure</p>
            <p className="text-sm">Drag services from the sidebar onto the canvas</p>
            <p className="text-xs mt-2">Resources snap to {GRID_SIZE}px grid</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Canvas;