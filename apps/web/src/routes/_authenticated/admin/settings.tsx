import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  Settings,
  Search,
  BarChart3,
  FileText,
  Activity,
  FlaskConical,
  Cpu,
  KeyRound,
  Globe,
  Check,
  Eye,
  EyeOff,
  CheckCircle2,
} from 'lucide-react';
import { GET_APP_SETTINGS } from '../../../features/admin/graphql/queries';
import { UPSERT_APP_SETTINGS } from '../../../features/admin/graphql/mutations';
import { LlmConfigPanel } from '../../../features/admin/components/LlmConfigPanel';

// --- Tab definitions ---

type TabKey = 'general' | 'sls' | 'soa' | 'cer' | 'pms' | 'validation' | 'ai_models' | 'api_keys';

interface TabDef {
  key: TabKey;
  label: string;
  icon: typeof Settings;
  category: string;
}

const TABS: TabDef[] = [
  { key: 'general', label: 'General', icon: Globe, category: 'general' },
  { key: 'sls', label: 'SLS', icon: Search, category: 'sls' },
  { key: 'soa', label: 'SOA', icon: BarChart3, category: 'soa' },
  { key: 'cer', label: 'CER', icon: FileText, category: 'cer' },
  { key: 'pms', label: 'PMS', icon: Activity, category: 'pms' },
  { key: 'validation', label: 'Validation', icon: FlaskConical, category: 'validation' },
  { key: 'ai_models', label: 'AI Models', icon: Cpu, category: 'llm' },
  { key: 'api_keys', label: 'API Keys', icon: KeyRound, category: 'api_keys' },
];

// --- Custom hook ---

interface AppSettingEntry {
  id: string;
  category: string;
  key: string;
  value: string;
  encrypted: boolean;
  updatedAt: string;
}

interface SaveEntry {
  category: string;
  key: string;
  value: string;
  encrypted: boolean;
}

