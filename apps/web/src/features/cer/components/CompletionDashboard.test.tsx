import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { CompletionDashboard } from './CompletionDashboard';

const mockSections = Array.from({ length: 14 }, (_, i) => ({
  sectionNumber: i + 1,
  title: `Section ${i + 1}`,
  status: (i < 12 ? 'FINALIZED' : 'REVIEWED') as 'DRAFT' | 'REVIEWED' | 'FINALIZED',
}));

describe('CompletionDashboard', () => {
  it('renders the dashboard', () => {
    render(<CompletionDashboard sections={mockSections} traceabilityPercentage={98} unresolvedClaimsCount={0} />);
    expect(screen.getByTestId('completion-dashboard')).toBeInTheDocument();
  });

  it('shows sections finalized metric', () => {
    render(<CompletionDashboard sections={mockSections} traceabilityPercentage={98} unresolvedClaimsCount={0} />);
    expect(screen.getByTestId('sections-finalized-metric')).toHaveTextContent('12/14');
  });

  it('shows traceability ring', () => {
    render(<CompletionDashboard sections={mockSections} traceabilityPercentage={98} unresolvedClaimsCount={0} />);
    expect(screen.getByTestId('traceability-ring')).toBeInTheDocument();
    expect(screen.getByText('98%')).toBeInTheDocument();
  });

  it('shows unresolved count', () => {
    render(<CompletionDashboard sections={mockSections} traceabilityPercentage={98} unresolvedClaimsCount={3} />);
    expect(screen.getByTestId('unresolved-count')).toHaveTextContent('3');
  });

  it('shows zero unresolved in green', () => {
    render(<CompletionDashboard sections={mockSections} traceabilityPercentage={98} unresolvedClaimsCount={0} />);
    const countEl = screen.getByTestId('unresolved-count').querySelector('.text-emerald-500');
    expect(countEl).toBeTruthy();
  });

  it('shows nonzero unresolved in orange', () => {
    render(<CompletionDashboard sections={mockSections} traceabilityPercentage={98} unresolvedClaimsCount={5} />);
    const countEl = screen.getByTestId('unresolved-count').querySelector('.text-orange-500');
    expect(countEl).toBeTruthy();
  });

  it('shows section status grid', () => {
    render(<CompletionDashboard sections={mockSections} traceabilityPercentage={98} unresolvedClaimsCount={0} />);
    expect(screen.getByTestId('section-status-grid')).toBeInTheDocument();
  });

  it('shows correct finalized count', () => {
    render(<CompletionDashboard sections={mockSections} traceabilityPercentage={98} unresolvedClaimsCount={0} />);
    expect(screen.getByText('12/14')).toBeInTheDocument();
  });
});
