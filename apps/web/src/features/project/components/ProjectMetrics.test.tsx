import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectMetrics } from './ProjectMetrics';

describe('ProjectMetrics', () => {
  it('renders all 4 metric cards', () => {
    render(
      <ProjectMetrics
        totalArticles={4521}
        includedArticles={641}
        soaSectionsComplete={8}
        soaSectionsTotal={11}
        cerSectionsComplete={0}
        cerSectionsTotal={14}
      />
    );
    expect(screen.getByText('4,521')).toBeInTheDocument();
    expect(screen.getByText('641')).toBeInTheDocument();
    expect(screen.getByText('8/11')).toBeInTheDocument();
    expect(screen.getByText('0/14')).toBeInTheDocument();
  });

  it('renders metric labels', () => {
    render(
      <ProjectMetrics
        totalArticles={0}
        includedArticles={0}
        soaSectionsComplete={0}
        soaSectionsTotal={11}
        cerSectionsComplete={0}
        cerSectionsTotal={14}
      />
    );
    expect(screen.getByText('Total Articles')).toBeInTheDocument();
    expect(screen.getByText('Included')).toBeInTheDocument();
    expect(screen.getByText('SOA Sections')).toBeInTheDocument();
    expect(screen.getByText('CER Sections')).toBeInTheDocument();
  });

  it('shows zero values for new projects', () => {
    render(
      <ProjectMetrics
        totalArticles={0}
        includedArticles={0}
        soaSectionsComplete={0}
        soaSectionsTotal={11}
        cerSectionsComplete={0}
        cerSectionsTotal={14}
      />
    );
    expect(screen.getByText('0/11')).toBeInTheDocument();
    expect(screen.getByText('0/14')).toBeInTheDocument();
  });
});
