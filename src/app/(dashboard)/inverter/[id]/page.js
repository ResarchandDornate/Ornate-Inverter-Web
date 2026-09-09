"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { TrendChart } from "@/components/charts/TrendChart";
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
  Download,
  MapPin,
} from "lucide-react";
import { getData } from "@/lib/api";
import { QUERY_KEYS } from "@/lib/queryKeys";
import Topbar from "@/components/Topbar";
import StatusBadge from "@/components/StatusBadge";
import StatusCard from "@/components/StatusCard";
import { useLiveInverters } from "@/hooks/useLiveInverters";
import {
  computeStatus,
  formatLastSeen,
  formatLocation,
  parseFaultBitmask,
  hasActiveFault,
} from "@/lib/inverterStatus";
import { useChartType } from "@/hooks/useChartType";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "generation", label: "Generation" },
  { id: "faults", label: "Faults" },
];

// Two independent flags per range:
//
//   feed   — where the CHART's points come from.
//            "recent" = the 100-row live poll (enough for 10 min / 1 hour)
//            "window" = a paged raw-telemetry fetch over the whole window
//   source — where the Total Generation CARD gets its kWh. "pg" keeps reading
//            the backend's pre-aggregated energy, which is authoritative;
//            raw telemetry carries power only, so it can be integrated but not
//            trusted the same way.
//
// Every range now feeds the chart from raw readings, so the points BETWEEN each
// hour or day are on screen instead of a single averaged bucket. One inverter's
// week is ~2k rows, which is why this page can load the lot up front while the
// fleet-wide dashboard has to drill in on demand.
const CHART_RANGES = [
  { id: "10m",    label: "Last 10 min",   source: "raw", feed: "recent", windowMin: 10,           bucketSec: 0,  axisFmt: "HH:mm:ss" },
  { id: "1h",     label: "Last 1 hour",   source: "raw", feed: "recent", windowMin: 60,           bucketSec: 60, axisFmt: "HH:mm" },
  { id: "1d",     label: "Last 24 hours", source: "pg",  feed: "window", windowMin: 60 * 24,      slotSec: 60,      axisFmt: "HH:mm" },
  { id: "1w",     label: "Last week",     source: "pg",  feed: "window", windowMin: 60 * 24 * 7,  slotSec: 600,     axisFmt: "dd MMM HH:mm" },
  { id: "1mo",    label: "Last month",    source: "pg",  feed: "window", windowMin: 60 * 24 * 30, slotSec: 1800,    axisFmt: "dd MMM HH:mm" },
  { id: "custom", label: "Custom date",   source: "pg",  feed: "window", customDay: true,         slotSec: 60,      axisFmt: "HH:mm" },
];

/**
 * Lay readings onto a continuous grid of fixed slots across [start, end].
 *
 * The grid is what keeps the time axis honest. Plotting the readings alone on a
 * categorical axis would collapse every gap — an inverter offline all night
 * would render as one continuous daylight curve, because the missing hours
 * simply would not be there. Every slot is emitted; ones with no reading come
 * back null, which the chart draws as a break rather than a fabricated zero.
 *
 * Slot widths are sized so a window lands near ~1,000-1,500 points: fine enough
 * that 24 hours keeps each per-minute reading, coarse enough that a month does
 * not ask the browser to draw tens of thousands of them.
 */
function toSlotSeries(points, slotMs, start, end) {
  const buckets = new Map();
  points.forEach(({ t, power }) => {
    const key = Math.floor(t / slotMs) * slotMs;
    if (!buckets.has(key)) buckets.set(key, { sum: 0, count: 0 });
    const b = buckets.get(key);
    b.sum += power;
    b.count += 1;
  });

  const series = [];
  const firstSlot = Math.floor(start / slotMs) * slotMs;
  const lastSlot = Math.floor(end / slotMs) * slotMs;
  for (let t = firstSlot; t <= lastSlot; t += slotMs) {
    const b = buckets.get(t);
    series.push({ t, power: b ? b.sum / b.count : null });
  }
  return series;
}

