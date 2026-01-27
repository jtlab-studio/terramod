import React, { useRef } from 'react';
import { Stage, Layer } from 'react-konva';
import Konva from 'konva';
import { useInfraStore } from '../../store/infraStore';
import { useUIStore } from '../../store/uiStore';
import { useCanvasInteractions } from './hooks/useCanvasInteractions';
import { useZoomPan } from './hooks/useZoomPan';
import DomainBoundary from './DomainBoundary';
import Connection from './Connection';

const Canvas: React.FC = () => {
  const stageRef = useRef<Konva.Stage>(null);
  const domains = useInfraStore((state) => Array.from(state.domains.values()));
  const connections = useInfraStore((state) => Array.from(state.connections.values()));
  const viewport = useUIStore((state) => state.viewport);
  const selectedId = useUIStore((state) => state.selectedId);
  const setSelectedId = useUIStore((state) => state.setSelectedId);

  const { handleWheel, handlePan } = useZoomPan(stageRef);
  const { handleKeyDown } = useCanvasInteractions();

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === e.target.getStage()) {
      setSelectedId(null);
    }
  };

  return (
    <Stage
      ref={stageRef}
      width={window.innerWidth - 400}
      height={window.innerHeight - 60}
      onWheel={handleWheel}
      onClick={handleStageClick}
      scaleX={viewport.zoom}
      scaleY={viewport.zoom}
      x={viewport.x}
      y={viewport.y}
    >
      <Layer>
        {connections.map((connection) => (
          <Connection key={connection.id} connection={connection} />
        ))}
      </Layer>
      <Layer>
        {domains.map((domain) => (
          <DomainBoundary key={domain.id} domain={domain} />
        ))}
      </Layer>
    </Stage>
  );
};

export default Canvas;
