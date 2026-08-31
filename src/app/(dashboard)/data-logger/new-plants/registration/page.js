import { FilePlus } from 'lucide-react';
import { ComingSoon } from '@/components/data-logger/ComingSoon';

export default function RegistrationPage() {
  return (
    <ComingSoon
      icon={FilePlus}
      title="Registration"
      note="Registering new tracker/inverter units for a plant will appear here."
    />
  );
}
