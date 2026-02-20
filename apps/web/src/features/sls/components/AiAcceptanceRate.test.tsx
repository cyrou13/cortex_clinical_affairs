import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { AiAcceptanceRate } from './AiAcceptanceRate';

describe('AiAcceptanceRate', () => {
  const defaultStats = {
    totalScored: 4500,
    likelyRelevantCount: 1200,
    uncertainCount: 1800,
    likelyIrrelevantCount: 1500,
    acceptanceRate: 72,
  };

  it('renders the acceptance rate badge', () => {
    render(<AiAcceptanceRate stats={defaultStats} />);

    const badge = screen.getByTestId('acceptance-rate-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('72%');
  });

  it('shows total scored count', () => {
    render(<AiAcceptanceRate stats={defaultStats} />);

    expect(screen.getByTestId('total-scored')).toHaveTextContent('4,500 articles scored');
  });

  it('renders category breakdown with all three categories', () => {
    render(<AiAcceptanceRate stats={defaultStats} />);

    expect(screen.getByTestId('category-breakdown')).toBeInTheDocument();
    expect(screen.getByTestId('likely-relevant-row')).toBeInTheDocument();
    expect(screen.getByTestId('uncertain-row')).toBeInTheDocument();
    expect(screen.getByTestId('likely-irrelevant-row')).toBeInTheDocument();
  });

  it('shows correct counts for each category', () => {
    render(<AiAcceptanceRate stats={defaultStats} />);

    expect(screen.getByTestId('likely-relevant-row')).toHaveTextContent('1,200');
    expect(screen.getByTestId('uncertain-row')).toHaveTextContent('1,800');
    expect(screen.getByTestId('likely-irrelevant-row')).toHaveTextContent('1,500');
  });

  it('shows green badge for high acceptance rate', () => {
    render(<AiAcceptanceRate stats={{ ...defaultStats, acceptanceRate: 80 }} />);

    const badge = screen.getByTestId('acceptance-rate-badge');
    expect(badge.className).toContain('bg-emerald-100');
    expect(badge.className).toContain('text-emerald-600');
  });

  it('shows orange badge for medium acceptance rate', () => {
    render(<AiAcceptanceRate stats={{ ...defaultStats, acceptanceRate: 55 }} />);

    const badge = screen.getByTestId('acceptance-rate-badge');
    expect(badge.className).toContain('bg-orange-100');
    expect(badge.className).toContain('text-orange-600');
  });

  it('shows red badge for low acceptance rate', () => {
    render(<AiAcceptanceRate stats={{ ...defaultStats, acceptanceRate: 25 }} />);

    const badge = screen.getByTestId('acceptance-rate-badge');
    expect(badge.className).toContain('bg-red-100');
    expect(badge.className).toContain('text-red-600');
  });

  it('shows empty state when no articles scored', () => {
    render(
      <AiAcceptanceRate
        stats={{
          totalScored: 0,
          likelyRelevantCount: 0,
          uncertainCount: 0,
          likelyIrrelevantCount: 0,
          acceptanceRate: 0,
        }}
      />,
    );

    expect(screen.getByTestId('no-scoring-data')).toHaveTextContent(
      'No articles have been scored yet',
    );
  });

  it('renders progress bars for each category', () => {
    render(<AiAcceptanceRate stats={defaultStats} />);

    expect(screen.getByTestId('likely-relevant-bar')).toBeInTheDocument();
    expect(screen.getByTestId('uncertain-bar')).toBeInTheDocument();
    expect(screen.getByTestId('likely-irrelevant-bar')).toBeInTheDocument();
  });

  it('sets correct width on progress bars', () => {
    render(<AiAcceptanceRate stats={defaultStats} />);

    // likelyRelevant: 1200/4500 = 27%
    const relevantBar = screen.getByTestId('likely-relevant-bar');
    expect(relevantBar).toHaveStyle({ width: '27%' });

    // uncertain: 1800/4500 = 40%
    const uncertainBar = screen.getByTestId('uncertain-bar');
    expect(uncertainBar).toHaveStyle({ width: '40%' });

    // likelyIrrelevant: 1500/4500 = 33%
    const irrelevantBar = screen.getByTestId('likely-irrelevant-bar');
    expect(irrelevantBar).toHaveStyle({ width: '33%' });
  });

  it('rounds acceptance rate display', () => {
    render(<AiAcceptanceRate stats={{ ...defaultStats, acceptanceRate: 72.7 }} />);

    expect(screen.getByTestId('acceptance-rate-badge')).toHaveTextContent('73%');
  });

  it('renders the overview heading', () => {
    render(<AiAcceptanceRate stats={defaultStats} />);

    expect(screen.getByText('AI Scoring Overview')).toBeInTheDocument();
  });

  it('renders category labels', () => {
    render(<AiAcceptanceRate stats={defaultStats} />);

    expect(screen.getByText('Likely Relevant')).toBeInTheDocument();
    expect(screen.getByText('Uncertain')).toBeInTheDocument();
    expect(screen.getByText('Likely Irrelevant')).toBeInTheDocument();
  });
});
