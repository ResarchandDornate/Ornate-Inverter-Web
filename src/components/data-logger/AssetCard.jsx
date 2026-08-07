import Link from 'next/link';
import { Cpu, TrendingUp, TrendingDown, Eye, Activity } from 'lucide-react';
import { StatusDot, fmt } from '@/components/data-logger/ui';

export function AssetCard({ asset }) {
  const delta = asset.energy.todayDelta ?? 0;
  const up = delta >= 0;

  return (
    <div className="rounded-xl border border-line bg-panel p-4 transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
      {/* header */}
      <div className="flex items-start gap-3">
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-good/10">
          <Cpu className="h-4 w-4 text-good" />
          <span className="absolute -right-0.5 -top-0.5">
            <StatusDot status={asset.status} />
          </span>
        </div>
        <div className="min-w-0">
          <Link
            href={`/data-logger/assets/${asset.id}`}
            className="block truncate text-sm font-semibold text-ink hover:text-brand"
            title={asset.name}
          >
            {asset.name}
          </Link>
          <div className="text-[11px] text-muted">14 Jul 2026, 12:44</div>
        </div>
      </div>

      {/* energy */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-canvas px-3 py-2.5">
          <div className="text-lg font-semibold text-ink">{fmt(asset.energy.today)}</div>
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
            Today (kWh)
            <span className={up ? 'text-good' : 'text-danger'}>
              {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            </span>
            <span className={up ? 'text-good' : 'text-danger'}>{fmt(Math.abs(delta))}</span>
          </div>
        </div>
        <div className="rounded-lg bg-canvas px-3 py-2.5">
          <div className="text-lg font-semibold text-ink">{fmt(asset.energy.month)}</div>
          <div className="mt-0.5 text-[11px] text-muted">This Month (kWh)</div>
        </div>
      </div>

      {/* instantaneous */}
      <div className="mt-3 flex items-center gap-4 border-t border-line pt-3 text-xs">
        <Reading label="kW" value={fmt(asset.kw)} />
        <Reading label="A" value={fmt(asset.ampere)} />
        <Reading label="V" value={fmt(asset.voltage)} />
      </div>

      {/* actions */}
      <div className="mt-3 flex items-center gap-2">
        <Link
          href={`/data-logger/assets/${asset.id}`}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-line py-1.5 text-xs font-medium text-ink hover:bg-canvas"
        >
          <Eye className="h-3.5 w-3.5" /> Detailed View
        </Link>
        <Link
          href={`/data-logger/assets/${asset.id}`}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-line py-1.5 text-xs font-medium text-muted hover:bg-canvas"
        >
          <Activity className="h-3.5 w-3.5" /> Analog View
        </Link>
      </div>
    </div>
  );
}

function Reading({ label, value }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-[10px] uppercase text-muted">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}
