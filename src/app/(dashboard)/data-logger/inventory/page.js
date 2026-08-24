import { Package } from 'lucide-react';
import { ComingSoon } from '@/components/data-logger/ComingSoon';

export default function InventoryPage() {
  return (
    <ComingSoon
      icon={Package}
      title="Inventory"
      note="Hardware and stock inventory across your sites will appear here."
    />
  );
}
