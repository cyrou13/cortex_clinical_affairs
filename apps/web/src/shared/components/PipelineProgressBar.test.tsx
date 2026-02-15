import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PipelineProgressBar } from './PipelineProgressBar';

describe('PipelineProgressBar', () => {
  it('renders 5 pipeline nodes', () => {
    render(<PipelineProgressBar />);
    expect(screen.getByTestId('pipeline-node-sls')).toBeInTheDocument();
    expect(screen.getByTestId('pipeline-node-soa')).toBeInTheDocument();
    expect(screen.getByTestId('pipeline-node-validation')).toBeInTheDocument();
    expect(screen.getByTestId('pipeline-node-cer')).toBeInTheDocument();
    expect(screen.getByTestId('pipeline-node-pms')).toBeInTheDocument();
  });

  it('has navigation role with proper aria-label', () => {
    render(<PipelineProgressBar />);
    const nav = screen.getByRole('navigation', { name: /pipeline progression/i });
    expect(nav).toBeInTheDocument();
  });

  it('renders labels for each node', () => {
    render(<PipelineProgressBar />);
    expect(screen.getByText('SLS')).toBeInTheDocument();
    expect(screen.getByText('SOA')).toBeInTheDocument();
    expect(screen.getByText('Validation')).toBeInTheDocument();
    expect(screen.getByText('CER')).toBeInTheDocument();
    expect(screen.getByText('PMS')).toBeInTheDocument();
  });

  it('calls onNodeClick when a node is clicked', () => {
    const handleClick = vi.fn();
    render(<PipelineProgressBar onNodeClick={handleClick} />);
    const slsButton = screen.getByLabelText(/SLS/);
    fireEvent.click(slsButton);
    expect(handleClick).toHaveBeenCalledWith('sls');
  });

  it('renders active node with aria-current=step', () => {
    render(
      <PipelineProgressBar
        nodes={[
          { id: 'sls', label: 'SLS', status: 'active' },
          { id: 'soa', label: 'SOA', status: 'not_started' },
          { id: 'validation', label: 'Validation', status: 'not_started' },
          { id: 'cer', label: 'CER', status: 'not_started' },
          { id: 'pms', label: 'PMS', status: 'not_started' },
        ]}
      />,
    );
    const activeButton = screen.getByLabelText(/SLS/);
    expect(activeButton).toHaveAttribute('aria-current', 'step');
  });

  it('disables blocked nodes', () => {
    render(
      <PipelineProgressBar
        nodes={[
          { id: 'sls', label: 'SLS', status: 'completed' },
          { id: 'soa', label: 'SOA', status: 'blocked' },
          { id: 'validation', label: 'Validation', status: 'not_started' },
          { id: 'cer', label: 'CER', status: 'not_started' },
          { id: 'pms', label: 'PMS', status: 'not_started' },
        ]}
      />,
    );
    const blockedButton = screen.getByLabelText(/SOA/);
    expect(blockedButton).toBeDisabled();
  });
});
