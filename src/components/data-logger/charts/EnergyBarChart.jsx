'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export function EnergyBarChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220} initialDimension={{ width: 600, height: 220 }}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barCategoryGap="18%">
        <CartesianGrid vertical={false} stroke="var(--color-line)" />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 10, fill: 'var(--color-muted)' }}
          tickLine={false}
          axisLine={{ stroke: 'var(--color-line)' }}
          interval={3}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip
          cursor={{ fill: 'rgba(47,111,237,0.06)' }}
          formatter={(v) => [`${Number(v)} kWh`, 'Energy']}
          contentStyle={{
            borderRadius: 8,
            border: '1px solid var(--color-line)',
            fontSize: 12,
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}
        />
        <Bar dataKey="value" fill="var(--color-brand)" radius={[3, 3, 0, 0]} maxBarSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}
