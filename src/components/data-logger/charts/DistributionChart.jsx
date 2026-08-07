'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

export function DistributionChart({ data }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <ResponsiveContainer width="100%" height={260} initialDimension={{ width: 400, height: 260 }}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="42%"
          cy="50%"
          innerRadius={52}
          outerRadius={82}
          paddingAngle={1.5}
          stroke="none"
        >
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v) => `${Number(v).toLocaleString()} kWh (${((Number(v) / total) * 100).toFixed(1)}%)`}
          contentStyle={{
            borderRadius: 8,
            border: '1px solid var(--color-line)',
            fontSize: 12,
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}
        />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          iconType="circle"
          wrapperStyle={{ fontSize: 11, lineHeight: '20px' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
