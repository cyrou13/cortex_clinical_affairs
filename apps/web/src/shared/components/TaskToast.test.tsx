import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

const mockToastStore = {
  toasts: [] as import('../../stores/toast-store').Toast[],
  addToast: vi.fn(),
  removeToast: vi.fn(),
};

vi.mock('../../stores/toast-store', () => ({
  useToastStore: (selector?: (state: typeof mockToastStore) => unknown) =>
    selector ? selector(mockToastStore) : mockToastStore,
}));

import { TaskToastContainer } from './TaskToast';

describe('TaskToastContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockToastStore.toasts = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders success toast', () => {
    mockToastStore.toasts = [
      {
        id: 'toast-1',
        type: 'success',
        message: 'AI Screening complete. 4,521 articles scored.',
      },
    ];

    render(<TaskToastContainer />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByText('AI Screening complete. 4,521 articles scored.'),
    ).toBeInTheDocument();
  });

  it('renders error toast with retry action', () => {
    const retryFn = vi.fn();
    mockToastStore.toasts = [
      {
        id: 'toast-2',
        type: 'error',
        message: 'PDF Retrieval failed. Connection timeout.',
        action: { label: 'Retry', onClick: retryFn },
      },
    ];

    render(<TaskToastContainer />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByText('PDF Retrieval failed. Connection timeout.'),
    ).toBeInTheDocument();

    const retryBtn = screen.getByTestId('toast-action');
    expect(retryBtn).toHaveTextContent('Retry');

    fireEvent.click(retryBtn);
    expect(retryFn).toHaveBeenCalled();
  });

  it('auto-dismisses success toast after timeout', () => {
    mockToastStore.toasts = [
      {
        id: 'toast-3',
        type: 'success',
        message: 'Task completed.',
      },
    ];

    render(<TaskToastContainer />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(mockToastStore.removeToast).toHaveBeenCalledWith('toast-3');
  });

  it('does not auto-dismiss error toast', () => {
    mockToastStore.toasts = [
      {
        id: 'toast-4',
        type: 'error',
        message: 'Something went wrong.',
      },
    ];

    render(<TaskToastContainer />);

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(mockToastStore.removeToast).not.toHaveBeenCalled();
  });

  it('renders nothing when no toasts', () => {
    mockToastStore.toasts = [];
    const { container } = render(<TaskToastContainer />);
    expect(container.firstChild).toBeNull();
  });

  it('dismiss button removes toast', () => {
    mockToastStore.toasts = [
      {
        id: 'toast-5',
        type: 'info',
        message: 'Info message.',
      },
    ];

    render(<TaskToastContainer />);

    const dismissBtn = screen.getByLabelText('Dismiss');
    fireEvent.click(dismissBtn);

    expect(mockToastStore.removeToast).toHaveBeenCalledWith('toast-5');
  });
});
