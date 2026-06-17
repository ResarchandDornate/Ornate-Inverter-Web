"use client";

import { useQuery } from "@tanstack/react-query";
import { getData } from "@/lib/api";

// Run async tasks with bounded concurrency. Prevents firing all N×2 requests
// at once which is what was tripping the backend's 429 rate limit.
async function runChunked(items, fn, chunkSize = 4) {
  const out = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const slice = items.slice(i, i + chunkSize);
    const results = await Promise.all(slice.map(fn));
    out.push(...results);
  }
  return out;
}

// One hook for every dashboard page. Per inverter we fire two requests:
//   1) GET /inverter/inverters/<id>/grid_status/  → status, is_online, last_seen, grid_connected
//   2) GET /inverter/inverter-data/?inverter=<id>&ordering=-timestamp&limit=1  → latest telemetry
//
// Pairs run in batches of 4 (not all at once) to stay under the rate limit
// when the fleet is bigger than ~5 inverters.
export function useLiveInverters() {
  return useQuery({
    queryKey: ["liveInverters"],
    queryFn: async () => {
      const res = await getData("/inverter/inverters/");
      const list = res?.results || (Array.isArray(res) ? res : []);
      if (list.length === 0) return [];

      const enriched = await runChunked(list, async (inv) => {
        const [statusRes, dataRes] = await Promise.all([
          getData(`/inverter/inverters/${inv.id}/grid_status/`).catch((e) => {
            console.warn(`[useLiveInverters] status ${inv.id}:`, e?.message);
            return null;
          }),
          getData(
            `/inverter/inverter-data/?inverter=${inv.id}&ordering=-timestamp&limit=1`
          ).catch((e) => {
            console.warn(`[useLiveInverters] data ${inv.id}:`, e?.message);
            return null;
          }),
        ]);

        const latest = (dataRes?.results || [])[0];
        return {
          ...inv,
          status: statusRes?.status ?? null,
          is_online: statusRes?.is_online ?? null,
          last_seen: statusRes?.last_seen ?? null,
          grid_connected: statusRes?.grid_connected ?? latest?.grid_connected ?? null,
          voltage: latest?.voltage ?? null,
          current: latest?.current ?? null,
          power_in: latest?.power_in ?? null,
          power_out: latest?.power_out ?? null,
          vpv: latest?.vpv ?? null,
          ipv: latest?.ipv ?? null,
          delta: latest?.delta ?? null,
          fault_bitmask: latest?.fault_bitmask ?? null,
          temperature: latest?.temperature ?? null,
          last_telemetry_at: latest?.timestamp ?? null,
          _noData: !latest && !statusRes,
        };
      });

      return enriched;
    },
    // Slower poll + long staleTime so navigating between pages doesn't
    // re-fire the request, and refetchOnMount: false ensures shared cache.
    refetchInterval: 15000,
    staleTime: 14000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
