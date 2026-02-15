import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge, type StatusVariant } from './StatusBadge';

const variants: StatusVariant[] = [
  'draft',
  'screening',
  'uncertain',
  'include',
  'exclude',
  'locked',
  'completed',
];

describe('StatusBadge', () => {
  it.each(variants)('renders %s variant with correct role', (variant) => {
    render(<StatusBadge variant={variant} />);
    const badge = screen.getByRole('status');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('data-variant', variant);
  });

  it('renders all 7 variants', () => {
    const { container } = render(
      <div>
        {variants.map((v) => (
          <StatusBadge key={v} variant={v} />
        ))}
      </div>,
    );
    const badges = container.querySelectorAll('[role="status"]');
    expect(badges).toHaveLength(7);
  });

  it('uses custom label when provided', () => {
    render(<StatusBadge variant="draft" label="Custom Label" />);
    expect(screen.getByText('Custom Label')).toBeInTheDocument();
  });

  it('uses default label when none provided', () => {
    render(<StatusBadge variant="draft" />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });
});
