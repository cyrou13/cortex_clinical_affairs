import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { GitBranch, Link } from 'lucide-react';

export const GET_LOCKED_STUDIES = gql`
  query GetLockedStudies($projectId: String!) {
    lockedValidationStudies(projectId: $projectId) {
      id
      name
      type
      lockedAt
    }
  }
`;

interface LockedStudy {
  id: string;
  name: string;
  type: string;
  lockedAt: string;
}

interface PatchStudySelectorProps {
  projectId: string;
  isPatch: boolean;
  parentStudyId: string | null;
  onChange: (isPatch: boolean, parentStudyId: string | null) => void;
}

export function PatchStudySelector({
  projectId,
  isPatch,
  parentStudyId,
  onChange,
}: PatchStudySelectorProps) {
  const { data, loading } = useQuery(GET_LOCKED_STUDIES, {
    variables: { projectId },
    skip: !isPatch,
  });

  const studies: LockedStudy[] = data?.lockedValidationStudies ?? [];
  const selectedStudy = studies.find((s) => s.id === parentStudyId);

  const handleToggle = (checked: boolean) => {
    onChange(checked, checked ? parentStudyId : null);
  };

  const handleSelectStudy = (studyId: string) => {
    onChange(isPatch, studyId || null);
  };

  return (
    <div className="space-y-3" data-testid="patch-selector">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isPatch}
          onChange={(e) => handleToggle(e.target.checked)}
          className="accent-[var(--cortex-primary)]"
          data-testid="is-patch-checkbox"
        />
        <GitBranch size={14} className="text-[var(--cortex-text-muted)]" />
        <span className="text-[var(--cortex-text-primary)]">Patch of existing study</span>
      </label>

      {isPatch && (
        <div className="ml-6 space-y-2">
          {loading ? (
            <p className="text-xs text-[var(--cortex-text-muted)]">Loading locked studies...</p>
          ) : (
            <select
              value={parentStudyId ?? ''}
              onChange={(e) => handleSelectStudy(e.target.value)}
              className="w-full rounded border border-[var(--cortex-border)] px-3 py-2 text-sm"
              data-testid="parent-study-dropdown"
            >
              <option value="">Select parent study...</option>
              {studies.map((study) => (
                <option key={study.id} value={study.id}>
                  {study.name} ({study.type})
                </option>
              ))}
            </select>
          )}

          {selectedStudy && (
            <div
              className="flex items-center gap-2 rounded border border-blue-200 bg-blue-50 p-2 text-sm text-[var(--cortex-text-primary)]"
              data-testid="parent-study-ref"
            >
              <Link size={12} className="text-blue-500" />
              <span className="font-medium">{selectedStudy.name}</span>
              <span className="text-xs text-[var(--cortex-text-muted)]">
                Locked: {selectedStudy.lockedAt}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
