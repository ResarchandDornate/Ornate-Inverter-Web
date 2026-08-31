import { Rocket } from 'lucide-react';
import { ComingSoon } from '@/components/data-logger/ComingSoon';

export default function CommissioningPage() {
  return (
    <ComingSoon
      icon={Rocket}
      title="Commissioning"
      note="Commissioning workflow and checklist for newly registered units will appear here."
    />
  );
}
