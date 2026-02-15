import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivityFeed } from './ActivityFeed';

describe('ActivityFeed', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-14T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockActivities = [
    {
      id: 'act-1',
      description: 'uploaded 34 articles to the literature search',
      userName: 'Alice Martin',
      timestamp: '2026-02-14T11:58:00Z',
      action: 'UPLOAD',
    },
    {
      id: 'act-2',
      description: 'marked SOA Section 3 as complete',
      userName: 'Bob Wilson',
      timestamp: '2026-02-14T10:00:00Z',
      action: 'COMPLETE_SECTION',
    },
    {
      id: 'act-3',
      description: 'added a comment on CER draft',
      userName: 'Carol Davis',
      timestamp: '2026-02-12T12:00:00Z',
      action: 'COMMENT',
    },
  ];

  it('renders activity descriptions', () => {
    render(<ActivityFeed activities={mockActivities} />);

    expect(
      screen.getByText(/uploaded 34 articles to the literature search/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/marked SOA Section 3 as complete/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/added a comment on CER draft/),
    ).toBeInTheDocument();
  });

  it('shows "No recent activity." when empty', () => {
    render(<ActivityFeed activities={[]} />);

    expect(screen.getByText('No recent activity.')).toBeInTheDocument();
  });

  it('renders user name initials', () => {
    render(<ActivityFeed activities={mockActivities} />);

    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('renders relative timestamps', () => {
    render(<ActivityFeed activities={mockActivities} />);

    expect(screen.getByText('2 min ago')).toBeInTheDocument();
    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
    expect(screen.getByText('2 days ago')).toBeInTheDocument();
  });

  it('renders user names', () => {
    render(<ActivityFeed activities={mockActivities} />);

    expect(screen.getByText('Alice Martin')).toBeInTheDocument();
    expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    expect(screen.getByText('Carol Davis')).toBeInTheDocument();
  });
});
