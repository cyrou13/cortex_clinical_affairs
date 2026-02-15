import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

import { AuditTrailViewer } from './AuditTrailViewer';

describe('AuditTrailViewer', () => {
  it('renders empty state when no entries', () => {
    mockUseQuery.mockReturnValue({
      data: { auditLogs: [] },
      loading: false,
      error: null,
    });

    render(<AuditTrailViewer />);
    expect(screen.getByText(/no audit entries/i)).toBeInTheDocument();
  });

  it('renders audit entries when data is available', () => {
    mockUseQuery.mockReturnValue({
      data: {
        auditLogs: [
          {
            id: 'log-1',
            action: 'document.create',
            targetType: 'document',
            targetId: 'doc-1',
            userId: 'user-1',
            before: null,
            after: { name: 'New Doc' },
            metadata: null,
            timestamp: '2026-02-14T09:00:00Z',
          },
          {
            id: 'log-2',
            action: 'project.update',
            targetType: 'project',
            targetId: 'proj-1',
            userId: 'user-2',
            before: { name: 'Old' },
            after: { name: 'New' },
            metadata: null,
            timestamp: '2026-02-14T10:00:00Z',
          },
        ],
      },
      loading: false,
      error: null,
    });

    render(<AuditTrailViewer />);
    expect(screen.getByText('document.create')).toBeInTheDocument();
    expect(screen.getByText('project.update')).toBeInTheDocument();
  });

  it('shows filter inputs', () => {
    mockUseQuery.mockReturnValue({
      data: { auditLogs: [] },
      loading: false,
      error: null,
    });

    render(<AuditTrailViewer />);
    expect(screen.getByLabelText(/action/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/user/i)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      loading: true,
      error: null,
    });

    render(<AuditTrailViewer />);
    expect(screen.getByText(/loading audit trail/i)).toBeInTheDocument();
  });
});
