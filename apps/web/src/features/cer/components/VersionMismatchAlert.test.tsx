import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { VersionMismatchAlert } from './VersionMismatchAlert';

describe('VersionMismatchAlert', () => {
  const defaultProps = {
    documentName: 'IFU Document',
    oldVersion: '1.0',
    newVersion: '2.0',
    impactedSectionsCount: 3,
  };

  it('renders the alert container', () => {
    render(<VersionMismatchAlert {...defaultProps} />);
    expect(screen.getByTestId('version-mismatch-alert')).toBeInTheDocument();
  });

  it('shows document name', () => {
    render(<VersionMismatchAlert {...defaultProps} />);
    expect(screen.getByTestId('mismatch-doc-name')).toHaveTextContent('IFU Document');
  });

  it('shows version mismatch info', () => {
    render(<VersionMismatchAlert {...defaultProps} />);
    expect(screen.getByText(/v1\.0/)).toBeInTheDocument();
    expect(screen.getByText(/v2\.0/)).toBeInTheDocument();
  });

  it('shows impacted sections count', () => {
    render(<VersionMismatchAlert {...defaultProps} />);
    expect(screen.getByTestId('impacted-count')).toHaveTextContent('3 sections impacted');
  });

  it('shows singular form for 1 section', () => {
    render(<VersionMismatchAlert {...defaultProps} impactedSectionsCount={1} />);
    expect(screen.getByTestId('impacted-count')).toHaveTextContent('1 section impacted');
  });

  it('calls onReviewImpacted when review button clicked', () => {
    const onReview = vi.fn();
    render(<VersionMismatchAlert {...defaultProps} onReviewImpacted={onReview} />);
    fireEvent.click(screen.getByTestId('review-btn'));
    expect(onReview).toHaveBeenCalled();
  });
});
