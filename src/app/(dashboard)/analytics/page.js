"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Zap, Activity, TrendingUp, Calendar, BatteryCharging, Thermometer } from "lucide-react";
import { getData } from "@/lib/api";
import Topbar from "@/components/Topbar";
import KpiCard from "@/components/KpiCard";
import StatusBadge from "@/components/StatusBadge";
import { useLiveInverters } from "@/hooks/useLiveInverters";
import { computeStatus, formatLastSeen } from "@/lib/inverterStatus";

export default function AnalyticsPage() {
  // Memoize so it doesn't get recreated on every render (defensive — even
  // though primitive strings compare by value, this keeps the intent clear).
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [date, setDate] = useState(todayStr);
  const isToday = date === todayStr;

  const { data: inverters = [], dataUpdatedAt } = useLiveInverters();

  // Rolling live chart — accumulate one point every time useLiveInverters polls (every 15 s).
  const MAX_LIVE_SAMPLES = 60; // 15 min window at 15 s interval
  const [liveSeries, setLiveSeries] = useState([]);
  const lastUpdatedRef = useRef(null);

  useEffect(() => {
    if (!dataUpdatedAt || !isToday) return;
    if (lastUpdatedRef.current === dataUpdatedAt) return; // deduplicate
    lastUpdatedRef.current = dataUpdatedAt;

    const totalPower = inverters.reduce((s, i) => s + Number(i.power_out ?? 0), 0);
    const online = inverters.filter((i) => i.grid_connected === true).length;
    const point = {
      time: new Date(dataUpdatedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
      power: totalPower,
      online,
    };
    setLiveSeries((prev) => [...prev.slice(-(MAX_LIVE_SAMPLES - 1)), point]);
  }, [dataUpdatedAt, inverters, isToday]);

  // Hourly aggregates from /api/inverter/power-generation/ for the chosen date.
  // Backend computes energy_generated (kWh) and avg_power (W) per hour bucket.
  const { data: powerGenData, isLoading: loadingEnergy } = useQuery({
    queryKey: ["powerGenerationByDay", date],
    queryFn: () =>
      getData(
        `/inverter/power-generation/?start=${date}T00:00:00&end=${date}T23:59:59&ordering=measurement_time`
      ),
    refetchInterval: isToday ? 60000 : false,
  });

  const hourlyRecords = powerGenData?.results || [];

  // Aggregate energy across all inverters per hour, for the bar chart
  const hourlyChart = useMemo(() => {
    const byHour = {};
    hourlyRecords.forEach((r) => {
      const h = new Date(r.measurement_time).getHours();
      const key = `${String(h).padStart(2, "0")}:00`;
      if (!byHour[key]) byHour[key] = { hour: key, energy: 0, avgPower: 0, count: 0 };
      byHour[key].energy += parseFloat(r.energy_generated || 0);
      byHour[key].avgPower += parseFloat(r.avg_power || 0);
      byHour[key].count += 1;
    });
    // average avg_power across inverters for that hour
    return Object.values(byHour).map((b) => ({
      ...b,
      avgPower: b.count ? b.avgPower / b.count : 0,
    })).sort((a, b) => a.hour.localeCompare(b.hour));
  }, [hourlyRecords]);

  // Per-inverter energy total + peak avg_power for the day
  const perInverterAgg = useMemo(() => {
    const agg = {};
    hourlyRecords.forEach((r) => {
      const id = r.inverter;
      if (!agg[id]) agg[id] = { energy: 0, peakAvgPower: 0, samples: 0 };
      agg[id].energy += parseFloat(r.energy_generated || 0);
      agg[id].peakAvgPower = Math.max(agg[id].peakAvgPower, parseFloat(r.avg_power || 0));
      agg[id].samples += Number(r.data_points_count || 0);
    });
    return agg;
  }, [hourlyRecords]);

  // KPIs
  const totalEnergyToday = hourlyRecords.reduce(
    (s, r) => s + parseFloat(r.energy_generated || 0),
    0
  );
  const peakHourPower = hourlyChart.reduce((m, h) => Math.max(m, h.avgPower), 0);
  const totalLivePower = inverters.reduce((s, i) => s + Number(i.power_out ?? 0), 0);
  const onlineCount = inverters.filter((i) => i.grid_connected === true).length;
  const avgTemp = useMemo(() => {
    const valid = inverters.filter((i) => i.temperature != null);
    if (!valid.length) return 0;
    return valid.reduce((s, i) => s + Number(i.temperature), 0) / valid.length;
  }, [inverters]);

  return (
    <>
      <Topbar title="Analytics" breadcrumbs={["Dashboard", "Analytics"]} />
      <main className="flex-1 px-6 py-6 max-w-[1600px] w-full">
        {/* Header row with date picker */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isToday ? "Live Generation Report" : "Historical Generation Report"}
            </h2>
            <p className="text-sm text-slate-500">
              {isToday
                ? "Hourly energy + live power · auto-refreshes every minute"
                : `Data for ${format(new Date(date + "T00:00:00"), "dd MMM yyyy")}`}
            </p>
          </div>
          <label className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-white cursor-pointer hover:border-orange-400 transition">
            <Calendar size={15} className="text-slate-400" />
            <input
              type="date"
              value={date}
              max={todayStr}
              onChange={(e) => setDate(e.target.value)}
              className="text-sm text-slate-700 outline-none bg-transparent cursor-pointer"
            />
          </label>
        </div>

        {/* KPI cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            label={isToday ? "Energy Today" : "Energy Generated"}
            value={totalEnergyToday.toFixed(3)}
            unit="kWh"
            icon={BatteryCharging}
            accent="blue"
          />
          <KpiCard
            label="Peak Hour Avg Power"
            value={peakHourPower.toFixed(0)}
            unit="W"
            icon={TrendingUp}
            accent="indigo"
          />
          <KpiCard
            label="Live Power (now)"
            value={totalLivePower.toFixed(0)}
            unit="W"
            icon={Zap}
            accent="orange"
          />
          <KpiCard
            label="Inverters Online"
            value={`${onlineCount} / ${inverters.length}`}
            icon={Activity}
            accent={onlineCount === inverters.length && inverters.length > 0 ? "green" : "slate"}
          />
        </section>

        {/* Live rolling power chart — today only */}
        {isToday && (
          <section className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Live Power Output</h3>
                <p className="text-xs text-slate-500">
                  Total fleet power (W) · updates every 15 s · last {liveSeries.length} samples
                </p>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-green-50 border border-green-100">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold text-green-700 uppercase tracking-widest">Live</span>
              </div>
            </div>
            <div style={{ width: "100%", height: 280 }}>
              {liveSeries.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-slate-400">
                  Waiting for first sample…
                </div>
              ) : (
                <ResponsiveContainer>
                  <AreaChart data={liveSeries} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="liveGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#E97451" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#E97451" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 10, fill: "#6B7280" }}
                      minTickGap={30}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#6B7280" }}
                      unit=" W"
                      domain={[0, "auto"]}
                      width={65}
                    />
                    <Tooltip
                      formatter={(v) => [`${Number(v).toFixed(0)} W`, "Total Power"]}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="power"
                      name="Power (W)"
                      stroke="#E97451"
                      strokeWidth={2.5}
                      fill="url(#liveGradient)"
                      dot={false}
                      activeDot={{ r: 4, fill: "#E97451" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>
        )}

        {/* Hourly energy chart */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Hourly Energy Generation</h3>
              <p className="text-xs text-slate-500">
                kWh generated per hour · aggregate of all inverters
              </p>
            </div>
            <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
              {hourlyChart.length} hour{hourlyChart.length === 1 ? "" : "s"} of data
            </span>
          </div>
          {loadingEnergy ? (
            <div className="h-72 flex items-center justify-center text-sm text-slate-400">
              Loading…
            </div>
          ) : hourlyChart.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-sm text-slate-400">
              No energy data for this date yet.
            </div>
          ) : (
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={hourlyChart} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#6B7280" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} unit=" kWh" width={70} />
                  <Tooltip
                    formatter={(v, name) => {
                      if (name === "energy") return [`${Number(v).toFixed(3)} kWh`, "Energy"];
                      return [`${Number(v).toFixed(0)} W`, "Avg Power"];
                    }}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="energy" radius={[4, 4, 0, 0]} maxBarSize={42}>
                    {hourlyChart.map((_, i) => (
                      <Cell key={i} fill="#E97451" opacity={Math.max(0.6, 1 - (hourlyChart.length - 1 - i) * 0.02)} />
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
              {isToday ? "Today's energy" : "Selected day's energy"} ·{" "}
              <span className="font-semibold text-blue-600">{totalEnergyToday.toFixed(3)} kWh</span>
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="text-center px-5 py-3 font-semibold">Inverter</th>
                  <th className="text-center px-5 py-3 font-semibold">Energy (kWh)</th>
                  <th className="text-center px-5 py-3 font-semibold">Peak Avg Power</th>
                  <th className="text-center px-5 py-3 font-semibold">Live Power Out</th>
                  <th className="text-center px-5 py-3 font-semibold">Voltage</th>
                  <th className="text-center px-5 py-3 font-semibold">Temp</th>
                  <th className="text-center px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {[...inverters]
                  .sort((a, b) => (perInverterAgg[b.id]?.energy ?? 0) - (perInverterAgg[a.id]?.energy ?? 0))
                  .map((inv) => {
                    const agg = perInverterAgg[inv.id] || { energy: 0, peakAvgPower: 0 };
                    const status = computeStatus(inv);
                    return (
                      <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-5 py-3 font-semibold text-slate-900">
                          {inv.name}
                          <p className="text-xs text-slate-400 font-normal font-mono">{inv.serial_number}</p>
                          <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                            {formatLastSeen(inv.last_seen)}
                          </p>
                        </td>
                        <td className="px-5 py-3 text-center font-semibold text-blue-600">
                          {agg.energy.toFixed(3)}
                        </td>
                        <td className="px-5 py-3 text-center text-slate-700">
                          {agg.peakAvgPower.toFixed(0)} W
                        </td>
                        <td className="px-5 py-3 text-center font-semibold text-orange-600">
                          {Number(inv.power_out ?? 0).toFixed(0)} W
                        </td>
                        <td className="px-5 py-3 text-center text-slate-700">
                          {inv.voltage != null ? `${Number(inv.voltage).toFixed(1)} V` : "—"}
                        </td>
                        <td className="px-5 py-3 text-center text-slate-700">
                          {inv.temperature != null ? `${Number(inv.temperature).toFixed(1)} °C` : "—"}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <StatusBadge status={status} />
                        </td>
                      </tr>
                    );
                  })}
                {!inverters.length && (
                  <tr>
                    <td colSpan={7} className="text-center text-slate-400 py-12 text-sm">
                      No inverters in your account.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>{Object.keys(perInverterAgg).length} inverter{Object.keys(perInverterAgg).length === 1 ? "" : "s"} with data on this date</span>
            <span>
              {isToday ? "Auto-refreshes every minute" : "Historical snapshot"} ·{" "}
              <Thermometer size={11} className="inline text-slate-400" /> Avg: {avgTemp.toFixed(1)} °C
            </span>
          </div>
        </section>
      </main>
    </>
  );
}