function useSettingsSection(category: string) {
  const { data, loading, refetch } = useQuery<{ appSettings: AppSettingEntry[] }>(
    GET_APP_SETTINGS,
    { variables: { category }, fetchPolicy: 'cache-and-network' },
  );

  const [upsert] = useMutation(UPSERT_APP_SETTINGS);
  const [saved, setSaved] = useState(false);

  const settings: Map<string, string> = new Map(
    (data?.appSettings ?? []).map((s) => [s.key, s.value]),
  );

  const save = useCallback(
    async (entries: SaveEntry[]) => {
      await upsert({ variables: { settings: entries } });
      await refetch();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    [upsert, refetch],
  );

  return { settings, loading, save, saved };
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
  type = 'text',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  testId?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
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
          className="flex cursor-pointer items-center gap-2 text-sm text-[var(--cortex-text-primary)]"
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

// --- Section components ---

function GeneralSection() {
  const { settings, loading, save, saved } = useSettingsSection('general');

  const [form, setForm] = useState({
    organizationName: 'Cortex Clinical Affairs',
    defaultLanguage: 'en',
    dateFormat: 'DD/MM/YYYY',
    timezone: 'Europe/Paris',
  });

  useEffect(() => {
    if (loading) return;
    setForm({
      organizationName: settings.get('organizationName') ?? 'Cortex Clinical Affairs',
      defaultLanguage: settings.get('defaultLanguage') ?? 'en',
      dateFormat: settings.get('dateFormat') ?? 'DD/MM/YYYY',
      timezone: settings.get('timezone') ?? 'Europe/Paris',
    });
  }, [loading]);

  const handleSave = () => {
    save([
      {
        category: 'general',
        key: 'organizationName',
        value: form.organizationName,
        encrypted: false,
      },
      {
        category: 'general',
        key: 'defaultLanguage',
        value: form.defaultLanguage,
        encrypted: false,
      },
      { category: 'general', key: 'dateFormat', value: form.dateFormat, encrypted: false },
      { category: 'general', key: 'timezone', value: form.timezone, encrypted: false },
    ]);
  };

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
            value={form.organizationName}
            onChange={(v) => setForm({ ...form, organizationName: v })}
            testId="setting-org-name"
          />
          <FieldHint>Displayed in headers and exported documents.</FieldHint>
        </div>
        <div>
          <FieldLabel>Default Language</FieldLabel>
          <SelectInput
            value={form.defaultLanguage}
            onChange={(v) => setForm({ ...form, defaultLanguage: v })}
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
            value={form.dateFormat}
            onChange={(v) => setForm({ ...form, dateFormat: v })}
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
            value={form.timezone}
            onChange={(v) => setForm({ ...form, timezone: v })}
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
          <SaveButton onClick={handleSave} saved={saved} />
        </div>
      </div>
    </div>
  );
}

function SlsSection() {
  const { settings, loading, save, saved } = useSettingsSection('sls');

  const [form, setForm] = useState({
    defaultDatabases: ['pubmed', 'embase'] as string[],
    relevanceThreshold: 70,
    maxArticlesPerQuery: 500,
  });

  useEffect(() => {
    if (loading) return;
    const raw = settings.get('defaultDatabases');
    setForm({
      defaultDatabases: raw ? (JSON.parse(raw) as string[]) : ['pubmed', 'embase'],
      relevanceThreshold: Number(settings.get('relevanceThreshold') ?? 70),
      maxArticlesPerQuery: Number(settings.get('maxArticlesPerQuery') ?? 500),
    });
  }, [loading]);

  const handleSave = () => {
    save([
      {
        category: 'sls',
        key: 'defaultDatabases',
        value: JSON.stringify(form.defaultDatabases),
        encrypted: false,
      },
      {
        category: 'sls',
        key: 'relevanceThreshold',
        value: String(form.relevanceThreshold),
        encrypted: false,
      },
      {
        category: 'sls',
        key: 'maxArticlesPerQuery',
        value: String(form.maxArticlesPerQuery),
        encrypted: false,
      },
    ]);
  };

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
            selected={form.defaultDatabases}
            onChange={(v) => setForm({ ...form, defaultDatabases: v })}
            testId="setting-sls-databases"
          />
          <FieldHint>Pre-selected databases when creating a new SLS session.</FieldHint>
        </div>
        <div>
          <FieldLabel>Relevance Threshold (%)</FieldLabel>
          <NumberInput
            value={form.relevanceThreshold}
            onChange={(v) => setForm({ ...form, relevanceThreshold: v })}
            min={0}
            max={100}
            testId="setting-sls-threshold"
          />
          <FieldHint>
            Articles scored below this threshold are flagged as likely irrelevant.
          </FieldHint>
        </div>
        <div>
          <FieldLabel>Max Articles per Query</FieldLabel>
          <NumberInput
            value={form.maxArticlesPerQuery}
            onChange={(v) => setForm({ ...form, maxArticlesPerQuery: v })}
            min={1}
            max={5000}
            testId="setting-sls-max-articles"
          />
        </div>
        <div className="pt-2">
          <SaveButton onClick={handleSave} saved={saved} />
        </div>
      </div>
    </div>
  );
}

function SoaSection() {
  const { settings, loading, save, saved } = useSettingsSection('soa');

  const [form, setForm] = useState({
    defaultGridTemplate: 'tpl-clinical-default',
    autoExtractOnCreate: false,
  });

  useEffect(() => {
    if (loading) return;
    setForm({
      defaultGridTemplate: settings.get('defaultGridTemplate') ?? 'tpl-clinical-default',
      autoExtractOnCreate: settings.get('autoExtractOnCreate') === 'true',
    });
  }, [loading]);

  const handleSave = () => {
    save([
      {
        category: 'soa',
        key: 'defaultGridTemplate',
        value: form.defaultGridTemplate,
        encrypted: false,
      },
      {
        category: 'soa',
        key: 'autoExtractOnCreate',
        value: String(form.autoExtractOnCreate),
        encrypted: false,
      },
    ]);
  };

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
            value={form.defaultGridTemplate}
            onChange={(v) => setForm({ ...form, defaultGridTemplate: v })}
            options={[
              { value: 'tpl-clinical-default', label: 'Clinical SOA — Default' },
              { value: 'tpl-device-default', label: 'Device SOA — Default' },
              { value: 'tpl-similar-device', label: 'Similar Device Comparison' },
            ]}
            testId="setting-soa-template"
          />
          <FieldHint>Template pre-selected when creating a new extraction grid.</FieldHint>
        </div>
        <div>
          <Checkbox
            checked={form.autoExtractOnCreate}
            onChange={(v) => setForm({ ...form, autoExtractOnCreate: v })}
            label="Automatically start AI extraction when grid is created"
            testId="setting-soa-auto-extract"
          />
        </div>
        <div className="pt-2">
          <SaveButton onClick={handleSave} saved={saved} />
        </div>
      </div>
    </div>
  );
}

