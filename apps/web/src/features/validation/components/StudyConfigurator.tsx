import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { FlaskConical, Users } from 'lucide-react';

export const GET_LOCKED_SOA_ANALYSES = gql`
  query GetLockedSoaAnalyses($projectId: String!) {
    lockedSoaAnalyses(projectId: $projectId) {
      id
      name
      type
      benchmarks {
        id
        name
        value
        unit
      }
    }
  }
`;

export const CREATE_VALIDATION_STUDY = gql`
  mutation CreateValidationStudy($input: CreateValidationStudyInput!) {
    createValidationStudy(input: $input) {
      studyId
      name
      type
      status
    }
  }
`;

interface Benchmark {
  id: string;
  name: string;
  value: string;
  unit: string;
}

interface LockedSoa {
  id: string;
  name: string;
  type: string;
  benchmarks: Benchmark[];
}

interface StudyConfiguratorProps {
  projectId: string;
  onCreated?: (studyId: string) => void;
  onLaunchMiniSls?: () => void;
}

export function StudyConfigurator({ projectId, onCreated, onLaunchMiniSls }: StudyConfiguratorProps) {
  const [name, setName] = useState('');
  const [studyType, setStudyType] = useState<'STANDALONE' | 'MRMC'>('STANDALONE');
  const [selectedSoaId, setSelectedSoaId] = useState('');

  const { data: soaData, loading: soaLoading } = useQuery(GET_LOCKED_SOA_ANALYSES, {
    variables: { projectId },
  });

  const [createStudy, { loading: creating }] = useMutation(CREATE_VALIDATION_STUDY);

  const soaAnalyses: LockedSoa[] = soaData?.lockedSoaAnalyses ?? [];
  const selectedSoa = soaAnalyses.find((s) => s.id === selectedSoaId);
  const benchmarks: Benchmark[] = selectedSoa?.benchmarks ?? [];
  const canSubmit = name.trim() && selectedSoaId && !creating;

  const handleSubmit = async () => {
    const result = await createStudy({
      variables: {
        input: {
          projectId,
          name: name.trim(),
          type: studyType,
          soaAnalysisId: selectedSoaId,
        },
      },
    });
    if (result.data?.createValidationStudy) {
      onCreated?.(result.data.createValidationStudy.studyId);
    }
  };

  return (
    <div className="space-y-6 rounded-lg border border-[var(--cortex-border)] p-6" data-testid="study-configurator">
      <div className="flex items-center gap-2">
        <FlaskConical size={20} className="text-[var(--cortex-primary)]" />
        <h2 className="text-lg font-semibold text-[var(--cortex-text-primary)]">
          Create Validation Study
        </h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-muted)]">Study Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Performance Validation 2026"
            className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm"
            data-testid="study-name-input"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-muted)]">Study Type</label>
          <div className="flex gap-4">
            <label
              className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${
                studyType === 'STANDALONE'
                  ? 'border-[var(--cortex-primary)] bg-blue-50'
                  : 'border-[var(--cortex-border)]'
              }`}
            >
              <input
                type="radio"
                name="studyType"
                value="STANDALONE"
                checked={studyType === 'STANDALONE'}
                onChange={() => setStudyType('STANDALONE')}
                className="accent-[var(--cortex-primary)]"
                data-testid="study-type-standalone"
              />
              <div>
                <div className="font-medium">Standalone</div>
                <div className="text-xs text-[var(--cortex-text-muted)]">Single-reader study</div>
              </div>
            </label>
            <label
              className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${
                studyType === 'MRMC'
                  ? 'border-[var(--cortex-primary)] bg-blue-50'
                  : 'border-[var(--cortex-border)]'
              }`}
            >
              <input
                type="radio"
                name="studyType"
                value="MRMC"
                checked={studyType === 'MRMC'}
                onChange={() => setStudyType('MRMC')}
                className="accent-[var(--cortex-primary)]"
                data-testid="study-type-mrmc"
              />
              <div>
                <div className="font-medium">MRMC</div>
                <div className="text-xs text-[var(--cortex-text-muted)]">Multi-reader multi-case</div>
              </div>
            </label>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-muted)]">
            SOA Analysis (locked only)
          </label>
          {soaLoading ? (
            <p className="text-xs text-[var(--cortex-text-muted)]">Loading...</p>
          ) : (
            <select
              value={selectedSoaId}
              onChange={(e) => setSelectedSoaId(e.target.value)}
              className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm"
              data-testid="soa-selector"
            >
              <option value="">Select an SOA analysis...</option>
              {soaAnalyses.map((soa) => (
                <option key={soa.id} value={soa.id}>
                  {soa.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {benchmarks.length > 0 && (
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cortex-text-muted)]">
              Auto-Imported Benchmarks
            </label>
            <div className="space-y-1 rounded border border-[var(--cortex-border)] p-3" data-testid="benchmark-list">
              {benchmarks.map((b) => (
                <div key={b.id} className="flex items-center justify-between text-sm text-[var(--cortex-text-primary)]">
                  <span>{b.name}</span>
                  <span className="text-xs text-[var(--cortex-text-muted)]">
                    {b.value} {b.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {studyType === 'MRMC' && (
          <button
            type="button"
            onClick={onLaunchMiniSls}
            className="inline-flex items-center gap-2 rounded border border-[var(--cortex-primary)] px-4 py-2 text-sm font-medium text-[var(--cortex-primary)] hover:bg-blue-50"
            data-testid="launch-mini-sls-btn"
          >
            <Users size={16} />
            Launch Mini SLS
          </button>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="rounded bg-[var(--cortex-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="create-study-btn"
        >
          {creating ? 'Creating...' : 'Create Study'}
        </button>
      </div>
    </div>
  );
}
