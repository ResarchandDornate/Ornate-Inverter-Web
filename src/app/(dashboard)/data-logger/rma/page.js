import { RotateCcw } from 'lucide-react';
import { ComingSoon } from '@/components/data-logger/ComingSoon';

export default function RmaPage() {
  return (
    <ComingSoon
      icon={RotateCcw}
      title="RMA"
      note="Return merchandise authorizations — requested, shipped and received — will appear here."
    />
  );
}
