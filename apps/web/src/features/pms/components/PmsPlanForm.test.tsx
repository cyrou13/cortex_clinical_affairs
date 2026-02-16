import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseMutation = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

import { PmsPlanForm } from './PmsPlanForm';

describe('PmsPlanForm', () => {
  const mockCreate = vi.fn().mockResolvedValue({
    data: {
      createPmsPlan: {
        id: 'plan-1',
        name: 'Test Plan',
        frequency: 'ANNUAL',
        status: 'DRAFT',
      },
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([mockCreate, { loading: false }]);
  });

  it('renders form fields', () => {
    render(<PmsPlanForm />);

    expect(screen.getByTestId('plan-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('device-id-input')).toBeInTheDocument();
    expect(screen.getByTestId('frequency-select')).toBeInTheDocument();
    expect(screen.getByTestId('start-date-input')).toBeInTheDocument();
    expect(screen.getByTestId('gap-registry-checkbox')).toBeInTheDocument();
    expect(screen.getByTestId('submit-btn')).toBeInTheDocument();
  });

  it('submit button disabled when fields empty', () => {
    render(<PmsPlanForm />);

    expect(screen.getByTestId('submit-btn')).toBeDisabled();
  });

  it('enables submit button when all required fields filled', () => {
    render(<PmsPlanForm />);

    fireEvent.change(screen.getByTestId('plan-name-input'), {
      target: { value: 'My Plan' },
    });
    fireEvent.change(screen.getByTestId('device-id-input'), {
      target: { value: 'device-1' },
    });
    fireEvent.change(screen.getByTestId('start-date-input'), {
      target: { value: '2026-03-01' },
    });

    expect(screen.getByTestId('submit-btn')).not.toBeDisabled();
  });

  it('renders all frequency options', () => {
    render(<PmsPlanForm />);

    const select = screen.getByTestId('frequency-select');
    const options = select.querySelectorAll('option');

    expect(options.length).toBe(4);
    expect(options[0]).toHaveValue('ANNUAL');
    expect(options[1]).toHaveValue('SEMI_ANNUAL');
    expect(options[2]).toHaveValue('QUARTERLY');
    expect(options[3]).toHaveValue('MONTHLY');
  });

  it('gap registry enabled by default', () => {
    render(<PmsPlanForm />);

    expect(screen.getByTestId('gap-registry-checkbox')).toBeChecked();
    expect(screen.getByTestId('gap-threshold-input')).toBeInTheDocument();
  });

  it('hides gap threshold when disabled', () => {
    render(<PmsPlanForm />);

    fireEvent.click(screen.getByTestId('gap-registry-checkbox'));

    expect(screen.getByTestId('gap-registry-checkbox')).not.toBeChecked();
    expect(screen.queryByTestId('gap-threshold-input')).not.toBeInTheDocument();
  });

  it('calls mutation on submit', async () => {
    const onSuccess = vi.fn();
    render(<PmsPlanForm onSuccess={onSuccess} />);

    fireEvent.change(screen.getByTestId('plan-name-input'), {
      target: { value: 'My Plan' },
    });
    fireEvent.change(screen.getByTestId('device-id-input'), {
      target: { value: 'device-1' },
    });
    fireEvent.change(screen.getByTestId('frequency-select'), {
      target: { value: 'QUARTERLY' },
    });
    fireEvent.change(screen.getByTestId('start-date-input'), {
      target: { value: '2026-03-01' },
    });
    fireEvent.change(screen.getByTestId('gap-threshold-input'), {
      target: { value: '15' },
    });

    fireEvent.click(screen.getByTestId('submit-btn'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        variables: {
          input: {
            name: 'My Plan',
            deviceId: 'device-1',
            frequency: 'QUARTERLY',
            startDate: '2026-03-01',
            gapRegistryConfig: {
              enabled: true,
              threshold: 15,
            },
          },
        },
      });
    });

    expect(onSuccess).toHaveBeenCalledWith('plan-1');
  });

  it('renders cancel button when onCancel provided', () => {
    const onCancel = vi.fn();
    render(<PmsPlanForm onCancel={onCancel} />);

    const cancelBtn = screen.getByTestId('cancel-btn');
    expect(cancelBtn).toBeInTheDocument();

    fireEvent.click(cancelBtn);
    expect(onCancel).toHaveBeenCalled();
  });

  it('pre-fills device id when provided', () => {
    render(<PmsPlanForm deviceId="device-123" />);

    expect(screen.getByTestId('device-id-input')).toHaveValue('device-123');
  });

  it('shows loading state', () => {
    mockUseMutation.mockReturnValue([mockCreate, { loading: true }]);
    render(<PmsPlanForm />);

    fireEvent.change(screen.getByTestId('plan-name-input'), {
      target: { value: 'My Plan' },
    });

    expect(screen.getByTestId('submit-btn')).toHaveTextContent('Creating...');
    expect(screen.getByTestId('submit-btn')).toBeDisabled();
  });
});
