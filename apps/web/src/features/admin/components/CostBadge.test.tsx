import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CostBadge } from './CostBadge';

describe('CostBadge', () => {
  it('renders formatted cost value', () => {
    render(<CostBadge cost={0.005} />);
    expect(screen.getByTestId('cost-badge')).toHaveTextContent('$0.005');
  });

  it('renders very small cost with less-than prefix', () => {
    render(<CostBadge cost={0.0001} />);
    expect(screen.getByTestId('cost-badge')).toHaveTextContent('<$0.001');
  });

  it('applies green color for cost less than $0.01', () => {
    render(<CostBadge cost={0.005} />);
    const badge = screen.getByTestId('cost-badge');
    expect(badge.className).toContain('bg-green-50');
    expect(badge.className).toContain('text-green-700');
  });

  it('applies yellow color for cost between $0.01 and $0.10', () => {
    render(<CostBadge cost={0.05} />);
    const badge = screen.getByTestId('cost-badge');
    expect(badge.className).toContain('bg-yellow-50');
    expect(badge.className).toContain('text-yellow-700');
  });

  it('applies red color for cost $0.10 or more', () => {
    render(<CostBadge cost={0.15} />);
    const badge = screen.getByTestId('cost-badge');
    expect(badge.className).toContain('bg-red-50');
    expect(badge.className).toContain('text-red-700');
  });

  it('formats cost to three decimal places', () => {
    render(<CostBadge cost={0.1} />);
    expect(screen.getByTestId('cost-badge')).toHaveTextContent('$0.100');
  });
});
