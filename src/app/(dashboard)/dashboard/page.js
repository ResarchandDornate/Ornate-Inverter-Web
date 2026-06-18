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
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { getData } from "@/lib/api";
import Topbar from "@/components/Topbar";
import KpiCard from "@/components/KpiCard";
import StatusBadge from "@/components/StatusBadge";
import { useLiveInverters } from "@/hooks/useLiveInverters";
import { computeStatus } from "@/lib/inverterStatus";

const MAX_LIVE_SAMPLES = 30; // ~5 min @ 10s polling

const RANGES = [
  { id: "live", label: "Live" },
  { id: "1h",   label: "Last 1 hour" },
  { id: "24h",  label: "Last 24h" },
  { id: "7d",   label: "Last 7 days" },
  { id: "30d",  label: "Last 30 days" },
];

// Returns a naive ISO 8601 datetime string `YYYY-MM-DDTHH:mm:ss` (no ms, no Z)
// because the backend's documented filter format is the naive form. The
// timezone-suffixed form (`...Z`) was returning empty results.
function getStartIso(range) {
  const now = Date.now();
  const map = {
    "1h":  60 * 60,
    "24h": 24 * 3600,
    "7d":  7 * 86400,
    "30d": 30 * 86400,
  };
  const secs = map[range];
  if (!secs) return null;
  const d = new Date(now - secs * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function DashboardPage() {
  const { data: inverters = [], dataUpdatedAt } = useLiveInverters();
  const [liveSeries, setLiveSeries] = useState([]);
  const [seeded, setSeeded] = useState(false);
  const [range, setRange] = useState("live");

  // Pre-seed the Live chart with the last 5 minutes of real history so the
  // chart appears populated immediately instead of waiting for 30 polls.
  const { data: historicalSeed } = useQuery({
    queryKey: ["liveChartSeed"],
    queryFn: async () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const res = await getData(
        `/inverter/inverter-data/?start=${fiveMinAgo}&ordering=timestamp&limit=500`
      );
      return res?.results || [];
    },
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (seeded || !historicalSeed) return;
    if (historicalSeed.length === 0) {
      setSeeded(true);
      return;
    }
    // Bucket records into 10-second windows, summing power_out across inverters
    const buckets = new Map();
    historicalSeed.forEach((r) => {
      const t = new Date(r.timestamp).getTime();
      const bucketKey = Math.floor(t / 10000) * 10000;
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, {
          time: new Date(bucketKey).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          }),
          power: 0,
          online: 0,
        });
      }
      const b = buckets.get(bucketKey);
      b.power += parseFloat(r.power_out || 0);
      if (r.grid_connected) b.online += 1;
    });
    const sorted = [...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, b]) => b)
      .slice(-MAX_LIVE_SAMPLES);
    setLiveSeries(sorted);
    setSeeded(true);
  }, [historicalSeed, seeded]);

  // Treat an inverter as "actually reporting" only when the backend says so.
  // Offline inverters keep their last cached power_out / temperature values,
  // but those are stale — including them in the fleet aggregates would lie
  // (e.g. KPI shows 1479 W when 0/2 inverters are actually online).
  const isReporting = (i) =>
    i.status === "online" || i.status === "idle" || i.is_online === true;

  const totalInverters = inverters.length;
  const onlineCount = inverters.filter((i) => i.is_online === true || i.status === "online").length;
  const totalPower = inverters.reduce(
    (s, i) => (isReporting(i) ? s + Number(i.power_out ?? 0) : s),
    0
  );
  const faultCount = inverters.filter((i) => Number(i.fault_bitmask ?? 0) > 0).length;
  const avgTemp = useMemo(() => {
    // Temperature is sensor data — once the inverter is offline the value
    // is stale, so it shouldn't pull the fleet average around.
    const valid = inverters.filter((i) => isReporting(i) && i.temperature != null);
    if (!valid.length) return 0;
    return valid.reduce((s, i) => s + Number(i.temperature), 0) / valid.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Today's total energy across all inverters — for the KPI card.
  // Memoize so the queryKey stays stable across renders (only changes at midnight).
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const { data: todayPgData } = useQuery({
    queryKey: ["dashboardTodayEnergy", todayStr],
    queryFn: () =>
      getData(
        `/inverter/power-generation/?start=${todayStr}T00:00:00&end=${todayStr}T23:59:59&ordering=measurement_time`
      ),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });
  const todayEnergyTotal = (todayPgData?.results || []).reduce(
    (s, r) => s + parseFloat(r.energy_generated || 0),
    0
  );

  // Historical aggregates from /power-generation/ (for the chart range tabs).
  //
  // CRITICAL: getStartIso() calls Date.now() — if called inline each render
  // the seconds component changes the queryKey on every re-render, which makes
  // TanStack Query treat it as a fresh query and re-fire the request. That
  // loop is exactly what was hammering the backend. Memoize on `range` only.
  const startIso = useMemo(() => getStartIso(range), [range]);

  // Historical aggregates from /power-generation/ — used by 24h / 7d / 30d.
  const { data: pgData, isLoading: pgLoading, error: pgError } = useQuery({
    queryKey: ["powerGenerationRange", range, startIso],
    queryFn: () =>
      getData(
        `/inverter/power-generation/?start=${startIso}&ordering=measurement_time&limit=5000`
      ),
    enabled: (range === "24h" || range === "7d" || range === "30d") && !!startIso,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  // Raw telemetry for the last hour — needed for the 1h tab because the
  // /power-generation/ endpoint only stores HOURLY aggregates. We paginate
  // through the last hour of /inverter-data/ across the whole fleet, then
  // bucket client-side into 10-minute groups.
  const { data: oneHourData, isLoading: oneHourLoading, error: oneHourError } = useQuery({
    queryKey: ["dashboard1hRaw", startIso],
    queryFn: async () => {
      const allData = [];
      const baseUrl = `/inverter/inverter-data/?start=${startIso}&ordering=-timestamp`;
      const MAX_PAGES = 12; // up to 1200 records — plenty for 1h × small fleet
      for (let page = 1; page <= MAX_PAGES; page++) {
        const url = page === 1 ? baseUrl : `${baseUrl}&page=${page}`;
        let response;
        try {
          response = await getData(url);
        } catch {
          break;
        }
        const results = response?.results || [];
        if (results.length === 0) break;
        allData.push(...results);
        if (!response.next) break;
      }
      return allData;
    },
    enabled: range === "1h" && !!startIso,
    refetchInterval: 60 * 1000,
    staleTime: 50 * 1000,
  });

  const histLoading = range === "1h" ? oneHourLoading : pgLoading;
  const histError = range === "1h" ? oneHourError : pgError;

  const historicalChart = useMemo(() => {
    if (range === "live") return [];

    if (range === "1h") {
      // Bucket raw telemetry into 10-minute groups. For each bucket we
      // average power_out per inverter, then sum across the fleet.
      const TEN_MIN_MS = 10 * 60 * 1000;
      const buckets = new Map();
      (oneHourData || []).forEach((r) => {
        const t = new Date(r.timestamp).getTime();
        const bucketStart = Math.floor(t / TEN_MIN_MS) * TEN_MIN_MS;
        if (!buckets.has(bucketStart)) {
          buckets.set(bucketStart, { t: bucketStart, perInverter: new Map() });
        }
        const bucket = buckets.get(bucketStart);
        const invId = r.inverter;
        if (!bucket.perInverter.has(invId)) {
          bucket.perInverter.set(invId, { sum: 0, count: 0 });
        }
        const inv = bucket.perInverter.get(invId);
        inv.sum += parseFloat(r.power_out || 0);
        inv.count += 1;
      });
      return [...buckets.values()]
        .sort((a, b) => a.t - b.t)
        .map((bucket) => {
          let fleetAvgPower = 0;
          bucket.perInverter.forEach((inv) => {
            fleetAvgPower += inv.count > 0 ? inv.sum / inv.count : 0;
          });
          const d = new Date(bucket.t);
          const pad = (n) => String(n).padStart(2, "0");
          return {
            sortKey: bucket.t,
            label: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
            avgPower: fleetAvgPower,
            energy: 0, // not relevant for 1h bar — show power as the bar height
          };
        });
    }

    // 24h / 7d / 30d — group /power-generation/ records by hour or day.
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
  }, [pgData, oneHourData, range]);

  const rangeTotalEnergy = historicalChart.reduce((s, b) => s + (b.energy || 0), 0);
  const rangePeakPower = historicalChart.reduce((m, b) => Math.max(m, b.avgPower || 0), 0);
  const isPowerView = range === "1h"; // 1h uses power bars (W), others use energy bars (kWh)

  return (
    <>
      <Topbar title="Dashboard" breadcrumbs={["Overview", "Dashboard"]} />
      <main className="flex-1 px-6 py-6 max-w-[1600px] w-full">
        {/* KPI Row */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
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
            label="Today's Energy"
            value={todayEnergyTotal.toFixed(2)}
            unit="kWh"
            icon={BatteryCharging}
            accent="indigo"
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

            {/* Chart — bar charts on every tab. 7d (168 bars) scrolls with
                a sticky Y-axis; everything else fits the card via ResponsiveContainer. */}
            <div style={{ width: "100%", height: 280 }}>
              {range === "live" ? (
                !seeded || liveSeries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-sm text-slate-400">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent mb-3" />
                    {seeded ? "Waiting for first sample…" : "Loading recent history…"}
                  </div>
                ) : (
                  <ResponsiveContainer>
                    <BarChart data={liveSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                      <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#6B7280" }} minTickGap={30} />
                      <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} unit=" W" domain={[0, "auto"]} width={70} />
                      <Tooltip
                        formatter={(v) => [`${Number(v).toFixed(0)} W`, "Power"]}
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      />
                      <Bar dataKey="power" name="Power" radius={[4, 4, 0, 0]} maxBarSize={18}>
                        {liveSeries.map((_, i) => (
                          <Cell key={i} fill="#E97451" opacity={0.55 + (i / liveSeries.length) * 0.45} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )
              ) : histLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-sm text-slate-400">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent mb-3" />
                  Loading aggregates…
                </div>
              ) : histError ? (
                <div className="flex flex-col items-center justify-center h-full text-sm text-red-500 px-6 text-center">
                  <AlertTriangle size={20} className="mb-2" />
                  <p className="font-semibold">Couldn&apos;t load aggregates</p>
                  <p className="text-xs text-slate-500 mt-1">{histError.message}</p>
                </div>
              ) : historicalChart.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-slate-400">
                  No data in this range yet.
                </div>
              ) : range === "7d" ? (
                // Sticky Y-axis + scrollable plot area for the wide 7-day view.
                <div className="relative" style={{ height: 280 }}>
                  {/* Sticky Y-axis layer */}
                  <div
                    className="absolute top-0 left-0 z-10 pointer-events-none bg-white"
                    style={{ width: 70, height: 280 }}
                  >
                    <BarChart
                      width={70}
                      height={280}
                      data={historicalChart}
                      margin={{ top: 10, right: 0, left: 5, bottom: 30 }}
                    >
                      <YAxis
                        domain={[0, "auto"]}
                        tick={{ fontSize: 11, fill: "#6B7280" }}
                        unit=" kWh"
                      />
                      <Bar dataKey="energy" fill="transparent" />
                    </BarChart>
                  </div>
                  {/* Scrollable plot — Y-axis hidden but space reserved */}
                  <div className="overflow-x-auto scrollbar-thin" style={{ height: 280 }}>
                    <BarChart
                      width={Math.max(800, historicalChart.length * 14)}
                      height={280}
                      data={historicalChart}
                      margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: "#6B7280" }}
                        interval={Math.max(0, Math.floor(historicalChart.length / 30))}
                      />
                      <YAxis domain={[0, "auto"]} tick={false} axisLine={false} width={70} />
                      <Tooltip
                        formatter={(v) => [`${Number(v).toFixed(3)} kWh`, "Energy"]}
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      />
                      <Bar dataKey="energy" name="energy" radius={[3, 3, 0, 0]} maxBarSize={14}>
                        {historicalChart.map((_, i) => (
                          <Cell key={i} fill="#E97451" opacity={0.6 + (i / historicalChart.length) * 0.4} />
                        ))}
                      </Bar>
                    </BarChart>
                  </div>
                </div>
              ) : (
                // 1h / 24h / 30d — fits within the card; no scroll needed.
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
                      unit={isPowerView ? " W" : " kWh"}
                      width={70}
                    />
                    <Tooltip
                      formatter={(v) =>
                        isPowerView
                          ? [`${Number(v).toFixed(0)} W`, "Avg Power"]
                          : [`${Number(v).toFixed(3)} kWh`, "Energy"]
                      }
                      labelFormatter={(l) =>
                        range === "1h" ? `10-min bucket: ${l}` :
                        range === "24h" ? `Hour: ${l}` : `Day: ${l}`
                      }
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Bar
                      dataKey={isPowerView ? "avgPower" : "energy"}
                      name={isPowerView ? "avgPower" : "energy"}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={range === "1h" ? 48 : 40}
                    >
                      {historicalChart.map((_, i) => (
                        <Cell key={i} fill="#E97451" opacity={0.65 + (i / historicalChart.length) * 0.35} />
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
                  <th className="text-center px-5 py-3 font-semibold">Name</th>
                  <th className="text-center px-5 py-3 font-semibold">Serial</th>
                  <th className="text-center px-5 py-3 font-semibold">Status</th>
                  <th className="text-center px-5 py-3 font-semibold">Power Out</th>
                  <th className="text-center px-5 py-3 font-semibold">Temp</th>
                  <th className="text-center px-5 py-3 font-semibold">Faults</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {inverters.slice(0, 6).map((inv) => {
                  const bitmask = Number(inv.fault_bitmask ?? 0);
                  const status = computeStatus(inv);
                  return (
                    <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                      <td className="px-5 py-3 font-semibold text-slate-900">{inv.name}</td>
                      <td className="px-5 py-3 text-slate-500 font-mono text-xs">{inv.serial_number}</td>
                      <td className="px-5 py-3"><StatusBadge status={status} /></td>
                      <td className="px-5 py-3 text-center text-slate-700">
                        {Number(inv.power_out ?? 0).toFixed(0)} W
                      </td>
                      <td className="px-5 py-3 text-center text-slate-700">
                        {inv.temperature != null ? `${Number(inv.temperature).toFixed(1)} °C` : "—"}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {bitmask > 0 ? (
                          <span className="text-xs font-semibold text-red-600">0x{bitmask.toString(16).toUpperCase()}</span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center">
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
