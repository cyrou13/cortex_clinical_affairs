import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserEditDialog } from './UserEditDialog';

const mockUser = {
  id: 'u-1',
  name: 'Alice Admin',
  email: 'alice@example.com',
  role: 'ADMIN',
  isActive: true,
  mfaEnabled: true,
};

describe('UserEditDialog', () => {
  it('does not render when closed', () => {
    render(
      <UserEditDialog open={false} user={mockUser} onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(screen.queryByText('Edit User')).not.toBeInTheDocument();
  });

  it('does not render when user is null', () => {
    render(
      <UserEditDialog open={true} user={null} onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(screen.queryByText('Edit User')).not.toBeInTheDocument();
  });

  it('renders user details when open', () => {
    render(
      <UserEditDialog open={true} user={mockUser} onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(screen.getByText('Edit User')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Alice Admin')).toBeInTheDocument();
  });

  it('shows MFA status', () => {
    render(
      <UserEditDialog open={true} user={mockUser} onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(screen.getByText('Enabled')).toBeInTheDocument();
  });

  it('shows MFA disabled status', () => {
    render(
      <UserEditDialog
        open={true}
        user={{ ...mockUser, mfaEnabled: false }}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('calls onSubmit with changed fields', () => {
    const onSubmit = vi.fn();
    render(
      <UserEditDialog open={true} user={mockUser} onClose={vi.fn()} onSubmit={onSubmit} />,
    );
    fireEvent.change(screen.getByLabelText('Full Name'), {
      target: { value: 'Updated Name' },
    });
    fireEvent.click(screen.getByText('Save Changes'));
    expect(onSubmit).toHaveBeenCalledWith('u-1', { name: 'Updated Name' });
  });
});
