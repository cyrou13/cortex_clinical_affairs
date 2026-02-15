import { useState } from 'react';
import { UserPlus, Edit2, UserX, UserCheck, ChevronDown } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  RA_MANAGER: 'RA Manager',
  CLINICAL_SPECIALIST: 'Clinical Specialist',
  DATA_SCIENCE: 'Data Science',
  EXECUTIVE: 'Executive',
  AUDITOR: 'Auditor',
};

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

type SortField = 'name' | 'email' | 'role' | 'isActive' | 'lastLoginAt';
type SortDirection = 'asc' | 'desc';

interface UserManagementTableProps {
  users: User[];
  total: number;
  onAddUser: () => void;
  onEditUser: (user: User) => void;
  onDeactivateUser: (userId: string) => void;
  onReactivateUser: (userId: string) => void;
  filterRole: string;
  onFilterRoleChange: (role: string) => void;
  filterStatus: string;
  onFilterStatusChange: (status: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function UserManagementTable({
  users,
  total,
  onAddUser,
  onEditUser,
  onDeactivateUser,
  onReactivateUser,
  filterRole,
  onFilterRoleChange,
  filterStatus,
  onFilterStatusChange,
  searchQuery,
  onSearchChange,
}: UserManagementTableProps) {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    const aVal = a[sortField] ?? '';
    const bVal = b[sortField] ?? '';
    const cmp = String(aVal).localeCompare(String(bVal));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--cortex-text-muted)] uppercase tracking-wider">
      <button
        type="button"
        onClick={() => handleSort(field)}
        className="flex items-center gap-1 hover:text-[var(--cortex-blue-500)]"
      >
        {label}
        {sortField === field && (
          <ChevronDown
            size={14}
            className={cn('transition-transform', sortDir === 'asc' && 'rotate-180')}
          />
        )}
      </button>
    </th>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[var(--cortex-blue-900)]">User Management</h2>
        <button
          type="button"
          onClick={onAddUser}
          className="flex items-center gap-2 rounded-lg bg-[var(--cortex-blue-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--cortex-blue-600)]"
        >
          <UserPlus size={16} />
          Add User
        </button>
      </div>

      <div className="flex items-center gap-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search users..."
          className="flex-1 rounded-lg border border-[var(--cortex-border)] px-3 py-2 text-sm"
          aria-label="Search users"
        />
        <select
          value={filterRole}
          onChange={(e) => onFilterRoleChange(e.target.value)}
          className="rounded-lg border border-[var(--cortex-border)] px-3 py-2 text-sm"
          aria-label="Filter by role"
        >
          <option value="">All Roles</option>
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => onFilterStatusChange(e.target.value)}
          className="rounded-lg border border-[var(--cortex-border)] px-3 py-2 text-sm"
          aria-label="Filter by status"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--cortex-border)]">
        <table className="w-full" role="table">
          <thead className="bg-[var(--cortex-bg-secondary)]">
            <tr>
              <SortHeader field="name" label="Name" />
              <SortHeader field="email" label="Email" />
              <SortHeader field="role" label="Role" />
              <SortHeader field="isActive" label="Status" />
              <SortHeader field="lastLoginAt" label="Last Login" />
              <th className="px-4 py-3 text-right text-xs font-medium text-[var(--cortex-text-muted)] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--cortex-border)]">
            {sortedUsers.map((user) => (
              <tr key={user.id} className="hover:bg-[var(--cortex-bg-secondary)]">
                <td className="px-4 py-3 text-sm font-medium">{user.name}</td>
                <td className="px-4 py-3 text-sm text-[var(--cortex-text-secondary)]">
                  {user.email}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className="rounded-full bg-[var(--cortex-blue-50)] px-2 py-1 text-xs font-medium text-[var(--cortex-blue-700)]">
                    {ROLE_LABELS[user.role] ?? user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
                      user.isActive
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700',
                    )}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        user.isActive ? 'bg-green-500' : 'bg-red-500',
                      )}
                    />
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-[var(--cortex-text-muted)]">
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleDateString()
                    : 'Never'}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onEditUser(user)}
                      className="rounded p-1 text-[var(--cortex-text-muted)] hover:bg-gray-100 hover:text-[var(--cortex-blue-500)]"
                      aria-label={`Edit ${user.name}`}
                    >
                      <Edit2 size={16} />
                    </button>
                    {user.isActive ? (
                      <button
                        type="button"
                        onClick={() => onDeactivateUser(user.id)}
                        className="rounded p-1 text-[var(--cortex-text-muted)] hover:bg-red-50 hover:text-red-500"
                        aria-label={`Deactivate ${user.name}`}
                      >
                        <UserX size={16} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onReactivateUser(user.id)}
                        className="rounded p-1 text-[var(--cortex-text-muted)] hover:bg-green-50 hover:text-green-500"
                        aria-label={`Reactivate ${user.name}`}
                      >
                        <UserCheck size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {sortedUsers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--cortex-text-muted)]">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-right text-sm text-[var(--cortex-text-muted)]">
        Showing {sortedUsers.length} of {total} users
      </div>
    </div>
  );
}
