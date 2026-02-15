import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectCard } from './ProjectCard';

describe('ProjectCard', () => {
  const defaultProps = {
    id: 'proj-1',
    name: 'CSpine Evaluation',
    deviceName: 'CINA CSpine',
    deviceClass: 'IIa',
    regulatoryContext: 'CE_MDR',
    createdAt: '2026-02-14T10:00:00Z',
  };

  it('renders project name and device name', () => {
    render(<ProjectCard {...defaultProps} />);

    expect(screen.getByText('CSpine Evaluation')).toBeInTheDocument();
    expect(screen.getByText('CINA CSpine')).toBeInTheDocument();
  });

  it('renders device class', () => {
    render(<ProjectCard {...defaultProps} />);

    expect(screen.getByText('Class IIa')).toBeInTheDocument();
  });

  it('renders regulatory context badge', () => {
    render(<ProjectCard {...defaultProps} />);

    expect(screen.getByText('CE-MDR')).toBeInTheDocument();
  });

  it('renders FDA badge for FDA_510K context', () => {
    render(<ProjectCard {...defaultProps} regulatoryContext="FDA_510K" />);

    expect(screen.getByText('FDA 510(k)')).toBeInTheDocument();
  });

  it('renders 5 pipeline mini dots', () => {
    render(<ProjectCard {...defaultProps} />);

    expect(screen.getByTestId('pipeline-dot-sls')).toBeInTheDocument();
    expect(screen.getByTestId('pipeline-dot-soa')).toBeInTheDocument();
    expect(screen.getByTestId('pipeline-dot-validation')).toBeInTheDocument();
    expect(screen.getByTestId('pipeline-dot-cer')).toBeInTheDocument();
    expect(screen.getByTestId('pipeline-dot-pms')).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    const onClick = vi.fn();
    render(<ProjectCard {...defaultProps} onClick={onClick} />);

    fireEvent.click(screen.getByRole('article'));
    expect(onClick).toHaveBeenCalledWith('proj-1');
  });

  it('has accessible aria-label', () => {
    render(<ProjectCard {...defaultProps} />);

    expect(screen.getByRole('article')).toHaveAttribute(
      'aria-label',
      'Project: CSpine Evaluation',
    );
  });
});
