import Link from 'next/link';
import {
  Leaf,
  Zap,
  TreePine,
  Gauge,
  ChevronDown,
  SignalHigh,
  SignalLow,
  SignalZero,
  MonitorOff,
  Radio,
  Map as MapIcon,
  LayoutGrid,
  Activity,
  Bell,
  ArrowUpRight,
} from 'lucide-react';
import { getSiteSummary, getFleetStats, getMapAssets } from '@/lib/dataLoggerApi';
import { Card, SectionTitle, fmt } from '@/components/data-logger/ui';
import { TimeFilter } from '@/components/data-logger/TimeFilter';
import { ConsumptionTrendChart } from '@/components/data-logger/charts/ConsumptionTrendChart';
import { DistributionChart } from '@/components/data-logger/charts/DistributionChart';
import { StatusMap } from '@/components/data-logger/StatusMap';
import Topbar from '@/components/Topbar';

export const dynamic = 'force-dynamic';

export default async function SiteViewPage() {
  const [{ siteName, sustainability, consumption, trend }, fleet, mapAssets] = await Promise.all([
    getSiteSummary(),
    getFleetStats(),
    getMapAssets(),
  ]);

  const distribution = [
    { name: 'Solar Contribution', value: consumption.solar, color: 'var(--color-solar)' },
    { name: 'Mains Contribution', value: consumption.mains, color: 'var(--color-mains)' },
    { name: 'DG Set 1 Contribution', value: consumption.dg1, color: 'var(--color-dg1)' },
    { name: 'DG Set 2 Contribution', value: consumption.dg2, color: 'var(--color-dg2)' },
  ];

  // "Not monitored" = installations the fleet stats don't place in any of the
  // three known communication buckets yet.
  const notMonitored = Math.max(0, fleet.totalAssets - fleet.running - fleet.stopped - fleet.disconnected);

  return (
    <>
      <Topbar title="Site View" breadcrumbs={['Data Logger', 'Site View']} />
      <div className="mx-auto max-w-350 px-4 py-5 sm:px-6">
      {/* Site header */}
      <div className="mb-5 flex items-center gap-2">
        <Gauge className="h-4 w-4 text-muted" />
        <span className="text-base font-semibold text-ink">{siteName}</span>
        <button className="ml-1 flex items-center gap-1 rounded-md px-2 py-0.5 text-xs text-muted hover:bg-white">
          Site View <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Fleet overview: communication status + map (left) / stat cards (right) */}
      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <SectionTitle icon={<Radio className="h-4 w-4" />}>Installation communication status</SectionTitle>
            </div>
            <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
              <StatusTile icon={SignalHigh} tone="text-good" bg="bg-good/10" value={fleet.running} label="OK" />
              <StatusTile icon={SignalLow} tone="text-warn" bg="bg-warn/10" value={fleet.stopped} label="Temp comm lost" />
              <StatusTile icon={SignalZero} tone="text-danger" bg="bg-danger/10" value={fleet.disconnected} label="Sustained comm lost" />
              <StatusTile icon={MonitorOff} tone="text-muted" bg="bg-canvas" value={notMonitored} label="Not monitored" />
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <SectionTitle icon={<MapIcon className="h-4 w-4" />}>Installation Map</SectionTitle>
              <Link
                href="/data-logger/map"
                className="flex items-center gap-1 text-xs font-medium text-brand hover:underline"
              >
                Open full map <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div style={{ height: 420 }}>
              <StatusMap assets={mapAssets} />
            </div>
          </Card>
        </div>

        {/* Right-side stat cards */}
        <div className="space-y-4">
          <StatCard
            icon={LayoutGrid}
            value={fleet.totalAssets}
            label="Installations"
            subs={[
              { label: 'Devices', value: fleet.devices },
              { label: 'Online', value: fleet.online },
              { label: 'Offline', value: fleet.offline },
            ]}
          />
          <StatCard
            icon={Activity}
            value={fleet.running}
            label="Running Assets"
            subs={[
              { label: 'Stopped', value: fleet.stopped },
              { label: 'Disconnected', value: fleet.disconnected },
            ]}
          />
          <StatCard
            icon={Bell}
            value={0}
            label="Alerts (ongoing)"
            subs={[
              { label: 'Critical', value: 0 },
              { label: 'Warning', value: 0 },
            ]}
            href="/data-logger/alerts"
          />
        </div>
      </section>

      {/* Sustainability Summary */}
      <section className="mb-6">
        <SectionTitle icon={<Leaf className="h-4 w-4" />}>Sustainability Summary</SectionTitle>
        <Card className="mt-3">
          <div className="grid grid-cols-1 divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
            <SummaryMetric
              icon={<Zap className="h-5 w-5 text-solar" />}
              value={`${fmt(sustainability.totalSolarGenerated)} kWh`}
              label="Total Solar Energy Generated"
            />
            <SummaryMetric
              icon={<Leaf className="h-5 w-5 text-good" />}
              value={`${fmt(sustainability.co2Saved)} Kg`}
              label="CO₂ Emission Saved"
            />
            <SummaryMetric
              icon={<TreePine className="h-5 w-5 text-good" />}
              value={sustainability.treesPlanted.toLocaleString()}
              label="Equivalent Trees Planted"
            />
          </div>
        </Card>
      </section>

      {/* Site Consumption */}
      <section>
        <SectionTitle
          icon={<Gauge className="h-4 w-4" />}
          right={<TimeFilter options={['Last 7 Days', 'This Week', 'Last 30 Days']} defaultValue="Last 30 Days" />}
        >
          Site Consumption
        </SectionTitle>

        <Card className="mt-3 p-5">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <ConsumptionStat value={consumption.site} label="Site Consumption" accent="text-ink" />
            <ConsumptionStat value={consumption.solar} label="Solar Contribution" accent="text-solar" />
            <ConsumptionStat value={consumption.mains} label="Mains Contribution" accent="text-mains" />
            <ConsumptionStat value={consumption.dg1} label="DG Set 1 Contribution" accent="text-dg1" />
            <ConsumptionStat value={consumption.dg2} label="DG Set 2 Contribution" accent="text-dg2" />
          </div>
        </Card>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <SectionTitle>Energy Consumption Trends</SectionTitle>
            <div className="mt-4">
              <ConsumptionTrendChart data={trend} />
            </div>
          </Card>
          <Card className="p-5">
            <SectionTitle>Consumption Distribution</SectionTitle>
            <div className="mt-4">
              <DistributionChart data={distribution} />
            </div>
          </Card>
        </div>
      </section>
      </div>
    </>
  );
}

