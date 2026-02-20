import { useState, useEffect, type ReactNode } from 'react';

// Simple pathname-based router (no external dependency needed at runtime)
// Pages use window.location.href for navigation which triggers full re-renders

interface Route {
  pattern: RegExp;
  component: () => Promise<{ default: React.ComponentType }>;
}

const routes: Route[] = [
  {
    pattern: /^\/login$/,
    component: () => import('./routes/login').then((m) => ({ default: m.LoginPage })),
  },
  {
    pattern: /^\/projects\/([^/]+)\/cer\/([^/]+)$/,
    component: () => import('./routes/_authenticated/projects/$projectId/cer/$cerId'),
  },
  {
    pattern: /^\/projects\/([^/]+)\/cer\/?$/,
    component: () => import('./routes/_authenticated/projects/$projectId/cer/index'),
  },
  {
    pattern: /^\/projects\/([^/]+)\/validation\/([^/]+)$/,
    component: () => import('./routes/_authenticated/projects/$projectId/validation/$studyId'),
  },
  {
    pattern: /^\/projects\/([^/]+)\/validation\/?$/,
    component: () => import('./routes/_authenticated/projects/$projectId/validation/index'),
  },
  {
    pattern: /^\/projects\/([^/]+)\/soa\/import\/([^/]+)$/,
    component: () => import('./routes/_authenticated/projects/$projectId/soa/import/$importId'),
  },
  {
    pattern: /^\/projects\/([^/]+)\/soa\/([^/]+)$/,
    component: () => import('./routes/_authenticated/projects/$projectId/soa/$soaId'),
  },
  {
    pattern: /^\/projects\/([^/]+)\/soa\/?$/,
    component: () => import('./routes/_authenticated/projects/$projectId/soa/index'),
  },
  {
    pattern: /^\/projects\/([^/]+)\/pms\/([^/]+)$/,
    component: () => import('./routes/_authenticated/projects/$projectId/pms/$planId'),
  },
  {
    pattern: /^\/projects\/([^/]+)\/pms\/?$/,
    component: () => import('./routes/_authenticated/projects/$projectId/pms/index'),
  },
  {
    pattern: /^\/projects\/([^/]+)\/sls-sessions\/([^/]+)$/,
    component: () => import('./routes/_authenticated/projects/$projectId/sls-sessions/$sessionId'),
  },
  {
    pattern: /^\/projects\/([^/]+)\/sls-sessions\/?$/,
    component: () => import('./routes/_authenticated/projects/$projectId/sls-sessions/index'),
  },
  {
    pattern: /^\/projects\/([^/]+)\/?$/,
    component: () => import('./routes/_authenticated/projects/$projectId/index'),
  },
  {
    pattern: /^\/projects\/?$/,
    component: () => import('./routes/_authenticated/projects/index'),
  },
  {
    pattern: /^\/admin\/users\/?$/,
    component: () => import('./routes/_authenticated/admin/users'),
  },
  {
    pattern: /^\/admin\/llm-config\/?$/,
    component: () => import('./routes/_authenticated/admin/llm-config'),
  },
  {
    pattern: /^\/admin\/settings\/?$/,
    component: () => import('./routes/_authenticated/admin/settings'),
  },
  {
    pattern: /^\/admin\/audit\/?$/,
    component: () => import('./routes/_authenticated/admin/audit'),
  },
  {
    pattern: /^\/help\/?$/,
    component: () => import('./routes/_authenticated/help'),
  },
];

// Module placeholders for unimplemented routes
const modulePlaceholders: Record<string, string> = {};

function ModulePlaceholder({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-[var(--cortex-text-primary)]">{title}</h1>
      <p className="text-[var(--cortex-text-secondary)]">Coming soon.</p>
    </div>
  );
}

export function useRouter(): ReactNode {
  const [page, setPage] = useState<ReactNode>(null);
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    // Listen for popstate (back/forward)
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      // Check module placeholders first
      const placeholder = modulePlaceholders[pathname];
      if (placeholder) {
        if (!cancelled) setPage(<ModulePlaceholder title={placeholder} />);
        return;
      }

      // Check routes
      for (const route of routes) {
        if (route.pattern.test(pathname)) {
          try {
            const mod = await route.component();
            const Component = mod.default;
            if (!cancelled) setPage(<Component />);
          } catch {
            if (!cancelled) setPage(<p className="text-red-500">Failed to load page.</p>);
          }
          return;
        }
      }

      // Default: redirect to /projects
      if (pathname === '/' || pathname === '') {
        window.location.href = '/projects';
        return;
      }

      // 404
      if (!cancelled) {
        setPage(
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold text-[var(--cortex-text-primary)]">
              Page not found
            </h1>
            <p className="text-[var(--cortex-text-secondary)]">
              The page <code>{pathname}</code> does not exist.
            </p>
            <a
              href="/projects"
              className="inline-block rounded-md bg-[var(--cortex-blue-500)] px-4 py-2 text-sm text-white hover:bg-[var(--cortex-blue-600)]"
            >
              Go to Projects
            </a>
          </div>,
        );
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return page;
}

// Intercept <a> clicks for SPA navigation
export function navigate(href: string) {
  window.history.pushState({}, '', href);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
