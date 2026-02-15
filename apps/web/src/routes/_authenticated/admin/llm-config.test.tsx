import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn().mockReturnValue([vi.fn(), { loading: false }]);

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

import AdminLlmConfigPage from './llm-config';

describe('AdminLlmConfigPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: null,
      loading: false,
      refetch: vi.fn(),
    });
  });

  it('renders the AI Configuration panel', () => {
    render(<AdminLlmConfigPage />);
    expect(screen.getAllByText('AI Configuration').length).toBeGreaterThanOrEqual(1);
  });

  it('renders breadcrumb navigation', () => {
    render(<AdminLlmConfigPage />);
    expect(screen.getByLabelText('Breadcrumb')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('renders the LlmConfigPanel component', () => {
    render(<AdminLlmConfigPage />);
    expect(screen.getByTestId('llm-config-panel')).toBeInTheDocument();
  });

  it('renders within max-width container', () => {
    const { container } = render(<AdminLlmConfigPage />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain('max-w-6xl');
  });
});
