import { create } from 'zustand';

interface EditorState {
  isDirty: boolean;
  lastSavedAt: string | null;
  setDirty: (dirty: boolean) => void;
  markSaved: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  isDirty: false,
  lastSavedAt: null,
  setDirty: (dirty) => set({ isDirty: dirty }),
  markSaved: () => set({ isDirty: false, lastSavedAt: new Date().toISOString() }),
}));
