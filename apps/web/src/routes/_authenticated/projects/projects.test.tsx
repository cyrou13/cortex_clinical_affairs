import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn().mockReturnValue([vi.fn(), { loading: false }]);

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: () => mockUseMutation(),
}));

import ProjectsPage from './index';

describe('ProjectsPage', () => {
  it('shows loading state', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      loading: true,
      error: null,
    });

    render(<ProjectsPage />);
    expect(screen.getByText(/loading projects/i)).toBeInTheDocument();
  });

  it('shows empty state with onboarding banner', () => {
    mockUseQuery
      .mockReturnValueOnce({ data: { projects: [] }, loading: false, error: null })
      .mockReturnValueOnce({ data: { users: { users: [] } }, loading: false, error: null });

    render(<ProjectsPage />);
    expect(screen.getByText(/welcome to cortex/i)).toBeInTheDocument();
    expect(screen.getByText(/create your first project/i)).toBeInTheDocument();
    expect(screen.getByText('Get Started')).toBeInTheDocument();
  });

  it('renders project cards when data is available', () => {
    mockUseQuery
      .mockReturnValueOnce({
        data: {
          projects: [
            {
              id: 'p-1',
              name: 'CSpine Evaluation',
              deviceName: 'CINA CSpine',
              deviceClass: 'IIa',
              regulatoryContext: 'CE_MDR',
              status: 'ACTIVE',
              createdAt: '2026-02-14T10:00:00Z',
            },
            {
              id: 'p-2',
              name: 'Hip Implant Evaluation',
              deviceName: 'OrthoHip Pro',
              deviceClass: 'III',
              regulatoryContext: 'BOTH',
              status: 'ACTIVE',
              createdAt: '2026-02-14T11:00:00Z',
            },
          ],
        },
        loading: false,
        error: null,
      })
      .mockReturnValueOnce({ data: { users: { users: [] } }, loading: false, error: null });

    render(<ProjectsPage />);
    expect(screen.getByText('CSpine Evaluation')).toBeInTheDocument();
    expect(screen.getByText('Hip Implant Evaluation')).toBeInTheDocument();
  });

  it('shows New Project button', () => {
    mockUseQuery
      .mockReturnValueOnce({ data: { projects: [] }, loading: false, error: null })
      .mockReturnValueOnce({ data: { users: { users: [] } }, loading: false, error: null });

    render(<ProjectsPage />);
    expect(screen.getByText('New Project')).toBeInTheDocument();
  });
});
