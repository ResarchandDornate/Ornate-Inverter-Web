"use client";

import { useQuery } from "@tanstack/react-query";
import { getData } from "@/lib/api";

// Run async tasks with bounded concurrency. Prevents firing all the per-inverter
// requests at once which is what was tripping the backend's 429 rate limit.
async function runChunked(items, fn, chunkSize = 4) {
  const out = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const slice = items.slice(i, i + chunkSize);
    const results = await Promise.all(slice.map(fn));
    out.push(...results);
  }
  return out;
}

// One hook for every dashboard page.
//
// The backend updated /api/inverter/inverters/ to include status fields
// (`status`, `is_online`, `last_seen`, `grid_connected`) directly. That means
// we no longer need a separate /grid_status/ call per inverter — the list
// response carries everything we need for the badge.
//
// We still fetch /inverter-data/?inverter=<id>&limit=1 per inverter to get
// the latest telemetry (voltage, current, power_out, fault_bitmask, …) which
// the list endpoint doesn't include.
//
// Request count per poll for a fleet of N inverters:
//   before: 1 (list) + N (grid_status) + N (latest data) = 2N + 1
//   now:    1 (list) + N (latest data)                   =  N + 1
export function useLiveInverters() {
  return useQuery({
    queryKey: ["liveInverters"],
    queryFn: async () => {
      const res = await getData("/inverter/inverters/");
      const list = res?.results || (Array.isArray(res) ? res : []);
      if (list.length === 0) return [];

      const enriched = await runChunked(list, async (inv) => {
        try {
          const dataRes = await getData(
            `/inverter/inverter-data/?inverter=${inv.id}&ordering=-timestamp&limit=1`
          );
          const latest = (dataRes?.results || [])[0];
          return {
            ...inv,
            // Telemetry from the latest /inverter-data/ record:
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
            _noData: !latest,
            // NOTE: status / is_online / last_seen / grid_connected come from
            // `...inv` above — that's the list response, which now includes
            // them per the backend update. We do NOT overwrite them.
          };
        } catch (err) {
          console.warn(`[useLiveInverters] failed for inverter ${inv.id}:`, err?.message);
          // Preserve the list-response fields even on telemetry failure.
          return { ...inv, _error: err?.message };
        }
      });

      return enriched;
    },
    // 10 s poll — backend's offline threshold is 30 s (6 missed 5-s ESP32
    // messages). Polling faster than that means we catch a flip within one
    // cycle instead of potentially missing an online→offline→online round-trip.
    refetchInterval: 10000,
    staleTime: 9000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
