import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@apollo/client', () => ({
  gql: (str: TemplateStringsArray) => str[0],
}));

const mockUseMutation = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

import { QualityAssessmentForm } from './QualityAssessmentForm';

describe('QualityAssessmentForm', () => {
  const mockSubmit = vi.fn().mockResolvedValue({
    data: {
      assessQuality: {
        qualityAssessmentId: 'qa-1',
        assessmentType: 'QUADAS_2',
        dataContributionLevel: 'SUPPORTIVE',
      },
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([mockSubmit, { loading: false }]);
  });

  const defaultProps = {
    soaAnalysisId: 'soa-1',
    articleId: 'art-1',
  };

  it('renders the quality assessment form', () => {
    render(<QualityAssessmentForm {...defaultProps} />);

    expect(screen.getByTestId('quality-form')).toBeInTheDocument();
    expect(screen.getByTestId('assessment-type-select')).toBeInTheDocument();
    expect(screen.getByTestId('contribution-level-select')).toBeInTheDocument();
    expect(screen.getByTestId('submit-assessment-btn')).toBeInTheDocument();
  });

  it('allows selecting assessment type', () => {
    render(<QualityAssessmentForm {...defaultProps} />);

    const select = screen.getByTestId('assessment-type-select');
    fireEvent.change(select, { target: { value: 'QUADAS_2' } });

    expect(select).toHaveValue('QUADAS_2');
  });

  it('allows selecting contribution level', () => {
    render(<QualityAssessmentForm {...defaultProps} />);

    const select = screen.getByTestId('contribution-level-select');
    fireEvent.change(select, { target: { value: 'PIVOTAL' } });

    expect(select).toHaveValue('PIVOTAL');
  });

  it('calls mutation on submit with correct variables', async () => {
    render(<QualityAssessmentForm {...defaultProps} />);

    fireEvent.change(screen.getByTestId('assessment-type-select'), {
      target: { value: 'QUADAS_2' },
    });
    fireEvent.change(screen.getByTestId('contribution-level-select'), {
      target: { value: 'SUPPORTIVE' },
    });
    fireEvent.click(screen.getByTestId('submit-assessment-btn'));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: {
            soaAnalysisId: 'soa-1',
            articleId: 'art-1',
            assessmentType: 'QUADAS_2',
            assessmentData: {},
            dataContributionLevel: 'SUPPORTIVE',
          },
        }),
      );
    });
  });

  it('shows loading state during submission', () => {
    mockUseMutation.mockReturnValue([mockSubmit, { loading: true }]);
    render(<QualityAssessmentForm {...defaultProps} />);

    expect(screen.getByTestId('submit-assessment-btn')).toHaveTextContent('Submitting...');
    expect(screen.getByTestId('submit-assessment-btn')).toBeDisabled();
  });

  it('disables form elements when locked', () => {
    render(<QualityAssessmentForm {...defaultProps} locked />);

    expect(screen.getByTestId('assessment-type-select')).toBeDisabled();
    expect(screen.getByTestId('contribution-level-select')).toBeDisabled();
    expect(screen.getByTestId('assessment-notes')).toBeDisabled();
    expect(screen.getByTestId('submit-assessment-btn')).toBeDisabled();
  });

  it('disables submit when fields are empty', () => {
    render(<QualityAssessmentForm {...defaultProps} />);

    expect(screen.getByTestId('submit-assessment-btn')).toBeDisabled();
  });
});
