import { getInventoryDevices } from '@/lib/dataLoggerApi';
import { InventoryDevices } from '@/components/data-logger/InventoryDevices';

export const dynamic = 'force-dynamic';

export default async function DeviceListPage() {
  const devices = await getInventoryDevices();
  return <InventoryDevices devices={devices} />;
}
