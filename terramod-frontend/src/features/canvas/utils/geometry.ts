import type { Position } from '../../../types/domain';
import type { Domain } from '../../../types/domain';
import type { Resource } from '../../../types/resource';
export const calculateConnectionPath = (
    source: Position,
    target: Position
): number[] => {
    return [source.x, source.y, target.x, target.y];
};

export type Side = 'left' | 'right' | 'top' | 'bottom';

export const getConnectionAnchorPoint = (
    element: Domain | Resource,
    side: Side
): Position => {
    const width = 'width' in element ? element.width : 160;
    const height = 'height' in element ? element.height : 80;

    switch (side) {
        case 'left':
            return { x: element.position.x, y: element.position.y + height / 2 };
        case 'right':
            return { x: element.position.x + width, y: element.position.y + height / 2 };
        case 'top':
            return { x: element.position.x + width / 2, y: element.position.y };
        case 'bottom':
            return { x: element.position.x + width / 2, y: element.position.y + height };
    }
};

export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export const checkBoundingBoxCollision = (
    rect1: BoundingBox,
    rect2: BoundingBox
): boolean => {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
};

export const distanceBetweenPoints = (p1: Position, p2: Position): number => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
};