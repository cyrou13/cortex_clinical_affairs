import { useState, useRef, useCallback, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';

interface SourceQuotePopoverProps {
  sourceQuote: string | null;
  articleReference?: string;
  pageNumber?: number | null;
  pdfUrl?: string | null;
  children: React.ReactNode;
}

export function SourceQuotePopover({
  sourceQuote,
  articleReference,
  pageNumber,
  pdfUrl,
  children,
}: SourceQuotePopoverProps) {
  const [visible, setVisible] = useState(false);
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Cleanup timeout on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
    };
  }, []);

  const handleMouseEnter = useCallback(() => {
    showTimeoutRef.current = setTimeout(() => setVisible(true), 200);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
    setVisible(false);
  }, []);

  return (
    <span
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      tabIndex={0}
      data-testid="source-quote-trigger"
    >
      {children}

      {visible && (
        <div
          className="absolute bottom-full left-0 z-20 mb-2 w-64 rounded-lg border-l-[3px] border-l-blue-400 bg-blue-50 p-3 shadow-lg"
          role="tooltip"
          data-testid="source-quote-popover"
        >
          {sourceQuote ? (
            <>
              <p className="text-sm italic text-[var(--cortex-text-primary)]" data-testid="quote-text">
                "{sourceQuote}"
              </p>
              {articleReference && (
                <p className="mt-1 text-xs text-[var(--cortex-text-muted)]" data-testid="article-ref">
                  {articleReference}
                </p>
              )}
              {pageNumber && (
                <p className="text-xs text-[var(--cortex-text-muted)]" data-testid="page-number">
                  Page {pageNumber}
                </p>
              )}
              {pdfUrl && (
                <a
                  href={pdfUrl}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                  data-testid="view-in-pdf-btn"
                >
                  <ExternalLink size={10} /> View in PDF
                </a>
              )}
            </>
          ) : (
            <p className="text-xs text-[var(--cortex-text-muted)]" data-testid="no-quote-msg">
              No source quote available
            </p>
          )}
        </div>
      )}
    </span>
  );
}
