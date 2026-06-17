"use client";

import { useQuery } from "@tanstack/react-query";
import { getData } from "@/lib/api";

// One hook for every dashboard page. Fetches:
//   1) GET /api/inverter/inverters/         → metadata for every inverter
//   2) GET /api/inverter/inverters/<id>/status/  → latest telemetry per inverter
//
// Returns a flat array of { ...metadata, ...latestTelemetry } objects.
// Re-fetches every 10 seconds so every page that uses it stays live.
export function useLiveInverters() {
  return useQuery({
    queryKey: ["liveInverters"],
    queryFn: async () => {
      const res = await getData("/inverter/inverters/");
      const list = res?.results || (Array.isArray(res) ? res : []);
      if (list.length === 0) return [];

      const enriched = await Promise.all(
        list.map(async (inv) => {
          try {
            const status = await getData(`/inverter/inverters/${inv.id}/status/`);
            return { ...inv, ...status };
          } catch {
            // Inverter is unreachable — keep metadata, flag offline.
            return { ...inv, grid_connected: false };
          }
        })
      );
      return enriched;
    },
    refetchInterval: 10000,
  });
}
