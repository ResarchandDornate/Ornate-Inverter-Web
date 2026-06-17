"use client";

import { useQuery } from "@tanstack/react-query";
import { getData } from "@/lib/api";

// One hook for every dashboard page.
//
// CRITICAL: when merging the latest telemetry record into the inverter object,
// we MUST NOT spread the record's `id` over the inverter's `id`. The two are
// different identifiers:
//   - inv.id   = inverter id (e.g. 2125)        — used in /inverters/<id>/, links, queries
//   - latest.id = record id  (e.g. 138828)      — only useful for the data row itself
// Spreading them together would make every Open link go to /inverter/138828
// and every subsequent query hit `?inverter=138828`, which 400s.
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
              return { ...inv, grid_connected: null, _noData: true };
            }

            // Explicitly pick the telemetry fields only — DO NOT spread `latest`
            // wholesale (would overwrite inv.id with the record id).
            return {
              ...inv,
              voltage: latest.voltage,
              current: latest.current,
              power_in: latest.power_in,
              power_out: latest.power_out,
              vpv: latest.vpv,
              ipv: latest.ipv,
              delta: latest.delta,
              fault_bitmask: latest.fault_bitmask,
              temperature: latest.temperature,
              grid_connected: latest.grid_connected,
              last_telemetry_at: latest.timestamp,
              _noData: false,
            };
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
