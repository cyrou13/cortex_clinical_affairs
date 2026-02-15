interface TeamMember {
  id: string;
  userId: string;
  role: string;
  user: { name: string; email: string; avatarUrl: string | null };
}

interface TeamMembersCardProps {
  members: TeamMember[];
  canManage?: boolean;
}

const roleBadgeColors: Record<string, string> = {
  RA_MANAGER: 'bg-purple-100 text-purple-700',
  CLINICAL_SPECIALIST: 'bg-blue-100 text-blue-700',
  DATA_SCIENCE: 'bg-amber-100 text-amber-700',
  EXECUTIVE: 'bg-red-100 text-red-700',
  AUDITOR: 'bg-gray-100 text-gray-700',
  MEMBER: 'bg-green-100 text-green-700',
};

const roleLabels: Record<string, string> = {
  RA_MANAGER: 'RA Manager',
  CLINICAL_SPECIALIST: 'Clinical Specialist',
  DATA_SCIENCE: 'Data Science',
  EXECUTIVE: 'Executive',
  AUDITOR: 'Auditor',
  MEMBER: 'Member',
};

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

function getRoleBadgeClass(role: string): string {
  return roleBadgeColors[role] ?? 'bg-gray-100 text-gray-700';
}

function getRoleLabel(role: string): string {
  return roleLabels[role] ?? role;
}

export function TeamMembersCard({ members, canManage = false }: TeamMembersCardProps) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-[var(--cortex-text-primary)]">
        Team ({members.length})
      </h3>

      {members.length === 0 ? (
        <p className="text-sm text-[var(--cortex-text-muted)]">
          No team members assigned.
        </p>
      ) : (
        <ul className="space-y-3">
          {members.map((member) => (
            <li key={member.id} className="flex items-center gap-3">
              {/* Avatar */}
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--cortex-blue-100)] text-xs font-medium text-[var(--cortex-blue-700)]">
                {getInitial(member.user.name)}
              </div>

              {/* Name & role */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--cortex-text-primary)]">
                  {member.user.name}
                </p>
              </div>

              {/* Role badge */}
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getRoleBadgeClass(member.role)}`}
              >
                {getRoleLabel(member.role)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <div className="mt-4 border-t border-[var(--cortex-border)] pt-3">
          <a
            href="#manage-team"
            className="text-sm font-medium text-[var(--cortex-blue-600)] hover:text-[var(--cortex-blue-700)]"
          >
            Manage Team
          </a>
        </div>
      )}
    </div>
  );
}
