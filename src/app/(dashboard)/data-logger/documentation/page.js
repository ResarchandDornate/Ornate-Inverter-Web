import { BookOpen } from 'lucide-react';
import { ComingSoon } from '@/components/data-logger/ComingSoon';

export default function DocumentationPage() {
  return (
    <ComingSoon
      icon={BookOpen}
      title="Documentation"
      note="Guides, API references and datasheets for your Data Logger installations will appear here."
    />
  );
}