function CerSection() {
  const { settings, loading, save, saved } = useSettingsSection('cer');

  const [form, setForm] = useState({
    defaultRegulatoryContext: 'CE_MDR',
    defaultTemplateVersion: 'v2.0',
    includeExecutiveSummary: true,
  });

  useEffect(() => {
    if (loading) return;
    setForm({
      defaultRegulatoryContext: settings.get('defaultRegulatoryContext') ?? 'CE_MDR',
      defaultTemplateVersion: settings.get('defaultTemplateVersion') ?? 'v2.0',
      includeExecutiveSummary: (settings.get('includeExecutiveSummary') ?? 'true') !== 'false',
    });
  }, [loading]);

  const handleSave = () => {
    save([
      {
        category: 'cer',
        key: 'defaultRegulatoryContext',
        value: form.defaultRegulatoryContext,
        encrypted: false,
      },
      {
        category: 'cer',
        key: 'defaultTemplateVersion',
        value: form.defaultTemplateVersion,
        encrypted: false,
      },
      {
        category: 'cer',
        key: 'includeExecutiveSummary',
        value: String(form.includeExecutiveSummary),
        encrypted: false,
      },
    ]);
  };

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
            value={form.defaultRegulatoryContext}
            onChange={(v) => setForm({ ...form, defaultRegulatoryContext: v })}
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
            value={form.defaultTemplateVersion}
            onChange={(v) => setForm({ ...form, defaultTemplateVersion: v })}
            options={[
              { value: 'v1.0', label: 'v1.0 — MEDDEV 2.7/1 Rev. 4' },
              { value: 'v2.0', label: 'v2.0 — MDR Annex XIV' },
            ]}
            testId="setting-cer-version"
          />
        </div>
        <div>
          <Checkbox
            checked={form.includeExecutiveSummary}
            onChange={(v) => setForm({ ...form, includeExecutiveSummary: v })}
            label="Include executive summary section by default"
            testId="setting-cer-exec-summary"
          />
        </div>
        <div className="pt-2">
          <SaveButton onClick={handleSave} saved={saved} />
        </div>
      </div>
    </div>
  );
}

function PmsSection() {
  const { settings, loading, save, saved } = useSettingsSection('pms');

  const [form, setForm] = useState({
    defaultPsurCycle: '1_year',
    enableEmailNotifications: true,
    autoGeneratePmcf: false,
  });

  useEffect(() => {
    if (loading) return;
    setForm({
      defaultPsurCycle: settings.get('defaultPsurCycle') ?? '1_year',
      enableEmailNotifications: (settings.get('enableEmailNotifications') ?? 'true') !== 'false',
      autoGeneratePmcf: settings.get('autoGeneratePmcf') === 'true',
    });
  }, [loading]);

  const handleSave = () => {
    save([
      { category: 'pms', key: 'defaultPsurCycle', value: form.defaultPsurCycle, encrypted: false },
      {
        category: 'pms',
        key: 'enableEmailNotifications',
        value: String(form.enableEmailNotifications),
        encrypted: false,
      },
      {
        category: 'pms',
        key: 'autoGeneratePmcf',
        value: String(form.autoGeneratePmcf),
        encrypted: false,
      },
    ]);
  };

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
            value={form.defaultPsurCycle}
            onChange={(v) => setForm({ ...form, defaultPsurCycle: v })}
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
            checked={form.enableEmailNotifications}
            onChange={(v) => setForm({ ...form, enableEmailNotifications: v })}
            label="Send email notifications for cycle deadlines"
            testId="setting-pms-email"
          />
        </div>
        <div>
          <Checkbox
            checked={form.autoGeneratePmcf}
            onChange={(v) => setForm({ ...form, autoGeneratePmcf: v })}
            label="Auto-generate PMCF survey templates"
            testId="setting-pms-pmcf"
          />
        </div>
        <div className="pt-2">
          <SaveButton onClick={handleSave} saved={saved} />
        </div>
      </div>
    </div>
  );
}

