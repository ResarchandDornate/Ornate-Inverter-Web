"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Zap,
  BatteryCharging,
  AlertTriangle,
  ArrowUpRight,
  Activity,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { getData } from "@/lib/api";
import Topbar from "@/components/Topbar";
import KpiCard from "@/components/KpiCard";
import StatusBadge from "@/components/StatusBadge";
import { useLiveInverters } from "@/hooks/useLiveInverters";

const MAX_LIVE_SAMPLES = 30; // ~5 min @ 10s polling

const RANGES = [
  { id: "live", label: "Live" },
  { id: "24h", label: "Last 24h" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
];

// Returns ISO string for the start of the requested range.
function getStartIso(range) {
  const now = Date.now();
  const map = { "24h": 24 * 3600, "7d": 7 * 86400, "30d": 30 * 86400 };
  const secs = map[range];
  if (!secs) return null;
  return new Date(now - secs * 1000).toISOString();
}

export default function DashboardPage() {
  const { data: inverters = [], dataUpdatedAt } = useLiveInverters();
  const [liveSeries, setLiveSeries] = useState([]);
  const [range, setRange] = useState("live");

  const totalInverters = inverters.length;
  const onlineCount = inverters.filter((i) => i.grid_connected === true).length;
  const totalPower = inverters.reduce(
    (s, i) => s + Number(i.power_out ?? 0),
    0
  );
  const faultCount = inverters.filter((i) => Number(i.fault_bitmask ?? 0) > 0).length;
  const avgTemp = useMemo(() => {
    const valid = inverters.filter((i) => i.temperature != null);
    if (!valid.length) return 0;
    return valid.reduce((s, i) => s + Number(i.temperature), 0) / valid.length;
  }, [inverters]);

  // Accumulate live samples for the rolling 5-min chart
  useEffect(() => {
    if (!dataUpdatedAt || inverters.length === 0) return;
    const point = {
      time: new Date(dataUpdatedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
      power: totalPower,
      online: onlineCount,
    };
    setLiveSeries((prev) => [...prev.slice(-(MAX_LIVE_SAMPLES - 1)), point]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataUpdatedAt]);

  // Historical aggregates from /power-generation/
  const startIso = getStartIso(range);
  const { data: pgData, isLoading: pgLoading } = useQuery({
    queryKey: ["powerGenerationRange", range, startIso],
    queryFn: () =>
      getData(
        `/inverter/power-generation/?start=${startIso}&ordering=measurement_time`
      ),
    enabled: range !== "live" && !!startIso,
    refetchInterval: 60000,
  });

  // Group hourly records by hour (24h view) or day (7d / 30d view).
  // Sum across all inverters per bucket.
  const historicalChart = useMemo(() => {
    if (range === "live") return [];
    const records = pgData?.results || [];
    const byKey = {};
    records.forEach((r) => {
      const d = new Date(r.measurement_time);
      let key, label;
      if (range === "24h") {
        key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
        label = `${String(d.getHours()).padStart(2, "0")}:00`;
      } else {
        key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      }
      if (!byKey[key]) byKey[key] = { key, label, sortKey: d.getTime(), energy: 0, avgPower: 0, count: 0 };
      byKey[key].energy += parseFloat(r.energy_generated || 0);
      byKey[key].avgPower += parseFloat(r.avg_power || 0);
      byKey[key].count += 1;
    });
    return Object.values(byKey)
      .map((b) => ({ ...b, avgPower: b.count ? b.avgPower / b.count : 0 }))
      .sort((a, b) => a.sortKey - b.sortKey);
  }, [pgData, range]);

  const rangeTotalEnergy = historicalChart.reduce((s, b) => s + b.energy, 0);
  const rangePeakPower = historicalChart.reduce((m, b) => Math.max(m, b.avgPower), 0);

  return (
    <>
      <Topbar title="Dashboard" breadcrumbs={["Overview", "Dashboard"]} />
      <main className="flex-1 px-6 py-6 max-w-[1600px] w-full">
        {/* KPI Row */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            label="Inverters Online"
            value={`${onlineCount}/${totalInverters}`}
            icon={Activity}
            accent={onlineCount === totalInverters && totalInverters > 0 ? "green" : "slate"}
          />
          <KpiCard
            label="Live Power"
            value={totalPower.toFixed(0)}
            unit="W"
            icon={Zap}
            accent="orange"
          />
          <KpiCard
            label="Avg Temperature"
            value={avgTemp.toFixed(1)}
            unit="°C"
            icon={BatteryCharging}
            accent="blue"
          />
          <KpiCard
            label="Active Faults"
            value={faultCount}
            icon={AlertTriangle}
            accent={faultCount > 0 ? "red" : "slate"}
          />
        </section>

        {/* Main grid */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
            {/* Chart header with range tabs */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {range === "live" ? "Live Generation" : "Historical Generation"}
                </h2>
                <p className="text-xs text-slate-500">
                  {range === "live"
                    ? `Aggregate AC power (W) · ${onlineCount} of ${totalInverters} inverters online`
                    : range === "24h"
                    ? `Energy generated per hour (kWh) · last 24 hours`
                    : `Energy generated per day (kWh) · last ${range === "7d" ? "7" : "30"} days`}
                </p>
              </div>
              <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                {RANGES.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRange(r.id)}
                    className={`text-xs px-3 py-1.5 rounded-md font-semibold whitespace-nowrap ${
                      range === r.id
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary strip — totals for the selected range */}
            {range !== "live" && historicalChart.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Energy</p>
                  <p className="text-lg font-black text-blue-600">
                    {rangeTotalEnergy.toFixed(2)} <span className="text-xs font-medium text-slate-400">kWh</span>
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Peak Avg Power</p>
                  <p className="text-lg font-black text-orange-600">
                    {rangePeakPower.toFixed(0)} <span className="text-xs font-medium text-slate-400">W</span>
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Buckets</p>
                  <p className="text-lg font-black text-slate-700">
                    {historicalChart.length}{" "}
                    <span className="text-xs font-medium text-slate-400">
                      {range === "24h" ? "hours" : "days"}
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* Chart */}
            <div style={{ width: "100%", height: 280 }}>
              {range === "live" ? (
                liveSeries.length < 2 ? (
                  <div className="flex flex-col items-center justify-center h-full text-sm text-slate-400">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent mb-3" />
                    Collecting samples… ({liveSeries.length} / {MAX_LIVE_SAMPLES})
                  </div>
                ) : (
                  <ResponsiveContainer>
                    <AreaChart data={liveSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#E97451" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="#E97451" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                      <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#6B7280" }} minTickGap={30} />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#6B7280" }}
                        unit=" W"
                        domain={[0, "auto"]}
                        width={70}
                      />
                      <Tooltip
                        formatter={(v) => [`${Number(v).toFixed(0)} W`, "Power"]}
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="power"
                        name="Power"
                        stroke="#E97451"
                        strokeWidth={2.5}
                        fill="url(#powerGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )
              ) : pgLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-sm text-slate-400">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent mb-3" />
                  Loading aggregates…
                </div>
              ) : historicalChart.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-slate-400">
                  No energy data in this range yet.
                </div>
              ) : (
                <ResponsiveContainer>
                  <BarChart data={historicalChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "#6B7280" }}
                      interval={range === "30d" ? "preserveStartEnd" : 0}
                      angle={range === "30d" ? -30 : 0}
                      textAnchor={range === "30d" ? "end" : "middle"}
                      height={range === "30d" ? 50 : 30}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#6B7280" }}
                      unit=" kWh"
                      width={70}
                    />
                    <Tooltip
                      formatter={(v, name) => {
                        if (name === "energy") return [`${Number(v).toFixed(3)} kWh`, "Energy"];
                        return [`${Number(v).toFixed(0)} W`, "Avg Power"];
                      }}
                      labelFormatter={(l) => `${range === "24h" ? "Hour" : "Day"}: ${l}`}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Bar dataKey="energy" name="energy" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      {historicalChart.map((_, i) => (
                        <Cell key={i} fill="#E97451" opacity={0.7 + (i / historicalChart.length) * 0.3} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">Recent Activity</h2>
              <Link href="/alerts" className="text-xs text-orange-600 font-semibold hover:underline">
                View all
              </Link>
            </div>
            <ul className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
              {(faultCount > 0
                ? inverters
                    .filter((i) => Number(i.fault_bitmask ?? 0) > 0)
                    .map((i) => ({
                      type: "fault",
                      title: `Fault on ${i.name}`,
                      detail: `Bitmask 0x${Number(i.fault_bitmask).toString(16).toUpperCase()}`,
                      time: "now",
                    }))
                : [
                    { type: "ok", title: "All systems nominal", detail: "No active faults", time: "now" },
                    { type: "info", title: "Live polling active", detail: `${onlineCount} online`, time: "1 min ago" },
                  ]
              ).map((a, i) => (
                <li key={i} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      a.type === "fault"
                        ? "bg-red-50 text-red-600"
                        : a.type === "ok"
                        ? "bg-green-50 text-green-600"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {a.type === "fault" ? <AlertTriangle size={16} /> : <Activity size={16} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">{a.title}</p>
                    <p className="text-xs text-slate-500 truncate">{a.detail}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">{a.time}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Inverter fleet snapshot */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900">Inverter Fleet</h2>
              <p className="text-xs text-slate-500">Live status of all registered inverters</p>
            </div>
            <Link
              href="/inverters"
              className="text-xs text-orange-600 font-semibold hover:underline flex items-center gap-1"
            >
              Manage all <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Name</th>
                  <th className="text-left px-5 py-3 font-semibold">Serial</th>
                  <th className="text-left px-5 py-3 font-semibold">Status</th>
                  <th className="text-right px-5 py-3 font-semibold">Power Out</th>
                  <th className="text-right px-5 py-3 font-semibold">Temp</th>
                  <th className="text-right px-5 py-3 font-semibold">Faults</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {inverters.slice(0, 6).map((inv) => {
                  const bitmask = Number(inv.fault_bitmask ?? 0);
                  const status =
                    bitmask > 0
                      ? "fault"
                      : inv.grid_connected === true
                      ? "online"
                      : inv.grid_connected === false
                      ? "offline"
                      : "unknown";
                  return (
                    <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                      <td className="px-5 py-3 font-semibold text-slate-900">{inv.name}</td>
                      <td className="px-5 py-3 text-slate-500 font-mono text-xs">{inv.serial_number}</td>
                      <td className="px-5 py-3"><StatusBadge status={status} /></td>
                      <td className="px-5 py-3 text-right text-slate-700">
                        {Number(inv.power_out ?? 0).toFixed(0)} W
                      </td>
                      <td className="px-5 py-3 text-right text-slate-700">
                        {inv.temperature != null ? `${Number(inv.temperature).toFixed(1)} °C` : "—"}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {bitmask > 0 ? (
                          <span className="text-xs font-semibold text-red-600">0x{bitmask.toString(16).toUpperCase()}</span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/inverter/${inv.id}`}
                          className="text-xs font-semibold text-orange-600 hover:underline"
                        >
                          Open →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {!inverters.length && (
                  <tr><td colSpan={7} className="text-center text-slate-400 py-10 text-sm">No inverters yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
