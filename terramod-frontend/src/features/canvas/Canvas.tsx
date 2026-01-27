import React, { useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import Konva from 'konva';
import { useInfraStore } from '../../store/infraStore';
import { useUIStore } from '../../store/uiStore';
import { useCanvasInteractions } from './hooks/useCanvasInteractions';
import { useZoomPan } from './hooks/useZoomPan';
import { useAutoValidation } from './hooks/useAutoValidation';
import ResourceCard from './ResourceCard';
import Connection from './Connection';
import ConnectionTool from './ConnectionTool';
import { CANVAS_MIN_WIDTH, CANVAS_PADDING, GRID_SIZE } from '../../config/constants';
import { ServiceDefinition } from '../../api/registry';

const Canvas: React.FC = () => {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const domains = useInfraStore((state) => Array.from(state.domains.values()));
  const resources = useInfraStore((state) => Array.from(state.resources.values()));
  const connections = useInfraStore((state) => Array.from(state.connections.values()));
  const addDomain = useInfraStore((state) => state.addDomain);
  const addResource = useInfraStore((state) => state.addResource);

  const viewport = useUIStore((state) => state.viewport);
  const selectedId = useUIStore((state) => state.selectedId);
  const setSelectedId = useUIStore((state) => state.setSelectedId);
  const mode = useUIStore((state) => state.mode);
  const setMode = useUIStore((state) => state.setMode);

  const [dimensions, setDimensions] = React.useState({ width: 800, height: 600 });
  const [dropFeedback, setDropFeedback] = React.useState<{ x: number; y: number } | null>(null);

  const { handleWheel } = useZoomPan(stageRef);
  const { handleKeyDown } = useCanvasInteractions();

  // Enable auto-validation
  useAutoValidation();

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
      if (e.key === 'v' || e.key === 'Escape') {
        setMode('select');
      } else if (e.key === 'c') {
        setMode('connect');
      } else if (e.key === 'h') {
        setMode('pan');
      }
    };

    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, [setMode]);

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      setSelectedId(null);
    }
  }, [setSelectedId]);

  // Generate unique ID
  const generateId = (prefix: string): string => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Snap to grid
  const snapToGrid = (value: number): number => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  };

  // Get default arguments for a service
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

  // Count resources per domain
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

      // Get drop position relative to stage (accounting for zoom and pan)
      const stageBox = stage.container().getBoundingClientRect();
      const rawX = (e.clientX - stageBox.left - viewport.x) / viewport.zoom;
      const rawY = (e.clientY - stageBox.top - viewport.y) / viewport.zoom;

      // Snap to grid
      const x = snapToGrid(rawX);
      const y = snapToGrid(rawY);

      console.log('📍 Drop position (snapped):', { x, y, viewport });

      // Generate IDs
      const resourceId = generateId(service.resource_type);
      const resourceName = service.resource_type.replace('aws_', '').replace(/_/g, '_');

      // Find or create domain for this service type
      let targetDomain = domains.find(d => d.type === service.domain);

      if (!targetDomain) {
        // Create new domain (logical only, no visual representation)
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
          position: { x: 0, y: 0 }, // Not used for rendering
          width: 0,
          height: 0
        };

        addDomain(newDomain);
        targetDomain = newDomain;
      } else {
        // Will be added to existing domain via addResource
        console.log('➕ Adding to existing domain:', targetDomain.name);
      }

      const newResource = {
        id: resourceId,
        type: service.resource_type,
        domainId: targetDomain.id,
        name: `${resourceName}_${targetDomain.resourceIds.length + 1}`,
        arguments: getDefaultArguments(service),
        position: { x, y }, // Absolute position on canvas
        validationState: { isValid: false, errors: [], warnings: [] }
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

  // Generate grid lines
  const renderGrid = () => {
    const lines = [];
    const gridColor = '#E5E7EB'; // gray-200
    const gridOpacity = 0.5;

    // Vertical lines
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

    // Horizontal lines
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

  const getModeDisplay = () => {
    switch (mode) {
      case 'connect': return '🔗 Connect Mode (C)';
      case 'pan': return '✋ Pan Mode (H)';
      default: return '👆 Select Mode (V)';
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-white overflow-hidden relative"
      onDrop={handleStageDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Mode indicator */}
      <div className={`absolute top-4 left-4 z-10 px-3 py-2 rounded shadow-sm text-sm font-medium ${mode === 'connect' ? 'bg-blue-600 text-white' : 'bg-white text-gray-800'
        }`}>
        {getModeDisplay()}
      </div>

      {/* Zoom indicator */}
      <div className="absolute top-4 right-4 z-10 bg-white px-3 py-2 rounded shadow-sm text-sm">
        Zoom: {Math.round(viewport.zoom * 100)}%
      </div>

      {/* Keyboard shortcuts */}
      <div className="absolute bottom-4 left-4 z-10 bg-white px-3 py-2 rounded shadow-sm text-xs text-gray-600">
        <div className="font-semibold mb-1">Shortcuts:</div>
        <div>V - Select | C - Connect | H - Pan | Esc - Cancel</div>
        <div className="mt-1 text-gray-500">Grid: {GRID_SIZE}px snap</div>
      </div>

      {/* Drop feedback */}
      {dropFeedback && (
        <div
          className="absolute z-10 w-40 h-20 border-2 border-dashed border-blue-500 bg-blue-50 opacity-50 rounded pointer-events-none"
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
        scaleX={viewport.zoom}
        scaleY={viewport.zoom}
        x={viewport.x}
        y={viewport.y}
        draggable={false}
      >
        {/* Grid layer */}
        <Layer listening={false}>
          {renderGrid()}
        </Layer>

        {/* Connection layer */}
        <Layer>
          {connections.map((connection) => (
            <Connection key={connection.id} connection={connection} />
          ))}
        </Layer>

        {/* Resource layer - resources rendered directly, no domain boxes */}
        <Layer>
          {resources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </Layer>

        {/* Connection tool layer */}
        <ConnectionTool stageRef={stageRef} />
      </Stage>

      {/* Help text when empty */}
      {resources.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-gray-400">
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