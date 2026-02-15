import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { Check, Edit3, Flag, Brain } from 'lucide-react';

export const VALIDATE_GRID_CELL = gql`
  mutation ValidateGridCell($gridId: String!, $articleId: String!, $columnId: String!) {
    validateGridCell(gridId: $gridId, articleId: $articleId, columnId: $columnId) {
      cellId
      status
    }
  }
`;

export const CORRECT_GRID_CELL = gql`
  mutation CorrectGridCell($gridId: String!, $articleId: String!, $columnId: String!, $newValue: String!) {
    correctGridCell(gridId: $gridId, articleId: $articleId, columnId: $columnId, newValue: $newValue) {
      cellId
      status
      value
    }
  }
`;

export const FLAG_GRID_CELL = gql`
  mutation FlagGridCell($gridId: String!, $articleId: String!, $columnId: String!, $reason: String!) {
    flagGridCell(gridId: $gridId, articleId: $articleId, columnId: $columnId, reason: $reason) {
      cellId
      status
    }
  }
`;

interface CellValidationOverlayProps {
  gridId: string;
  articleId: string;
  columnId: string;
  value: string | null;
  aiExtractedValue: string | null;
  validationStatus: string;
  confidenceLevel: string | null;
  onUpdated?: () => void;
}

const STATUS_ICONS: Record<string, { icon: typeof Check; className: string }> = {
  VALIDATED: { icon: Check, className: 'text-emerald-500' },
  CORRECTED: { icon: Edit3, className: 'text-blue-500' },
  FLAGGED: { icon: Flag, className: 'text-red-500' },
};

export function CellValidationOverlay({
  gridId,
  articleId,
  columnId,
  value,
  aiExtractedValue,
  validationStatus,
  confidenceLevel,
  onUpdated,
}: CellValidationOverlayProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [showFlagInput, setShowFlagInput] = useState(false);

  const [validate] = useMutation(VALIDATE_GRID_CELL);
  const [correct] = useMutation(CORRECT_GRID_CELL);
  const [flag] = useMutation(FLAG_GRID_CELL);

  const handleValidate = async () => {
    await validate({ variables: { gridId, articleId, columnId } });
    setShowMenu(false);
    onUpdated?.();
  };

  const handleFlag = async () => {
    if (!flagReason.trim()) return;
    await flag({ variables: { gridId, articleId, columnId, reason: flagReason } });
    setShowMenu(false);
    setShowFlagInput(false);
    onUpdated?.();
  };

  const statusConfig = STATUS_ICONS[validationStatus];
  const StatusIcon = statusConfig?.icon;

  return (
    <div className="relative inline-flex items-center gap-1" data-testid="cell-validation">
      {aiExtractedValue && (
        <Brain size={10} className="text-purple-400" data-testid="ai-indicator" />
      )}

      {StatusIcon && (
        <StatusIcon size={10} className={statusConfig.className} data-testid="status-icon" />
      )}

      {confidenceLevel && (
        <span
          className={`text-[9px] font-bold ${
            confidenceLevel === 'HIGH'
              ? 'text-emerald-500'
              : confidenceLevel === 'MEDIUM'
                ? 'text-orange-500'
                : 'text-red-500'
          }`}
          data-testid="confidence-badge"
        >
          {confidenceLevel[0]}
        </span>
      )}

      <button
        type="button"
        onClick={() => setShowMenu(!showMenu)}
        className="rounded p-0.5 text-[var(--cortex-text-muted)] hover:bg-gray-100"
        data-testid="validation-menu-btn"
      >
        ···
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full z-10 mt-1 w-36 rounded border bg-white py-1 shadow-lg" data-testid="validation-menu">
          <button
            type="button"
            onClick={handleValidate}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50"
            data-testid="validate-btn"
          >
            <Check size={12} className="text-emerald-500" /> Validate
          </button>
          <button
            type="button"
            onClick={() => setShowFlagInput(true)}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50"
            data-testid="flag-btn"
          >
            <Flag size={12} className="text-red-500" /> Flag for Review
          </button>
        </div>
      )}

      {showFlagInput && (
        <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded border bg-white p-2 shadow-lg" data-testid="flag-input">
          <input
            type="text"
            value={flagReason}
            onChange={(e) => setFlagReason(e.target.value)}
            placeholder="Reason..."
            className="mb-1 w-full rounded border px-2 py-1 text-xs"
            data-testid="flag-reason-input"
          />
          <button
            type="button"
            onClick={handleFlag}
            className="rounded bg-red-600 px-2 py-0.5 text-xs text-white"
            data-testid="confirm-flag-btn"
          >
            Flag
          </button>
        </div>
      )}
    </div>
  );
}