function ValidationSection() {
  const { settings, loading, save, saved } = useSettingsSection('validation');

  const [form, setForm] = useState({
    defaultStudyType: 'STANDALONE',
    confidenceInterval: 95,
    minimumSampleSize: 30,
  });

  useEffect(() => {
    if (loading) return;
    setForm({
      defaultStudyType: settings.get('defaultStudyType') ?? 'STANDALONE',
      confidenceInterval: Number(settings.get('confidenceInterval') ?? 95),
      minimumSampleSize: Number(settings.get('minimumSampleSize') ?? 30),
    });
  }, [loading]);

  const handleSave = () => {
    save([
      {
        category: 'validation',
        key: 'defaultStudyType',
        value: form.defaultStudyType,
        encrypted: false,
      },
      {
        category: 'validation',
        key: 'confidenceInterval',
        value: String(form.confidenceInterval),
        encrypted: false,
      },
      {
        category: 'validation',
        key: 'minimumSampleSize',
        value: String(form.minimumSampleSize),
        encrypted: false,
      },
    ]);
  };

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
            value={form.defaultStudyType}
            onChange={(v) => setForm({ ...form, defaultStudyType: v })}
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
            value={form.confidenceInterval}
            onChange={(v) => setForm({ ...form, confidenceInterval: v })}
            min={80}
            max={99}
            testId="setting-val-ci"
          />
          <FieldHint>Statistical confidence level for hypothesis tests.</FieldHint>
        </div>
        <div>
          <FieldLabel>Minimum Sample Size</FieldLabel>
          <NumberInput
            value={form.minimumSampleSize}
            onChange={(v) => setForm({ ...form, minimumSampleSize: v })}
            min={1}
            max={10000}
            testId="setting-val-sample"
          />
          <FieldHint>Default minimum number of cases required for study validity.</FieldHint>
        </div>
        <div className="pt-2">
          <SaveButton onClick={handleSave} saved={saved} />
        </div>
      </div>
    </div>
  );
}

// --- API Key field ---

function ApiKeyField({
  label,
  fieldKey,
  hasValue,
  value,
  onChange,
  testId,
}: {
  label: string;
  fieldKey: string;
  hasValue: boolean;
  value: string;
  onChange: (v: string) => void;
  testId?: string;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <label className="text-xs font-medium text-[var(--cortex-text-secondary)]">{label}</label>
        {hasValue && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700"
            data-testid={`${testId}-badge`}
          >
            <CheckCircle2 size={10} />
            Configured
          </span>
        )}
      </div>
      <div className="relative">
        <input
          type={revealed ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={hasValue ? 'Enter new key to update' : `Enter ${label}`}
          className="w-full rounded border border-[var(--cortex-border)] bg-white py-2 pl-3 pr-10 text-sm text-[var(--cortex-text-primary)] placeholder:text-[var(--cortex-text-muted)] focus:border-[var(--cortex-blue-500)] focus:outline-none focus:ring-1 focus:ring-[var(--cortex-blue-500)]"
          data-testid={testId}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setRevealed((r) => !r)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--cortex-text-muted)] hover:text-[var(--cortex-text-secondary)]"
          aria-label={revealed ? 'Hide key' : 'Show key'}
          tabIndex={-1}
        >
          {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      <p className="mt-1 text-[11px] text-[var(--cortex-text-muted)]">
        {fieldKey === 'ollamaBaseUrl'
          ? 'Base URL for your local Ollama instance (e.g. http://localhost:11434).'
          : hasValue
            ? 'The current key is stored securely. Enter a new value only to replace it.'
            : 'Stored encrypted at rest.'}
      </p>
    </div>
  );
}

