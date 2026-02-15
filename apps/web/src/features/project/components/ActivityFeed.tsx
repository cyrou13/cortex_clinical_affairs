interface ActivityEntry {
  id: string;
  description: string;
  userName: string;
  timestamp: string;
  action: string;
}

interface ActivityFeedProps {
  activities: ActivityEntry[];
}

function getRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes === 1) return '1 min ago';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-[var(--cortex-text-primary)]">
          Recent Activity
        </h3>
        <p className="text-sm text-[var(--cortex-text-muted)]">
          No recent activity.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-[var(--cortex-text-primary)]">
        Recent Activity
      </h3>
      <div className="max-h-80 space-y-4 overflow-y-auto">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3">
            {/* User initial avatar */}
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--cortex-blue-100)] text-xs font-medium text-[var(--cortex-blue-700)]">
              {getInitial(activity.userName)}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <p className="text-sm text-[var(--cortex-text-primary)]">
                <span className="font-medium">{activity.userName}</span>{' '}
                {activity.description}
              </p>
              <p className="text-xs text-[var(--cortex-text-muted)]">
                {getRelativeTime(activity.timestamp)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
