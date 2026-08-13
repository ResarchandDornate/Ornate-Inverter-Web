"use client";

import { useQuery } from "@tanstack/react-query";
import { getData } from "@/lib/api";

// One hook for every dashboard page.
//
// The backend's /api/inverter/inverters/ list includes status fields
// (`status`, `is_online`, `last_seen`, `grid_connected`) directly — no
// separate /grid_status/ call per inverter needed.
//
// Latest telemetry (voltage, current, power_out, fault_bitmask, …) comes
// from /inverter/inverters/latest_telemetry/ — ONE bulk request that returns
// every inverter's latest live reading in a single backend query (Postgres
// DISTINCT ON), instead of firing one /inverter-data/ request per inverter.
//
// Request count per poll, independent of fleet size N:
//   before: 1 (list) + N (grid_status) + N (latest data) = 2N + 1
//   then:   1 (list) + N (latest data)                   =  N + 1
//   now:    1 (list) + 1 (bulk latest_telemetry)          =  2
export function useLiveInverters() {
  return useQuery({
    queryKey: ["liveInverters"],
    queryFn: async () => {
      const [listRes, telemetryRes] = await Promise.all([
        getData("/inverter/inverters/"),
        getData("/inverter/inverters/latest_telemetry/").catch((err) => {
          console.warn("[useLiveInverters] latest_telemetry failed:", err?.message);
          return {};
        }),
      ]);
      const list = listRes?.results || (Array.isArray(listRes) ? listRes : []);
      if (list.length === 0) return [];

      // Only treat a reading as CURRENT telemetry if it's fresh — a stale live
      // reading (e.g. the device has since gone to backlog-only) must not
      // show as the current power. Matches the backend online window.
      const LIVE_FRESH_MS = 15 * 60 * 1000;

      return list.map((inv) => {
        const latestRow = telemetryRes?.[String(inv.id)] ?? null;
        const latest =
          latestRow &&
          Date.now() - new Date(latestRow.timestamp).getTime() <= LIVE_FRESH_MS
            ? latestRow
            : null;
        return {
          ...inv,
          // Telemetry from the latest FRESH live reading:
          voltage: latest?.voltage ?? null,
          current: latest?.current ?? null,
          power_in: latest?.power_in ?? null,
          power_out: latest?.power_out ?? null,
          vpv: latest?.vpv ?? null,
          ipv: latest?.ipv ?? null,
          delta: latest?.delta ?? null,
          power_factor: latest?.power_factor ?? null,
          fault_bitmask: latest?.fault_bitmask ?? null,
          hw_fault: latest?.hw_fault ?? null,
          temperature: latest?.temperature ?? null,
          last_telemetry_at: latest?.timestamp ?? null,
          _noData: !latest,
          // NOTE: status / is_online / last_seen / grid_connected come from
          // `...inv` above — that's the list response, which already
          // includes them. We do NOT overwrite them.
        };
      });
    },
    // 10 s poll — backend's offline threshold is 30 s (6 missed 5-s ESP32
    // messages). Polling faster than that means we catch a flip within one
    // cycle instead of potentially missing an online→offline→online round-trip.
    refetchInterval: 10000,
    staleTime: 9000,
    // Always fetch fresh on mount/focus — this hook backs the Dashboard,
    // Inverters list, and Analytics pages, so serving a stale cached snapshot
    // on navigation (or after a backgrounded tab's timers got throttled) is
    // exactly what made the same inverter look different across pages.
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}
