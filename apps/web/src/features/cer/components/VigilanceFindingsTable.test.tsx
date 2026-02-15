import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { VigilanceFindingsTable } from './VigilanceFindingsTable';

const mockFindings = [
  { id: 'f-1', sourceDatabase: 'MAUDE', reportNumber: 'MDR-2024-001', eventDate: '2024-01-15', deviceName: 'CardioDevice X', eventType: 'Malfunction', description: 'Device stopped working', outcome: 'No injury', linkedSection: null },
  { id: 'f-2', sourceDatabase: 'ANSM', reportNumber: 'ANSM-2024-002', eventDate: '2024-02-10', deviceName: 'CardioDevice X', eventType: 'Injury', description: 'Patient reported discomfort', outcome: 'Minor injury', linkedSection: '3' },
  { id: 'f-3', sourceDatabase: 'BfArM', reportNumber: 'BfArM-2024-003', eventDate: '2024-03-05', deviceName: 'CardioDevice Y', eventType: 'Death', description: 'Fatal event reported', outcome: 'Death', linkedSection: null },
];

describe('VigilanceFindingsTable', () => {
  it('renders the findings table', () => {
    render(<VigilanceFindingsTable findings={mockFindings} />);
    expect(screen.getByTestId('findings-table')).toBeInTheDocument();
  });

  it('shows finding rows', () => {
    render(<VigilanceFindingsTable findings={mockFindings} />);
    const rows = screen.getAllByTestId('finding-row');
    expect(rows).toHaveLength(3);
  });

  it('shows empty state when no findings', () => {
    render(<VigilanceFindingsTable findings={[]} />);
    expect(screen.getByTestId('no-findings')).toBeInTheDocument();
  });

  it('shows source database badges', () => {
    render(<VigilanceFindingsTable findings={mockFindings} />);
    const badges = screen.getAllByTestId('source-badge');
    expect(badges).toHaveLength(3);
    expect(badges[0]).toHaveTextContent('MAUDE');
  });

  it('calls onSelectFinding when row clicked', () => {
    const onSelect = vi.fn();
    render(<VigilanceFindingsTable findings={mockFindings} onSelectFinding={onSelect} />);
    const rows = screen.getAllByTestId('finding-row');
    fireEvent.click(rows[0]);
    expect(onSelect).toHaveBeenCalledWith(mockFindings[0]);
  });

  it('shows link section buttons', () => {
    render(<VigilanceFindingsTable findings={mockFindings} />);
    const linkBtns = screen.getAllByTestId('link-section-btn');
    expect(linkBtns).toHaveLength(3);
  });

  it('calls onLinkSection when link button clicked', () => {
    const onLink = vi.fn();
    render(<VigilanceFindingsTable findings={mockFindings} onLinkSection={onLink} />);
    const linkBtns = screen.getAllByTestId('link-section-btn');
    fireEvent.click(linkBtns[0]);
    expect(onLink).toHaveBeenCalledWith('f-1');
  });

  it('shows report numbers', () => {
    render(<VigilanceFindingsTable findings={mockFindings} />);
    expect(screen.getByText('MDR-2024-001')).toBeInTheDocument();
    expect(screen.getByText('ANSM-2024-002')).toBeInTheDocument();
  });

  it('renders colored source badges', () => {
    render(<VigilanceFindingsTable findings={mockFindings} />);
    const badges = screen.getAllByTestId('source-badge');
    expect(badges[0].className).toContain('bg-blue-100');
    expect(badges[1].className).toContain('bg-purple-100');
  });
});
