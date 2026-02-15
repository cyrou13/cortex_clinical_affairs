import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { TraceabilityDrillDown } from './TraceabilityDrillDown';

const mockLevels = [
  {
    level: 1,
    icon: 'C',
    title: 'CER Claim',
    content: 'Device efficacy claim',
    moduleType: 'CER',
    auditTrail: ['Created 2024-01-01'],
    navigateTo: '/cer/s3',
  },
  {
    level: 2,
    icon: 'S',
    title: 'SOA Finding',
    content: 'Literature supports claim',
    moduleType: 'SOA',
    auditTrail: ['Extracted 2024-01-02'],
    navigateTo: '/soa/f1',
  },
  {
    level: 3,
    icon: 'L',
    title: 'SLS Article',
    content: 'PubMed article ref',
    moduleType: 'SLS',
    auditTrail: ['Screened 2024-01-03', 'Approved 2024-01-04'],
    navigateTo: '/sls/a1',
  },
  {
    level: 4,
    icon: 'V',
    title: 'Validation Result',
    content: 'Endpoint met',
    moduleType: 'VAL',
    auditTrail: [],
    navigateTo: '/val/r1',
  },
];

describe('TraceabilityDrillDown', () => {
  it('renders the drilldown panel', () => {
    render(<TraceabilityDrillDown claimText="Device is safe" levels={mockLevels} />);
    expect(screen.getByTestId('traceability-drilldown')).toBeInTheDocument();
  });

  it('shows export proof button', () => {
    render(<TraceabilityDrillDown claimText="Device is safe" levels={mockLevels} />);
    expect(screen.getByTestId('export-proof-btn')).toBeInTheDocument();
  });

  it('calls onExportProof when button clicked', () => {
    const onExport = vi.fn();
    render(
      <TraceabilityDrillDown
        claimText="Device is safe"
        levels={mockLevels}
        onExportProof={onExport}
      />,
    );
    fireEvent.click(screen.getByTestId('export-proof-btn'));
    expect(onExport).toHaveBeenCalled();
  });

  it('shows level 1 card', () => {
    render(<TraceabilityDrillDown claimText="Device is safe" levels={mockLevels} />);
    expect(screen.getByTestId('level-1-card')).toBeInTheDocument();
  });

  it('shows level 2 card', () => {
    render(<TraceabilityDrillDown claimText="Device is safe" levels={mockLevels} />);
    expect(screen.getByTestId('level-2-card')).toBeInTheDocument();
  });

  it('shows level 3 card', () => {
    render(<TraceabilityDrillDown claimText="Device is safe" levels={mockLevels} />);
    expect(screen.getByTestId('level-3-card')).toBeInTheDocument();
  });

  it('shows level 4 card', () => {
    render(<TraceabilityDrillDown claimText="Device is safe" levels={mockLevels} />);
    expect(screen.getByTestId('level-4-card')).toBeInTheDocument();
  });

  it('shows audit trail buttons for levels with audit entries', () => {
    render(<TraceabilityDrillDown claimText="Device is safe" levels={mockLevels} />);
    const auditBtns = screen.getAllByTestId('audit-trail');
    expect(auditBtns).toHaveLength(3);
  });

  it('expands audit trail on click', () => {
    render(<TraceabilityDrillDown claimText="Device is safe" levels={mockLevels} />);
    const auditBtns = screen.getAllByTestId('audit-trail');
    fireEvent.click(auditBtns[0]!);
    expect(screen.getByText('Created 2024-01-01')).toBeInTheDocument();
  });

  it('shows claim text', () => {
    render(<TraceabilityDrillDown claimText="Device is safe" levels={mockLevels} />);
    expect(screen.getByText(/Device is safe/)).toBeInTheDocument();
  });
});
