import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReportViewer } from './ReportViewer';

const mockReport = {
  id: 'report-1',
  title: 'Clinical Validation Report',
  type: 'CLINICAL_VALIDATION',
  format: 'docx',
  generatedAt: '2026-02-15T10:30:00Z',
  downloadUrl: 'https://example.com/reports/report-1.docx',
};

describe('ReportViewer', () => {
  it('renders report metadata', () => {
    render(<ReportViewer report={mockReport} />);

    expect(screen.getByTestId('report-title')).toHaveTextContent('Clinical Validation Report');
    expect(screen.getByTestId('report-type')).toHaveTextContent('CLINICAL VALIDATION');
    expect(screen.getByTestId('report-format')).toHaveTextContent('DOCX');
    expect(screen.getByTestId('report-date')).toBeInTheDocument();
  });

  it('renders download button', () => {
    render(<ReportViewer report={mockReport} />);

    const downloadBtn = screen.getByTestId('download-btn');
    expect(downloadBtn).toBeInTheDocument();
    expect(downloadBtn).toHaveTextContent('Download DOCX');
  });

  it('calls onDownload when download clicked', () => {
    const onDownload = vi.fn();
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(<ReportViewer report={mockReport} onDownload={onDownload} />);

    fireEvent.click(screen.getByTestId('download-btn'));

    expect(windowOpenSpy).toHaveBeenCalledWith(mockReport.downloadUrl, '_blank');
    expect(onDownload).toHaveBeenCalledWith('report-1');

    windowOpenSpy.mockRestore();
  });

  it('shows no preview message when no preview url', () => {
    render(<ReportViewer report={mockReport} />);

    expect(screen.getByTestId('no-preview-msg')).toBeInTheDocument();
  });

  it('renders preview panel when preview url provided', () => {
    const reportWithPreview = {
      ...mockReport,
      previewUrl: 'https://example.com/preview/report-1',
    };

    render(<ReportViewer report={reportWithPreview} />);

    expect(screen.getByTestId('preview-panel')).toBeInTheDocument();
  });

  it('formats date correctly', () => {
    render(<ReportViewer report={mockReport} />);

    const dateElement = screen.getByTestId('report-date');
    expect(dateElement).toBeInTheDocument();
    expect(dateElement.textContent).toMatch(/February|Feb/);
  });

  it('replaces underscores in report type', () => {
    render(<ReportViewer report={mockReport} />);

    expect(screen.getByTestId('report-type')).toHaveTextContent('CLINICAL VALIDATION');
  });
});
