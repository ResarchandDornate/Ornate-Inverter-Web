import { getAssets } from '@/lib/dataLoggerApi';
import { CaseTracker } from '@/components/data-logger/CaseTracker';

export const dynamic = 'force-dynamic';

export default async function RemoteTechnicalSupportPage() {
  const assets = await getAssets();
  const installations = assets.map((asset) => ({ id: asset.id, name: asset.name }));
  return (
    <CaseTracker
      title="Remote Technical Support"
      breadcrumbs={['Technical Support', 'Remote Technical Support']}
      identifierPrefix="RTS"
      installations={installations}
    />
  );
}
