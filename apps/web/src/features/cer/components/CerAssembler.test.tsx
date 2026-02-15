import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockUseMutation = vi.fn();
vi.mock('@apollo/client', () => ({ gql: vi.fn((s: TemplateStringsArray) => s[0]) }));
vi.mock('@apollo/client/react', () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

import { CerAssembler } from './CerAssembler';

const allMetPrereqs = [
  { label: 'Upstream modules linked', met: true },
  { label: 'External documents uploaded', met: true },
  { label: 'Vigilance search completed', met: true },
];

const partialPrereqs = [
  { label: 'Upstream modules linked', met: true },
  { label: 'External documents uploaded', met: false },
  { label: 'Vigilance search completed', met: true },
];

describe('CerAssembler', () => {
  const mockAssemble = vi.fn().mockResolvedValue({ data: { assembleCer: { assemblyId: 'asm-1', status: 'RUNNING' } } });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([mockAssemble, { loading: false }]);
  });

  it('renders the assembler container', () => {
    render(<CerAssembler cerId="cer-1" prerequisites={allMetPrereqs} />);
    expect(screen.getByTestId('cer-assembler')).toBeInTheDocument();
  });

  it('shows checklist items', () => {
    render(<CerAssembler cerId="cer-1" prerequisites={allMetPrereqs} />);
    const items = screen.getAllByTestId('checklist-item');
    expect(items).toHaveLength(3);
  });

  it('shows assemble button', () => {
    render(<CerAssembler cerId="cer-1" prerequisites={allMetPrereqs} />);
    expect(screen.getByTestId('assemble-btn')).toBeInTheDocument();
  });

  it('enables assemble button when all prerequisites met', () => {
    render(<CerAssembler cerId="cer-1" prerequisites={allMetPrereqs} />);
    expect(screen.getByTestId('assemble-btn')).not.toBeDisabled();
  });

  it('disables assemble button when prerequisites not met', () => {
    render(<CerAssembler cerId="cer-1" prerequisites={partialPrereqs} />);
    expect(screen.getByTestId('assemble-btn')).toBeDisabled();
  });

  it('shows prerequisite warning when not all met', () => {
    render(<CerAssembler cerId="cer-1" prerequisites={partialPrereqs} />);
    expect(screen.getByTestId('prerequisite-warning')).toBeInTheDocument();
  });

  it('calls mutation on assemble click', async () => {
    render(<CerAssembler cerId="cer-1" prerequisites={allMetPrereqs} />);
    fireEvent.click(screen.getByTestId('assemble-btn'));
    await waitFor(() => {
      expect(mockAssemble).toHaveBeenCalledWith({ variables: { cerId: 'cer-1' } });
    });
  });
});
