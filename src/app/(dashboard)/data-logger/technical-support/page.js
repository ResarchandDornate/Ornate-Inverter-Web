import { Headphones } from 'lucide-react';
import { ComingSoon } from '@/components/data-logger/ComingSoon';

export default function TechnicalSupportPage() {
  return (
    <ComingSoon
      icon={Headphones}
      title="Technical Support"
      note="Open and resolved technical support cases for your fleet will appear here."
    />
  );
}
