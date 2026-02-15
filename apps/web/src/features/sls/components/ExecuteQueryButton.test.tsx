import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseMutation = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

import { ExecuteQueryButton } from './ExecuteQueryButton';

describe('ExecuteQueryButton', () => {
  const defaultProps = {
    queryId: 'query-1',
    sessionId: 'sess-1',
    sessionStatus: 'DRAFT',
    hasValidationErrors: false,
    onExecutionStarted: vi.fn(),
  };

  let executeMutationFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    executeMutationFn = vi.fn().mockResolvedValue({
      data: { executeQuery: { id: 'exec-1', status: 'RUNNING' } },
    });
    mockUseMutation.mockReturnValue([executeMutationFn, { loading: false }]);
  });

  it('renders the execute query button', () => {
    render(<ExecuteQueryButton {...defaultProps} />);

    const button = screen.getByTestId('execute-query-toggle');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Execute Query');
  });

  it('opens database selector on click', () => {
    render(<ExecuteQueryButton {...defaultProps} />);

    fireEvent.click(screen.getByTestId('execute-query-toggle'));

    expect(screen.getByTestId('database-selector')).toBeInTheDocument();
    expect(screen.getByText('Select databases')).toBeInTheDocument();
  });

  it('has PubMed checked by default', () => {
    render(<ExecuteQueryButton {...defaultProps} />);

    fireEvent.click(screen.getByTestId('execute-query-toggle'));

    const pubmedCheckbox = screen.getByTestId(
      'db-checkbox-pubmed',
    ) as HTMLInputElement;
    const cochraneCheckbox = screen.getByTestId(
      'db-checkbox-cochrane',
    ) as HTMLInputElement;
    const embaseCheckbox = screen.getByTestId(
      'db-checkbox-embase',
    ) as HTMLInputElement;

    expect(pubmedCheckbox.checked).toBe(true);
    expect(cochraneCheckbox.checked).toBe(false);
    expect(embaseCheckbox.checked).toBe(false);
  });

  it('toggles database checkboxes', () => {
    render(<ExecuteQueryButton {...defaultProps} />);

    fireEvent.click(screen.getByTestId('execute-query-toggle'));

    const cochraneCheckbox = screen.getByTestId(
      'db-checkbox-cochrane',
    ) as HTMLInputElement;

    // Check cochrane
    fireEvent.click(cochraneCheckbox);
    expect(cochraneCheckbox.checked).toBe(true);

    // Uncheck cochrane
    fireEvent.click(cochraneCheckbox);
    expect(cochraneCheckbox.checked).toBe(false);
  });

  it('is disabled when session is LOCKED', () => {
    render(
      <ExecuteQueryButton {...defaultProps} sessionStatus="LOCKED" />,
    );

    const button = screen.getByTestId('execute-query-toggle');
    expect(button).toBeDisabled();
  });

  it('is disabled when there are validation errors', () => {
    render(
      <ExecuteQueryButton {...defaultProps} hasValidationErrors={true} />,
    );

    const button = screen.getByTestId('execute-query-toggle');
    expect(button).toBeDisabled();
  });

  it('is disabled during loading', () => {
    mockUseMutation.mockReturnValue([executeMutationFn, { loading: true }]);

    render(<ExecuteQueryButton {...defaultProps} />);

    const button = screen.getByTestId('execute-query-toggle');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Executing...');
  });

  it('calls execute mutation with selected databases', async () => {
    render(<ExecuteQueryButton {...defaultProps} />);

    // Open selector
    fireEvent.click(screen.getByTestId('execute-query-toggle'));

    // Also select cochrane
    fireEvent.click(screen.getByTestId('db-checkbox-cochrane'));

    // Execute
    fireEvent.click(screen.getByTestId('execute-button'));

    await waitFor(() => {
      expect(executeMutationFn).toHaveBeenCalledWith({
        variables: {
          queryId: 'query-1',
          databases: ['pubmed', 'cochrane'],
        },
      });
    });
  });

  it('calls onExecutionStarted with execution id on success', async () => {
    const onExecutionStarted = vi.fn();

    render(
      <ExecuteQueryButton
        {...defaultProps}
        onExecutionStarted={onExecutionStarted}
      />,
    );

    fireEvent.click(screen.getByTestId('execute-query-toggle'));
    fireEvent.click(screen.getByTestId('execute-button'));

    await waitFor(() => {
      expect(onExecutionStarted).toHaveBeenCalledWith('exec-1');
    });
  });

  it('shows execute button text with database count', () => {
    render(<ExecuteQueryButton {...defaultProps} />);

    fireEvent.click(screen.getByTestId('execute-query-toggle'));

    expect(screen.getByTestId('execute-button')).toHaveTextContent(
      'Execute on 1 database',
    );

    // Select additional database
    fireEvent.click(screen.getByTestId('db-checkbox-embase'));

    expect(screen.getByTestId('execute-button')).toHaveTextContent(
      'Execute on 2 databases',
    );
  });

  it('does not open selector when disabled', () => {
    render(
      <ExecuteQueryButton {...defaultProps} sessionStatus="LOCKED" />,
    );

    fireEvent.click(screen.getByTestId('execute-query-toggle'));

    expect(screen.queryByTestId('database-selector')).not.toBeInTheDocument();
  });

  it('disables execute button when no databases selected', () => {
    render(<ExecuteQueryButton {...defaultProps} />);

    fireEvent.click(screen.getByTestId('execute-query-toggle'));

    // Uncheck pubmed (the only checked one)
    fireEvent.click(screen.getByTestId('db-checkbox-pubmed'));

    expect(screen.getByTestId('execute-button')).toBeDisabled();
  });
});
