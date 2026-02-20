import { create } from 'zustand';

interface SidebarState {
  isCollapsed: boolean;
  activeModule: string | null;
  toggle: () => void;
  setActiveModule: (module: string | null) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed: typeof window !== 'undefined' && window.innerWidth < 1440,
  activeModule: null,
  toggle: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
  setActiveModule: (module) => set({ activeModule: module }),
}));
