import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScreeningFilterTabs } from './ScreeningFilterTabs';

const defaultCounts = {
  all: 4521,
  likelyRelevant: 2400,
  uncertain: 800,
  likelyIrrelevant: 1321,
};

describe('ScreeningFilterTabs', () => {
  const defaultProps = {
    activeTab: 'all',
    onTabChange: vi.fn(),
    counts: defaultCounts,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all four tabs', () => {
    render(<ScreeningFilterTabs {...defaultProps} />);

    expect(screen.getByTestId('filter-tab-all')).toBeInTheDocument();
    expect(screen.getByTestId('filter-tab-likely_relevant')).toBeInTheDocument();
    expect(screen.getByTestId('filter-tab-uncertain')).toBeInTheDocument();
    expect(screen.getByTestId('filter-tab-likely_irrelevant')).toBeInTheDocument();
  });

  it('shows correct counts', () => {
    render(<ScreeningFilterTabs {...defaultProps} />);

    expect(screen.getByTestId('tab-count-all')).toHaveTextContent('(4,521)');
    expect(screen.getByTestId('tab-count-likely_relevant')).toHaveTextContent('(2,400)');
    expect(screen.getByTestId('tab-count-uncertain')).toHaveTextContent('(800)');
    expect(screen.getByTestId('tab-count-likely_irrelevant')).toHaveTextContent('(1,321)');
  });

  it('active tab has aria-selected true', () => {
    render(<ScreeningFilterTabs {...defaultProps} activeTab="uncertain" />);

    expect(screen.getByTestId('filter-tab-uncertain')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('filter-tab-all')).toHaveAttribute('aria-selected', 'false');
  });

  it('clicking tab calls onTabChange with correct key', () => {
    const onTabChange = vi.fn();
    render(<ScreeningFilterTabs {...defaultProps} onTabChange={onTabChange} />);

    fireEvent.click(screen.getByTestId('filter-tab-likely_relevant'));
    expect(onTabChange).toHaveBeenCalledWith('likely_relevant');
  });

  it('all tab shows total count', () => {
    render(<ScreeningFilterTabs {...defaultProps} />);

    expect(screen.getByTestId('filter-tab-all')).toHaveTextContent('All');
    expect(screen.getByTestId('tab-count-all')).toHaveTextContent('(4,521)');
  });

  it('renders with zero counts', () => {
    render(
      <ScreeningFilterTabs
        {...defaultProps}
        counts={{ all: 0, likelyRelevant: 0, uncertain: 0, likelyIrrelevant: 0 }}
      />,
    );

    expect(screen.getByTestId('tab-count-all')).toHaveTextContent('(0)');
    expect(screen.getByTestId('tab-count-likely_relevant')).toHaveTextContent('(0)');
  });

  it('has tablist role on container', () => {
    render(<ScreeningFilterTabs {...defaultProps} />);

    expect(screen.getByTestId('screening-filter-tabs')).toHaveAttribute('role', 'tablist');
  });

  it('each tab has tab role', () => {
    render(<ScreeningFilterTabs {...defaultProps} />);

    expect(screen.getByTestId('filter-tab-all')).toHaveAttribute('role', 'tab');
    expect(screen.getByTestId('filter-tab-uncertain')).toHaveAttribute('role', 'tab');
  });
});
