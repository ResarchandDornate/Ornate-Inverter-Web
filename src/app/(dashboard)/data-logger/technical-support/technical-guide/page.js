import { FileText } from 'lucide-react';
import { ComingSoon } from '@/components/data-logger/ComingSoon';

export default function TechnicalGuidePage() {
  return (
    <ComingSoon
      icon={FileText}
      title="Technical Guide"
      note="Product datasheets, wiring diagrams, installation manuals, and technical reference material will appear here."
    />
  );
}
