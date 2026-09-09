"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format, addDays, addMonths, endOfMonth, startOfMonth, isAfter } from "date-fns";
import {
  Zap,
  Sun,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Leaf,
  TreePine,
  ArrowUpRight,
} from "lucide-react";
import { getData } from "@/lib/api";
import { TrendChart } from "@/components/charts/TrendChart";
import StatusBadge from "@/components/StatusBadge";
import { useLiveInverters } from "@/hooks/useLiveInverters";
import { computeStatus, isLive } from "@/lib/inverterStatus";

// Estimates, shown as such. India grid average emission factor (CEA) and the
// commonly cited annual CO2 uptake of one mature tree.
const KG_CO2_PER_KWH = 0.71;
const KG_CO2_PER_TREE_YEAR = 21.77;

const VIEWS = [
  { id: "day", label: "Day" },
  { id: "month", label: "Month" },
];

export default function MySystemPage() {
  // NOTE: this returns whatever /inverter/inverters/ gives the current token.
  // The API must scope that to the signed-in customer — this page draws what
  // it is handed and cannot filter what it was never meant to receive.
  const { data: inverters = [], isLoading } = useLiveInverters();

  const [view, setView] = useState("day");
  const [anchor, setAnchor] = useState(() => new Date());

  const isDay = view === "day";
  const rangeStart = isDay ? anchor : startOfMonth(anchor);
  const rangeEnd = isDay ? anchor : endOfMonth(anchor);
  const atPresent = !isAfter(
    isDay ? addDays(anchor, 1) : addMonths(startOfMonth(anchor), 1),
    new Date()
  );

  const startParam = `${format(rangeStart, "yyyy-MM-dd")}T00:00:00`;
  const endParam = `${format(rangeEnd, "yyyy-MM-dd")}T23:59:59`;

  const { data: pgData, isLoading: pgLoading } = useQuery({
    queryKey: ["customerGeneration", view, startParam, endParam],
    queryFn: () =>
      getData(
        `/inverter/power-generation/?start=${startParam}&end=${endParam}&ordering=measurement_time&page_size=5000`
      ),
    staleTime: 60 * 1000,
    refetchInterval: atPresent ? 5 * 60 * 1000 : false,
  });

  const rows = pgData?.results || [];

  // Hourly buckets for a day, daily buckets for a month.
  const chart = useMemo(() => {
    const buckets = {};
    rows.forEach((r) => {
      const t = new Date(r.measurement_time);
      const key = isDay
        ? `${String(t.getHours()).padStart(2, "0")}:00`
        : format(t, "dd MMM");
      if (!buckets[key]) buckets[key] = { label: key, energy: 0, sort: t.getTime() };
      buckets[key].energy += parseFloat(r.energy_generated || 0);
      buckets[key].sort = Math.min(buckets[key].sort, t.getTime());
    });
    return Object.values(buckets).sort((a, b) => a.sort - b.sort);
  }, [rows, isDay]);

  const rangeEnergy = chart.reduce((s, b) => s + b.energy, 0);

  // Today's figure is independent of whatever range the chart is showing.
  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const { data: todayData } = useQuery({
    queryKey: ["customerToday", todayStr],
    queryFn: () =>
      getData(
        `/inverter/power-generation/?start=${todayStr}T00:00:00&end=${todayStr}T23:59:59&ordering=measurement_time&page_size=5000`
      ),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });
  const todayEnergy = (todayData?.results || []).reduce(
    (s, r) => s + parseFloat(r.energy_generated || 0),
    0
  );

  const livePowerW = inverters.reduce((s, i) => s + (Number(i.power_out) || 0), 0);
  const onlineCount = inverters.filter((i) => isLive(i)).length;
  const allOffline = inverters.length > 0 && onlineCount === 0;

  const co2 = todayEnergy * KG_CO2_PER_KWH;
  const trees = (rangeEnergy * KG_CO2_PER_KWH) / KG_CO2_PER_TREE_YEAR;

  const step = (dir) =>
    setAnchor((d) => (isDay ? addDays(d, dir) : addMonths(d, dir)));

  return (
    <div className="flex flex-col gap-5">
      {/* System status, in plain language */}
      <section
        className={`rounded-xl border p-5 ${
          allOffline
            ? "bg-amber-50 border-amber-200"
            : "bg-white border-slate-200"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {isLoading
                ? "Checking your system…"
                : allOffline
                  ? "Your system isn't reporting right now"
                  : livePowerW > 0
                    ? "Your system is generating"
                    : "Your system is online and idle"}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {allOffline
                ? "This usually clears on its own. If it lasts more than a day, contact Ornate Solar support."
                : `${onlineCount} of ${inverters.length} inverter${
                    inverters.length === 1 ? "" : "s"
                  } reporting normally.`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Generating now
            </p>
            <p className="text-3xl font-black text-slate-900 tabular-nums">
              {(livePowerW / 1000).toFixed(2)}
              <span className="ml-1 text-base font-semibold text-slate-400">kW</span>
            </p>
          </div>
        </div>
      </section>

      {/* Headline numbers */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          icon={Sun}
          label="Generated today"
          value={todayEnergy.toFixed(1)}
          unit="kWh"
          accent="text-amber-600"
          tint="bg-amber-50"
        />
        <Stat
          icon={CalendarDays}
          label={isDay ? "Selected day" : "Selected month"}
          value={rangeEnergy.toFixed(1)}
          unit="kWh"
          accent="text-blue-600"
          tint="bg-blue-50"
        />
        <Stat
          icon={Leaf}
          label="CO₂ avoided today"
          value={co2.toFixed(1)}
          unit="kg"
          accent="text-emerald-600"
          tint="bg-emerald-50"
          hint="Estimate"
        />
        <Stat
          icon={TreePine}
          label="Equivalent trees"
          value={trees.toFixed(1)}
          unit="trees/yr"
          accent="text-teal-600"
          tint="bg-teal-50"
          hint="Estimate"
        />
      </section>

      {/* Generation chart — hopeCloud's Running Curve pattern */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Generation</h2>
            <p className="text-xs text-slate-500">
              {isDay ? "Energy generated per hour" : "Energy generated per day"}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  className={`text-xs px-3 py-1.5 rounded-md font-semibold ${
                    view === v.id
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => step(-1)}
                aria-label={isDay ? "Previous day" : "Previous month"}
                className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-semibold text-slate-700 tabular-nums min-w-30 text-center">
                {format(anchor, isDay ? "dd MMM yyyy" : "MMMM yyyy")}
              </span>
              <button
                onClick={() => step(1)}
                disabled={atPresent}
                aria-label={isDay ? "Next day" : "Next month"}
                className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {pgLoading ? (
          <div className="h-100 flex items-center justify-center text-sm text-slate-400">
            Loading generation…
          </div>
        ) : (
          <TrendChart
            data={chart}
            xKey="label"
            height={400}
            unitLeft="kWh"
            brush={chart.length > 40}
            empty={`No generation recorded for this ${isDay ? "day" : "month"}.`}
            tooltipLabelFormatter={(l) => (isDay ? `Hour: ${l}` : l)}
            series={[
              { key: "energy", name: "Energy", type: "bar", unit: "kWh", decimals: 2 },
            ]}
          />
        )}
      </section>

      {/* The customer's own inverters */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Your inverters</h2>
          <p className="text-xs text-slate-500">
            Open one to see live readings from every sensor.
          </p>
        </div>

        {isLoading ? (
          <p className="px-5 py-8 text-sm text-slate-400">Loading…</p>
        ) : inverters.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-400">
            No inverters are linked to your account yet. Contact Ornate Solar support.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {inverters.map((inv) => (
              <li key={inv.id}>
                <Link
                  href={`/my-system/${inv.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50">
                    <Zap size={18} className="text-orange-500" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">
                      {inv.name}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {inv.model || "Inverter"} · {inv.serial_number}
                    </span>
                  </span>
                  <span className="hidden sm:block text-right">
                    <span className="block text-sm font-bold text-slate-900 tabular-nums">
                      {((Number(inv.power_out) || 0) / 1000).toFixed(2)} kW
                    </span>
                    <span className="block text-[10px] uppercase tracking-wider text-slate-400">
                      right now
                    </span>
                  </span>
                  <StatusBadge status={computeStatus(inv)} />
                  <ArrowUpRight size={14} className="text-slate-300 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value, unit, accent, tint, hint }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tint}`}>
          <Icon size={15} className={accent} />
        </span>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
      </div>
      <p className="mt-2 text-2xl font-black text-slate-900 tabular-nums">
        {value}
        <span className="ml-1 text-xs font-semibold text-slate-400">{unit}</span>
      </p>
      {hint && <p className="text-[10px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}
