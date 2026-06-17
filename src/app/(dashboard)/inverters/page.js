"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, RefreshCw, Plus } from "lucide-react";
import Topbar from "@/components/Topbar";
import StatusBadge from "@/components/StatusBadge";
import { useLiveInverters } from "@/hooks/useLiveInverters";
import { computeStatus, formatLastSeen } from "@/lib/inverterStatus";

export default function InvertersListPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const { data: inverters = [], refetch, isRefetching } = useLiveInverters();

  const filtered = useMemo(() => {
    let arr = inverters;
    if (filter === "online") arr = arr.filter((i) => computeStatus(i) === "online");
    if (filter === "offline") arr = arr.filter((i) => computeStatus(i) === "offline");
    if (filter === "idle") arr = arr.filter((i) => computeStatus(i) === "idle");
    if (filter === "faults") arr = arr.filter((i) => computeStatus(i) === "fault");

    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(
        (inv) =>
          inv.name?.toLowerCase().includes(q) ||
          inv.serial_number?.toLowerCase().includes(q) ||
          inv.address?.toLowerCase().includes(q) ||
          inv.model?.toLowerCase().includes(q)
      );
    }
    return arr;
  }, [inverters, search, filter]);

  return (
    <>
      <Topbar title="Inverters" breadcrumbs={["Dashboard", "Inverters"]} />
      <main className="flex-1 px-6 py-6 max-w-[1600px] w-full">
        {/* Toolbar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-100 rounded-lg px-3 py-2 flex-1 min-w-[220px]">
            <Search size={16} className="text-slate-400 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, serial, address, model..."
              className="bg-transparent outline-none text-sm ml-2 flex-1"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {["all", "online", "idle", "offline", "faults"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-md font-semibold capitalize ${
                  filter === f
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            title="Refresh"
          >
            <RefreshCw size={16} className={isRefetching ? "animate-spin" : ""} />
          </button>

          <button className="hidden sm:flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg">
            <Plus size={16} /> Add Inverter
          </button>
        </div>

        {/* Results table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-center px-5 py-3 font-semibold">Inverter</th>
                  <th className="text-center px-5 py-3 font-semibold">Serial No.</th>
                  <th className="text-center px-5 py-3 font-semibold">Model</th>
                  <th className="text-center px-5 py-3 font-semibold">Status</th>
                  <th className="text-center px-5 py-3 font-semibold">Last Seen</th>
                  <th className="text-center px-5 py-3 font-semibold">Power Out (W)</th>
                  <th className="text-center px-5 py-3 font-semibold">Voltage</th>
                  <th className="text-center px-5 py-3 font-semibold">Temp</th>
                  <th className="text-center px-5 py-3 font-semibold">Faults</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => {
                  const bitmask = Number(inv.fault_bitmask ?? 0);
                  const status = computeStatus(inv);
                  return (
                    <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                      <td className="px-5 py-3.5">
                        <Link href={`/inverter/${inv.id}`} className="font-semibold text-slate-900 hover:text-orange-600">
                          {inv.name}
                        </Link>
                        <p className="text-xs text-slate-400">ID: {inv.id}</p>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 font-mono text-xs">{inv.serial_number}</td>
                      <td className="px-5 py-3.5 text-slate-700 text-xs">{inv.model || "—"}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={status} /></td>
                      <td className="px-5 py-3.5 text-center text-slate-500 text-xs">
                        {formatLastSeen(inv.last_seen)}
                      </td>
                      <td className="px-5 py-3.5 text-center text-slate-700 font-semibold">
                        {Number(inv.power_out ?? 0).toFixed(0)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-700">
                        {inv.voltage != null ? `${Number(inv.voltage).toFixed(1)} V` : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-700">
                        {inv.temperature != null ? `${Number(inv.temperature).toFixed(1)} °C` : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {bitmask > 0 ? (
                          <span className="text-xs font-mono font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                            0x{bitmask.toString(16).toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/inverter/${inv.id}`}
                          className="text-xs font-semibold text-orange-600 hover:underline"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length && (
                  <tr>
                    <td colSpan={10} className="text-center text-slate-400 py-12 text-sm">
                      No inverters match your filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Showing {filtered.length} of {inverters.length}</span>
            <span>Auto-refreshes every 10s</span>
          </div>
        </div>
      </main>
    </>
  );
}
