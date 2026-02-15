import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

// Mock window.location
Object.defineProperty(window, 'location', {
  value: { pathname: '/projects/proj-1', href: '' },
  writable: true,
});

import ProjectDashboardPage from './$projectId/index';

describe('ProjectDashboardPage', () => {
  it('shows loading state', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      loading: true,
      error: null,
    });

    render(<ProjectDashboardPage />);
    expect(screen.getByText(/loading project dashboard/i)).toBeInTheDocument();
  });

  it('renders project dashboard with pipeline in Not Started state', () => {
    mockUseQuery.mockReturnValue({
      data: {
        projectDashboard: {
          id: 'proj-1',
          name: 'CSpine Evaluation',
          deviceName: 'CINA CSpine',
          deviceClass: 'IIa',
          regulatoryContext: 'CE_MDR',
          status: 'ACTIVE',
          createdAt: '2026-02-14T10:00:00Z',
          cep: {
            id: 'cep-1',
            scope: 'Evaluate safety and performance',
            objectives: 'Demonstrate equivalence',
            deviceClassification: null,
            clinicalBackground: null,
          },
          members: [
            {
              id: 'm-1',
              userId: 'u-1',
              role: 'OWNER',
              user: {
                id: 'u-1',
                name: 'Alice Martin',
                email: 'alice@corp.com',
                avatarUrl: null,
              },
            },
          ],
          pipelineStatus: {
            sls: 'NOT_STARTED',
            soa: 'BLOCKED',
            validation: 'BLOCKED',
            cer: 'BLOCKED',
            pms: 'BLOCKED',
          },
          recentActivity: [],
        },
      },
      loading: false,
      error: null,
    });

    render(<ProjectDashboardPage />);

    expect(screen.getByText('CSpine Evaluation')).toBeInTheDocument();
    expect(screen.getByText('Pipeline Status')).toBeInTheDocument();
    expect(screen.getByText('Device Information')).toBeInTheDocument();
    expect(screen.getByText('Clinical Evaluation Plan')).toBeInTheDocument();
    expect(screen.getByText('Evaluate safety and performance')).toBeInTheDocument();
    expect(screen.getByText('Alice Martin')).toBeInTheDocument();
  });

  it('shows error state', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      loading: false,
      error: new Error('Network error'),
    });

    render(<ProjectDashboardPage />);
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });

  it('renders empty recent activity', () => {
    mockUseQuery.mockReturnValue({
      data: {
        projectDashboard: {
          id: 'proj-1',
          name: 'Test',
          deviceName: 'Device',
          deviceClass: 'I',
          regulatoryContext: 'CE_MDR',
          status: 'ACTIVE',
          createdAt: '2026-02-14T10:00:00Z',
          cep: null,
          members: [],
          pipelineStatus: {
            sls: 'NOT_STARTED',
            soa: 'BLOCKED',
            validation: 'BLOCKED',
            cer: 'BLOCKED',
            pms: 'BLOCKED',
          },
          recentActivity: [],
        },
      },
      loading: false,
      error: null,
    });

    render(<ProjectDashboardPage />);
    expect(screen.getByText('No recent activity.')).toBeInTheDocument();
  });
});
