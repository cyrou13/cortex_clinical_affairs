import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Search,
  BarChart3,
  FlaskConical,
  FileText,
  Activity,
} from 'lucide-react';

const commands = [
  { id: 'projects', label: 'Go to Projects', icon: LayoutDashboard, href: '/projects' },
  { id: 'sls', label: 'Open SLS Module', icon: Search, href: '#' },
  { id: 'soa', label: 'Open SOA Module', icon: BarChart3, href: '#' },
  { id: 'validation', label: 'Open Validation', icon: FlaskConical, href: '#' },
  { id: 'cer', label: 'Open CER Module', icon: FileText, href: '#' },
  { id: 'pms', label: 'Open PMS Module', icon: Activity, href: '#' },
];

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  const filtered = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[20vh]"
      onClick={() => setIsOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-lg rounded-xl border border-[var(--cortex-border)] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="text"
          placeholder="Type a command..."
          className="w-full border-b border-[var(--cortex-border)] px-4 py-3 text-sm outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        <div className="max-h-64 overflow-y-auto p-2">
          {filtered.map((cmd) => {
            const Icon = cmd.icon;
            return (
              <a
                key={cmd.id}
                href={cmd.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-[var(--cortex-blue-50)]"
                onClick={() => setIsOpen(false)}
              >
                <Icon size={16} className="text-[var(--cortex-text-muted)]" />
                <span>{cmd.label}</span>
              </a>
            );
          })}
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-sm text-[var(--cortex-text-muted)]">No results found</p>
          )}
        </div>
      </div>
    </div>
  );
}
