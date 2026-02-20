import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseMutation = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

const mockNavigate = vi.fn();

vi.mock('../../../router', () => ({
  navigate: (...args: unknown[]) => mockNavigate(...args),
}));

import { ImportSoaDialog } from './ImportSoaDialog';

describe('ImportSoaDialog', () => {
  const mockImport = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([mockImport, { loading: false }]);
  });

  it('does not render when open is false', () => {
    render(<ImportSoaDialog projectId="p-1" open={false} onClose={mockOnClose} />);
    expect(screen.queryByTestId('import-soa-dialog')).not.toBeInTheDocument();
  });

  it('renders dialog when open is true', () => {
    render(<ImportSoaDialog projectId="p-1" open={true} onClose={mockOnClose} />);
    expect(screen.getByTestId('import-soa-dialog')).toBeInTheDocument();
  });

  it('shows the file input and drop zone', () => {
    render(<ImportSoaDialog projectId="p-1" open={true} onClose={mockOnClose} />);
    expect(screen.getByTestId('drop-zone')).toBeInTheDocument();
    expect(screen.getByTestId('file-input')).toBeInTheDocument();
  });

  it('submit button is disabled when no file is selected', () => {
    render(<ImportSoaDialog projectId="p-1" open={true} onClose={mockOnClose} />);
    expect(screen.getByTestId('submit-import')).toBeDisabled();
  });

  it('shows error for invalid file format (.txt)', () => {
    render(<ImportSoaDialog projectId="p-1" open={true} onClose={mockOnClose} />);

    const input = screen.getByTestId('file-input');
    const txtFile = new File(['content'], 'document.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [txtFile] } });

    expect(screen.getByTestId('error-message')).toBeInTheDocument();
    expect(screen.getByTestId('error-message')).toHaveTextContent('Format non supporté');
  });

  it('does not show error for valid PDF file', () => {
    render(<ImportSoaDialog projectId="p-1" open={true} onClose={mockOnClose} />);

    const input = screen.getByTestId('file-input');
    const pdfFile = new File(['content'], 'document.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [pdfFile] } });

    expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
  });

  it('shows selected file name after valid file selection', () => {
    render(<ImportSoaDialog projectId="p-1" open={true} onClose={mockOnClose} />);

    const input = screen.getByTestId('file-input');
    const pdfFile = new File(['content'], 'my-soa.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [pdfFile] } });

    expect(screen.getByText('my-soa.pdf')).toBeInTheDocument();
  });

  it('enables submit button after valid file selection', () => {
    render(<ImportSoaDialog projectId="p-1" open={true} onClose={mockOnClose} />);

    const input = screen.getByTestId('file-input');
    const pdfFile = new File(['content'], 'document.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [pdfFile] } });

    expect(screen.getByTestId('submit-import')).not.toBeDisabled();
  });

  it('calls onClose when close button is clicked', () => {
    render(<ImportSoaDialog projectId="p-1" open={true} onClose={mockOnClose} />);
    fireEvent.click(screen.getByTestId('close-dialog'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls mutation and navigates on submit', async () => {
    mockImport.mockResolvedValue({
      data: { importSoaDocument: { importId: 'import-42', taskId: 'task-1' } },
    });

    // Capture the mutation's onCompleted so we can invoke it
    let capturedOnCompleted: ((data: unknown) => void) | undefined;
    mockUseMutation.mockImplementation(
      (_query: unknown, opts?: { onCompleted?: (data: unknown) => void }) => {
        capturedOnCompleted = opts?.onCompleted;
        return [mockImport, { loading: false }];
      },
    );

    render(<ImportSoaDialog projectId="p-1" open={true} onClose={mockOnClose} />);

    // Select a valid file
    const input = screen.getByTestId('file-input');
    const pdfFile = new File(['%PDF-1.4 content'], 'soa.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [pdfFile] } });

    // Mock FileReader to call onload synchronously
    const originalFileReader = globalThis.FileReader;
    const mockFileReader = {
      readAsDataURL: vi.fn().mockImplementation(function (this: { onload: () => void }) {
        this.result = 'data:application/pdf;base64,AAAA';
        this.onload?.();
      }),
      result: '',
      onload: null as unknown,
    };
    globalThis.FileReader = vi.fn(() => mockFileReader) as unknown as typeof FileReader;

    fireEvent.click(screen.getByTestId('submit-import'));

    await waitFor(() => {
      expect(mockImport).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            projectId: 'p-1',
            fileName: 'soa.pdf',
            fileFormat: 'PDF',
          }),
        }),
      );
    });

    // Simulate onCompleted callback
    if (capturedOnCompleted) {
      capturedOnCompleted({ importSoaDocument: { importId: 'import-42', taskId: 'task-1' } });
      expect(mockOnClose).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/projects/p-1/soa/import/import-42');
    }

    globalThis.FileReader = originalFileReader;
  });

  it('shows error when mutation fails', async () => {
    let capturedOnError: ((err: Error) => void) | undefined;
    mockUseMutation.mockImplementation(
      (_query: unknown, opts?: { onError?: (err: Error) => void }) => {
        capturedOnError = opts?.onError;
        return [mockImport, { loading: false }];
      },
    );

    render(<ImportSoaDialog projectId="p-1" open={true} onClose={mockOnClose} />);

    // Trigger onError callback directly, wrapped in act to satisfy React state updates
    if (capturedOnError) {
      await act(async () => {
        capturedOnError!(new Error('Upload failed'));
      });
      expect(screen.getByTestId('error-message')).toHaveTextContent('Upload failed');
    }
  });
});
