import { useState, useCallback } from 'react';
import type { Settings } from 'lucide-react';
import {
  Search,
  BarChart3,
  FileText,
  Activity,
  FlaskConical,
  Cpu,
  Users,
  ExternalLink,
  Check,
  Globe,
} from 'lucide-react';
import { navigate } from '../../../router';

// --- Section definitions ---

interface SectionDef {
  id: string;
  label: string;
  description: string;
  icon: typeof Settings;
  href?: string;
}

const SECTIONS: SectionDef[] = [
  {
    id: 'general',
    label: 'General',
    description: 'Application defaults and display preferences',
    icon: Globe,
  },
  { id: 'sls', label: 'SLS', description: 'Systematic Literature Search defaults', icon: Search },
  { id: 'soa', label: 'SOA', description: 'State of the Art analysis presets', icon: BarChart3 },
  {
    id: 'cer',
    label: 'CER',
    description: 'Clinical Evaluation Report configuration',
    icon: FileText,
  },
  { id: 'pms', label: 'PMS', description: 'Post-Market Surveillance defaults', icon: Activity },
  {
    id: 'validation',
    label: 'Validation',
    description: 'Validation study presets',
    icon: FlaskConical,
  },
  {
    id: 'llm',
    label: 'LLM Configuration',
    description: 'AI model configuration',
    icon: Cpu,
    href: '/admin/llm-config',
  },
  {
    id: 'users',
    label: 'Users & Permissions',
    description: 'User management and roles',
    icon: Users,
    href: '/admin/users',
  },
];

// --- Settings state types ---

interface GeneralSettings {
  organizationName: string;
  defaultLanguage: string;
  dateFormat: string;
  timezone: string;
}

interface SlsSettings {
  defaultDatabases: string[];
  relevanceThreshold: number;
  aiScoringModel: string;
  maxArticlesPerQuery: number;
}

interface SoaSettings {
  defaultGridTemplate: string;
  extractionModel: string;
  autoExtractOnCreate: boolean;
}

interface CerSettings {
  defaultRegulatoryContext: string;
  defaultTemplateVersion: string;
  includeExecutiveSummary: boolean;
}

interface PmsSettings {
  defaultPsurCycle: string;
  enableEmailNotifications: boolean;
  autoGeneratePmcf: boolean;
}

interface ValidationSettings {
  defaultStudyType: string;
  confidenceInterval: number;
  minimumSampleSize: number;
}

// --- Reusable form primitives ---

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-xs font-medium text-[var(--cortex-text-secondary)]">
      {children}
    </label>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-[11px] text-[var(--cortex-text-muted)]">{children}</p>;
}

function TextInput({
  value,
  onChange,
  placeholder,
  testId,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  testId?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded border border-[var(--cortex-border)] bg-white px-3 py-2 text-sm text-[var(--cortex-text-primary)] placeholder:text-[var(--cortex-text-muted)] focus:border-[var(--cortex-blue-500)] focus:outline-none focus:ring-1 focus:ring-[var(--cortex-blue-500)]"
      data-testid={testId}
    />
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  testId,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  testId?: string;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      min={min}
      max={max}
      className="w-full rounded border border-[var(--cortex-border)] bg-white px-3 py-2 text-sm text-[var(--cortex-text-primary)] focus:border-[var(--cortex-blue-500)] focus:outline-none focus:ring-1 focus:ring-[var(--cortex-blue-500)]"
      data-testid={testId}
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
  testId,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  testId?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded border border-[var(--cortex-border)] bg-white px-3 py-2 text-sm text-[var(--cortex-text-primary)] focus:border-[var(--cortex-blue-500)] focus:outline-none focus:ring-1 focus:ring-[var(--cortex-blue-500)]"
      data-testid={testId}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
  testId,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  testId?: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--cortex-text-primary)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-[var(--cortex-border)] text-[var(--cortex-blue-500)] focus:ring-[var(--cortex-blue-500)]"
        data-testid={testId}
      />
      {label}
    </label>
  );
}

