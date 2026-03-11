import { useState, useEffect, useCallback, type ReactNode, type MouseEvent } from 'react';
import { ChevronRight } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TocEntry {
  id: string;
  label: string;
  children?: { id: string; label: string }[];
}

/* ------------------------------------------------------------------ */
/*  Table of Contents data                                             */
/* ------------------------------------------------------------------ */

const toc: TocEntry[] = [
  { id: 'welcome', label: 'Welcome to Cortex' },
  {
    id: 'first-steps',
    label: 'First Steps — Configuration',
    children: [
      { id: 'config-api-keys', label: 'Configure API Keys' },
      { id: 'config-ai-models', label: 'Configure AI Models' },
      { id: 'config-general', label: 'General Settings' },
    ],
  },
  {
    id: 'first-project',
    label: 'Creating Your First Project',
  },
  {
    id: 'tutorial-sls',
    label: 'Literature Search (SLS)',
    children: [
      { id: 'tut-sls-session', label: 'Create a Session' },
      { id: 'tut-sls-queries', label: 'Build Queries' },
      { id: 'tut-sls-scoring', label: 'AI Scoring' },
      { id: 'tut-sls-screening', label: 'Screen Articles' },
    ],
  },
  {
    id: 'tutorial-soa',
    label: 'State of the Art Analysis (SOA)',
    children: [
      { id: 'tut-soa-create', label: 'Create SOA' },
      { id: 'tut-soa-overview', label: 'Overview Tab' },
      { id: 'tut-soa-grid', label: 'Extraction Grid' },
      { id: 'tut-soa-quality', label: 'Quality Assessment' },
      { id: 'tut-soa-narrative', label: 'Narrative Drafting' },
      { id: 'tut-soa-devices', label: 'Device Registry' },
      { id: 'tut-soa-claims', label: 'Claims Management' },
    ],
  },
  { id: 'tutorial-cer', label: 'Clinical Evaluation Report (CER)' },
  { id: 'tutorial-validation', label: 'Validation Studies' },
  { id: 'tutorial-pms', label: 'Post-Market Surveillance (PMS)' },
  { id: 'ai-pipeline', label: 'Understanding the AI Pipeline' },
  { id: 'tips', label: 'Tips & Best Practices' },
];

/* ------------------------------------------------------------------ */
/*  Reusable sub-components                                            */
/* ------------------------------------------------------------------ */

function SectionHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="scroll-mt-4 border-b border-[var(--cortex-border)] pb-2 text-xl font-semibold text-[var(--cortex-text-primary)]"
    >
      {children}
    </h2>
  );
}

function SubHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h3 id={id} className="scroll-mt-4 text-lg font-medium text-[var(--cortex-text-primary)]">
      {children}
    </h3>
  );
}

