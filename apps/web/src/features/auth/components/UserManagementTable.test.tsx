import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { UserManagementTable } from './UserManagementTable';

const mockUsers = [
  {
    id: 'u-1',
    name: 'Alice Admin',
    email: 'alice@example.com',
    role: 'ADMIN',
    isActive: true,
    mfaEnabled: true,
    lastLoginAt: '2026-02-14T10:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'u-2',
    name: 'Bob Manager',
    email: 'bob@example.com',
    role: 'RA_MANAGER',
    isActive: true,
    mfaEnabled: false,
    lastLoginAt: null,
    createdAt: '2026-01-15T00:00:00Z',
  },
  {
    id: 'u-3',
    name: 'Carol Specialist',
    email: 'carol@example.com',
    role: 'CLINICAL_SPECIALIST',
    isActive: false,
    mfaEnabled: false,
    lastLoginAt: '2026-02-10T08:00:00Z',
    createdAt: '2026-02-01T00:00:00Z',
  },
];

const defaultProps = {
  users: mockUsers,
  total: 3,
  onAddUser: vi.fn(),
  onEditUser: vi.fn(),
  onDeactivateUser: vi.fn(),
  onReactivateUser: vi.fn(),
  filterRole: '',
  onFilterRoleChange: vi.fn(),
  filterStatus: '',
  onFilterStatusChange: vi.fn(),
  searchQuery: '',
  onSearchChange: vi.fn(),
};

describe('UserManagementTable', () => {
  it('renders User Management heading', () => {
    render(<UserManagementTable {...defaultProps} />);
    expect(screen.getByText('User Management')).toBeInTheDocument();
  });

  it('renders all users in the table', () => {
    render(<UserManagementTable {...defaultProps} />);
    expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    expect(screen.getByText('Bob Manager')).toBeInTheDocument();
    expect(screen.getByText('Carol Specialist')).toBeInTheDocument();
  });

  it('displays role badges in the table rows', () => {
    render(<UserManagementTable {...defaultProps} />);
    const table = screen.getByRole('table');
    const tableRows = within(table).getAllByRole('row');
    // Header row + 3 data rows = 4
    expect(tableRows).toHaveLength(4);
    // Check that role badges exist within table body
    const tbody = table.querySelector('tbody')!;
    expect(within(tbody).getByText('Admin')).toBeInTheDocument();
    expect(within(tbody).getByText('RA Manager')).toBeInTheDocument();
    expect(within(tbody).getByText('Clinical Specialist')).toBeInTheDocument();
  });

  it('displays active/inactive status in table rows', () => {
    render(<UserManagementTable {...defaultProps} />);
    const table = screen.getByRole('table');
    const tbody = table.querySelector('tbody')!;
    const activeStatuses = within(tbody).getAllByText('Active');
    const inactiveStatuses = within(tbody).getAllByText('Inactive');
    expect(activeStatuses).toHaveLength(2);
    expect(inactiveStatuses).toHaveLength(1);
  });

  it('shows "Never" for null lastLoginAt', () => {
    render(<UserManagementTable {...defaultProps} />);
    expect(screen.getByText('Never')).toBeInTheDocument();
  });

  it('calls onAddUser when Add User button clicked', () => {
    render(<UserManagementTable {...defaultProps} />);
    fireEvent.click(screen.getByText('Add User'));
    expect(defaultProps.onAddUser).toHaveBeenCalled();
  });

  it('calls onEditUser when edit button clicked', () => {
    render(<UserManagementTable {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Edit Alice Admin'));
    expect(defaultProps.onEditUser).toHaveBeenCalledWith(mockUsers[0]);
  });

  it('calls onDeactivateUser for active user', () => {
    render(<UserManagementTable {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Deactivate Alice Admin'));
    expect(defaultProps.onDeactivateUser).toHaveBeenCalledWith('u-1');
  });

  it('calls onReactivateUser for inactive user', () => {
    render(<UserManagementTable {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Reactivate Carol Specialist'));
    expect(defaultProps.onReactivateUser).toHaveBeenCalledWith('u-3');
  });

  it('shows total count', () => {
    render(<UserManagementTable {...defaultProps} />);
    expect(screen.getByText('Showing 3 of 3 users')).toBeInTheDocument();
  });

  it('shows search input', () => {
    render(<UserManagementTable {...defaultProps} />);
    expect(screen.getByLabelText('Search users')).toBeInTheDocument();
  });

  it('shows filter dropdowns', () => {
    render(<UserManagementTable {...defaultProps} />);
    expect(screen.getByLabelText('Filter by role')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
  });

  it('displays empty state when no users', () => {
    render(<UserManagementTable {...defaultProps} users={[]} total={0} />);
    expect(screen.getByText('No users found')).toBeInTheDocument();
  });
});
