import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseMutation = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

import { TemplateEditor } from './TemplateEditor';

describe('TemplateEditor', () => {
  const mockSave = vi.fn();
  const mockCancel = vi.fn();
  const mockCreateMutation = vi
    .fn()
    .mockResolvedValue({ data: { createGridTemplate: { templateId: 'tpl-1', columnCount: 2 } } });
  const mockUpdateMutation = vi.fn().mockResolvedValue({ data: {} });

  beforeEach(() => {
    vi.clearAllMocks();
    let callIndex = 0;
    mockUseMutation.mockImplementation(() => {
      const result =
        callIndex === 0
          ? [mockCreateMutation, { loading: false }]
          : [mockUpdateMutation, { loading: false }];
      callIndex++;
      return result;
    });
  });

  it('renders in create mode with default columns', () => {
    render(<TemplateEditor mode="create" onSave={mockSave} onCancel={mockCancel} />);
    expect(screen.getByTestId('template-editor')).toBeInTheDocument();
    expect(screen.getByTestId('template-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('template-soa-type')).toBeInTheDocument();
    expect(screen.getByTestId('template-columns')).toBeInTheDocument();
  });

  it('renders with initial data in edit mode', () => {
    render(
      <TemplateEditor
        mode="edit"
        initialData={{
          id: 'tpl-1',
          name: 'Test Template',
          soaType: 'CLINICAL',
          description: 'Test description',
          columns: [
            {
              name: 'col1',
              displayName: 'Column 1',
              dataType: 'TEXT',
              isRequired: true,
              orderIndex: 0,
            },
          ],
        }}
        onSave={mockSave}
        onCancel={mockCancel}
      />,
    );
    expect(screen.getByTestId('template-name-input')).toHaveValue('Test Template');
    expect(screen.getByTestId('template-description')).toHaveValue('Test description');
  });

  it('adds a column when Add Column is clicked', () => {
    render(<TemplateEditor mode="create" onSave={mockSave} onCancel={mockCancel} />);
    const initialCount = screen.getAllByTestId(/^template-col-/).length;
    fireEvent.click(screen.getByTestId('add-template-column'));
    expect(screen.getAllByTestId(/^template-col-/).length).toBe(initialCount + 1);
  });

  it('removes a column when remove is clicked', () => {
    render(<TemplateEditor mode="create" onSave={mockSave} onCancel={mockCancel} />);
    const initialCount = screen.getAllByTestId(/^template-col-/).length;
    fireEvent.click(screen.getByTestId('remove-template-col-0'));
    expect(screen.getAllByTestId(/^template-col-/).length).toBe(initialCount - 1);
  });

  it('calls onCancel when Cancel is clicked', () => {
    render(<TemplateEditor mode="create" onSave={mockSave} onCancel={mockCancel} />);
    fireEvent.click(screen.getByTestId('template-cancel-btn'));
    expect(mockCancel).toHaveBeenCalled();
  });

  it('calls onCancel via close button', () => {
    render(<TemplateEditor mode="create" onSave={mockSave} onCancel={mockCancel} />);
    fireEvent.click(screen.getByTestId('template-editor-close'));
    expect(mockCancel).toHaveBeenCalled();
  });

  it('disables save when name is empty', () => {
    render(<TemplateEditor mode="create" onSave={mockSave} onCancel={mockCancel} />);
    const saveBtn = screen.getByTestId('template-save-btn');
    expect(saveBtn).toBeDisabled();
  });
});