function Screenshot({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  return (
    <figure className="space-y-2">
      <img
        src={src}
        alt={alt}
        className="w-full rounded-lg border border-[var(--cortex-border)] shadow-md"
      />
      {caption && (
        <figcaption className="text-center text-xs text-[var(--cortex-text-muted)]">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

/* --- Visual flow diagram components --- */

function FlowNode({
  icon,
  label,
  description,
  variant = 'default',
}: {
  icon?: ReactNode;
  label: string;
  description?: string;
  variant?: 'default' | 'action' | 'ai' | 'result' | 'start';
}) {
  const base = 'rounded-xl border px-4 py-3 text-left shadow-sm';
  const styles = {
    start:
      'border-[var(--cortex-blue-300)] bg-[var(--cortex-blue-50)] text-[var(--cortex-blue-800)]',
    action: 'border-indigo-200 bg-indigo-50 text-indigo-800',
    ai: 'border-violet-200 bg-violet-50 text-violet-800',
    result: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    default: 'border-[var(--cortex-border)] bg-white text-[var(--cortex-text-primary)]',
  };
  return (
    <div className={`${base} ${styles[variant]}`}>
      <div className="flex items-center gap-2">
        {icon && <span className="shrink-0 text-sm">{icon}</span>}
        <span className="text-sm font-semibold">{label}</span>
      </div>
      {description && <p className="mt-1 text-xs opacity-80">{description}</p>}
    </div>
  );
}

function FlowArrow({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-1">
      {label && (
        <span className="text-[10px] font-medium text-[var(--cortex-text-muted)]">{label}</span>
      )}
      <svg width="16" height="24" viewBox="0 0 16 24" className="text-[var(--cortex-text-muted)]">
        <line x1="8" y1="0" x2="8" y2="18" stroke="currentColor" strokeWidth="2" />
        <polygon points="3,16 8,23 13,16" fill="currentColor" />
      </svg>
    </div>
  );
}

function FlowBranch({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-start justify-center gap-3">{children}</div>;
}

function FlowContainer({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--cortex-border)] bg-gradient-to-b from-slate-50 to-white p-6 shadow-sm">
      {title && (
        <p className="mb-4 text-center text-xs font-bold uppercase tracking-wider text-[var(--cortex-text-muted)]">
          {title}
        </p>
      )}
      <div className="flex flex-col items-center gap-0">{children}</div>
    </div>
  );
}

function TipBox({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div className="shrink-0 text-blue-500">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="mt-0.5">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
        </svg>
      </div>
      <div className="text-sm text-blue-800">{children}</div>
    </div>
  );
}

function ImportantBox({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="shrink-0 text-amber-500">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="mt-0.5">
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
        </svg>
      </div>
      <div className="text-sm text-amber-800">{children}</div>
    </div>
  );
}

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--cortex-blue-500)] text-xs font-bold text-white">
            {i + 1}
          </span>
          <span className="pt-0.5 text-sm text-[var(--cortex-text-secondary)]">{step}</span>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/*  Table of Contents sidebar                                          */
/* ------------------------------------------------------------------ */

function TableOfContents({ activeId }: { activeId: string }) {
  const handleClick = useCallback((e: MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.replaceState(null, '', `#${id}`);
  }, []);

  return (
    <nav aria-label="Table of contents" className="space-y-1 text-sm">
      {toc.map((entry) => (
        <div key={entry.id}>
          <a
            href={`#${entry.id}`}
            onClick={(e) => handleClick(e, entry.id)}
            className={`block rounded px-2 py-1 transition-colors ${
              activeId === entry.id
                ? 'bg-[var(--cortex-blue-100)] font-medium text-[var(--cortex-blue-700)]'
                : 'text-[var(--cortex-text-secondary)] hover:bg-[var(--cortex-bg-secondary)] hover:text-[var(--cortex-text-primary)]'
            }`}
          >
            {entry.label}
          </a>
          {entry.children?.map((child) => (
            <a
              key={child.id}
              href={`#${child.id}`}
              onClick={(e) => handleClick(e, child.id)}
              className={`ml-3 flex items-center gap-1 rounded px-2 py-0.5 transition-colors ${
                activeId === child.id
                  ? 'font-medium text-[var(--cortex-blue-700)]'
                  : 'text-[var(--cortex-text-muted)] hover:text-[var(--cortex-text-secondary)]'
              }`}
            >
              <ChevronRight size={12} />
              {child.label}
            </a>
          ))}
        </div>
      ))}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Tutorial page                                                 */
/* ------------------------------------------------------------------ */

export default function TutorialPage() {
  const [activeId, setActiveId] = useState('welcome');

  // Track active section via IntersectionObserver
  useEffect(() => {
    const ids = toc.flatMap((e) => [e.id, ...(e.children?.map((c) => c.id) ?? [])]);
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex gap-8">
      {/* Sticky TOC */}
      <aside className="hidden w-[200px] shrink-0 xl:block">
        <div className="sticky top-0 max-h-[calc(100vh-120px)] overflow-y-auto py-2">
          <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-[var(--cortex-text-muted)]">
            Tutorial
          </p>
          <TableOfContents activeId={activeId} />
        </div>
      </aside>

      {/* Content */}
      <div className="min-w-0 max-w-4xl flex-1 space-y-10">
        {/* Header */}
        <div>
          <div className="mb-2">
            <a href="/help" className="text-sm text-[var(--cortex-blue-600)] hover:underline">
              &larr; For detailed field-by-field reference, see the Help page.
            </a>
          </div>
          <h1 className="text-2xl font-bold text-[var(--cortex-text-primary)]">
            Getting Started with Cortex
          </h1>
          <p className="mt-1 text-[var(--cortex-text-secondary)]">
            A step-by-step guide to running your first complete regulatory compliance workflow —
            from configuration through literature search, analysis, and report generation.
          </p>
        </div>

        {/* ============================================================ */}
        {/*  1. Welcome                                                   */}
        {/* ============================================================ */}
        <section className="space-y-5">
          <SectionHeading id="welcome">1. Welcome to Cortex</SectionHeading>
          <p className="text-sm leading-relaxed text-[var(--cortex-text-secondary)]">
            <strong>Cortex Clinical Affairs</strong> is a medical device regulatory compliance
            platform that automates the most time-consuming parts of the clinical evaluation
            lifecycle. It covers everything required under <strong>EU MDR 2017/745</strong> and{' '}
            <strong>FDA 21 CFR</strong> pathways, from initial literature searches to finalised
            clinical evaluation reports and post-market surveillance plans.
          </p>

          <div className="rounded-lg border border-[var(--cortex-border)] bg-[var(--cortex-bg-secondary)] p-4 space-y-2">
            <p className="text-sm font-semibold text-[var(--cortex-text-primary)]">
              Who is Cortex for?
            </p>
            <ul className="list-inside list-disc space-y-1 text-sm text-[var(--cortex-text-secondary)]">
              <li>
                <strong>Regulatory Affairs specialists</strong> managing CE-MDR or FDA submissions
              </li>
              <li>
                <strong>Clinical Evaluation teams</strong> conducting literature reviews and SOA
                analyses
              </li>
              <li>
                <strong>Quality teams</strong> maintaining post-market surveillance and PSUR cycles
              </li>
              <li>
                <strong>Medical writers</strong> drafting CER narratives and clinical claims
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-[var(--cortex-text-primary)]">
              The Cortex pipeline — from project to report:
            </p>
            <FlowContainer title="Cortex Pipeline — from project to report">
              <FlowNode
                icon="📁"
                label="Project"
                description="Device, manufacturer, regulatory pathway"
                variant="start"
              />
              <FlowArrow />
              <FlowBranch>
                <FlowNode
                  icon="🔍"
                  label="SLS — Literature Search"
                  description="PubMed / Embase → AI Scoring → Screening"
                  variant="action"
                />
                <FlowNode
                  icon="📊"
                  label="SOA — State of the Art"
                  description="Extract → Quality → Narrative → Claims"
                  variant="ai"
                />
              </FlowBranch>
              <FlowArrow />
              <FlowNode
                icon="📝"
                label="CER — Clinical Evaluation Report"
                description="Assemble sections → Regulatory context → Export"
                variant="result"
              />
              <FlowArrow />
              <FlowBranch>
                <FlowNode
                  icon="🔬"
                  label="Validation"
                  description="Clinical studies → Data import"
                  variant="default"
                />
                <FlowNode
                  icon="📈"
                  label="PMS — Surveillance"
                  description="PSUR cycles → PMCF reports"
                  variant="default"
                />
              </FlowBranch>
            </FlowContainer>
          </div>

          <TipBox>
            <strong>New to Cortex?</strong> Follow this tutorial from top to bottom. Each section
            builds on the previous one. You can return to any section at any time using the table of
            contents on the left.
          </TipBox>
        </section>

        {/* ============================================================ */}
        {/*  2. First Steps — Configuration                               */}
        {/* ============================================================ */}
        <section className="space-y-6">
          <SectionHeading id="first-steps">2. First Steps — Configuration</SectionHeading>
          <p className="text-sm leading-relaxed text-[var(--cortex-text-secondary)]">
            Before creating your first project, you need to configure at least one AI provider.
            Cortex uses large language models to power article scoring, data extraction, quality
            assessment, and narrative drafting. Without a valid API key, these AI features will not
            function.
          </p>

          <ImportantBox>
            <strong>Do this first:</strong> Configure your API key before anything else. All AI
            features in Cortex depend on a valid LLM provider key. Navigate to{' '}
            <strong>Settings → API Keys</strong> to get started.
          </ImportantBox>

          {/* 2.1 API Keys */}
          <div className="space-y-4">
            <SubHeading id="config-api-keys">Configure API Keys</SubHeading>
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              API keys connect Cortex to external LLM providers. Cortex currently supports{' '}
              <strong>OpenAI</strong> and <strong>Anthropic</strong> (Claude). You need at least one
              key to unlock AI capabilities.
            </p>
            <Screenshot
              src="/docs/screenshots/11-settings-api_keys.png"
              alt="API Keys settings page"
              caption="Settings → API Keys — add your OpenAI or Anthropic key here"
            />
            <StepList
              steps={[
                'Navigate to Settings → API Keys (accessible from the left sidebar under the gear icon).',
                'Click "Add API Key".',
                'Select your provider: OpenAI (GPT-4o, o1) or Anthropic (Claude 3.5 / Claude 3 Opus).',
                'Paste your API key into the Key field. Keys are stored encrypted and never exposed in the UI after saving.',
                'Click "Save". The key status indicator will turn green when the key is valid.',
                'Repeat for any additional providers you want to configure.',
              ]}
            />
            <TipBox>
              If you have access to both OpenAI and Anthropic, configure both. Cortex lets you
              assign different models to different task types (e.g. a fast model for scoring, a
              powerful model for narrative drafting).
            </TipBox>
          </div>

          {/* 2.2 AI Models */}
          <div className="space-y-4">
            <SubHeading id="config-ai-models">Configure AI Models</SubHeading>
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              Once your API keys are saved, configure which model Cortex uses for each task type.
              The <strong>AI Models</strong> settings page lets you set system-wide defaults and
              per-task overrides.
            </p>
            <Screenshot
              src="/docs/screenshots/11-settings-ai_models.png"
              alt="AI Models settings page"
              caption="Settings → AI Models — assign models to task types"
            />
            <div className="rounded-lg border border-[var(--cortex-border)] bg-[var(--cortex-bg-secondary)] p-4 space-y-2">
              <p className="text-sm font-semibold text-[var(--cortex-text-primary)]">
                Task types and recommended models:
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--cortex-border)]">
                    <th className="py-1 text-left font-medium text-[var(--cortex-text-secondary)]">
                      Task Type
                    </th>
                    <th className="py-1 text-left font-medium text-[var(--cortex-text-secondary)]">
                      What it does
                    </th>
                    <th className="py-1 text-left font-medium text-[var(--cortex-text-secondary)]">
                      Recommended
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--cortex-border)]">
                  <tr>
                    <td className="py-1.5 pr-4 font-mono text-xs text-[var(--cortex-text-primary)]">
                      scoring
                    </td>
                    <td className="py-1.5 pr-4 text-[var(--cortex-text-secondary)]">
                      Score article relevance for SLS
                    </td>
                    <td className="py-1.5 text-[var(--cortex-text-muted)]">
                      GPT-4o-mini / Claude Haiku (fast)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-4 font-mono text-xs text-[var(--cortex-text-primary)]">
                      extraction
                    </td>
                    <td className="py-1.5 pr-4 text-[var(--cortex-text-secondary)]">
                      Extract data into SOA grid
                    </td>
                    <td className="py-1.5 text-[var(--cortex-text-muted)]">
                      GPT-4o / Claude 3.5 Sonnet
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-4 font-mono text-xs text-[var(--cortex-text-primary)]">
                      drafting
                    </td>
                    <td className="py-1.5 pr-4 text-[var(--cortex-text-secondary)]">
                      Generate narrative sections
                    </td>
                    <td className="py-1.5 text-[var(--cortex-text-muted)]">
                      GPT-4o / Claude 3 Opus (powerful)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-4 font-mono text-xs text-[var(--cortex-text-primary)]">
                      metadata_extraction
                    </td>
                    <td className="py-1.5 pr-4 text-[var(--cortex-text-secondary)]">
                      Extract article metadata
                    </td>
                    <td className="py-1.5 text-[var(--cortex-text-muted)]">
                      GPT-4o-mini / Claude Haiku
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <StepList
              steps={[
                'Navigate to Settings → AI Models.',
                'Under "System Defaults", select a provider and model for each task type.',
                'Click "Save Defaults". These settings apply to all projects unless overridden.',
                'Optional: individual projects can override the system defaults in their own project settings.',
              ]}
            />
          </div>

          {/* 2.3 General Settings */}
          <div className="space-y-4">
            <SubHeading id="config-general">General Settings</SubHeading>
            <Screenshot
              src="/docs/screenshots/10-settings-general.png"
              alt="General settings page"
              caption="Settings → General — platform-wide configuration"
            />
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              The General settings page lets you configure organisation-level defaults: platform
              name, default regulatory pathway, date format, and notification preferences. These
              settings affect the entire platform and are typically configured once by an
              administrator.
            </p>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  3. Creating Your First Project                               */}
        {/* ============================================================ */}
        <section className="space-y-5">
          <SectionHeading id="first-project">3. Creating Your First Project</SectionHeading>
          <p className="text-sm leading-relaxed text-[var(--cortex-text-secondary)]">
            A <strong>Project</strong> is the top-level container in Cortex. It represents a single
            medical device and its regulatory evaluation. All SLS sessions, SOA analyses, CER
            reports, and PMS plans belong to a project.
          </p>
          <Screenshot
            src="/docs/screenshots/01-projects-list.png"
            alt="Projects dashboard"
            caption="The Projects dashboard — your starting point"
          />
          <StepList
            steps={[
              'Click the "New Project" button in the top-right corner of the Projects page.',
              'Step 1 — General Information: Enter a Project Name, Device Name, Manufacturer name, and Intended Use. Be precise with the intended use — it drives AI relevance scoring throughout the workflow.',
              'Step 2 — CEP Scope: Define the PICO framework for your clinical evaluation: Indication, Target Population, Intervention (your device), Comparator devices or treatments, and primary/secondary Outcomes.',
              'Step 3 — Classification: Select your regulatory pathway (FDA 510(k) or CE-MDR), device class (Class I / II / III for FDA; Class I / IIa / IIb / III for CE-MDR), and any applicable classification rules.',
              'Click "Create Project". You will be taken to the Project Dashboard.',
            ]}
          />

          <div className="rounded-lg border border-[var(--cortex-border)] bg-[var(--cortex-bg-secondary)] p-4 space-y-2">
            <p className="text-sm font-semibold text-[var(--cortex-text-primary)]">
              Understanding the CEP Scope (PICO framework)
            </p>
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              The PICO framework structures your clinical question and is used to generate relevant
              literature search queries automatically:
            </p>
            <ul className="list-inside list-disc space-y-1 text-sm text-[var(--cortex-text-secondary)]">
              <li>
                <strong>P — Population:</strong> Who are the patients? (e.g. "Adult patients with
                suspected cervical spine injury")
              </li>
              <li>
                <strong>I — Intervention:</strong> What is your device doing? (e.g. "AI-assisted CT
                detection of cervical fractures")
              </li>
              <li>
                <strong>C — Comparator:</strong> What is it compared to? (e.g. "Standard radiologist
                review without AI assistance")
              </li>
              <li>
                <strong>O — Outcomes:</strong> What matters? (e.g. "Sensitivity, specificity,
                time-to-diagnosis, missed fracture rate")
              </li>
            </ul>
          </div>

          <Screenshot
            src="/docs/screenshots/02-project-dashboard.png"
            alt="Project dashboard after creation"
            caption="Project Dashboard — the hub for all activities on a device"
          />

          <p className="text-sm text-[var(--cortex-text-secondary)]">
            From the Project Dashboard you can launch SLS sessions, create SOA analyses, manage CER
            reports, configure validation studies, and set up PMS plans. The dashboard shows a
            real-time summary of progress across all modules.
          </p>

          <FlowContainer title="Project Dashboard — Launch any module">
            <FlowNode
              icon="🏠"
              label="Project Dashboard"
              description="Overview metrics, module status, quick actions"
              variant="start"
            />
            <FlowArrow label="Choose a module" />
            <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <FlowNode icon="🔍" label="New SLS Session" variant="action" />
              <FlowNode icon="📊" label="New SOA" variant="ai" />
              <FlowNode icon="📝" label="New CER" variant="result" />
              <FlowNode icon="🔬" label="New Validation" variant="default" />
              <FlowNode icon="📈" label="New PMS Plan" variant="default" />
            </div>
          </FlowContainer>
        </section>

        {/* ============================================================ */}
        {/*  4. Literature Search (SLS)                                   */}
        {/* ============================================================ */}
        <section className="space-y-6">
          <SectionHeading id="tutorial-sls">4. Literature Search (SLS)</SectionHeading>
          <p className="text-sm leading-relaxed text-[var(--cortex-text-secondary)]">
            The <strong>Systematic Literature Search (SLS)</strong> module automates the most
            labour-intensive part of a clinical evaluation: finding, scoring, and screening
            scientific literature. A single project can have multiple SLS sessions, each targeting a
            different aspect of the evidence base.
          </p>

          <FlowContainer title="SLS Workflow">
            <FlowNode
              icon="➕"
              label="Create Session"
              description="Choose type: Device Safety, Performance, SOA Clinical..."
              variant="start"
            />
            <FlowArrow />
            <FlowNode
              icon="🔎"
              label="Add Search Queries"
              description="PubMed / Embase boolean strings"
              variant="action"
            />
            <FlowArrow label="Execute" />
            <FlowNode
              icon="📥"
              label="Articles Imported"
              description="Results fetched and stored in Cortex"
              variant="default"
            />
            <FlowArrow />
            <FlowNode
              icon="🤖"
              label="AI Scoring"
              description="Each article scored 0–100 for relevance"
              variant="ai"
            />
            <FlowArrow />
            <FlowNode
              icon="✅"
              label="Manual Screening"
              description="Include / Exclude / Flag for review"
              variant="action"
            />
            <FlowArrow />
            <FlowNode
              icon="📤"
              label="Export to SOA"
              description="Screened articles feed into analysis"
              variant="result"
            />
          </FlowContainer>

          {/* 4.1 Create a Session */}
          <div className="space-y-4">
            <SubHeading id="tut-sls-session">Create a Session</SubHeading>
            <Screenshot
              src="/docs/screenshots/03-sls-sessions.png"
              alt="SLS sessions list"
              caption="SLS Sessions list — one session per search focus"
            />
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              Each SLS session has a <strong>type</strong> that tells the AI what kind of evidence
              to prioritise when scoring articles. Choose the type that best matches the goal of
              your search.
            </p>
            <div className="rounded-lg border border-[var(--cortex-border)] bg-[var(--cortex-bg-secondary)] p-4 space-y-2">
              <p className="text-sm font-semibold text-[var(--cortex-text-primary)]">
                Session types:
              </p>
              <ul className="space-y-1.5 text-sm text-[var(--cortex-text-secondary)]">
                <li>
                  <code className="rounded bg-[var(--cortex-bg-secondary)] px-1 text-xs border border-[var(--cortex-border)]">
                    SOA_CLINICAL
                  </code>{' '}
                  — State of the art: clinical performance studies, diagnostic accuracy, clinical
                  outcomes. <em>Use this for your main SOA search.</em>
                </li>
                <li>
                  <code className="rounded bg-[var(--cortex-bg-secondary)] px-1 text-xs border border-[var(--cortex-border)]">
                    DEVICE_SAFETY
                  </code>{' '}
                  — Safety data: adverse events, recalls, incident reports, post-market data.
                </li>
                <li>
                  <code className="rounded bg-[var(--cortex-bg-secondary)] px-1 text-xs border border-[var(--cortex-border)]">
                    EQUIVALENT_DEVICE
                  </code>{' '}
                  — Equivalence: technical, biological, and clinical equivalence to predicate
                  devices.
                </li>
                <li>
                  <code className="rounded bg-[var(--cortex-bg-secondary)] px-1 text-xs border border-[var(--cortex-border)]">
                    BACKGROUND
                  </code>{' '}
                  — Background: disease epidemiology, current standard of care, unmet clinical need.
                </li>
                <li>
                  <code className="rounded bg-[var(--cortex-bg-secondary)] px-1 text-xs border border-[var(--cortex-border)]">
                    REGULATORY
                  </code>{' '}
                  — Regulatory landscape: guidance documents, harmonised standards, notified body
                  opinions.
                </li>
              </ul>
            </div>
            <StepList
              steps={[
                'From the Project Dashboard, click "New SLS Session".',
                'Enter a descriptive session name (e.g. "SOA Clinical — Cervical Spine AI CT 2025").',
                'Select a Session Type (use SOA_CLINICAL for your primary State of the Art search).',
                'Click "Create Session". You are taken to the session detail page.',
              ]}
            />
          </div>

          {/* 4.2 Build Queries */}
          <div className="space-y-4">
            <SubHeading id="tut-sls-queries">Build Queries</SubHeading>
            <Screenshot
              src="/docs/screenshots/04-sls-session-detail.png"
              alt="SLS session detail page with tabs"
              caption="SLS session detail — Queries tab"
            />
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              Cortex supports Boolean search strings compatible with PubMed and Embase syntax. You
              can add multiple queries per session — Cortex deduplicates results across queries
              automatically.
            </p>
            <StepList
              steps={[
                'In the session detail page, open the "Queries" tab.',
                'Click "Add Query".',
                'Select the database (PubMed or Embase).',
                'Paste or type your Boolean query string. Example: (("cervical spine"[MeSH] OR "cervical fracture"[tiab]) AND ("artificial intelligence"[tiab] OR "deep learning"[tiab]) AND ("CT"[tiab] OR "computed tomography"[tiab]))',
                'Set optional filters: publication date range, article types, language.',
                'Click "Save Query".',
                'Repeat for each additional query or database.',
                'When all queries are added, click "Execute Search" to run them all.',
              ]}
            />
            <TipBox>
              Use the PICO terms you defined in your project scope as the starting point for your
              query. The Intervention and Population fields are especially useful for generating
              core search terms.
            </TipBox>
          </div>

          {/* 4.3 AI Scoring */}
          <div className="space-y-4">
            <SubHeading id="tut-sls-scoring">AI Scoring</SubHeading>
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              After articles are imported, Cortex runs AI scoring to assess the relevance of each
              article to your device and clinical evaluation scope. Each article receives a score
              from 0 to 100.
            </p>
            <div className="rounded-lg border border-[var(--cortex-border)] bg-[var(--cortex-bg-secondary)] p-4 space-y-2">
              <p className="text-sm font-semibold text-[var(--cortex-text-primary)]">
                How scoring works:
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm text-[var(--cortex-text-secondary)]">
                <li>The AI reads the article title and abstract.</li>
                <li>
                  It compares the content against your project scope (PICO, intended use, device
                  description).
                </li>
                <li>
                  It assigns a relevance score and a short justification explaining the score.
                </li>
                <li>
                  High scores (70+) indicate strong relevance; low scores (below 30) are likely to
                  be excluded during screening.
                </li>
              </ul>
            </div>
            <StepList
              steps={[
                'After executing your search queries, navigate to the "Articles" tab.',
                'Click "Run AI Scoring" to start the scoring job.',
                'A progress indicator will appear. Scoring typically takes 1–5 minutes depending on the number of articles.',
                'Once complete, articles display their relevance score. Click on any article to see the AI justification.',
              ]}
            />
          </div>

          {/* 4.4 Screen Articles */}
          <div className="space-y-4">
            <SubHeading id="tut-sls-screening">Screen Articles</SubHeading>
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              Screening is the manual step where you review AI-scored articles and make final
              include/exclude decisions. Cortex supports title/abstract screening and full-text
              screening in a single workflow.
            </p>
            <StepList
              steps={[
                'Open the "Screening" tab in the session.',
                'Articles are sorted by AI score (highest first) by default — start with the highest-scored ones.',
                'For each article: read the title, abstract, and AI justification.',
                'Click "Include" to add it to your final set, "Exclude" to remove it, or "Flag" to revisit later.',
                'When excluding, select a reason from the dropdown (out of scope, wrong population, not a study, etc.). This is required for PRISMA compliance.',
                'After completing title/abstract screening, move to full-text screening for included articles.',
                'Use "Export" to generate a PRISMA flow diagram and the final included article list for use in SOA.',
              ]}
            />
            <TipBox>
              Focus on articles with AI scores above 50 first. Articles below 20 can be
              bulk-excluded with a single "Low relevance" reason to save time, but review the AI
              justifications before doing so.
            </TipBox>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  5. State of the Art Analysis (SOA)                           */}
        {/* ============================================================ */}
        <section className="space-y-6">
          <SectionHeading id="tutorial-soa">5. State of the Art Analysis (SOA)</SectionHeading>
          <p className="text-sm leading-relaxed text-[var(--cortex-text-secondary)]">
            The <strong>SOA module</strong> is the analytical core of Cortex. Once you have a set of
            screened articles from SLS, you create an SOA to extract structured data, assess study
            quality, draft narrative sections, and generate clinical claims — all AI-assisted.
          </p>

          <FlowContainer title="SOA Workflow — 6 Tabs">
            <FlowNode
              icon="📊"
              label="Create SOA"
              description="Link to SLS session, import screened articles"
              variant="start"
            />
            <FlowArrow />
            <FlowNode
              icon="🗂️"
              label="Configure Extraction Grid"
              description="Define columns: study design, sample size, outcomes..."
              variant="action"
            />
            <FlowArrow label="AI Extraction" />
            <FlowBranch>
              <FlowNode
                icon="🤖"
                label="Grid Populated"
                description="AI extracts data into each cell"
                variant="ai"
              />
              <FlowNode
                icon="✏️"
                label="Review & Edit"
                description="Correct extracted values manually"
                variant="default"
              />
            </FlowBranch>
            <FlowArrow />
            <FlowNode
              icon="🏅"
              label="Quality Assessment"
              description="QUADAS-2 / ROBINS-I / Newcastle-Ottawa"
              variant="ai"
            />
            <FlowArrow />
            <FlowNode
              icon="📝"
              label="Draft Narrative"
              description="AI generates thematic section drafts"
              variant="ai"
            />
            <FlowArrow />
            <FlowNode
              icon="💡"
              label="Generate Claims"
              description="Evidence-based claims from narrative content"
              variant="ai"
            />
            <FlowArrow label="Review" />
            <FlowBranch>
              <FlowNode icon="✅" label="Approve" variant="result" />
              <FlowNode icon="❌" label="Reject" variant="default" />
            </FlowBranch>
            <FlowArrow />
            <FlowNode
              icon="🔒"
              label="Lock SOA"
              description="Finalize analysis → feeds into CER"
              variant="result"
            />
          </FlowContainer>

          {/* 5.1 Create SOA */}
          <div className="space-y-4">
            <SubHeading id="tut-soa-create">Create SOA</SubHeading>
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              SOA analyses are created from the Project Dashboard and linked to one or more SLS
              sessions to pull in the screened article set.
            </p>
            <StepList
              steps={[
                'From the Project Dashboard, click "New SOA Analysis".',
                'Give the SOA a descriptive name (e.g. "SOA Clinical Performance 2025").',
                'Select the SLS session(s) whose included articles will form the evidence base.',
                'Click "Create SOA". The SOA opens on the Overview tab.',
              ]}
            />
          </div>

          {/* 5.2 Overview Tab */}
          <div className="space-y-4">
            <SubHeading id="tut-soa-overview">Overview Tab</SubHeading>
            <Screenshot
              src="/docs/screenshots/06-soa-detail-overview.png"
              alt="SOA Overview tab"
              caption="SOA Overview tab — summary metrics and status"
            />
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              The Overview tab shows a summary of the SOA: total articles included, extraction
              progress, quality assessment status, narrative completion, and claims approved. It
              also displays the SOA status (Draft, In Progress, Locked) and provides quick access to
              all other tabs.
            </p>
          </div>

          {/* 5.3 Extraction Grid */}
          <div className="space-y-4">
            <SubHeading id="tut-soa-grid">Extraction Grid</SubHeading>
            <Screenshot
              src="/docs/screenshots/07-soa-tab-grid.png"
              alt="SOA Extraction Grid tab"
              caption="SOA Extraction Grid — structured data from each article"
            />
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              The extraction grid presents each included article as a row, with configurable columns
              representing the clinical data points you want to extract. The AI reads the full text
              of each article (where available) or the abstract, and fills in the grid values.
            </p>
            <div className="rounded-lg border border-[var(--cortex-border)] bg-[var(--cortex-bg-secondary)] p-4 space-y-2">
              <p className="text-sm font-semibold text-[var(--cortex-text-primary)]">
                Standard grid columns:
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm text-[var(--cortex-text-secondary)]">
                <li>
                  <strong>Study Design</strong> — RCT, cohort, case-control, case series, etc.
                </li>
                <li>
                  <strong>Sample Size</strong> — Number of patients or cases.
                </li>
                <li>
                  <strong>Population</strong> — Patient demographics and inclusion criteria.
                </li>
                <li>
                  <strong>Intervention</strong> — Exact device or method used.
                </li>
                <li>
                  <strong>Comparator</strong> — Control group or standard of care.
                </li>
                <li>
                  <strong>Primary Outcome</strong> — Main efficacy or safety endpoint and result.
                </li>
                <li>
                  <strong>Adverse Events</strong> — Reported safety signals.
                </li>
                <li>
                  <strong>Follow-up Duration</strong> — Length of observation period.
                </li>
              </ul>
            </div>
            <StepList
              steps={[
                'Open the "Extraction Grid" tab.',
                'Review the default columns. Add or remove columns using the column configuration panel on the right.',
                'Click "Extract All" to run AI extraction for all articles, or click the "Extract" button on an individual row to extract one article at a time.',
                'Review each extracted value. Cells with low AI confidence are highlighted in amber.',
                'Click any cell to edit its value manually. Your edits are saved automatically.',
                'Use the filter bar at the top to filter rows by extraction status, study design, or other criteria.',
              ]}
            />
            <TipBox>
              Use per-row extraction when you want to inspect the AI reasoning immediately. Use
              "Extract All" for batch processing, then review flagged cells in a second pass.
            </TipBox>
          </div>

          {/* 5.4 Quality Assessment */}
          <div className="space-y-4">
            <SubHeading id="tut-soa-quality">Quality Assessment</SubHeading>
            <Screenshot
              src="/docs/screenshots/07-soa-tab-quality.png"
              alt="SOA Quality Assessment tab"
              caption="SOA Quality Assessment — structured risk-of-bias evaluation"
            />
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              The Quality Assessment tab evaluates each study's methodological quality and risk of
              bias using validated tools. Cortex automatically selects the appropriate tool based on
              study design.
            </p>
            <div className="rounded-lg border border-[var(--cortex-border)] bg-[var(--cortex-bg-secondary)] p-4 space-y-2">
              <p className="text-sm font-semibold text-[var(--cortex-text-primary)]">
                Supported quality tools:
              </p>
              <ul className="space-y-1.5 text-sm text-[var(--cortex-text-secondary)]">
                <li>
                  <strong>QUADAS-2</strong> — Quality Assessment of Diagnostic Accuracy Studies.
                  Applied to diagnostic accuracy studies (sensitivity/specificity).
                </li>
                <li>
                  <strong>ROBINS-I</strong> — Risk of Bias in Non-randomised Studies of
                  Interventions. Applied to observational studies and cohorts.
                </li>
                <li>
                  <strong>Newcastle-Ottawa Scale</strong> — Applied to case-control and cohort
                  studies for comparative effectiveness.
                </li>
              </ul>
            </div>
            <StepList
              steps={[
                'Open the "Quality" tab.',
                'Click "Assess All" to run AI-powered quality assessment for all articles, or "Assess" on a single row.',
                'The AI fills in each domain of the quality tool with a rating (Low / High / Unclear risk) and a justification.',
                'Review each assessment. Click on a row to open the detailed domain-by-domain view.',
                'Override any AI rating by clicking the rating badge and selecting a different value.',
                'Add your own notes in the "Reviewer Comments" field for each article.',
              ]}
            />
            <ImportantBox>
              Always review AI-generated quality assessments before finalising. The AI provides a
              first pass based on the abstract and available text, but reviewer judgment is required
              for domains that need full-text evaluation.
            </ImportantBox>
          </div>

          {/* 5.5 Narrative Drafting */}
          <div className="space-y-4">
            <SubHeading id="tut-soa-narrative">Narrative Drafting</SubHeading>
            <Screenshot
              src="/docs/screenshots/07-soa-tab-narrative.png"
              alt="SOA Narrative Drafting tab"
              caption="SOA Narrative tab — AI-drafted thematic sections"
            />
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              The Narrative tab generates structured narrative text from the extracted grid data and
              quality assessments. Narratives are organised by thematic sections aligned with CE-MDR
              Annex XIV and FDA guidance.
            </p>
            <StepList
              steps={[
                'Open the "Narrative" tab.',
                'The left panel lists narrative sections (Background, Clinical Performance, Safety, State of the Art Summary, etc.).',
                'Select a section and click "Generate Draft" to ask the AI to write that section.',
                'The AI drafts the section based on the extraction grid data and quality assessments already in the SOA.',
                'Review the draft in the right panel. Use the inline editor to modify text directly.',
                'Click "Accept" to mark the section as approved, or "Regenerate" to get a new AI draft.',
                'Repeat for all sections until the full narrative is complete.',
              ]}
            />
            <TipBox>
              Run extractions and quality assessments before generating narratives. The AI uses the
              structured data in the grid to ground its narrative — better grid data means better
              narratives.
            </TipBox>
          </div>

          {/* 5.6 Device Registry */}
          <div className="space-y-4">
            <SubHeading id="tut-soa-devices">Device Registry</SubHeading>
            <Screenshot
              src="/docs/screenshots/07-soa-tab-devices.png"
              alt="SOA Device Registry tab"
              caption="SOA Devices tab — similar and competitor devices discovered from literature"
            />
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              The Device Registry tab automatically discovers similar and equivalent devices
              mentioned in the literature. This is particularly useful for CE-MDR equivalence claims
              and FDA predicate device identification.
            </p>
            <StepList
              steps={[
                'Open the "Devices" tab.',
                'Click "Discover Devices" to run AI extraction of device mentions across all articles.',
                'Review the discovered devices. Each entry shows device name, manufacturer, study mentions, and the articles that reference it.',
                'Mark devices as "Equivalent Candidate", "Comparator", or "Background" using the tag selector.',
                'These tagged devices are available as structured data when writing CER equivalence sections.',
              ]}
            />
          </div>

          {/* 5.7 Claims Management */}
          <div className="space-y-4">
            <SubHeading id="tut-soa-claims">Claims Management</SubHeading>
            <Screenshot
              src="/docs/screenshots/07-soa-tab-claims.png"
              alt="SOA Claims Management tab"
              caption="SOA Claims tab — evidence-backed clinical claims with approval workflow"
            />
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              Claims are structured, evidence-backed statements about your device's clinical
              performance and safety. The Claims tab generates candidate claims from the narrative,
              links them to supporting evidence, and manages the approval workflow.
            </p>
            <StepList
              steps={[
                'Open the "Claims" tab.',
                'Click "Generate from Narrative" to have the AI extract candidate clinical claims from the approved narrative sections.',
                'Each claim displays: claim text, category (Performance / Safety / Equivalence), evidence strength (Strong / Moderate / Weak), and supporting article references.',
                'Review each claim. Click "Approve" to accept it as a validated claim, "Reject" to dismiss it, or "Edit" to modify the claim text.',
                'Approved claims with strong evidence will be included in the CER and can be referenced in labelling and IFU documents.',
                'After reviewing all claims, click "Lock SOA" in the Overview tab to freeze the analysis and enable CER generation.',
              ]}
            />
            <ImportantBox>
              <strong>Lock SOA before generating a CER.</strong> Locking prevents further edits to
              the SOA and creates a timestamped, auditable snapshot of your analysis. You cannot
              unlock an SOA once it is locked.
            </ImportantBox>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  6. Clinical Evaluation Report (CER)                          */}
        {/* ============================================================ */}
        <section className="space-y-5">
          <SectionHeading id="tutorial-cer">6. Clinical Evaluation Report (CER)</SectionHeading>
          <p className="text-sm leading-relaxed text-[var(--cortex-text-secondary)]">
            The <strong>CER module</strong> assembles the locked SOA narrative, quality summaries,
            claims, and regulatory metadata into a structured Clinical Evaluation Report document
            aligned with MEDDEV 2.7/1 rev.4 (CE-MDR) or FDA guidance for clinical evidence
            summaries.
          </p>
          <div className="rounded-lg border border-[var(--cortex-border)] bg-[var(--cortex-bg-secondary)] p-4 space-y-2">
            <p className="text-sm font-semibold text-[var(--cortex-text-primary)]">
              CER section structure (CE-MDR):
            </p>
            <ul className="list-inside list-disc space-y-1 text-sm text-[var(--cortex-text-secondary)]">
              <li>Section 1 — Device Description and Specifications</li>
              <li>Section 2 — Intended Purpose and Clinical Claims</li>
              <li>Section 3 — Clinical Background (from SOA Background narrative)</li>
              <li>Section 4 — Equivalent Devices (from Device Registry)</li>
              <li>Section 5 — Clinical Performance Data (from SOA Clinical narrative)</li>
              <li>Section 6 — Clinical Safety Data (from SOA Safety narrative)</li>
              <li>Section 7 — Post-Market Clinical Follow-up Plan</li>
              <li>Section 8 — Conclusions</li>
            </ul>
          </div>
          <StepList
            steps={[
              'Ensure your SOA is locked before proceeding.',
              'From the Project Dashboard, click "New CER".',
              'Select the locked SOA to use as the evidence base.',
              'The CER wizard pre-fills sections from the SOA narrative. Review and edit each section.',
              'Configure the regulatory context (CE-MDR Annex XIV or FDA Clinical Summary format).',
              'Generate the final document using the "Export" button (PDF or DOCX).',
            ]}
          />
          <TipBox>
            See <strong>Settings → CER</strong> to configure default CER templates, regulatory
            pathway defaults, and document metadata such as organisation name and logo.
          </TipBox>
        </section>

        {/* ============================================================ */}
        {/*  7. Validation Studies                                        */}
        {/* ============================================================ */}
        <section className="space-y-5">
          <SectionHeading id="tutorial-validation">7. Validation Studies</SectionHeading>
          <p className="text-sm leading-relaxed text-[var(--cortex-text-secondary)]">
            The <strong>Validation module</strong> manages clinical studies conducted by your
            organisation to generate first-party evidence for the device. This is distinct from SLS
            literature searches, which focus on published third-party evidence.
          </p>
          <div className="rounded-lg border border-[var(--cortex-border)] bg-[var(--cortex-bg-secondary)] p-4 space-y-2">
            <p className="text-sm font-semibold text-[var(--cortex-text-primary)]">
              Typical validation study types:
            </p>
            <ul className="list-inside list-disc space-y-1 text-sm text-[var(--cortex-text-secondary)]">
              <li>
                <strong>Analytical Performance Study</strong> — Accuracy, precision, and
                reproducibility testing.
              </li>
              <li>
                <strong>Clinical Performance Study</strong> — Sensitivity, specificity, and
                predictive values in a clinical cohort.
              </li>
              <li>
                <strong>Usability Study</strong> — Human factors and user interface validation.
              </li>
              <li>
                <strong>Equivalence Study</strong> — Head-to-head comparison with a predicate
                device.
              </li>
            </ul>
          </div>
          <StepList
            steps={[
              'From the Project Dashboard, click "New Validation Study".',
              'Configure the study: name, type, hypothesis, primary endpoint, sample size, and study protocol reference.',
              'Import study data (CSV or manual entry) using the Data Import tool.',
              'Cortex computes summary statistics and generates a structured study report.',
              'Link the validation study to your SOA or CER as supporting first-party evidence.',
            ]}
          />
        </section>

        {/* ============================================================ */}
        {/*  8. Post-Market Surveillance (PMS)                            */}
        {/* ============================================================ */}
        <section className="space-y-5">
          <SectionHeading id="tutorial-pms">8. Post-Market Surveillance (PMS)</SectionHeading>
          <p className="text-sm leading-relaxed text-[var(--cortex-text-secondary)]">
            The <strong>PMS module</strong> manages the ongoing surveillance obligations required
            after a device is placed on the market. Under CE-MDR Article 83–86, manufacturers must
            maintain a PMS system and produce periodic summary reports (PSUR) and post-market
            clinical follow-up (PMCF) plans.
          </p>
          <div className="rounded-lg border border-[var(--cortex-border)] bg-[var(--cortex-bg-secondary)] p-4 space-y-2">
            <p className="text-sm font-semibold text-[var(--cortex-text-primary)]">
              PMS module components:
            </p>
            <ul className="list-inside list-disc space-y-1 text-sm text-[var(--cortex-text-secondary)]">
              <li>
                <strong>PMS Plan</strong> — Defines the surveillance activities, data sources, and
                review schedule.
              </li>
              <li>
                <strong>PSUR Cycles</strong> — Periodic Safety Update Reports generated on a defined
                schedule (annually for Class IIb/III).
              </li>
              <li>
                <strong>PMCF Reports</strong> — Post-Market Clinical Follow-up reports documenting
                ongoing clinical data collection.
              </li>
            </ul>
          </div>
          <StepList
            steps={[
              'From the Project Dashboard, click "New PMS Plan".',
              'Define the PMS plan scope: data sources (complaint database, literature, registry data), review frequency, and responsible personnel.',
              'After the device is on the market, create a PSUR cycle from the plan to document a reporting period.',
              'Import adverse event data, complaint records, and any new literature findings.',
              'Generate the PSUR document using the "Export PSUR" button.',
              'For PMCF obligations, create a PMCF report linked to the PMS plan.',
            ]}
          />
          <TipBox>
            See <strong>Settings → PMS</strong> to configure default PSUR templates, reporting
            intervals, and alert thresholds for complaint rates.
          </TipBox>
        </section>

        {/* ============================================================ */}
        {/*  9. Understanding the AI Pipeline                             */}
        {/* ============================================================ */}
        <section className="space-y-5">
          <SectionHeading id="ai-pipeline">9. Understanding the AI Pipeline</SectionHeading>
          <p className="text-sm leading-relaxed text-[var(--cortex-text-secondary)]">
            Every AI action in Cortex — from article scoring to narrative drafting — follows the
            same asynchronous pipeline. Understanding this helps you know what to expect when
            triggering AI tasks and how to troubleshoot issues.
          </p>

          <FlowContainer title="AI Task Pipeline — What happens when you click an AI button">
            <FlowNode
              icon="👆"
              label="You click an AI action"
              description={`"Extract Grid Data", "Generate Draft", "Run Scoring"...`}
              variant="start"
            />
            <FlowArrow label="HTTP request" />
            <FlowNode
              icon="🌐"
              label="GraphQL Mutation → API Server"
              description="Creates an AsyncTask record in the database"
              variant="action"
            />
            <FlowArrow label="Redis pub/sub" />
            <FlowNode
              icon="⚙️"
              label="BullMQ Worker picks up the job"
              description="Background process, separate from the web server"
              variant="default"
            />
            <FlowArrow label="Config resolution" />
            <div className="w-full rounded-xl border border-violet-200 bg-violet-50 p-4">
              <p className="mb-2 text-center text-xs font-bold text-violet-700">
                Which LLM to use?
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-violet-600">
                <span className="rounded-md bg-violet-200 px-2 py-1 font-semibold">
                  1. Task-level
                </span>
                <span>{'>'}</span>
                <span className="rounded-md bg-violet-200 px-2 py-1 font-semibold">
                  2. Project-level
                </span>
                <span>{'>'}</span>
                <span className="rounded-md bg-violet-200 px-2 py-1 font-semibold">
                  3. System Default
                </span>
              </div>
              <p className="mt-2 text-center text-[10px] text-violet-500">
                Configured in Settings → AI Models
              </p>
            </div>
            <FlowArrow label="API call" />
            <FlowBranch>
              <FlowNode icon="🟢" label="OpenAI" description="GPT-4o / GPT-4o-mini" variant="ai" />
              <FlowNode
                icon="🟣"
                label="Anthropic"
                description="Claude Sonnet / Haiku"
                variant="ai"
              />
              <FlowNode
                icon="🔵"
                label="Ollama"
                description="Llama3 / Mistral (local)"
                variant="ai"
              />
            </FlowBranch>
            <FlowArrow label="Response" />
            <FlowNode
              icon="💾"
              label="Result stored in database"
              description="Progress events published via Redis in real-time"
              variant="default"
            />
            <FlowArrow />
            <FlowNode
              icon="🖥️"
              label="Frontend updates automatically"
              description="Results appear in the UI — no page reload needed"
              variant="result"
            />
          </FlowContainer>

          <div className="rounded-lg border border-[var(--cortex-border)] bg-[var(--cortex-bg-secondary)] p-4 space-y-3">
            <p className="text-sm font-semibold text-[var(--cortex-text-primary)]">
              What this means in practice:
            </p>
            <ul className="space-y-2 text-sm text-[var(--cortex-text-secondary)]">
              <li>
                <strong>Tasks are non-blocking.</strong> You can navigate away from a page while an
                AI task is running. The result will appear when you return to the page.
              </li>
              <li>
                <strong>Multiple tasks can run in parallel.</strong> You can kick off extractions on
                many articles simultaneously. The worker queue processes them concurrently.
              </li>
              <li>
                <strong>Failed tasks show an error status.</strong> If an API key is invalid or the
                provider is unreachable, the task will fail with a visible error message. Check
                Settings → API Keys if you see repeated failures.
              </li>
              <li>
                <strong>Provider selection is hierarchical.</strong> If you configure a model
                override at the project level, it takes precedence over the system default. This
                lets you use different models for different projects without changing global
                settings.
              </li>
            </ul>
          </div>

          <TipBox>
            If an AI task seems stuck, refresh the page. The task status is fetched live from the
            database on page load. If the task is still showing as "running" after several minutes,
            it may have failed silently — check the admin task queue in Settings.
          </TipBox>
        </section>

        {/* ============================================================ */}
        {/*  10. Tips & Best Practices                                    */}
        {/* ============================================================ */}
        <section className="space-y-5">
          <SectionHeading id="tips">10. Tips & Best Practices</SectionHeading>
          <p className="text-sm text-[var(--cortex-text-secondary)]">
            These are the most common recommendations from experienced Cortex users.
          </p>

          <div className="space-y-4">
            <div className="rounded-lg border border-[var(--cortex-border)] p-4 space-y-1">
              <p className="text-sm font-semibold text-[var(--cortex-text-primary)]">
                1. Always configure your API key first
              </p>
              <p className="text-sm text-[var(--cortex-text-secondary)]">
                No AI feature works without a valid key. Set it up in Settings → API Keys before
                creating your first project.
              </p>
            </div>

            <div className="rounded-lg border border-[var(--cortex-border)] p-4 space-y-1">
              <p className="text-sm font-semibold text-[var(--cortex-text-primary)]">
                2. Use SOA_CLINICAL session type for State of the Art searches
              </p>
              <p className="text-sm text-[var(--cortex-text-secondary)]">
                The session type influences the AI scoring criteria. SOA_CLINICAL is optimised for
                clinical performance studies — the core of any SOA analysis. Use separate sessions
                with DEVICE_SAFETY and BACKGROUND types for supplementary searches.
              </p>
            </div>

            <div className="rounded-lg border border-[var(--cortex-border)] p-4 space-y-1">
              <p className="text-sm font-semibold text-[var(--cortex-text-primary)]">
                3. Review AI-generated content before accepting
              </p>
              <p className="text-sm text-[var(--cortex-text-secondary)]">
                AI extractions, quality assessments, and narrative drafts are starting points, not
                final outputs. Regulatory documents require human review. Always read AI outputs
                critically and verify key values against the source articles.
              </p>
            </div>

            <div className="rounded-lg border border-[var(--cortex-border)] p-4 space-y-1">
              <p className="text-sm font-semibold text-[var(--cortex-text-primary)]">
                4. Lock SOA when your analysis is finalized
              </p>
              <p className="text-sm text-[var(--cortex-text-secondary)]">
                Locking creates an auditable snapshot of your analysis with a timestamp and reviewer
                record. This is required for traceability under EU MDR Article 61(10) and is best
                practice for FDA submissions. Do not lock until all reviews are complete — locking
                cannot be undone.
              </p>
            </div>

            <div className="rounded-lg border border-[var(--cortex-border)] p-4 space-y-1">
              <p className="text-sm font-semibold text-[var(--cortex-text-primary)]">
                5. Use the Quality tab to validate extraction accuracy
              </p>
              <p className="text-sm text-[var(--cortex-text-secondary)]">
                The quality assessment tab not only evaluates study design — it also reveals where
                the AI had difficulty extracting data (e.g. unclear reporting). Use high
                risk-of-bias ratings as a signal to manually re-check those articles' grid entries.
              </p>
            </div>

            <div className="rounded-lg border border-[var(--cortex-border)] p-4 space-y-1">
              <p className="text-sm font-semibold text-[var(--cortex-text-primary)]">
                6. Keep your PICO scope precise
              </p>
              <p className="text-sm text-[var(--cortex-text-secondary)]">
                The Intervention and Population fields in your project scope are used directly in AI
                scoring prompts. Vague descriptions lead to lower scoring precision. Be specific
                about your device's mechanism, target anatomy, and patient population.
              </p>
            </div>

            <div className="rounded-lg border border-[var(--cortex-border)] p-4 space-y-1">
              <p className="text-sm font-semibold text-[var(--cortex-text-primary)]">
                7. Generate narratives after completing extractions
              </p>
              <p className="text-sm text-[var(--cortex-text-secondary)]">
                Narratives are generated from the structured data in the extraction grid. The more
                complete and accurate your grid, the better the AI narrative. Generate narratives as
                one of the last steps, after extractions and quality assessments are reviewed and
                corrected.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-[var(--cortex-border)] bg-[var(--cortex-bg-secondary)] p-4">
            <p className="text-sm font-semibold text-[var(--cortex-text-primary)] mb-2">
              Ready for more detail?
            </p>
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              This tutorial covers the end-to-end workflow. For detailed field-by-field
              documentation, validation rules, and regulatory examples, see the{' '}
              <a href="/help" className="text-[var(--cortex-blue-600)] hover:underline">
                Cortex User Guide (Help page)
              </a>
              .
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
