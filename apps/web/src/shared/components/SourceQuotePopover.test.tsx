import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SourceQuotePopover } from './SourceQuotePopover';

describe('SourceQuotePopover', () => {
  it('renders trigger element', () => {
    render(
      <SourceQuotePopover sourceQuote="test quote">
        <span>Cell value</span>
      </SourceQuotePopover>,
    );
    expect(screen.getByTestId('source-quote-trigger')).toBeInTheDocument();
  });

  it('does not show popover initially', () => {
    render(
      <SourceQuotePopover sourceQuote="test quote">
        <span>Cell value</span>
      </SourceQuotePopover>,
    );
    expect(screen.queryByTestId('source-quote-popover')).not.toBeInTheDocument();
  });

  it('shows popover on focus', () => {
    render(
      <SourceQuotePopover sourceQuote="test quote">
        <span>Cell value</span>
      </SourceQuotePopover>,
    );
    fireEvent.focus(screen.getByTestId('source-quote-trigger'));
    expect(screen.getByTestId('source-quote-popover')).toBeInTheDocument();
  });

  it('shows source quote text', () => {
    render(
      <SourceQuotePopover sourceQuote="significant clinical improvement">
        <span>Value</span>
      </SourceQuotePopover>,
    );
    fireEvent.focus(screen.getByTestId('source-quote-trigger'));
    expect(screen.getByTestId('quote-text')).toHaveTextContent('significant clinical improvement');
  });

  it('shows article reference', () => {
    render(
      <SourceQuotePopover sourceQuote="quote" articleReference="Smith et al., 2024">
        <span>Value</span>
      </SourceQuotePopover>,
    );
    fireEvent.focus(screen.getByTestId('source-quote-trigger'));
    expect(screen.getByTestId('article-ref')).toHaveTextContent('Smith et al., 2024');
  });

  it('shows page number', () => {
    render(
      <SourceQuotePopover sourceQuote="quote" pageNumber={5}>
        <span>Value</span>
      </SourceQuotePopover>,
    );
    fireEvent.focus(screen.getByTestId('source-quote-trigger'));
    expect(screen.getByTestId('page-number')).toHaveTextContent('Page 5');
  });

  it('shows View in PDF button when pdfUrl provided', () => {
    render(
      <SourceQuotePopover sourceQuote="quote" pdfUrl="/pdf-viewer?articleId=art-1&page=5">
        <span>Value</span>
      </SourceQuotePopover>,
    );
    fireEvent.focus(screen.getByTestId('source-quote-trigger'));
    expect(screen.getByTestId('view-in-pdf-btn')).toBeInTheDocument();
  });

  it('hides View in PDF button when no pdfUrl', () => {
    render(
      <SourceQuotePopover sourceQuote="quote">
        <span>Value</span>
      </SourceQuotePopover>,
    );
    fireEvent.focus(screen.getByTestId('source-quote-trigger'));
    expect(screen.queryByTestId('view-in-pdf-btn')).not.toBeInTheDocument();
  });

  it('shows no quote message when sourceQuote is null', () => {
    render(
      <SourceQuotePopover sourceQuote={null}>
        <span>Value</span>
      </SourceQuotePopover>,
    );
    fireEvent.focus(screen.getByTestId('source-quote-trigger'));
    expect(screen.getByTestId('no-quote-msg')).toBeInTheDocument();
  });

  it('hides popover on blur', () => {
    render(
      <SourceQuotePopover sourceQuote="quote">
        <span>Value</span>
      </SourceQuotePopover>,
    );
    fireEvent.focus(screen.getByTestId('source-quote-trigger'));
    expect(screen.getByTestId('source-quote-popover')).toBeInTheDocument();
    fireEvent.blur(screen.getByTestId('source-quote-trigger'));
    expect(screen.queryByTestId('source-quote-popover')).not.toBeInTheDocument();
  });

  it('has role tooltip', () => {
    render(
      <SourceQuotePopover sourceQuote="quote">
        <span>Value</span>
      </SourceQuotePopover>,
    );
    fireEvent.focus(screen.getByTestId('source-quote-trigger'));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });
});
