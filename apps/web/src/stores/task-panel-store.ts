import { create } from 'zustand';

export interface TaskProgressEvent {
  taskId: string;
  type: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress: number;
  total: number;
  current: number;
  eta: string | null;
  message: string;
}

interface TaskPanelState {
  isOpen: boolean;
  tasks: TaskProgressEvent[];
  history: TaskProgressEvent[];
  open: () => void;
  close: () => void;
  toggle: () => void;
  onTaskProgress: (event: TaskProgressEvent) => void;
  onTaskCompleted: (event: TaskProgressEvent) => void;
  onTaskFailed: (event: TaskProgressEvent) => void;
  clearHistory: () => void;
  activeCount: () => number;
}

export const useTaskPanelStore = create<TaskPanelState>((set, get) => ({
  isOpen: false,
  tasks: [],
  history: [],

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),

  onTaskProgress: (event) =>
    set((state) => {
      const existing = state.tasks.find((t) => t.taskId === event.taskId);
      if (existing) {
        return {
          tasks: state.tasks.map((t) =>
            t.taskId === event.taskId ? event : t,
          ),
        };
      }
      return { tasks: [...state.tasks, event] };
    }),

  onTaskCompleted: (event) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.taskId !== event.taskId),
      history: [event, ...state.history],
    })),

  onTaskFailed: (event) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.taskId !== event.taskId),
      history: [event, ...state.history],
    })),

  clearHistory: () => set({ history: [] }),

  activeCount: () => {
    const { tasks } = get();
    return tasks.filter(
      (t) => t.status === 'PENDING' || t.status === 'RUNNING',
    ).length;
  },
}));
