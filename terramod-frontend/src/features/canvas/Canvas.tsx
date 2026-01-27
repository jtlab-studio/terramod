import React, { useRef, useEffect, useCallback } from 'react';
import { Stage, Layer } from 'react-konva';
import Konva from 'konva';
import { useInfraStore } from '../../store/infraStore';
import { useUIStore } from '../../store/uiStore';
import { useCanvasInteractions } from './hooks/useCanvasInteractions';
import { useZoomPan } from './hooks/useZoomPan';
import DomainBoundary from './DomainBoundary';
import Connection from './Connection';
import { CANVAS_MIN_WIDTH, CANVAS_PADDING } from '../../config/constants';

const Canvas: React.FC = () => {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const domains = useInfraStore((state) => Array.from(state.domains.values()));
  const connections = useInfraStore((state) => Array.from(state.connections.values()));
  const addDomain = useInfraStore((state) => state.addDomain);
  const addResource = useInfraStore((state) => state.addResource);
  
  const viewport = useUIStore((state) => state.viewport);
  const selectedId = useUIStore((state) => state.selectedId);
  const setSelectedId = useUIStore((state) => state.setSelectedId);
  const mode = useUIStore((state) => state.mode);

  const [dimensions, setDimensions] = React.useState({ width: 800, height: 600 });

  const { handleWheel } = useZoomPan(stageRef);
  const { handleKeyDown } = useCanvasInteractions();

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
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      setSelectedId(null);
    }
  }, [setSelectedId]);

  const handleStageDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    const stage = stageRef.current;
    if (!stage) return;

    try {
      const serviceData = e.dataTransfer.getData('service');
      if (!serviceData) return;

      const service = JSON.parse(serviceData);
      
      // Get drop position relative to stage
      const stageBox = stage.container().getBoundingClientRect();
      const x = (e.clientX - stageBox.left - viewport.x) / viewport.zoom;
      const y = (e.clientY - stageBox.top - viewport.y) / viewport.zoom;

      // Create resource from dropped service
      const resourceId = `${service.resource_type}_${Date.now()}`;
      const newResource = {
        id: resourceId,
        type: service.resource_type,
        domainId: '', // Will be assigned when placed in domain
        name: service.resource_type.replace('aws_', ''),
        arguments: {},
        position: { x, y },
        validationState: { isValid: true, errors: [], warnings: [] }
      };

      // Find if dropped on a domain
      let targetDomain = null;
      for (const domain of domains) {
        const inDomain = 
          x >= domain.position.x && 
          x <= domain.position.x + domain.width &&
          y >= domain.position.y && 
          y <= domain.position.y + domain.height;
        
        if (inDomain) {
          targetDomain = domain;
          break;
        }
      }

      if (targetDomain) {
        // Add to existing domain
        newResource.domainId = targetDomain.id;
        newResource.position = {
          x: x - targetDomain.position.x,
          y: y - targetDomain.position.y
        };
        addResource(newResource);
      } else {
        // Create new domain for this service
        const domainId = `domain_${service.domain}_${Date.now()}`;
        const newDomain = {
          id: domainId,
          name: service.domain,
          type: service.domain,
          resourceIds: [resourceId],
          inputs: [],
          outputs: [],
          position: { x: x - 50, y: y - 50 },
          width: 300,
          height: 200
        };
        
        newResource.domainId = domainId;
        newResource.position = { x: 50, y: 50 };
        
        addDomain(newDomain);
        addResource(newResource);
      }
    } catch (error) {
      console.error('Failed to handle drop:', error);
    }
  }, [domains, viewport, addDomain, addResource]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div 
      ref={containerRef}
      className="flex-1 bg-gray-100 overflow-hidden relative"
      onDrop={handleStageDrop}
      onDragOver={handleDragOver}
    >
      {/* Mode indicator */}
      <div className="absolute top-4 left-4 z-10 bg-white px-3 py-2 rounded shadow-sm text-sm">
        Mode: <span className="font-medium capitalize">{mode}</span>
      </div>

      {/* Zoom indicator */}
      <div className="absolute top-4 right-4 z-10 bg-white px-3 py-2 rounded shadow-sm text-sm">
        Zoom: {Math.round(viewport.zoom * 100)}%
      </div>

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
        draggable={mode === 'pan'}
      >
        {/* Connection layer (below domains) */}
        <Layer>
          {connections.map((connection) => (
            <Connection key={connection.id} connection={connection} />
          ))}
        </Layer>

        {/* Domain layer */}
        <Layer>
          {domains.map((domain) => (
            <DomainBoundary key={domain.id} domain={domain} />
          ))}
        </Layer>
      </Stage>

      {/* Help text when empty */}
      {domains.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-gray-400">
            <p className="text-lg font-medium mb-2">Start Building Your Infrastructure</p>
            <p className="text-sm">Drag services from the sidebar onto the canvas</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Canvas;
