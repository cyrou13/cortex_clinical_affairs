interface ProjectMetricsProps {
  totalArticles: number;
  includedArticles: number;
  soaSectionsComplete: number;
  soaSectionsTotal: number;
  cerSectionsComplete: number;
  cerSectionsTotal: number;
}

interface MetricCardProps {
  value: string;
  label: string;
}

function MetricCard({ value, label }: MetricCardProps) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <p className="text-2xl font-bold tabular-nums text-[var(--cortex-blue-900)]">
        {value}
      </p>
      <p className="text-sm text-[var(--cortex-text-muted)]">{label}</p>
    </div>
  );
}

export function ProjectMetrics({
  totalArticles,
  includedArticles,
  soaSectionsComplete,
  soaSectionsTotal,
  cerSectionsComplete,
  cerSectionsTotal,
}: ProjectMetricsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <MetricCard
        value={totalArticles.toLocaleString()}
        label="Total Articles"
      />
      <MetricCard
        value={includedArticles.toLocaleString()}
        label="Included"
      />
      <MetricCard
        value={`${soaSectionsComplete}/${soaSectionsTotal}`}
        label="SOA Sections"
      />
      <MetricCard
        value={`${cerSectionsComplete}/${cerSectionsTotal}`}
        label="CER Sections"
      />
    </div>
  );
}
