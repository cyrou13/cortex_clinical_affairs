import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrismaFlowChart } from './PrismaFlowChart';

const mockStatistics = {
  identification: {
    perDatabase: [
      { database: 'PubMed', articlesFound: 3200, queriesExecuted: 2 },
      { database: 'Cochrane', articlesFound: 1500, queriesExecuted: 1 },
    ],
    totalIdentified: 4700,
  },
  deduplication: {
    duplicatesRemovedByDoi: 500,
    duplicatesRemovedByPmid: 200,
    duplicatesRemovedByTitleFuzzy: 100,
    totalDuplicatesRemoved: 800,
    uniqueArticlesAfterDedup: 3900,
  },
  screening: {
    aiScored: 3900,
    manuallyReviewed: 3900,
    includedAfterScreening: 641,
    excludedAfterScreening: 3259,
    excludedByCode: [
      { code: 'E1', label: 'Wrong population', count: 1200 },
      { code: 'E2', label: 'Wrong intervention', count: 800 },
    ],
  },
  inclusion: {
    finalIncluded: 641,
    perQuery: [
      { queryName: 'cervical spine', articlesContributed: 400 },
      { queryName: 'c-spine fracture', articlesContributed: 241 },
    ],
  },
};

describe('PrismaFlowChart', () => {
  it('renders all flow sections', () => {
    render(<PrismaFlowChart statistics={mockStatistics} />);

    expect(screen.getByTestId('prisma-flowchart')).toBeInTheDocument();
    expect(screen.getByTestId('prisma-identification')).toBeInTheDocument();
    expect(screen.getByTestId('prisma-deduplication')).toBeInTheDocument();
    expect(screen.getByTestId('prisma-screening')).toBeInTheDocument();
    expect(screen.getByTestId('prisma-inclusion')).toBeInTheDocument();
  });

  it('renders flow arrows between sections', () => {
    render(<PrismaFlowChart statistics={mockStatistics} />);

    const arrows = screen.getAllByTestId('flow-arrow');
    expect(arrows.length).toBeGreaterThanOrEqual(3);
  });

  it('displays per-database identification counts', () => {
    render(<PrismaFlowChart statistics={mockStatistics} />);

    expect(screen.getByTestId('db-pubmed')).toHaveTextContent('3,200');
    expect(screen.getByTestId('db-cochrane')).toHaveTextContent('1,500');
    expect(screen.getByTestId('total-identified')).toHaveTextContent('4,700');
  });

  it('displays deduplication stats', () => {
    render(<PrismaFlowChart statistics={mockStatistics} />);

    expect(screen.getByTestId('total-duplicates')).toHaveTextContent('800');
    expect(screen.getByTestId('unique-after-dedup')).toHaveTextContent('3,900');
  });

  it('displays screening results', () => {
    render(<PrismaFlowChart statistics={mockStatistics} />);

    expect(screen.getByTestId('screening-included')).toHaveTextContent('641');
    expect(screen.getByTestId('screening-excluded')).toHaveTextContent('3,259');
  });

  it('displays exclusion code breakdown', () => {
    render(<PrismaFlowChart statistics={mockStatistics} />);

    expect(screen.getByTestId('exclusion-e1')).toHaveTextContent('Wrong population');
    expect(screen.getByTestId('exclusion-e1')).toHaveTextContent('1,200');
    expect(screen.getByTestId('exclusion-e2')).toHaveTextContent('Wrong intervention');
  });

  it('displays final inclusion count', () => {
    render(<PrismaFlowChart statistics={mockStatistics} />);

    expect(screen.getByTestId('final-included')).toHaveTextContent('641 studies included');
  });

  it('displays per-query contributions', () => {
    render(<PrismaFlowChart statistics={mockStatistics} />);

    const queryContributions = screen.getAllByTestId('query-contribution');
    expect(queryContributions).toHaveLength(2);
    expect(queryContributions[0]).toHaveTextContent('cervical spine');
    expect(queryContributions[0]).toHaveTextContent('400');
  });

  it('handles empty exclusion codes', () => {
    const stats = {
      ...mockStatistics,
      screening: { ...mockStatistics.screening, excludedByCode: [] },
    };
    render(<PrismaFlowChart statistics={stats} />);

    expect(screen.getByTestId('prisma-screening')).toBeInTheDocument();
  });

  it('handles empty per-query list', () => {
    const stats = {
      ...mockStatistics,
      inclusion: { ...mockStatistics.inclusion, perQuery: [] },
    };
    render(<PrismaFlowChart statistics={stats} />);

    expect(screen.getByTestId('prisma-inclusion')).toBeInTheDocument();
    expect(screen.getByTestId('final-included')).toHaveTextContent('641');
  });
});
