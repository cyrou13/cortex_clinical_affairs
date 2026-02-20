import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

import { TemplateSelector } from './TemplateSelector';

const mockTemplates = [
  {
    id: 'tpl-clinical-default',
    name: 'Clinical SOA — Default',
    soaType: 'CLINICAL',
    description: 'Standard clinical template',
    isBuiltIn: true,
    columns: [
      { name: 'author', displayName: 'Author', dataType: 'TEXT', isRequired: true, orderIndex: 0 },
      { name: 'year', displayName: 'Year', dataType: 'NUMERIC', isRequired: true, orderIndex: 1 },
    ],
  },
  {
    id: 'custom-1',
    name: 'My Custom Template',
    soaType: 'CLINICAL',
    description: 'Custom desc',
    isBuiltIn: false,
    columns: [
      { name: 'col1', displayName: 'Column 1', dataType: 'TEXT', isRequired: false, orderIndex: 0 },
    ],
  },
];

describe('TemplateSelector', () => {
  const mockSelectTemplate = vi.fn();
  const mockStartEmpty = vi.fn();
  const mockCreateNew = vi.fn();
  const mockDuplicate = vi.fn();
  const mockEdit = vi.fn();
  const mockDeleteMutation = vi.fn().mockResolvedValue({ data: {} });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: { gridTemplates: mockTemplates },
      loading: false,
      refetch: vi.fn(),
    });
    mockUseMutation.mockReturnValue([mockDeleteMutation, { loading: false }]);
  });

  it('renders template list', () => {
    render(
      <TemplateSelector
        soaType="CLINICAL"
        onSelectTemplate={mockSelectTemplate}
        onStartEmpty={mockStartEmpty}
        onCreateNew={mockCreateNew}
        onDuplicate={mockDuplicate}
        onEdit={mockEdit}
      />,
    );
    expect(screen.getByTestId('template-list')).toBeInTheDocument();
    expect(screen.getByTestId('template-item-tpl-clinical-default')).toBeInTheDocument();
    expect(screen.getByTestId('template-item-custom-1')).toBeInTheDocument();
  });

  it('shows built-in and custom badges', () => {
    render(
      <TemplateSelector
        soaType="CLINICAL"
        onSelectTemplate={mockSelectTemplate}
        onStartEmpty={mockStartEmpty}
        onCreateNew={mockCreateNew}
        onDuplicate={mockDuplicate}
        onEdit={mockEdit}
      />,
    );
    expect(screen.getByTestId('badge-tpl-clinical-default')).toHaveTextContent('Built-in');
    expect(screen.getByTestId('badge-custom-1')).toHaveTextContent('Custom');
  });

  it('calls onSelectTemplate when Use is clicked', () => {
    render(
      <TemplateSelector
        soaType="CLINICAL"
        onSelectTemplate={mockSelectTemplate}
        onStartEmpty={mockStartEmpty}
        onCreateNew={mockCreateNew}
        onDuplicate={mockDuplicate}
        onEdit={mockEdit}
      />,
    );
    fireEvent.click(screen.getByTestId('use-tpl-clinical-default'));
    expect(mockSelectTemplate).toHaveBeenCalledWith('tpl-clinical-default');
  });

  it('calls onDuplicate when Duplicate is clicked', () => {
    render(
      <TemplateSelector
        soaType="CLINICAL"
        onSelectTemplate={mockSelectTemplate}
        onStartEmpty={mockStartEmpty}
        onCreateNew={mockCreateNew}
        onDuplicate={mockDuplicate}
        onEdit={mockEdit}
      />,
    );
    fireEvent.click(screen.getByTestId('duplicate-tpl-clinical-default'));
    expect(mockDuplicate).toHaveBeenCalledWith(mockTemplates[0]);
  });

  it('shows edit/delete buttons only for custom templates', () => {
    render(
      <TemplateSelector
        soaType="CLINICAL"
        onSelectTemplate={mockSelectTemplate}
        onStartEmpty={mockStartEmpty}
        onCreateNew={mockCreateNew}
        onDuplicate={mockDuplicate}
        onEdit={mockEdit}
      />,
    );
    // Custom has edit & delete
    expect(screen.getByTestId('edit-custom-1')).toBeInTheDocument();
    expect(screen.getByTestId('delete-custom-1')).toBeInTheDocument();
    // Built-in does not
    expect(screen.queryByTestId('edit-tpl-clinical-default')).not.toBeInTheDocument();
    expect(screen.queryByTestId('delete-tpl-clinical-default')).not.toBeInTheDocument();
  });

  it('expands column preview on click', () => {
    render(
      <TemplateSelector
        soaType="CLINICAL"
        onSelectTemplate={mockSelectTemplate}
        onStartEmpty={mockStartEmpty}
        onCreateNew={mockCreateNew}
        onDuplicate={mockDuplicate}
        onEdit={mockEdit}
      />,
    );
    expect(screen.queryByTestId('columns-preview-tpl-clinical-default')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('expand-tpl-clinical-default'));
    expect(screen.getByTestId('columns-preview-tpl-clinical-default')).toBeInTheDocument();
  });

  it('shows delete confirmation', () => {
    render(
      <TemplateSelector
        soaType="CLINICAL"
        onSelectTemplate={mockSelectTemplate}
        onStartEmpty={mockStartEmpty}
        onCreateNew={mockCreateNew}
        onDuplicate={mockDuplicate}
        onEdit={mockEdit}
      />,
    );
    fireEvent.click(screen.getByTestId('delete-custom-1'));
    expect(screen.getByTestId('confirm-delete-custom-1')).toBeInTheDocument();
  });

  it('shows start empty and create custom buttons', () => {
    render(
      <TemplateSelector
        soaType="CLINICAL"
        onSelectTemplate={mockSelectTemplate}
        onStartEmpty={mockStartEmpty}
        onCreateNew={mockCreateNew}
        onDuplicate={mockDuplicate}
        onEdit={mockEdit}
      />,
    );
    expect(screen.getByTestId('start-empty-btn')).toBeInTheDocument();
    expect(screen.getByTestId('create-custom-btn')).toBeInTheDocument();
  });
});
