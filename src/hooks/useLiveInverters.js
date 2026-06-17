"use client";

import { useQuery } from "@tanstack/react-query";
import { getData } from "@/lib/api";

// One hook for every dashboard page. Fetches:
//   1) GET /api/inverter/inverters/                                        → metadata for every inverter
//   2) GET /api/inverter/inverter-data/?inverter=ID&ordering=-timestamp&limit=1  → latest telemetry
//
// We use `/inverter-data/` rather than `/inverters/<id>/status/` because the
// docs spell out the inverter-data response shape exactly — `grid_connected`,
// `power_out`, `fault_bitmask`, etc. — while `/status/`'s shape isn't documented
// and was silently returning errors (which our catch flagged as "offline").
//
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
            const dataRes = await getData(
              `/inverter/inverter-data/?inverter=${inv.id}&ordering=-timestamp&limit=1`
            );
            const latest = (dataRes?.results || [])[0];

            if (!latest) {
              // No telemetry rows for this inverter yet.
              return { ...inv, grid_connected: null, _noData: true };
            }
            return { ...inv, ...latest, _noData: false };
          } catch (err) {
            console.warn(`[useLiveInverters] failed for inverter ${inv.id}:`, err?.message);
            return { ...inv, grid_connected: null, _error: err?.message };
          }
        })
      );
      return enriched;
    },
    refetchInterval: 10000,
  });
}
