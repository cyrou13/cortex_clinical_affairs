import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { act } from 'react';
import { UserCreateDialog } from './UserCreateDialog';

describe('UserCreateDialog', () => {
  it('does not render when closed', () => {
    render(<UserCreateDialog open={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.queryByText('Add User')).not.toBeInTheDocument();
  });

  it('renders form when open', () => {
    render(<UserCreateDialog open={true} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByText('Add User')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Role')).toBeInTheDocument();
  });

  it('validates required fields', () => {
    render(<UserCreateDialog open={true} onClose={vi.fn()} onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByText('Create User'));
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Name is required')).toBeInTheDocument();
  });

  it('validates email format', async () => {
    render(<UserCreateDialog open={true} onClose={vi.fn()} onSubmit={vi.fn()} />);

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'invalid' } });
      fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Test' } });
    });

    const form = screen.getByLabelText('Email').closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(screen.getByText('Invalid email format')).toBeInTheDocument();
  });

  it('calls onSubmit with form data', async () => {
    const onSubmit = vi.fn();
    render(<UserCreateDialog open={true} onClose={vi.fn()} onSubmit={onSubmit} />);

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'new@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Full Name'), {
        target: { value: 'New User' },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Create User'));
    });

    expect(onSubmit).toHaveBeenCalledWith({
      email: 'new@example.com',
      name: 'New User',
      role: 'CLINICAL_SPECIALIST',
    });
  });

  it('calls onClose when Cancel clicked', () => {
    const onClose = vi.fn();
    render(<UserCreateDialog open={true} onClose={onClose} onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});
