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
  MapPin,
} from "lucide-react";
import { TrendChart } from "@/components/charts/TrendChart";
import { getData } from "@/lib/api";
import Topbar from "@/components/Topbar";
import KpiCard from "@/components/KpiCard";
import StatusBadge from "@/components/StatusBadge";
import { useScopedInverters } from "@/hooks/useScopedInverters";
import {
  computeStatus,
  hasActiveFault,
  isHwFault,
  isLive,
  parseFaultBitmask,
  formatFaultBitmask,
  formatLocation,
} from "@/lib/inverterStatus";
import WeatherWidget from "@/components/WeatherWidget";
import { useChartType } from "@/hooks/useChartType";

const MAX_LIVE_SAMPLES = 30; // ~5 min @ 10s polling

// Every tab now draws from raw telemetry on a continuous grid, the way the
// inverter detail page does — so the points BETWEEN each hour or day are on
// screen instead of one averaged bucket. Slot widths are sized to land each
// window near ~1,000-1,500 points.
const RANGES = [
  { id: "1h",   label: "Last 1 hour",   windowMin: 60,            slotSec: 300,  withDate: false },
  { id: "24h",  label: "Last 24h",      windowMin: 60 * 24,       slotSec: 60,   withDate: false },
  { id: "7d",   label: "Last 7 days",   windowMin: 60 * 24 * 7,   slotSec: 600,  withDate: true },
  { id: "30d",  label: "Last 30 days",  windowMin: 60 * 24 * 30,  slotSec: 1800, withDate: true },
];

