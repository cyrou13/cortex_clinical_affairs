import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { FileText, BarChart3 } from 'lucide-react';
import { GENERATE_PMCF_REPORT, GENERATE_PSUR } from '../graphql/mutations';

interface PmcfReportResult {
  generatePmcfReport: { taskId: string; pmsCycleId: string; status: string };
}

interface PsurResult {
  generatePsur: { taskId: string; pmsCycleId: string; status: string };
}

interface ReportGenerationProps {
  cycleId: string;
}

export function ReportGeneration({ cycleId }: ReportGenerationProps) {
  const [pmcfTaskId, setPmcfTaskId] = useState<string | null>(null);
  const [psurTaskId, setPsurTaskId] = useState<string | null>(null);

  const [generatePmcf, { loading: pmcfLoading, error: pmcfError }] = useMutation<PmcfReportResult>(GENERATE_PMCF_REPORT, {
    variables: { pmsCycleId: cycleId },
    onCompleted: (data) => setPmcfTaskId(data.generatePmcfReport.taskId),
  });

  const [generatePsur, { loading: psurLoading, error: psurError }] = useMutation<PsurResult>(GENERATE_PSUR, {
    variables: { pmsCycleId: cycleId },
    onCompleted: (data) => setPsurTaskId(data.generatePsur.taskId),
  });

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2" data-testid="report-generation">
      {/* PMCF Report Card */}
      <div className="rounded-lg border border-[var(--cortex-border)] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--cortex-text-primary)]">PMCF Report</h3>
            <p className="text-xs text-[var(--cortex-text-muted)]">Post-Market Clinical Follow-up</p>
          </div>
        </div>

        <p className="mb-4 text-sm text-[var(--cortex-text-secondary)]">
          Generate a PMCF evaluation report based on clinical follow-up activities, complaint analysis, and trend data collected during this cycle.
        </p>

        {pmcfError && (
          <p className="mb-3 text-sm text-[var(--cortex-error)]">Failed to generate: {pmcfError.message}</p>
        )}

        {pmcfTaskId && (
          <div className="mb-3 rounded-md bg-emerald-50 px-3 py-2" data-testid="pmcf-task-id">
            <p className="text-sm text-emerald-700">
              Task started: <span className="font-mono text-xs">{pmcfTaskId}</span>
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => generatePmcf()}
          disabled={pmcfLoading}
          className="w-full rounded-md bg-[var(--cortex-blue-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--cortex-blue-600)] disabled:opacity-50"
          data-testid="generate-pmcf-btn"
        >
          {pmcfLoading ? 'Generating...' : 'Generate PMCF Report'}
        </button>
      </div>

      {/* PSUR Card */}
      <div className="rounded-lg border border-[var(--cortex-border)] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-500">
            <BarChart3 size={20} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--cortex-text-primary)]">PSUR</h3>
            <p className="text-xs text-[var(--cortex-text-muted)]">Periodic Safety Update Report</p>
          </div>
        </div>

        <p className="mb-4 text-sm text-[var(--cortex-text-secondary)]">
          Generate a Periodic Safety Update Report consolidating vigilance data, complaint trends, and benefit-risk analysis for the reporting period.
        </p>

        {psurError && (
          <p className="mb-3 text-sm text-[var(--cortex-error)]">Failed to generate: {psurError.message}</p>
        )}

        {psurTaskId && (
          <div className="mb-3 rounded-md bg-emerald-50 px-3 py-2" data-testid="psur-task-id">
            <p className="text-sm text-emerald-700">
              Task started: <span className="font-mono text-xs">{psurTaskId}</span>
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => generatePsur()}
          disabled={psurLoading}
          className="w-full rounded-md bg-[var(--cortex-blue-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--cortex-blue-600)] disabled:opacity-50"
          data-testid="generate-psur-btn"
        >
          {psurLoading ? 'Generating...' : 'Generate PSUR'}
        </button>
      </div>
    </div>
  );
}
