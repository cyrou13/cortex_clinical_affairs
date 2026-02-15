import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { Shield, Plus, Filter } from 'lucide-react';

export const GET_GSPR_MAPPINGS = gql`
  query GetGsprMappings($studyId: String!) {
    gsprMappings(studyId: $studyId) {
      id
      gsprId
      chapter
      title
      status
      evidenceRef
      justification
    }
  }
`;

export const ADD_GSPR_MAPPING = gql`
  mutation AddGsprMapping($input: AddGsprMappingInput!) {
    addGsprMapping(input: $input) {
      mappingId
      gsprId
      status
    }
  }
`;

interface GsprMapping {
  id: string;
  gsprId: string;
  chapter: string;
  title: string;
  status: 'COMPLIANT' | 'PARTIAL' | 'NOT_APPLICABLE';
  evidenceRef: string;
  justification: string;
}

interface GsprMappingTableProps {
  studyId: string;
  onAddMapping?: () => void;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  COMPLIANT: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  PARTIAL: { bg: 'bg-orange-100', text: 'text-orange-700' },
  NOT_APPLICABLE: { bg: 'bg-gray-100', text: 'text-gray-700' },
};

export function GsprMappingTable({ studyId, onAddMapping }: GsprMappingTableProps) {
  const [filterChapter, setFilterChapter] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const { data, loading } = useQuery<any>(GET_GSPR_MAPPINGS, {
    variables: { studyId },
  });

  const [_addMapping] = useMutation(ADD_GSPR_MAPPING);

  if (loading) {
    return (
      <div
        className="py-6 text-center text-sm text-[var(--cortex-text-muted)]"
        data-testid="gspr-loading"
      >
        Loading GSPR mappings...
      </div>
    );
  }

  const allMappings: GsprMapping[] = data?.gsprMappings ?? [];

  const chapters = [...new Set(allMappings.map((m) => m.chapter))].sort();

  const filteredMappings = allMappings.filter((m) => {
    if (filterChapter && m.chapter !== filterChapter) return false;
    if (filterStatus && m.status !== filterStatus) return false;
    return true;
  });

  const compliantCount = allMappings.filter((m) => m.status === 'COMPLIANT').length;
  const partialCount = allMappings.filter((m) => m.status === 'PARTIAL').length;
  const naCount = allMappings.filter((m) => m.status === 'NOT_APPLICABLE').length;

  return (
    <div className="space-y-4" data-testid="gspr-table">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-[var(--cortex-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--cortex-text-primary)]">GSPR Mapping</h3>
        </div>
        <button
          type="button"
          onClick={onAddMapping}
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
          data-testid="add-mapping-btn"
        >
          <Plus size={12} /> Add Mapping
        </button>
      </div>

      <div
        className="flex items-center gap-3 rounded-lg border border-[var(--cortex-border)] p-3"
        data-testid="gspr-summary"
      >
        <span className="text-xs text-emerald-600 font-medium">{compliantCount} Compliant</span>
        <span className="text-xs text-orange-600 font-medium">{partialCount} Partial</span>
        <span className="text-xs text-gray-600 font-medium">{naCount} N/A</span>
        <span className="ml-auto text-xs text-[var(--cortex-text-muted)]">
          {allMappings.length} total
        </span>
      </div>

      <div className="flex gap-2" data-testid="gspr-filter">
        <div className="flex items-center gap-1">
          <Filter size={12} className="text-[var(--cortex-text-muted)]" />
        </div>
        <select
          value={filterChapter}
          onChange={(e) => setFilterChapter(e.target.value)}
          className="rounded border border-[var(--cortex-border)] px-2 py-1 text-xs"
          data-testid="filter-chapter"
        >
          <option value="">All chapters</option>
          {chapters.map((ch) => (
            <option key={ch} value={ch}>
              {ch}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded border border-[var(--cortex-border)] px-2 py-1 text-xs"
          data-testid="filter-status"
        >
          <option value="">All statuses</option>
          <option value="COMPLIANT">Compliant</option>
          <option value="PARTIAL">Partial</option>
          <option value="NOT_APPLICABLE">Not Applicable</option>
        </select>
      </div>

      {filteredMappings.length === 0 ? (
        <p
          className="py-4 text-center text-sm text-[var(--cortex-text-muted)]"
          data-testid="no-gspr"
        >
          No GSPR mappings found.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--cortex-border)]">
          <table className="w-full text-sm" data-testid="gspr-data-table">
            <thead>
              <tr className="bg-blue-800 text-white">
                <th className="px-3 py-2 text-left text-xs font-medium">GSPR ID</th>
                <th className="px-3 py-2 text-left text-xs font-medium">Chapter</th>
                <th className="px-3 py-2 text-left text-xs font-medium">Title</th>
                <th className="px-3 py-2 text-left text-xs font-medium">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium">Evidence</th>
                <th className="px-3 py-2 text-left text-xs font-medium">Justification</th>
              </tr>
            </thead>
            <tbody>
              {filteredMappings.map((mapping, idx) => {
                const sc = STATUS_COLORS[mapping.status] ?? {
                  bg: 'bg-gray-100',
                  text: 'text-gray-700',
                };
                return (
                  <tr
                    key={mapping.id}
                    className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F8F9FA]'}
                    data-testid={`gspr-row-${mapping.gsprId}`}
                  >
                    <td className="border-r border-[#ECF0F1] px-3 py-2 font-medium text-[var(--cortex-text-primary)]">
                      {mapping.gsprId}
                    </td>
                    <td className="border-r border-[#ECF0F1] px-3 py-2 text-[var(--cortex-text-primary)]">
                      {mapping.chapter}
                    </td>
                    <td className="border-r border-[#ECF0F1] px-3 py-2 text-[var(--cortex-text-primary)]">
                      {mapping.title}
                    </td>
                    <td
                      className="border-r border-[#ECF0F1] px-3 py-2"
                      data-testid={`gspr-status-${mapping.gsprId}`}
                    >
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${sc.bg} ${sc.text}`}
                      >
                        {mapping.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="border-r border-[#ECF0F1] px-3 py-2 text-xs text-blue-600">
                      {mapping.evidenceRef}
                    </td>
                    <td
                      className="px-3 py-2 text-xs text-[var(--cortex-text-muted)]"
                      data-testid={`gspr-justification-${mapping.gsprId}`}
                    >
                      {mapping.justification}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
