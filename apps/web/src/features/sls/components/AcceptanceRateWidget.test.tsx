import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AcceptanceRateWidget } from './AcceptanceRateWidget';

describe('AcceptanceRateWidget', () => {
  const defaultProps = {
    overallRate: 89,
    likelyRelevantAccuracy: 95,
    likelyIrrelevantAccuracy: 82,
    overrideCount: 12,
    spotCheckCount: 50,
    agreementCount: 44,
  };

  it('renders acceptance rate widget', () => {
    render(<AcceptanceRateWidget {...defaultProps} />);

    expect(screen.getByTestId('acceptance-rate-widget')).toBeInTheDocument();
  });

  it('displays overall rate in green for high rate', () => {
    render(<AcceptanceRateWidget {...defaultProps} />);

    const rate = screen.getByTestId('overall-rate');
    expect(rate).toHaveTextContent('89%');
    expect(rate.className).toContain('text-emerald');
  });

  it('displays overall rate in orange for medium rate', () => {
    render(<AcceptanceRateWidget {...defaultProps} overallRate={75} />);

    const rate = screen.getByTestId('overall-rate');
    expect(rate).toHaveTextContent('75%');
    expect(rate.className).toContain('text-orange');
  });

  it('displays overall rate in red for low rate', () => {
    render(<AcceptanceRateWidget {...defaultProps} overallRate={60} />);

    const rate = screen.getByTestId('overall-rate');
    expect(rate).toHaveTextContent('60%');
    expect(rate.className).toContain('text-red');
  });

  it('displays likely relevant accuracy', () => {
    render(<AcceptanceRateWidget {...defaultProps} />);

    expect(screen.getByTestId('likely-relevant-accuracy')).toHaveTextContent('95%');
  });

  it('displays likely irrelevant accuracy', () => {
    render(<AcceptanceRateWidget {...defaultProps} />);

    expect(screen.getByTestId('likely-irrelevant-accuracy')).toHaveTextContent('82%');
  });

  it('hides likely relevant accuracy when null', () => {
    render(<AcceptanceRateWidget {...defaultProps} likelyRelevantAccuracy={null} />);

    expect(screen.queryByTestId('likely-relevant-accuracy')).not.toBeInTheDocument();
  });

  it('displays override count', () => {
    render(<AcceptanceRateWidget {...defaultProps} />);

    expect(screen.getByTestId('override-count')).toHaveTextContent('12');
  });

  it('displays spot-check stats', () => {
    render(<AcceptanceRateWidget {...defaultProps} />);

    expect(screen.getByTestId('spot-check-stats')).toHaveTextContent('44 / 50');
  });
});