function StatusTile({ icon: Icon, tone, bg, value, label }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${bg}`}>
        <Icon className={`h-5 w-5 ${tone}`} />
      </div>
      <div>
        <div className="text-xl font-semibold tracking-tight text-ink">{value}</div>
        <div className="text-xs text-muted">{label}</div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, value, label, subs, href }) {
  const content = (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-muted" />
        <div className="text-lg font-semibold text-ink">
          {value} <span className="text-sm font-normal text-muted">{label}</span>
        </div>
      </div>
      <div className={`mt-4 grid gap-3`} style={{ gridTemplateColumns: `repeat(${subs.length}, minmax(0, 1fr))` }}>
        {subs.map((s) => (
          <div key={s.label} className="rounded-lg bg-canvas px-3 py-2.5">
            <div className="text-base font-semibold text-ink">{s.value}</div>
            <div className="mt-0.5 text-[11px] text-muted">{s.label}</div>
          </div>
        ))}
      </div>
    </Card>
  );
  return href ? (
    <Link href={href} className="block transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
      {content}
    </Link>
  ) : (
    content
  );
}

function SummaryMetric({ icon, value, label }) {
  return (
    <div className="flex items-center gap-4 px-6 py-6">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-canvas">{icon}</div>
      <div>
        <div className="text-2xl font-semibold tracking-tight text-ink">{value}</div>
        <div className="mt-0.5 text-xs text-muted">{label}</div>
      </div>
    </div>
  );
}

function ConsumptionStat({ value, label, accent }) {
  return (
    <div>
      <div className={`text-xl font-semibold tracking-tight ${accent}`}>{fmt(value)} kWh</div>
      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
        <span className="h-2 w-2 rounded-full bg-current opacity-60" />
        {label}
      </div>
    </div>
  );
}
