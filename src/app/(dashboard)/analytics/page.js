"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Zap, Activity, TrendingUp, Calendar, Thermometer } from "lucide-react";
import Topbar from "@/components/Topbar";
import KpiCard from "@/components/KpiCard";
import { useLiveInverters } from "@/hooks/useLiveInverters";

export default function AnalyticsPage() {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);

  const { data: inverters = [] } = useLiveInverters();

  const totalPower = inverters.reduce((s, i) => s + Number(i.power_out ?? 0), 0);
  const totalPowerIn = inverters.reduce((s, i) => s + Number(i.power_in ?? 0), 0);
  const onlineCount = inverters.filter((i) => i.grid_connected).length;
  const avgTemp = useMemo(() => {
    const valid = inverters.filter((i) => i.temperature != null);
    if (!valid.length) return 0;
    return valid.reduce((s, i) => s + Number(i.temperature), 0) / valid.length;
  }, [inverters]);
  const avgPower = inverters.length ? totalPower / inverters.length : 0;

  const chartData = [...inverters]
    .map((inv) => ({
      name: inv.name || `#${inv.id}`,
      power_out: Number(inv.power_out ?? 0),
      power_in: Number(inv.power_in ?? 0),
    }))
    .sort((a, b) => b.power_out - a.power_out);

  const isToday = date === today;

  return (
    <>
      <Topbar title="Analytics" breadcrumbs={["Dashboard", "Analytics"]} />
      <main className="flex-1 px-6 py-6 max-w-[1600px] w-full">
        {/* Header row with date picker */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Live Inverter Snapshot</h2>
            <p className="text-sm text-slate-500">
              {isToday
                ? "Real-time AC / DC power · auto-refreshes every 10s"
                : `Date filter UI only — backend doesn't accept date param on /status. Showing live.`}
            </p>
          </div>
          <label className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-white cursor-pointer hover:border-orange-400 transition">
            <Calendar size={15} className="text-slate-400" />
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
              className="text-sm text-slate-700 outline-none bg-transparent cursor-pointer"
            />
          </label>
        </div>

        {/* KPI cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            label="Total Power Out (AC)"
            value={totalPower.toFixed(0)}
            unit="W"
            icon={Zap}
            accent="orange"
          />
          <KpiCard
            label="Total Power In (DC)"
            value={totalPowerIn.toFixed(0)}
            unit="W"
            icon={TrendingUp}
            accent="indigo"
          />
          <KpiCard
            label="Inverters Online"
            value={`${onlineCount} / ${inverters.length}`}
            icon={Activity}
            accent="green"
          />
          <KpiCard
            label="Avg Temperature"
            value={avgTemp.toFixed(1)}
            unit="°C"
            icon={Thermometer}
            accent="red"
          />
        </section>

        {/* Bar chart - power by inverter */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Power Output by Inverter</h3>
              <p className="text-xs text-slate-500">Live AC power (W) sorted high → low</p>
            </div>
            <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
              {inverters.length} inverters
            </span>
          </div>
          {chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-slate-400">
              No inverter data available
            </div>
          ) : (
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    angle={-30}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    unit=" W"
                    width={70}
                  />
                  <Tooltip
                    formatter={(v, name) => [`${Number(v).toFixed(0)} W`, name]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="power_out" name="Power Out (AC)" radius={[4, 4, 0, 0]} maxBarSize={52}>
                    {chartData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={i % 2 === 0 ? "#E97451" : "#FB923C"}
                        opacity={Math.max(0.55, 1 - i * 0.04)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Per-inverter breakdown */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Per-Inverter Breakdown</h3>
            <span className="text-xs text-slate-400">
              Total Out: <span className="font-semibold text-orange-600">{totalPower.toFixed(0)} W</span> ·
              Avg: <span className="font-semibold text-blue-600">{avgPower.toFixed(0)} W</span>
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Inverter</th>
                  <th className="text-right px-5 py-3 font-semibold">P-out (W)</th>
                  <th className="text-right px-5 py-3 font-semibold">P-in (W)</th>
                  <th className="text-right px-5 py-3 font-semibold">Voltage</th>
                  <th className="text-right px-5 py-3 font-semibold">Current</th>
                  <th className="text-right px-5 py-3 font-semibold">Temp</th>
                  <th className="text-right px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {[...inverters]
                  .sort((a, b) => Number(b.power_out ?? 0) - Number(a.power_out ?? 0))
                  .map((inv) => {
                    const online = inv.grid_connected;
                    return (
                      <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-5 py-3 font-semibold text-slate-900">
                          {inv.name}
                          <p className="text-xs text-slate-400 font-normal font-mono">{inv.serial_number}</p>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-orange-600">
                          {Number(inv.power_out ?? 0).toFixed(0)}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-700">
                          {Number(inv.power_in ?? 0).toFixed(0)}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-700">
                          {inv.voltage != null ? `${Number(inv.voltage).toFixed(1)} V` : "—"}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-700">
                          {inv.current != null ? `${Number(inv.current).toFixed(2)} A` : "—"}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-700">
                          {inv.temperature != null ? `${Number(inv.temperature).toFixed(1)} °C` : "—"}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span
                            className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${
                              online ? "bg-green-500" : "bg-red-500"
                            }`}
                          />
                          <span className={`text-xs font-semibold ${online ? "text-green-700" : "text-red-700"}`}>
                            {online ? "Online" : "Offline"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                {!inverters.length && (
                  <tr><td colSpan={7} className="text-center text-slate-400 py-12 text-sm">No data.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
