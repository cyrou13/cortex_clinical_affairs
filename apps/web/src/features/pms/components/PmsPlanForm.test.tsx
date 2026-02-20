import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseMutation = vi.fn();
const mockUseQuery = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

import { PmsPlanForm } from './PmsPlanForm';

describe('PmsPlanForm', () => {
  const mockCreate = vi.fn().mockResolvedValue({
    data: {
      createPmsPlan: {
        pmsPlanId: 'plan-1',
        projectId: 'proj-1',
        cerVersionId: 'cer-1',
        status: 'DRAFT',
      },
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([mockCreate, { loading: false }]);
    mockUseQuery.mockReturnValue({
      data: {
        cerVersions: [
          {
            id: 'cer-1',
            versionNumber: 1,
            regulatoryContext: 'CE_MDR',
            status: 'LOCKED',
            lockedAt: '2026-01-01',
          },
          {
            id: 'cer-2',
            versionNumber: 2,
            regulatoryContext: 'FDA_510K',
            status: 'DRAFT',
            lockedAt: null,
          },
        ],
      },
    });
  });

  it('renders form fields', () => {
    render(<PmsPlanForm projectId="proj-1" />);

    expect(screen.getByTestId('cer-version-select')).toBeInTheDocument();
    expect(screen.getByTestId('frequency-select')).toBeInTheDocument();
    expect(screen.getByTestId('submit-btn')).toBeInTheDocument();
  });

  it('submit button disabled when CER not selected', () => {
    render(<PmsPlanForm projectId="proj-1" />);

    expect(screen.getByTestId('submit-btn')).toBeDisabled();
  });

  it('enables submit button when CER selected', () => {
    render(<PmsPlanForm projectId="proj-1" />);

    fireEvent.change(screen.getByTestId('cer-version-select'), {
      target: { value: 'cer-1' },
    });

    expect(screen.getByTestId('submit-btn')).not.toBeDisabled();
  });

  it('renders all frequency options', () => {
    render(<PmsPlanForm projectId="proj-1" />);

    const select = screen.getByTestId('frequency-select');
    const options = select.querySelectorAll('option');

    expect(options.length).toBe(4);
    expect(options[0]).toHaveValue('ANNUAL');
    expect(options[1]).toHaveValue('SEMI_ANNUAL');
    expect(options[2]).toHaveValue('QUARTERLY');
    expect(options[3]).toHaveValue('MONTHLY');
  });

  it('renders data collection method checkboxes', () => {
    render(<PmsPlanForm projectId="proj-1" />);

    expect(screen.getByTestId('method-VIGILANCE_DATABASE')).toBeInTheDocument();
    expect(screen.getByTestId('method-LITERATURE_REVIEW')).toBeInTheDocument();
    expect(screen.getByTestId('method-COMPLAINT_ANALYSIS')).toBeInTheDocument();
  });

  it('calls mutation on submit with correct variables', async () => {
    const onSuccess = vi.fn();
    render(<PmsPlanForm projectId="proj-1" onSuccess={onSuccess} />);

    fireEvent.change(screen.getByTestId('cer-version-select'), {
      target: { value: 'cer-1' },
    });
    fireEvent.change(screen.getByTestId('frequency-select'), {
      target: { value: 'QUARTERLY' },
    });

    fireEvent.click(screen.getByTestId('submit-btn'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        variables: {
          projectId: 'proj-1',
          cerVersionId: 'cer-1',
          updateFrequency: 'QUARTERLY',
          dataCollectionMethods: ['VIGILANCE_DATABASE', 'LITERATURE_REVIEW'],
        },
      });
    });

    expect(onSuccess).toHaveBeenCalledWith('plan-1');
  });

  it('renders cancel button when onCancel provided', () => {
    const onCancel = vi.fn();
    render(<PmsPlanForm projectId="proj-1" onCancel={onCancel} />);

    const cancelBtn = screen.getByTestId('cancel-btn');
    expect(cancelBtn).toBeInTheDocument();

    fireEvent.click(cancelBtn);
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows loading state', () => {
    mockUseMutation.mockReturnValue([mockCreate, { loading: true }]);
    render(<PmsPlanForm projectId="proj-1" />);

    expect(screen.getByTestId('submit-btn')).toHaveTextContent('Creating...');
  });

  it('disables non-locked CER versions in dropdown', () => {
    render(<PmsPlanForm projectId="proj-1" />);

    const select = screen.getByTestId('cer-version-select');
    const options = select.querySelectorAll('option');

    // option 0: placeholder, option 1: cer-1 (LOCKED), option 2: cer-2 (DRAFT)
    expect(options[1]).not.toBeDisabled();
    expect(options[2]).toBeDisabled();
  });
});
