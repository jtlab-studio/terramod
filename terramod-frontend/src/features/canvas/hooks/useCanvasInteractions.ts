import { useCallback } from 'react';
import { useUIStore } from '../../../store/uiStore';

export const useCanvasInteractions = () => {
  const mode = useUIStore((state) => state.mode);
  const setMode = useUIStore((state) => state.setMode);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'v' || e.key === 'Escape') {
      setMode('select');
    } else if (e.key === 'c') {
      setMode('connect');
    } else if (e.key === 'h') {
      setMode('pan');
    }
  }, [setMode]);

  const switchToSelectMode = () => setMode('select');
  const switchToConnectMode = () => setMode('connect');
  const switchToPanMode = () => setMode('pan');

  return {
    mode,
    handleKeyDown,
    switchToSelectMode,
    switchToConnectMode,
    switchToPanMode,
  };
};
