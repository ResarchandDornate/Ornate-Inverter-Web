"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
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
import { computeStatus, formatLastSeen } from "@/lib/inverterStatus";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "generation", label: "Generation" },
  { id: "faults", label: "Faults" },
];

const CHART_RANGES = [
  { id: "10m",    label: "Last 10 min",   source: "raw", windowMin: 10, bucketSec: 0 },
  { id: "1h",     label: "Last 1 hour",   source: "raw", windowMin: 60, bucketSec: 60 },
  { id: "1d",     label: "Last 24 hours", source: "pg",  windowHr: 24,  bucketKind: "hour" },
  { id: "1w",     label: "Last week",     source: "pg",  windowDay: 7,  bucketKind: "day"  },
  { id: "1mo",    label: "Last month",    source: "pg",  windowDay: 30, bucketKind: "day"  },
  { id: "custom", label: "Custom date",   source: "pg",                 bucketKind: "hour" },
];

export default function InverterDetailsPage() {
  const { id: inverterId } = useParams();
  const [tab, setTab] = useState("overview");
  const [chartRange, setChartRange] = useState("10m");
  const [customDate, setCustomDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );

  // Memoize so the queryKey stays stable across renders (only changes at midnight).
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Fetch ALL of today's readings (date-filtered).
  const {
    data: inverterHistory,
    isLoading,
    refetch: onRefresh,
    isRefetching,
  } = useQuery({
    queryKey: [...QUERY_KEYS.INVERTER_DETAILS(inverterId), todayStr],
    queryFn: async () => {
      // The backend caps each response at ~100 records regardless of limit=.
      // We paginate through up to MAX_PAGES pages sequentially (gentle on
      // the rate limit) to get all of today's readings.
      const MAX_PAGES = 20; // 20 × 100 = up to 2000 records (~2.8h of 5s samples)
      const allData = [];
      const baseUrl =
        `/inverter/inverter-data/?inverter=${inverterId}` +
        `&start=${todayStr}T00:00:00&ordering=-timestamp`;

      for (let page = 1; page <= MAX_PAGES; page++) {
        const url = page === 1 ? baseUrl : `${baseUrl}&page=${page}`;
        let response;
        try {
          response = await getData(url);
        } catch {
          break; // 404 once we run out of pages
        }
        const results = response?.results || [];
        if (results.length === 0) break;
        allData.push(...results);
        if (!response.next) break;
      }

      allData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return allData;
    },
    enabled: !!inverterId,
    // Fast polling so the chart + Detailed Readings table feel live.
    refetchInterval: 15000,
    staleTime: 12000,
  });

  // Real daily energy from backend hourly aggregates (accurate; survives
  // missed polls/page reloads instead of being a client-side integration).
  const { data: hourlyEnergyData } = useQuery({
    queryKey: ["inverterDailyEnergy", inverterId, todayStr],
    queryFn: () =>
      getData(
        `/inverter/power-generation/?inverter=${inverterId}&date=${todayStr}&ordering=measurement_time`
      ),
    enabled: !!inverterId,
    refetchInterval: 30000,
    staleTime: 25000,
  });

  // Status endpoint /grid_status/ gives us authoritative status + last_seen.
  const { data: gridStatusData } = useQuery({
    queryKey: ["inverterGridStatus", inverterId],
    queryFn: () => getData(`/inverter/inverters/${inverterId}/grid_status/`),
    enabled: !!inverterId,
    refetchInterval: 10000,
    staleTime: 8000,
  });

  const generationData = inverterHistory || [];
  const latestReading = generationData[0] || {};
  // Merge status endpoint with latest telemetry record for one unified shape.
  const merged = {
    ...latestReading,
    status: gridStatusData?.status,
    is_online: gridStatusData?.is_online,
    last_seen: gridStatusData?.last_seen,
    grid_connected: gridStatusData?.grid_connected ?? latestReading.grid_connected,
  };
  const gridConnected = merged.grid_connected ?? null;
  // Use the same priority ordering as computeStatus(): trust the explicit
  // `status` field first (it reflects the backend's "offline after 10+ min
  // of zero power" rule), then is_online, then grid_connected. This makes
  // every per-card display flip together — Voltage, Current, Grid Status,
  // VPV/IPV/Delta all collapse to 0 / N/A / OFF when offline is true.
  const offline =
    merged.status === "offline" ||
    merged.is_online === false ||
    gridConnected === false;
  const bitmask = Number(latestReading.fault_bitmask ?? 0);
  const hasFault = bitmask > 0;
  const status = computeStatus(merged);

  const currentRange = CHART_RANGES.find((r) => r.id === chartRange) || CHART_RANGES[0];

  // Build the backend filter string. The API now accepts these preset params
  // directly so we no longer have to compute ISO datetimes client-side:
  //   range=1d|1w|1m|3m|6m|1y   — "last N period from now"
  //   date=YYYY-MM-DD            — single calendar day (for custom-date picker)
  const pgQueryFilter = useMemo(() => {
    if (currentRange.source !== "pg") return null;
    switch (chartRange) {
      case "1d":     return "range=1d";
      case "1w":     return "range=1w";
      case "1mo":    return "range=1m";
      case "custom": return `date=${customDate}`;
      default:       return null;
    }
  }, [chartRange, customDate, currentRange]);

  const { data: chartPgData, isLoading: chartPgLoading } = useQuery({
    queryKey: ["chartPg", inverterId, chartRange, customDate],
    queryFn: () =>
      getData(
        `/inverter/power-generation/?inverter=${inverterId}` +
          `&${pgQueryFilter}` +
          `&ordering=measurement_time&limit=5000`
      ),
    enabled: !!inverterId && !!pgQueryFilter,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  // Build the chart series — aggregation per the spec for each range:
  //  10m → raw 5s samples, 1h → per-minute averages,
  //  1d/1w/custom → per hour, 1mo → per day (aggregated from hourly buckets).
  const chartData = useMemo(() => {
    if (currentRange.source === "raw") {
      const cutoff = Date.now() - currentRange.windowMin * 60 * 1000;
      const filtered = generationData
        .filter((d) => new Date(d.timestamp).getTime() >= cutoff)
        .map((d) => ({
          t: new Date(d.timestamp).getTime(),
          power: parseFloat(d.power_out || 0),
        }))
        .sort((a, b) => a.t - b.t);

      if (!currentRange.bucketSec) {
        // 10m view — raw samples, every reading is its own point.
        return filtered.map((d) => ({
          t: d.t,
          time: format(new Date(d.t), "HH:mm:ss"),
          power: d.power,
        }));
      }
      // 1h view — group into 1-minute buckets and average power.
      const ms = currentRange.bucketSec * 1000;
      const buckets = new Map();
      filtered.forEach(({ t, power }) => {
        const key = Math.floor(t / ms) * ms;
        if (!buckets.has(key)) buckets.set(key, { t: key, sum: 0, count: 0 });
        const b = buckets.get(key);
        b.sum += power;
        b.count += 1;
      });
      return [...buckets.values()]
        .sort((a, b) => a.t - b.t)
        .map((b) => ({
          t: b.t,
          time: format(new Date(b.t), "HH:mm"),
          power: b.sum / b.count,
        }));
    }

    // Source: /power-generation/ (already hourly buckets server-side).
    const records = chartPgData?.results || [];
    if (currentRange.bucketKind === "hour") {
      // 1d / 1w / custom — each hourly bucket is its own chart point.
      return records
        .map((r) => ({
          t: new Date(r.measurement_time).getTime(),
          time: format(new Date(r.measurement_time), "dd/MM HH:mm"),
          power: parseFloat(r.avg_power || 0),
          energy: parseFloat(r.energy_generated || 0),
        }))
        .sort((a, b) => a.t - b.t);
    }
    // 1mo — aggregate the hourly buckets into per-day chart points.
    const byDay = new Map();
    records.forEach((r) => {
      const d = new Date(r.measurement_time);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      if (!byDay.has(key))
        byDay.set(key, { t: dayStart.getTime(), powerSum: 0, count: 0, energy: 0 });
      const b = byDay.get(key);
      b.powerSum += parseFloat(r.avg_power || 0);
      b.count += 1;
      b.energy += parseFloat(r.energy_generated || 0);
    });
    return [...byDay.values()]
      .sort((a, b) => a.t - b.t)
      .map((b) => ({
        t: b.t,
        time: format(new Date(b.t), "dd MMM"),
        power: b.count ? b.powerSum / b.count : 0,
        energy: b.energy,
      }));
  }, [currentRange, generationData, chartPgData]);

  const yUnit = currentRange.source === "pg" ? " W avg" : " W";
  const needsScroll = chartData.length > 80;
  const scrollWidth = needsScroll ? Math.max(800, chartData.length * 14) : 0;

  // Sum hourly buckets returned by /power-generation/ for today.
  const dailyEnergyKwh = useMemo(() => {
    const buckets = hourlyEnergyData?.results || [];
    return buckets.reduce(
      (sum, b) => sum + parseFloat(b.energy_generated || 0),
      0
    );
  }, [hourlyEnergyData]);

  // Peak hourly avg_power from backend (more meaningful than instantaneous peak).
  const peakHourPowerW = useMemo(() => {
    const buckets = hourlyEnergyData?.results || [];
    return buckets.reduce(
      (max, b) => Math.max(max, parseFloat(b.avg_power || 0)),
      0
    );
  }, [hourlyEnergyData]);

  const avgPowerW = useMemo(() => {
    if (!generationData.length) return 0;
    return generationData.reduce((s, d) => s + parseFloat(d.power_out || 0), 0) / generationData.length;
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
                {offline ? "0" : parseFloat(latestReading.power_out || 0).toFixed(0)} <span className="text-sm text-slate-400 font-normal">W output</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-1">
                Last seen {formatLastSeen(gridStatusData?.last_seen)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={status} />
            {/* Auto-update indicator — pulses while a refetch is in flight,
                otherwise just shows that the page is live-updating. */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-green-100 bg-green-50">
              <span
                className={`w-1.5 h-1.5 rounded-full bg-green-500 ${
                  isRefetching ? "animate-ping" : "animate-pulse"
                }`}
              />
              <span className="text-[10px] font-bold uppercase tracking-widest text-green-700">
                {isRefetching ? "Updating" : "Live"}
              </span>
            </div>
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
                  value={offline ? "OFF" : gridConnected === null ? "..." : gridConnected ? "ON" : "OFF"}
                  unit=""
                  icon={offline || !gridConnected ? AlertCircle : Save}
                  color={offline || !gridConnected ? "#EF4444" : "#10B981"}
                  bgClass={offline || !gridConnected ? "bg-red-100" : "bg-green-100"}
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
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Peak Hour</p>
                    <p className="text-2xl font-bold text-orange-600">{peakHourPowerW.toFixed(0)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">W hourly avg max</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Avg Power</p>
                    <p className="text-2xl font-bold text-slate-700">{avgPowerW.toFixed(0)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">W average · {generationData.length} readings</p>
                  </div>
                </section>

                <section className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
                  {/* Header: title on the left, range tabs on the top-right */}
                  <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Generation Trend</h3>
                      <p className="text-xs text-slate-500">
                        {chartData.length} data points ·{" "}
                        {currentRange.source === "raw" && !currentRange.bucketSec
                          ? "raw telemetry (5-second precision)"
                          : currentRange.source === "raw"
                          ? "per-minute average"
                          : currentRange.bucketKind === "day"
                          ? "per-day average"
                          : "per-hour average from backend"}
                      </p>
                      {chartRange === "custom" && (
                        <input
                          type="date"
                          value={customDate}
                          max={todayStr}
                          onChange={(e) => setCustomDate(e.target.value)}
                          className="mt-2 border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white hover:border-orange-400 outline-none"
                        />
                      )}
                    </div>
                    <div className="flex gap-1 bg-slate-100 rounded-lg p-1 flex-wrap">
                      {CHART_RANGES.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => setChartRange(r.id)}
                          className={`text-xs px-3 py-1.5 rounded-md font-semibold whitespace-nowrap ${
                            chartRange === r.id
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chart — horizontally scrollable only when there's too much data for one view */}
                  {chartPgLoading ? (
                    <div className="h-72 flex items-center justify-center text-sm text-slate-400">
                      <RefreshCw size={20} className="animate-spin mr-2" /> Loading…
                    </div>
                  ) : chartData.length === 0 ? (
                    <div className="h-72 flex items-center justify-center text-sm text-slate-400">
                      No data in this range yet.
                    </div>
                  ) : needsScroll ? (
                    // Two-chart pattern: sticky Y-axis on the left, only the
                    // plot area scrolls. The Y-axis chart is layered above
                    // the scroll container so its labels never move.
                    <div className="relative" style={{ height: 420 }}>
                      {/* Sticky Y-axis layer */}
                      <div
                        className="absolute top-0 left-0 z-10 pointer-events-none bg-white"
                        style={{ width: 70, height: 420 }}
                      >
                        <BarChart
                          width={70}
                          height={420}
                          data={chartData}
                          margin={{ top: 10, right: 0, left: 5, bottom: 30 }}
                        >
                          <YAxis
                            domain={[0, "auto"]}
                            tick={{ fontSize: 10, fill: "#6B7280" }}
                            unit={yUnit}
                          />
                          <Bar dataKey="power" fill="transparent" />
                        </BarChart>
                      </div>

                      {/* Scrollable plot area — Y-axis is rendered invisibly so
                          the data chart's left margin matches the sticky Y-axis. */}
                      <div className="overflow-x-auto scrollbar-thin" style={{ height: 420 }}>
                        <BarChart
                          width={scrollWidth}
                          height={420}
                          data={chartData}
                          margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                          <XAxis
                            dataKey="time"
                            tick={{ fontSize: 10, fill: "#6B7280" }}
                            interval={Math.max(0, Math.floor(chartData.length / 30))}
                          />
                          <YAxis
                            domain={[0, "auto"]}
                            tick={false}
                            axisLine={false}
                            width={70}
                          />
                          <Tooltip
                            formatter={(v) => [`${Number(v).toFixed(0)} W`, "Power"]}
                            labelFormatter={(_, payload) => {
                              const t = payload?.[0]?.payload?.t;
                              if (!t) return "";
                              if (currentRange.bucketKind === "day")
                                return format(new Date(t), "EEE, dd MMM yyyy");
                              if (currentRange.bucketKind === "hour")
                                return format(new Date(t), "EEE, dd MMM HH:mm");
                              return format(new Date(t), "EEE, dd MMM HH:mm:ss");
                            }}
                            contentStyle={{ fontSize: 12, borderRadius: 8 }}
                          />
                          <Bar
                            dataKey="power"
                            fill="#E97451"
                            radius={[3, 3, 0, 0]}
                            maxBarSize={20}
                          />
                        </BarChart>
                      </div>
                    </div>
                  ) : (
                    <div style={{ width: "100%", height: 420 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                          <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#6B7280" }} minTickGap={20} />
                          <YAxis domain={[0, "auto"]} tick={{ fontSize: 10, fill: "#6B7280" }} unit={yUnit} width={70} />
                          <Tooltip
                            formatter={(v) => [`${Number(v).toFixed(0)} W`, "Power"]}
                            labelFormatter={(_, payload) => {
                              const t = payload?.[0]?.payload?.t;
                              if (!t) return "";
                              if (currentRange.bucketKind === "day")
                                return format(new Date(t), "EEE, dd MMM yyyy");
                              if (currentRange.bucketKind === "hour")
                                return format(new Date(t), "EEE, dd MMM HH:mm");
                              return format(new Date(t), "EEE, dd MMM HH:mm:ss");
                            }}
                            contentStyle={{ fontSize: 12, borderRadius: 8 }}
                          />
                          <Bar
                            dataKey="power"
                            fill="#E97451"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={28}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
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
                          <th className="text-center px-5 py-3 font-semibold">Time</th>
                          <th className="text-center px-5 py-3 font-semibold">Voltage (V)</th>
                          <th className="text-center px-5 py-3 font-semibold">Current (A)</th>
                          <th className="text-center px-5 py-3 font-semibold">Power Out (W)</th>
                          <th className="text-center px-5 py-3 font-semibold">Temp (°C)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {generationData.map((item, index) => (
                          <tr
                            key={item.id || index}
                            className="border-b border-slate-100 hover:bg-slate-50"
                          >
                            <td className="px-5 py-2.5 text-center text-slate-700 font-mono text-xs">
                              {format(new Date(item.timestamp), "HH:mm:ss")}
                            </td>
                            <td className="px-5 py-2.5 text-center text-slate-700">{parseFloat(item.voltage).toFixed(1)}</td>
                            <td className="px-5 py-2.5 text-center text-slate-700">{parseFloat(item.current).toFixed(2)}</td>
                            <td className="px-5 py-2.5 text-center font-semibold text-orange-600">{parseFloat(item.power_out).toFixed(0)}</td>
                            <td className="px-5 py-2.5 text-center text-slate-700">{item.temperature ?? "—"}</td>
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
