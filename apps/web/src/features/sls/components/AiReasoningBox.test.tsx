import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { AiReasoningBox } from './AiReasoningBox';

describe('AiReasoningBox', () => {
  const defaultProps = {
    score: 85,
    reasoning:
      'This article discusses the efficacy of a medical device in a clinical trial setting, which is directly relevant to the scope of this literature search.',
    exclusionCode: null,
    category: 'Clinical Efficacy',
  };

  it('renders score badge with correct value', () => {
    render(<AiReasoningBox {...defaultProps} />);

    const badge = screen.getByTestId('ai-score-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('AI Score: 85');
  });

  it('shows green badge for high scores (>=75)', () => {
    render(<AiReasoningBox {...defaultProps} score={85} />);

    const badge = screen.getByTestId('ai-score-badge');
    expect(badge.className).toContain('bg-emerald-100');
    expect(badge.className).toContain('text-emerald-700');
  });

  it('shows orange badge for medium scores (40-74)', () => {
    render(<AiReasoningBox {...defaultProps} score={55} />);

    const badge = screen.getByTestId('ai-score-badge');
    expect(badge.className).toContain('bg-orange-100');
    expect(badge.className).toContain('text-orange-700');
  });

  it('shows red badge for low scores (<40)', () => {
    render(<AiReasoningBox {...defaultProps} score={20} />);

    const badge = screen.getByTestId('ai-score-badge');
    expect(badge.className).toContain('bg-red-100');
    expect(badge.className).toContain('text-red-700');
  });

  it('shows score label: Likely Relevant for high scores', () => {
    render(<AiReasoningBox {...defaultProps} score={80} />);

    expect(screen.getByTestId('ai-score-label')).toHaveTextContent('Likely Relevant');
  });

  it('shows score label: Uncertain for medium scores', () => {
    render(<AiReasoningBox {...defaultProps} score={50} />);

    expect(screen.getByTestId('ai-score-label')).toHaveTextContent('Uncertain');
  });

  it('shows score label: Likely Irrelevant for low scores', () => {
    render(<AiReasoningBox {...defaultProps} score={15} />);

    expect(screen.getByTestId('ai-score-label')).toHaveTextContent('Likely Irrelevant');
  });

  it('renders reasoning text in styled box', () => {
    render(<AiReasoningBox {...defaultProps} />);

    const reasoningBox = screen.getByTestId('ai-reasoning-text');
    expect(reasoningBox).toBeInTheDocument();
    expect(reasoningBox.className).toContain('bg-blue-50');
    expect(reasoningBox.className).toContain('border-l-blue-400');
    expect(reasoningBox).toHaveTextContent(defaultProps.reasoning);
  });

  it('renders category label', () => {
    render(<AiReasoningBox {...defaultProps} />);

    expect(screen.getByTestId('ai-category')).toHaveTextContent('Clinical Efficacy');
  });

  it('renders exclusion code when present', () => {
    render(<AiReasoningBox {...defaultProps} score={15} exclusionCode="E1-Wrong Population" />);

    const exclusion = screen.getByTestId('ai-exclusion-code');
    expect(exclusion).toBeInTheDocument();
    expect(exclusion).toHaveTextContent('E1-Wrong Population');
  });

  it('does not render exclusion code when null', () => {
    render(<AiReasoningBox {...defaultProps} exclusionCode={null} />);

    expect(screen.queryByTestId('ai-exclusion-code')).not.toBeInTheDocument();
  });

  it('shows empty state when score and reasoning are both null', () => {
    render(<AiReasoningBox score={null} reasoning={null} exclusionCode={null} category={null} />);

    expect(screen.getByTestId('ai-no-score')).toHaveTextContent('No AI scoring data available');
  });

  it('renders without category when null', () => {
    render(<AiReasoningBox {...defaultProps} category={null} />);

    expect(screen.queryByTestId('ai-category')).not.toBeInTheDocument();
  });

  it('renders reasoning even with null score', () => {
    render(
      <AiReasoningBox
        score={null}
        reasoning="Some reasoning text"
        exclusionCode={null}
        category={null}
      />,
    );

    expect(screen.getByTestId('ai-reasoning-text')).toHaveTextContent('Some reasoning text');
    expect(screen.queryByTestId('ai-score-badge')).not.toBeInTheDocument();
  });

  it('renders score with null reasoning', () => {
    render(<AiReasoningBox score={90} reasoning={null} exclusionCode={null} category={null} />);

    expect(screen.getByTestId('ai-score-badge')).toHaveTextContent('AI Score: 90');
    expect(screen.queryByTestId('ai-reasoning-text')).not.toBeInTheDocument();
  });

  it('renders at boundary score 75 as Likely Relevant', () => {
    render(<AiReasoningBox {...defaultProps} score={75} />);

    expect(screen.getByTestId('ai-score-label')).toHaveTextContent('Likely Relevant');
    const badge = screen.getByTestId('ai-score-badge');
    expect(badge.className).toContain('bg-emerald-100');
  });

  it('renders at boundary score 40 as Uncertain', () => {
    render(<AiReasoningBox {...defaultProps} score={40} />);

    expect(screen.getByTestId('ai-score-label')).toHaveTextContent('Uncertain');
    const badge = screen.getByTestId('ai-score-badge');
    expect(badge.className).toContain('bg-orange-100');
  });

  it('renders at boundary score 39 as Likely Irrelevant', () => {
    render(<AiReasoningBox {...defaultProps} score={39} />);

    expect(screen.getByTestId('ai-score-label')).toHaveTextContent('Likely Irrelevant');
    const badge = screen.getByTestId('ai-score-badge');
    expect(badge.className).toContain('bg-red-100');
  });
});
