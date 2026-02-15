import { useState } from 'react';
import { X, Search } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
}

interface SelectedUser {
  userId: string;
  name: string;
  email: string;
  role: string;
}

interface TeamAssignmentProps {
  availableUsers: User[];
  selectedUsers: SelectedUser[];
  onAdd: (userId: string, role: string) => void;
  onRemove: (userId: string) => void;
  onRoleChange: (userId: string, role: string) => void;
}

const roles = [
  { value: 'MEMBER', label: 'Member' },
  { value: 'RA_MANAGER', label: 'RA Manager' },
  { value: 'CLINICAL_SPECIALIST', label: 'Clinical Specialist' },
  { value: 'DATA_SCIENCE', label: 'Data Science' },
  { value: 'EXECUTIVE', label: 'Executive' },
  { value: 'AUDITOR', label: 'Auditor' },
];

export function TeamAssignment({
  availableUsers,
  selectedUsers,
  onAdd,
  onRemove,
  onRoleChange,
}: TeamAssignmentProps) {
  const [search, setSearch] = useState('');

  const selectedIds = new Set(selectedUsers.map((u) => u.userId));
  const filtered = availableUsers.filter(
    (u) =>
      !selectedIds.has(u.id) &&
      (u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="space-y-4">
      {/* Search & add */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-2.5 text-[var(--cortex-text-muted)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users by name or email..."
          aria-label="Search users"
          className="w-full rounded-md border border-[var(--cortex-border)] py-2 pl-9 pr-3 text-sm focus:border-[var(--cortex-blue-500)] focus:outline-none"
        />
      </div>

      {search && filtered.length > 0 && (
        <ul className="max-h-40 overflow-auto rounded-md border border-[var(--cortex-border)] bg-white" role="listbox">
          {filtered.map((user) => (
            <li
              key={user.id}
              role="option"
              aria-selected={false}
              className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm hover:bg-[var(--cortex-bg-secondary)]"
              onClick={() => {
                onAdd(user.id, 'MEMBER');
                setSearch('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onAdd(user.id, 'MEMBER');
                  setSearch('');
                }
              }}
              tabIndex={0}
            >
              <div>
                <span className="font-medium">{user.name}</span>
                <span className="ml-2 text-[var(--cortex-text-muted)]">{user.email}</span>
              </div>
              <span className="text-xs text-[var(--cortex-blue-500)]">+ Add</span>
            </li>
          ))}
        </ul>
      )}

      {/* Selected users */}
      {selectedUsers.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--cortex-text-secondary)]">
            Team members ({selectedUsers.length})
          </label>
          <div className="space-y-1">
            {selectedUsers.map((user) => (
              <div
                key={user.userId}
                className="flex items-center justify-between rounded-md border border-[var(--cortex-border)] bg-[var(--cortex-bg-secondary)] px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--cortex-blue-100)] text-xs font-medium text-[var(--cortex-blue-700)]">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-sm font-medium">{user.name}</span>
                    <span className="ml-2 text-xs text-[var(--cortex-text-muted)]">{user.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={user.role}
                    onChange={(e) => onRoleChange(user.userId, e.target.value)}
                    className="rounded border border-[var(--cortex-border)] px-2 py-1 text-xs"
                    aria-label={`Role for ${user.name}`}
                  >
                    {roles.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => onRemove(user.userId)}
                    aria-label={`Remove ${user.name}`}
                    className="rounded p-1 text-[var(--cortex-text-muted)] hover:bg-red-50 hover:text-red-500"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedUsers.length === 0 && (
        <p className="py-4 text-center text-sm text-[var(--cortex-text-muted)]">
          No team members assigned yet. Search and add users above.
        </p>
      )}
    </div>
  );
}