const fmtSlot = (ms) => {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * Fold raw /inverter-data/ rows onto a continuous grid of fixed slots.
 *
 * Inside a slot each inverter's power_out is averaged first — a busy inverter
 * must not outweigh a quiet one merely by reporting more often — and those
 * per-inverter averages are then summed into a fleet figure.
 *
 * Every slot across [start, end] is emitted, including ones with no readings,
 * which come back null. That grid is what keeps the time axis honest: on a
 * categorical axis the readings alone would collapse every gap, so a fleet
 * offline all night would render as one continuous daylight curve.
 *
 * Energy is integrated from the slot's power rather than read off the row —
 * raw telemetry carries power only; /power-generation/ is the endpoint holding
 * pre-aggregated energy.
 */
function fleetSlotSeries(rows, slotMs, start, end, withDate) {
  const buckets = new Map();

  (rows || []).forEach((r) => {
    const t = new Date(r.timestamp).getTime();
    if (!Number.isFinite(t)) return;
    const key = Math.floor(t / slotMs) * slotMs;
    if (!buckets.has(key)) buckets.set(key, new Map());
    const perInverter = buckets.get(key);
    const invId = r.inverter;
    if (!perInverter.has(invId)) perInverter.set(invId, { sum: 0, count: 0 });
    const inv = perInverter.get(invId);
    inv.sum += parseFloat(r.power_out || 0);
    inv.count += 1;
  });

  const pad = (n) => String(n).padStart(2, "0");
  const series = [];
  const firstSlot = Math.floor(start / slotMs) * slotMs;
  const lastSlot = Math.floor(end / slotMs) * slotMs;

  for (let t = firstSlot; t <= lastSlot; t += slotMs) {
    const perInverter = buckets.get(t);
    let fleetPower = null;
    if (perInverter) {
      fleetPower = 0;
      perInverter.forEach((inv) => {
        fleetPower += inv.count > 0 ? inv.sum / inv.count : 0;
      });
    }
    const d = new Date(t);
    const clock = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    series.push({
      sortKey: t,
      label: withDate ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${clock}` : clock,
      avgPower: fleetPower,
      energy: fleetPower == null ? 0 : (fleetPower * (slotMs / 3600000)) / 1000,
    });
  }
  return series;
}

/**
 * Fetch /power-generation/ narrowed to a set of inverters.
 *
 * The endpoint aggregates either the whole fleet or exactly one inverter —
 * there is no multi-inverter filter — so a site scope has to be assembled. When
 * the fleet response tags each row with its inverter, one request is enough and
 * the narrowing happens here. When it does not, fall back to asking per
 * inverter and concatenating, the same shape the detail page already fetches.
 *
 * `ids` of null means the entire fleet, which is the plain single request.
 */
async function fetchPgScoped(query, ids) {
  const fleet = await getData(`/inverter/power-generation/?${query}`);
  const rows = fleet?.results || [];
  if (!ids) return { results: rows };

  if (rows.length && rows[0].inverter != null) {
    const want = new Set(ids.map(String));
    return { results: rows.filter((r) => want.has(String(r.inverter))) };
  }

  const perInverter = await Promise.all(
    ids.map((id) =>
      getData(`/inverter/power-generation/?inverter=${id}&${query}`).catch(() => null)
    )
  );
  return { results: perInverter.flatMap((r) => r?.results || []) };
}

export default function DashboardPage() {
  const { data: inverters = [], dataUpdatedAt, site } = useScopedInverters();

  // A site scope narrows raw telemetry client-side — those rows already carry
  // their inverter id, so no second request is needed for them.
  const scopedIds = useMemo(() => inverters.map((i) => i.id), [inverters]);
  const scopedIdSet = useMemo(() => new Set(scopedIds.map(String)), [scopedIds]);
  const inScope = (rows) =>
    site ? (rows || []).filter((r) => scopedIdSet.has(String(r.inverter))) : rows || [];
  const [liveSeries, setLiveSeries] = useState([]);
  const [seeded, setSeeded] = useState(false);
  const [range, setRange] = useState("1h");
  const [chartType] = useChartType(); // global "bar" | "line" from Settings

  const currentRange = RANGES.find((r) => r.id === range) || RANGES[0];

  // Pre-seed the Live chart with the last 5 minutes of real history so the
  // chart appears populated immediately instead of waiting for 30 polls.
  const { data: historicalSeed } = useQuery({
    queryKey: ["liveChartSeed"],
    queryFn: async () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      // Server-side window (timestamp__gte) + big page — one request with
      // exactly the seed rows, instead of unsupported start/limit params.
      const res = await getData(
        `/inverter/inverter-data/?timestamp__gte=${encodeURIComponent(fiveMinAgo)}&ordering=timestamp&page_size=500`
      );
      return res?.results || [];
    },
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  // Changing site invalidates the accumulated live series — it was summed over
  // a different set of inverters — so drop it and re-seed against the new scope.
  useEffect(() => {
    setLiveSeries([]);
    setSeeded(false);
  }, [site]);

  useEffect(() => {
    if (seeded || !historicalSeed) return;
    const seedRows = inScope(historicalSeed);
    if (seedRows.length === 0) {
      setSeeded(true);
      return;
    }
    // Bucket records into 10-second windows, summing power_out across inverters
    const buckets = new Map();
    seedRows.forEach((r) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historicalSeed, seeded, site, scopedIdSet]);

  // Treat an inverter as "actually reporting" only when the backend says so.
  // Offline inverters keep their last cached power_out / temperature values,
  // but those are stale — including them in the fleet aggregates would lie
  // (e.g. KPI shows 1479 W when 0/2 inverters are actually online).
  // "Recovering" is deliberately NOT reporting for live aggregates: its latest
  // reading is old backlog, so its cached power/temperature would be stale and
  // shouldn't pull the fleet KPIs around.
  const isReporting = (i) =>
    i.status === "online" || i.status === "live" || i.status === "idle" || i.is_online === true;

  const totalInverters = inverters.length;
  // Count "online" the SAME way the per-inverter status badge does
  // (computeStatus === "online"), i.e. reporting recently AND grid-connected.
  // Using is_online alone counts inverters that are reporting but
  // grid-disconnected / producing ~0 W, which disagrees with the badge.
  const onlineCount = inverters.filter((i) => isLive(i)).length;
  const totalPower = inverters.reduce(
    (s, i) => (isReporting(i) ? s + Number(i.power_out ?? 0) : s),
    0
  );
  const faultCount = inverters.filter((i) => hasActiveFault(i)).length;
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
    queryKey: ["dashboardTodayEnergy", todayStr, site, scopedIds.join(",")],
    queryFn: () =>
      fetchPgScoped(
        `date=${todayStr}&ordering=measurement_time`,
        site ? scopedIds : null
      ),
    enabled: !site || scopedIds.length > 0,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });
  const todayEnergyTotal = (todayPgData?.results || []).reduce(
    (s, r) => s + parseFloat(r.energy_generated || 0),
    0
  );

  // Map our internal range ids to the backend's `range=` preset values.
  //   "24h" → 1d        "7d" → 1w        "30d" → 1m
  const pgRangeParam = useMemo(() => {
    if (range === "24h") return "1d";
    if (range === "7d") return "1w";
    if (range === "30d") return "1m";
    return null;
  }, [range]);

  // Historical aggregates from /power-generation/ — used by 24h / 7d / 30d.
  const { data: pgData, isLoading: pgLoading, error: pgError } = useQuery({
    queryKey: ["powerGenerationRange", range, site, scopedIds.join(",")],
    queryFn: () =>
      // page_size (honored server-side) replaces the ignored limit param —
      // without it the 7d/30d charts silently truncated at 100 hourly rows.
      fetchPgScoped(
        `range=${pgRangeParam}&ordering=measurement_time&page_size=5000`,
        site ? scopedIds : null
      ),
    enabled: !!pgRangeParam && (!site || scopedIds.length > 0),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  // The window is pinned once per range so the fetch and the slot grid agree on
  // its edges — recomputing Date.now() in both would leave the grid reaching a
  // moment the fetch never asked for.
  const chartWindow = useMemo(() => {
    const end = Date.now();
    return { start: end - currentRange.windowMin * 60 * 1000, end };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  // Raw telemetry across the whole selected window.
  //
  // /power-generation/ only stores hourly buckets, which is why the 24h/7d/30d
  // tabs used to draw one averaged point per hour or day. Reading the readings
  // themselves puts everything between those hours on screen.
  //
  // Fetched fleet-wide and narrowed to the selected site client-side, so
  // switching sites re-renders from cache instead of re-fetching. The backend
  // exposes `timestamp__gte` but no upper bound, so the window is requested
  // ASCENDING from its start — the first pages are then exactly the window.
  const { data: windowRaw = [], isLoading: rawLoading, error: rawError } = useQuery({
    queryKey: ["dashboardRawWindow", range],
    queryFn: async () => {
      const base =
        `/inverter/inverter-data/?timestamp__gte=` +
        `${encodeURIComponent(new Date(chartWindow.start).toISOString())}` +
        `&ordering=timestamp&page_size=5000`;
      const rows = [];
      const MAX_PAGES = 12; // 60k rows — a ceiling, not a limit met in practice
      for (let page = 1; page <= MAX_PAGES; page++) {
        let res;
        try {
          res = await getData(page === 1 ? base : `${base}&page=${page}`);
        } catch {
          break;
        }
        const results = res?.results || [];
        if (results.length === 0) break;
        rows.push(...results);
        const lastT = new Date(results[results.length - 1].timestamp).getTime();
        if (!res.next || lastT >= chartWindow.end) break;
      }
      return rows;
    },
    // Only the 1h tab is a live view; the longer windows are history.
    refetchInterval: range === "1h" ? 60 * 1000 : false,
    staleTime: range === "1h" ? 50 * 1000 : 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const histLoading = rawLoading;
  const histError = rawError;

  const historicalChart = useMemo(
    () =>
      fleetSlotSeries(
        inScope(windowRaw),
        currentRange.slotSec * 1000,
        chartWindow.start,
        chartWindow.end,
        currentRange.withDate
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [windowRaw, currentRange, chartWindow, site, scopedIdSet]
  );

  // Range energy stays on the backend's pre-aggregated kWh, which is
  // authoritative. The 1h tab has no hourly bucket to read yet, so it falls back
  // to integrating the raw power samples the chart is already drawing.
  const rangeTotalEnergy = useMemo(() => {
    if (pgRangeParam) {
      return (pgData?.results || []).reduce(
        (s, r) => s + parseFloat(r.energy_generated || 0),
        0
      );
    }
    return historicalChart.reduce((s, b) => s + (b.energy || 0), 0);
  }, [pgRangeParam, pgData, historicalChart]);

  const rangePeakPower = historicalChart.reduce((m, b) => Math.max(m, b.avgPower || 0), 0);
  // Every tab now plots raw power, so the axis is kW throughout.
  const chartValueKey = "avgPower";

  // Highest / lowest data points — annotated on the line view.
  const { hiPoint, loPoint } = useMemo(() => {
    if (!historicalChart.length) return { hiPoint: null, loPoint: null };
    let hi = historicalChart[0];
    let lo = historicalChart[0];
    for (const d of historicalChart) {
      if ((d[chartValueKey] || 0) > (hi[chartValueKey] || 0)) hi = d;
      if ((d[chartValueKey] || 0) < (lo[chartValueKey] || 0)) lo = d;
    }
    return { hiPoint: hi, loPoint: lo };
  }, [historicalChart, chartValueKey]);

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
            accent="green"
          />
          <KpiCard
            label="Live Power"
            value={onlineCount === 0 ? "—" : totalPower.toFixed(0)}
            unit={onlineCount === 0 ? "" : "W"}
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
            value={onlineCount === 0 ? "—" : avgTemp.toFixed(1)}
            unit={onlineCount === 0 ? "" : "°C"}
            icon={BatteryCharging}
            accent="blue"
          />
          <KpiCard
            label="Active Faults"
            value={faultCount}
            icon={AlertTriangle}
            accent={faultCount > 0 ? "red" : "green"}
          />
        </section>

        {/* Main grid */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
            {/* Chart header with range tabs */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Historical Generation
                </h2>
                <p className="text-xs text-slate-500">
                  {historicalChart.length} data points · aggregate AC power ·{" "}
                  {currentRange.slotSec < 60
                    ? `${currentRange.slotSec}-second`
                    : `${currentRange.slotSec / 60}-minute`}{" "}
                  resolution · {currentRange.label.toLowerCase()}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Time-range tabs */}
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
            </div>

            {/* Summary strip — totals for the selected range */}
            {historicalChart.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Energy</p>
                  <p className="text-lg font-black text-blue-600">
                    {rangeTotalEnergy.toFixed(2)} <span className="text-xs font-medium text-slate-400">kWh</span>
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Peak Power</p>
                  <p className="text-lg font-black text-orange-600">
                    {(rangePeakPower / 1000).toFixed(2)} <span className="text-xs font-medium text-slate-400">kW</span>
                  </p>
                </div>
              </div>
            )}

            {/* Chart — one hopeCloud-styled trend for every range. Dense ranges
                get a brush instead of the old sticky-Y-axis + scroll workaround. */}
            {histLoading ? (
              <div
                className="flex flex-col items-center justify-center text-sm text-slate-400"
                style={{ height: 480 }}
              >
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent mb-3" />
                Loading aggregates…
              </div>
            ) : histError ? (
              <div
                className="flex flex-col items-center justify-center text-sm text-red-500 px-6 text-center"
                style={{ height: 480 }}
              >
                <AlertTriangle size={20} className="mb-2" />
                <p className="font-semibold">Couldn&apos;t load aggregates</p>
                <p className="text-xs text-slate-500 mt-1">{histError.message}</p>
              </div>
            ) : (
              <TrendChart
                data={historicalChart}
                xKey="label"
                height={480}
                unitLeft="kW"
                brush={historicalChart.length > 40}
                xAngle={range === "30d" ? -30 : 0}
                xInterval={range === "30d" ? "preserveStartEnd" : undefined}
                yLeftFormatter={(v) => (Number(v) / 1000).toFixed(1)}
                tooltipLabelFormatter={(l, payload) => {
                  // Slots carry their own timestamp, so the readout names the
                  // exact moment on every range rather than a bucket label.
                  const t = payload?.[0]?.payload?.sortKey;
                  return t ? fmtSlot(t) : l;
                }}
                markers={
                  chartType === "line" && hiPoint
                    ? {
                        hi: { x: hiPoint.label, y: hiPoint[chartValueKey] || 0 },
                        lo:
                          loPoint && loPoint !== hiPoint
                            ? { x: loPoint.label, y: loPoint[chartValueKey] || 0 }
                            : undefined,
                      }
                    : undefined
                }
                series={[
                  {
                    key: chartValueKey,
                    name: "Avg Power",
                    type: chartType === "line" ? "area" : "bar",
                    unit: "kW",
                    decimals: 2,
                    transform: (v) => Number(v) / 1000,
                    maxBarSize: range === "1h" ? 48 : 28,
                  },
                ]}
              />
            )}
          </div>

          {/* Right column: Weather stacked above Recent Activity */}
          <div className="flex flex-col gap-4 min-w-0">
            <WeatherWidget />

            <div className="bg-white rounded-xl border border-slate-200 p-5 flex-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Recent Activity</h2>
                <p className="text-xs text-slate-500">Faults & system events</p>
              </div>
              <Link
                href="/alerts"
                className="text-xs text-orange-600 font-semibold hover:underline flex items-center gap-1 shrink-0"
              >
                View all <ArrowUpRight size={11} />
              </Link>
            </div>

            {/* Overall health badge */}
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border mb-4 ${
                faultCount > 0
                  ? "bg-red-50 border-red-100"
                  : onlineCount === 0
                  ? "bg-slate-50 border-slate-200"
                  : "bg-green-50 border-green-100"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  faultCount > 0
                    ? "bg-red-500 animate-pulse"
                    : onlineCount === 0
                    ? "bg-slate-400"
                    : "bg-green-500 animate-pulse"
                }`}
              />
              <p
                className={`text-xs font-bold uppercase tracking-wider ${
                  faultCount > 0
                    ? "text-red-700"
                    : onlineCount === 0
                    ? "text-slate-600"
                    : "text-green-700"
                }`}
              >
                {faultCount > 0
                  ? `${faultCount} active fault${faultCount === 1 ? "" : "s"}`
                  : onlineCount === 0
                  ? "Fleet idle"
                  : "All systems nominal"}
              </p>
            </div>

            <ul className="space-y-2.5 max-h-[210px] overflow-y-auto scrollbar-thin pr-1">
              {(faultCount > 0
                ? inverters
                    .filter((i) => hasActiveFault(i))
                    .map((i) => ({
                      type: "fault",
                      title: `Fault on ${i.name}`,
                      detail: `Bitmask ${formatFaultBitmask(i.fault_bitmask)}${isHwFault(i) ? " · HW fault" : ""}`,
                      time: "now",
                    }))
                : onlineCount === 0
                ? [
                    { type: "warn", title: "All inverters offline", detail: `${totalInverters} device${totalInverters === 1 ? "" : "s"} not reporting`, time: "now" },
                    { type: "info", title: "Awaiting connection", detail: "Last poll completed", time: "just now" },
                  ]
                : [
                    { type: "ok", title: "Systems nominal", detail: "No active faults", time: "now" },
                    { type: "info", title: "Live polling active", detail: `${onlineCount} of ${totalInverters} online`, time: "just now" },
                  ]
              ).map((a, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      a.type === "fault"
                        ? "bg-red-50 text-red-600"
                        : a.type === "ok"
                        ? "bg-green-50 text-green-600"
                        : a.type === "warn"
                        ? "bg-amber-50 text-amber-600"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {a.type === "fault" || a.type === "warn" ? (
                      <AlertTriangle size={16} />
                    ) : (
                      <Activity size={16} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">{a.title}</p>
                    <p className="text-xs text-slate-500 truncate">{a.detail}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 mt-1">{a.time}</span>
                </li>
              ))}
            </ul>
            </div>
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
                  <th className="text-center px-5 py-3 font-semibold">Location</th>
                  <th className="text-center px-5 py-3 font-semibold">Status</th>
                  <th className="text-center px-5 py-3 font-semibold">Power Out</th>
                  <th className="text-center px-5 py-3 font-semibold">Temp</th>
                  <th className="text-center px-5 py-3 font-semibold">Faults</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {inverters.slice(0, 6).map((inv) => {
                  const bitmask = parseFaultBitmask(inv.fault_bitmask);
                  const faulted = hasActiveFault(inv);
                  const status = computeStatus(inv);
                  // Offline = stale reading — show 0 instead of a last-known
                  // value that can be minutes to months old.
                  const offline = status === "offline";
                  return (
                    <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                      <td className="px-5 py-3 text-center font-semibold text-slate-900">{inv.name}</td>
                      <td className="px-5 py-3 text-center text-slate-500 font-mono text-xs">{inv.serial_number}</td>
                      <td className="px-5 py-3 text-center text-slate-600 text-xs">
                        {formatLocation(inv) ? (
                          <span className="inline-flex items-center gap-1 max-w-52">
                            <MapPin size={11} className="text-slate-400 shrink-0" />
                            <span className="truncate" title={formatLocation(inv)}>
                              {formatLocation(inv)}
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center"><StatusBadge status={status} /></td>
                      <td className="px-5 py-3 text-center text-slate-700">
                        {offline ? 0 : Number(inv.power_out ?? 0).toFixed(0)} W
                      </td>
                      <td className="px-5 py-3 text-center text-slate-700">
                        {offline ? "0.0 °C" : (inv.temperature != null ? `${Number(inv.temperature).toFixed(1)} °C` : "—")}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {faulted ? (
                          <span className="text-xs font-semibold text-red-600">{bitmask > 0 ? formatFaultBitmask(inv.fault_bitmask) : "HW"}</span>
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
                  <tr><td colSpan={8} className="text-center text-slate-400 py-10 text-sm">No inverters yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
