import { Wrench } from 'lucide-react';
import { ComingSoon } from '@/components/data-logger/ComingSoon';

export default function OnSiteSupportPage() {
  return (
    <ComingSoon
      icon={Wrench}
      title="On-site support"
      note="Scheduled and completed on-site visits for your installations will appear here."
    />
  );
}
