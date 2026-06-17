"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
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
  ArrowLeft,
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
import { isAuthenticated } from "@/lib/auth";
import { QUERY_KEYS } from "@/lib/queryKeys";
import StatusCard from "@/components/StatusCard";

export default function InverterDetailsPage() {
  const router = useRouter();
  const { id: inverterId } = useParams();

  useEffect(() => {
    if (!isAuthenticated()) router.replace("/login");
  }, [router]);

  const {
    data: inverterHistory,
    isLoading: loading,
    refetch: onRefresh,
    isRefetching,
  } = useQuery({
    queryKey: QUERY_KEYS.INVERTER_DETAILS(inverterId),
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const response = await getData(
        `/inverter/inverter-data/?date=${today}&inverter=${inverterId}`
      );
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

  const chartData = useMemo(() => {
    if (!generationData.length) return [];
    return generationData
      .slice(0, 24)
      .reverse()
      .map((d) => ({
        time: format(new Date(d.timestamp), "HH:mm:ss"),
        power: parseFloat(d.power || 0),
      }));
  }, [generationData]);

  const bitmask = Number(latestReading.fault_bitmask ?? 0);
  const hasFault = bitmask > 0;
  const offline = gridConnected === false;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center min-w-0 flex-1 mr-3">
            <button
              onClick={() => router.back()}
              className="mr-3 p-2 -ml-2 rounded-full hover:bg-slate-100"
            >
              <ArrowLeft size={22} className="text-slate-700" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-900 truncate">
                Inverter #{inverterId}
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full ${
                    gridConnected === null
                      ? "bg-slate-300"
                      : gridConnected
                      ? "bg-green-500"
                      : "bg-red-500"
                  }`}
                />
                <span>ID: {inverterId}</span>
                <span>•</span>
                <span>
                  {gridConnected === null
                    ? "Loading..."
                    : gridConnected
                    ? "Connected"
                    : "Offline"}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onRefresh()}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold rounded-full border border-slate-200 hover:border-orange-300 hover:text-orange-500"
          >
            <RefreshCw size={14} className={isRefetching ? "animate-spin" : ""} />
            {gridConnected ? "LIVE" : "OFFLINE"}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-6">
        {loading && !generationData.length ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw size={32} className="animate-spin text-orange-500" />
            <p className="text-sm text-slate-500 mt-3">Loading inverter data…</p>
          </div>
        ) : generationData.length > 0 ? (
          <>
            {/* Real-time Power Gauge */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-lg font-black text-slate-900 tracking-tight">
                    Real-time
                  </p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                    Active Output
                  </p>
                </div>
                <div
                  className={`px-3 py-1 rounded-full border flex items-center gap-2 ${
                    offline
                      ? "bg-red-50 border-red-100"
                      : "bg-green-50 border-green-100"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      offline ? "bg-red-500" : "bg-green-500"
                    } animate-pulse`}
                  />
                  <span
                    className={`text-[9px] font-black uppercase tracking-widest ${
                      offline ? "text-red-700" : "text-green-700"
                    }`}
                  >
                    {offline ? "Offline" : "Online"}
                  </span>
                </div>
              </div>
              <Gauge
                value={offline ? 0 : parseFloat(latestReading.power || 0)}
                max={3000}
              />
            </section>

            {/* Secondary Metrics */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
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
                value={
                  gridConnected === null ? "..." : gridConnected ? "ON" : "OFF"
                }
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

            {/* Chart */}
            <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-6">
              <div className="flex justify-between items-center mb-4 px-2">
                <h2 className="text-base font-bold text-slate-800">
                  Generation Trend (10s)
                </h2>
                <span className="bg-slate-100 px-2 py-1 rounded-md text-xs text-slate-500">
                  Live Samples
                </span>
              </div>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#6B7280" }} />
                    <YAxis
                      domain={[0, "auto"]}
                      tick={{ fontSize: 10, fill: "#6B7280" }}
                      unit=" W"
                    />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="power"
                      stroke="#E97451"
                      strokeWidth={3}
                      dot={{ r: 3, stroke: "#E97451", strokeWidth: 2, fill: "#fff" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Detailed Readings Table */}
            <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-6">
              <h2 className="text-base font-bold text-slate-800 mb-4 px-2">
                Detailed Readings
              </h2>
              <div className="overflow-auto max-h-[400px]">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 text-slate-500 font-bold">
                    <tr>
                      <th className="text-center py-2 text-xs">Time</th>
                      <th className="text-center py-2 text-xs">Voltage (V)</th>
                      <th className="text-center py-2 text-xs">Current (A)</th>
                      <th className="text-center py-2 text-xs">Power (W)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generationData.map((item, index) => (
                      <tr
                        key={item.id || index}
                        className={index % 2 === 0 ? "bg-slate-50/50" : "bg-white"}
                      >
                        <td className="text-center py-2.5 text-xs text-slate-700">
                          {format(new Date(item.timestamp), "HH:mm:ss")}
                        </td>
                        <td className="text-center py-2.5 text-xs">
                          {parseFloat(item.voltage).toFixed(1)}
                        </td>
                        <td className="text-center py-2.5 text-xs">
                          {parseFloat(item.current).toFixed(2)}
                        </td>
                        <td className="text-center py-2.5 text-xs font-semibold text-orange-600">
                          {parseFloat(item.power).toFixed(0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="bg-slate-100 p-6 rounded-full mb-4">
              <Activity size={36} className="text-slate-400" />
            </div>
            <h3 className="text-slate-800 font-bold text-lg mb-2">No Data Available</h3>
            <p className="text-slate-500 text-sm leading-5 max-w-sm">
              We couldn&apos;t find any recent data for this inverter. Please check
              if the device is online.
            </p>
            <button
              onClick={() => onRefresh()}
              className="mt-6 bg-slate-800 hover:bg-slate-700 text-white font-semibold px-6 py-3 rounded-xl"
            >
              Retry Connection
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

// Compact "speedometer" gauge (CSS + SVG)
function Gauge({ value, max = 3000 }) {
  const pct = Math.min(Math.max(value / max, 0), 1);
  const angle = 180 * pct; // 0..180 degrees on a half-circle
  const radius = 90;
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;

  // Arc path background
  const arc = (startA, endA) => {
    const sx = cx + radius * Math.cos((Math.PI * (180 - startA)) / 180);
    const sy = cy - radius * Math.sin((Math.PI * (180 - startA)) / 180);
    const ex = cx + radius * Math.cos((Math.PI * (180 - endA)) / 180);
    const ey = cy - radius * Math.sin((Math.PI * (180 - endA)) / 180);
    const largeArc = endA - startA > 180 ? 1 : 0;
    return `M ${sx} ${sy} A ${radius} ${radius} 0 ${largeArc} 1 ${ex} ${ey}`;
  };

  return (
    <div className="flex flex-col items-center py-4">
      <svg width={size} height={size / 2 + 30} viewBox={`0 0 ${size} ${size / 2 + 30}`}>
        <path d={arc(0, 180)} stroke="#E5E7EB" strokeWidth="14" fill="none" strokeLinecap="round" />
        <path
          d={arc(0, Math.max(angle, 1))}
          stroke="#E97451"
          strokeWidth="14"
          fill="none"
          strokeLinecap="round"
        />
        <text x={cx} y={cy} textAnchor="middle" className="fill-slate-900 font-black" style={{ fontSize: 32 }}>
          {value.toFixed(0)}
        </text>
        <text x={cx} y={cy + 18} textAnchor="middle" className="fill-slate-400" style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em" }}>
          POWER GENERATION (W)
        </text>
      </svg>
      <div className="flex justify-between w-full max-w-[260px] -mt-6 px-2 text-xs text-slate-500 font-semibold">
        <span>0 W</span>
        <span>{max} W</span>
      </div>
    </div>
  );
}
