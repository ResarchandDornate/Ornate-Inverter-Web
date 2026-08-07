'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export function ParameterAreaChart({ data, unit }) {
  return (
    <ResponsiveContainer width="100%" height={260} initialDimension={{ width: 600, height: 260 }}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
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
          formatter={(v) => [`${Number(v)}${unit ? ` ${unit}` : ''}`, 'Value']}
          contentStyle={{
            borderRadius: 8,
            border: '1px solid var(--color-line)',
            fontSize: 12,
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--color-brand)"
          strokeWidth={2}
          fill="url(#areaFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
