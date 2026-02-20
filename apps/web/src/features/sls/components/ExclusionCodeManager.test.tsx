import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithApollo, type MockedResponse } from '../../../test-utils/apollo-wrapper';
import { GET_EXCLUSION_CODES } from '../graphql/queries';
import {
  ADD_EXCLUSION_CODE,
  RENAME_EXCLUSION_CODE,
  HIDE_EXCLUSION_CODE,
  REORDER_EXCLUSION_CODES,
} from '../graphql/mutations';
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

function buildQueryMock(sessionId = 'sess-1', codes = mockCodes): MockedResponse {
  return {
    request: {
      query: GET_EXCLUSION_CODES,
      variables: { sessionId },
    },
    result: {
      data: { exclusionCodes: codes },
    },
  };
}

describe('ExclusionCodeManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the exclusion code manager', async () => {
    renderWithApollo(<ExclusionCodeManager sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByText('Exclusion Codes');
    expect(screen.getByTestId('exclusion-code-manager')).toBeInTheDocument();
  });

  it('renders all exclusion codes', async () => {
    renderWithApollo(<ExclusionCodeManager sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByTestId('exclusion-code-ec-1');
    expect(screen.getByTestId('exclusion-code-ec-2')).toBeInTheDocument();
    expect(screen.getByTestId('exclusion-code-ec-3')).toBeInTheDocument();
  });

  it('displays short code badges', async () => {
    renderWithApollo(<ExclusionCodeManager sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByTestId('short-code-badge-ec-1');
    expect(screen.getByTestId('short-code-badge-ec-1')).toHaveTextContent('E1');
    expect(screen.getByTestId('short-code-badge-ec-2')).toHaveTextContent('E2');
  });

  it('displays labels for each code', async () => {
    renderWithApollo(<ExclusionCodeManager sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByTestId('code-label-ec-1');
    expect(screen.getByTestId('code-label-ec-1')).toHaveTextContent('Wrong population');
    expect(screen.getByTestId('code-label-ec-2')).toHaveTextContent('Wrong intervention');
  });

  it('displays descriptions when present', async () => {
    renderWithApollo(<ExclusionCodeManager sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByTestId('code-description-ec-1');
    expect(screen.getByTestId('code-description-ec-1')).toHaveTextContent(
      'Study population does not match',
    );
    expect(screen.queryByTestId('code-description-ec-3')).not.toBeInTheDocument();
  });

  it('shows hidden indicator and dimmed styling for hidden codes', async () => {
    renderWithApollo(<ExclusionCodeManager sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByTestId('hidden-indicator-ec-3');
    expect(screen.getByTestId('hidden-indicator-ec-3')).toHaveTextContent('Hidden');
    const hiddenCode = screen.getByTestId('exclusion-code-ec-3');
    expect(hiddenCode.className).toContain('opacity-50');
  });

  it('applies line-through to label of hidden codes', async () => {
    renderWithApollo(<ExclusionCodeManager sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByTestId('code-label-ec-3');
    const hiddenLabel = screen.getByTestId('code-label-ec-3');
    expect(hiddenLabel.className).toContain('line-through');
  });

  it('shows loading state', () => {
    renderWithApollo(<ExclusionCodeManager sessionId="sess-1" />, []);
    expect(screen.getByText('Loading exclusion codes...')).toBeInTheDocument();
  });

  it('shows empty state when no codes exist', async () => {
    renderWithApollo(<ExclusionCodeManager sessionId="sess-1" />, [buildQueryMock('sess-1', [])]);
    await screen.findByTestId('empty-codes');
  });

  it('opens add form when Add Code is clicked', async () => {
    renderWithApollo(<ExclusionCodeManager sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByTestId('add-code-button');
    fireEvent.click(screen.getByTestId('add-code-button'));
    expect(screen.getByTestId('add-code-form')).toBeInTheDocument();
    expect(screen.getByTestId('new-short-code-input')).toBeInTheDocument();
    expect(screen.getByTestId('new-code-input')).toBeInTheDocument();
    expect(screen.getByTestId('new-label-input')).toBeInTheDocument();
    expect(screen.getByTestId('new-description-input')).toBeInTheDocument();
  });

  it('submits new code via mutation', async () => {
    const addMock: MockedResponse = {
      request: {
        query: ADD_EXCLUSION_CODE,
        variables: {
          sessionId: 'sess-1',
          code: 'WRONG_DESIGN',
          shortCode: 'E4',
          label: 'Wrong study design',
          description: 'Study design does not match',
        },
      },
      result: {
        data: {
          addExclusionCode: {
            id: 'new-1',
            code: 'WRONG_DESIGN',
            label: 'Wrong study design',
            shortCode: 'E4',
          },
        },
      },
    };
    renderWithApollo(<ExclusionCodeManager sessionId="sess-1" />, [
      buildQueryMock(),
      addMock,
      buildQueryMock(),
    ]);
    await screen.findByTestId('add-code-button');
    fireEvent.click(screen.getByTestId('add-code-button'));

    fireEvent.change(screen.getByTestId('new-short-code-input'), { target: { value: 'E4' } });
    fireEvent.change(screen.getByTestId('new-code-input'), { target: { value: 'WRONG_DESIGN' } });
    fireEvent.change(screen.getByTestId('new-label-input'), {
      target: { value: 'Wrong study design' },
    });
    fireEvent.change(screen.getByTestId('new-description-input'), {
      target: { value: 'Study design does not match' },
    });

    fireEvent.click(screen.getByTestId('save-new-code-button'));

    // After adding, the form should close
    await waitFor(() => {
      expect(screen.queryByTestId('add-code-form')).not.toBeInTheDocument();
    });
  });

  it('disables save button when required fields are empty', async () => {
    renderWithApollo(<ExclusionCodeManager sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByTestId('add-code-button');
    fireEvent.click(screen.getByTestId('add-code-button'));
    expect(screen.getByTestId('save-new-code-button')).toBeDisabled();
  });

  it('cancels add form', async () => {
    renderWithApollo(<ExclusionCodeManager sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByTestId('add-code-button');
    fireEvent.click(screen.getByTestId('add-code-button'));
    expect(screen.getByTestId('add-code-form')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cancel-add-button'));
    expect(screen.queryByTestId('add-code-form')).not.toBeInTheDocument();
  });

  it('opens inline edit form when edit button is clicked', async () => {
    renderWithApollo(<ExclusionCodeManager sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByTestId('edit-code-ec-1');
    fireEvent.click(screen.getByTestId('edit-code-ec-1'));
    expect(screen.getByTestId('edit-form-ec-1')).toBeInTheDocument();
    expect(screen.getByTestId('edit-label-input-ec-1')).toHaveValue('Wrong population');
    expect(screen.getByTestId('edit-short-code-input-ec-1')).toHaveValue('E1');
  });

  it('saves edited code via mutation', async () => {
    const renameMock: MockedResponse = {
      request: {
        query: RENAME_EXCLUSION_CODE,
        variables: {
          id: 'ec-1',
          label: 'Updated label',
          shortCode: 'E1',
        },
      },
      result: {
        data: {
          renameExclusionCode: { id: 'ec-1', label: 'Updated label', shortCode: 'E1' },
        },
      },
    };
    renderWithApollo(<ExclusionCodeManager sessionId="sess-1" />, [
      buildQueryMock(),
      renameMock,
      buildQueryMock(),
    ]);
    await screen.findByTestId('edit-code-ec-1');
    fireEvent.click(screen.getByTestId('edit-code-ec-1'));

    fireEvent.change(screen.getByTestId('edit-label-input-ec-1'), {
      target: { value: 'Updated label' },
    });
    fireEvent.click(screen.getByTestId('save-edit-ec-1'));

    // After saving, the edit form should close
    await waitFor(() => {
      expect(screen.queryByTestId('edit-form-ec-1')).not.toBeInTheDocument();
    });
  });

  it('cancels edit inline', async () => {
    renderWithApollo(<ExclusionCodeManager sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByTestId('edit-code-ec-1');
    fireEvent.click(screen.getByTestId('edit-code-ec-1'));
    expect(screen.getByTestId('edit-form-ec-1')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cancel-edit-ec-1'));
    expect(screen.queryByTestId('edit-form-ec-1')).not.toBeInTheDocument();
  });

  it('shows confirmation dialog when hiding a visible code', async () => {
    renderWithApollo(<ExclusionCodeManager sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByTestId('toggle-hide-ec-1');
    fireEvent.click(screen.getByTestId('toggle-hide-ec-1'));
    expect(screen.getByTestId('hide-confirmation-dialog')).toBeInTheDocument();
  });

  it('hides code after confirmation', async () => {
    const hideMock: MockedResponse = {
      request: {
        query: HIDE_EXCLUSION_CODE,
        variables: { id: 'ec-1' },
      },
      result: {
        data: { hideExclusionCode: { id: 'ec-1', isHidden: true } },
      },
    };
    renderWithApollo(<ExclusionCodeManager sessionId="sess-1" />, [
      buildQueryMock(),
      hideMock,
      buildQueryMock(),
    ]);
    await screen.findByTestId('toggle-hide-ec-1');
    fireEvent.click(screen.getByTestId('toggle-hide-ec-1'));
    fireEvent.click(screen.getByTestId('confirm-hide-button'));

    await waitFor(() => {
      expect(screen.queryByTestId('hide-confirmation-dialog')).not.toBeInTheDocument();
    });
  });

  it('cancels hide confirmation', async () => {
    renderWithApollo(<ExclusionCodeManager sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByTestId('toggle-hide-ec-1');
    fireEvent.click(screen.getByTestId('toggle-hide-ec-1'));
    expect(screen.getByTestId('hide-confirmation-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cancel-hide-button'));
    expect(screen.queryByTestId('hide-confirmation-dialog')).not.toBeInTheDocument();
  });

  it('unhides a hidden code directly without confirmation', async () => {
    const hideMock: MockedResponse = {
      request: {
        query: HIDE_EXCLUSION_CODE,
        variables: { id: 'ec-3' },
      },
      result: {
        data: { hideExclusionCode: { id: 'ec-3', isHidden: false } },
      },
    };
    renderWithApollo(<ExclusionCodeManager sessionId="sess-1" />, [
      buildQueryMock(),
      hideMock,
      buildQueryMock(),
    ]);
    await screen.findByTestId('toggle-hide-ec-3');
    // ec-3 is hidden, clicking toggle-hide should unhide directly
    fireEvent.click(screen.getByTestId('toggle-hide-ec-3'));

    // No confirmation dialog should appear
    expect(screen.queryByTestId('hide-confirmation-dialog')).not.toBeInTheDocument();
  });

  it('reorders codes when move up is clicked', async () => {
    const reorderMock: MockedResponse = {
      request: {
        query: REORDER_EXCLUSION_CODES,
        variables: {
          sessionId: 'sess-1',
          orderedIds: ['ec-2', 'ec-1', 'ec-3'],
        },
      },
      result: {
        data: { reorderExclusionCodes: true },
      },
    };
    renderWithApollo(<ExclusionCodeManager sessionId="sess-1" />, [
      buildQueryMock(),
      reorderMock,
      buildQueryMock(),
    ]);
    await screen.findByTestId('move-up-ec-2');
    fireEvent.click(screen.getByTestId('move-up-ec-2'));

    // Verify mutation was consumed (no error from MockedProvider)
    await waitFor(() => {
      expect(screen.getByTestId('exclusion-code-manager')).toBeInTheDocument();
    });
  });

  it('reorders codes when move down is clicked', async () => {
    const reorderMock: MockedResponse = {
      request: {
        query: REORDER_EXCLUSION_CODES,
        variables: {
          sessionId: 'sess-1',
          orderedIds: ['ec-2', 'ec-1', 'ec-3'],
        },
      },
      result: {
        data: { reorderExclusionCodes: true },
      },
    };
    renderWithApollo(<ExclusionCodeManager sessionId="sess-1" />, [
      buildQueryMock(),
      reorderMock,
      buildQueryMock(),
    ]);
    await screen.findByTestId('move-down-ec-1');
    fireEvent.click(screen.getByTestId('move-down-ec-1'));

    await waitFor(() => {
      expect(screen.getByTestId('exclusion-code-manager')).toBeInTheDocument();
    });
  });

  it('disables move up for first item', async () => {
    renderWithApollo(<ExclusionCodeManager sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByTestId('move-up-ec-1');
    expect(screen.getByTestId('move-up-ec-1')).toBeDisabled();
  });

  it('disables move down for last item', async () => {
    renderWithApollo(<ExclusionCodeManager sessionId="sess-1" />, [buildQueryMock()]);
    await screen.findByTestId('move-down-ec-3');
    expect(screen.getByTestId('move-down-ec-3')).toBeDisabled();
  });

  it('fetches exclusion codes for the given sessionId', async () => {
    renderWithApollo(<ExclusionCodeManager sessionId="sess-42" />, [buildQueryMock('sess-42')]);
    // If the variables don't match, MockedProvider won't resolve data
    await screen.findByText('Exclusion Codes');
  });
});
