import { getAssets } from '@/lib/dataLoggerApi';
import { CaseTracker } from '@/components/data-logger/CaseTracker';

export const dynamic = 'force-dynamic';

export default async function SwUpdatesPage() {
  const assets = await getAssets();
  const installations = assets.map((asset) => ({ id: asset.id, name: asset.name }));
  return (
    <CaseTracker
      title="Sw Updates"
      breadcrumbs={['Technical Support', 'Sw Updates']}
      identifierPrefix="SWU"
      showContactSubjectColumns
      installations={installations}
    />
  );
}
