import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScreeningProgressMetrics } from './ScreeningProgressMetrics';

describe('ScreeningProgressMetrics', () => {
  const defaultProps = {
    total: 4521,
    reviewed: 3200,
    included: 641,
    excluded: 2400,
    skipped: 159,
    remaining: 1321,
  };

  it('renders progress summary', () => {
    render(<ScreeningProgressMetrics {...defaultProps} />);

    expect(screen.getByTestId('progress-summary')).toHaveTextContent(
      '3,200 / 4,521 articles reviewed',
    );
  });

  it('renders progress bar', () => {
    render(<ScreeningProgressMetrics {...defaultProps} />);

    expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
    const fill = screen.getByTestId('progress-fill');
    expect(fill.style.width).toBe('71%');
  });

  it('renders progress bar at 100% in green', () => {
    render(
      <ScreeningProgressMetrics
        {...defaultProps}
        total={100}
        reviewed={100}
        remaining={0}
      />,
    );

    const fill = screen.getByTestId('progress-fill');
    expect(fill.style.width).toBe('100%');
    expect(fill.className).toContain('bg-emerald');
  });

  it('renders included count', () => {
    render(<ScreeningProgressMetrics {...defaultProps} />);

    expect(screen.getByTestId('count-included')).toHaveTextContent('641');
  });

  it('renders excluded count', () => {
    render(<ScreeningProgressMetrics {...defaultProps} />);

    expect(screen.getByTestId('count-excluded')).toHaveTextContent('2,400');
  });

  it('renders skipped count', () => {
    render(<ScreeningProgressMetrics {...defaultProps} />);

    expect(screen.getByTestId('count-skipped')).toHaveTextContent('159');
  });

  it('renders remaining count', () => {
    render(<ScreeningProgressMetrics {...defaultProps} />);

    expect(screen.getByTestId('count-remaining')).toHaveTextContent('1,321');
  });

  it('handles zero total', () => {
    render(
      <ScreeningProgressMetrics
        total={0}
        reviewed={0}
        included={0}
        excluded={0}
        skipped={0}
        remaining={0}
      />,
    );

    const fill = screen.getByTestId('progress-fill');
    expect(fill.style.width).toBe('0%');
    expect(screen.getByTestId('progress-summary')).toHaveTextContent('0 / 0 articles reviewed');
  });

  it('renders breakdown grid', () => {
    render(<ScreeningProgressMetrics {...defaultProps} />);

    expect(screen.getByTestId('progress-breakdown')).toBeInTheDocument();
  });
});
