"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search, RefreshCw, Filter, Plus } from "lucide-react";
import { getData } from "@/lib/api";
import { QUERY_KEYS } from "@/lib/queryKeys";
import Topbar from "@/components/Topbar";
import StatusBadge from "@/components/StatusBadge";

export default function InvertersListPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const { data: inverterData, refetch, isRefetching } = useQuery({
    queryKey: QUERY_KEYS.INVERTERS,
    queryFn: () => getData("/inverter/inverters/"),
    refetchInterval: 10000,
  });
  const { data: summaryData } = useQuery({
    queryKey: QUERY_KEYS.USER_SUMMARY,
    queryFn: () => getData("/inverter/power-generation/user-summary/"),
    refetchInterval: 10000,
  });

  const invertersList = useMemo(
    () => inverterData?.results || (Array.isArray(inverterData) ? inverterData : []),
    [inverterData]
  );

  const inverters = useMemo(() => {
    const summaryMap = new Map();
    (summaryData?.inverters || []).forEach((inv) => summaryMap.set(inv.id, inv));
    return invertersList.map((inv) => ({ ...inv, ...summaryMap.get(inv.id) }));
  }, [invertersList, summaryData]);

  const filtered = useMemo(() => {
    let arr = inverters;
    if (filter === "online") arr = arr.filter((i) => i.grid_connected);
    if (filter === "offline") arr = arr.filter((i) => !i.grid_connected);
    if (filter === "faults") arr = arr.filter((i) => (i.fault_bitmask ?? 0) > 0);

    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(
        (inv) =>
          inv.name?.toLowerCase().includes(q) ||
          inv.serial_number?.toLowerCase().includes(q) ||
          inv.city?.toLowerCase().includes(q)
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
              placeholder="Search by name, serial, city..."
              className="bg-transparent outline-none text-sm ml-2 flex-1"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {["all", "online", "offline", "faults"].map((f) => (
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
                  <th className="text-left px-5 py-3 font-semibold">Inverter</th>
                  <th className="text-left px-5 py-3 font-semibold">Serial No.</th>
                  <th className="text-left px-5 py-3 font-semibold">Location</th>
                  <th className="text-left px-5 py-3 font-semibold">Status</th>
                  <th className="text-right px-5 py-3 font-semibold">Live Power</th>
                  <th className="text-right px-5 py-3 font-semibold">Energy (kWh)</th>
                  <th className="text-right px-5 py-3 font-semibold">Faults</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => {
                  const bitmask = inv.fault_bitmask ?? 0;
                  const status = bitmask > 0 ? "fault" : inv.grid_connected ? "online" : "offline";
                  return (
                    <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                      <td className="px-5 py-3.5">
                        <Link href={`/inverter/${inv.id}`} className="font-semibold text-slate-900 hover:text-orange-600">
                          {inv.name}
                        </Link>
                        <p className="text-xs text-slate-400">ID: {inv.id}</p>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 font-mono text-xs">{inv.serial_number}</td>
                      <td className="px-5 py-3.5 text-slate-700 text-sm">{inv.city || "—"}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={status} /></td>
                      <td className="px-5 py-3.5 text-right text-slate-700">
                        {Number(inv.power_w ?? inv.current_power ?? 0).toFixed(0)} W
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-700 font-semibold">
                        {Number(inv.energy_kwh ?? 0).toFixed(2)}
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
                    <td colSpan={8} className="text-center text-slate-400 py-12 text-sm">
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
