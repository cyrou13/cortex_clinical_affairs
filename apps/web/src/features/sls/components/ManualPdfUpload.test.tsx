import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ManualPdfUpload } from './ManualPdfUpload';

describe('ManualPdfUpload', () => {
  const mockOnUpload = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnUpload.mockResolvedValue({
      pdfStatus: 'VERIFIED',
      verification: { verified: true, mismatchReasons: [] },
    });
  });

  it('renders upload zone', () => {
    render(<ManualPdfUpload articleId="art-1" onUpload={mockOnUpload} />);

    expect(screen.getByTestId('manual-pdf-upload')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-drop-zone')).toBeInTheDocument();
  });

  it('shows file input', () => {
    render(<ManualPdfUpload articleId="art-1" onUpload={mockOnUpload} />);

    expect(screen.getByTestId('pdf-file-input')).toBeInTheDocument();
  });

  it('shows error for non-PDF file', async () => {
    render(<ManualPdfUpload articleId="art-1" onUpload={mockOnUpload} />);

    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByTestId('pdf-file-input');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId('upload-error')).toHaveTextContent('Only PDF files are accepted');
    });
  });

  it('calls onUpload with PDF file', async () => {
    render(<ManualPdfUpload articleId="art-1" onUpload={mockOnUpload} />);

    const file = new File(['%PDF content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByTestId('pdf-file-input');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith(file);
    });
  });

  it('shows verified result', async () => {
    render(<ManualPdfUpload articleId="art-1" onUpload={mockOnUpload} />);

    const file = new File(['%PDF content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByTestId('pdf-file-input');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId('upload-result')).toHaveTextContent('PDF verified successfully');
    });
  });

  it('shows mismatch result', async () => {
    mockOnUpload.mockResolvedValue({
      pdfStatus: 'MISMATCH',
      verification: { verified: false, mismatchReasons: ['Title mismatch: expected "A", found "B"'] },
    });
    render(<ManualPdfUpload articleId="art-1" onUpload={mockOnUpload} />);

    const file = new File(['%PDF content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByTestId('pdf-file-input');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId('upload-result')).toHaveTextContent('PDF mismatch detected');
    });
  });

  it('shows upload error on failure', async () => {
    mockOnUpload.mockRejectedValue(new Error('Network error'));
    render(<ManualPdfUpload articleId="art-1" onUpload={mockOnUpload} />);

    const file = new File(['%PDF content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByTestId('pdf-file-input');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId('upload-error')).toHaveTextContent('Network error');
    });
  });
});
