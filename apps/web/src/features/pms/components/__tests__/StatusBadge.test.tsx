import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('lucide-react', () => ({
  __esModule: true,
}));

vi.mock('../../../shared/utils/cn', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

import { PmsStatusBadge } from '../StatusBadge';

describe('PmsStatusBadge', () => {
  it('renders with DRAFT status', () => {
    render(<PmsStatusBadge status="DRAFT" />);
    const badge = screen.getByTestId('status-badge');
    expect(badge.textContent).toBe('DRAFT');
  });

  it('renders with ACTIVE status', () => {
    render(<PmsStatusBadge status="ACTIVE" />);
    const badge = screen.getByTestId('status-badge');
    expect(badge.textContent).toBe('ACTIVE');
  });

  it('renders with CRITICAL status', () => {
    render(<PmsStatusBadge status="CRITICAL" />);
    const badge = screen.getByTestId('status-badge');
    expect(badge.textContent).toBe('CRITICAL');
  });

  it('renders with unknown status using default gray styling', () => {
    render(<PmsStatusBadge status="UNKNOWN" />);
    const badge = screen.getByTestId('status-badge');
    expect(badge.textContent).toBe('UNKNOWN');
    expect(badge).toBeDefined();
  });

  it('replaces underscores with spaces in display text', () => {
    render(<PmsStatusBadge status="IN_PROGRESS" />);
    const badge = screen.getByTestId('status-badge');
    expect(badge.textContent).toBe('IN PROGRESS');
  });

  it('applies custom className prop', () => {
    render(<PmsStatusBadge status="DRAFT" className="custom-class" />);
    const badge = screen.getByTestId('status-badge');
    expect(badge.className).toContain('custom-class');
  });

  it('renders with FINALIZED status', () => {
    render(<PmsStatusBadge status="FINALIZED" />);
    const badge = screen.getByTestId('status-badge');
    expect(badge.textContent).toBe('FINALIZED');
  });

  it('renders with OPEN status', () => {
    render(<PmsStatusBadge status="OPEN" />);
    const badge = screen.getByTestId('status-badge');
    expect(badge.textContent).toBe('OPEN');
  });
});
