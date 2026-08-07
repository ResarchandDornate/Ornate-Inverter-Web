"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, ShieldAlert, ShieldCheck, RefreshCw, Cpu, Clock } from "lucide-react";
import Topbar from "@/components/Topbar";
import StatusBadge from "@/components/StatusBadge";
import { getData } from "@/lib/api";

// Fault value as the firmware's canonical 0x-prefixed uppercase hex.
function faultHex(row) {
  if (row?.fault_hex) return row.fault_hex;
  const n = Number(row?.fault_value ?? 0);
  return "0x" + (Number.isFinite(n) ? n : 0).toString(16).toUpperCase().padStart(8, "0");
}

function fmtDate(iso) {
  if (!iso) return "—";
  try { return format(new Date(iso), "dd MMM yyyy"); } catch { return "—"; }
}
function fmtTime(iso) {
  if (!iso) return "—";
  try { return format(new Date(iso), "HH:mm:ss"); } catch { return "—"; }
}

export default function FaultsPage() {
  const [invFilter, setInvFilter] = useState("all");

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["faults"],
    queryFn: () => getData("/inverter/inverters/faults/"),
    refetchInterval: 15000,
    refetchOnMount: true,
  });

  const live = data?.live || [];
  const history = data?.history || [];

  // Inverter dropdown built from whatever appears in the fault log.
  const inverterOptions = useMemo(() => {
    const seen = new Map();
    for (const r of [...live, ...history]) {
      if (!seen.has(r.inverter_id)) seen.set(r.inverter_id, r.inverter_name || r.serial_number);
    }
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [live, history]);

  const filteredHistory = useMemo(() => {
    if (invFilter === "all") return history;
    return history.filter((r) => String(r.inverter_id) === String(invFilter));
  }, [history, invFilter]);

  return (
    <>
      <Topbar title="Faults" breadcrumbs={["Dashboard", "Faults"]} />
      <main className="flex-1 px-6 py-6 max-w-[1600px] w-full space-y-5">
        {/* Summary + refresh */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${live.length ? "bg-red-50" : "bg-green-50"}`}>
              {live.length ? <ShieldAlert size={20} className="text-red-500" /> : <ShieldCheck size={20} className="text-green-500" />}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Live faults now</p>
              <p className="text-xl font-black tabular-nums text-slate-900">{live.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <AlertTriangle size={20} className="text-amber-500" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Fault events logged</p>
              <p className="text-xl font-black tabular-nums text-slate-900">{history.length}{data?.history_truncated ? "+" : ""}</p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="ml-auto inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw size={15} className={isRefetching ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error?.message || "Could not load faults."}
          </div>
        )}

        {/* ---- Live faults ---- */}
        <section>
          <h2 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              {live.length > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${live.length ? "bg-red-500" : "bg-green-500"}`} />
            </span>
            Live fault value
          </h2>
          {live.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
              No active faults — every reporting inverter is healthy right now.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {live.map((r) => (
                <Link
                  key={`${r.inverter_id}-${r.timestamp}`}
                  href={`/inverter/${r.inverter_id}`}
                  className="rounded-xl border border-red-200 bg-red-50/40 p-4 hover:border-red-300 transition block"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{r.inverter_name}</p>
                      <p className="text-[11px] font-mono text-slate-500 truncate">{r.serial_number}</p>
                    </div>
                    {r.status && <StatusBadge status={r.status} />}
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-red-600">Fault value</p>
                      <p className="text-lg font-black font-mono text-red-700">{faultHex(r)}</p>
                    </div>
                    {r.hw_fault && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">
                        <Cpu size={11} /> HW FAULT
                      </span>
                    )}
                  </div>
                  <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
                    <Clock size={11} /> {fmtDate(r.timestamp)} · {fmtTime(r.timestamp)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ---- Fault history ---- */}
        <section>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h2 className="text-sm font-bold text-slate-900">Fault history</h2>
            <span className="text-xs text-slate-400">({filteredHistory.length})</span>
            {inverterOptions.length > 1 && (
              <select
                value={invFilter}
                onChange={(e) => setInvFilter(e.target.value)}
                className="ml-auto h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700 focus:border-orange-400 focus:outline-none"
              >
                <option value="all">All inverters</option>
                {inverterOptions.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            {/* Fixed-height scroll area — sticky header stays put while up
                to 300 rows scroll underneath it, instead of the page itself
                growing to fit every row. */}
            <div className="overflow-auto max-h-[600px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 font-semibold">Inverter</th>
                    <th className="text-left px-5 py-3 font-semibold">Date</th>
                    <th className="text-left px-5 py-3 font-semibold">Time</th>
                    <th className="text-left px-5 py-3 font-semibold">Fault value</th>
                    <th className="text-center px-5 py-3 font-semibold">HW</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">Loading…</td></tr>
                  ) : filteredHistory.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">No fault events recorded.</td></tr>
                  ) : (
                    filteredHistory.map((r, i) => (
                      <tr key={`${r.inverter_id}-${r.timestamp}-${i}`} className="border-b border-slate-50 hover:bg-slate-50/60 transition">
                        <td className="px-5 py-3">
                          <Link href={`/inverter/${r.inverter_id}`} className="font-semibold text-slate-900 hover:text-orange-600">
                            {r.inverter_name}
                          </Link>
                          <div className="text-[10px] font-mono text-slate-400">{r.serial_number}</div>
                        </td>
                        <td className="px-5 py-3 text-slate-700 whitespace-nowrap">{fmtDate(r.timestamp)}</td>
                        <td className="px-5 py-3 text-slate-700 whitespace-nowrap tabular-nums">{fmtTime(r.timestamp)}</td>
                        <td className="px-5 py-3">
                          <span className="font-mono font-semibold text-red-600">{faultHex(r)}</span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          {r.hw_fault ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">
                              <Cpu size={11} /> HW
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {data?.history_truncated && (
              <p className="border-t border-slate-100 bg-slate-50 px-5 py-2 text-[11px] text-slate-500">
                Showing the most recent {history.length} fault events. Filter by inverter to narrow older entries.
              </p>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
