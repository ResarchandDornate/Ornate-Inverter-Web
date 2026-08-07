'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  Cpu,
  Download,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import { StatusPill, fmt } from '@/components/data-logger/ui';
import { ParameterAreaChart } from '@/components/data-logger/charts/ParameterAreaChart';

const TIME_RANGES = ['Last 24 hrs', 'Today', 'Yesterday', 'Last 7 days', 'This week'];

export function DetailedView({ asset }) {
  const [selected, setSelected] = useState(0);
  const [range, setRange] = useState(TIME_RANGES[0]);
  const [query, setQuery] = useState('');

  const param = asset.parameters[selected];

  const stats = useMemo(() => {
    const values = asset.hourly.map((h) => h.value);
    const sum = values.reduce((a, b) => a + b, 0);
    return {
      avg: sum / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }, [asset.hourly]);

  const filtered = asset.parameters
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="mx-auto max-w-350 px-4 py-5 sm:px-6">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-good/10">
          <Cpu className="h-5 w-5 text-good" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-ink">{asset.name}</h1>
            <StatusPill status={asset.status} />
          </div>
          <div className="text-xs text-muted">
            {asset.make ? `Make: ${asset.make}` : `Model: ${asset.model}`} · 14 Jul 2026, 12:42
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-line bg-white p-0.5 text-xs font-medium">
            <span className="rounded bg-accent px-3 py-1 text-white">Detailed View</span>
            <span className="px-3 py-1 text-muted">Analog View</span>
          </div>
          <Link
            href="/data-logger/assets"
            className="flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink hover:bg-canvas"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        {/* Parameter list */}
        <div className="rounded-xl border border-line bg-panel">
          <div className="border-b border-line p-4">
            <h3 className="text-sm font-semibold text-ink">Parameters</h3>
            <p className="mt-1 text-[11px] text-muted">
              Real-time values are shown below. Select a parameter to view trends.
            </p>
            <div className="mt-3 flex items-center gap-2 rounded-md border border-line bg-canvas px-2.5 py-1.5">
              <Search className="h-3.5 w-3.5 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
                placeholder="Search here"
              />
            </div>
          </div>
          <ul className="max-h-115 overflow-y-auto py-1">
            {filtered.map(({ p, i }) => (
              <li key={p.label}>
                <button
                  onClick={() => setSelected(i)}
                  className={[
                    'flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors',
                    i === selected ? 'bg-accent/10 text-accent' : 'text-ink hover:bg-canvas',
                  ].join(' ')}
                >
                  <span className="truncate">
                    {p.label} {p.unit ? <span className="text-muted">({p.unit})</span> : null}
                  </span>
                  <span className="ml-2 shrink-0 font-semibold">
                    {typeof p.value === 'number' ? fmt(p.value) : p.value}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Chart / energy panel */}
        <div className="space-y-4">
          {/* Energy totals */}
          <div className="rounded-xl border border-line bg-panel p-5">
            <h3 className="mb-4 text-sm font-semibold text-ink">Energy (kWh)</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <EnergyStat label="Today" value={asset.energy.today} delta={asset.energy.todayDelta} />
              <EnergyStat label="This Month" value={asset.energy.month} />
              <EnergyStat label="This Year" value={asset.energy.year} />
            </div>
          </div>

          {/* Trend */}
          <div className="rounded-xl border border-line bg-panel p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <div className="text-sm font-semibold text-ink">
                  {param.label} {param.unit ? `(${param.unit})` : ''}
                </div>
                <div className="text-2xl font-semibold tracking-tight text-brand">
                  {typeof param.value === 'number' ? fmt(param.value) : param.value}
                </div>
              </div>
              <button className="ml-auto rounded-md border border-line p-1.5 text-muted hover:bg-canvas">
                <Download className="h-4 w-4" />
              </button>
            </div>

            {/* time range tabs */}
            <div className="mt-3 flex flex-wrap gap-1 rounded-lg border border-line bg-canvas p-0.5">
              {TIME_RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={[
                    'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                    range === r ? 'bg-accent text-white' : 'text-muted hover:text-ink',
                  ].join(' ')}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* avg/min/max */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <MiniStat icon={<TrendingUp className="h-4 w-4 text-brand" />} label="Average" value={fmt(stats.avg)} unit={param.unit} />
              <MiniStat icon={<ArrowDownRight className="h-4 w-4 text-danger" />} label="Minimum" value={fmt(stats.min)} unit={param.unit} note="On 13 Jul, 19:20" />
              <MiniStat icon={<ArrowUpRight className="h-4 w-4 text-good" />} label="Maximum" value={fmt(stats.max)} unit={param.unit} note="On 14 Jul, 11:21" />
            </div>

            <div className="mt-4">
              <ParameterAreaChart data={asset.hourly} unit={param.unit} />
              <div className="mt-1 text-center text-[11px] text-muted">Date &amp; Time</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EnergyStat({ label, value, delta }) {
  return (
    <div className="rounded-lg bg-canvas p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-xl font-semibold text-ink">{fmt(value)} kWh</div>
      {delta != null && (
        <div className="mt-1 text-[11px] text-muted">
          <span className={delta >= 0 ? 'text-good' : 'text-danger'}>
            {delta >= 0 ? '▲' : '▼'} {fmt(Math.abs(delta))} kWh
          </span>
        </div>
      )}
    </div>
  );
}

function MiniStat({ icon, label, value, unit, note }) {
  return (
    <div className="rounded-lg border border-line p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted">
        {icon} {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-ink">
        {value} {unit && <span className="text-xs font-normal text-muted">{unit}</span>}
      </div>
      {note && <div className="text-[10px] text-muted">{note}</div>}
    </div>
  );
}
