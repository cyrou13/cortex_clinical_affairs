import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseMutation = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

import { ValidationStudyForm } from './ValidationStudyForm';

describe('ValidationStudyForm', () => {
  const mockCreate = vi.fn().mockResolvedValue({
    data: {
      createValidationStudy: {
        id: 'study-1',
        name: 'Test Study',
        type: 'STANDALONE',
        status: 'DRAFT',
      },
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([mockCreate, { loading: false }]);
  });

  it('renders form fields', () => {
    render(<ValidationStudyForm />);

    expect(screen.getByTestId('study-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('study-type-select')).toBeInTheDocument();
    expect(screen.getByTestId('study-description-input')).toBeInTheDocument();
    expect(screen.getByTestId('soa-link-input')).toBeInTheDocument();
    expect(screen.getByTestId('submit-btn')).toBeInTheDocument();
  });

  it('submit button disabled when name empty', () => {
    render(<ValidationStudyForm />);

    expect(screen.getByTestId('submit-btn')).toBeDisabled();
  });

  it('enables submit button when name provided', () => {
    render(<ValidationStudyForm />);

    fireEvent.change(screen.getByTestId('study-name-input'), {
      target: { value: 'My Study' },
    });

    expect(screen.getByTestId('submit-btn')).not.toBeDisabled();
  });

  it('renders all study type options', () => {
    render(<ValidationStudyForm />);

    const select = screen.getByTestId('study-type-select');
    expect(select).toBeInTheDocument();

    const options = select.querySelectorAll('option');
    expect(options.length).toBe(6);
    expect(options[0]).toHaveValue('STANDALONE');
    expect(options[1]).toHaveValue('EQUIVALENCE');
    expect(options[2]).toHaveValue('MRMC');
  });

  it('calls mutation on submit', async () => {
    const onSuccess = vi.fn();
    render(<ValidationStudyForm onSuccess={onSuccess} />);

    fireEvent.change(screen.getByTestId('study-name-input'), {
      target: { value: 'My Study' },
    });
    fireEvent.change(screen.getByTestId('study-type-select'), {
      target: { value: 'EQUIVALENCE' },
    });
    fireEvent.change(screen.getByTestId('study-description-input'), {
      target: { value: 'Study description' },
    });
    fireEvent.change(screen.getByTestId('soa-link-input'), {
      target: { value: 'soa-123' },
    });

    fireEvent.click(screen.getByTestId('submit-btn'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        variables: {
          input: {
            name: 'My Study',
            type: 'EQUIVALENCE',
            description: 'Study description',
            soaAnalysisId: 'soa-123',
          },
        },
      });
    });

    expect(onSuccess).toHaveBeenCalledWith('study-1');
  });

  it('renders cancel button when onCancel provided', () => {
    const onCancel = vi.fn();
    render(<ValidationStudyForm onCancel={onCancel} />);

    const cancelBtn = screen.getByTestId('cancel-btn');
    expect(cancelBtn).toBeInTheDocument();

    fireEvent.click(cancelBtn);
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows loading state', () => {
    mockUseMutation.mockReturnValue([mockCreate, { loading: true }]);
    render(<ValidationStudyForm />);

    fireEvent.change(screen.getByTestId('study-name-input'), {
      target: { value: 'My Study' },
    });

    expect(screen.getByTestId('submit-btn')).toHaveTextContent('Creating...');
    expect(screen.getByTestId('submit-btn')).toBeDisabled();
  });
});
