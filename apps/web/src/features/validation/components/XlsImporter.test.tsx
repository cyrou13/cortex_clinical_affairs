import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseMutation = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

import { XlsImporter } from './XlsImporter';

describe('XlsImporter', () => {
  const mockUpload = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([mockUpload, { loading: false }]);
  });

  it('renders the importer', () => {
    render(<XlsImporter studyId="study-1" />);

    expect(screen.getByTestId('xls-importer')).toBeInTheDocument();
    expect(screen.getByTestId('drop-zone')).toBeInTheDocument();
  });

  it('does not show file info initially', () => {
    render(<XlsImporter studyId="study-1" />);

    expect(screen.queryByTestId('file-info')).not.toBeInTheDocument();
    expect(screen.queryByTestId('upload-btn')).not.toBeInTheDocument();
  });

  it('shows file info after file selection', () => {
    render(<XlsImporter studyId="study-1" />);

    const file = new File(['data'], 'test.xlsx', { type: 'application/vnd.ms-excel' });
    const input = screen.getByTestId('file-input');
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByTestId('file-info')).toBeInTheDocument();
    expect(screen.getByText('test.xlsx')).toBeInTheDocument();
    expect(screen.getByTestId('upload-btn')).toBeInTheDocument();
  });

  it('shows validation success after successful upload', async () => {
    mockUpload.mockResolvedValue({
      data: {
        uploadXls: {
          importId: 'imp-1',
          version: 1,
          rowCount: 50,
          validation: { valid: true, errors: [], warnings: [] },
        },
      },
    });

    render(<XlsImporter studyId="study-1" />);

    const file = new File(['data'], 'test.xlsx', { type: 'application/vnd.ms-excel' });
    fireEvent.change(screen.getByTestId('file-input'), { target: { files: [file] } });
    fireEvent.click(screen.getByTestId('upload-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('validation-success')).toBeInTheDocument();
    });
  });

  it('shows validation errors after failed upload', async () => {
    mockUpload.mockResolvedValue({
      data: {
        uploadXls: {
          importId: 'imp-1',
          version: 1,
          rowCount: 0,
          validation: {
            valid: false,
            errors: ['Missing required column: PatientID', 'Invalid date format in row 5'],
            warnings: [],
          },
        },
      },
    });

    render(<XlsImporter studyId="study-1" />);

    const file = new File(['data'], 'test.xlsx', { type: 'application/vnd.ms-excel' });
    fireEvent.change(screen.getByTestId('file-input'), { target: { files: [file] } });
    fireEvent.click(screen.getByTestId('upload-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('validation-errors')).toBeInTheDocument();
      expect(screen.getByText('Missing required column: PatientID')).toBeInTheDocument();
    });
  });

  it('shows validation warnings', async () => {
    mockUpload.mockResolvedValue({
      data: {
        uploadXls: {
          importId: 'imp-1',
          version: 1,
          rowCount: 50,
          validation: {
            valid: true,
            errors: [],
            warnings: ['Some rows have empty optional fields'],
          },
        },
      },
    });

    render(<XlsImporter studyId="study-1" />);

    const file = new File(['data'], 'test.xlsx', { type: 'application/vnd.ms-excel' });
    fireEvent.change(screen.getByTestId('file-input'), { target: { files: [file] } });
    fireEvent.click(screen.getByTestId('upload-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('validation-warnings')).toBeInTheDocument();
      expect(screen.getByText('Some rows have empty optional fields')).toBeInTheDocument();
    });
  });

  it('calls onUploaded callback on success', async () => {
    mockUpload.mockResolvedValue({
      data: {
        uploadXls: {
          importId: 'imp-1',
          version: 1,
          rowCount: 50,
          validation: { valid: true, errors: [], warnings: [] },
        },
      },
    });

    const onUploaded = vi.fn();
    render(<XlsImporter studyId="study-1" onUploaded={onUploaded} />);

    const file = new File(['data'], 'test.xlsx', { type: 'application/vnd.ms-excel' });
    fireEvent.change(screen.getByTestId('file-input'), { target: { files: [file] } });
    fireEvent.click(screen.getByTestId('upload-btn'));

    await waitFor(() => {
      expect(onUploaded).toHaveBeenCalledWith('imp-1');
    });
  });

  it('handles drag and drop', () => {
    render(<XlsImporter studyId="study-1" />);

    const dropZone = screen.getByTestId('drop-zone');
    const file = new File(['data'], 'dropped.xlsx', { type: 'application/vnd.ms-excel' });

    fireEvent.dragOver(dropZone);
    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });

    expect(screen.getByTestId('file-info')).toBeInTheDocument();
    expect(screen.getByText('dropped.xlsx')).toBeInTheDocument();
  });
});
