import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { FileText, Download, CheckCircle, XCircle, Clock } from 'lucide-react';

export const GET_REPORT_STATUS = gql`
  query GetReportStatus($studyId: String!) {
    validationReports(studyId: $studyId) {
      reports {
        type
        available
        prerequisites {
          met
          missing
        }
        lastGenerated {
          id
          generatedAt
          downloadUrl
        }
        history {
          id
          generatedAt
          generatedBy
        }
      }
      studyType
    }
  }
`;

export const GENERATE_REPORT = gql`
  mutation GenerateReport($studyId: String!, $reportType: String!) {
    generateValidationReport(studyId: $studyId, reportType: $reportType) {
      reportId
      status
    }
  }
`;

interface ReportHistory {
  id: string;
  generatedAt: string;
  generatedBy: string;
}

interface ReportInfo {
  type: string;
  available: boolean;
  prerequisites: {
    met: string[];
    missing: string[];
  };
  lastGenerated: {
    id: string;
    generatedAt: string;
    downloadUrl: string;
  } | null;
  history: ReportHistory[];
}

interface ReportGeneratorProps {
  studyId: string;
}

const REPORT_LABELS: Record<string, string> = {
  VALIDATION_REPORT: 'Validation Report',
  CLINICAL_BENEFIT: 'Clinical Benefit Report',
};

export function ReportGenerator({ studyId }: ReportGeneratorProps) {
  const { data, loading } = useQuery(GET_REPORT_STATUS, {
    variables: { studyId },
  });

  const [generateReport, { loading: generating }] = useMutation(GENERATE_REPORT);

  if (loading) {
    return (
      <div className="py-6 text-center text-sm text-[var(--cortex-text-muted)]" data-testid="reports-loading">
        Loading reports...
      </div>
    );
  }

  const reports: ReportInfo[] = data?.validationReports?.reports ?? [];
  const studyType = data?.validationReports?.studyType ?? 'STANDALONE';

  const filteredReports = reports.filter((r) => {
    if (r.type === 'CLINICAL_BENEFIT' && studyType !== 'MRMC') return false;
    return true;
  });

  const handleGenerate = async (reportType: string) => {
    await generateReport({
      variables: { studyId, reportType },
    });
  };

  return (
    <div className="space-y-4" data-testid="report-generator">
      <div className="flex items-center gap-2">
        <FileText size={16} className="text-[var(--cortex-primary)]" />
        <h3 className="text-sm font-semibold text-[var(--cortex-text-primary)]">
          Report Generation
        </h3>
      </div>

      {filteredReports.length === 0 ? (
        <p className="py-4 text-center text-sm text-[var(--cortex-text-muted)]" data-testid="no-reports">
          No report types available.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredReports.map((report) => {
            const allPrereqsMet = report.prerequisites.missing.length === 0;
            return (
              <div
                key={report.type}
                className="rounded-lg border border-[var(--cortex-border)] p-4"
                data-testid={`report-card-${report.type}`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-[var(--cortex-text-primary)]">
                    {REPORT_LABELS[report.type] ?? report.type}
                  </h4>
                  {allPrereqsMet ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600" data-testid="prerequisites-ok">
                      <CheckCircle size={12} /> Ready
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-red-600" data-testid="prerequisites-missing">
                      <XCircle size={12} /> Prerequisites missing
                    </span>
                  )}
                </div>

                {report.prerequisites.missing.length > 0 && (
                  <div className="mb-3 space-y-1">
                    {report.prerequisites.missing.map((item, idx) => (
                      <p key={idx} className="text-xs text-red-600">- {item}</p>
                    ))}
                  </div>
                )}

                {report.lastGenerated && (
                  <div className="mb-3 flex items-center justify-between rounded bg-[#F8F9FA] p-2 text-xs">
                    <div className="flex items-center gap-1 text-[var(--cortex-text-muted)]">
                      <Clock size={10} />
                      Last: {report.lastGenerated.generatedAt}
                    </div>
                    <a
                      href={report.lastGenerated.downloadUrl}
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                      data-testid="download-btn"
                    >
                      <Download size={10} /> Download
                    </a>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleGenerate(report.type)}
                  disabled={!allPrereqsMet || generating}
                  className="w-full rounded bg-[var(--cortex-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="generate-btn"
                >
                  {generating ? 'Generating...' : 'Generate Report'}
                </button>

                {report.history.length > 0 && (
                  <div className="mt-3 space-y-1" data-testid="report-history">
                    <p className="text-xs font-medium text-[var(--cortex-text-muted)]">History</p>
                    {report.history.map((h) => (
                      <div key={h.id} className="flex justify-between text-xs text-[var(--cortex-text-muted)]">
                        <span>{h.generatedAt}</span>
                        <span>{h.generatedBy}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
