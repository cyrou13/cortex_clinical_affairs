import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuickActions } from './QuickActions';

describe('QuickActions', () => {
  it('shows "Start Literature Search" when SLS is NOT_STARTED', () => {
    render(
      <QuickActions
        projectId="proj-1"
        pipelineStatus={{
          sls: 'NOT_STARTED',
          soa: 'BLOCKED',
          validation: 'BLOCKED',
          cer: 'BLOCKED',
          pms: 'BLOCKED',
        }}
      />
    );

    expect(screen.getByText('Start Literature Search')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /start literature search/i }),
    ).toHaveAttribute('href', '/projects/proj-1/sls');
  });

  it('shows "Begin State of the Art" when SLS is LOCKED and SOA is BLOCKED', () => {
    render(
      <QuickActions
        projectId="proj-1"
        pipelineStatus={{
          sls: 'LOCKED',
          soa: 'BLOCKED',
          validation: 'BLOCKED',
          cer: 'BLOCKED',
          pms: 'BLOCKED',
        }}
      />
    );

    expect(screen.getByText('Begin State of the Art')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /begin state of the art/i }),
    ).toHaveAttribute('href', '/projects/proj-1/soa');
  });

  it('shows "Export CER" when all stages are LOCKED', () => {
    render(
      <QuickActions
        projectId="proj-1"
        pipelineStatus={{
          sls: 'LOCKED',
          soa: 'LOCKED',
          validation: 'LOCKED',
          cer: 'LOCKED',
          pms: 'LOCKED',
        }}
      />
    );

    expect(screen.getByText('Export CER')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /export cer/i }),
    ).toHaveAttribute('href', '/projects/proj-1/cer/export');
  });

  it('shows "View Pipeline" as default action', () => {
    render(
      <QuickActions
        projectId="proj-1"
        pipelineStatus={{
          sls: 'ACTIVE',
          soa: 'BLOCKED',
          validation: 'BLOCKED',
          cer: 'BLOCKED',
          pms: 'BLOCKED',
        }}
      />
    );

    expect(screen.getByText('View Pipeline')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /view pipeline/i }),
    ).toHaveAttribute('href', '/projects/proj-1/pipeline');
  });
});
