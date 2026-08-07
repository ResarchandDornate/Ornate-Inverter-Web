import { Leaf, Zap, TreePine, Gauge, ChevronDown } from 'lucide-react';
import { getSiteSummary } from '@/lib/dataLoggerApi';
import { Card, SectionTitle, fmt } from '@/components/data-logger/ui';
import { TimeFilter } from '@/components/data-logger/TimeFilter';
import { ConsumptionTrendChart } from '@/components/data-logger/charts/ConsumptionTrendChart';
import { DistributionChart } from '@/components/data-logger/charts/DistributionChart';

export const dynamic = 'force-dynamic';

export default async function SiteViewPage() {
  const { siteName, sustainability, consumption, trend } = await getSiteSummary();

  const distribution = [
    { name: 'Solar Contribution', value: consumption.solar, color: 'var(--color-solar)' },
    { name: 'Mains Contribution', value: consumption.mains, color: 'var(--color-mains)' },
    { name: 'DG Set 1 Contribution', value: consumption.dg1, color: 'var(--color-dg1)' },
    { name: 'DG Set 2 Contribution', value: consumption.dg2, color: 'var(--color-dg2)' },
  ];

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-5">
      {/* Site header */}
      <div className="mb-5 flex items-center gap-2">
        <Gauge className="h-4 w-4 text-muted" />
        <span className="text-base font-semibold text-ink">{siteName}</span>
        <button className="ml-1 flex items-center gap-1 rounded-md px-2 py-0.5 text-xs text-muted hover:bg-white">
          Site View <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

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
