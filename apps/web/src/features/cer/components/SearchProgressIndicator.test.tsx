import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { SearchProgressIndicator } from './SearchProgressIndicator';

const mockDatabases = [
  { database: 'MAUDE', progress: 100, status: 'done' as const },
  { database: 'ANSM', progress: 65, status: 'searching' as const },
  { database: 'BfArM', progress: 0, status: 'pending' as const },
  { database: 'AFMPS', progress: 100, status: 'failed' as const },
];

describe('SearchProgressIndicator', () => {
  it('renders the progress container', () => {
    render(<SearchProgressIndicator databases={mockDatabases} overallProgress={50} totalResults={24} eta="2 min" />);
    expect(screen.getByTestId('search-progress')).toBeInTheDocument();
  });

  it('shows per-database progress bars', () => {
    render(<SearchProgressIndicator databases={mockDatabases} overallProgress={50} totalResults={24} eta="2 min" />);
    const bars = screen.getAllByTestId('db-progress-bar');
    expect(bars).toHaveLength(4);
  });

  it('shows overall counter', () => {
    render(<SearchProgressIndicator databases={mockDatabases} overallProgress={50} totalResults={24} eta="2 min" />);
    expect(screen.getByTestId('overall-counter')).toBeInTheDocument();
    expect(screen.getByText('24 results found')).toBeInTheDocument();
  });

  it('shows ETA display', () => {
    render(<SearchProgressIndicator databases={mockDatabases} overallProgress={50} totalResults={24} eta="2 min" />);
    expect(screen.getByTestId('eta-display')).toBeInTheDocument();
    expect(screen.getByText('Estimated time remaining: 2 min')).toBeInTheDocument();
  });

  it('hides ETA when null', () => {
    render(<SearchProgressIndicator databases={mockDatabases} overallProgress={50} totalResults={24} eta={null} />);
    expect(screen.queryByTestId('eta-display')).not.toBeInTheDocument();
  });

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn();
    render(<SearchProgressIndicator databases={mockDatabases} overallProgress={50} totalResults={24} eta="2 min" onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId('cancel-btn'));
    expect(onCancel).toHaveBeenCalled();
  });
});
