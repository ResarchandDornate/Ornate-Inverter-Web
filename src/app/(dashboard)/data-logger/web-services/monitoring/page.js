import { getMapAssets } from '@/lib/dataLoggerApi';
import { MonitoringWorkspace } from '@/components/data-logger/MonitoringWorkspace';

export const dynamic = 'force-dynamic';

export default async function MonitoringServicePage() {
  const assets = await getMapAssets();
  return <MonitoringWorkspace assets={assets} />;
}
