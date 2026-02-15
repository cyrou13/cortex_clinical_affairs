import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectTimeline } from './ProjectTimeline';

const mockMilestones = [
  {
    id: 'ms-1',
    name: 'Literature Search Complete',
    module: 'SLS',
    status: 'completed' as const,
    targetDate: '2026-03-01',
    completedDate: '2026-02-28',
    order: 1,
  },
  {
    id: 'ms-2',
    name: 'SOA Analysis Draft',
    module: 'SOA',
    status: 'active' as const,
    targetDate: '2026-04-15',
    completedDate: null,
    order: 2,
  },
  {
    id: 'ms-3',
    name: 'CER Final Review',
    module: 'CER',
    status: 'pending' as const,
    targetDate: '2026-06-01',
    completedDate: null,
    order: 3,
  },
];

describe('ProjectTimeline', () => {
  it('renders milestone names', () => {
    render(<ProjectTimeline milestones={mockMilestones} />);

    expect(screen.getByText('Literature Search Complete')).toBeInTheDocument();
    expect(screen.getByText('SOA Analysis Draft')).toBeInTheDocument();
    expect(screen.getByText('CER Final Review')).toBeInTheDocument();
  });

  it('renders correct status icons', () => {
    render(<ProjectTimeline milestones={mockMilestones} />);

    expect(screen.getByLabelText('Completed')).toBeInTheDocument();
    expect(screen.getByLabelText('Active')).toBeInTheDocument();
    expect(screen.getByLabelText('Pending')).toBeInTheDocument();
  });

  it('renders empty state when no milestones', () => {
    render(<ProjectTimeline milestones={[]} />);

    expect(screen.getByText('No milestones defined yet.')).toBeInTheDocument();
  });

  it('renders module labels', () => {
    render(<ProjectTimeline milestones={mockMilestones} />);

    expect(screen.getByText('SLS')).toBeInTheDocument();
    expect(screen.getByText('SOA')).toBeInTheDocument();
    expect(screen.getByText('CER')).toBeInTheDocument();
  });

  it('renders completed date for completed milestones', () => {
    render(<ProjectTimeline milestones={mockMilestones} />);

    expect(screen.getByText('Completed Feb 28, 2026')).toBeInTheDocument();
  });

  it('renders target date for pending milestones', () => {
    render(<ProjectTimeline milestones={mockMilestones} />);

    expect(screen.getByText('Target: Jun 1, 2026')).toBeInTheDocument();
  });
});
