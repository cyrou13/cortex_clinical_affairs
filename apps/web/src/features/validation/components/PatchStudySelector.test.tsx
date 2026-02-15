import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

import { PatchStudySelector } from './PatchStudySelector';

const mockLockedStudies = {
  lockedValidationStudies: [
    { id: 'study-1', name: 'Validation Study v1', type: 'STANDALONE', lockedAt: '2026-01-15' },
    { id: 'study-2', name: 'Validation Study v2', type: 'MRMC', lockedAt: '2026-02-01' },
  ],
};

describe('PatchStudySelector', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the selector', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: false });
    render(
      <PatchStudySelector projectId="proj-1" isPatch={false} parentStudyId={null} onChange={mockOnChange} />,
    );

    expect(screen.getByTestId('patch-selector')).toBeInTheDocument();
    expect(screen.getByTestId('is-patch-checkbox')).toBeInTheDocument();
  });

  it('checkbox is unchecked by default when isPatch false', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: false });
    render(
      <PatchStudySelector projectId="proj-1" isPatch={false} parentStudyId={null} onChange={mockOnChange} />,
    );

    expect(screen.getByTestId('is-patch-checkbox')).not.toBeChecked();
  });

  it('does not show dropdown when isPatch is false', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: false });
    render(
      <PatchStudySelector projectId="proj-1" isPatch={false} parentStudyId={null} onChange={mockOnChange} />,
    );

    expect(screen.queryByTestId('parent-study-dropdown')).not.toBeInTheDocument();
  });

  it('shows dropdown when isPatch is true', () => {
    mockUseQuery.mockReturnValue({ data: mockLockedStudies, loading: false });
    render(
      <PatchStudySelector projectId="proj-1" isPatch={true} parentStudyId={null} onChange={mockOnChange} />,
    );

    expect(screen.getByTestId('parent-study-dropdown')).toBeInTheDocument();
  });

  it('displays locked studies in dropdown', () => {
    mockUseQuery.mockReturnValue({ data: mockLockedStudies, loading: false });
    render(
      <PatchStudySelector projectId="proj-1" isPatch={true} parentStudyId={null} onChange={mockOnChange} />,
    );

    const dropdown = screen.getByTestId('parent-study-dropdown');
    expect(dropdown.querySelectorAll('option').length).toBe(3); // placeholder + 2 studies
  });

  it('calls onChange when checkbox toggled', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: false });
    render(
      <PatchStudySelector projectId="proj-1" isPatch={false} parentStudyId={null} onChange={mockOnChange} />,
    );

    fireEvent.click(screen.getByTestId('is-patch-checkbox'));

    expect(mockOnChange).toHaveBeenCalledWith(true, null);
  });

  it('calls onChange when study selected', () => {
    mockUseQuery.mockReturnValue({ data: mockLockedStudies, loading: false });
    render(
      <PatchStudySelector projectId="proj-1" isPatch={true} parentStudyId={null} onChange={mockOnChange} />,
    );

    fireEvent.change(screen.getByTestId('parent-study-dropdown'), { target: { value: 'study-1' } });

    expect(mockOnChange).toHaveBeenCalledWith(true, 'study-1');
  });

  it('shows parent study reference when selected', () => {
    mockUseQuery.mockReturnValue({ data: mockLockedStudies, loading: false });
    render(
      <PatchStudySelector projectId="proj-1" isPatch={true} parentStudyId="study-1" onChange={mockOnChange} />,
    );

    expect(screen.getByTestId('parent-study-ref')).toBeInTheDocument();
    expect(screen.getByText('Validation Study v1')).toBeInTheDocument();
  });

  it('does not show parent study ref when no study selected', () => {
    mockUseQuery.mockReturnValue({ data: mockLockedStudies, loading: false });
    render(
      <PatchStudySelector projectId="proj-1" isPatch={true} parentStudyId={null} onChange={mockOnChange} />,
    );

    expect(screen.queryByTestId('parent-study-ref')).not.toBeInTheDocument();
  });

  it('clears parent study when unchecking patch', () => {
    mockUseQuery.mockReturnValue({ data: mockLockedStudies, loading: false });
    render(
      <PatchStudySelector projectId="proj-1" isPatch={true} parentStudyId="study-1" onChange={mockOnChange} />,
    );

    fireEvent.click(screen.getByTestId('is-patch-checkbox'));

    expect(mockOnChange).toHaveBeenCalledWith(false, null);
  });
});
