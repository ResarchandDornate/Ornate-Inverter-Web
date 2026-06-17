"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Zap,
  Activity,
  Thermometer,
  Save,
  AlertCircle,
  Sun,
  CloudSun,
  ArrowUpDown,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
} from "lucide-react";
import { getData } from "@/lib/api";
import { QUERY_KEYS } from "@/lib/queryKeys";
import Topbar from "@/components/Topbar";
import StatusBadge from "@/components/StatusBadge";
import StatusCard from "@/components/StatusCard";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "generation", label: "Generation" },
  { id: "faults", label: "Faults" },
];

export default function InverterDetailsPage() {
  const { id: inverterId } = useParams();
  const [tab, setTab] = useState("overview");

  const {
    data: inverterHistory,
    isLoading,
    refetch: onRefresh,
    isRefetching,
  } = useQuery({
    queryKey: QUERY_KEYS.INVERTER_DETAILS(inverterId),
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const response = await getData(`/inverter/inverter-data/?date=${today}&inverter=${inverterId}`);
      const data = response.results || (Array.isArray(response) ? response : []);
      data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return data;
    },
    enabled: !!inverterId,
    refetchInterval: 10000,
  });

  const { data: gridStatusData } = useQuery({
    queryKey: QUERY_KEYS.GRID_STATUS(inverterId),
    queryFn: () => getData(`/inverter/inverters/${inverterId}/grid_status/`),
    enabled: !!inverterId,
    refetchInterval: 10000,
  });

  const generationData = inverterHistory || [];
  const latestReading = generationData[0] || {};
  const gridConnected = gridStatusData?.grid_connected ?? null;
  const offline = gridConnected === false;
  const bitmask = Number(latestReading.fault_bitmask ?? 0);
  const hasFault = bitmask > 0;
  const status = hasFault ? "fault" : gridConnected ? "online" : gridConnected === false ? "offline" : "unknown";

  const chartData = useMemo(() => {
    return generationData
      .slice(0, 60)
      .reverse()
      .map((d) => ({
        time: format(new Date(d.timestamp), "HH:mm:ss"),
        power: parseFloat(d.power || 0),
      }));
  }, [generationData]);

  // Compute daily energy: each reading covers ~10 s interval, power is in W
  // Energy (kWh) = Power (W) × 10s / 3600s/h / 1000
  const dailyEnergyKwh = useMemo(() => {
    return generationData.reduce(
      (sum, d) => sum + parseFloat(d.power || 0) * 10 / 3600 / 1000,
      0
    );
  }, [generationData]);

  const peakPowerW = useMemo(() => {
    if (!generationData.length) return 0;
    return Math.max(...generationData.map((d) => parseFloat(d.power || 0)));
  }, [generationData]);

  const avgPowerW = useMemo(() => {
    if (!generationData.length) return 0;
    return generationData.reduce((s, d) => s + parseFloat(d.power || 0), 0) / generationData.length;
  }, [generationData]);

  return (
    <>
      <Topbar
        title={`Inverter #${inverterId}`}
        breadcrumbs={["Dashboard", "Inverters", `#${inverterId}`]}
      />
      <main className="flex-1 px-6 py-6 max-w-[1600px] w-full">
        {/* Hero status card */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 mb-4 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-4 flex-1 min-w-[240px]">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
              hasFault ? "bg-red-50" : gridConnected ? "bg-green-50" : "bg-slate-100"
            }`}>
              <Zap size={24} className={
                hasFault ? "text-red-600" : gridConnected ? "text-green-600" : "text-slate-400"
              } />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Live status</p>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                {offline ? "0" : parseFloat(latestReading.power || 0).toFixed(0)} <span className="text-sm text-slate-400 font-normal">W output</span>
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={status} />
            <button
              onClick={() => onRefresh()}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            >
              <RefreshCw size={14} className={isRefetching ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </section>

        {/* Tabs */}
        <div className="border-b border-slate-200 mb-5 flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition ${
                tab === t.id
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {isLoading && !generationData.length ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw size={32} className="animate-spin text-orange-500" />
            <p className="text-sm text-slate-500 mt-3">Loading inverter data…</p>
          </div>
        ) : generationData.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
            <Activity size={36} className="text-slate-400 mx-auto mb-3" />
            <h3 className="text-slate-800 font-bold mb-1">No data available</h3>
            <p className="text-slate-500 text-sm mb-5">
              We couldn&apos;t find any recent data for this inverter.
            </p>
            <button
              onClick={() => onRefresh()}
              className="bg-slate-800 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-slate-700"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {tab === "overview" && (
              <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatusCard
                  title="Voltage"
                  value={offline ? "0.0" : parseFloat(latestReading.voltage).toFixed(1)}
                  unit="V"
                  icon={Zap}
                  color="#F59E0B"
                  bgClass="bg-amber-100"
                />
                <StatusCard
                  title="Current"
                  value={offline ? "0.00" : parseFloat(latestReading.current).toFixed(2)}
                  unit="A"
                  icon={Activity}
                  color="#3B82F6"
                  bgClass="bg-blue-100"
                />
                <StatusCard
                  title="Temperature"
                  value={offline ? "N/A" : latestReading.temperature}
                  unit={offline ? "" : "°C"}
                  icon={Thermometer}
                  color="#EF4444"
                  bgClass="bg-red-100"
                />
                <StatusCard
                  title="Grid Status"
                  value={gridConnected === null ? "..." : gridConnected ? "ON" : "OFF"}
                  unit=""
                  icon={gridConnected ? Save : AlertCircle}
                  color={gridConnected ? "#10B981" : "#EF4444"}
                  bgClass={gridConnected ? "bg-green-100" : "bg-red-100"}
                />
                <StatusCard
                  title="VPV"
                  value={offline ? "0.00" : parseFloat(latestReading.vpv || 0).toFixed(2)}
                  unit="V"
                  icon={Sun}
                  color="#F97316"
                  bgClass="bg-orange-100"
                />
                <StatusCard
                  title="IPV"
                  value={offline ? "0.00" : parseFloat(latestReading.ipv || 0).toFixed(2)}
                  unit="A"
                  icon={CloudSun}
                  color="#EAB308"
                  bgClass="bg-yellow-100"
                />
                <StatusCard
                  title="Delta"
                  value={offline ? "0.00" : parseFloat(latestReading.delta || 0).toFixed(2)}
                  unit=""
                  icon={ArrowUpDown}
                  color="#6366F1"
                  bgClass="bg-indigo-100"
                />
                <StatusCard
                  title="Faults"
                  value={String(bitmask).padStart(2, "0")}
                  unit=""
                  icon={hasFault ? ShieldAlert : ShieldCheck}
                  color={hasFault ? "#EF4444" : "#10B981"}
                  bgClass={hasFault ? "bg-red-100" : "bg-green-100"}
                  valueColor={hasFault ? "#EF4444" : undefined}
                />
              </section>
            )}

            {tab === "generation" && (
              <>
                {/* Daily summary stats */}
                <section className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Daily Energy</p>
                    <p className="text-2xl font-bold text-blue-600">{dailyEnergyKwh.toFixed(3)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">kWh generated today</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Peak Power</p>
                    <p className="text-2xl font-bold text-orange-600">{peakPowerW.toFixed(0)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">W maximum output</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Avg Power</p>
                    <p className="text-2xl font-bold text-slate-700">{avgPowerW.toFixed(0)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">W average · {generationData.length} readings</p>
                  </div>
                </section>

                <section className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
                  <h3 className="text-base font-bold text-slate-900 mb-1">Generation Trend</h3>
                  <p className="text-xs text-slate-500 mb-4">Last {chartData.length} samples (newest on the right)</p>
                  <div style={{ width: "100%", height: 320 }}>
                    <ResponsiveContainer>
                      <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                        <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#6B7280" }} />
                        <YAxis domain={[0, "auto"]} tick={{ fontSize: 10, fill: "#6B7280" }} unit=" W" />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="power"
                          stroke="#E97451"
                          strokeWidth={2.5}
                          dot={{ r: 3, stroke: "#E97451", strokeWidth: 2, fill: "#fff" }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="text-base font-bold text-slate-900">Detailed Readings</h3>
                    <span className="text-xs text-slate-500">{generationData.length} entries</span>
                  </div>
                  <div className="overflow-y-auto max-h-[500px]">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 sticky top-0">
                        <tr>
                          <th className="text-left px-5 py-3 font-semibold">Time</th>
                          <th className="text-right px-5 py-3 font-semibold">Voltage (V)</th>
                          <th className="text-right px-5 py-3 font-semibold">Current (A)</th>
                          <th className="text-right px-5 py-3 font-semibold">Power (W)</th>
                          <th className="text-right px-5 py-3 font-semibold">Temp (°C)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {generationData.map((item, index) => (
                          <tr
                            key={item.id || index}
                            className="border-b border-slate-100 hover:bg-slate-50"
                          >
                            <td className="px-5 py-2.5 text-slate-700 font-mono text-xs">
                              {format(new Date(item.timestamp), "HH:mm:ss")}
                            </td>
                            <td className="px-5 py-2.5 text-right text-slate-700">{parseFloat(item.voltage).toFixed(1)}</td>
                            <td className="px-5 py-2.5 text-right text-slate-700">{parseFloat(item.current).toFixed(2)}</td>
                            <td className="px-5 py-2.5 text-right font-semibold text-orange-600">{parseFloat(item.power).toFixed(0)}</td>
                            <td className="px-5 py-2.5 text-right text-slate-700">{item.temperature ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}

            {tab === "faults" && (
              <section className="bg-white rounded-xl border border-slate-200 p-8">
                {hasFault ? (
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                      <ShieldAlert size={24} className="text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-1">Active fault detected</h3>
                      <p className="text-sm text-slate-500 mb-4">
                        Raw bitmask:{" "}
                        <span className="font-mono font-bold text-red-600">
                          0x{bitmask.toString(16).toUpperCase()}
                        </span>{" "}
                        ({bitmask})
                      </p>
                      <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 font-mono">
                        Bits set: {Array.from({ length: 32 }, (_, i) => (bitmask & (1 << i)) ? i : null).filter((x) => x !== null).join(", ") || "—"}
                      </div>
                      <p className="text-xs text-slate-500 mt-3">
                        Bit-to-fault mapping pending from firmware team.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center py-8">
                    <div className="w-14 h-14 rounded-xl bg-green-50 flex items-center justify-center mb-4">
                      <ShieldCheck size={26} className="text-green-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">No active faults</h3>
                    <p className="text-sm text-slate-500">This inverter is reporting nominal operation.</p>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
