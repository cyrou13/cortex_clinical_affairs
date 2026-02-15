import { useEffect } from 'react';

export function useScreeningKeyboard(
  onInclude: (articleId: string) => void,
  onExclude: (articleId: string) => void,
  onToggleDetail: (articleId: string) => void,
  onSkip: (articleId: string) => void,
  selectedArticleId: string | null,
  isActive: boolean,
): void {
  useEffect(() => {
    if (!isActive) return;

    const handler = (e: KeyboardEvent) => {
      if (!selectedArticleId) return;

      // Don't intercept when typing in inputs/textareas
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      switch (e.key) {
        case 'i':
        case 'I':
          onInclude(selectedArticleId);
          break;
        case 'e':
        case 'E':
          onExclude(selectedArticleId);
          break;
        case ' ':
          e.preventDefault();
          onToggleDetail(selectedArticleId);
          break;
        case 's':
        case 'S':
          onSkip(selectedArticleId);
          break;
        case 'Escape':
          onToggleDetail('');
          break;
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isActive, selectedArticleId, onInclude, onExclude, onToggleDetail, onSkip]);
}
