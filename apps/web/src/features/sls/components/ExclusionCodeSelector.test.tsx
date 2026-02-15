import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

import { ExclusionCodeSelector } from './ExclusionCodeSelector';

const mockCodes = [
  {
    id: 'ec-1',
    code: 'WRONG_POPULATION',
    label: 'Wrong population',
    shortCode: 'E1',
    description: 'Study population does not match',
    isHidden: false,
    displayOrder: 1,
  },
  {
    id: 'ec-2',
    code: 'WRONG_INTERVENTION',
    label: 'Wrong intervention',
    shortCode: 'E2',
    description: null,
    isHidden: false,
    displayOrder: 0,
  },
  {
    id: 'ec-3',
    code: 'WRONG_OUTCOME',
    label: 'Wrong outcome',
    shortCode: 'E3',
    description: null,
    isHidden: true,
    displayOrder: 2,
  },
];

describe('ExclusionCodeSelector', () => {
  const defaultProps = {
    sessionId: 'sess-1',
    value: null as string | null,
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: { exclusionCodes: mockCodes },
      loading: false,
    });
  });

  it('renders the selector', () => {
    render(<ExclusionCodeSelector {...defaultProps} />);
    expect(screen.getByTestId('exclusion-code-selector')).toBeInTheDocument();
    expect(screen.getByTestId('exclusion-code-select')).toBeInTheDocument();
  });

  it('shows the default empty option', () => {
    render(<ExclusionCodeSelector {...defaultProps} />);
    expect(screen.getByText('-- No exclusion code --')).toBeInTheDocument();
  });

  it('only shows visible (non-hidden) codes', () => {
    render(<ExclusionCodeSelector {...defaultProps} />);
    // ec-1 and ec-2 are visible, ec-3 is hidden
    expect(screen.getByTestId('option-ec-1')).toBeInTheDocument();
    expect(screen.getByTestId('option-ec-2')).toBeInTheDocument();
    expect(screen.queryByTestId('option-ec-3')).not.toBeInTheDocument();
  });

  it('shows shortCode + label format', () => {
    render(<ExclusionCodeSelector {...defaultProps} />);
    expect(screen.getByTestId('option-ec-1')).toHaveTextContent('E1 - Wrong population');
    expect(screen.getByTestId('option-ec-2')).toHaveTextContent('E2 - Wrong intervention');
  });

  it('sorts options by displayOrder', () => {
    render(<ExclusionCodeSelector {...defaultProps} />);
    const select = screen.getByTestId('exclusion-code-select');
    const options = select.querySelectorAll('option');
    // First option is the empty one, then sorted by displayOrder
    // ec-2 has displayOrder 0, ec-1 has displayOrder 1
    expect(options[1]).toHaveTextContent('E2 - Wrong intervention');
    expect(options[2]).toHaveTextContent('E1 - Wrong population');
  });

  it('calls onChange with code id when selected', () => {
    const onChange = vi.fn();
    render(<ExclusionCodeSelector {...defaultProps} onChange={onChange} />);

    fireEvent.change(screen.getByTestId('exclusion-code-select'), {
      target: { value: 'ec-1' },
    });

    expect(onChange).toHaveBeenCalledWith('ec-1');
  });

  it('calls onChange with null when empty option is selected', () => {
    const onChange = vi.fn();
    render(<ExclusionCodeSelector {...defaultProps} value="ec-1" onChange={onChange} />);

    fireEvent.change(screen.getByTestId('exclusion-code-select'), {
      target: { value: '' },
    });

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('shows loading state with disabled select', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: true });
    render(<ExclusionCodeSelector {...defaultProps} />);
    expect(screen.getByTestId('exclusion-code-select')).toBeDisabled();
  });

  it('reflects the current value', () => {
    render(<ExclusionCodeSelector {...defaultProps} value="ec-1" />);
    expect(screen.getByTestId('exclusion-code-select')).toHaveValue('ec-1');
  });

  it('has an accessible aria-label', () => {
    render(<ExclusionCodeSelector {...defaultProps} />);
    expect(screen.getByTestId('exclusion-code-select')).toHaveAttribute(
      'aria-label',
      'Select exclusion code',
    );
  });

  it('passes sessionId to useQuery', () => {
    render(<ExclusionCodeSelector {...defaultProps} sessionId="sess-42" />);
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ variables: { sessionId: 'sess-42' } }),
    );
  });
});
