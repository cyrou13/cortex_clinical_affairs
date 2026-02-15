import { useState, useEffect } from 'react';

export type Breakpoint = 'too-small' | 'compact' | 'standard' | 'wide' | 'ultra';

function getBreakpoint(width: number): Breakpoint {
  if (width < 1280) return 'too-small';
  if (width < 1440) return 'compact';
  if (width < 1920) return 'standard';
  if (width < 2560) return 'wide';
  return 'ultra';
}

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() =>
    typeof window !== 'undefined' ? getBreakpoint(window.innerWidth) : 'standard',
  );

  useEffect(() => {
    function handleResize() {
      setBreakpoint(getBreakpoint(window.innerWidth));
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return breakpoint;
}
