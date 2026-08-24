import { ShieldCheck } from 'lucide-react';
import { ComingSoon } from '@/components/data-logger/ComingSoon';

export default function AdministrationPage() {
  return (
    <ComingSoon
      icon={ShieldCheck}
      title="Administration"
      note="User roles, permissions and organization settings will appear here."
    />
  );
}
