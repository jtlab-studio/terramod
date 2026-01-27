import { Position } from '../../../types/domain';
import { Domain } from '../../../types/domain';
import { SNAP_TO_GRID, GRID_SIZE } from '../../../config/constants';

export const snapToGrid = (
  position: Position,
  gridSize: number = GRID_SIZE
): Position => {
  if (!SNAP_TO_GRID) return position;

  return {
    x: Math.round(position.x / gridSize) * gridSize,
    y: Math.round(position.y / gridSize) * gridSize,
  };
};

export const snapDomainToGrid = (domain: Domain): Domain => {
  const snappedPosition = snapToGrid(domain.position);
  return {
    ...domain,
    position: snappedPosition,
  };
};

export const isAlignedToGrid = (
  position: Position,
  gridSize: number = GRID_SIZE
): boolean => {
  return (
    position.x % gridSize === 0 &&
    position.y % gridSize === 0
  );
};
