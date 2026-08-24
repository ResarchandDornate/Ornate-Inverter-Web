import { ClipboardList } from 'lucide-react';
import { ComingSoon } from '@/components/data-logger/ComingSoon';

export default function AllCasesPage() {
  return (
    <ComingSoon
      icon={ClipboardList}
      title="All Cases"
      note="A combined view of every technical support, RMA and on-site support case will appear here."
    />
  );
}
