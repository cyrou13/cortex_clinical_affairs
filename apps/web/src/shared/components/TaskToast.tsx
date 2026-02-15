import { useEffect } from 'react';
import { Check, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { useToastStore, type Toast } from '../../stores/toast-store';

const AUTO_DISMISS_MS = 5000;

const iconMap = {
  success: Check,
  error: AlertTriangle,
  info: Info,
} as const;

const styleMap = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-[var(--cortex-blue-200)] bg-[var(--cortex-blue-50)] text-[var(--cortex-blue-800)]',
} as const;

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useToastStore((s) => s.removeToast);
  const Icon = iconMap[toast.type];

  useEffect(() => {
    if (toast.type !== 'error') {
      const timer = setTimeout(() => {
        removeToast(toast.id);
      }, AUTO_DISMISS_MS);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [toast.id, toast.type, removeToast]);

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg',
        styleMap[toast.type],
      )}
      role="alert"
      data-testid={`toast-${toast.id}`}
    >
      <Icon size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm">{toast.message}</p>
        {toast.action && (
          <button
            type="button"
            onClick={toast.action.onClick}
            className="mt-1 text-sm font-medium underline hover:no-underline"
            data-testid="toast-action"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => removeToast(toast.id)}
        className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function TaskToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed right-4 top-4 z-50 flex w-80 flex-col gap-2"
      aria-label="Notifications"
      data-testid="toast-container"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
