import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

import { ReportGenerator } from './ReportGenerator';

const mockReportsData = {
  validationReports: {
    reports: [
      {
        type: 'VALIDATION_REPORT',
        available: true,
        prerequisites: { met: ['Protocol approved', 'Data imported'], missing: [] },
        lastGenerated: { id: 'rpt-1', generatedAt: '2026-02-14', downloadUrl: '/reports/rpt-1.pdf' },
        history: [
          { id: 'h-1', generatedAt: '2026-02-14', generatedBy: 'Dr. Smith' },
          { id: 'h-2', generatedAt: '2026-02-10', generatedBy: 'Dr. Jones' },
        ],
      },
      {
        type: 'CLINICAL_BENEFIT',
        available: true,
        prerequisites: { met: ['Protocol approved'], missing: ['Results computed'] },
        lastGenerated: null,
        history: [],
      },
    ],
    studyType: 'MRMC',
  },
};

const standaloneReportsData = {
  validationReports: {
    ...mockReportsData.validationReports,
    studyType: 'STANDALONE',
  },
};

describe('ReportGenerator', () => {
  const mockGenerate = vi.fn().mockResolvedValue({
    data: { generateValidationReport: { reportId: 'rpt-new', status: 'GENERATING' } },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([mockGenerate, { loading: false }]);
  });

  it('renders the report generator', () => {
    mockUseQuery.mockReturnValue({ data: mockReportsData, loading: false });
    render(<ReportGenerator studyId="study-1" />);

    expect(screen.getByTestId('report-generator')).toBeInTheDocument();
  });

  it('displays report cards for MRMC study', () => {
    mockUseQuery.mockReturnValue({ data: mockReportsData, loading: false });
    render(<ReportGenerator studyId="study-1" />);

    expect(screen.getByTestId('report-card-VALIDATION_REPORT')).toBeInTheDocument();
    expect(screen.getByTestId('report-card-CLINICAL_BENEFIT')).toBeInTheDocument();
  });

  it('hides clinical benefit report for standalone study', () => {
    mockUseQuery.mockReturnValue({ data: standaloneReportsData, loading: false });
    render(<ReportGenerator studyId="study-1" />);

    expect(screen.getByTestId('report-card-VALIDATION_REPORT')).toBeInTheDocument();
    expect(screen.queryByTestId('report-card-CLINICAL_BENEFIT')).not.toBeInTheDocument();
  });

  it('shows prerequisites ok when all met', () => {
    mockUseQuery.mockReturnValue({ data: mockReportsData, loading: false });
    render(<ReportGenerator studyId="study-1" />);

    expect(screen.getByTestId('prerequisites-ok')).toBeInTheDocument();
  });

  it('shows prerequisites missing when some missing', () => {
    mockUseQuery.mockReturnValue({ data: mockReportsData, loading: false });
    render(<ReportGenerator studyId="study-1" />);

    expect(screen.getByTestId('prerequisites-missing')).toBeInTheDocument();
  });

  it('shows download link when report generated', () => {
    mockUseQuery.mockReturnValue({ data: mockReportsData, loading: false });
    render(<ReportGenerator studyId="study-1" />);

    expect(screen.getByTestId('download-btn')).toBeInTheDocument();
  });

  it('shows report history', () => {
    mockUseQuery.mockReturnValue({ data: mockReportsData, loading: false });
    render(<ReportGenerator studyId="study-1" />);

    expect(screen.getByTestId('report-history')).toBeInTheDocument();
  });

  it('shows generate buttons', () => {
    mockUseQuery.mockReturnValue({ data: mockReportsData, loading: false });
    render(<ReportGenerator studyId="study-1" />);

    const generateButtons = screen.getAllByTestId('generate-btn');
    expect(generateButtons.length).toBe(2);
  });

  it('disables generate button when prerequisites missing', () => {
    mockUseQuery.mockReturnValue({ data: mockReportsData, loading: false });
    render(<ReportGenerator studyId="study-1" />);

    const generateButtons = screen.getAllByTestId('generate-btn');
    // CLINICAL_BENEFIT card has missing prerequisites
    expect(generateButtons[1]).toBeDisabled();
  });

  it('calls generate mutation on click', async () => {
    mockUseQuery.mockReturnValue({ data: mockReportsData, loading: false });
    render(<ReportGenerator studyId="study-1" />);

    const generateButtons = screen.getAllByTestId('generate-btn');
    fireEvent.click(generateButtons[0]);

    await waitFor(() => {
      expect(mockGenerate).toHaveBeenCalledWith({
        variables: { studyId: 'study-1', reportType: 'VALIDATION_REPORT' },
      });
    });
  });

  it('shows loading state', () => {
    mockUseQuery.mockReturnValue({ data: null, loading: true });
    render(<ReportGenerator studyId="study-1" />);

    expect(screen.getByTestId('reports-loading')).toBeInTheDocument();
  });
});
