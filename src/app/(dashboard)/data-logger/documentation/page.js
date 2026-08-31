import { DocumentationCenter } from '@/components/data-logger/DocumentationCenter';

// This is intentionally presentation-only. Replace this preview role with the
// authenticated role supplied by the backend/auth context once it is available.
// The API must still enforce upload, edit, and delete permissions server-side.
const PREVIEW_ROLE = 'admin';

export default function DocumentationPage() {
  return <DocumentationCenter role={PREVIEW_ROLE} />;
}
