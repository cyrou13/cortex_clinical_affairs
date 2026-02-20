import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithApollo, type MockedResponse } from '../../../test-utils/apollo-wrapper';
import { GET_EXCLUSION_CODES } from '../graphql/queries';
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

function buildMocks(sessionId = 'sess-1'): MockedResponse[] {
  return [
    {
      request: {
        query: GET_EXCLUSION_CODES,
        variables: { sessionId },
      },
      result: {
        data: { exclusionCodes: mockCodes },
      },
    },
  ];
}

describe('ExclusionCodeSelector', () => {
  const defaultProps = {
    sessionId: 'sess-1',
    value: null as string | null,
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the selector', async () => {
    renderWithApollo(<ExclusionCodeSelector {...defaultProps} />, buildMocks());
    expect(screen.getByTestId('exclusion-code-selector')).toBeInTheDocument();
    expect(screen.getByTestId('exclusion-code-select')).toBeInTheDocument();
  });

  it('shows the default empty option', async () => {
    renderWithApollo(<ExclusionCodeSelector {...defaultProps} />, buildMocks());
    await screen.findByText('-- No exclusion code --');
  });

  it('only shows visible (non-hidden) codes', async () => {
    renderWithApollo(<ExclusionCodeSelector {...defaultProps} />, buildMocks());
    // ec-1 and ec-2 are visible, ec-3 is hidden
    await screen.findByTestId('option-ec-1');
    expect(screen.getByTestId('option-ec-2')).toBeInTheDocument();
    expect(screen.queryByTestId('option-ec-3')).not.toBeInTheDocument();
  });

  it('shows shortCode + label format', async () => {
    renderWithApollo(<ExclusionCodeSelector {...defaultProps} />, buildMocks());
    await screen.findByTestId('option-ec-1');
    expect(screen.getByTestId('option-ec-1')).toHaveTextContent('E1 - Wrong population');
    expect(screen.getByTestId('option-ec-2')).toHaveTextContent('E2 - Wrong intervention');
  });

  it('sorts options by displayOrder', async () => {
    renderWithApollo(<ExclusionCodeSelector {...defaultProps} />, buildMocks());
    await screen.findByTestId('option-ec-1');
    const select = screen.getByTestId('exclusion-code-select');
    const options = select.querySelectorAll('option');
    // First option is the empty one, then sorted by displayOrder
    // ec-2 has displayOrder 0, ec-1 has displayOrder 1
    expect(options[1]).toHaveTextContent('E2 - Wrong intervention');
    expect(options[2]).toHaveTextContent('E1 - Wrong population');
  });

  it('calls onChange with code id when selected', async () => {
    const onChange = vi.fn();
    renderWithApollo(<ExclusionCodeSelector {...defaultProps} onChange={onChange} />, buildMocks());
    await screen.findByTestId('option-ec-1');

    fireEvent.change(screen.getByTestId('exclusion-code-select'), {
      target: { value: 'ec-1' },
    });

    expect(onChange).toHaveBeenCalledWith('ec-1');
  });

  it('calls onChange with null when empty option is selected', async () => {
    const onChange = vi.fn();
    renderWithApollo(
      <ExclusionCodeSelector {...defaultProps} value="ec-1" onChange={onChange} />,
      buildMocks(),
    );
    await screen.findByTestId('option-ec-1');

    fireEvent.change(screen.getByTestId('exclusion-code-select'), {
      target: { value: '' },
    });

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('shows loading state with disabled select', () => {
    // No mocks = query never resolves = loading state
    renderWithApollo(<ExclusionCodeSelector {...defaultProps} />, []);
    expect(screen.getByTestId('exclusion-code-select')).toBeDisabled();
  });

  it('reflects the current value', async () => {
    renderWithApollo(<ExclusionCodeSelector {...defaultProps} value="ec-1" />, buildMocks());
    await screen.findByTestId('option-ec-1');
    expect(screen.getByTestId('exclusion-code-select')).toHaveValue('ec-1');
  });

  it('has an accessible aria-label', () => {
    renderWithApollo(<ExclusionCodeSelector {...defaultProps} />, buildMocks());
    expect(screen.getByTestId('exclusion-code-select')).toHaveAttribute(
      'aria-label',
      'Select exclusion code',
    );
  });

  it('fetches exclusion codes for the given sessionId', async () => {
    const mocks: MockedResponse[] = [
      {
        request: {
          query: GET_EXCLUSION_CODES,
          variables: { sessionId: 'sess-42' },
        },
        result: {
          data: { exclusionCodes: mockCodes },
        },
      },
    ];
    renderWithApollo(<ExclusionCodeSelector {...defaultProps} sessionId="sess-42" />, mocks);
    // If the query variables are wrong, MockedProvider won't resolve data
    await screen.findByTestId('option-ec-1');
  });
});
