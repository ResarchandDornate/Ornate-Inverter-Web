import { Upload } from 'lucide-react';
import { ComingSoon } from '@/components/data-logger/ComingSoon';

export default function SoftwareUpdatePage() {
  return (
    <ComingSoon
      icon={Upload}
      title="Software Update"
      note="Firmware releases, release notes, and device software update controls will appear here."
    />
  );
}