function CheckboxGroup({
  options,
  selected,
  onChange,
  testId,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
  testId?: string;
}) {
  const toggle = (val: string) => {
    onChange(selected.includes(val) ? selected.filter((s) => s !== val) : [...selected, val]);
  };
  return (
    <div className="space-y-2" data-testid={testId}>
      {options.map((o) => (
        <label
          key={o.value}
          className="inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--cortex-text-primary)]"
        >
          <input
            type="checkbox"
            checked={selected.includes(o.value)}
            onChange={() => toggle(o.value)}
            className="h-4 w-4 rounded border-[var(--cortex-border)] text-[var(--cortex-blue-500)] focus:ring-[var(--cortex-blue-500)]"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-[var(--cortex-text-primary)]">{title}</h2>
      <p className="mt-1 text-sm text-[var(--cortex-text-muted)]">{description}</p>
    </div>
  );
}

function SaveButton({ onClick, saved }: { onClick: () => void; saved: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded px-4 py-2 text-sm font-medium transition-colors ${
        saved
          ? 'bg-[var(--cortex-success)] text-white'
          : 'bg-[var(--cortex-blue-500)] text-white hover:bg-[var(--cortex-blue-600)]'
      }`}
      data-testid="save-settings-btn"
    >
      {saved ? (
        <>
          <Check size={14} /> Saved
        </>
      ) : (
        'Save Changes'
      )}
    </button>
  );
}

function useSaveAction() {
  const [saved, setSaved] = useState(false);
  const save = useCallback(() => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);
  return { saved, save };
}

// --- Section components ---

function GeneralSection() {
  const [settings, setSettings] = useState<GeneralSettings>({
    organizationName: 'Cortex Clinical Affairs',
    defaultLanguage: 'en',
    dateFormat: 'DD/MM/YYYY',
    timezone: 'Europe/Paris',
  });
  const { saved, save } = useSaveAction();

  return (
    <div>
      <SectionHeader
        title="General"
        description="Application-wide display and format preferences."
      />
      <div className="max-w-lg space-y-5">
        <div>
          <FieldLabel>Organization Name</FieldLabel>
          <TextInput
            value={settings.organizationName}
            onChange={(v) => setSettings({ ...settings, organizationName: v })}
            testId="setting-org-name"
          />
          <FieldHint>Displayed in headers and exported documents.</FieldHint>
        </div>
        <div>
          <FieldLabel>Default Language</FieldLabel>
          <SelectInput
            value={settings.defaultLanguage}
            onChange={(v) => setSettings({ ...settings, defaultLanguage: v })}
            options={[
              { value: 'en', label: 'English' },
              { value: 'fr', label: 'French' },
              { value: 'de', label: 'German' },
            ]}
            testId="setting-language"
          />
        </div>
        <div>
          <FieldLabel>Date Format</FieldLabel>
          <SelectInput
            value={settings.dateFormat}
            onChange={(v) => setSettings({ ...settings, dateFormat: v })}
            options={[
              { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
              { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
              { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
            ]}
            testId="setting-date-format"
          />
        </div>
        <div>
          <FieldLabel>Timezone</FieldLabel>
          <SelectInput
            value={settings.timezone}
            onChange={(v) => setSettings({ ...settings, timezone: v })}
            options={[
              { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
              { value: 'Europe/London', label: 'Europe/London (GMT)' },
              { value: 'America/New_York', label: 'America/New York (EST)' },
              { value: 'America/Los_Angeles', label: 'America/Los Angeles (PST)' },
              { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
            ]}
            testId="setting-timezone"
          />
        </div>
        <div className="pt-2">
          <SaveButton onClick={save} saved={saved} />
        </div>
      </div>
    </div>
  );
}

function SlsSection() {
  const [settings, setSettings] = useState<SlsSettings>({
    defaultDatabases: ['pubmed', 'embase'],
    relevanceThreshold: 70,
    aiScoringModel: 'claude-sonnet',
    maxArticlesPerQuery: 500,
  });
  const { saved, save } = useSaveAction();

  return (
    <div>
      <SectionHeader
        title="SLS — Systematic Literature Search"
        description="Default parameters for new literature search sessions."
      />
      <div className="max-w-lg space-y-5">
        <div>
          <FieldLabel>Default Search Databases</FieldLabel>
          <CheckboxGroup
            options={[
              { value: 'pubmed', label: 'PubMed' },
              { value: 'embase', label: 'Embase' },
              { value: 'cochrane', label: 'Cochrane Library' },
              { value: 'wos', label: 'Web of Science' },
              { value: 'scopus', label: 'Scopus' },
            ]}
            selected={settings.defaultDatabases}
            onChange={(v) => setSettings({ ...settings, defaultDatabases: v })}
            testId="setting-sls-databases"
          />
          <FieldHint>Pre-selected databases when creating a new SLS session.</FieldHint>
        </div>
        <div>
          <FieldLabel>Relevance Threshold (%)</FieldLabel>
          <NumberInput
            value={settings.relevanceThreshold}
            onChange={(v) => setSettings({ ...settings, relevanceThreshold: v })}
            min={0}
            max={100}
            testId="setting-sls-threshold"
          />
          <FieldHint>
            Articles scored below this threshold are flagged as likely irrelevant.
          </FieldHint>
        </div>
        <div>
          <FieldLabel>AI Scoring Model</FieldLabel>
          <SelectInput
            value={settings.aiScoringModel}
            onChange={(v) => setSettings({ ...settings, aiScoringModel: v })}
            options={[
              { value: 'claude-sonnet', label: 'Claude Sonnet 4' },
              { value: 'claude-haiku', label: 'Claude Haiku 4.5' },
              { value: 'gpt-4o', label: 'GPT-4o' },
            ]}
            testId="setting-sls-model"
          />
        </div>
        <div>
          <FieldLabel>Max Articles per Query</FieldLabel>
          <NumberInput
            value={settings.maxArticlesPerQuery}
            onChange={(v) => setSettings({ ...settings, maxArticlesPerQuery: v })}
            min={1}
            max={5000}
            testId="setting-sls-max-articles"
          />
        </div>
        <div className="pt-2">
          <SaveButton onClick={save} saved={saved} />
        </div>
      </div>
    </div>
  );
}

function SoaSection() {
  const [settings, setSettings] = useState<SoaSettings>({
    defaultGridTemplate: 'tpl-clinical-default',
    extractionModel: 'claude-sonnet',
    autoExtractOnCreate: false,
  });
  const { saved, save } = useSaveAction();

  return (
    <div>
      <SectionHeader
        title="SOA — State of the Art"
        description="Defaults for extraction grids and AI analysis."
      />
      <div className="max-w-lg space-y-5">
        <div>
          <FieldLabel>Default Grid Template</FieldLabel>
          <SelectInput
            value={settings.defaultGridTemplate}
            onChange={(v) => setSettings({ ...settings, defaultGridTemplate: v })}
            options={[
              { value: 'tpl-clinical-default', label: 'Clinical SOA -- Default' },
              { value: 'tpl-device-default', label: 'Device SOA -- Default' },
              { value: 'tpl-similar-device', label: 'Similar Device Comparison' },
            ]}
            testId="setting-soa-template"
          />
          <FieldHint>Template pre-selected when creating a new extraction grid.</FieldHint>
        </div>
        <div>
          <FieldLabel>Extraction AI Model</FieldLabel>
          <SelectInput
            value={settings.extractionModel}
            onChange={(v) => setSettings({ ...settings, extractionModel: v })}
            options={[
              { value: 'claude-sonnet', label: 'Claude Sonnet 4' },
              { value: 'claude-haiku', label: 'Claude Haiku 4.5' },
              { value: 'gpt-4o', label: 'GPT-4o' },
            ]}
            testId="setting-soa-model"
          />
        </div>
        <div>
          <Checkbox
            checked={settings.autoExtractOnCreate}
            onChange={(v) => setSettings({ ...settings, autoExtractOnCreate: v })}
            label="Automatically start AI extraction when grid is created"
            testId="setting-soa-auto-extract"
          />
        </div>
        <div className="pt-2">
          <SaveButton onClick={save} saved={saved} />
        </div>
      </div>
    </div>
  );
}

function CerSection() {
  const [settings, setSettings] = useState<CerSettings>({
    defaultRegulatoryContext: 'CE_MDR',
    defaultTemplateVersion: 'v2.0',
    includeExecutiveSummary: true,
  });
  const { saved, save } = useSaveAction();

  return (
    <div>
      <SectionHeader
        title="CER — Clinical Evaluation Report"
        description="Report generation defaults and regulatory context."
      />
      <div className="max-w-lg space-y-5">
        <div>
          <FieldLabel>Default Regulatory Context</FieldLabel>
          <SelectInput
            value={settings.defaultRegulatoryContext}
            onChange={(v) => setSettings({ ...settings, defaultRegulatoryContext: v })}
            options={[
              { value: 'CE_MDR', label: 'CE-MDR (EU MDR 2017/745)' },
              { value: 'FDA_510K', label: 'FDA 510(k)' },
              { value: 'BOTH', label: 'CE-MDR + FDA (Dual)' },
            ]}
            testId="setting-cer-context"
          />
          <FieldHint>Default context pre-selected for new CER versions.</FieldHint>
        </div>
        <div>
          <FieldLabel>Default Template Version</FieldLabel>
          <SelectInput
            value={settings.defaultTemplateVersion}
            onChange={(v) => setSettings({ ...settings, defaultTemplateVersion: v })}
            options={[
              { value: 'v1.0', label: 'v1.0 — MEDDEV 2.7/1 Rev. 4' },
              { value: 'v2.0', label: 'v2.0 — MDR Annex XIV' },
            ]}
            testId="setting-cer-version"
          />
        </div>
        <div>
          <Checkbox
            checked={settings.includeExecutiveSummary}
            onChange={(v) => setSettings({ ...settings, includeExecutiveSummary: v })}
            label="Include executive summary section by default"
            testId="setting-cer-exec-summary"
          />
        </div>
        <div className="pt-2">
          <SaveButton onClick={save} saved={saved} />
        </div>
      </div>
    </div>
  );
}

function PmsSection() {
  const [settings, setSettings] = useState<PmsSettings>({
    defaultPsurCycle: '1_year',
    enableEmailNotifications: true,
    autoGeneratePmcf: false,
  });
  const { saved, save } = useSaveAction();

  return (
    <div>
      <SectionHeader
        title="PMS — Post-Market Surveillance"
        description="Default cycle periods and notification preferences."
      />
      <div className="max-w-lg space-y-5">
        <div>
          <FieldLabel>Default PSUR Cycle Period</FieldLabel>
          <SelectInput
            value={settings.defaultPsurCycle}
            onChange={(v) => setSettings({ ...settings, defaultPsurCycle: v })}
            options={[
              { value: '1_year', label: '1 Year (Class III / implantable)' },
              { value: '2_years', label: '2 Years' },
              { value: '5_years', label: '5 Years (Class I / IIa)' },
            ]}
            testId="setting-pms-cycle"
          />
          <FieldHint>Pre-selected cycle period for new PMS plans.</FieldHint>
        </div>
        <div>
          <Checkbox
            checked={settings.enableEmailNotifications}
            onChange={(v) => setSettings({ ...settings, enableEmailNotifications: v })}
            label="Send email notifications for cycle deadlines"
            testId="setting-pms-email"
          />
        </div>
        <div>
          <Checkbox
            checked={settings.autoGeneratePmcf}
            onChange={(v) => setSettings({ ...settings, autoGeneratePmcf: v })}
            label="Auto-generate PMCF survey templates"
            testId="setting-pms-pmcf"
          />
        </div>
        <div className="pt-2">
          <SaveButton onClick={save} saved={saved} />
        </div>
      </div>
    </div>
  );
}

function ValidationSection() {
  const [settings, setSettings] = useState<ValidationSettings>({
    defaultStudyType: 'STANDALONE',
    confidenceInterval: 95,
    minimumSampleSize: 30,
  });
  const { saved, save } = useSaveAction();

  return (
    <div>
      <SectionHeader
        title="Validation Studies"
        description="Default statistical parameters and study configuration."
      />
      <div className="max-w-lg space-y-5">
        <div>
          <FieldLabel>Default Study Type</FieldLabel>
          <SelectInput
            value={settings.defaultStudyType}
            onChange={(v) => setSettings({ ...settings, defaultStudyType: v })}
            options={[
              { value: 'STANDALONE', label: 'Standalone' },
              { value: 'EQUIVALENCE', label: 'Equivalence' },
              { value: 'MRMC', label: 'MRMC (Multi-Reader Multi-Case)' },
              { value: 'READER_AGREEMENT', label: 'Reader Agreement' },
              { value: 'PIVOTAL', label: 'Pivotal' },
              { value: 'FEASIBILITY', label: 'Feasibility' },
            ]}
            testId="setting-val-type"
          />
        </div>
        <div>
          <FieldLabel>Confidence Interval (%)</FieldLabel>
          <NumberInput
            value={settings.confidenceInterval}
            onChange={(v) => setSettings({ ...settings, confidenceInterval: v })}
            min={80}
            max={99}
            testId="setting-val-ci"
          />
          <FieldHint>Statistical confidence level for hypothesis tests.</FieldHint>
        </div>
        <div>
          <FieldLabel>Minimum Sample Size</FieldLabel>
          <NumberInput
            value={settings.minimumSampleSize}
            onChange={(v) => setSettings({ ...settings, minimumSampleSize: v })}
            min={1}
            max={10000}
            testId="setting-val-sample"
          />
          <FieldHint>Default minimum number of cases required for study validity.</FieldHint>
        </div>
        <div className="pt-2">
          <SaveButton onClick={save} saved={saved} />
        </div>
      </div>
    </div>
  );
}

// --- Main Settings Page ---

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('general');

  const handleSectionClick = (section: SectionDef) => {
    if (section.href) {
      navigate(section.href);
      return;
    }
    setActiveSection(section.id);
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'general':
        return <GeneralSection />;
      case 'sls':
        return <SlsSection />;
      case 'soa':
        return <SoaSection />;
      case 'cer':
        return <CerSection />;
      case 'pms':
        return <PmsSection />;
      case 'validation':
        return <ValidationSection />;
      default:
        return <GeneralSection />;
    }
  };

  return (
    <div className="flex h-full gap-0" data-testid="settings-page">
      {/* Section nav */}
      <div className="w-56 flex-shrink-0 border-r border-[var(--cortex-border)] pr-0">
        <div className="sticky top-0 space-y-0.5 py-1 pr-3">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id && !section.href;
            const isLink = !!section.href;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => handleSectionClick(section)}
                className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  isActive
                    ? 'bg-[var(--cortex-blue-50,#eff6ff)] font-medium text-[var(--cortex-blue-700)]'
                    : 'text-[var(--cortex-text-secondary)] hover:bg-gray-50 hover:text-[var(--cortex-text-primary)]'
                }`}
                data-testid={`settings-nav-${section.id}`}
              >
                <Icon
                  size={16}
                  className={
                    isActive ? 'text-[var(--cortex-blue-500)]' : 'text-[var(--cortex-text-muted)]'
                  }
                />
                <span className="flex-1">{section.label}</span>
                {isLink && <ExternalLink size={12} className="text-[var(--cortex-text-muted)]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto pl-8 py-1" data-testid="settings-content">
        {renderSection()}
      </div>
    </div>
  );
}
