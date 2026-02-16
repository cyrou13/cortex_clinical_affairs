import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Plus, Upload, AlertTriangle } from 'lucide-react';
import { PmsStatusBadge } from './StatusBadge';
import { GET_COMPLAINTS } from '../graphql/queries';
import { CREATE_COMPLAINT, IMPORT_COMPLAINTS } from '../graphql/mutations';

interface Complaint {
  id: string;
  pmsCycleId: string;
  date: string;
  reportDate: string;
  description: string;
  deviceIdentifier: string;
  lotNumber: string | null;
  serialNumber: string | null;
  severity: string;
  classification: string;
  classificationDescription: string | null;
  status: string;
  resolution: string | null;
  resolutionDate: string | null;
  source: string;
  externalId: string | null;
  isIncident: boolean;
  regulatoryReportRequired: boolean;
  harmSeverity: string | null;
  correctiveAction: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ComplaintsDashboardProps {
  cycleId: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  LOW: 'bg-blue-100 text-blue-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

const SEVERITY_OPTIONS = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUS_OPTIONS = ['ALL', 'OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'];

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ComplaintsDashboard({ cycleId }: ComplaintsDashboardProps) {
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [newComplaint, setNewComplaint] = useState({
    date: '',
    reportDate: '',
    description: '',
    deviceIdentifier: '',
    severity: 'LOW',
    classification: '',
    isIncident: false,
  });

  const queryVars: Record<string, string> = { cycleId };
  if (severityFilter !== 'ALL') queryVars.severity = severityFilter;
  if (statusFilter !== 'ALL') queryVars.status = statusFilter;

  const { data, loading, error } = useQuery<{ complaints: Complaint[] }>(GET_COMPLAINTS, {
    variables: queryVars,
  });

  const [createComplaint, { loading: creating }] = useMutation(CREATE_COMPLAINT, {
    refetchQueries: [{ query: GET_COMPLAINTS, variables: queryVars }],
  });

  const [importComplaints, { loading: importing }] = useMutation(IMPORT_COMPLAINTS, {
    refetchQueries: [{ query: GET_COMPLAINTS, variables: queryVars }],
  });

  const handleCreate = async () => {
    await createComplaint({
      variables: { pmsCycleId: cycleId, ...newComplaint },
    });
    setNewComplaint({
      date: '',
      reportDate: '',
      description: '',
      deviceIdentifier: '',
      severity: 'LOW',
      classification: '',
      isIncident: false,
    });
    setShowAddForm(false);
  };

  const handleImport = async () => {
    const parsed = JSON.parse(importJson);
    await importComplaints({
      variables: { pmsCycleId: cycleId, complaints: parsed, source: 'MANUAL_IMPORT' },
    });
    setImportJson('');
    setShowImport(false);
  };

  if (loading) {
    return (
      <div data-testid="complaints-loading" className="flex items-center justify-center p-12">
        <p className="text-[var(--cortex-text-muted)]">Loading complaints...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-[var(--cortex-error)]">Failed to load complaints.</p>
      </div>
    );
  }

  const complaints = data?.complaints ?? [];
  const totalIncidents = complaints.filter((c) => c.isIncident).length;
  const bySeverity = complaints.reduce<Record<string, number>>((acc, c) => {
    acc[c.severity] = (acc[c.severity] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div data-testid="complaints-dashboard" className="space-y-4">
      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div data-testid="metric-total" className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-2xl font-semibold text-[var(--cortex-text-primary)]">
            {complaints.length}
          </p>
          <p className="text-xs text-[var(--cortex-text-muted)]">Total Complaints</p>
        </div>
        <div data-testid="metric-incidents" className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            {totalIncidents > 0 && <AlertTriangle size={16} className="text-red-500" />}
            <p className="text-2xl font-semibold text-[var(--cortex-text-primary)]">
              {totalIncidents}
            </p>
          </div>
          <p className="text-xs text-[var(--cortex-text-muted)]">Incidents</p>
        </div>
        {['HIGH', 'CRITICAL'].map((sev) => (
          <div key={sev} className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-2xl font-semibold text-[var(--cortex-text-primary)]">
              {bySeverity[sev] ?? 0}
            </p>
            <p className="text-xs text-[var(--cortex-text-muted)]">{sev}</p>
          </div>
        ))}
      </div>

      {/* Actions & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          data-testid="add-complaint-btn"
          onClick={() => {
            setShowAddForm(!showAddForm);
            setShowImport(false);
          }}
          className="inline-flex items-center gap-1.5 rounded-md bg-[var(--cortex-blue-500)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--cortex-blue-600)]"
        >
          <Plus size={16} />
          Add Complaint
        </button>
        <button
          data-testid="import-btn"
          onClick={() => {
            setShowImport(!showImport);
            setShowAddForm(false);
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-[var(--cortex-text-primary)] hover:bg-gray-50"
        >
          <Upload size={16} />
          Import
        </button>
        <div className="ml-auto flex gap-2">
          <select
            data-testid="filter-severity"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            {SEVERITY_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === 'ALL' ? 'All severities' : s}
              </option>
            ))}
          </select>
          <select
            data-testid="filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === 'ALL' ? 'All statuses' : s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              placeholder="Date"
              value={newComplaint.date}
              onChange={(e) => setNewComplaint({ ...newComplaint, date: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="date"
              placeholder="Report Date"
              value={newComplaint.reportDate}
              onChange={(e) => setNewComplaint({ ...newComplaint, reportDate: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              placeholder="Device Identifier"
              value={newComplaint.deviceIdentifier}
              onChange={(e) =>
                setNewComplaint({ ...newComplaint, deviceIdentifier: e.target.value })
              }
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <select
              value={newComplaint.severity}
              onChange={(e) => setNewComplaint({ ...newComplaint, severity: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {SEVERITY_OPTIONS.filter((s) => s !== 'ALL').map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input
              placeholder="Classification"
              value={newComplaint.classification}
              onChange={(e) => setNewComplaint({ ...newComplaint, classification: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <label className="flex items-center gap-2 text-sm text-[var(--cortex-text-primary)]">
              <input
                type="checkbox"
                checked={newComplaint.isIncident}
                onChange={(e) => setNewComplaint({ ...newComplaint, isIncident: e.target.checked })}
              />
              Is Incident
            </label>
            <textarea
              placeholder="Description"
              value={newComplaint.description}
              onChange={(e) => setNewComplaint({ ...newComplaint, description: e.target.value })}
              className="col-span-2 rounded-md border border-gray-300 px-3 py-2 text-sm"
              rows={2}
            />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="rounded-md px-3 py-1.5 text-sm text-[var(--cortex-text-secondary)] hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              data-testid="submit-complaint-btn"
              onClick={handleCreate}
              disabled={
                creating ||
                !newComplaint.date ||
                !newComplaint.description ||
                !newComplaint.deviceIdentifier
              }
              className="rounded-md bg-[var(--cortex-blue-500)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--cortex-blue-600)] disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Import Panel */}
      {showImport && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <textarea
            data-testid="import-json-input"
            placeholder="Paste JSON array of complaints..."
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
            rows={4}
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => setShowImport(false)}
              className="rounded-md px-3 py-1.5 text-sm text-[var(--cortex-text-secondary)] hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              data-testid="submit-import-btn"
              onClick={handleImport}
              disabled={importing || !importJson.trim()}
              className="rounded-md bg-[var(--cortex-blue-500)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--cortex-blue-600)] disabled:opacity-50"
            >
              {importing ? 'Importing...' : 'Import'}
            </button>
          </div>
        </div>
      )}

      {/* Complaints Table */}
      {complaints.length === 0 ? (
        <div
          data-testid="complaints-empty"
          className="rounded-lg bg-white p-8 text-center shadow-sm"
        >
          <p className="text-sm text-[var(--cortex-text-muted)]">No complaints recorded.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
          <table data-testid="complaints-table" className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-medium text-[var(--cortex-text-muted)]">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Device</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Classification</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Incident</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {complaints.map((complaint) => (
                <tr
                  key={complaint.id}
                  data-testid={`complaint-row-${complaint.id}`}
                  className="hover:bg-gray-50"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-[var(--cortex-text-primary)]">
                    {formatDate(complaint.date)}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-[var(--cortex-text-secondary)]">
                    {complaint.description}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-[var(--cortex-text-primary)]">
                    {complaint.deviceIdentifier}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[complaint.severity] ?? 'bg-gray-100 text-gray-700'}`}
                    >
                      {complaint.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--cortex-text-primary)]">
                    {complaint.classification}
                  </td>
                  <td className="px-4 py-3">
                    <PmsStatusBadge status={complaint.status} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {complaint.isIncident && (
                      <AlertTriangle
                        size={16}
                        className="inline text-red-500"
                        aria-label="Incident"
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
