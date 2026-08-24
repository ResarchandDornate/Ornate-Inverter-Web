import { Factory } from 'lucide-react';
import { ComingSoon } from '@/components/data-logger/ComingSoon';

export default function NewPlantsPage() {
  return (
    <ComingSoon
      icon={Factory}
      title="New plants"
      note="Onboarding and commissioning requests for new sites will appear here."
    />
  );
}
