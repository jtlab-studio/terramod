import { useCallback } from 'react';
import { useUIStore } from '../../../store/uiStore';

export const useCanvasInteractions = () => {
  const setSelectedId = useUIStore((state) => state.setSelectedId);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSelectedId(null);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      // Handled in Canvas component
    }
  }, [setSelectedId]);

  return {
    handleKeyDown,
  };
};