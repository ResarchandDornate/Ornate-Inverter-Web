import { LineChart, TrendingUp, Zap, Gauge } from 'lucide-react';
import { getFleetStats } from '@/lib/dataLoggerApi';
import { Card, SectionTitle } from '@/components/data-logger/ui';
import { TimeFilter } from '@/components/data-logger/TimeFilter';
import Topbar from '@/components/Topbar';

export const dynamic = 'force-dynamic';

export default async function TrendsPage() {
  const s = await getFleetStats();

  return (
    <>
      <Topbar title="Trends" breadcrumbs={['Data Logger', 'Trends']} />
      <div className="mx-auto max-w-350 px-4 py-5 sm:px-6">
        {/* Fleet snapshot */}
        <Card className="flex flex-wrap items-stretch gap-4 px-5 py-4">
          <SummaryStat icon={<Gauge className="h-5 w-5 text-accent" />} value={s.totalAssets} label="Assets Tracked" />
          <Divider />
          <SummaryStat icon={<TrendingUp className="h-5 w-5 text-good" />} value={s.running} label="Running Now" />
          <Divider />
          <SummaryStat icon={<Zap className="h-5 w-5 text-solar" />} value={s.devices} label="Devices Reporting" />
        </Card>

        <section className="mt-5">
          <SectionTitle
            icon={<LineChart className="h-4 w-4" />}
            right={<TimeFilter options={['Last 7 Days', 'Last 30 Days', 'Last 90 Days']} defaultValue="Last 30 Days" />}
          >
            Cross-Asset Trend Analytics
          </SectionTitle>

          <Card className="mt-3 flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-canvas">
              <LineChart className="h-5 w-5 text-muted" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">No trend data yet</p>
              <p className="mt-1 max-w-sm text-xs text-muted">
                Once assets have accumulated enough history, per-parameter trend comparisons across
                your fleet will appear here.
              </p>
            </div>
          </Card>
        </section>
      </div>
    </>
  );
}

function SummaryStat({ icon, value, label }) {
  return (
    <div className="flex flex-1 items-center gap-3 px-1">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-canvas">{icon}</div>
      <div>
        <div className="text-xl font-semibold tracking-tight text-ink">{value}</div>
        <div className="text-xs text-muted">{label}</div>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="hidden w-px bg-line sm:block" />;
}
