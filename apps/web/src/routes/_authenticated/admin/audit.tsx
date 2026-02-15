import { AuditTrailViewer } from '../../../shared/components/AuditTrailViewer';

export default function AdminAuditPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <h1
        className="text-2xl font-semibold mb-6"
        style={{ color: 'var(--cortex-text-primary, #111827)' }}
      >
        Audit Log
      </h1>
      <AuditTrailViewer />
    </div>
  );
}
