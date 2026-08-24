import { getMapAssets } from '@/lib/dataLoggerApi';
import { MapView } from '@/components/data-logger/MapView';
import Topbar from '@/components/Topbar';

export const dynamic = 'force-dynamic';

export default async function MapPage() {
  const assets = await getMapAssets();
  return (
    <>
      <Topbar title="Map View" breadcrumbs={['Data Logger', 'Map View']} />
      <MapView assets={assets} />
    </>
  );
}
