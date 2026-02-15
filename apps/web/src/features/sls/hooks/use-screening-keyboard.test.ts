import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useScreeningKeyboard } from './use-screening-keyboard';

describe('useScreeningKeyboard', () => {
  const onInclude = vi.fn();
  const onExclude = vi.fn();
  const onToggleDetail = vi.fn();
  const onSkip = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function fireKey(key: string, opts?: Partial<KeyboardEventInit>) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...opts }));
  }

  it('calls onInclude when I key pressed with selected article', () => {
    renderHook(() =>
      useScreeningKeyboard(onInclude, onExclude, onToggleDetail, onSkip, 'art-1', true),
    );

    fireKey('I');
    expect(onInclude).toHaveBeenCalledWith('art-1');
  });

  it('calls onInclude when i key pressed (lowercase)', () => {
    renderHook(() =>
      useScreeningKeyboard(onInclude, onExclude, onToggleDetail, onSkip, 'art-1', true),
    );

    fireKey('i');
    expect(onInclude).toHaveBeenCalledWith('art-1');
  });

  it('calls onExclude when E key pressed', () => {
    renderHook(() =>
      useScreeningKeyboard(onInclude, onExclude, onToggleDetail, onSkip, 'art-1', true),
    );

    fireKey('E');
    expect(onExclude).toHaveBeenCalledWith('art-1');
  });

  it('calls onExclude when e key pressed (lowercase)', () => {
    renderHook(() =>
      useScreeningKeyboard(onInclude, onExclude, onToggleDetail, onSkip, 'art-1', true),
    );

    fireKey('e');
    expect(onExclude).toHaveBeenCalledWith('art-1');
  });

  it('calls onSkip when S key pressed', () => {
    renderHook(() =>
      useScreeningKeyboard(onInclude, onExclude, onToggleDetail, onSkip, 'art-1', true),
    );

    fireKey('S');
    expect(onSkip).toHaveBeenCalledWith('art-1');
  });

  it('calls onToggleDetail when Space key pressed', () => {
    renderHook(() =>
      useScreeningKeyboard(onInclude, onExclude, onToggleDetail, onSkip, 'art-1', true),
    );

    fireKey(' ');
    expect(onToggleDetail).toHaveBeenCalledWith('art-1');
  });

  it('prevents default on Space key', () => {
    renderHook(() =>
      useScreeningKeyboard(onInclude, onExclude, onToggleDetail, onSkip, 'art-1', true),
    );

    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    const preventSpy = vi.spyOn(event, 'preventDefault');
    document.dispatchEvent(event);

    expect(preventSpy).toHaveBeenCalled();
  });

  it('calls onToggleDetail with empty string on Escape', () => {
    renderHook(() =>
      useScreeningKeyboard(onInclude, onExclude, onToggleDetail, onSkip, 'art-1', true),
    );

    fireKey('Escape');
    expect(onToggleDetail).toHaveBeenCalledWith('');
  });

  it('does nothing when no article is selected', () => {
    renderHook(() =>
      useScreeningKeyboard(onInclude, onExclude, onToggleDetail, onSkip, null, true),
    );

    fireKey('I');
    fireKey('E');
    fireKey(' ');

    expect(onInclude).not.toHaveBeenCalled();
    expect(onExclude).not.toHaveBeenCalled();
    expect(onToggleDetail).not.toHaveBeenCalled();
  });

  it('does nothing when isActive is false', () => {
    renderHook(() =>
      useScreeningKeyboard(onInclude, onExclude, onToggleDetail, onSkip, 'art-1', false),
    );

    fireKey('I');
    fireKey('E');

    expect(onInclude).not.toHaveBeenCalled();
    expect(onExclude).not.toHaveBeenCalled();
  });

  it('cleans up event listener on unmount', () => {
    const { unmount } = renderHook(() =>
      useScreeningKeyboard(onInclude, onExclude, onToggleDetail, onSkip, 'art-1', true),
    );

    unmount();

    fireKey('I');
    expect(onInclude).not.toHaveBeenCalled();
  });
});
