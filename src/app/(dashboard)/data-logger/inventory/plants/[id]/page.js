import Link from 'next/link';
import { getPlant } from '@/lib/dataLoggerApi';
import { PlantDetail } from '@/components/data-logger/PlantDetail';

export const dynamic = 'force-dynamic';

export default async function PlantDetailPage({ params }) {
  const { id } = await params;
  const plant = await getPlant(id);

  if (!plant) {
    return (
      <div className="flex h-full items-center justify-center px-6 py-20">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold text-ink">Installation unavailable</h1>
          <p className="mt-2 text-sm text-muted">
            No data for installation <span className="font-mono">{id}</span> yet.
          </p>
          <Link
            href="/data-logger/inventory/plants"
            className="mt-4 inline-block rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink hover:bg-canvas"
          >
            Back to Installations
          </Link>
        </div>
      </div>
    );
  }

  return <PlantDetail plant={plant} />;
}
