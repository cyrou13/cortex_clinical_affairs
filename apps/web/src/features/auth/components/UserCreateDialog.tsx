import { useState } from 'react';
import { X } from 'lucide-react';

const ROLES = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'RA_MANAGER', label: 'RA Manager' },
  { value: 'CLINICAL_SPECIALIST', label: 'Clinical Specialist' },
  { value: 'DATA_SCIENCE', label: 'Data Science' },
  { value: 'EXECUTIVE', label: 'Executive' },
  { value: 'AUDITOR', label: 'Auditor' },
];

interface UserCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { email: string; name: string; role: string }) => void;
}

export function UserCreateDialog({ open, onClose, onSubmit }: UserCreateDialogProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('CLINICAL_SPECIALIST');
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!open) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Invalid email format';
    if (!name.trim()) newErrors.name = 'Name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ email: email.trim(), name: name.trim(), role });
    setEmail('');
    setName('');
    setRole('CLINICAL_SPECIALIST');
    setErrors({});
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-label="Create user"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--cortex-blue-900)]">Add User</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-gray-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="user-email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[var(--cortex-border)] px-3 py-2 text-sm"
              placeholder="user@company.com"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-[var(--cortex-error)]">{errors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="user-name" className="block text-sm font-medium mb-1">
              Full Name
            </label>
            <input
              id="user-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[var(--cortex-border)] px-3 py-2 text-sm"
              placeholder="John Doe"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-[var(--cortex-error)]">{errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="user-role" className="block text-sm font-medium mb-1">
              Role
            </label>
            <select
              id="user-role"
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
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
