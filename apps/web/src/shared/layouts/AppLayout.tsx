import { type ReactNode, type MouseEvent, useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import {
  LayoutDashboard,
  Search,
  BarChart3,
  FlaskConical,
  FileText,
  Activity,
  Users,
  Settings,
  HelpCircle,
  PanelLeftClose,
  PanelLeft,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useSidebarStore } from '../../stores/sidebar-store';
import { useBreakpoint } from '../hooks/use-breakpoint';
import { PipelineProgressBar } from '../components/PipelineProgressBar';
import { Breadcrumb, type BreadcrumbItem } from '../components/Breadcrumb';
import { navigate } from '../../router';

const PROJECT_NAME_QUERY = gql`
  query ProjectNameForBreadcrumb($id: String!) {
    projectDashboard(id: $id) {
      name
      deviceName
    }
  }
`;

const adminItems = [
  { id: 'users', label: 'Users', icon: Users, href: '/admin/users' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/admin/settings' },
  { id: 'help', label: 'Help', icon: HelpCircle, href: '/help' },
];

interface AppLayoutProps {
  children: ReactNode;
}

function extractProjectId(path: string): string | null {
  const match = path.match(/^\/projects\/([^/]+)/);
  return match?.[1] ?? null;
}

function deriveActiveModule(path: string, projectId: string | null): string | null {
  if (!projectId) return path.startsWith('/projects') ? 'dashboard' : null;
  if (path.includes('/sls-sessions')) return 'sls';
  if (path.includes('/soa')) return 'soa';
  if (path.includes('/validation')) return 'validation';
  if (path.includes('/cer')) return 'cer';
  if (path.includes('/pms')) return 'pms';
  return 'project';
}

function getModuleLabel(path: string): string | null {
  if (path.includes('/sls-sessions')) return 'SLS';
  if (path.includes('/soa')) return 'SOA';
  if (path.includes('/validation')) return 'Validation';
  if (path.includes('/cer')) return 'CER';
  if (path.includes('/pms')) return 'PMS';
  return null;
}

function getAdminPageLabel(path: string): string | null {
  if (path.includes('/admin/users')) return 'Users';
  if (path.includes('/admin/settings')) return 'Settings';
  if (path.includes('/admin/llm-config')) return 'LLM Configuration';
  if (path.includes('/admin/audit')) return 'Audit';
  return null;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isCollapsed, toggle } = useSidebarStore();
  const breakpoint = useBreakpoint();

  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const projectId = extractProjectId(pathname);
  const activeModule = deriveActiveModule(pathname, projectId);

  const { data: projectData } = useQuery<{
    projectDashboard: { name: string; deviceName: string };
  }>(PROJECT_NAME_QUERY, {
    variables: { id: projectId! },
    skip: !projectId,
  });

  const projectName = projectData?.projectDashboard?.name;

  const breadcrumbItems = useMemo((): BreadcrumbItem[] => {
    if (pathname === '/help') {
      return [{ label: 'Help' }];
    }

    if (pathname.startsWith('/admin')) {
      const items: BreadcrumbItem[] = [{ label: 'Admin' }];
      const adminLabel = getAdminPageLabel(pathname);
      if (adminLabel) items.push({ label: adminLabel });
      return items;
    }

    const items: BreadcrumbItem[] = [{ label: 'Projects', href: '/projects' }];

    if (projectId) {
      items.push({
        label: projectName ?? '...',
        href: `/projects/${projectId}`,
      });

      const moduleLabel = getModuleLabel(pathname);
      if (moduleLabel) {
        items.push({ label: moduleLabel });
      }
    }

    return items;
  }, [pathname, projectId, projectName]);

  const navItems = useMemo(() => {
    if (projectId) {
      return [
        { id: 'project', label: 'Project', icon: LayoutDashboard, href: `/projects/${projectId}` },
        { id: 'sls', label: 'SLS', icon: Search, href: `/projects/${projectId}/sls-sessions` },
        { id: 'soa', label: 'SOA', icon: BarChart3, href: `/projects/${projectId}/soa` },
        {
          id: 'validation',
          label: 'Validation',
          icon: FlaskConical,
          href: `/projects/${projectId}/validation`,
        },
        { id: 'cer', label: 'CER', icon: FileText, href: `/projects/${projectId}/cer` },
        { id: 'pms', label: 'PMS', icon: Activity, href: `/projects/${projectId}/pms` },
      ];
    }
    return [{ id: 'dashboard', label: 'Projects', icon: LayoutDashboard, href: '/projects' }];
  }, [projectId]);

  const handleNavClick = useCallback((e: MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    navigate(href);
  }, []);

  const handlePipelineClick = useCallback(
    (nodeId: string) => {
      if (!projectId) return;
      const moduleRoutes: Record<string, string> = {
        sls: `/projects/${projectId}/sls-sessions`,
        soa: `/projects/${projectId}/soa`,
        validation: `/projects/${projectId}/validation`,
        cer: `/projects/${projectId}/cer`,
        pms: `/projects/${projectId}/pms`,
      };
      const route = moduleRoutes[nodeId];
      if (route) navigate(route);
    },
    [projectId],
  );

  if (breakpoint === 'too-small') {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--cortex-bg-secondary)] p-8 text-center">
        <p className="text-lg text-[var(--cortex-text-secondary)]">
          CORTEX is optimized for screens &gt;= 1280px. Please use a larger screen.
        </p>
      </div>
    );
  }

  const effectiveCollapsed = isCollapsed;
  const sidebarWidth = effectiveCollapsed ? 64 : 240;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--cortex-bg-secondary)]">
      <a href="#main-content" className="skip-link">
        Go to main content
      </a>

      {/* Topbar */}
      <header
        className="flex h-12 items-center border-b border-[var(--cortex-border)] bg-white px-5"
        style={{ paddingLeft: sidebarWidth + 20 }}
        data-testid="topbar"
      >
        <div className="flex flex-1 items-center justify-between">
          <Breadcrumb items={breadcrumbItems} />

          {projectId && (
            <div className="ml-6 flex-shrink-0">
              <PipelineProgressBar onNodeClick={handlePipelineClick} />
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav
          role="navigation"
          aria-label="Main navigation"
          className={cn(
            'flex flex-col bg-[var(--cortex-blue-700)] text-white transition-all duration-200',
          )}
          style={{ width: sidebarWidth, minWidth: sidebarWidth }}
        >
          <div className="flex h-12 items-center justify-between px-4">
            {!effectiveCollapsed && <span className="text-sm font-bold tracking-wide">CORTEX</span>}
            <button
              type="button"
              onClick={toggle}
              className="rounded p-1 hover:bg-white/10"
              aria-label={effectiveCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {effectiveCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>

          {/* Back to projects link (when inside a project) */}
          {projectId && (
            <div className="px-2 pb-1">
              <a
                href="/projects"
                onClick={(e) => handleNavClick(e, '/projects')}
                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs text-white/50 hover:bg-white/10 hover:text-white/80"
              >
                <ArrowLeft size={14} />
                {!effectiveCollapsed && <span>All Projects</span>}
              </a>
            </div>
          )}

          <div className="flex-1 space-y-1 px-2 py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-[var(--cortex-blue-100)] text-[var(--cortex-blue-900)]'
                      : 'text-white/80 hover:bg-white/10 hover:text-white',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={18} />
                  {!effectiveCollapsed && <span>{item.label}</span>}
                </a>
              );
            })}
          </div>

          <div className="border-t border-white/10 px-2 py-2">
            {adminItems.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-white/60 hover:bg-white/10 hover:text-white"
                >
                  <Icon size={18} />
                  {!effectiveCollapsed && <span>{item.label}</span>}
                </a>
              );
            })}
          </div>
        </nav>

        {/* Main content */}
        <main id="main-content" className="flex-1 overflow-auto bg-white p-6" tabIndex={-1}>
          {children}
        </main>
      </div>

      {/* Statusbar */}
      <footer className="flex h-8 items-center border-t border-[var(--cortex-border)] bg-[var(--cortex-bg-secondary)] px-4 text-xs text-[var(--cortex-text-muted)]">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-[var(--cortex-success)]" />
          <span>Auto-saved</span>
        </div>
        <span className="ml-auto">Cortex Clinical Affairs v0.1.0</span>
      </footer>
    </div>
  );
}
