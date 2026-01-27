import { create } from 'zustand';

export type InteractionMode = 'select' | 'connect' | 'pan';

export interface Viewport {
  zoom: number;
  x: number;
  y: number;
}

interface UIState {
  selectedId: string | null;
  activeModuleId: string | null;  // NEW: Currently active module being edited
  mode: InteractionMode;
  viewport: Viewport;
  inspectorOpen: boolean;
  sidebarOpen: boolean;
  setSelectedId: (id: string | null) => void;
  setActiveModuleId: (id: string | null) => void;  // NEW
  setMode: (mode: InteractionMode) => void;
  updateViewport: (viewport: Partial<Viewport>) => void;
  toggleInspector: () => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedId: null,
  activeModuleId: null,
  mode: 'select',
  viewport: { zoom: 1, x: 0, y: 0 },
  inspectorOpen: true,
  sidebarOpen: true,

  setSelectedId: (id) => set({ selectedId: id }),

  setActiveModuleId: (id) => set({ activeModuleId: id }),

  setMode: (mode) => set({ mode }),

  updateViewport: (updates) =>
    set((state) => ({
      viewport: { ...state.viewport, ...updates },
    })),

  toggleInspector: () =>
    set((state) => ({ inspectorOpen: !state.inspectorOpen })),

  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));