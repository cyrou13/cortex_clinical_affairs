interface PrismaStatistics {
  identification: {
    perDatabase: Array<{
      database: string;
      articlesFound: number;
      queriesExecuted: number;
    }>;
    totalIdentified: number;
  };
  deduplication: {
    duplicatesRemovedByDoi: number;
    duplicatesRemovedByPmid: number;
    duplicatesRemovedByTitleFuzzy: number;
    totalDuplicatesRemoved: number;
    uniqueArticlesAfterDedup: number;
  };
  screening: {
    aiScored: number;
    manuallyReviewed: number;
    includedAfterScreening: number;
    excludedAfterScreening: number;
    excludedByCode: Array<{ code: string; label: string; count: number }>;
  };
  inclusion: {
    finalIncluded: number;
    perQuery: Array<{ queryName: string; articlesContributed: number }>;
  };
}

interface PrismaFlowChartProps {
  statistics: PrismaStatistics;
}

function FlowBox({
  title,
  children,
  testId,
  variant = 'default',
}: {
  title: string;
  children: React.ReactNode;
  testId: string;
  variant?: 'default' | 'success' | 'danger';
}) {
  const borderColors = {
    default: 'border-[var(--cortex-border)]',
    success: 'border-emerald-300',
    danger: 'border-red-300',
  };

  const headerColors = {
    default: 'bg-[var(--cortex-bg-muted)] text-[var(--cortex-text-primary)]',
    success: 'bg-emerald-50 text-emerald-800',
    danger: 'bg-red-50 text-red-800',
  };

  return (
    <div
      className={`rounded-lg border-2 ${borderColors[variant]}`}
      data-testid={testId}
    >
      <div className={`rounded-t-lg px-4 py-2 text-sm font-semibold uppercase tracking-wide ${headerColors[variant]}`}>
        {title}
      </div>
      <div className="p-4 text-sm">{children}</div>
    </div>
  );
}

function FlowArrow({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center py-2" data-testid="flow-arrow">
      <div className="h-6 w-0.5 bg-[var(--cortex-border)]" />
      {label && (
        <span className="text-xs text-[var(--cortex-text-muted)]">{label}</span>
      )}
      <div className="h-0 w-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-[var(--cortex-border)]" />
    </div>
  );
}

export function PrismaFlowChart({ statistics }: PrismaFlowChartProps) {
  const { identification, deduplication, screening, inclusion } = statistics;

  return (
    <div className="mx-auto max-w-2xl space-y-0" data-testid="prisma-flowchart">
      {/* Identification */}
      <FlowBox title="Identification" testId="prisma-identification">
        <p className="mb-2 text-[var(--cortex-text-secondary)]">
          Records identified from databases:
        </p>
        <ul className="mb-2 space-y-1">
          {identification.perDatabase.map((db) => (
            <li key={db.database} className="flex justify-between" data-testid={`db-${db.database.toLowerCase()}`}>
              <span className="text-[var(--cortex-text-primary)]">{db.database}</span>
              <span className="font-medium">
                n = {db.articlesFound.toLocaleString()} ({db.queriesExecuted} queries)
              </span>
            </li>
          ))}
        </ul>
        <div className="border-t border-[var(--cortex-border)] pt-2 font-medium" data-testid="total-identified">
          Total: {identification.totalIdentified.toLocaleString()} records
        </div>
      </FlowBox>

      <FlowArrow />

      {/* Deduplication */}
      <FlowBox title="Deduplication" testId="prisma-deduplication">
        <p className="mb-2 text-[var(--cortex-text-secondary)]">Duplicates removed:</p>
        <ul className="mb-2 space-y-1">
          <li className="flex justify-between">
            <span>DOI match</span>
            <span className="font-medium">{deduplication.duplicatesRemovedByDoi.toLocaleString()}</span>
          </li>
          <li className="flex justify-between">
            <span>PMID match</span>
            <span className="font-medium">{deduplication.duplicatesRemovedByPmid.toLocaleString()}</span>
          </li>
          <li className="flex justify-between">
            <span>Title fuzzy</span>
            <span className="font-medium">{deduplication.duplicatesRemovedByTitleFuzzy.toLocaleString()}</span>
          </li>
        </ul>
        <div className="border-t border-[var(--cortex-border)] pt-2">
          <div className="flex justify-between font-medium">
            <span>Total removed</span>
            <span data-testid="total-duplicates">{deduplication.totalDuplicatesRemoved.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-medium text-[var(--cortex-text-primary)]">
            <span>Unique after dedup</span>
            <span data-testid="unique-after-dedup">{deduplication.uniqueArticlesAfterDedup.toLocaleString()}</span>
          </div>
        </div>
      </FlowBox>

      <FlowArrow label={`${deduplication.uniqueArticlesAfterDedup.toLocaleString()} records`} />

      {/* Screening */}
      <FlowBox title="Screening" testId="prisma-screening">
        <div className="mb-2 space-y-1">
          <div className="flex justify-between">
            <span>AI scored</span>
            <span className="font-medium">{screening.aiScored.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Manually reviewed</span>
            <span className="font-medium">{screening.manuallyReviewed.toLocaleString()}</span>
          </div>
        </div>
        <div className="border-t border-[var(--cortex-border)] pt-2">
          <div className="mb-1 flex justify-between font-medium text-emerald-600">
            <span>Included</span>
            <span data-testid="screening-included">{screening.includedAfterScreening.toLocaleString()}</span>
          </div>
          <div className="mb-2 flex justify-between font-medium text-red-600">
            <span>Excluded</span>
            <span data-testid="screening-excluded">{screening.excludedAfterScreening.toLocaleString()}</span>
          </div>
          {screening.excludedByCode.length > 0 && (
            <div className="space-y-1 border-t border-[var(--cortex-border)] pt-2">
              <p className="text-xs font-medium text-[var(--cortex-text-muted)]">Exclusion breakdown:</p>
              {screening.excludedByCode.map((ec) => (
                <div key={ec.code} className="flex justify-between text-xs" data-testid={`exclusion-${ec.code.toLowerCase()}`}>
                  <span>{ec.code}: {ec.label}</span>
                  <span>{ec.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </FlowBox>

      <FlowArrow label={`${screening.includedAfterScreening.toLocaleString()} included`} />

      {/* Inclusion */}
      <FlowBox title="Inclusion" testId="prisma-inclusion" variant="success">
        <div className="mb-2 text-2xl font-bold text-emerald-600" data-testid="final-included">
          {inclusion.finalIncluded.toLocaleString()} studies included
        </div>
        {inclusion.perQuery.length > 0 && (
          <div className="space-y-1 border-t border-[var(--cortex-border)] pt-2">
            <p className="text-xs font-medium text-[var(--cortex-text-muted)]">Per query:</p>
            {inclusion.perQuery.map((q) => (
              <div key={q.queryName} className="flex justify-between text-xs" data-testid={`query-contribution`}>
                <span>{q.queryName}</span>
                <span>{q.articlesContributed.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </FlowBox>
    </div>
  );
}
