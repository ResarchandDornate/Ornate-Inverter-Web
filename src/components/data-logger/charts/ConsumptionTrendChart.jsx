'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const SERIES = [
  { key: 'solar', label: 'Solar', color: 'var(--color-solar)' },
  { key: 'mains', label: 'Mains', color: 'var(--color-mains)' },
  { key: 'dg1', label: 'DG Set 1', color: 'var(--color-dg1)' },
  { key: 'dg2', label: 'DG Set 2', color: 'var(--color-dg2)' },
];

export function ConsumptionTrendChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={280} initialDimension={{ width: 600, height: 280 }}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="22%">
        <CartesianGrid vertical={false} stroke="var(--color-line)" />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 10, fill: 'var(--color-muted)' }}
          tickLine={false}
          axisLine={{ stroke: 'var(--color-line)' }}
          interval={2}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
          tickLine={false}
          axisLine={false}
          width={40}
          label={{ value: 'kWh', angle: -90, position: 'insideLeft', fontSize: 11, fill: 'var(--color-muted)' }}
        />
        <Tooltip
          cursor={{ fill: 'rgba(47,111,237,0.06)' }}
          contentStyle={{
            borderRadius: 8,
            border: '1px solid var(--color-line)',
            fontSize: 12,
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        {SERIES.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} stackId="e" fill={s.color} radius={[0, 0, 0, 0]} maxBarSize={18} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
