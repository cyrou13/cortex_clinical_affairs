import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from './use-auto-save';

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with idle status', () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutoSave(saveFn, 1000));

    expect(result.current.status).toBe('idle');
    expect(result.current.lastSavedAt).toBeNull();
  });

  it('transitions to saved when triggerSave is called', async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutoSave(saveFn, 10_000));

    await act(async () => {
      await result.current.triggerSave();
    });

    expect(saveFn).toHaveBeenCalled();
    expect(result.current.status).toBe('saved');
  });

  it('transitions to error on save failure', async () => {
    const saveFn = vi.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useAutoSave(saveFn, 10_000));

    await act(async () => {
      await result.current.triggerSave();
    });

    expect(result.current.status).toBe('error');
  });

  it('tracks lastSavedAt timestamp after successful save', async () => {
    const now = new Date('2026-02-14T10:00:00Z');
    vi.setSystemTime(now);

    const saveFn = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutoSave(saveFn, 10_000));

    expect(result.current.lastSavedAt).toBeNull();

    await act(async () => {
      await result.current.triggerSave();
    });

    expect(result.current.lastSavedAt).toEqual(now);
  });

  it('auto-saves when markDirty is called and interval passes', async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutoSave(saveFn, 1000));

    act(() => {
      result.current.markDirty();
    });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    // Allow promises to flush
    await act(async () => {
      await Promise.resolve();
    });

    expect(saveFn).toHaveBeenCalled();
  });
});