// Convert an array of telemetry records to CSV and trigger a browser download.
// Excel opens CSV with a UTF-8 BOM correctly, so no .xlsx library needed.
function exportReadingsToCsv(records, inverterId) {
  if (!records || records.length === 0) {
    alert("No readings to export.");
    return;
  }

  const headers = [
    "Timestamp",
    "Voltage (V)",
    "Current (A)",
    "Power Out (W)",
    "Power In (W)",
    "VPV (V)",
    "IPV (A)",
    "PF",
    "Temperature (°C)",
    "Grid Connected",
    "Fault Bitmask",
    "HW Fault",
    "Source",
  ];

  const rows = records.map((r) => [
    new Date(r.timestamp).toLocaleString("en-IN", { hour12: false }),
    Number(r.voltage ?? 0).toFixed(2),
    Number(r.current ?? 0).toFixed(2),
    Number(r.power_out ?? 0).toFixed(2),
    Number(r.power_in ?? 0).toFixed(2),
    Number(r.vpv ?? 0).toFixed(2),
    Number(r.ipv ?? 0).toFixed(2),
    Number(r.power_factor ?? r.delta ?? 0).toFixed(4),
    r.temperature ?? "",
    r.grid_connected ? "Yes" : "No",
    r.fault_bitmask ?? 0,
    r.hw_fault ? "Yes" : "No",
    r.queued_offline || r.timestamp_is_estimated ? "Backlog" : "Live",
  ]);

  const escape = (cell) => {
    const str = String(cell ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csv = [headers, ...rows]
    .map((row) => row.map(escape).join(","))
    .join("\n");

  // BOM prefix makes Excel detect UTF-8 properly (otherwise it garbles °, ₹, etc.)
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const today = new Date().toISOString().split("T")[0];
  const link = document.createElement("a");
  link.href = url;
  link.download = `inverter-${inverterId}-readings-${today}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function InverterDetailsPage() {
  const { id: inverterId } = useParams();
  const [tab, setTab] = useState("overview");
  // Default to the weekly view so the page opens on the recorded HISTORY
  // (previous days of generation) instead of just the last 10 minutes — which
  // looked empty/"no previous data" on load. Live/raw views are one click away.
  const [chartRange, setChartRange] = useState("1w");
  const [chartType] = useChartType(); // global "bar" | "line" from Settings
  const [customDate, setCustomDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );

  // Memoize so the queryKey stays stable across renders (only changes at midnight).
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // This page only ever fetched telemetry, so it had nothing to say about the
  // unit itself. The inverter record — name, model, and where it is installed —
  // rides along on the fleet list, which is already cached under one shared
  // query key, so arriving from /inverters costs no extra request.
  const { data: fleet = [] } = useLiveInverters();
  const inverterMeta = useMemo(
    () => fleet.find((i) => String(i.id) === String(inverterId)) ?? null,
    [fleet, inverterId]
  );

  const locationLabel = formatLocation(inverterMeta);

  // Two separate queries, deliberately NOT one — they have opposite freshness
  // needs and opposite size:
  //
  // 1. recentHistory — small (one page, ~100 rows), fast 10s poll. Drives the
  //    live-status cards (Voltage/Current/.../Grid Status) and the raw 10min/
  //    1h chart views, all of which need to be fresh, not exhaustive.
  // 2. fullHistory — the Detailed Readings table's feed, windowed by the
  //    table's own range dropdown (24h/week/month/all), fetched once per
  //    range (+ manual refresh) with NO poll. The server filters the window
  //    (?timestamp__gte) and returns up to 5000 rows/request, so the default
  //    week view is ONE fast request instead of the old crawl of 50+
  //    sequential 100-row pages (~8 s of blank table).
  const {
    data: recentHistory,
    isLoading,
    refetch: refetchRecent,
    isRefetching,
  } = useQuery({
    queryKey: [...QUERY_KEYS.INVERTER_DETAILS(inverterId), "recent"],
    queryFn: () =>
      getData(`/inverter/inverter-data/?inverter=${inverterId}&ordering=-timestamp`)
        .then((r) => r?.results || []),
    enabled: !!inverterId,
    // 10 s matches useLiveInverters so status + telemetry flip in the same cycle.
    refetchInterval: 10000,
    staleTime: 9000,
    gcTime: 30 * 60 * 1000,
    // This feeds latestReading (Voltage/Current/Temp/PF cards) — refetch on
    // focus so it re-syncs immediately instead of waiting out a throttled
    // background-tab poll, matching the list pages' useLiveInverters.
    refetchOnWindowFocus: true,
  });

  // Table range filter + scroll-extended rendering: only the first chunk of
  // rows hits the DOM; scrolling near the bottom appends more, so even "all
  // history" (thousands of rows) stays smooth.
  const [readingsRange, setReadingsRange] = useState("week");
  const [visibleCount, setVisibleCount] = useState(150);
  const {
    data: fullHistory,
    isLoading: isLoadingFullHistory,
    refetch: refetchFullHistory,
  } = useQuery({
    queryKey: [...QUERY_KEYS.INVERTER_DETAILS(inverterId), "readings", readingsRange],
    queryFn: async () => {
      const RANGE_MS = { "24h": 24 * 3600e3, week: 7 * 24 * 3600e3, month: 30 * 24 * 3600e3 };
      let base = `/inverter/inverter-data/?inverter=${inverterId}&ordering=-timestamp&page_size=5000`;
      if (readingsRange !== "all") {
        const since = new Date(Date.now() - RANGE_MS[readingsRange]).toISOString();
        base += `&timestamp__gte=${encodeURIComponent(since)}`;
      }
      const MAX_PAGES = 40; // 40 × 5000 = 200k rows — a generous ceiling, not a silent cap in practice
      const allData = [];
      for (let page = 1; page <= MAX_PAGES; page++) {
        const url = page === 1 ? base : `${base}&page=${page}`;
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
    enabled: !!inverterId,
    staleTime: 5 * 60 * 1000,   // historical — 5 min is plenty fresh
    refetchInterval: false,     // NEVER auto-poll — this is the whole point
    gcTime: 30 * 60 * 1000,
  });

  const onRefresh = () => {
    refetchRecent();
    refetchFullHistory();
  };

  // Status endpoint /grid_status/ gives us authoritative status + last_seen.
  const { data: gridStatusData } = useQuery({
    queryKey: ["inverterGridStatus", inverterId],
    queryFn: () => getData(`/inverter/inverters/${inverterId}/grid_status/`),
    enabled: !!inverterId,
    refetchInterval: 10000,
    staleTime: 8000,
  });

  // Live cards + the raw (10min/1h) chart use the small, fast-polled
  // recentHistory — never the full-history fetch, which can be thousands of
  // rows and isn't kept fresh on the 10s cycle.
  const recentData = recentHistory || [];
  const fullHistoryData = fullHistory || [];
  // "Current/live" values must come from a FRESH LIVE reading — never a backlog
  // (queued_offline) point, and never a stale live reading. Backlog points are
  // buffered history the device replayed with no real time of their own; we
  // stamp them with arrival time so they're recorded, but they must NOT
  // masquerade as the current output. recentData is newest-first.
  const LIVE_FRESH_MS = 15 * 60 * 1000; // matches backend online window
  const latestLive = recentData.find((d) => !d.queued_offline);
  const hasLiveReading = !!(
    latestLive &&
    Date.now() - new Date(latestLive.timestamp).getTime() <= LIVE_FRESH_MS
  );
  const latestReading = hasLiveReading ? latestLive : {};
  // Merge status endpoint with latest telemetry record for one unified shape.
  const merged = {
    ...latestReading,
    status: gridStatusData?.status,
    is_online: gridStatusData?.is_online,
    last_seen: gridStatusData?.last_seen,
    grid_connected: gridStatusData?.grid_connected ?? latestReading.grid_connected,
  };
  const gridConnected = merged.grid_connected ?? null;
  // Whether the inverter is offline based on connectivity alone (before
  // factoring in the grid reading itself — needed below to decide the Grid
  // Status card without circularity).
  const offlineByConnectivity =
    merged.status === "offline" || merged.is_online === false;
  const status = computeStatus(merged);
  // Grid Status is coupled to online status: grid on ⇔ inverter live. The
  // backend only reports "live" when the device's MQTT grid_connected flag is
  // true, so grid off (or no data) makes status "offline" and the grid reads
  // OFF. `grid_connected` here is the backend `grid_on` value.
  const readingGridConnected = gridConnected === true;
  // "offline" collapses Voltage/Current/Temp/VPV/IPV to 0. It's true when the
  // device isn't communicating OR when there's no LIVE reading to show (e.g. the
  // device is only replaying backlog — recovering). That keeps the current
  // cards from rendering a backlog value (or NaN) as if it were live.
  const offline = offlineByConnectivity || !hasLiveReading;
  const bitmask = parseFaultBitmask(latestReading.fault_bitmask);
  const hasFault = hasActiveFault(latestReading);

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
    queryFn: async () => {
      // The backend's pagination is a standard PageNumberPagination (100/page)
      // that does NOT honor a client `?limit=` override — passing limit=5000
      // silently did nothing, so a week (~168 hourly buckets) or month (~720)
      // was truncated to whatever page 1 happened to return, with the `next`
      // page just ignored. Paginate through properly instead, same pattern as
      // the other full-fetch queries on this page.
      const MAX_PAGES = 50; // 50 × 100 = up to 5,000 buckets — comfortably covers a year of hourly data
      const allResults = [];
      const baseUrl =
        `/inverter/power-generation/?inverter=${inverterId}` +
        `&${pgQueryFilter}` +
        `&ordering=measurement_time`;
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
        allResults.push(...results);
        if (!response.next) break;
      }
      return { results: allResults };
    },
    enabled: !!inverterId && !!pgQueryFilter,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 5 * 60 * 1000,        // treat data fresh for 5 min — no refetch when re-entering tab
    gcTime: 30 * 60 * 1000,          // keep cached for 30 min after unmount
    refetchOnMount: false,           // re-entering a tab serves cache, not a fresh fetch
    refetchOnWindowFocus: false,
  });

  // Raw telemetry across the chart's own window — the feed for 24h / week /
  // month / custom.
  //
  // /power-generation/ only stores hourly buckets, which is why those tabs used
  // to draw one averaged point per hour (or per day). This reads the readings
  // themselves, so everything between those hours is on screen.
  //
  // The backend exposes `timestamp__gte` but no upper bound, so the window is
  // requested ASCENDING from its start — the first pages are then exactly the
  // window — and the tail is trimmed here. Never polled: this is history, and
  // the live cards above already refresh on their own 10 s cycle.
  // The window is pinned once per range so the fetch and the slot grid below
  // agree on its edges — recomputing Date.now() in both would leave the grid
  // reaching a moment the fetch never asked for.
  const chartWindow = useMemo(() => {
    if (currentRange.feed !== "window") return null;
    if (currentRange.customDay) {
      const d = new Date(`${customDate}T00:00:00`);
      d.setHours(0, 0, 0, 0);
      const start = d.getTime();
      return { start, end: start + 24 * 60 * 60 * 1000 };
    }
    const end = Date.now();
    return { start: end - currentRange.windowMin * 60 * 1000, end };
  }, [currentRange, customDate]);

  const { data: windowRaw = [], isLoading: windowRawLoading } = useQuery({
    queryKey: ["chartRawWindow", inverterId, chartRange, customDate],
    queryFn: async () => {
      const { start, end } = chartWindow;

      const base =
        `/inverter/inverter-data/?inverter=${inverterId}` +
        `&timestamp__gte=${encodeURIComponent(new Date(start).toISOString())}` +
        `&ordering=timestamp&page_size=5000`;

      const rows = [];
      const MAX_PAGES = 12; // 60k rows — far past a month for a single inverter
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
        if (!res.next || lastT >= end) break;
      }

      return rows
        .map((r) => ({
          t: new Date(r.timestamp).getTime(),
          power: parseFloat(r.power_out || 0),
        }))
        .filter((p) => Number.isFinite(p.t) && p.t >= start && p.t <= end)
        .sort((a, b) => a.t - b.t);
    },
    enabled: !!inverterId && !!chartWindow,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchInterval: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Build the chart series. 10m → raw samples, 1h → per-minute averages, and
  // every longer range → the raw readings across the window.
  const chartData = useMemo(() => {
    const MIN_W = 1; // values below 1 W are standby noise — hide from chart

    if (currentRange.feed === "recent") {
      const cutoff = Date.now() - currentRange.windowMin * 60 * 1000;
      // The trend charts show ALL recorded telemetry in the window, including
      // replayed backlog — so previous data stays visible. Only the "current"
      // headline (W output / Last seen) is restricted to fresh live readings.
      const filtered = recentData
        .filter((d) => new Date(d.timestamp).getTime() >= cutoff)
        .map((d) => ({
          t: new Date(d.timestamp).getTime(),
          power: parseFloat(d.power_out || 0),
        }))
        .sort((a, b) => a.t - b.t);

      if (!currentRange.bucketSec) {
        // 10m view — raw samples. Null out noise so no bar is drawn.
        return filtered.map((d) => ({
          t: d.t,
          time: format(new Date(d.t), "HH:mm:ss"),
          power: d.power >= MIN_W ? d.power : null,
        }));
      }
      // 1h view — one bar per minute. Null out minute-averages below threshold.
      const bucketMs = currentRange.bucketSec * 1000;
      const buckets = new Map();
      filtered.forEach(({ t, power }) => {
        const key = Math.floor(t / bucketMs) * bucketMs;
        if (!buckets.has(key)) buckets.set(key, { sum: 0, count: 0 });
        const b = buckets.get(key);
        b.sum += power;
        b.count += 1;
      });

      const nowMs = Date.now();
      const firstSlot = Math.floor((nowMs - currentRange.windowMin * 60 * 1000) / bucketMs) * bucketMs;
      const lastSlot = Math.floor(nowMs / bucketMs) * bucketMs;
      const series = [];
      for (let t = firstSlot; t <= lastSlot; t += bucketMs) {
        const b = buckets.get(t);
        const avg = b ? b.sum / b.count : 0;
        series.push({
          t,
          time: format(new Date(t), "HH:mm"),
          power: avg >= MIN_W ? avg : null,
        });
      }
      return series;
    }

    // 24h / week / month / custom — the readings themselves across a continuous
    // grid, rather than one averaged point per hour or per day.
    if (!chartWindow) return [];
    return toSlotSeries(
      windowRaw,
      currentRange.slotSec * 1000,
      chartWindow.start,
      chartWindow.end
    ).map((d) => ({
      t: d.t,
      time: format(new Date(d.t), currentRange.axisFmt),
      power: d.power != null && d.power >= MIN_W ? d.power : null,
    }));
  }, [currentRange, recentData, windowRaw, chartWindow]);

  // Every series on this chart is now raw power, so there is no averaged
  // "W avg" variant left to label.
  const yUnit = " W";
  // Scroll once bars would otherwise be < ~20 px wide. Drops the threshold
  // from 80 → 40 so the Last 1 hour view (60 bars) gets fatter, readable bars
  // with a horizontal scrollbar instead of being squeezed into the card width.
  const needsScroll = chartData.length > 40;

  // Total generation for whichever range tab is currently selected — NOT
  // hard-coded to "today" the way the old Daily Energy card was (which stayed
  // fixed on today's total even while you browsed a different range tab on
  // the chart right next to it). pg-source ranges (24h/week/month/custom)
  // sum the same backend hourly buckets the chart itself renders from, so the
  // number always matches what's on screen. raw-source ranges (10min/1h) have
  // no PowerGeneration buckets to sum — approximate from recentData instead.
  const totalGenerationKwh = useMemo(() => {
    if (currentRange.source === "pg") {
      const buckets = chartPgData?.results || [];
      return buckets.reduce((sum, b) => sum + parseFloat(b.energy_generated || 0), 0);
    }
    const cutoff = Date.now() - currentRange.windowMin * 60 * 1000;
    const windowReadings = recentData.filter((d) => new Date(d.timestamp).getTime() >= cutoff);
    if (!windowReadings.length) return 0;
    const avgW = windowReadings.reduce((s, d) => s + parseFloat(d.power_out || 0), 0) / windowReadings.length;
    return (avgW * (currentRange.windowMin / 60)) / 1000;
  }, [currentRange, chartPgData, recentData]);

  const avgPowerW = useMemo(() => {
    if (!recentData.length) return 0;
    return recentData.reduce((s, d) => s + parseFloat(d.power_out || 0), 0) / recentData.length;
  }, [recentData]);

  return (
    <>
      <Topbar
        title={`Inverter #${inverterId}`}
        breadcrumbs={["Dashboard", "Inverters", `#${inverterId}`]}
      />
      <main className="flex-1 px-6 py-6 max-w-[1600px] w-full">
        {/* Hero status card */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 mb-4 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-4 flex-1 min-w-60">
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
                {hasLiveReading
                  ? `Last seen ${formatLastSeen(latestReading.timestamp)}`
                  : "No live data — replaying backlog"}
              </p>
              {locationLabel && (
                <p className="text-[11px] text-slate-500 mt-1.5 flex items-start gap-1">
                  <MapPin size={11} className="text-slate-400 shrink-0 mt-0.5" />
                  <span>{locationLabel}</span>
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={status} />
            <button
              onClick={() => exportReadingsToCsv(fullHistoryData, inverterId)}
              disabled={!fullHistoryData.length}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Download readings as CSV (opens in Excel)"
            >
              <Download size={14} />
              Export
            </button>
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
        {isLoading && !recentData.length ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw size={32} className="animate-spin text-orange-500" />
            <p className="text-sm text-slate-500 mt-3">Loading inverter data…</p>
          </div>
        ) : recentData.length === 0 ? (
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
                  value={readingGridConnected === null ? "..." : readingGridConnected ? "ON" : "OFF"}
                  unit=""
                  icon={readingGridConnected ? Save : AlertCircle}
                  color={readingGridConnected ? "#10B981" : "#EF4444"}
                  bgClass={readingGridConnected ? "bg-green-100" : "bg-red-100"}
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
                  title="PF"
                  value={offline ? "0.0000" : parseFloat(latestReading.power_factor ?? latestReading.delta ?? 0).toFixed(4)}
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
                {/* Summary stats — both scoped to whichever range tab is selected below
                    (Last 10 min / 1h / 24h / week / month / custom), not hard-coded to
                    "today" regardless of what the chart is showing. */}
                <section className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Total Generation</p>
                    <p className="text-2xl font-bold text-blue-600">{totalGenerationKwh.toFixed(3)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">kWh · {currentRange.label}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Avg Power</p>
                    <p className="text-2xl font-bold text-slate-700">{(avgPowerW / 1000).toFixed(2)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">kW average · {recentData.length} recent readings</p>
                  </div>
                </section>

                <section className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
                  {/* Header: title on the left, range tabs on the top-right */}
                  <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Generation Trend</h3>
                      <p className="text-xs text-slate-500">
                        {chartData.length} data points ·{" "}
                        {currentRange.feed === "recent" && !currentRange.bucketSec
                          ? "raw telemetry (5-second precision)"
                          : currentRange.feed === "recent"
                          ? "per-minute average"
                          : currentRange.slotSec < 60
                          ? `${currentRange.slotSec}-second resolution`
                          : `${currentRange.slotSec / 60}-minute resolution`}
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

                  {/* Chart — hopeCloud-styled trend. Long ranges get a brush
                      instead of the old sticky-Y-axis + horizontal scroll. */}
                  {(currentRange.feed === "window" ? windowRawLoading : chartPgLoading) ? (
                    <div className="h-72 flex items-center justify-center text-sm text-slate-400">
                      <RefreshCw size={20} className="animate-spin mr-2" /> Loading…
                    </div>
                  ) : (
                    <TrendChart
                      data={chartData}
                      xKey="time"
                      height={420}
                      unitLeft={yUnit.trim()}
                      brush={needsScroll}
                      series={[
                        {
                          key: "power",
                          name: "Power",
                          type: chartType === "line" ? "area" : "bar",
                          unit: "W",
                          decimals: 0,
                          maxBarSize: needsScroll ? 20 : 28,
                        },
                      ]}
                      tooltipLabelFormatter={(_, payload) => {
                        const t = payload?.[0]?.payload?.t;
                        if (!t) return "";
                        // Points now carry a real reading timestamp on every
                        // range, so the readout always names the exact moment.
                        return format(new Date(t), "EEE, dd MMM HH:mm:ss");
                      }}
                    />
                  )}
                </section>

                <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center gap-3 flex-wrap">
                    <h3 className="text-base font-bold text-slate-900">
                      Detailed Readings{" "}
                      <span className="font-normal text-slate-400">
                        · {{ "24h": "last 24 hours", week: "last week", month: "last month", all: "all history" }[readingsRange]}
                      </span>
                    </h3>
                    <span className="text-xs text-slate-500 flex items-center gap-3">
                      {isLoadingFullHistory && (
                        <RefreshCw size={12} className="animate-spin text-slate-400" />
                      )}
                      {fullHistoryData.length.toLocaleString("en-IN")} entries
                      <select
                        value={readingsRange}
                        onChange={(e) => {
                          setReadingsRange(e.target.value);
                          setVisibleCount(150);
                        }}
                        aria-label="Readings range"
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:border-slate-300 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/20"
                      >
                        <option value="24h">Last 24 hours</option>
                        <option value="week">Last week</option>
                        <option value="month">Last month</option>
                        <option value="all">All history</option>
                      </select>
                    </span>
                  </div>
                  <div
                    className="overflow-y-auto max-h-125"
                    onScroll={(e) => {
                      // Scroll-extend: append the next chunk of rows when the
                      // user nears the bottom, keeping the DOM small for the
                      // common "glance at recent readings" case.
                      const el = e.currentTarget;
                      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 600) {
                        setVisibleCount((c) => (c < fullHistoryData.length ? c + 200 : c));
                      }
                    }}
                  >
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 sticky top-0">
                        <tr>
                          <th className="text-center px-5 py-3 font-semibold">Time</th>
                          <th className="text-center px-5 py-3 font-semibold">Voltage (V)</th>
                          <th className="text-center px-5 py-3 font-semibold">Current (A)</th>
                          <th className="text-center px-5 py-3 font-semibold">Power Out (W)</th>
                          <th className="text-center px-5 py-3 font-semibold">Temp (°C)</th>
                          <th className="text-center px-5 py-3 font-semibold">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fullHistoryData.slice(0, visibleCount).map((item, index) => {
                          const ts = new Date(item.timestamp);
                          const now = new Date();
                          const isToday =
                            ts.getFullYear() === now.getFullYear() &&
                            ts.getMonth() === now.getMonth() &&
                            ts.getDate() === now.getDate();
                          // Trust the backend's own queued_offline flag directly — no
                          // "is it recent enough" second-guessing here. A device that
                          // sends backlog points promptly (small created_at − timestamp
                          // gap) would otherwise always read as "Live" under a freshness
                          // heuristic, silently hiding a real backlog flag. Matches the
                          // CSV export's logic below, which already does this correctly.
                          // An estimated-timestamp row (device clock unsynced, stored under
                          // arrival time — see timestamp_is_estimated) is shown as Backlog
                          // too, same as a genuine queued_offline replay: both mean "don't
                          // treat this as a fresh live reading."
                          const isBacklog = item.queued_offline || item.timestamp_is_estimated;
                          return (
                          <tr
                            key={item.id || index}
                            className="border-b border-slate-100 hover:bg-slate-50"
                          >
                            <td className="px-5 py-2.5 text-center text-slate-700 font-mono text-xs whitespace-nowrap">
                              {/* Show the date whenever the reading isn't from today, so
                                  real past generation times can't be mistaken for "now". */}
                              {format(ts, isToday ? "HH:mm:ss" : "dd MMM, HH:mm:ss")}
                            </td>
                            <td className="px-5 py-2.5 text-center text-slate-700">{parseFloat(item.voltage).toFixed(1)}</td>
                            <td className="px-5 py-2.5 text-center text-slate-700">{parseFloat(item.current).toFixed(2)}</td>
                            <td className="px-5 py-2.5 text-center font-semibold text-orange-600">{parseFloat(item.power_out).toFixed(0)}</td>
                            <td className="px-5 py-2.5 text-center text-slate-700">{item.temperature ?? "—"}</td>
                            <td className="px-5 py-2.5 text-center">
                              {isBacklog
                                ? <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700" title="Replayed from the device's offline buffer">Backlog</span>
                                : <span className="text-[10px] text-slate-400">Live</span>}
                            </td>
                          </tr>
                          );
                        })}
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
