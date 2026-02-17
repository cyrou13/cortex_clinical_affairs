import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockCreateSession = vi.fn();
const mockUseMutation = vi.fn().mockReturnValue([mockCreateSession, { loading: false }]);
const mockUseQuery = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

import { SessionCreateForm } from './SessionCreateForm';

describe('SessionCreateForm', () => {
  const defaultProps = {
    projectId: 'proj-1',
    onCreated: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([mockCreateSession, { loading: false }]);
  });

  it('shows type selector with 5 session types', () => {
    render(<SessionCreateForm {...defaultProps} />);

    expect(screen.getByText('SOA Clinical')).toBeInTheDocument();
    expect(screen.getByText('SOA Device')).toBeInTheDocument();
    expect(screen.getByText('Similar Device')).toBeInTheDocument();
    expect(screen.getByText('PMS Update')).toBeInTheDocument();
    expect(screen.getByText('Ad Hoc')).toBeInTheDocument();
  });

  it('shows SOA Clinical scope fields when SOA_CLINICAL is selected', async () => {
    render(<SessionCreateForm {...defaultProps} />);

    await act(async () => {
      fireEvent.click(screen.getByText('SOA Clinical'));
    });

    expect(screen.getByLabelText('Indication')).toBeInTheDocument();
    expect(screen.getByLabelText('Population')).toBeInTheDocument();
    expect(screen.getByLabelText('Intervention')).toBeInTheDocument();
    expect(screen.getByLabelText('Comparator')).toBeInTheDocument();
    expect(screen.getByLabelText('Outcomes')).toBeInTheDocument();
  });

  it('shows SOA Device scope fields when SOA_DEVICE is selected', async () => {
    render(<SessionCreateForm {...defaultProps} />);

    await act(async () => {
      fireEvent.click(screen.getByText('SOA Device'));
    });

    expect(screen.getByLabelText('Device Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Device Class')).toBeInTheDocument();
    expect(screen.getByLabelText('Intended Purpose')).toBeInTheDocument();
    expect(screen.getByLabelText('Key Performance Endpoints')).toBeInTheDocument();
  });

  it('shows Similar Device scope fields when SIMILAR_DEVICE is selected', async () => {
    render(<SessionCreateForm {...defaultProps} />);

    await act(async () => {
      fireEvent.click(screen.getByText('Similar Device'));
    });

    expect(screen.getByLabelText('Device Category')).toBeInTheDocument();
    expect(screen.getByLabelText('Equivalence Criteria')).toBeInTheDocument();
    expect(screen.getByLabelText('Search Databases')).toBeInTheDocument();
  });

  it('shows PMS Update scope fields when PMS_UPDATE is selected', async () => {
    render(<SessionCreateForm {...defaultProps} />);

    await act(async () => {
      fireEvent.click(screen.getByText('PMS Update'));
    });

    expect(screen.getByLabelText('Date Range')).toBeInTheDocument();
    expect(screen.getByLabelText('Update Scope')).toBeInTheDocument();
    expect(screen.getByLabelText('Previous SLS Reference')).toBeInTheDocument();
  });

  it('shows Ad Hoc scope fields when AD_HOC is selected', async () => {
    render(<SessionCreateForm {...defaultProps} />);

    await act(async () => {
      fireEvent.click(screen.getByText('Ad Hoc'));
    });

    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Search Objective')).toBeInTheDocument();
  });

  it('changes scope fields when type selection changes', async () => {
    render(<SessionCreateForm {...defaultProps} />);

    // Select SOA Clinical first
    await act(async () => {
      fireEvent.click(screen.getByText('SOA Clinical'));
    });
    expect(screen.getByLabelText('Indication')).toBeInTheDocument();

    // Switch to Ad Hoc
    await act(async () => {
      fireEvent.click(screen.getByText('Ad Hoc'));
    });
    expect(screen.queryByLabelText('Indication')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
  });

  it('shows validation errors when submitting empty form', async () => {
    render(<SessionCreateForm {...defaultProps} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('create-button'));
    });

    expect(screen.getByText('Session name must be at least 3 characters')).toBeInTheDocument();
    expect(screen.getByText('Please select a session type')).toBeInTheDocument();
  });

  it('shows validation error for short name', async () => {
    render(<SessionCreateForm {...defaultProps} />);

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Session Name'), {
        target: { value: 'AB' },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('create-button'));
    });

    expect(screen.getByText('Session name must be at least 3 characters')).toBeInTheDocument();
  });

  it('calls createSession mutation on valid submit', async () => {
    mockCreateSession.mockResolvedValue({
      data: {
        createSlsSession: { id: 'new-sess-1', name: 'Test', type: 'AD_HOC', status: 'DRAFT' },
      },
    });

    render(<SessionCreateForm {...defaultProps} />);

    // Fill in name
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Session Name'), {
        target: { value: 'Test Session' },
      });
    });

    // Select type
    await act(async () => {
      fireEvent.click(screen.getByText('Ad Hoc'));
    });

    // Submit
    await act(async () => {
      fireEvent.click(screen.getByTestId('create-button'));
    });

    expect(mockCreateSession).toHaveBeenCalledWith({
      variables: {
        projectId: 'proj-1',
        name: 'Test Session',
        type: 'AD_HOC',
        scopeFields: undefined,
      },
    });
  });

  it('calls onCreated with session id after successful creation', async () => {
    const onCreated = vi.fn();
    mockCreateSession.mockResolvedValue({
      data: {
        createSlsSession: { id: 'new-sess-1', name: 'Test', type: 'AD_HOC', status: 'DRAFT' },
      },
    });

    render(<SessionCreateForm {...defaultProps} onCreated={onCreated} />);

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Session Name'), {
        target: { value: 'Test Session' },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Ad Hoc'));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('create-button'));
    });

    expect(onCreated).toHaveBeenCalledWith('new-sess-1');
  });

  it('calls onCancel when Cancel button is clicked', () => {
    render(<SessionCreateForm {...defaultProps} />);

    fireEvent.click(screen.getByTestId('cancel-button'));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('calls onCancel when close (X) button is clicked', () => {
    render(<SessionCreateForm {...defaultProps} />);

    fireEvent.click(screen.getByTestId('close-button'));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('clears type validation error when a type is selected', async () => {
    render(<SessionCreateForm {...defaultProps} />);

    // Trigger validation
    await act(async () => {
      fireEvent.click(screen.getByTestId('create-button'));
    });

    expect(screen.getByText('Please select a session type')).toBeInTheDocument();

    // Select a type
    await act(async () => {
      fireEvent.click(screen.getByText('Ad Hoc'));
    });

    expect(screen.queryByText('Please select a session type')).not.toBeInTheDocument();
  });
});
