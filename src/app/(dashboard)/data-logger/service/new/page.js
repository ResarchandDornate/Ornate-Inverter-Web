import { getAssets } from '@/lib/dataLoggerApi';
import { NewSparePartsRequest } from '@/components/data-logger/NewSparePartsRequest';

export const dynamic = 'force-dynamic';

export default async function NewServiceRequestPage() {
  const assets = await getAssets();
  const installations = assets.map((asset) => ({ id: asset.id, name: asset.name }));
  return <NewSparePartsRequest installations={installations} />;
}
