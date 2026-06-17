"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, LogOut, RefreshCw, Loader2, Sun, Zap } from "lucide-react";
import { getData } from "@/lib/api";
import { clearToken, isAuthenticated } from "@/lib/auth";
import { showSuccess, showError, extractApiMessage } from "@/lib/toast";
import { QUERY_KEYS } from "@/lib/queryKeys";
import InverterCard from "@/components/InverterCard";

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // Auth gate — boot the user back to /login if there's no token.
  useEffect(() => {
    if (!isAuthenticated()) router.replace("/login");
  }, [router]);

  const {
    data: inverterData,
    isLoading: loadingInverters,
    refetch: refetchInverters,
    isRefetching: refreshingInverters,
  } = useQuery({
    queryKey: QUERY_KEYS.INVERTERS,
    queryFn: () => getData("/inverter/inverters/"),
    refetchInterval: 10000,
  });

  const { data: summaryData } = useQuery({
    queryKey: QUERY_KEYS.USER_SUMMARY,
    queryFn: () => getData("/inverter/power-generation/user-summary/"),
    refetchInterval: 10000,
  });

  const invertersList = useMemo(() => {
    return inverterData?.results || (Array.isArray(inverterData) ? inverterData : []);
  }, [inverterData]);

  // Enrich with grid_connected from the summary data
  const inverters = useMemo(() => {
    const summaryMap = new Map();
    (summaryData?.inverters || []).forEach((inv) => summaryMap.set(inv.id, inv));
    return invertersList.map((inv) => ({
      ...inv,
      ...summaryMap.get(inv.id),
    }));
  }, [invertersList, summaryData]);

  const filteredInverters = useMemo(() => {
    if (!searchQuery) return inverters;
    const q = searchQuery.toLowerCase();
    return inverters.filter(
      (inv) =>
        inv.name?.toLowerCase().includes(q) ||
        inv.serial_number?.toLowerCase().includes(q) ||
        inv.city?.toLowerCase().includes(q)
    );
  }, [inverters, searchQuery]);

  const handleLogout = () => {
    if (!confirm("Are you sure you want to logout?")) return;
    clearToken();
    showSuccess("Logged out successfully");
    router.replace("/login");
  };

  const totalEnergy = summaryData?.total_energy_kwh ?? 0;
  const totalPower = summaryData?.total_power_w ?? 0;
  const onlineCount = inverters.filter((i) => i.grid_connected).length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm rounded-b-3xl">
        <div className="max-w-5xl mx-auto px-5 pt-4 pb-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center border border-orange-200">
                <Sun size={20} className="text-orange-500" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase">
                  Welcome back
                </p>
                <h1 className="text-lg font-bold text-slate-800">Inverter Dashboard</h1>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <StatTile label="Online" value={`${onlineCount}/${inverters.length}`} accent="text-green-600" />
            <StatTile label="Power" value={`${Number(totalPower).toFixed(0)} W`} accent="text-orange-600" />
            <StatTile label="Energy" value={`${Number(totalEnergy).toFixed(2)} kWh`} accent="text-blue-600" />
          </div>

          {/* Search */}
          <div className="flex items-center border border-slate-200 rounded-xl px-4 bg-slate-50">
            <Search size={18} className="text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, serial, city..."
              className="flex-1 ml-3 py-3 bg-transparent outline-none text-slate-800"
            />
            <button
              onClick={() => refetchInverters()}
              className="text-slate-500 hover:text-orange-500"
              title="Refresh"
            >
              <RefreshCw
                size={18}
                className={refreshingInverters ? "animate-spin" : ""}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-5xl mx-auto px-5 py-6">
        {loadingInverters && !inverters.length ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-orange-500" />
            <p className="text-sm text-slate-500 mt-3">Loading inverters…</p>
          </div>
        ) : filteredInverters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="bg-slate-100 p-6 rounded-full mb-4">
              <Zap size={36} className="text-slate-400" />
            </div>
            <h3 className="text-slate-800 font-bold text-lg mb-2">
              {searchQuery ? "No matches" : "No inverters yet"}
            </h3>
            <p className="text-slate-500 text-sm">
              {searchQuery
                ? "Try a different search term."
                : "Add an inverter from your admin panel to see it here."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredInverters.map((inv) => (
              <InverterCard key={inv.id} inverter={inv} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function StatTile({ label, value, accent = "text-slate-800" }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
        {label}
      </p>
      <p className={`font-black text-sm md:text-base mt-1 ${accent}`}>{value}</p>
    </div>
  );
}
