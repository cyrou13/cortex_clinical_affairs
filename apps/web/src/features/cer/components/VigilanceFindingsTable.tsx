import { useState } from 'react';
import { Link } from 'lucide-react';

interface VigilanceFinding {
  id: string;
  sourceDatabase: string;
  reportNumber: string;
  eventDate: string;
  deviceName: string;
  eventType: string;
  description: string;
  outcome: string;
  linkedSection: string | null;
}

interface VigilanceFindingsTableProps {
  findings: VigilanceFinding[];
  onSelectFinding?: (finding: VigilanceFinding) => void;
  onLinkSection?: (findingId: string) => void;
}

const dbColors: Record<string, { bg: string; text: string }> = {
  MAUDE: { bg: 'bg-blue-100', text: 'text-blue-700' },
  ANSM: { bg: 'bg-purple-100', text: 'text-purple-700' },
  BfArM: { bg: 'bg-green-100', text: 'text-green-700' },
  AFMPS: { bg: 'bg-orange-100', text: 'text-orange-700' },
};

export function VigilanceFindingsTable({ findings, onSelectFinding, onLinkSection }: VigilanceFindingsTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id],
    );
  };

  return (
    <div className="space-y-3" data-testid="findings-table">
      {findings.length === 0 ? (
        <p className="py-4 text-center text-sm text-[var(--cortex-text-muted)]" data-testid="no-findings">No findings found.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--cortex-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--cortex-border)] bg-gray-50">
                <th className="w-8 px-3 py-2" />
                <th className="px-3 py-2 text-left font-medium text-[var(--cortex-text-muted)]">Source</th>
                <th className="px-3 py-2 text-left font-medium text-[var(--cortex-text-muted)]">Report #</th>
                <th className="px-3 py-2 text-left font-medium text-[var(--cortex-text-muted)]">Date</th>
                <th className="px-3 py-2 text-left font-medium text-[var(--cortex-text-muted)]">Device</th>
                <th className="px-3 py-2 text-left font-medium text-[var(--cortex-text-muted)]">Event Type</th>
                <th className="px-3 py-2 text-left font-medium text-[var(--cortex-text-muted)]">Description</th>
                <th className="px-3 py-2 text-left font-medium text-[var(--cortex-text-muted)]">Outcome</th>
                <th className="px-3 py-2 text-right font-medium text-[var(--cortex-text-muted)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--cortex-border)]">
              {findings.map((finding) => {
                const colors = dbColors[finding.sourceDatabase] ?? { bg: 'bg-gray-100', text: 'text-gray-700' };
                return (
                  <tr
                    key={finding.id}
                    className={`cursor-pointer hover:bg-gray-50 ${selectedIds.includes(finding.id) ? 'bg-blue-50' : ''}`}
                    onClick={() => onSelectFinding?.(finding)}
                    data-testid="finding-row"
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(finding.id)}
                        onChange={(e) => { e.stopPropagation(); toggleSelect(finding.id); }}
                        className="accent-[var(--cortex-primary)]"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`} data-testid="source-badge">
                        {finding.sourceDatabase}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-[var(--cortex-text-primary)]">{finding.reportNumber}</td>
                    <td className="px-3 py-2 text-[var(--cortex-text-muted)]">{finding.eventDate}</td>
                    <td className="px-3 py-2 text-[var(--cortex-text-primary)]">{finding.deviceName}</td>
                    <td className="px-3 py-2 text-[var(--cortex-text-muted)]">{finding.eventType}</td>
                    <td className="max-w-xs truncate px-3 py-2 text-[var(--cortex-text-muted)]">{finding.description}</td>
                    <td className="px-3 py-2 text-[var(--cortex-text-muted)]">{finding.outcome}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onLinkSection?.(finding.id); }}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--cortex-primary)] hover:bg-blue-50"
                        data-testid="link-section-btn"
                      >
                        <Link size={10} /> Link
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
