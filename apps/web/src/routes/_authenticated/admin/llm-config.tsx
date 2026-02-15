import { LlmConfigPanel } from '../../../features/admin/components/LlmConfigPanel';

export default function AdminLlmConfigPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <nav className="mb-4 text-sm text-gray-500" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1">
          <li>
            <a href="/admin/users" className="hover:text-blue-600">
              Admin
            </a>
          </li>
          <li className="before:content-['/'] before:mx-1 text-gray-900 font-medium">
            AI Configuration
          </li>
        </ol>
      </nav>
      <LlmConfigPanel />
    </div>
  );
}
