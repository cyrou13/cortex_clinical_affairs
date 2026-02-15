import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AiConfidenceIndicator } from './AiConfidenceIndicator';

describe('AiConfidenceIndicator', () => {
  it('renders HIGH confidence badge', () => {
    render(<AiConfidenceIndicator confidenceLevel="HIGH" />);
    expect(screen.getByTestId('confidence-level-badge')).toHaveTextContent('H');
  });

  it('renders MEDIUM confidence badge', () => {
    render(<AiConfidenceIndicator confidenceLevel="MEDIUM" />);
    expect(screen.getByTestId('confidence-level-badge')).toHaveTextContent('M');
  });

  it('renders LOW confidence badge', () => {
    render(<AiConfidenceIndicator confidenceLevel="LOW" />);
    expect(screen.getByTestId('confidence-level-badge')).toHaveTextContent('L');
  });

  it('renders UNSCORED confidence badge', () => {
    render(<AiConfidenceIndicator confidenceLevel="UNSCORED" />);
    expect(screen.getByTestId('confidence-level-badge')).toHaveTextContent('?');
  });

  it('shows validation overlay for VALIDATED', () => {
    render(<AiConfidenceIndicator confidenceLevel="HIGH" validationStatus="VALIDATED" />);
    expect(screen.getByTestId('validation-overlay')).toBeInTheDocument();
  });

  it('shows validation overlay for CORRECTED', () => {
    render(<AiConfidenceIndicator confidenceLevel="MEDIUM" validationStatus="CORRECTED" />);
    expect(screen.getByTestId('validation-overlay')).toBeInTheDocument();
  });

  it('shows validation overlay for FLAGGED', () => {
    render(<AiConfidenceIndicator confidenceLevel="LOW" validationStatus="FLAGGED" />);
    expect(screen.getByTestId('validation-overlay')).toBeInTheDocument();
  });

  it('does not show overlay for PENDING', () => {
    render(<AiConfidenceIndicator confidenceLevel="HIGH" validationStatus="PENDING" />);
    expect(screen.queryByTestId('validation-overlay')).not.toBeInTheDocument();
  });

  it('has accessible aria-label', () => {
    render(<AiConfidenceIndicator confidenceLevel="HIGH" confidenceScore={92} />);
    expect(screen.getByTestId('ai-confidence-indicator')).toHaveAttribute(
      'aria-label',
      'AI confidence: HIGH (92%)',
    );
  });

  it('renders indicator wrapper', () => {
    render(<AiConfidenceIndicator confidenceLevel="HIGH" />);
    expect(screen.getByTestId('ai-confidence-indicator')).toBeInTheDocument();
  });
});
