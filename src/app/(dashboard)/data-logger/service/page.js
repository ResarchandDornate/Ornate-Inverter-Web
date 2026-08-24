import { Puzzle } from 'lucide-react';
import { ComingSoon } from '@/components/data-logger/ComingSoon';

export default function ServicePage() {
  return (
    <ComingSoon
      icon={Puzzle}
      title="Service"
      note="Service requests and spare parts stock and order requests will appear here."
    />
  );
}
