import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();
const mockAddExclusionCode = vi.fn();
const mockRenameExclusionCode = vi.fn();
const mockHideExclusionCode = vi.fn();
const mockReorderExclusionCodes = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (mutation: unknown) => {
    const mutationStr = String(mutation);
    if (mutationStr.includes('addExclusionCode')) {
      return [mockAddExclusionCode, { loading: false }];
    }
    if (mutationStr.includes('renameExclusionCode')) {
      return [mockRenameExclusionCode, { loading: false }];
    }
    if (mutationStr.includes('hideExclusionCode')) {
      return [mockHideExclusionCode, { loading: false }];
    }
    if (mutationStr.includes('reorderExclusionCodes')) {
      return [mockReorderExclusionCodes, { loading: false }];
    }
    return [vi.fn(), { loading: false }];
  },
}));

import { ExclusionCodeManager } from './ExclusionCodeManager';

const mockCodes = [
  {
    id: 'ec-1',
    code: 'WRONG_POPULATION',
    label: 'Wrong population',
    shortCode: 'E1',
    description: 'Study population does not match',
    isHidden: false,
    displayOrder: 0,
  },
  {
    id: 'ec-2',
    code: 'WRONG_INTERVENTION',
    label: 'Wrong intervention',
    shortCode: 'E2',
    description: 'Intervention does not match criteria',
    isHidden: false,
    displayOrder: 1,
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

describe('ExclusionCodeManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddExclusionCode.mockResolvedValue({ data: { addExclusionCode: { id: 'new-1', code: 'NEW', label: 'New', shortCode: 'N1' } } });
    mockRenameExclusionCode.mockResolvedValue({ data: { renameExclusionCode: { id: 'ec-1', label: 'Updated', shortCode: 'E1' } } });
    mockHideExclusionCode.mockResolvedValue({ data: { hideExclusionCode: { id: 'ec-1', isHidden: true } } });
    mockReorderExclusionCodes.mockResolvedValue({ data: { reorderExclusionCodes: true } });
    mockUseQuery.mockReturnValue({
      data: { exclusionCodes: mockCodes },
      loading: false,
    });
  });

  it('renders the exclusion code manager', () => {
    render(<ExclusionCodeManager sessionId="sess-1" />);
    expect(screen.getByTestId('exclusion-code-manager')).toBeInTheDocument();
    expect(screen.getByText('Exclusion Codes')).toBeInTheDocument();
  });

  it('renders all exclusion codes', () => {
    render(<ExclusionCodeManager sessionId="sess-1" />);
    expect(screen.getByTestId('exclusion-code-ec-1')).toBeInTheDocument();
    expect(screen.getByTestId('exclusion-code-ec-2')).toBeInTheDocument();
    expect(screen.getByTestId('exclusion-code-ec-3')).toBeInTheDocument();
  });

  it('displays short code badges', () => {
    render(<ExclusionCodeManager sessionId="sess-1" />);
    expect(screen.getByTestId('short-code-badge-ec-1')).toHaveTextContent('E1');
    expect(screen.getByTestId('short-code-badge-ec-2')).toHaveTextContent('E2');
  });

  it('displays labels for each code', () => {
    render(<ExclusionCodeManager sessionId="sess-1" />);
    expect(screen.getByTestId('code-label-ec-1')).toHaveTextContent('Wrong population');
    expect(screen.getByTestId('code-label-ec-2')).toHaveTextContent('Wrong intervention');
  });

  it('displays descriptions when present', () => {
    render(<ExclusionCodeManager sessionId="sess-1" />);
    expect(screen.getByTestId('code-description-ec-1')).toHaveTextContent('Study population does not match');
    expect(screen.queryByTestId('code-description-ec-3')).not.toBeInTheDocument();
  });

  it('shows hidden indicator and dimmed styling for hidden codes', () => {
    render(<ExclusionCodeManager sessionId="sess-1" />);
    expect(screen.getByTestId('hidden-indicator-ec-3')).toHaveTextContent('Hidden');
    const hiddenCode = screen.getByTestId('exclusion-code-ec-3');
    expect(hiddenCode.className).toContain('opacity-50');
  });

  it('applies line-through to label of hidden codes', () => {
    render(<ExclusionCodeManager sessionId="sess-1" />);
    const hiddenLabel = screen.getByTestId('code-label-ec-3');
    expect(hiddenLabel.className).toContain('line-through');
  });

  it('shows loading state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: true });
    render(<ExclusionCodeManager sessionId="sess-1" />);
    expect(screen.getByText('Loading exclusion codes...')).toBeInTheDocument();
  });

  it('shows empty state when no codes exist', () => {
    mockUseQuery.mockReturnValue({
      data: { exclusionCodes: [] },
      loading: false,
    });
    render(<ExclusionCodeManager sessionId="sess-1" />);
    expect(screen.getByTestId('empty-codes')).toBeInTheDocument();
  });

  it('opens add form when Add Code is clicked', () => {
    render(<ExclusionCodeManager sessionId="sess-1" />);
    fireEvent.click(screen.getByTestId('add-code-button'));
    expect(screen.getByTestId('add-code-form')).toBeInTheDocument();
    expect(screen.getByTestId('new-short-code-input')).toBeInTheDocument();
    expect(screen.getByTestId('new-code-input')).toBeInTheDocument();
    expect(screen.getByTestId('new-label-input')).toBeInTheDocument();
    expect(screen.getByTestId('new-description-input')).toBeInTheDocument();
  });

  it('submits new code via mutation', async () => {
    render(<ExclusionCodeManager sessionId="sess-1" />);
    fireEvent.click(screen.getByTestId('add-code-button'));

    fireEvent.change(screen.getByTestId('new-short-code-input'), { target: { value: 'E4' } });
    fireEvent.change(screen.getByTestId('new-code-input'), { target: { value: 'WRONG_DESIGN' } });
    fireEvent.change(screen.getByTestId('new-label-input'), { target: { value: 'Wrong study design' } });
    fireEvent.change(screen.getByTestId('new-description-input'), { target: { value: 'Study design does not match' } });

    fireEvent.click(screen.getByTestId('save-new-code-button'));

    await waitFor(() => {
      expect(mockAddExclusionCode).toHaveBeenCalledWith({
        variables: {
          sessionId: 'sess-1',
          code: 'WRONG_DESIGN',
          shortCode: 'E4',
          label: 'Wrong study design',
          description: 'Study design does not match',
        },
      });
    });
  });

  it('disables save button when required fields are empty', () => {
    render(<ExclusionCodeManager sessionId="sess-1" />);
    fireEvent.click(screen.getByTestId('add-code-button'));
    expect(screen.getByTestId('save-new-code-button')).toBeDisabled();
  });

  it('cancels add form', () => {
    render(<ExclusionCodeManager sessionId="sess-1" />);
    fireEvent.click(screen.getByTestId('add-code-button'));
    expect(screen.getByTestId('add-code-form')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cancel-add-button'));
    expect(screen.queryByTestId('add-code-form')).not.toBeInTheDocument();
  });

  it('opens inline edit form when edit button is clicked', () => {
    render(<ExclusionCodeManager sessionId="sess-1" />);
    fireEvent.click(screen.getByTestId('edit-code-ec-1'));
    expect(screen.getByTestId('edit-form-ec-1')).toBeInTheDocument();
    expect(screen.getByTestId('edit-label-input-ec-1')).toHaveValue('Wrong population');
    expect(screen.getByTestId('edit-short-code-input-ec-1')).toHaveValue('E1');
  });

  it('saves edited code via mutation', async () => {
    render(<ExclusionCodeManager sessionId="sess-1" />);
    fireEvent.click(screen.getByTestId('edit-code-ec-1'));

    fireEvent.change(screen.getByTestId('edit-label-input-ec-1'), { target: { value: 'Updated label' } });
    fireEvent.click(screen.getByTestId('save-edit-ec-1'));

    await waitFor(() => {
      expect(mockRenameExclusionCode).toHaveBeenCalledWith({
        variables: {
          id: 'ec-1',
          label: 'Updated label',
          shortCode: 'E1',
        },
      });
    });
  });

  it('cancels edit inline', () => {
    render(<ExclusionCodeManager sessionId="sess-1" />);
    fireEvent.click(screen.getByTestId('edit-code-ec-1'));
    expect(screen.getByTestId('edit-form-ec-1')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cancel-edit-ec-1'));
    expect(screen.queryByTestId('edit-form-ec-1')).not.toBeInTheDocument();
  });

  it('shows confirmation dialog when hiding a visible code', () => {
    render(<ExclusionCodeManager sessionId="sess-1" />);
    fireEvent.click(screen.getByTestId('toggle-hide-ec-1'));
    expect(screen.getByTestId('hide-confirmation-dialog')).toBeInTheDocument();
  });

  it('hides code after confirmation', async () => {
    render(<ExclusionCodeManager sessionId="sess-1" />);
    fireEvent.click(screen.getByTestId('toggle-hide-ec-1'));
    fireEvent.click(screen.getByTestId('confirm-hide-button'));

    await waitFor(() => {
      expect(mockHideExclusionCode).toHaveBeenCalledWith({
        variables: { id: 'ec-1' },
      });
    });
  });

  it('cancels hide confirmation', () => {
    render(<ExclusionCodeManager sessionId="sess-1" />);
    fireEvent.click(screen.getByTestId('toggle-hide-ec-1'));
    expect(screen.getByTestId('hide-confirmation-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cancel-hide-button'));
    expect(screen.queryByTestId('hide-confirmation-dialog')).not.toBeInTheDocument();
  });

  it('unhides a hidden code directly without confirmation', async () => {
    render(<ExclusionCodeManager sessionId="sess-1" />);
    // ec-3 is hidden, clicking toggle-hide should unhide directly
    fireEvent.click(screen.getByTestId('toggle-hide-ec-3'));

    await waitFor(() => {
      expect(mockHideExclusionCode).toHaveBeenCalledWith({
        variables: { id: 'ec-3' },
      });
    });
    // No confirmation dialog should appear
    expect(screen.queryByTestId('hide-confirmation-dialog')).not.toBeInTheDocument();
  });

  it('reorders codes when move up is clicked', async () => {
    render(<ExclusionCodeManager sessionId="sess-1" />);
    fireEvent.click(screen.getByTestId('move-up-ec-2'));

    await waitFor(() => {
      expect(mockReorderExclusionCodes).toHaveBeenCalledWith({
        variables: {
          sessionId: 'sess-1',
          orderedIds: ['ec-2', 'ec-1', 'ec-3'],
        },
      });
    });
  });

  it('reorders codes when move down is clicked', async () => {
    render(<ExclusionCodeManager sessionId="sess-1" />);
    fireEvent.click(screen.getByTestId('move-down-ec-1'));

    await waitFor(() => {
      expect(mockReorderExclusionCodes).toHaveBeenCalledWith({
        variables: {
          sessionId: 'sess-1',
          orderedIds: ['ec-2', 'ec-1', 'ec-3'],
        },
      });
    });
  });

  it('disables move up for first item', () => {
    render(<ExclusionCodeManager sessionId="sess-1" />);
    expect(screen.getByTestId('move-up-ec-1')).toBeDisabled();
  });

  it('disables move down for last item', () => {
    render(<ExclusionCodeManager sessionId="sess-1" />);
    expect(screen.getByTestId('move-down-ec-3')).toBeDisabled();
  });

  it('passes sessionId to useQuery', () => {
    render(<ExclusionCodeManager sessionId="sess-42" />);
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ variables: { sessionId: 'sess-42' } }),
    );
  });
});
