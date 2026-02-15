import { useState, useRef, useCallback, useEffect } from 'react';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useAutoSave(saveFn: () => Promise<void>, intervalMs = 10_000) {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const isDirtyRef = useRef(false);
  const isSavingRef = useRef(false);

  const markDirty = useCallback(() => {
    isDirtyRef.current = true;
  }, []);

  const triggerSave = useCallback(async () => {
    if (isSavingRef.current) return;

    isSavingRef.current = true;
    isDirtyRef.current = false;
    setStatus('saving');

    try {
      await saveFn();
      setStatus('saved');
      setLastSavedAt(new Date());
    } catch {
      setStatus('error');
      // Re-mark dirty so the next interval retries
      isDirtyRef.current = true;
    } finally {
      isSavingRef.current = false;
    }
  }, [saveFn]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isDirtyRef.current && !isSavingRef.current) {
        void triggerSave();
      }
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [triggerSave, intervalMs]);

  return { status, lastSavedAt, triggerSave, markDirty };
}
