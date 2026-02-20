import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { DeduplicationSummary, type DeduplicationStats } from './DeduplicationSummary';

const mockStats: DeduplicationStats = {
  importedCount: 250,
  duplicateCount: 75,
  stats: {
    totalBefore: 500,
    totalAfter: 750,
    duplicatesByDoi: 40,
    duplicatesByPmid: 25,
    duplicatesByTitle: 10,
  },
};

describe('DeduplicationSummary', () => {
  it('renders the deduplication summary card', () => {
    render(<DeduplicationSummary stats={mockStats} />);

    expect(screen.getByTestId('deduplication-summary')).toBeInTheDocument();
    expect(screen.getByText('Import Complete')).toBeInTheDocument();
  });

  it('displays total found (imported + duplicates)', () => {
    render(<DeduplicationSummary stats={mockStats} />);

    const totalFound = screen.getByTestId('total-found');
    expect(totalFound).toHaveTextContent('325');
    expect(totalFound).toHaveTextContent('Total Found');
  });

  it('displays duplicates removed count', () => {
    render(<DeduplicationSummary stats={mockStats} />);

    const duplicates = screen.getByTestId('duplicates-removed');
    expect(duplicates).toHaveTextContent('75');
    expect(duplicates).toHaveTextContent('Duplicates Removed');
  });

  it('displays unique articles added count', () => {
    render(<DeduplicationSummary stats={mockStats} />);

    const unique = screen.getByTestId('unique-added');
    expect(unique).toHaveTextContent('250');
    expect(unique).toHaveTextContent('Unique Added');
  });

  it('displays dedup breakdown bars', () => {
    render(<DeduplicationSummary stats={mockStats} />);

    expect(screen.getByTestId('dedup-breakdown')).toBeInTheDocument();
    expect(screen.getByTestId('dedup-by-doi')).toHaveTextContent('40');
    expect(screen.getByTestId('dedup-by-doi')).toHaveTextContent('By DOI');
    expect(screen.getByTestId('dedup-by-pmid')).toHaveTextContent('25');
    expect(screen.getByTestId('dedup-by-pmid')).toHaveTextContent('By PMID');
    expect(screen.getByTestId('dedup-by-title')).toHaveTextContent('10');
    expect(screen.getByTestId('dedup-by-title')).toHaveTextContent('By Title Similarity');
  });

  it('displays pool size before and after', () => {
    render(<DeduplicationSummary stats={mockStats} />);

    const poolTotals = screen.getByTestId('pool-totals');
    expect(poolTotals).toHaveTextContent('500');
    expect(poolTotals).toHaveTextContent('750');
  });

  it('handles zero duplicates gracefully — no breakdown section', () => {
    const zeroStats: DeduplicationStats = {
      importedCount: 100,
      duplicateCount: 0,
      stats: {
        totalBefore: 0,
        totalAfter: 100,
        duplicatesByDoi: 0,
        duplicatesByPmid: 0,
        duplicatesByTitle: 0,
      },
    };

    render(<DeduplicationSummary stats={zeroStats} />);

    expect(screen.getByTestId('total-found')).toHaveTextContent('100');
    expect(screen.getByTestId('duplicates-removed')).toHaveTextContent('0');
    expect(screen.getByTestId('unique-added')).toHaveTextContent('100');
    expect(screen.queryByTestId('dedup-breakdown')).not.toBeInTheDocument();
  });

  it('renders large numbers with locale formatting', () => {
    const largeStats: DeduplicationStats = {
      importedCount: 12500,
      duplicateCount: 3750,
      stats: {
        totalBefore: 50000,
        totalAfter: 62500,
        duplicatesByDoi: 2000,
        duplicatesByPmid: 1000,
        duplicatesByTitle: 750,
      },
    };

    render(<DeduplicationSummary stats={largeStats} />);

    // Numbers should be formatted with locale
    const totalFound = screen.getByTestId('total-found');
    expect(totalFound).toHaveTextContent('16,250');
  });

  it('renders the summary metrics grid', () => {
    render(<DeduplicationSummary stats={mockStats} />);

    expect(screen.getByTestId('summary-metrics')).toBeInTheDocument();
  });
});
