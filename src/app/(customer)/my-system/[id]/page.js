"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format, addDays, addMonths, endOfMonth, startOfMonth, isAfter } from "date-fns";
import { ChevronLeft, ChevronRight, Gauge, Clock } from "lucide-react";
import { getData } from "@/lib/api";
import { TrendChart } from "@/components/charts/TrendChart";
import StatusBadge from "@/components/StatusBadge";
import ParameterGrid from "@/components/customer/ParameterGrid";
import { useLiveInverters } from "@/hooks/useLiveInverters";
import { computeStatus } from "@/lib/inverterStatus";
import {
  AUDIENCE_ALL,
  conversionEfficiency,
  groupsForAudience,
} from "@/lib/telemetryParams";

const VIEWS = [
  { id: "day", label: "Day" },
  { id: "month", label: "Month" },
];

export default function MyInverterPage() {
  const { id } = useParams();
  const { data: inverters = [], isLoading } = useLiveInverters();

  const [view, setView] = useState("day");
  const [anchor, setAnchor] = useState(() => new Date());

  const inverter = inverters.find((i) => String(i.id) === String(id));

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
    queryKey: ["customerInverterGeneration", id, view, startParam, endParam],
    queryFn: () =>
      getData(
        `/inverter/power-generation/?inverter=${id}&start=${startParam}&end=${endParam}&ordering=measurement_time&page_size=5000`
      ),
    enabled: !!id,
    staleTime: 60 * 1000,
  });

  const chart = useMemo(() => {
    const buckets = {};
    (pgData?.results || []).forEach((r) => {
      const t = new Date(r.measurement_time);
      const key = isDay
        ? `${String(t.getHours()).padStart(2, "0")}:00`
        : format(t, "dd MMM");
      if (!buckets[key]) buckets[key] = { label: key, energy: 0, sort: t.getTime() };
      buckets[key].energy += parseFloat(r.energy_generated || 0);
      buckets[key].sort = Math.min(buckets[key].sort, t.getTime());
    });
    return Object.values(buckets).sort((a, b) => a.sort - b.sort);
  }, [pgData, isDay]);

  const rangeEnergy = chart.reduce((s, b) => s + b.energy, 0);

  // Customers see the physical parameters; bitmasks and transport flags stay
  // on the operator screens.
  const groups = useMemo(() => groupsForAudience(AUDIENCE_ALL), []);
  const efficiency = inverter ? conversionEfficiency(inverter) : null;

  const step = (dir) =>
    setAnchor((d) => (isDay ? addDays(d, dir) : addMonths(d, dir)));

  if (isLoading) {
    return <p className="py-16 text-center text-sm text-slate-400">Loading your inverter…</p>;
  }

  if (!inverter) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm font-semibold text-slate-700">Inverter not found</p>
        <p className="mt-1 text-sm text-slate-500">
          This inverter isn&apos;t linked to your account.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Identity */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">{inverter.name}</h1>
              <StatusBadge status={computeStatus(inverter)} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {inverter.model || "Inverter"} · Serial {inverter.serial_number}
              {inverter.city ? ` · ${inverter.city}` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Output now
            </p>
            <p className="text-3xl font-black text-slate-900 tabular-nums">
              {((Number(inverter.power_out) || 0) / 1000).toFixed(2)}
              <span className="ml-1 text-base font-semibold text-slate-400">kW</span>
            </p>
          </div>
        </div>

        {inverter._noData && (
          <p className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            No live reading in the last 15 minutes — the figures below are the last
            values received.
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-slate-100 pt-4">
          <Inline
            icon={Gauge}
            label="Conversion efficiency"
            value={efficiency === null ? "–" : `${efficiency.toFixed(1)} %`}
          />
          <Inline
            icon={Clock}
            label="Last reading"
            value={
              inverter.last_telemetry_at
                ? format(new Date(inverter.last_telemetry_at), "dd MMM yyyy, HH:mm:ss")
                : "–"
            }
          />
        </div>
      </section>

      {/* Live parameters, grouped the way the inverter is wired */}
      {groups.map((group) => (
        <ParameterGrid key={group.id} group={group} row={inverter} />
      ))}

      {/* Generation for this inverter */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Generation</h2>
            <p className="text-xs text-slate-500">
              {rangeEnergy.toFixed(2)} kWh over the selected {isDay ? "day" : "month"}
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
              { key: "energy", name: "Energy", type: "bar", unit: "kWh", decimals: 3 },
            ]}
          />
        )}
      </section>
    </div>
  );
}

function Inline({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={15} className="text-slate-400" />
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-900 tabular-nums">{value}</span>
    </div>
  );
}
