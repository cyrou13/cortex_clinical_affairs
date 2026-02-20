import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithApollo, type MockedResponse } from '../../../test-utils/apollo-wrapper';
import { EXECUTE_QUERY } from '../graphql/mutations';

import { ExecuteQueryButton } from './ExecuteQueryButton';

describe('ExecuteQueryButton', () => {
  const defaultProps = {
    queryId: 'query-1',
    sessionId: 'sess-1',
    sessionStatus: 'DRAFT',
    hasValidationErrors: false,
    onExecutionStarted: vi.fn(),
  };

  const executeMock: MockedResponse = {
    request: {
      query: EXECUTE_QUERY,
      variables: {
        queryId: 'query-1',
        databases: ['PUBMED'],
        sessionId: 'sess-1',
      },
    },
    result: {
      data: { executeQuery: { taskId: 'task-1', executionIds: ['exec-1'] } },
    },
  };

  const _executeMockMultiDb: MockedResponse = {
    request: {
      query: EXECUTE_QUERY,
      variables: {
        queryId: 'query-1',
        databases: ['PUBMED', 'PMC'],
        sessionId: 'sess-1',
      },
    },
    result: {
      data: { executeQuery: { taskId: 'task-1', executionIds: ['exec-1'] } },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the execute query button', () => {
    renderWithApollo(<ExecuteQueryButton {...defaultProps} />, [executeMock]);

    const button = screen.getByTestId('execute-query-toggle');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Execute Query');
  });

  it('opens database selector on click', () => {
    renderWithApollo(<ExecuteQueryButton {...defaultProps} />, [executeMock]);

    fireEvent.click(screen.getByTestId('execute-query-toggle'));

    expect(screen.getByTestId('database-selector')).toBeInTheDocument();
    expect(screen.getByText('Select databases')).toBeInTheDocument();
  });

  it('has PubMed checked by default', () => {
    renderWithApollo(<ExecuteQueryButton {...defaultProps} />, [executeMock]);

    fireEvent.click(screen.getByTestId('execute-query-toggle'));

    const pubmedCheckbox = screen.getByTestId('db-checkbox-PUBMED') as HTMLInputElement;
    const pmcCheckbox = screen.getByTestId('db-checkbox-PMC') as HTMLInputElement;
    const scholarCheckbox = screen.getByTestId('db-checkbox-GOOGLE_SCHOLAR') as HTMLInputElement;
    const trialsCheckbox = screen.getByTestId('db-checkbox-CLINICAL_TRIALS') as HTMLInputElement;

    expect(pubmedCheckbox.checked).toBe(true);
    expect(pmcCheckbox.checked).toBe(false);
    expect(scholarCheckbox.checked).toBe(false);
    expect(trialsCheckbox.checked).toBe(false);
  });

  it('toggles database checkboxes', () => {
    renderWithApollo(<ExecuteQueryButton {...defaultProps} />, [executeMock]);

    fireEvent.click(screen.getByTestId('execute-query-toggle'));

    const pmcCheckbox = screen.getByTestId('db-checkbox-PMC') as HTMLInputElement;

    fireEvent.click(pmcCheckbox);
    expect(pmcCheckbox.checked).toBe(true);

    fireEvent.click(pmcCheckbox);
    expect(pmcCheckbox.checked).toBe(false);
  });

  it('is disabled when session is LOCKED', () => {
    renderWithApollo(<ExecuteQueryButton {...defaultProps} sessionStatus="LOCKED" />, [
      executeMock,
    ]);

    const button = screen.getByTestId('execute-query-toggle');
    expect(button).toBeDisabled();
  });

  it('is disabled when there are validation errors', () => {
    renderWithApollo(<ExecuteQueryButton {...defaultProps} hasValidationErrors={true} />, [
      executeMock,
    ]);

    const button = screen.getByTestId('execute-query-toggle');
    expect(button).toBeDisabled();
  });

  it('calls onExecutionStarted with task id on success', async () => {
    const onExecutionStarted = vi.fn();

    renderWithApollo(
      <ExecuteQueryButton {...defaultProps} onExecutionStarted={onExecutionStarted} />,
      [executeMock],
    );

    fireEvent.click(screen.getByTestId('execute-query-toggle'));
    fireEvent.click(screen.getByTestId('execute-button'));

    await waitFor(() => {
      expect(onExecutionStarted).toHaveBeenCalledWith('task-1');
    });
  });

  it('shows execute button text with database count', () => {
    renderWithApollo(<ExecuteQueryButton {...defaultProps} />, [executeMock]);

    fireEvent.click(screen.getByTestId('execute-query-toggle'));

    expect(screen.getByTestId('execute-button')).toHaveTextContent('Execute on 1 database');

    // Select additional database
    fireEvent.click(screen.getByTestId('db-checkbox-GOOGLE_SCHOLAR'));

    expect(screen.getByTestId('execute-button')).toHaveTextContent('Execute on 2 databases');
  });

  it('does not open selector when disabled', () => {
    renderWithApollo(<ExecuteQueryButton {...defaultProps} sessionStatus="LOCKED" />, [
      executeMock,
    ]);

    fireEvent.click(screen.getByTestId('execute-query-toggle'));

    expect(screen.queryByTestId('database-selector')).not.toBeInTheDocument();
  });

  it('disables execute button when no databases selected', () => {
    renderWithApollo(<ExecuteQueryButton {...defaultProps} />, [executeMock]);

    fireEvent.click(screen.getByTestId('execute-query-toggle'));

    // Uncheck pubmed (the only checked one)
    fireEvent.click(screen.getByTestId('db-checkbox-PUBMED'));

    expect(screen.getByTestId('execute-button')).toBeDisabled();
  });
});