function ApiKeysSection() {
  const { settings, loading, save, saved } = useSettingsSection('api_keys');

  const [form, setForm] = useState({
    anthropicApiKey: '',
    openaiApiKey: '',
    ollamaBaseUrl: '',
  });

  useEffect(() => {
    if (loading) return;
    setForm({
      anthropicApiKey: '',
      openaiApiKey: '',
      ollamaBaseUrl: settings.get('ollamaBaseUrl') ?? '',
    });
  }, [loading]);

  const hasAnthropicKey = !!(settings.get('anthropicApiKey') ?? '');
  const hasOpenAiKey = !!(settings.get('openaiApiKey') ?? '');

  const handleSave = async () => {
    const entries: { category: string; key: string; value: string; encrypted: boolean }[] = [];

    if (form.anthropicApiKey.trim()) {
      entries.push({
        category: 'api_keys',
        key: 'anthropicApiKey',
        value: form.anthropicApiKey.trim(),
        encrypted: true,
      });
    }
    if (form.openaiApiKey.trim()) {
      entries.push({
        category: 'api_keys',
        key: 'openaiApiKey',
        value: form.openaiApiKey.trim(),
        encrypted: true,
      });
    }
    entries.push({
      category: 'api_keys',
      key: 'ollamaBaseUrl',
      value: form.ollamaBaseUrl.trim(),
      encrypted: false,
    });

    if (entries.length > 0) {
      await save(entries);
    }
    // Clear the sensitive fields after save
    setForm((prev) => ({ ...prev, anthropicApiKey: '', openaiApiKey: '' }));
  };

  return (
    <div>
      <SectionHeader
        title="API Keys"
        description="Credentials for AI provider integrations. Keys are stored encrypted."
      />
      <div className="max-w-lg space-y-6">
        <ApiKeyField
          label="Anthropic API Key"
          fieldKey="anthropicApiKey"
          hasValue={hasAnthropicKey}
          value={form.anthropicApiKey}
          onChange={(v) => setForm({ ...form, anthropicApiKey: v })}
          testId="setting-anthropic-key"
        />
        <ApiKeyField
          label="OpenAI API Key"
          fieldKey="openaiApiKey"
          hasValue={hasOpenAiKey}
          value={form.openaiApiKey}
          onChange={(v) => setForm({ ...form, openaiApiKey: v })}
          testId="setting-openai-key"
        />
        <ApiKeyField
          label="Ollama Base URL"
          fieldKey="ollamaBaseUrl"
          hasValue={!!(form.ollamaBaseUrl || settings.get('ollamaBaseUrl'))}
          value={form.ollamaBaseUrl}
          onChange={(v) => setForm({ ...form, ollamaBaseUrl: v })}
          testId="setting-ollama-url"
        />
        <div className="pt-2">
          <SaveButton onClick={handleSave} saved={saved} />
        </div>
      </div>
    </div>
  );
}

// --- Main Settings Page ---

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('general');

  const renderContent = () => {
    switch (activeTab) {
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
      case 'ai_models':
        return <LlmConfigPanel />;
      case 'api_keys':
        return <ApiKeysSection />;
      default:
        return <GeneralSection />;
    }
  };

  return (
    <div className="flex h-full flex-col" data-testid="settings-page">
      {/* Header */}
      <div className="border-b border-[var(--cortex-border)] bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <Settings size={20} className="text-[var(--cortex-blue-500)]" />
          <h1 className="text-lg font-semibold text-[var(--cortex-text-primary)]">Settings</h1>
        </div>

        {/* Horizontal tabs */}
        <div className="mt-4 flex gap-1" data-testid="settings-tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-1.5 rounded-t px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-b-2 border-[var(--cortex-blue-500)] bg-[var(--cortex-bg-secondary)] text-[var(--cortex-blue-500)]'
                    : 'text-[var(--cortex-text-muted)] hover:bg-gray-50 hover:text-[var(--cortex-text-primary)]'
                }`}
                data-testid={`settings-tab-${tab.key}`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div
        className="flex-1 overflow-auto bg-[var(--cortex-bg-secondary)] p-6"
        data-testid="settings-content"
      >
        <div className="mx-auto max-w-2xl">{renderContent()}</div>
      </div>
    </div>
  );
}
