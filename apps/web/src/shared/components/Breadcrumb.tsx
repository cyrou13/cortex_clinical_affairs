import { type MouseEvent, useCallback } from 'react';
import { ChevronRight } from 'lucide-react';
import { navigate } from '../../router';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  const handleClick = useCallback((e: MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    navigate(href);
  }, []);

  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1" data-testid="breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={index} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight
                size={11}
                className="text-[var(--cortex-text-muted)] opacity-50"
                aria-hidden
              />
            )}
            {item.href && !isLast ? (
              <a
                href={item.href}
                onClick={(e) => handleClick(e, item.href!)}
                className="text-[13px] text-[var(--cortex-text-muted)] transition-colors hover:text-[var(--cortex-text-primary)]"
                data-testid={`breadcrumb-link-${index}`}
              >
                {item.label}
              </a>
            ) : (
              <span
                className={
                  isLast
                    ? 'text-[13px] font-medium text-[var(--cortex-text-primary)]'
                    : 'text-[13px] text-[var(--cortex-text-muted)]'
                }
                data-testid={`breadcrumb-item-${index}`}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
