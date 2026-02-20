import { SoaImportReview } from '../../../../../../features/soa/components/SoaImportReview';

export default function SoaImportReviewPage() {
  // Extract params from URL
  const match = window.location.pathname.match(/\/projects\/([^/]+)\/soa\/import\/([^/]+)/);
  const projectId = match?.[1] ?? '';
  const importId = match?.[2] ?? '';

  return <SoaImportReview importId={importId} projectId={projectId} />;
}
