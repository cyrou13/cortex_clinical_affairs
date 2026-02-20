import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

let subscriptionOnData: ((options: { data: { data: unknown } }) => void) | undefined;

const mockUseSubscription = vi.fn().mockImplementation((_query, options) => {
  subscriptionOnData = options?.onData;
  return { loading: false, error: undefined };
});

vi.mock('@apollo/client/react', () => ({
  useSubscription: (...args: unknown[]) => mockUseSubscription(...args),
}));

const mockOnTaskProgress = vi.fn();
const mockOnTaskCompleted = vi.fn();
const mockOnTaskFailed = vi.fn();

vi.mock('../../stores/task-panel-store', () => ({
  useTaskPanelStore: {
    getState: () => ({
      onTaskProgress: mockOnTaskProgress,
      onTaskCompleted: mockOnTaskCompleted,
      onTaskFailed: mockOnTaskFailed,
    }),
  },
}));

const mockAddToast = vi.fn();

vi.mock('../../stores/toast-store', () => ({
  useToastStore: {
    getState: () => ({
      addToast: mockAddToast,
    }),
  },
}));

vi.mock('../../features/async-tasks/task-display', () => ({
  getTaskDisplay: (type: string) => {
    const map: Record<string, { icon: () => null; name: string }> = {
      'sls.score-articles': { icon: () => null, name: 'AI Screening' },
    };
    return map[type] ?? { icon: () => null, name: 'Background Task' };
  },
}));

import { useTaskSubscription } from './use-task-subscription';

describe('useTaskSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscriptionOnData = undefined;
  });

  it('calls useSubscription with userId', () => {
    renderHook(() => useTaskSubscription('user-1'));

    expect(mockUseSubscription).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        variables: { userId: 'user-1' },
      }),
    );
  });

  it('updates store on progress event', () => {
    renderHook(() => useTaskSubscription('user-1'));

    const event = {
      taskId: 'task-1',
      type: 'sls.score-articles',
      status: 'RUNNING',
      progress: 50,
      total: 100,
      current: 50,
      eta: '2 min',
      message: 'Scoring...',
    };

    subscriptionOnData?.({
      data: { data: { onTaskProgress: event } },
    });

    expect(mockOnTaskProgress).toHaveBeenCalledWith(event);
  });

  it('shows toast on completion', () => {
    renderHook(() => useTaskSubscription('user-1'));

    const event = {
      taskId: 'task-1',
      type: 'sls.score-articles',
      status: 'COMPLETED',
      progress: 100,
      total: 100,
      current: 100,
      eta: null,
      message: '4,521 articles scored.',
    };

    subscriptionOnData?.({
      data: { data: { onTaskProgress: event } },
    });

    expect(mockOnTaskCompleted).toHaveBeenCalledWith(event);
    expect(mockAddToast).toHaveBeenCalledWith({
      type: 'success',
      message: 'AI Screening complete. 4,521 articles scored.',
    });
  });

  it('shows error toast on failure', () => {
    renderHook(() => useTaskSubscription('user-1'));

    const event = {
      taskId: 'task-2',
      type: 'sls.score-articles',
      status: 'FAILED',
      progress: 30,
      total: 100,
      current: 30,
      eta: null,
      message: 'Connection timeout.',
    };

    subscriptionOnData?.({
      data: { data: { onTaskProgress: event } },
    });

    expect(mockOnTaskFailed).toHaveBeenCalledWith(event);
    expect(mockAddToast).toHaveBeenCalledWith({
      type: 'error',
      message: 'AI Screening failed. Connection timeout.',
    });
  });

  it('returns connection state', () => {
    const { result } = renderHook(() => useTaskSubscription('user-1'));

    expect(result.current.connected).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  it('skips subscription when userId is empty', () => {
    renderHook(() => useTaskSubscription(''));

    expect(mockUseSubscription).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        skip: true,
      }),
    );
  });
});
