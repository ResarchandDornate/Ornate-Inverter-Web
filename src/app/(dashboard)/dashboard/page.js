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
} from "recharts";
import { getData } from "@/lib/api";
import { QUERY_KEYS } from "@/lib/queryKeys";
import Topbar from "@/components/Topbar";
import KpiCard from "@/components/KpiCard";
import StatusBadge from "@/components/StatusBadge";

const MAX_LIVE_SAMPLES = 30; // ~5 minutes of data at 10s polling

export default function DashboardPage() {
  const { data: inverterData } = useQuery({
    queryKey: QUERY_KEYS.INVERTERS,
    queryFn: () => getData("/inverter/inverters/"),
    refetchInterval: 10000,
  });
  const { data: summaryData, dataUpdatedAt: summaryUpdatedAt } = useQuery({
    queryKey: QUERY_KEYS.USER_SUMMARY,
    queryFn: () => getData("/inverter/power-generation/user-summary/"),
    refetchInterval: 10000,
  });

  // Rolling live chart — accumulate snapshots of total power + online count
  // every time the summary query refetches. Kept on the client only.
  const [liveSeries, setLiveSeries] = useState([]);

  const invertersList = useMemo(
    () => inverterData?.results || (Array.isArray(inverterData) ? inverterData : []),
    [inverterData]
  );

  const inverters = useMemo(() => {
    const summaryMap = new Map();
    (summaryData?.inverters || []).forEach((inv) => summaryMap.set(inv.id, inv));
    return invertersList.map((inv) => ({ ...inv, ...summaryMap.get(inv.id) }));
  }, [invertersList, summaryData]);

  const onlineCount = inverters.filter((i) => i.grid_connected).length;
  const totalPower = summaryData?.total_power_w ?? 0;
  const totalEnergy = summaryData?.total_energy_kwh ?? 0;
  const faultCount = inverters.filter((i) => (i.fault_bitmask ?? 0) > 0).length;
  const totalInverters = inverters.length;

  useEffect(() => {
    if (!summaryUpdatedAt) return;
    const point = {
      time: new Date(summaryUpdatedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
      power: Number(summaryData?.total_power_w ?? 0),
      online: onlineCount,
    };
    setLiveSeries((prev) => [...prev.slice(-(MAX_LIVE_SAMPLES - 1)), point]);
  }, [summaryUpdatedAt, summaryData, onlineCount]);

  return (
    <>
      <Topbar title="Dashboard" breadcrumbs={["Overview", "Dashboard"]} />
      <main className="flex-1 px-6 py-6 max-w-[1600px] w-full">
        {/* KPI Row */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            label="Inverters Online"
            value={`${onlineCount}/${inverters.length}`}
            icon={Activity}
            accent="green"
            trend="+2.1%"
          />
          <KpiCard
            label="Live Power"
            value={Number(totalPower).toFixed(0)}
            unit="W"
            icon={Zap}
            accent="orange"
            trend="+5.4%"
          />
          <KpiCard
            label="Today's Energy"
            value={Number(totalEnergy).toFixed(2)}
            unit="kWh"
            icon={BatteryCharging}
            accent="blue"
            trend="+12.0%"
          />
          <KpiCard
            label="Active Faults"
            value={faultCount}
            icon={AlertTriangle}
            accent={faultCount > 0 ? "red" : "slate"}
          />
        </section>

        {/* Main grid: chart (2/3) + activity feed (1/3) */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">Live Generation</h2>
                <p className="text-xs text-slate-500">
                  Aggregate power (W) · {onlineCount} of {totalInverters} inverters online
                </p>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-green-50 border border-green-100">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold text-green-700 uppercase tracking-widest">
                  Live · {liveSeries.length} samples
                </span>
              </div>
            </div>
            <div style={{ width: "100%", height: 260 }}>
              {liveSeries.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-slate-400">
                  Waiting for first sample…
                </div>
              ) : (
                <ResponsiveContainer>
                  <AreaChart data={liveSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#E97451" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#E97451" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="onlineGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#6B7280" }} minTickGap={20} />
                    <YAxis
                      yAxisId="power"
                      tick={{ fontSize: 10, fill: "#6B7280" }}
                      unit=" W"
                      domain={[0, "auto"]}
                    />
                    <YAxis
                      yAxisId="online"
                      orientation="right"
                      tick={{ fontSize: 10, fill: "#10B981" }}
                      domain={[0, totalInverters || 1]}
                      allowDecimals={false}
                    />
                    <Tooltip />
                    <Area
                      yAxisId="power"
                      type="monotone"
                      dataKey="power"
                      name="Power (W)"
                      stroke="#E97451"
                      strokeWidth={2.5}
                      fill="url(#powerGradient)"
                    />
                    <Area
                      yAxisId="online"
                      type="stepAfter"
                      dataKey="online"
                      name="Online inverters"
                      stroke="#10B981"
                      strokeWidth={2}
                      fill="url(#onlineGradient)"
                    />
                  </AreaChart>
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
                    .filter((i) => (i.fault_bitmask ?? 0) > 0)
                    .map((i) => ({
                      type: "fault",
                      title: `Fault on ${i.name}`,
                      detail: `Bitmask 0x${(i.fault_bitmask).toString(16).toUpperCase()}`,
                      time: "now",
                    }))
                : [
                    { type: "ok", title: "All systems nominal", detail: "No active faults", time: "now" },
                    { type: "info", title: "Daily summary updated", detail: `${onlineCount} online`, time: "1 min ago" },
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

        {/* Inverter snapshot table */}
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
                  <th className="text-right px-5 py-3 font-semibold">Power</th>
                  <th className="text-right px-5 py-3 font-semibold">Energy</th>
                  <th className="text-right px-5 py-3 font-semibold">Faults</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {inverters.slice(0, 6).map((inv) => {
                  const bitmask = inv.fault_bitmask ?? 0;
                  const status = bitmask > 0 ? "fault" : inv.grid_connected ? "online" : "offline";
                  return (
                    <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                      <td className="px-5 py-3 font-semibold text-slate-900">{inv.name}</td>
                      <td className="px-5 py-3 text-slate-500 font-mono text-xs">{inv.serial_number}</td>
                      <td className="px-5 py-3"><StatusBadge status={status} /></td>
                      <td className="px-5 py-3 text-right text-slate-700">
                        {Number(inv.power_w ?? inv.current_power_w ?? inv.current_power ?? inv.power ?? 0).toFixed(0)} W
                      </td>
                      <td className="px-5 py-3 text-right text-slate-700">
                        {Number(inv.energy_kwh ?? inv.daily_energy_kwh ?? inv.total_energy_kwh ?? inv.energy_today ?? inv.total_energy ?? 0).toFixed(3)} kWh
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
