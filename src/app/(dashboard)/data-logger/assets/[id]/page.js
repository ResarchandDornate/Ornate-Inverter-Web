import Link from 'next/link';
import { getAsset } from '@/lib/dataLoggerApi';
import { DetailedView } from '@/components/data-logger/DetailedView';
import Topbar from '@/components/Topbar';

export const dynamic = 'force-dynamic';

export default async function AssetDetailPage({ params }) {
  // Next 16: params is a Promise — must be awaited.
  const { id } = await params;
  const asset = await getAsset(id);

  // getAsset() returns null when the data-logger backend is unreachable or the
  // asset doesn't exist. DetailedView assumes a well-formed asset (parameters /
  // hourly arrays), so guard here instead of letting it crash.
  if (!asset || !Array.isArray(asset.parameters) || asset.parameters.length === 0) {
    return (
      <>
        <Topbar title="Asset unavailable" breadcrumbs={['Data Logger', 'Assets', id]} />
        <div className="flex h-full items-center justify-center px-6 py-20">
          <div className="max-w-md text-center">
            <h1 className="text-lg font-semibold text-ink">Asset unavailable</h1>
            <p className="mt-2 text-sm text-muted">
              No data for asset <span className="font-mono">{id}</span> yet — it appears once the
              device publishes over MQTT, or the data-logger backend is offline.
            </p>
            <Link
              href="/data-logger/assets"
              className="mt-4 inline-block rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink hover:bg-canvas"
            >
              Back to Assets
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title={asset.name} breadcrumbs={['Data Logger', 'Assets', asset.name]} />
      <DetailedView asset={asset} />
    </>
  );
}
