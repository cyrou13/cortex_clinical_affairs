import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { Brain, AlertTriangle, CheckCircle } from 'lucide-react';

export const ASSEMBLE_CER = gql`
  mutation AssembleCer($cerId: String!) {
    assembleCer(cerId: $cerId) {
      assemblyId
      status
    }
  }
`;

interface PrerequisiteCheck {
  label: string;
  met: boolean;
}

interface CerAssemblerProps {
  cerId: string;
  prerequisites: PrerequisiteCheck[];
  onAssemblyStarted?: (assemblyId: string) => void;
}

export function CerAssembler({ cerId, prerequisites, onAssemblyStarted }: CerAssemblerProps) {
  const [assembleCer, { loading: assembling }] = useMutation<any>(ASSEMBLE_CER);

  const allMet = prerequisites.every((p) => p.met);

  const handleAssemble = async () => {
    const result = await assembleCer({ variables: { cerId } });
    if (result.data?.assembleCer) {
      onAssemblyStarted?.(result.data.assembleCer.assemblyId);
    }
  };

  return (
    <div className="space-y-4" data-testid="cer-assembler">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--cortex-text-primary)]">
        <Brain size={14} /> CER Assembly
      </h3>

      {/* Pre-assembly Checklist */}
      <div className="space-y-2">
        {prerequisites.map((check) => (
          <div
            key={check.label}
            className="flex items-center gap-2 text-sm"
            data-testid="checklist-item"
          >
            {check.met ? (
              <CheckCircle size={14} className="text-emerald-500" />
            ) : (
              <AlertTriangle size={14} className="text-orange-500" />
            )}
            <span
              className={
                check.met ? 'text-[var(--cortex-text-primary)]' : 'text-[var(--cortex-text-muted)]'
              }
            >
              {check.label}
            </span>
          </div>
        ))}
      </div>

      {!allMet && (
        <div
          className="rounded border border-orange-200 bg-orange-50 p-3 text-xs text-orange-700"
          data-testid="prerequisite-warning"
        >
          <AlertTriangle size={12} className="mr-1 inline" />
          All prerequisites must be met before assembly.
        </div>
      )}

      <button
        type="button"
        onClick={handleAssemble}
        disabled={!allMet || assembling}
        className="inline-flex w-full items-center justify-center gap-2 rounded bg-[var(--cortex-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        data-testid="assemble-btn"
      >
        <Brain size={16} /> {assembling ? 'Assembling...' : 'Assemble CER'}
      </button>
    </div>
  );
}
