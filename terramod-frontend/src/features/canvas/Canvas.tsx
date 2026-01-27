import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import Konva from 'konva';
import { useInfraStore } from '../../store/infraStore';
import { useUIStore } from '../../store/uiStore';
import { useZoomPan } from './hooks/useZoomPan';
import ResourceCard from './ResourceCard';
import { CANVAS_MIN_WIDTH, GRID_SIZE } from '../../config/constants';
import { ServiceDefinition } from '../../api/registry';

const Canvas: React.FC = () => {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const domains = useInfraStore((state) => Array.from(state.domains.values()));
  const resources = useInfraStore((state) => Array.from(state.resources.values()));
  const connections = useInfraStore((state) => Array.from(state.connections.values()));
  const addDomain = useInfraStore((state) => state.addDomain);
  const addResource = useInfraStore((state) => state.addResource);
  const addConnection = useInfraStore((state) => state.addConnection);
  const deleteConnection = useInfraStore((state) => state.deleteConnection);

  const viewport = useUIStore((state) => state.viewport);
  const selectedId = useUIStore((state) => state.selectedId);
  const setSelectedId = useUIStore((state) => state.setSelectedId);

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [dropFeedback, setDropFeedback] = useState<{ x: number; y: number } | null>(null);
  const [connectionDraft, setConnectionDraft] = useState<{
    sourceId: string;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const [draggingResourceId, setDraggingResourceId] = useState<string | null>(null);
  const [dragPositions, setDragPositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  const { handleWheel } = useZoomPan(stageRef);

  // Window resize
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

  // Keyboard shortcuts
  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedId(null);
        setConnectionDraft(null);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          const resource = resources.find(r => r.id === selectedId);
          const connection = connections.find(c => c.id === selectedId);

          if (resource && confirm(`Delete "${resource.name}"?`)) {
            useInfraStore.getState().deleteResource(selectedId);
            setSelectedId(null);
          } else if (connection) {
            deleteConnection(selectedId);
            setSelectedId(null);
          }
        }
      }
    };
    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, [selectedId, resources, connections, setSelectedId, deleteConnection]);

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
    } else if (service.resource_type === 'aws_subnet') {
      defaults.cidr_block = '10.0.1.0/24';
    } else if (service.resource_type === 'aws_instance') {
      defaults.ami = 'ami-0c55b159cbfafe1f0';
      defaults.instance_type = 't3.micro';
    } else if (service.resource_type === 'aws_s3_bucket') {
      defaults.bucket = `my-bucket-${Date.now()}`;
    }
    return defaults;
  };

  // Drop service from sidebar
  const handleStageDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDropFeedback(null);

    const stage = stageRef.current;
    if (!stage) return;

    try {
      const serviceData = e.dataTransfer.getData('service');
      if (!serviceData) return;

      const service: ServiceDefinition = JSON.parse(serviceData);

      const stageBox = stage.container().getBoundingClientRect();
      const rawX = (e.clientX - stageBox.left - viewport.x) / viewport.zoom;
      const rawY = (e.clientY - stageBox.top - viewport.y) / viewport.zoom;
      const x = snapToGrid(rawX);
      const y = snapToGrid(rawY);

      const resourceId = generateId(service.resource_type);
      const resourceName = service.resource_type.replace('aws_', '').replace(/_/g, '_');

      let targetDomain = domains.find(d => d.type === service.domain);

      if (!targetDomain) {
        const domainId = generateId(`domain_${service.domain}`);
        const newDomain = {
          id: domainId,
          name: `${service.domain}_${domains.filter(d => d.type === service.domain).length + 1}`,
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
      }

      const newResource = {
        id: resourceId,
        type: service.resource_type,
        domainId: targetDomain.id,
        name: `${resourceName}_${(targetDomain.resourceIds?.length || 0) + 1}`,
        arguments: getDefaultArguments(service),
        position: { x, y },
        validationState: { isValid: true, errors: [], warnings: [] }
      };

      addResource(newResource);
      setSelectedId(resourceId);

      setTimeout(() => stageRef.current?.batchDraw(), 0);
    } catch (error) {
      console.error('Drop failed:', error);
    }
  }, [domains, viewport, addDomain, addResource, setSelectedId]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';

    const stage = stageRef.current;
    if (stage) {
      const stageBox = stage.container().getBoundingClientRect();
      const rawX = (e.clientX - stageBox.left - viewport.x) / viewport.zoom;
      const rawY = (e.clientY - stageBox.top - viewport.y) / viewport.zoom;
      setDropFeedback({ x: snapToGrid(rawX), y: snapToGrid(rawY) });
    }
  }, [viewport]);

  // Connection creation
  const handleConnectionStart = useCallback((resourceId: string, x: number, y: number) => {
    setConnectionDraft({
      sourceId: resourceId,
      startX: x,
      startY: y,
      currentX: x,
      currentY: y
    });
  }, []);

  const handleConnectionEnd = useCallback((targetId: string | null) => {
    if (!connectionDraft) return;

    if (targetId && targetId !== connectionDraft.sourceId) {
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
        setConnectionDraft({ ...connectionDraft, currentX: x, currentY: y });
      }
    }
  }, [connectionDraft, viewport]);

  // Handle live drag position updates
  const handleResourceDragMove = useCallback((resourceId: string, x: number, y: number) => {
    setDragPositions(prev => {
      const newMap = new Map(prev);
      newMap.set(resourceId, { x, y });
      return newMap;
    });
  }, []);

  // Calculate orthogonal path (following grid lines)
  const calculateOrthogonalPath = (
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ): number[] => {
    const midX = (startX + endX) / 2;

    return [
      startX, startY,
      midX, startY,
      midX, endY,
      endX, endY
    ];
  };

  const renderGrid = () => {
    const lines = [];
    const gridColor = '#374151';

    for (let i = 0; i < dimensions.width / GRID_SIZE + 10; i++) {
      lines.push(
        <Line
          key={`v-${i}`}
          points={[i * GRID_SIZE, 0, i * GRID_SIZE, dimensions.height]}
          stroke={gridColor}
          strokeWidth={1}
          opacity={0.3}
          listening={false}
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
          opacity={0.3}
          listening={false}
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
      const isDragging = draggingResourceId === connection.sourceId ||
        draggingResourceId === connection.targetId;

      // Use drag position if available, otherwise use stored position
      const sourcePos = dragPositions.get(connection.sourceId) || sourceResource.position;
      const targetPos = dragPositions.get(connection.targetId) || targetResource.position;

      // Calculate connection points
      const startX = sourcePos.x + 160;
      const startY = sourcePos.y + 40;
      const endX = targetPos.x;
      const endY = targetPos.y + 40;

      // Calculate orthogonal path
      const points = calculateOrthogonalPath(startX, startY, endX, endY);

      return (
        <Line
          key={connection.id}
          points={points}
          stroke={isSelected ? '#D1D5DB' : '#6B7280'}
          strokeWidth={isSelected ? 4 : 2}
          lineCap="round"
          lineJoin="round"
          dash={isDragging ? [5, 5] : undefined}
          opacity={isDragging ? 0.6 : 1}
          hitStrokeWidth={15}
          onClick={(e) => {
            e.cancelBubble = true;
            setSelectedId(connection.id);
            console.log('🔗 Selected connection:', connection.id);
          }}
          onTap={(e) => {
            // Mobile tap support
            e.cancelBubble = true;
            setSelectedId(connection.id);
            console.log('🔗 Selected connection (tap):', connection.id);
          }}
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
      onDragLeave={() => setDropFeedback(null)}
    >
      {/* UI Indicators */}
      <div className="absolute top-4 right-4 z-10 bg-gray-800 border border-gray-700 px-3 py-2 rounded text-sm text-gray-300">
        Zoom: {Math.round(viewport.zoom * 100)}%
      </div>

      {connectionDraft && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-blue-500 text-white px-4 py-2 rounded text-sm">
          🔗 Creating connection...
        </div>
      )}

      {selectedId && connections.find(c => c.id === selectedId) && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-10 bg-gray-800 border border-gray-700 text-gray-300 px-4 py-2 rounded text-sm">
          Connection selected - Press DEL to delete
        </div>
      )}

      <div className="absolute bottom-4 left-4 z-10 bg-gray-800 border border-gray-700 px-3 py-2 rounded text-xs text-gray-400">
        <div className="font-semibold mb-1 text-gray-300">💡 Tips:</div>
        <div>• Click center of card to select</div>
        <div>• Drag anywhere on card to move</div>
        <div>• Connections follow grid lines</div>
        <div>• Click connection line to select it</div>
        <div>• Del to delete selected item</div>
      </div>

      {dropFeedback && (
        <div
          className="absolute z-10 w-40 h-20 border-2 border-dashed border-gray-500 bg-gray-500 opacity-20 rounded pointer-events-none"
          style={{
            left: dropFeedback.x * viewport.zoom + viewport.x,
            top: dropFeedback.y * viewport.zoom + viewport.y,
          }}
        />
      )}

      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        onWheel={handleWheel}
        onClick={(e) => {
          const clickedOnEmpty = e.target === e.target.getStage();
          if (clickedOnEmpty) {
            setSelectedId(null);
            setConnectionDraft(null);
          }
        }}
        onMouseMove={handleStageMouseMove}
        onMouseUp={() => connectionDraft && setConnectionDraft(null)}
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
              points={calculateOrthogonalPath(
                connectionDraft.startX,
                connectionDraft.startY,
                connectionDraft.currentX,
                connectionDraft.currentY
              )}
              stroke="#9CA3AF"
              strokeWidth={2}
              dash={[5, 5]}
              opacity={0.7}
              listening={false}
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
              onDragStart={() => setDraggingResourceId(resource.id)}
              onDragMove={handleResourceDragMove}
              onDragEnd={() => {
                setDraggingResourceId(null);
                setDragPositions(prev => {
                  const newMap = new Map(prev);
                  newMap.delete(resource.id);
                  return newMap;
                });
              }}
              isConnectionDragging={!!connectionDraft}
            />
          ))}
        </Layer>
      </Stage>

      {resources.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-gray-500">
            <p className="text-lg font-medium mb-2">🚀 Start Building</p>
            <p className="text-sm">Drag services from sidebar to canvas</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Canvas;