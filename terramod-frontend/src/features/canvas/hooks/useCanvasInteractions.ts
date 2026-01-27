import { useEffect } from 'react';
import { useUIStore } from '../../../store/uiStore';

export const useCanvasInteractions = () => {
  const mode = useUIStore((state) => state.mode);
  const setMode = useUIStore((state) => state.setMode);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'v') setMode('select');
      if (e.key === 'c') setMode('connect');
      if (e.key === 'h') setMode('pan');
      if (e.key === 'Escape') setMode('select');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setMode]);

  const switchToSelectMode = () => setMode('select');
  const switchToConnectMode = () => setMode('connect');
  const switchToPanMode = () => setMode('pan');

  return {
    mode,
    switchToSelectMode,
    switchToConnectMode,
    switchToPanMode,
    handleKeyDown: () => {},
  };
};
