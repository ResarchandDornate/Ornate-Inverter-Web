"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { BatteryCharging, Zap, Activity, TrendingUp, Calendar } from "lucide-react";
import { getData } from "@/lib/api";
import { QUERY_KEYS } from "@/lib/queryKeys";
import Topbar from "@/components/Topbar";
import KpiCard from "@/components/KpiCard";

function getEnergy(inv) {
  return Number(
    inv.energy_kwh ??
    inv.daily_energy_kwh ??
    inv.total_energy_kwh ??
    inv.energy_today ??
    inv.total_energy ??
    inv.energy ??
    0
  );
}
function getPower(inv) {
  return Number(
    inv.power_w ??
    inv.current_power_w ??
    inv.current_power ??
    inv.power ??
    0
  );
}

export default function AnalyticsPage() {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);

  const { data: inverterData } = useQuery({
    queryKey: QUERY_KEYS.INVERTERS,
    queryFn: () => getData("/inverter/inverters/"),
  });

  const { data: summaryData } = useQuery({
    queryKey: QUERY_KEYS.USER_SUMMARY,
    queryFn: () => getData("/inverter/power-generation/user-summary/"),
    refetchInterval: 10000,
  });

  const invertersList = useMemo(
    () => inverterData?.results || (Array.isArray(inverterData) ? inverterData : []),
    [inverterData]
  );

  const inverters = useMemo(() => {
    const summaryMap = new Map();
    (summaryData?.inverters || []).forEach((inv) => summaryMap.set(inv.id, inv));
    return invertersList.map((inv) => ({ ...inv, ...summaryMap.get(inv.id) }));
  }, [invertersList, summaryData]);

  const totalEnergy = Number(summaryData?.total_energy_kwh ?? 0);
  const totalPower = Number(summaryData?.total_power_w ?? 0);
  const onlineCount = inverters.filter((i) => i.grid_connected).length;
  const avgEnergy = inverters.length ? totalEnergy / inverters.length : 0;

  const chartData = [...inverters]
    .map((inv) => ({
      name: inv.name || `#${inv.id}`,
      energy: getEnergy(inv),
      power: getPower(inv),
    }))
    .sort((a, b) => b.energy - a.energy);

  const isToday = date === today;

  return (
    <>
      <Topbar title="Analytics" breadcrumbs={["Dashboard", "Analytics"]} />
      <main className="flex-1 px-6 py-6 max-w-[1600px] w-full">

        {/* Header row with date picker */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Daily Generation Report</h2>
            <p className="text-sm text-slate-500">
              {isToday
                ? "Live data for today · auto-refreshes every 10s"
                : `Data for ${format(new Date(date + "T00:00:00"), "dd MMM yyyy")}`}
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
            label="Total Energy Today"
            value={totalEnergy.toFixed(3)}
            unit="kWh"
            icon={BatteryCharging}
            accent="blue"
          />
          <KpiCard
            label="Live Power"
            value={totalPower.toFixed(0)}
            unit="W"
            icon={Zap}
            accent="orange"
          />
          <KpiCard
            label="Inverters Online"
            value={`${onlineCount} / ${inverters.length}`}
            icon={Activity}
            accent="green"
          />
          <KpiCard
            label="Avg. per Inverter"
            value={avgEnergy.toFixed(3)}
            unit="kWh"
            icon={TrendingUp}
            accent="indigo"
          />
        </section>

        {/* Bar chart - energy by inverter */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Energy by Inverter</h3>
              <p className="text-xs text-slate-500">kWh generated per inverter today</p>
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
                    unit=" kWh"
                    width={70}
                  />
                  <Tooltip
                    formatter={(v) => [`${Number(v).toFixed(3)} kWh`, "Energy"]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="energy" radius={[4, 4, 0, 0]} maxBarSize={52}>
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

        {/* Per-inverter breakdown table */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Per-Inverter Breakdown</h3>
            <span className="text-xs text-slate-400">
              Total: <span className="font-semibold text-blue-600">{totalEnergy.toFixed(3)} kWh</span>
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">#</th>
                  <th className="text-left px-5 py-3 font-semibold">Inverter</th>
                  <th className="text-left px-5 py-3 font-semibold">Serial</th>
                  <th className="text-left px-5 py-3 font-semibold">Location</th>
                  <th className="text-right px-5 py-3 font-semibold">Energy (kWh)</th>
                  <th className="text-right px-5 py-3 font-semibold">Live Power (W)</th>
                  <th className="text-right px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {inverters.map((inv, i) => {
                  const energy = getEnergy(inv);
                  const power = getPower(inv);
                  const pct = totalEnergy > 0 ? (energy / totalEnergy) * 100 : 0;
                  return (
                    <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                      <td className="px-5 py-3 text-slate-400 text-xs font-mono">{i + 1}</td>
                      <td className="px-5 py-3 font-semibold text-slate-900">{inv.name}</td>
                      <td className="px-5 py-3 text-xs font-mono text-slate-500">{inv.serial_number}</td>
                      <td className="px-5 py-3 text-slate-600">{inv.city || "—"}</td>
                      <td className="px-5 py-3 text-right">
                        <span className="font-semibold text-blue-700">{energy.toFixed(3)}</span>
                        {totalEnergy > 0 && (
                          <span className="ml-2 text-[10px] text-slate-400">({pct.toFixed(1)}%)</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-700">{power.toFixed(0)}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                          inv.grid_connected
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}>
                          {inv.grid_connected ? "Online" : "Offline"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {!inverters.length && (
                  <tr>
                    <td colSpan={7} className="text-center text-slate-400 py-12 text-sm">
                      No inverter data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
            <span>Showing {inverters.length} inverters</span>
            <span>Auto-refreshes every 10s</span>
          </div>
        </section>
      </main>
    </>
  );
}
