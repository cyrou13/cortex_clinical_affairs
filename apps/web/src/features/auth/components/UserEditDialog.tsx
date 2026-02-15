import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const ROLES = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'RA_MANAGER', label: 'RA Manager' },
  { value: 'CLINICAL_SPECIALIST', label: 'Clinical Specialist' },
  { value: 'DATA_SCIENCE', label: 'Data Science' },
  { value: 'EXECUTIVE', label: 'Executive' },
  { value: 'AUDITOR', label: 'Auditor' },
];

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  mfaEnabled: boolean;
}

interface UserEditDialogProps {
  open: boolean;
  user: UserData | null;
  onClose: () => void;
  onSubmit: (id: string, data: { name?: string; role?: string }) => void;
}

export function UserEditDialog({ open, user, onClose, onSubmit }: UserEditDialogProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name);
      setRole(user.role);
    }
  }, [user]);

  if (!open || !user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const changes: { name?: string; role?: string } = {};
    if (name.trim() !== user.name) changes.name = name.trim();
    if (role !== user.role) changes.role = role;
    onSubmit(user.id, changes);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-label="Edit user"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--cortex-blue-900)]">Edit User</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-gray-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 text-sm text-[var(--cortex-text-muted)]">{user.email}</div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-name" className="block text-sm font-medium mb-1">
              Full Name
            </label>
            <input
              id="edit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[var(--cortex-border)] px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="edit-role" className="block text-sm font-medium mb-1">
              Role
            </label>
            <select
              id="edit-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-[var(--cortex-border)] px-3 py-2 text-sm"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-[var(--cortex-bg-secondary)] p-3 text-sm">
            <span className="text-[var(--cortex-text-muted)]">MFA:</span>
            <span className={user.mfaEnabled ? 'text-[var(--cortex-success)]' : 'text-[var(--cortex-error)]'}>
              {user.mfaEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--cortex-border)] px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[var(--cortex-blue-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--cortex-blue-600)]"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
