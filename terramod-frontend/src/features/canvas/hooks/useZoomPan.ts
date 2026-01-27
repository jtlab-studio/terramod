import { RefObject } from 'react';
import Konva from 'konva';
import { useUIStore } from '../../../store/uiStore';
import { MAX_ZOOM, MIN_ZOOM } from '../../../config/constants';

export const useZoomPan = (stageRef: RefObject<Konva.Stage>) => {
  const viewport = useUIStore((state) => state.viewport);
  const updateViewport = useUIStore((state) => state.updateViewport);

  const clampZoom = (zoom: number): number => {
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
  };

  const handleZoom = (delta: number, pointerPosition: { x: number; y: number }) => {
    const newZoom = clampZoom(viewport.zoom + delta);
    updateViewport({ zoom: newZoom });
  };

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.1;
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    const clampedScale = clampZoom(newScale);

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };

    updateViewport({
      zoom: clampedScale,
      x: newPos.x,
      y: newPos.y,
    });
  };

  const handlePan = (delta: { x: number; y: number }) => {
    updateViewport({
      x: viewport.x + delta.x,
      y: viewport.y + delta.y,
    });
  };

  return {
    handleZoom,
    handleWheel,
    handlePan,
  };
};
