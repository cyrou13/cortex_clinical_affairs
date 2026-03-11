import { useState, useEffect, useCallback, type MouseEvent } from 'react';
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
  { id: 'introduction', label: 'Introduction' },
  {
    id: 'project-creation',
    label: 'Project Creation',
    children: [
      { id: 'project-step1', label: 'Step 1 — General Info' },
      { id: 'project-step2', label: 'Step 2 — CEP Scope' },
      { id: 'project-step3', label: 'Step 3 — Classification' },
    ],
  },
  {
    id: 'sls',
    label: 'SLS — Literature Search',
    children: [
      { id: 'sls-sessions', label: 'Session Creation' },
      { id: 'sls-query', label: 'Query Builder' },
      { id: 'sls-filters', label: 'AI Filters & Scoring' },
      { id: 'sls-screening', label: 'Screening & Exclusion' },
    ],
  },
  {
    id: 'soa',
    label: 'SOA — State of the Art',
    children: [
      { id: 'soa-creation', label: 'SOA Creation' },
      { id: 'soa-grid', label: 'Extraction Grid' },
      { id: 'soa-quality', label: 'Quality Assessment' },
      { id: 'soa-narrative', label: 'Narrative Drafting' },
      { id: 'soa-devices', label: 'Device Registry' },
      { id: 'soa-claims', label: 'Claims Management' },
    ],
  },
  {
    id: 'cer',
    label: 'CER — Evaluation Report',
    children: [
      { id: 'cer-creation', label: 'CER Creation' },
      { id: 'cer-sections', label: 'Section Assembly' },
    ],
  },
  {
    id: 'validation',
    label: 'Validation',
    children: [
      { id: 'validation-study', label: 'Study Configuration' },
      { id: 'validation-data', label: 'Data Import' },
    ],
  },
  {
    id: 'pms',
    label: 'PMS — Post-Market',
    children: [
      { id: 'pms-plan', label: 'PMS Plan & Cycles' },
      { id: 'pms-reports', label: 'PSUR & PMCF Reports' },
    ],
  },
  { id: 'user-management', label: 'User Management' },
  {
    id: 'architecture',
    label: 'Architecture Overview',
    children: [
      { id: 'architecture-stack', label: 'Technology Stack' },
      { id: 'architecture-llm', label: 'LLM Pipeline' },
      { id: 'architecture-config', label: 'Config Resolution' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings & Configuration',
    children: [
      { id: 'settings-general', label: 'General Settings' },
      { id: 'settings-modules', label: 'Module Settings' },
      { id: 'settings-ai', label: 'AI Configuration' },
      { id: 'settings-api-keys', label: 'API Keys' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Reusable sub-components                                            */
/* ------------------------------------------------------------------ */

function Badge({
  variant,
  children,
}: {
  variant: 'fda' | 'cemdr' | 'high' | 'medium' | 'low' | 'neutral';
  children: React.ReactNode;
}) {
  const cls =
    variant === 'fda'
      ? 'bg-blue-100 text-blue-800 border-blue-200'
      : variant === 'cemdr'
        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
        : variant === 'high'
          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
          : variant === 'medium'
            ? 'bg-amber-100 text-amber-800 border-amber-200'
            : variant === 'low'
              ? 'bg-red-100 text-red-800 border-red-200'
              : 'bg-[var(--cortex-bg-secondary)] text-[var(--cortex-text-secondary)] border-[var(--cortex-border)]';
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
}

function ComparisonTable({
  rows,
}: {
  rows: { field: string; fda: string; cemdr: string; required?: boolean }[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--cortex-border)] bg-[var(--cortex-bg-secondary)]">
            <th className="px-3 py-2 text-left font-medium text-[var(--cortex-text-secondary)]">
              Field
            </th>
            <th className="px-3 py-2 text-left font-medium">
              <Badge variant="fda">FDA 510(k)</Badge>
            </th>
            <th className="px-3 py-2 text-left font-medium">
              <Badge variant="cemdr">CE-MDR</Badge>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className="border-b border-[var(--cortex-border)] hover:bg-[var(--cortex-bg-secondary)]/50"
            >
              <td className="px-3 py-2 font-medium text-[var(--cortex-text-primary)]">
                {r.field}
                {r.required && <span className="ml-1 text-red-500">*</span>}
              </td>
              <td className="px-3 py-2 text-[var(--cortex-text-secondary)]">{r.fda}</td>
              <td className="px-3 py-2 text-[var(--cortex-text-secondary)]">{r.cemdr}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FieldDoc({
  name,
  type,
  required,
  description,
}: {
  name: string;
  type: string;
  required: boolean;
  description: string;
}) {
  return (
    <div className="flex items-start gap-2 py-1">
      <code className="shrink-0 rounded bg-[var(--cortex-bg-secondary)] px-1.5 py-0.5 text-xs font-medium text-[var(--cortex-text-primary)]">
        {name}
      </code>
      <span className="shrink-0 text-xs text-[var(--cortex-text-muted)]">({type})</span>
      {required && <span className="shrink-0 text-xs text-red-500">required</span>}
      <span className="text-sm text-[var(--cortex-text-secondary)]">— {description}</span>
    </div>
  );
}

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="scroll-mt-4 border-b border-[var(--cortex-border)] pb-2 text-xl font-semibold text-[var(--cortex-text-primary)]"
    >
      {children}
    </h2>
  );
}

function SubHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="scroll-mt-4 text-lg font-medium text-[var(--cortex-text-primary)]">
      {children}
    </h3>
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
/*  Main Help page                                                     */
/* ------------------------------------------------------------------ */

export default function HelpPage() {
  const [activeId, setActiveId] = useState('introduction');

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
            Contents
          </p>
          <TableOfContents activeId={activeId} />
        </div>
      </aside>

      {/* Content */}
      <div className="min-w-0 max-w-4xl flex-1 space-y-10">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[var(--cortex-text-primary)]">
            Cortex User Guide
          </h1>
          <p className="mt-1 text-[var(--cortex-text-secondary)]">
            Complete field-by-field documentation with CINA CSpine examples for FDA 510(k) and
            CE-MDR Class IIb regulatory pathways.
          </p>
        </div>

        {/* Tutorial CTA */}
        <a
          href="/help/tutorial"
          className="flex items-center gap-4 rounded-xl border border-[var(--cortex-blue-200)] bg-gradient-to-r from-[var(--cortex-blue-50)] to-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--cortex-blue-500)] text-white">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--cortex-text-primary)]">
              Getting Started Tutorial
            </p>
            <p className="mt-0.5 text-xs text-[var(--cortex-text-muted)]">
              Step-by-step guide with screenshots, workflow diagrams, and hands-on examples to get
              you up and running in minutes.
            </p>
          </div>
          <ChevronRight size={20} className="shrink-0 text-[var(--cortex-blue-400)]" />
        </a>

        {/* ============================================================ */}
        {/*  1. Introduction                                              */}
        {/* ============================================================ */}
        <section className="space-y-4">
          <SectionHeading id="introduction">Introduction</SectionHeading>
          <p className="text-sm leading-relaxed text-[var(--cortex-text-secondary)]">
            <strong>Cortex Clinical Affairs</strong> is a SaaS platform that streamlines regulatory
            compliance for medical device manufacturers under the EU MDR 2017/745 and FDA 21 CFR
            pathways. It orchestrates the full Clinical Evaluation lifecycle: systematic literature
            searches (SLS), state-of-the-art analysis (SOA), clinical evaluation reports (CER),
            clinical validation studies, and post-market surveillance (PMS).
          </p>
          <div className="rounded-lg border border-[var(--cortex-border)] bg-[var(--cortex-bg-secondary)] p-4">
            <p className="mb-2 text-sm font-semibold text-[var(--cortex-text-primary)]">
              Example Device — CINA CSpine
            </p>
            <ul className="list-inside list-disc space-y-1 text-sm text-[var(--cortex-text-secondary)]">
              <li>
                <strong>Device:</strong> CINA CSpine — AI-powered SaMD for automated detection of
                cervical spine abnormalities on CT scans
              </li>
              <li>
                <strong>Manufacturer:</strong> ACME Medical AI
              </li>
              <li>
                <strong>Intended use:</strong> Aid emergency department radiologists in triage of
                cervical spine injuries by flagging suspected fractures, dislocations, and
                degenerative findings
              </li>
              <li>
                <strong>FDA pathway:</strong> 510(k), Class II, 21 CFR 892.2050 — predicate K182234
                (Aidoc BriefCase)
              </li>
              <li>
                <strong>EU pathway:</strong> CE-MDR Class IIb, Rule 11 (software intended to provide
                information used to take decisions with diagnosis or therapeutic purposes)
              </li>
            </ul>
          </div>
          <p className="text-sm leading-relaxed text-[var(--cortex-text-secondary)]">
            Throughout this guide, every field is illustrated with concrete values for CINA CSpine
            under both <Badge variant="fda">FDA 510(k)</Badge> and{' '}
            <Badge variant="cemdr">CE-MDR</Badge> pathways. This lets you run a complete end-to-end
            project using realistic data.
          </p>
        </section>

        {/* ============================================================ */}
        {/*  2. Project Creation                                          */}
        {/* ============================================================ */}
        <section className="space-y-6">
          <SectionHeading id="project-creation">Project Creation</SectionHeading>
          <p className="text-sm text-[var(--cortex-text-secondary)]">
            Creating a project is a 3-step wizard. Each step collects different categories of
            information about your device and its regulatory context.
          </p>

          {/* Step 1 */}
          <div className="space-y-3">
            <SubHeading id="project-step1">Step 1 — General Information</SubHeading>
            <div className="space-y-1">
              <FieldDoc
                name="Project Name"
                type="text"
                required
                description="Unique project identifier. Include device name, pathway, and year for clarity."
              />
              <FieldDoc
                name="Device Name"
                type="text"
                required
                description="Commercial name of the medical device being evaluated."
              />
              <FieldDoc
                name="Device Class"
                type="select"
                required
                description="EU MDR risk classification (I, IIa, IIb, III). For FDA devices, map to the closest EU equivalent."
              />
              <FieldDoc
                name="Regulatory Context"
                type="select"
                required
                description="The regulatory pathway: CE_MDR (EU) or FDA_510K (US)."
              />
            </div>
            <ComparisonTable
              rows={[
                {
                  field: 'Project Name',
                  fda: 'CINA CSpine 510(k) Clinical Evaluation 2026',
                  cemdr: 'CINA CSpine CE-MDR Clinical Evaluation 2026',
                  required: true,
                },
                {
                  field: 'Device Name',
                  fda: 'CINA CSpine',
                  cemdr: 'CINA CSpine',
                  required: true,
                },
                {
                  field: 'Device Class',
                  fda: 'IIb (FDA Class II mapped)',
                  cemdr: 'IIb',
                  required: true,
                },
                {
                  field: 'Regulatory Context',
                  fda: 'FDA_510K',
                  cemdr: 'CE_MDR',
                  required: true,
                },
              ]}
            />
          </div>

          {/* Step 2 */}
          <div className="space-y-3">
            <SubHeading id="project-step2">Step 2 — CEP Scope</SubHeading>
            <div className="space-y-1">
              <FieldDoc
                name="CEP Scope"
                type="textarea"
                required
                description="High-level statement of what the clinical evaluation plan covers. References applicable regulations."
              />
              <FieldDoc
                name="CEP Objectives"
                type="textarea"
                required
                description="Specific objectives the evaluation must achieve. Drives SLS queries and CER structure."
              />
            </div>
            <ComparisonTable
              rows={[
                {
                  field: 'CEP Scope',
                  fda: 'Demonstrate substantial equivalence to predicate K182234 (Aidoc BriefCase) for AI-assisted cervical spine fracture detection on CT',
                  cemdr:
                    'Conformity with GSPR per MDR Annex XIV and MDCG 2020-13 for AI-assisted cervical spine abnormality detection',
                  required: true,
                },
                {
                  field: 'CEP Objectives',
                  fda: '1) Demonstrate equivalent sensitivity/specificity vs predicate\n2) Reader study comparing AI+radiologist vs radiologist alone\n3) Biocompatibility not applicable (SaMD)',
                  cemdr:
                    '1) GSPR compliance demonstration\n2) Benefit-risk analysis per MDCG 2020-5\n3) State-of-the-art comparison\n4) PMCF plan justification per MDCG 2020-7',
                  required: true,
                },
              ]}
            />
          </div>

          {/* Step 3 */}
          <div className="space-y-3">
            <SubHeading id="project-step3">Step 3 — Classification & Background</SubHeading>
            <div className="space-y-1">
              <FieldDoc
                name="CEP Classification"
                type="textarea"
                required
                description="Regulatory classification rationale, including rule/regulation references."
              />
              <FieldDoc
                name="CEP Clinical Background"
                type="textarea"
                required
                description="Clinical context: disease burden, current standard of care, unmet need your device addresses."
              />
            </div>
            <ComparisonTable
              rows={[
                {
                  field: 'CEP Classification',
                  fda: 'SaMD Class II under 21 CFR 892.2050 (Picture archiving and communications system). De Novo not required — predicate K182234 exists.',
                  cemdr:
                    'SaMD Class IIb per MDR Rule 11 — software intended to provide information used to take decisions with diagnosis purposes for conditions that are not life-threatening but irreversible (cervical spine fractures).',
                  required: true,
                },
                {
                  field: 'CEP Clinical Background',
                  fda: '~12,000 cervical spine injuries per year in the US (AANS). Missed C-spine fractures in emergency CT occur at 1-4% rate. AI triage reduces missed findings by 30-60% per published literature.',
                  cemdr:
                    'Cervical spine injuries represent a diagnostic challenge in EU emergency departments. Standard of care relies on radiologist interpretation with known inter-reader variability. Non-inferiority to standard of care is the threshold.',
                  required: true,
                },
              ]}
            />
          </div>
        </section>

        {/* ============================================================ */}
        {/*  3. SLS                                                       */}
        {/* ============================================================ */}
        <section className="space-y-6">
          <SectionHeading id="sls">SLS — Systematic Literature Search</SectionHeading>
          <p className="text-sm text-[var(--cortex-text-secondary)]">
            SLS automates MEDLINE/PubMed searches following PRISMA guidelines. Each project can have
            multiple search sessions covering different evidence categories. The SLS module uses a
            horizontal tab navigation — tabs are: Dashboard, Sessions, Query Builder, Articles,
            Screening. The session dashboard presents metrics cards summarizing the scope fields and
            real-time counts for queries, retrieved articles, and screened articles.
          </p>

          {/* Session Creation */}
          <div className="space-y-3">
            <SubHeading id="sls-sessions">Session Creation</SubHeading>
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              There are <strong>5 session types</strong>, each targeting a different evidence
              category. The scope fields adapt based on the type selected. The session dashboard
              displays a summary card with the session name, type badge, scope description, date
              range, and real-time counts for queries built, articles retrieved, and articles
              screened.
            </p>
            <div className="space-y-1">
              <FieldDoc
                name="Session Name"
                type="text"
                required
                description="Descriptive name for the search session."
              />
              <FieldDoc
                name="Session Type"
                type="select"
                required
                description="One of: DEVICE_SAFETY, DEVICE_PERFORMANCE, EQUIVALENT_DEVICE, STATE_OF_ART, CLINICAL_BACKGROUND."
              />
              <FieldDoc
                name="Scope"
                type="textarea"
                required
                description="What this session targets. Drives query generation."
              />
              <FieldDoc
                name="Date Range"
                type="date range"
                required
                description="Publication date window for the search (start — end)."
              />
              <FieldDoc
                name="Databases"
                type="multi-select"
                required
                description="Target databases: PubMed, Embase, Cochrane, etc. Configurable per session; defaults come from Module Settings."
              />
            </div>

            <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-[var(--cortex-text-muted)]">
              Examples by Session Type
            </p>

            {/* DEVICE_SAFETY */}
            <div className="rounded border border-[var(--cortex-border)] p-3">
              <p className="mb-2 text-sm font-medium text-[var(--cortex-text-primary)]">
                1. DEVICE_SAFETY
              </p>
              <ComparisonTable
                rows={[
                  {
                    field: 'Session Name',
                    fda: 'CINA CSpine Safety — 510(k)',
                    cemdr: 'CINA CSpine Safety — MDR',
                  },
                  {
                    field: 'Scope',
                    fda: 'Adverse events, false negatives leading to missed fractures, software malfunction rates for AI cervical spine detection systems',
                    cemdr:
                      'Serious incidents, field safety corrective actions (FSCA), and hazard analysis for AI-based cervical spine SaMD per MDR Art. 83',
                  },
                  {
                    field: 'Date Range',
                    fda: '2018-01-01 to 2026-01-31',
                    cemdr: '2018-01-01 to 2026-01-31',
                  },
                  {
                    field: 'Databases',
                    fda: 'PubMed, MAUDE (FDA)',
                    cemdr: 'PubMed, Embase, EUDAMED',
                  },
                ]}
              />
            </div>

            {/* DEVICE_PERFORMANCE */}
            <div className="rounded border border-[var(--cortex-border)] p-3">
              <p className="mb-2 text-sm font-medium text-[var(--cortex-text-primary)]">
                2. DEVICE_PERFORMANCE
              </p>
              <ComparisonTable
                rows={[
                  {
                    field: 'Session Name',
                    fda: 'CINA CSpine Performance — 510(k)',
                    cemdr: 'CINA CSpine Performance — MDR',
                  },
                  {
                    field: 'Scope',
                    fda: 'Sensitivity, specificity, AUC, reader study outcomes for AI cervical spine fracture detection compared to predicate K182234',
                    cemdr:
                      'Diagnostic accuracy (sensitivity, specificity, AUC), clinical performance per MDCG 2020-1 for AI cervical spine detection SaMD',
                  },
                ]}
              />
            </div>

            {/* EQUIVALENT_DEVICE */}
            <div className="rounded border border-[var(--cortex-border)] p-3">
              <p className="mb-2 text-sm font-medium text-[var(--cortex-text-primary)]">
                3. EQUIVALENT_DEVICE
              </p>
              <ComparisonTable
                rows={[
                  {
                    field: 'Session Name',
                    fda: 'Predicate & Similar Devices — 510(k)',
                    cemdr: 'Equivalent Devices — MDR',
                  },
                  {
                    field: 'Scope',
                    fda: 'Published clinical evidence on predicate K182234 (Aidoc BriefCase), similar 510(k)-cleared AI spine devices (Viz.ai, MaxQ AI)',
                    cemdr:
                      'Clinical data on equivalent devices per MDR Annex XIV §3 — technical, biological, and clinical equivalence for AI cervical spine SaMD',
                  },
                ]}
              />
            </div>

            {/* STATE_OF_ART */}
            <div className="rounded border border-[var(--cortex-border)] p-3">
              <p className="mb-2 text-sm font-medium text-[var(--cortex-text-primary)]">
                4. STATE_OF_ART
              </p>
              <ComparisonTable
                rows={[
                  {
                    field: 'Session Name',
                    fda: 'AI C-Spine Detection State of Art — FDA',
                    cemdr: 'AI C-Spine Detection State of Art — MDR',
                  },
                  {
                    field: 'Scope',
                    fda: 'Current standard of care for cervical spine fracture diagnosis, deep learning approaches for C-spine CT analysis, benchmark datasets',
                    cemdr:
                      'State of the art per MDCG 2020-13 §6: current clinical practice for C-spine diagnosis, available AI alternatives, accepted diagnostic thresholds in EU emergency departments',
                  },
                ]}
              />
            </div>

            {/* CLINICAL_BACKGROUND */}
            <div className="rounded border border-[var(--cortex-border)] p-3">
              <p className="mb-2 text-sm font-medium text-[var(--cortex-text-primary)]">
                5. CLINICAL_BACKGROUND
              </p>
              <ComparisonTable
                rows={[
                  {
                    field: 'Session Name',
                    fda: 'Cervical Spine Injury Epidemiology — FDA',
                    cemdr: 'Cervical Spine Injury Epidemiology — MDR',
                  },
                  {
                    field: 'Scope',
                    fda: 'Epidemiology of cervical spine injuries in US emergency settings, missed fracture rates, clinical impact of delayed diagnosis, NEXUS/CCR criteria',
                    cemdr:
                      'Epidemiology of cervical spine injuries in European emergency departments, clinical pathways, healthcare resource utilization, unmet diagnostic needs',
                  },
                ]}
              />
            </div>
          </div>

          {/* Query Builder */}
          <div className="space-y-3">
            <SubHeading id="sls-query">Query Builder</SubHeading>
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              After creating a session, build the PubMed/Embase query. Cortex can auto-generate
              queries from your session scope using AI, or you can write them manually.
            </p>
            <div className="space-y-1">
              <FieldDoc
                name="Query String"
                type="textarea"
                required
                description="Boolean search query using PubMed syntax (AND, OR, NOT, MeSH terms)."
              />
              <FieldDoc
                name="Max Results"
                type="number"
                required
                description="Maximum number of articles to retrieve. Recommended: 500–2000. Default comes from Module Settings (SLS section)."
              />
            </div>
            <ComparisonTable
              rows={[
                {
                  field: 'Query String',
                  fda: '("cervical spine"[MeSH] OR "c-spine" OR "cervical vertebrae") AND ("artificial intelligence" OR "deep learning" OR "machine learning") AND ("fracture detection" OR "fracture diagnosis") AND ("sensitivity" OR "specificity" OR "diagnostic accuracy")',
                  cemdr:
                    '("cervical spine"[MeSH] OR "cervical vertebrae") AND ("artificial intelligence" OR "deep learning" OR "computer-aided diagnosis") AND ("clinical evaluation" OR "diagnostic performance" OR "clinical investigation")',
                  required: true,
                },
                {
                  field: 'Max Results',
                  fda: '1000',
                  cemdr: '1000',
                  required: true,
                },
              ]}
            />
          </div>

          {/* AI Filters */}
          <div className="space-y-3">
            <SubHeading id="sls-filters">AI Filters & Scoring</SubHeading>
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              After query execution, Cortex uses AI to score article relevance. You can configure
              custom filters to refine results. The relevance threshold default is set in Module
              Settings (SLS section) and can be overridden per session.
            </p>
            <div className="space-y-1">
              <FieldDoc
                name="Relevance Threshold"
                type="number (0–100)"
                required
                description="Minimum AI relevance score for an article to pass screening. Default: 60."
              />
              <FieldDoc
                name="Custom Filter Name"
                type="text"
                required={false}
                description="Name of a custom scoring filter (e.g., focus on a sub-topic)."
              />
              <FieldDoc
                name="Custom Filter Prompt"
                type="textarea"
                required={false}
                description="AI prompt that defines what the filter should look for in the abstract."
              />
            </div>
            <ComparisonTable
              rows={[
                {
                  field: 'Relevance Threshold',
                  fda: '65',
                  cemdr: '60',
                },
                {
                  field: 'Custom Filter Name',
                  fda: 'Predicate Comparison',
                  cemdr: 'GSPR Evidence',
                },
                {
                  field: 'Custom Filter Prompt',
                  fda: 'Score higher if the article directly compares AI cervical spine detection software to Aidoc BriefCase or similar FDA-cleared predicates',
                  cemdr:
                    'Score higher if the article provides evidence relevant to GSPR compliance, particularly safety, clinical performance, or benefit-risk for AI diagnostic software',
                },
              ]}
            />
          </div>

          {/* Screening */}
          <div className="space-y-3">
            <SubHeading id="sls-screening">Screening & Exclusion</SubHeading>
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              Review AI-scored articles and apply inclusion/exclusion criteria. Set exclusion codes
              for structured PRISMA reporting.
            </p>
            <div className="space-y-1">
              <FieldDoc
                name="Exclusion Codes"
                type="multi-select"
                required={false}
                description="Predefined reasons for excluding an article (e.g., WRONG_POPULATION, WRONG_INTERVENTION, DUPLICATE, NO_FULL_TEXT)."
              />
              <FieldDoc
                name="Inclusion Criteria"
                type="textarea"
                required
                description="Criteria an article must meet to be included in the final review."
              />
              <FieldDoc
                name="Exclusion Criteria"
                type="textarea"
                required
                description="Criteria that disqualify an article from the review."
              />
            </div>
            <ComparisonTable
              rows={[
                {
                  field: 'Inclusion Criteria',
                  fda: 'Original research on AI-based cervical spine fracture detection; FDA-regulated or US study setting; reports sensitivity/specificity; published 2018–2026',
                  cemdr:
                    'Original research on AI cervical spine detection; European or internationally generalizable study; reports diagnostic accuracy metrics; published 2018–2026',
                },
                {
                  field: 'Exclusion Criteria',
                  fda: 'Animal studies; non-cervical spine; no performance metrics; retracted articles; non-English; case reports with <10 subjects',
                  cemdr:
                    'Animal studies; non-cervical spine anatomy; conference abstracts without full text; retracted articles; non-English/non-EU languages; pediatric-only populations (not in intended use)',
                },
              ]}
            />
          </div>
        </section>

        {/* ============================================================ */}
        {/*  4. SOA                                                       */}
        {/* ============================================================ */}
        <section className="space-y-6">
          <SectionHeading id="soa">SOA — State of the Art Analysis</SectionHeading>
          <p className="text-sm text-[var(--cortex-text-secondary)]">
            SOA synthesis turns your screened literature into structured evidence. Create an SOA
            report, extract data into a grid, assess study quality, draft thematic narratives,
            manage device comparisons, and generate regulatory claims.
          </p>

          {/* SOA Creation */}
          <div className="space-y-3">
            <SubHeading id="soa-creation">SOA Creation</SubHeading>
            <div className="space-y-1">
              <FieldDoc
                name="SOA Name"
                type="text"
                required
                description="Name for the state-of-the-art analysis report."
              />
              <FieldDoc
                name="SOA Type"
                type="select"
                required
                description="One of: NARRATIVE (qualitative synthesis), SYSTEMATIC (structured extraction), MIXED (both)."
              />
              <FieldDoc
                name="Research Questions"
                type="textarea"
                required
                description="Questions the SOA should answer. Drives narrative structure and grid columns."
              />
            </div>
            <ComparisonTable
              rows={[
                {
                  field: 'SOA Name',
                  fda: 'C-Spine AI Detection — State of Art 2026 (FDA)',
                  cemdr: 'C-Spine AI Detection — State of Art 2026 (MDR)',
                  required: true,
                },
                {
                  field: 'SOA Type',
                  fda: 'SYSTEMATIC',
                  cemdr: 'MIXED',
                  required: true,
                },
                {
                  field: 'Research Questions',
                  fda: '1) What is the diagnostic accuracy of AI-based C-spine fracture detection?\n2) How does AI compare to the predicate device (Aidoc BriefCase)?\n3) What are reported adverse events or failure modes?',
                  cemdr:
                    '1) What is the current standard of care for C-spine fracture diagnosis?\n2) What diagnostic accuracy benchmarks exist for AI C-spine SaMD?\n3) What benefit-risk considerations apply per MDCG 2020-5?\n4) What gaps exist in current clinical evidence?',
                  required: true,
                },
              ]}
            />
          </div>

          {/* Grid */}
          <div className="space-y-3">
            <SubHeading id="soa-grid">Extraction Grid</SubHeading>
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              The extraction grid is a structured table where each row is a study and columns
              capture pre-defined data fields. Cortex AI can auto-extract data from PDFs. The
              default grid template is configurable in Module Settings (SOA section). Each row
              surfaces an "Assess" button that triggers per-study quality assessment inline.
            </p>
            <div className="space-y-1">
              <FieldDoc
                name="Grid Columns"
                type="column definitions"
                required
                description="Define what data to extract from each study. Common columns include Author, Year, Study Design, Population, Intervention, Comparator, Outcomes."
              />
              <FieldDoc
                name="Auto-Extract"
                type="boolean"
                required={false}
                description="When enabled, AI automatically extracts grid data from uploaded PDF full texts. Configurable in Module Settings (SOA section). Extracted values are editable."
              />
            </div>
            <ComparisonTable
              rows={[
                {
                  field: 'Columns (common)',
                  fda: 'Author, Year, Study Design, N (subjects), Device/AI System, Comparator, Sensitivity, Specificity, AUC, FDA Status',
                  cemdr:
                    'Author, Year, Study Design, N (subjects), Device/AI System, Comparator, Sensitivity, Specificity, AUC, CE Mark Status, GSPR Coverage',
                },
                {
                  field: 'Example Row',
                  fda: 'Smith 2023, Retrospective, N=1200, Aidoc BriefCase, Radiologist, Se=95.2%, Sp=93.8%, AUC=0.97, K182234',
                  cemdr:
                    'Müller 2024, Prospective, N=800, CINA CSpine v2.1, Standard of care, Se=96.1%, Sp=94.3%, AUC=0.98, CE IIb, GSPR 1,6,8',
                },
              ]}
            />
          </div>

          {/* Quality */}
          <div className="space-y-3">
            <SubHeading id="soa-quality">Quality Assessment</SubHeading>
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              Each study is assessed for methodological quality. Cortex supports standard appraisal
              tools (QUADAS-2, ROBINS-I, Newcastle-Ottawa) and generates risk-of-bias summaries.
              Trigger quality assessment from the "Assess" button on any extraction grid row.
            </p>
            <div className="space-y-1">
              <FieldDoc
                name="Appraisal Tool"
                type="select"
                required
                description="Methodological quality framework: QUADAS_2 (diagnostic accuracy), ROBINS_I (interventional), NEWCASTLE_OTTAWA (observational)."
              />
              <FieldDoc
                name="Overall Quality"
                type="auto-calculated"
                required={false}
                description="Summary quality score: HIGH, MODERATE, or LOW. Based on domain-level assessments."
              />
            </div>
            <ComparisonTable
              rows={[
                {
                  field: 'Appraisal Tool',
                  fda: 'QUADAS-2 (diagnostic accuracy studies)',
                  cemdr: 'QUADAS-2 + ROBINS-I (mixed study designs)',
                  required: true,
                },
                {
                  field: 'Assessment Focus',
                  fda: 'Patient selection bias, index test conduct, reference standard, flow and timing',
                  cemdr:
                    'Same QUADAS-2 domains + confounding, selection of participants, deviations from intended interventions (ROBINS-I) for non-diagnostic studies',
                },
              ]}
            />
          </div>

          {/* Narrative Drafting */}
          <div className="space-y-3">
            <SubHeading id="soa-narrative">Narrative Drafting</SubHeading>
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              The <strong>NarrativeDraftPanel</strong> generates AI-written narrative text for each
              thematic section of the SOA (e.g., Diagnostic Accuracy, Comparator Devices, Safety
              Profile, Benefit-Risk). The narrative synthesizes evidence from the extraction grid
              and quality assessments.
            </p>
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              Each thematic section is drafted independently. The AI uses the extracted study data,
              quality scores, and the SOA research questions as context. Drafting is triggered
              per-section using the "Draft Narrative" button inside each section panel. Generation
              runs asynchronously — a progress indicator shows while the BullMQ worker processes the
              request.
            </p>
            <div className="space-y-1">
              <FieldDoc
                name="Thematic Section"
                type="select"
                required
                description="The thematic grouping for this narrative block (e.g., DIAGNOSTIC_ACCURACY, COMPARATOR_ANALYSIS, SAFETY, BENEFIT_RISK, STATE_OF_ART_GAPS)."
              />
              <FieldDoc
                name="Draft Text"
                type="rich text (auto-generated)"
                required={false}
                description="AI-generated narrative. Includes inline citations referencing articles from the extraction grid. Fully editable after generation."
              />
              <FieldDoc
                name="Status"
                type="badge"
                required={false}
                description="PENDING, GENERATING, DRAFT, ACCEPTED, REJECTED. Only ACCEPTED narratives are included in CER export."
              />
            </div>
            <div className="rounded-lg border border-[var(--cortex-border)] bg-[var(--cortex-bg-secondary)] p-4">
              <p className="mb-2 text-sm font-semibold text-[var(--cortex-text-primary)]">
                Accept / Reject Workflow
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm text-[var(--cortex-text-secondary)]">
                <li>
                  After generation, the draft appears in the panel with an Accept and Reject button.
                </li>
                <li>
                  <strong>Accept</strong> — marks the narrative as approved and locks it for CER
                  inclusion. You can still edit after accepting (status reverts to DRAFT until
                  re-accepted).
                </li>
                <li>
                  <strong>Reject</strong> — discards the current draft. You can re-trigger
                  generation at any time with an updated prompt or additional context.
                </li>
                <li>
                  Rejected drafts are retained in history for audit trail but are not included in
                  exports.
                </li>
              </ul>
            </div>
            <ComparisonTable
              rows={[
                {
                  field: 'Key Sections (FDA)',
                  fda: 'Predicate Comparison Narrative, Diagnostic Accuracy Summary, Adverse Event Analysis',
                  cemdr: '—',
                },
                {
                  field: 'Key Sections (MDR)',
                  fda: '—',
                  cemdr:
                    'State of the Art Narrative, Diagnostic Accuracy, Comparator Device Analysis, Safety Profile, Benefit-Risk Synthesis, Evidence Gap Analysis',
                },
              ]}
            />
          </div>

          {/* Device Registry */}
          <div className="space-y-3">
            <SubHeading id="soa-devices">Device Registry</SubHeading>
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              The <strong>DeviceRegistryPanel</strong> provides a structured registry of devices
              referenced in the SOA — including the subject device, predicate devices (for FDA
              510(k)), and equivalent devices (for CE-MDR). Each entry captures technical
              specifications for direct comparison.
            </p>
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              The "Discover Similar Devices" action uses AI to scan the extraction grid and
              literature for mentions of comparable devices. Discovered devices are presented as
              candidates that the user can accept (add to registry) or dismiss. This accelerates the
              equivalence argument in the CER.
            </p>
            <div className="space-y-1">
              <FieldDoc
                name="Device Name"
                type="text"
                required
                description="Commercial name of the referenced device."
              />
              <FieldDoc
                name="Device Type"
                type="select"
                required
                description="SUBJECT (the device under evaluation), PREDICATE (FDA 510(k) predicate), EQUIVALENT (CE-MDR equivalent device), COMPARATOR (clinical comparator only)."
              />
              <FieldDoc
                name="Manufacturer"
                type="text"
                required
                description="Name of the device manufacturer."
              />
              <FieldDoc
                name="Regulatory Status"
                type="text"
                required={false}
                description="Cleared/approved status: e.g., 510(k) K182234, CE Class IIb, De Novo, etc."
              />
              <FieldDoc
                name="Technical Specs"
                type="key-value pairs"
                required={false}
                description="Technical characteristics relevant to equivalence: intended use, principle of operation, software architecture, clinical indication."
              />
              <FieldDoc
                name="Similarity Score"
                type="auto-calculated"
                required={false}
                description="AI-computed similarity score (0–100) comparing technical, biological, and clinical characteristics to the subject device."
              />
            </div>
            <ComparisonTable
              rows={[
                {
                  field: 'Example — Subject Device',
                  fda: 'CINA CSpine, SUBJECT, ACME Medical AI, —',
                  cemdr: 'CINA CSpine, SUBJECT, ACME Medical AI, CE IIb pending',
                },
                {
                  field: 'Example — Predicate/Equivalent',
                  fda: 'Aidoc BriefCase, PREDICATE, Aidoc, K182234',
                  cemdr: 'SpineAnalyzer Pro, EQUIVALENT, NeuralMed, CE IIb, Sim=87',
                },
              ]}
            />
          </div>

          {/* Claims Management */}
          <div className="space-y-3">
            <SubHeading id="soa-claims">Claims Management</SubHeading>
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              The <strong>ClaimsManagement</strong> component tracks regulatory and marketing claims
              derived from the SOA evidence. Claims are grouped by thematic section (matching the
              narrative sections) so reviewers can trace each claim back to its supporting narrative
              and source articles.
            </p>
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              The <strong>"Generate from Narrative"</strong> button extracts claim candidates
              automatically from an accepted narrative draft. The AI identifies factual assertions
              that could serve as regulatory claims and proposes them with supporting evidence. Each
              generated claim arrives in PENDING status for review.
            </p>
            <div className="space-y-1">
              <FieldDoc
                name="Claim Text"
                type="textarea"
                required
                description="The claim statement. Should be specific, measurable, and directly supported by evidence."
              />
              <FieldDoc
                name="Claim Type"
                type="select"
                required
                description="SAFETY (absence of harm), PERFORMANCE (diagnostic accuracy), CLINICAL_BENEFIT (patient outcome improvement), EQUIVALENCE (comparison to predicate/equivalent device)."
              />
              <FieldDoc
                name="Thematic Section"
                type="select"
                required
                description="The narrative thematic section this claim belongs to. Used for grouping in the claims table and CER export."
              />
              <FieldDoc
                name="Evidence Strength"
                type="badge (HIGH / MEDIUM / LOW)"
                required={false}
                description="AI-assessed strength of supporting evidence. HIGH: consistent findings across multiple high-quality studies. MEDIUM: limited studies or moderate quality. LOW: single study, low quality, or indirect evidence."
              />
              <FieldDoc
                name="Supporting Articles"
                type="article links"
                required={false}
                description="Links to specific articles in the extraction grid that support this claim. Clicking an article link opens the article detail panel."
              />
              <FieldDoc
                name="Status"
                type="badge"
                required={false}
                description="PENDING (awaiting review), APPROVED (accepted by reviewer), REJECTED (dismissed)."
              />
            </div>

            <div className="rounded-lg border border-[var(--cortex-border)] bg-[var(--cortex-bg-secondary)] p-4">
              <p className="mb-2 text-sm font-semibold text-[var(--cortex-text-primary)]">
                Evidence Strength Badges
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-[var(--cortex-text-secondary)]">
                <div className="flex items-center gap-2">
                  <Badge variant="high">HIGH</Badge>
                  <span>Consistent findings across multiple high-quality studies.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="medium">MEDIUM</Badge>
                  <span>Limited studies or moderate methodological quality.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="low">LOW</Badge>
                  <span>Single study, low quality, or indirect evidence only.</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--cortex-border)] bg-[var(--cortex-bg-secondary)] p-4">
              <p className="mb-2 text-sm font-semibold text-[var(--cortex-text-primary)]">
                Approve / Reject Workflow
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm text-[var(--cortex-text-secondary)]">
                <li>
                  Claims appear in a table grouped by thematic section. Each row shows the claim
                  text, type, evidence strength badge, and supporting article links.
                </li>
                <li>
                  <strong>Approve</strong> — marks the claim as validated. Approved claims are
                  included in CER export and can be referenced in the regulatory submission.
                </li>
                <li>
                  <strong>Reject</strong> — dismisses the claim. Rejected claims remain visible with
                  REJECTED status for audit purposes but are excluded from exports.
                </li>
                <li>
                  You can manually add claims at any time, independently of the "Generate from
                  Narrative" workflow.
                </li>
              </ul>
            </div>

            <ComparisonTable
              rows={[
                {
                  field: 'Example Claim (FDA)',
                  fda: 'CINA CSpine demonstrates non-inferior sensitivity (96.1% vs 95.4%) compared to predicate K182234 in retrospective reader study (N=1200). Evidence: HIGH.',
                  cemdr: '—',
                },
                {
                  field: 'Example Claim (MDR)',
                  fda: '—',
                  cemdr:
                    'CINA CSpine reduces time-to-diagnosis for cervical spine fractures by 38% compared to standard radiologist workflow in prospective study (N=800, p<0.001). Evidence: HIGH.',
                },
              ]}
            />
          </div>
        </section>

        {/* ============================================================ */}
        {/*  5. CER                                                       */}
        {/* ============================================================ */}
        <section className="space-y-6">
          <SectionHeading id="cer">CER — Clinical Evaluation Report</SectionHeading>
          <p className="text-sm text-[var(--cortex-text-secondary)]">
            The CER compiles all clinical evidence into a formal regulatory document. Cortex
            generates CER sections from your SLS and SOA data.
          </p>

          {/* CER Creation */}
          <div className="space-y-3">
            <SubHeading id="cer-creation">CER Creation</SubHeading>
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              CER creation is a 3-step process: define scope, select evidence sources, configure
              output format.
            </p>
            <div className="space-y-1">
              <FieldDoc
                name="CER Title"
                type="text"
                required
                description="Title of the Clinical Evaluation Report."
              />
              <FieldDoc
                name="CER Template"
                type="select"
                required
                description="Document structure template: MEDDEV_2_7_1_REV4 (EU standard), FDA_510K_SUMMARY, CUSTOM. Default template version is configurable in Module Settings (CER section)."
              />
              <FieldDoc
                name="Evidence Sources"
                type="multi-select"
                required
                description="Select which SLS sessions and SOA analyses feed into this CER."
              />
              <FieldDoc
                name="Output Format"
                type="select"
                required
                description="DOCX (Word), PDF, or both."
              />
            </div>
            <ComparisonTable
              rows={[
                {
                  field: 'CER Title',
                  fda: 'Clinical Evaluation Report — CINA CSpine 510(k)',
                  cemdr: 'Clinical Evaluation Report — CINA CSpine MDR Annex XIV',
                  required: true,
                },
                {
                  field: 'CER Template',
                  fda: 'FDA_510K_SUMMARY',
                  cemdr: 'MEDDEV_2_7_1_REV4',
                  required: true,
                },
                {
                  field: 'Evidence Sources',
                  fda: 'All 5 SLS sessions + SOA Systematic',
                  cemdr: 'All 5 SLS sessions + SOA Mixed',
                  required: true,
                },
                {
                  field: 'Output Format',
                  fda: 'DOCX',
                  cemdr: 'DOCX + PDF',
                  required: true,
                },
              ]}
            />
          </div>

          {/* Section Assembly */}
          <div className="space-y-3">
            <SubHeading id="cer-sections">Section Assembly</SubHeading>
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              Cortex AI drafts each CER section from your evidence. You can review, edit,
              regenerate, and reorder sections before final export.
            </p>
            <div className="space-y-1">
              <FieldDoc
                name="Section Title"
                type="text"
                required
                description="Each section maps to a standard CER chapter (e.g., Device Description, Clinical Background, Literature Review, etc.)."
              />
              <FieldDoc
                name="Section Content"
                type="rich text"
                required
                description="AI-drafted text with citations. Editable by the user."
              />
              <FieldDoc
                name="Section Status"
                type="badge"
                required={false}
                description="DRAFT, REVIEW, APPROVED. Track section-level review workflow."
              />
            </div>
            <ComparisonTable
              rows={[
                {
                  field: 'Key Sections (FDA)',
                  fda: '1. Executive Summary\n2. Device Description\n3. Predicate Comparison\n4. Clinical Evidence Summary\n5. Substantial Equivalence Argument\n6. Conclusions',
                  cemdr: '—',
                },
                {
                  field: 'Key Sections (MDR)',
                  fda: '—',
                  cemdr:
                    '1. Scope\n2. Device Description\n3. Clinical Background & State of Art\n4. Clinical Evidence from Literature\n5. Equivalence Assessment\n6. Clinical Data from Investigation\n7. GSPR Compliance\n8. Benefit-Risk Analysis\n9. PMCF Plan\n10. Conclusions',
                },
              ]}
            />
          </div>
        </section>

        {/* ============================================================ */}
        {/*  6. Validation                                                */}
        {/* ============================================================ */}
        <section className="space-y-6">
          <SectionHeading id="validation">Validation — Clinical Studies</SectionHeading>
          <p className="text-sm text-[var(--cortex-text-secondary)]">
            The Validation module manages clinical investigation/study data. Configure study
            parameters and import performance results.
          </p>

          {/* Study Config */}
          <div className="space-y-3">
            <SubHeading id="validation-study">Study Configuration</SubHeading>
            <div className="space-y-1">
              <FieldDoc
                name="Study Name"
                type="text"
                required
                description="Name of the clinical validation study."
              />
              <FieldDoc
                name="Study Type"
                type="select"
                required
                description="RETROSPECTIVE, PROSPECTIVE, or READER_STUDY. Default study type is configurable in Module Settings (Validation section)."
              />
              <FieldDoc
                name="Primary Endpoint"
                type="textarea"
                required
                description="Main performance metric the study is designed to evaluate."
              />
              <FieldDoc
                name="Sample Size"
                type="number"
                required
                description="Number of subjects/cases in the study. The Module Settings (Validation section) exposes a default minimum sample size for power calculations."
              />
              <FieldDoc
                name="Reference Standard"
                type="text"
                required
                description="Gold standard against which the device is compared."
              />
            </div>
            <ComparisonTable
              rows={[
                {
                  field: 'Study Name',
                  fda: 'CINA CSpine 510(k) Reader Study',
                  cemdr: 'CINA CSpine MDR Clinical Investigation',
                  required: true,
                },
                {
                  field: 'Study Type',
                  fda: 'READER_STUDY',
                  cemdr: 'PROSPECTIVE',
                  required: true,
                },
                {
                  field: 'Primary Endpoint',
                  fda: 'Sensitivity of AI+radiologist vs radiologist alone for C-spine fracture detection (superiority margin: +5%)',
                  cemdr:
                    'Sensitivity for cervical spine abnormality detection (non-inferiority margin: -3% vs standard of care)',
                  required: true,
                },
                {
                  field: 'Sample Size',
                  fda: '500 CT studies (250 positive, 250 negative)',
                  cemdr: '800 consecutive ED CT scans',
                  required: true,
                },
                {
                  field: 'Reference Standard',
                  fda: 'Consensus read by 3 board-certified neuroradiologists + clinical follow-up',
                  cemdr:
                    'Adjudicated ground truth by 2 senior radiologists + 6-month clinical follow-up',
                  required: true,
                },
              ]}
            />
          </div>

          {/* Data Import */}
          <div className="space-y-3">
            <SubHeading id="validation-data">Data Import</SubHeading>
            <div className="space-y-1">
              <FieldDoc
                name="Data File"
                type="file upload (CSV)"
                required
                description="CSV file with study results. Columns must include: subject_id, ground_truth, device_output, reader_output (if reader study)."
              />
              <FieldDoc
                name="Statistical Method"
                type="select"
                required
                description="Analysis method: MCNEMAR (paired), CHI_SQUARE, EQUIVALENCE_TEST, NON_INFERIORITY. The confidence interval width is configurable in Module Settings (Validation section)."
              />
            </div>
            <ComparisonTable
              rows={[
                {
                  field: 'Statistical Method',
                  fda: 'MCNEMAR (paired reader study)',
                  cemdr: 'NON_INFERIORITY',
                  required: true,
                },
                {
                  field: 'CSV Columns',
                  fda: 'subject_id, ground_truth, ai_output, reader_without_ai, reader_with_ai',
                  cemdr: 'subject_id, ground_truth, device_output, standard_care_output, site_id',
                },
              ]}
            />
          </div>
        </section>

        {/* ============================================================ */}
        {/*  7. PMS                                                       */}
        {/* ============================================================ */}
        <section className="space-y-6">
          <SectionHeading id="pms">PMS — Post-Market Surveillance</SectionHeading>
          <p className="text-sm text-[var(--cortex-text-secondary)]">
            PMS ensures continued monitoring after market placement. Manage surveillance plans,
            reporting cycles, PSUR and PMCF reports.
          </p>

          {/* Plan & Cycles */}
          <div className="space-y-3">
            <SubHeading id="pms-plan">PMS Plan & Cycles</SubHeading>
            <div className="space-y-1">
              <FieldDoc
                name="PMS Plan Name"
                type="text"
                required
                description="Name of the post-market surveillance plan."
              />
              <FieldDoc
                name="Cycle Frequency"
                type="select"
                required
                description="How often PMS cycles run: ANNUAL, SEMI_ANNUAL, QUARTERLY. Default configurable in Module Settings (PMS section)."
              />
              <FieldDoc
                name="Data Sources"
                type="multi-select"
                required
                description="Sources monitored: VIGILANCE_REPORTS, CUSTOMER_COMPLAINTS, LITERATURE, REGISTRY_DATA, FIELD_SAFETY."
              />
              <FieldDoc
                name="PMCF Required"
                type="boolean"
                required
                description="Whether Post-Market Clinical Follow-up is needed. Usually yes for Class IIb+ devices."
              />
            </div>
            <ComparisonTable
              rows={[
                {
                  field: 'PMS Plan Name',
                  fda: 'CINA CSpine Post-Market Surveillance Plan 2026',
                  cemdr: 'CINA CSpine PMS Plan per MDR Art. 84',
                  required: true,
                },
                {
                  field: 'Cycle Frequency',
                  fda: 'ANNUAL',
                  cemdr: 'ANNUAL (mandatory for Class IIb per MDR Art. 86)',
                  required: true,
                },
                {
                  field: 'Data Sources',
                  fda: 'VIGILANCE_REPORTS, CUSTOMER_COMPLAINTS, LITERATURE, MAUDE',
                  cemdr:
                    'VIGILANCE_REPORTS, CUSTOMER_COMPLAINTS, LITERATURE, EUDAMED, FIELD_SAFETY',
                  required: true,
                },
                {
                  field: 'PMCF Required',
                  fda: 'Optional (FDA does not mandate PMCF)',
                  cemdr: 'Yes — mandatory for Class IIb per MDR Art. 61(11) and MDCG 2020-7',
                  required: true,
                },
              ]}
            />
          </div>

          {/* Reports */}
          <div className="space-y-3">
            <SubHeading id="pms-reports">PSUR & PMCF Reports</SubHeading>
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              Generate periodic safety update reports (PSUR) and PMCF evaluation reports from your
              PMS data. PSUR cycle defaults and notification settings are configurable in Module
              Settings (PMS section).
            </p>
            <div className="space-y-1">
              <FieldDoc
                name="Report Type"
                type="select"
                required
                description="PSUR (Periodic Safety Update Report) or PMCF_REPORT (Post-Market Clinical Follow-up Report)."
              />
              <FieldDoc
                name="Reporting Period"
                type="date range"
                required
                description="The time period covered by this report."
              />
              <FieldDoc
                name="Incident Summary"
                type="auto-generated"
                required={false}
                description="AI-compiled summary of vigilance reports, complaints, and field safety actions during the period."
              />
            </div>
            <ComparisonTable
              rows={[
                {
                  field: 'Report Type (primary)',
                  fda: 'PSUR (voluntary, recommended by FDA guidance)',
                  cemdr: 'PSUR (mandatory for Class IIb per MDR Art. 86)',
                  required: true,
                },
                {
                  field: 'PMCF Report',
                  fda: 'Not required (optional real-world evidence collection)',
                  cemdr: 'Mandatory per MDCG 2020-7 — included in PMCF evaluation report',
                },
                {
                  field: 'Reporting Period',
                  fda: '2026-01-01 to 2026-12-31',
                  cemdr: '2026-01-01 to 2026-12-31',
                  required: true,
                },
                {
                  field: 'Key Content',
                  fda: 'MDR/complaint analysis, MAUDE review, literature update, benefit-risk conclusion',
                  cemdr:
                    'Incident analysis, PMCF study results, updated literature review, updated benefit-risk per MDR Annex XIV Part B, SSCP update needs',
                },
              ]}
            />
          </div>
        </section>

        {/* ============================================================ */}
        {/*  8. User Management                                           */}
        {/* ============================================================ */}
        <section className="space-y-4">
          <SectionHeading id="user-management">User Management</SectionHeading>
          <p className="text-sm text-[var(--cortex-text-secondary)]">
            Manage team members, assign roles, and control access to projects and modules.
            Accessible via the Admin &gt; Users page.
          </p>

          <div className="space-y-1">
            <FieldDoc name="Name" type="text" required description="Full name of the user." />
            <FieldDoc
              name="Email"
              type="email"
              required
              description="Login email — must be unique across the organization."
            />
            <FieldDoc
              name="Role"
              type="select"
              required
              description="ADMIN (full access, user management), MANAGER (project creation, all modules), REVIEWER (read + comment), VIEWER (read-only)."
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--cortex-border)] bg-[var(--cortex-bg-secondary)]">
                  <th className="px-3 py-2 text-left font-medium text-[var(--cortex-text-secondary)]">
                    Role
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-[var(--cortex-text-secondary)]">
                    Create Projects
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-[var(--cortex-text-secondary)]">
                    Run SLS/SOA
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-[var(--cortex-text-secondary)]">
                    Edit CER
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-[var(--cortex-text-secondary)]">
                    Manage Users
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { role: 'ADMIN', create: true, run: true, edit: true, manage: true },
                  { role: 'MANAGER', create: true, run: true, edit: true, manage: false },
                  { role: 'REVIEWER', create: false, run: false, edit: false, manage: false },
                  { role: 'VIEWER', create: false, run: false, edit: false, manage: false },
                ].map((r) => (
                  <tr key={r.role} className="border-b border-[var(--cortex-border)]">
                    <td className="px-3 py-2 font-medium">{r.role}</td>
                    <td className="px-3 py-2">{r.create ? 'Yes' : '—'}</td>
                    <td className="px-3 py-2">{r.run ? 'Yes' : '—'}</td>
                    <td className="px-3 py-2">{r.edit ? 'Yes' : '—'}</td>
                    <td className="px-3 py-2">{r.manage ? 'Yes' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  9. Architecture Overview                                     */}
        {/* ============================================================ */}
        <section className="space-y-6">
          <SectionHeading id="architecture">Architecture Overview</SectionHeading>
          <p className="text-sm text-[var(--cortex-text-secondary)]">
            This section describes the technical architecture of Cortex for advanced users,
            integrators, and administrators who need to understand how the system processes requests
            end-to-end.
          </p>

          {/* Technology Stack */}
          <div className="space-y-3">
            <SubHeading id="architecture-stack">Technology Stack</SubHeading>
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              Cortex is a TypeScript-first monorepo. All packages share types via the{' '}
              <code className="rounded bg-[var(--cortex-bg-secondary)] px-1 py-0.5 text-xs">
                @cortex/shared
              </code>{' '}
              package.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--cortex-border)] bg-[var(--cortex-bg-secondary)]">
                    <th className="px-3 py-2 text-left font-medium text-[var(--cortex-text-secondary)]">
                      Layer
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-[var(--cortex-text-secondary)]">
                      Technology
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-[var(--cortex-text-secondary)]">
                      Role
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      layer: 'Backend API',
                      tech: 'Fastify 5 + Apollo Server 4 + Pothos v4',
                      role: 'GraphQL API server. Pothos schema builder generates the GraphQL schema from TypeScript types. Fastify handles HTTP transport and plugins.',
                    },
                    {
                      layer: 'ORM / Database',
                      tech: 'Prisma ORM + PostgreSQL',
                      role: 'Type-safe database access. Migrations managed with Prisma Migrate. PostgreSQL stores all entities including AppSetting for configuration.',
                    },
                    {
                      layer: 'Frontend',
                      tech: 'React 19 + Vite + Tailwind CSS 4 + Apollo Client 4',
                      role: 'Single-page application. Apollo Client manages GraphQL state and caching. Zustand for local UI state. TanStack Router for file-based routing.',
                    },
                    {
                      layer: 'Background Workers',
                      tech: 'BullMQ 5 + ioredis',
                      role: 'Asynchronous job processing. Each AI task (scoring, extraction, drafting, metadata extraction) runs as a BullMQ job dispatched to Redis queues.',
                    },
                    {
                      layer: 'LLM Providers',
                      tech: 'OpenAI, Anthropic, Ollama',
                      role: 'Pluggable AI providers. Provider selection and model configuration is resolved at runtime per task using the config resolution chain.',
                    },
                  ].map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-[var(--cortex-border)] hover:bg-[var(--cortex-bg-secondary)]/50"
                    >
                      <td className="px-3 py-2 font-medium text-[var(--cortex-text-primary)]">
                        {row.layer}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-[var(--cortex-text-secondary)]">
                        {row.tech}
                      </td>
                      <td className="px-3 py-2 text-[var(--cortex-text-secondary)]">{row.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* LLM Pipeline */}
          <div className="space-y-3">
            <SubHeading id="architecture-llm">LLM Pipeline</SubHeading>
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              All AI-powered features (relevance scoring, data extraction, narrative drafting,
              metadata extraction) follow the same asynchronous pipeline. Understanding this flow
              helps diagnose slow jobs and configure the system correctly.
            </p>
            <ol className="list-inside list-decimal space-y-2 text-sm text-[var(--cortex-text-secondary)]">
              <li>
                <strong>Mutation trigger</strong> — the frontend calls a GraphQL mutation (e.g.,{' '}
                <code className="rounded bg-[var(--cortex-bg-secondary)] px-1 py-0.5 text-xs">
                  startNarrativeDraft
                </code>
                ,{' '}
                <code className="rounded bg-[var(--cortex-bg-secondary)] px-1 py-0.5 text-xs">
                  scoreArticles
                </code>
                ). The resolver validates the request and creates a job record in the database with
                status PENDING.
              </li>
              <li>
                <strong>Redis dispatch</strong> — the resolver publishes the job ID to a BullMQ
                queue via Redis pub/sub. The job payload includes entity IDs and the resolved LLM
                configuration (provider, model, temperature).
              </li>
              <li>
                <strong>Worker processing</strong> — a BullMQ worker picks up the job. It loads the
                required entity data from the database using Prisma, constructs the prompt, and
                calls the LLM provider API. Workers read API keys from the database at startup (not
                from environment variables).
              </li>
              <li>
                <strong>Result persistence</strong> — the worker writes the LLM output back to the
                database (narrative text, extraction values, scores, etc.) and updates the job
                status to COMPLETED. On failure, status is set to FAILED with an error message.
              </li>
              <li>
                <strong>Frontend polling / subscription</strong> — the frontend polls or subscribes
                to job status. On COMPLETED, it refetches the relevant query to display the result.
              </li>
            </ol>
          </div>

          {/* Config Resolution */}
          <div className="space-y-3">
            <SubHeading id="architecture-config">Config Resolution Chain</SubHeading>
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              When a worker starts an LLM call, it resolves which provider and model to use by
              walking a four-level precedence chain. The first level that has a complete
              configuration wins.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--cortex-border)] bg-[var(--cortex-bg-secondary)]">
                    <th className="px-3 py-2 text-left font-medium text-[var(--cortex-text-secondary)]">
                      Priority
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-[var(--cortex-text-secondary)]">
                      Level
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-[var(--cortex-text-secondary)]">
                      Description
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-[var(--cortex-text-secondary)]">
                      Where to set
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      priority: '1 (highest)',
                      level: 'TASK',
                      desc: 'Per-task-type override (e.g., use GPT-4o for narrative drafting only).',
                      where: 'Settings > AI Configuration > System Defaults (per task type)',
                    },
                    {
                      priority: '2',
                      level: 'PROJECT',
                      desc: 'Per-project override — all tasks within this project use a specific model.',
                      where: 'Settings > AI Configuration > Project Overrides',
                    },
                    {
                      priority: '3',
                      level: 'SYSTEM',
                      desc: 'Organization-wide default applied to all projects and tasks unless overridden.',
                      where: 'Settings > AI Configuration > System Defaults (global)',
                    },
                    {
                      priority: '4 (fallback)',
                      level: 'FIRST AVAILABLE',
                      desc: 'If no explicit config exists, the worker uses the first provider that has a valid API key configured.',
                      where: 'Settings > API Keys',
                    },
                  ].map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-[var(--cortex-border)] hover:bg-[var(--cortex-bg-secondary)]/50"
                    >
                      <td className="px-3 py-2 font-medium text-[var(--cortex-text-primary)]">
                        {row.priority}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-[var(--cortex-text-secondary)]">
                        {row.level}
                      </td>
                      <td className="px-3 py-2 text-[var(--cortex-text-secondary)]">{row.desc}</td>
                      <td className="px-3 py-2 text-[var(--cortex-text-secondary)]">{row.where}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  10. Settings & Configuration                                 */}
        {/* ============================================================ */}
        <section className="space-y-6">
          <SectionHeading id="settings">Settings &amp; Configuration</SectionHeading>
          <p className="text-sm text-[var(--cortex-text-secondary)]">
            All settings are persisted to the database via the{' '}
            <code className="rounded bg-[var(--cortex-bg-secondary)] px-1 py-0.5 text-xs">
              AppSetting
            </code>{' '}
            model (key-value store with typed values). Changes take effect immediately — no server
            restart is required. Accessible via the Admin &gt; Settings page.
          </p>

          {/* General Settings */}
          <div className="space-y-3">
            <SubHeading id="settings-general">General Settings</SubHeading>
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              Organization-level identity and localization settings. These values appear in report
              headers and date formatting throughout the application.
            </p>
            <div className="space-y-1">
              <FieldDoc
                name="Organization Name"
                type="text"
                required
                description="Legal name of the organization. Appears in report headers, CER cover pages, and exported documents."
              />
              <FieldDoc
                name="Language"
                type="select"
                required={false}
                description="Application language for the UI. Currently supported: English (en). Additional languages can be added by the support team."
              />
              <FieldDoc
                name="Date Format"
                type="select"
                required={false}
                description="Preferred date display format. Options: DD/MM/YYYY (EU default), MM/DD/YYYY (US), YYYY-MM-DD (ISO 8601)."
              />
              <FieldDoc
                name="Timezone"
                type="select"
                required={false}
                description="Organization timezone. Used for scheduled PMS cycle notifications and report timestamps. Standard IANA timezone names (e.g., Europe/Paris, America/New_York)."
              />
            </div>
          </div>

          {/* Module Settings */}
          <div className="space-y-3">
            <SubHeading id="settings-modules">Module Settings</SubHeading>
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              Per-module defaults that pre-populate fields when creating new sessions, studies, or
              plans. Project-level overrides take precedence over module defaults.
            </p>

            <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-[var(--cortex-text-muted)]">
              SLS Module
            </p>
            <div className="space-y-1">
              <FieldDoc
                name="Default Databases"
                type="multi-select"
                required={false}
                description="Pre-selected databases when creating a new SLS session. Typical values: PubMed, Embase."
              />
              <FieldDoc
                name="Relevance Threshold"
                type="number (0–100)"
                required={false}
                description="Default minimum AI relevance score applied to new sessions. Can be overridden per session. Default: 60."
              />
              <FieldDoc
                name="Max Articles"
                type="number"
                required={false}
                description="Default maximum article retrieval count for new queries. Default: 1000."
              />
            </div>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-[var(--cortex-text-muted)]">
              SOA Module
            </p>
            <div className="space-y-1">
              <FieldDoc
                name="Grid Template"
                type="select"
                required={false}
                description="Default column set applied when creating a new extraction grid. Options: DIAGNOSTIC_ACCURACY (Author, Year, Design, N, Se, Sp, AUC), INTERVENTIONAL (Author, Year, Design, N, Intervention, Control, Outcome), CUSTOM."
              />
              <FieldDoc
                name="Auto-Extract"
                type="boolean"
                required={false}
                description="When enabled, AI extraction runs automatically as soon as a PDF is uploaded to the grid. Default: false (manual trigger)."
              />
            </div>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-[var(--cortex-text-muted)]">
              CER Module
            </p>
            <div className="space-y-1">
              <FieldDoc
                name="Regulatory Context"
                type="select"
                required={false}
                description="Default regulatory pathway for new CERs. CE_MDR or FDA_510K. Drives template and section selection."
              />
              <FieldDoc
                name="Template Version"
                type="select"
                required={false}
                description="Default document template version. MEDDEV_2_7_1_REV4, FDA_510K_SUMMARY, or CUSTOM."
              />
            </div>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-[var(--cortex-text-muted)]">
              PMS Module
            </p>
            <div className="space-y-1">
              <FieldDoc
                name="PSUR Cycle"
                type="select"
                required={false}
                description="Default PMS reporting cycle frequency: ANNUAL, SEMI_ANNUAL, QUARTERLY."
              />
              <FieldDoc
                name="Notifications"
                type="boolean"
                required={false}
                description="Enable email notifications when a PMS cycle is due. Sends to all ADMIN and MANAGER users."
              />
              <FieldDoc
                name="PMCF Default"
                type="boolean"
                required={false}
                description="Pre-check the 'PMCF Required' toggle for new PMS plans. Recommended: true for Class IIb+ CE-MDR projects."
              />
            </div>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-[var(--cortex-text-muted)]">
              Validation Module
            </p>
            <div className="space-y-1">
              <FieldDoc
                name="Study Type"
                type="select"
                required={false}
                description="Default study type for new validation studies: RETROSPECTIVE, PROSPECTIVE, READER_STUDY."
              />
              <FieldDoc
                name="Confidence Interval"
                type="number (0–1)"
                required={false}
                description="Default confidence interval width used in statistical calculations. Typical values: 0.90, 0.95 (default), 0.99."
              />
              <FieldDoc
                name="Sample Size"
                type="number"
                required={false}
                description="Default minimum sample size pre-populated in new study configuration forms."
              />
            </div>
          </div>

          {/* AI Configuration */}
          <div className="space-y-3">
            <SubHeading id="settings-ai">AI Configuration</SubHeading>
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              The <strong>LlmConfigPanel</strong> controls which LLM provider and model is used for
              each type of AI task. Configuration operates at two scopes: system-wide defaults and
              per-project overrides. The resolution order at runtime is:{' '}
              <strong>TASK &gt; PROJECT &gt; SYSTEM &gt; first available provider</strong> (see
              Architecture &gt; Config Resolution for details).
            </p>

            <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-[var(--cortex-text-muted)]">
              System Defaults — Per Task Type
            </p>
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              Set a specific provider and model for each task type independently. If a task type has
              no explicit config, it inherits the global system default.
            </p>
            <div className="space-y-1">
              <FieldDoc
                name="Task Type"
                type="select"
                required
                description="The AI task being configured: SCORING (article relevance scoring), EXTRACTION (grid data extraction), DRAFTING (narrative and CER section drafting), METADATA_EXTRACTION (article metadata parsing)."
              />
              <FieldDoc
                name="Provider"
                type="select"
                required
                description="LLM provider: OPENAI, ANTHROPIC, OLLAMA. Only providers with a valid API key configured (see API Keys) are available."
              />
              <FieldDoc
                name="Model"
                type="text"
                required
                description="Model identifier as used by the provider API (e.g., gpt-4o, claude-3-5-sonnet-20241022, llama3.2)."
              />
              <FieldDoc
                name="Temperature"
                type="number (0–2)"
                required={false}
                description="Sampling temperature for the model. Lower = more deterministic (recommended for extraction). Higher = more creative (acceptable for drafting). Default: 0.2 for scoring/extraction, 0.7 for drafting."
              />
              <FieldDoc
                name="Max Tokens"
                type="number"
                required={false}
                description="Maximum tokens in the model response. Tune based on expected output length."
              />
            </div>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-[var(--cortex-text-muted)]">
              Project Overrides
            </p>
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              Override the system defaults for a specific project. All tasks within that project use
              the project-level config unless a task-type override exists. Useful for testing a new
              model on a single project without affecting the whole organization.
            </p>
            <div className="space-y-1">
              <FieldDoc
                name="Project"
                type="select"
                required
                description="The project to configure. Displays project name and regulatory context."
              />
              <FieldDoc
                name="Provider"
                type="select"
                required
                description="Override provider for this project."
              />
              <FieldDoc
                name="Model"
                type="text"
                required
                description="Override model identifier for this project."
              />
            </div>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-[var(--cortex-text-muted)]">
              Cost Dashboard
            </p>
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              The cost dashboard aggregates LLM usage across all workers. It shows total token
              consumption and estimated cost broken down by:
            </p>
            <ul className="list-inside list-disc space-y-1 text-sm text-[var(--cortex-text-secondary)]">
              <li>
                <strong>By provider</strong> — OpenAI vs Anthropic vs Ollama total spend for the
                selected period.
              </li>
              <li>
                <strong>By task type</strong> — which workflows (scoring, extraction, drafting,
                metadata extraction) consume the most tokens.
              </li>
            </ul>
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              Cost calculations use the provider's published per-token pricing at the time of the
              request. Ollama (local) costs are tracked as $0 but token counts are still recorded
              for capacity planning.
            </p>
          </div>

          {/* API Keys */}
          <div className="space-y-3">
            <SubHeading id="settings-api-keys">API Keys</SubHeading>
            <p className="text-sm text-[var(--cortex-text-secondary)]">
              API keys for LLM providers are configured once at the organization level. They are
              stored encrypted in the database — never in environment variables or configuration
              files. Workers read the keys from the database at startup.
            </p>
            <div className="space-y-1">
              <FieldDoc
                name="OpenAI API Key"
                type="secret text"
                required={false}
                description="API key from platform.openai.com. Enables GPT-4o, GPT-4o-mini, o1, and all OpenAI models. Format: sk-..."
              />
              <FieldDoc
                name="Anthropic API Key"
                type="secret text"
                required={false}
                description="API key from console.anthropic.com. Enables Claude 3.5 Sonnet, Claude 3 Haiku, and all Anthropic models. Format: sk-ant-..."
              />
              <FieldDoc
                name="Ollama Base URL"
                type="text"
                required={false}
                description="Base URL of your Ollama instance (e.g., http://localhost:11434). No API key needed. Ollama must be running and accessible from the worker containers."
              />
            </div>

            <div className="rounded-lg border border-[var(--cortex-border)] bg-[var(--cortex-bg-secondary)] p-4">
              <p className="mb-2 text-sm font-semibold text-[var(--cortex-text-primary)]">
                ProviderHealthIndicator
              </p>
              <p className="text-sm text-[var(--cortex-text-secondary)]">
                Each configured provider displays a health indicator next to its key field. The
                indicator performs a lightweight connectivity check (e.g., list models API call)
                when you save or reload the page. Statuses:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[var(--cortex-text-secondary)]">
                <li>
                  <strong>Connected</strong> (green) — key is valid and provider is reachable.
                </li>
                <li>
                  <strong>Error</strong> (red) — key present but authentication or network failed.
                  Hover for error detail.
                </li>
                <li>
                  <strong>Not configured</strong> (grey) — no key entered. Provider is unavailable
                  and will be skipped by the config resolution fallback.
                </li>
              </ul>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">
                Security Note
              </p>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                API keys are stored encrypted at rest using AES-256-GCM. Keys are never returned to
                the frontend after being saved — the UI displays a masked placeholder (e.g.,
                sk-...xxxx). If you need to rotate a key, paste the new value and save; the old
                value is immediately replaced.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-[var(--cortex-border)] pt-6 text-center text-xs text-[var(--cortex-text-muted)]">
          Cortex Clinical Affairs v0.1.0 — CINA CSpine examples are illustrative and do not
          represent a real product submission.
        </div>
      </div>
    </div>
  );
}
