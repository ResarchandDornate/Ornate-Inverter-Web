import { Search, ChevronDown, Filter } from 'lucide-react';
import { getAssets, getFleetStats } from '@/lib/dataLoggerApi';
import { AssetCard } from '@/components/data-logger/AssetCard';

export const dynamic = 'force-dynamic';

export default async function AssetsPage() {
  const [assets, s] = await Promise.all([getAssets(), getFleetStats()]);

  return (
    <div className="mx-auto max-w-350 px-4 py-5 sm:px-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect label="Select territories" />
        <FilterSelect label="All Sites" />
        <FilterSelect label="All Assets" />
        <div className="flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2">
          <Search className="h-4 w-4 text-muted" />
          <input
            className="w-40 bg-transparent text-sm outline-none placeholder:text-muted"
            placeholder="Search Assets"
          />
        </div>
        <button className="ml-auto flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-2 text-sm text-muted hover:bg-canvas">
          <Filter className="h-4 w-4" /> Filters
        </button>
      </div>

      {/* Stat bar */}
      <div className="mt-4 flex flex-wrap items-stretch gap-4 rounded-xl border border-line bg-panel px-5 py-3">
        <StatGroup>
          <Stat value={s.totalAssets} label="Total Assets" strong />
          <Divider />
          <Stat value={s.running} label="Running" dot="bg-good" />
          <Stat value={s.stopped} label="Stopped" dot="bg-warn" />
          <Stat value={s.disconnected} label="Disconnected" dot="bg-muted" />
        </StatGroup>
        <div className="hidden w-px bg-line sm:block" />
        <StatGroup>
          <Stat value={s.devices} label="Devices" strong />
          <Divider />
          <Stat value={s.online} label="Online" dot="bg-good" />
          <Stat value={s.offline} label="Offline" dot="bg-danger" />
        </StatGroup>
      </div>

      {/* Asset grid */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {assets.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-line bg-panel py-16 text-center text-sm text-muted">
            No assets yet. Data appears here once an RMS device publishes over MQTT.
          </div>
        ) : (
          assets.map((a) => <AssetCard key={a.id} asset={a} />)
        )}
      </div>
    </div>
  );
}

function FilterSelect({ label }) {
  return (
    <button className="flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm text-ink hover:bg-canvas">
      <Filter className="h-3.5 w-3.5 text-muted" />
      {label}
      <ChevronDown className="h-4 w-4 text-muted" />
    </button>
  );
}

function StatGroup({ children }) {
  return <div className="flex flex-1 flex-wrap items-center gap-x-6 gap-y-2">{children}</div>;
}

function Divider() {
  return <div className="h-8 w-px bg-line" />;
}

function Stat({ value, label, dot, strong }) {
  return (
    <div className="flex items-center gap-2">
      {dot && <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />}
      <span className={strong ? 'text-lg font-semibold text-ink' : 'text-lg font-semibold text-ink'}>
        {value}
      </span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}
