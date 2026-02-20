import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithApollo } from '../../../test-utils/apollo-wrapper';

import { QueryBuilder } from './QueryBuilder';

describe('QueryBuilder', () => {
  const defaultProps = {
    sessionId: 'sess-1',
    onSave: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders query name input and query string textarea', () => {
    renderWithApollo(<QueryBuilder {...defaultProps} />);

    expect(screen.getByTestId('query-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('query-string-input')).toBeInTheDocument();
    expect(screen.getByLabelText('Query Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Boolean Query')).toBeInTheDocument();
  });

  it('renders save and cancel buttons', () => {
    renderWithApollo(<QueryBuilder {...defaultProps} />);

    expect(screen.getByTestId('save-button')).toBeInTheDocument();
    expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
    expect(screen.getByTestId('save-button')).toHaveTextContent('Save Query');
  });

  it('shows "Update Query" when editing existing query', () => {
    const query = {
      id: 'q-1',
      name: 'Test Query',
      queryString: 'cancer AND treatment',
      version: 1,
    };
    renderWithApollo(<QueryBuilder {...defaultProps} query={query} />);

    expect(screen.getByTestId('save-button')).toHaveTextContent('Update Query');
  });

  it('populates fields when editing existing query', () => {
    const query = {
      id: 'q-1',
      name: 'Test Query',
      queryString: 'cancer AND treatment',
      version: 1,
    };
    renderWithApollo(<QueryBuilder {...defaultProps} query={query} />);

    expect(screen.getByTestId('query-name-input')).toHaveValue('Test Query');
    expect(screen.getByTestId('query-string-input')).toHaveValue('cancer AND treatment');
  });

  it('displays validation errors for invalid query', () => {
    renderWithApollo(<QueryBuilder {...defaultProps} />);

    fireEvent.change(screen.getByTestId('query-string-input'), {
      target: { value: '(cancer AND treatment' },
    });

    expect(screen.getByTestId('validation-errors')).toBeInTheDocument();
    expect(screen.getByText('Unmatched opening parenthesis')).toBeInTheDocument();
  });

  it('shows syntax preview for valid query', () => {
    renderWithApollo(<QueryBuilder {...defaultProps} />);

    fireEvent.change(screen.getByTestId('query-string-input'), {
      target: { value: 'cancer AND treatment' },
    });

    expect(screen.getByTestId('syntax-preview')).toBeInTheDocument();
  });

  it('does not show syntax preview when query is empty', () => {
    renderWithApollo(<QueryBuilder {...defaultProps} />);

    expect(screen.queryByTestId('syntax-preview')).not.toBeInTheDocument();
  });

  it('does not show syntax preview when query is invalid', () => {
    renderWithApollo(<QueryBuilder {...defaultProps} />);

    fireEvent.change(screen.getByTestId('query-string-input'), {
      target: { value: '(cancer AND' },
    });

    expect(screen.queryByTestId('syntax-preview')).not.toBeInTheDocument();
  });

  it('applies red border when query has errors', () => {
    renderWithApollo(<QueryBuilder {...defaultProps} />);

    fireEvent.change(screen.getByTestId('query-string-input'), {
      target: { value: '(cancer AND treatment' },
    });

    const textarea = screen.getByTestId('query-string-input');
    expect(textarea.className).toContain('border-red-500');
  });

  it('calls onSave with name and queryString', () => {
    const onSave = vi.fn();
    renderWithApollo(<QueryBuilder {...defaultProps} onSave={onSave} />);

    fireEvent.change(screen.getByTestId('query-name-input'), {
      target: { value: 'My Query' },
    });
    fireEvent.change(screen.getByTestId('query-string-input'), {
      target: { value: 'cancer AND treatment' },
    });

    fireEvent.click(screen.getByTestId('save-button'));

    expect(onSave).toHaveBeenCalledWith({
      name: 'My Query',
      queryString: 'cancer AND treatment',
    });
  });

  it('does not call onSave when name is empty', () => {
    const onSave = vi.fn();
    renderWithApollo(<QueryBuilder {...defaultProps} onSave={onSave} />);

    fireEvent.change(screen.getByTestId('query-string-input'), {
      target: { value: 'cancer AND treatment' },
    });

    fireEvent.click(screen.getByTestId('save-button'));

    expect(onSave).not.toHaveBeenCalled();
  });

  it('does not call onSave when query is invalid', () => {
    const onSave = vi.fn();
    renderWithApollo(<QueryBuilder {...defaultProps} onSave={onSave} />);

    fireEvent.change(screen.getByTestId('query-name-input'), {
      target: { value: 'My Query' },
    });
    fireEvent.change(screen.getByTestId('query-string-input'), {
      target: { value: '(cancer AND treatment' },
    });

    fireEvent.click(screen.getByTestId('save-button'));

    expect(onSave).not.toHaveBeenCalled();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    renderWithApollo(<QueryBuilder {...defaultProps} onCancel={onCancel} />);

    fireEvent.click(screen.getByTestId('cancel-button'));

    expect(onCancel).toHaveBeenCalled();
  });

  it('save button is disabled when form is incomplete', () => {
    renderWithApollo(<QueryBuilder {...defaultProps} />);

    expect(screen.getByTestId('save-button')).toBeDisabled();
  });
});
