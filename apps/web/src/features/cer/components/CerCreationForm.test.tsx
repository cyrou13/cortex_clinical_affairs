import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockUseMutation = vi.fn();
vi.mock('@apollo/client', () => ({ gql: vi.fn((s: TemplateStringsArray) => s[0]) }));
vi.mock('@apollo/client/react', () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

import { CerCreationForm } from './CerCreationForm';

const mockModules = [
  { id: 'sls-1', name: 'SLS Session 1', type: 'SLS', lockedAt: '2024-01-01' },
  { id: 'soa-1', name: 'Clinical SOA', type: 'SOA', lockedAt: '2024-02-01' },
  { id: 'val-1', name: 'Validation Study', type: 'VALIDATION', lockedAt: null },
];

const mockDocs = [
  { id: 'doc-1', title: 'IFU v2', type: 'IFU', version: '2.0' },
  { id: 'doc-2', title: 'Risk Analysis', type: 'RISK', version: '1.1' },
];

describe('CerCreationForm', () => {
  const mockCreate = vi.fn().mockResolvedValue({
    data: { createCer: { cerId: 'cer-1', version: '1.0', status: 'DRAFT' } },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([mockCreate, { loading: false }]);
  });

  it('renders the form container', () => {
    render(<CerCreationForm projectId="p-1" />);
    expect(screen.getByTestId('cer-creation-form')).toBeInTheDocument();
  });

  it('shows step indicator with 3 steps', () => {
    render(<CerCreationForm projectId="p-1" />);
    expect(screen.getByTestId('step-indicator')).toBeInTheDocument();
    expect(screen.getByText('Regulatory Context')).toBeInTheDocument();
    expect(screen.getByText('Upstream Modules')).toBeInTheDocument();
    expect(screen.getByText('External Documents')).toBeInTheDocument();
  });

  it('shows regulatory context selector on step 1', () => {
    render(<CerCreationForm projectId="p-1" />);
    expect(screen.getByTestId('regulatory-context-selector')).toBeInTheDocument();
    expect(screen.getByTestId('context-CE_MDR')).toBeInTheDocument();
    expect(screen.getByTestId('context-FDA')).toBeInTheDocument();
    expect(screen.getByTestId('context-DUAL')).toBeInTheDocument();
  });

  it('selects regulatory context via radio buttons', () => {
    render(<CerCreationForm projectId="p-1" />);
    const fdaRadio = screen.getByTestId('context-FDA');
    fireEvent.click(fdaRadio);
    expect(fdaRadio).toBeChecked();
  });

  it('navigates to step 2 on next click', () => {
    render(<CerCreationForm projectId="p-1" upstreamModules={mockModules} />);
    fireEvent.click(screen.getByTestId('next-btn'));
    expect(screen.getByTestId('upstream-step')).toBeInTheDocument();
  });

  it('navigates back to step 1 on prev click', () => {
    render(<CerCreationForm projectId="p-1" upstreamModules={mockModules} />);
    fireEvent.click(screen.getByTestId('next-btn'));
    fireEvent.click(screen.getByTestId('prev-btn'));
    expect(screen.getByTestId('regulatory-context-selector')).toBeInTheDocument();
  });

  it('shows upstream modules on step 2', () => {
    render(<CerCreationForm projectId="p-1" upstreamModules={mockModules} />);
    fireEvent.click(screen.getByTestId('next-btn'));
    expect(screen.getByTestId('module-check-sls-1')).toBeInTheDocument();
    expect(screen.getByTestId('module-check-soa-1')).toBeInTheDocument();
  });

  it('disables non-locked module checkbox', () => {
    render(<CerCreationForm projectId="p-1" upstreamModules={mockModules} />);
    fireEvent.click(screen.getByTestId('next-btn'));
    expect(screen.getByTestId('module-check-val-1')).toBeDisabled();
  });

  it('shows external docs step on step 3', () => {
    render(<CerCreationForm projectId="p-1" externalDocs={mockDocs} />);
    fireEvent.click(screen.getByTestId('next-btn'));
    fireEvent.click(screen.getByTestId('next-btn'));
    expect(screen.getByTestId('external-docs-step')).toBeInTheDocument();
  });

  it('calls mutation on create button click', async () => {
    const mockOnCreated = vi.fn();
    render(<CerCreationForm projectId="p-1" externalDocs={mockDocs} onCreated={mockOnCreated} />);
    fireEvent.click(screen.getByTestId('next-btn'));
    fireEvent.click(screen.getByTestId('next-btn'));
    fireEvent.click(screen.getByTestId('create-cer-btn'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            input: expect.objectContaining({
              projectId: 'p-1',
              regulatoryContext: 'CE_MDR',
            }),
          }),
        }),
      );
    });
  });
});
