import { getMapAssets } from '@/lib/dataLoggerApi';
import { MapView } from '@/components/data-logger/MapView';

export const dynamic = 'force-dynamic';

export default async function MapPage() {
  const assets = await getMapAssets();
  return <MapView assets={assets} />;
}
