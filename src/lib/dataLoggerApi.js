// REST client for the Data Logger's FastAPI backend — a SEPARATE backend from
// the inverter portal's Django API (@/lib/api). Set NEXT_PUBLIC_DATALOGGER_API_URL
// to the deployed data-logger backend; defaults to local dev on :3001.
//
// All data is live (MQTT-ingested); these helpers degrade to empty/zeroed
// shapes when the backend is unreachable so the pages still render (blank)
// instead of crashing. Runs server-side (server components) — no auth header.

const BASE = process.env.NEXT_PUBLIC_DATALOGGER_API_URL || "http://localhost:3001";

async function get(path, fallback) {
  try {
    const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
    if (!res.ok) return fallback;
    return await res.json();
  } catch {
    return fallback;
  }
}

export const EMPTY_SUMMARY = {
  company: "Ornate Solar Pvt Ltd",
  siteName: "Solar Monitoring Site",
  sustainability: { totalSolarGenerated: 0, co2Saved: 0, treesPlanted: 0 },
  consumption: { site: 0, solar: 0, mains: 0, dg1: 0, dg2: 0 },
  trend: [],
};

export const EMPTY_FLEET = {
  totalAssets: 0, running: 0, stopped: 0, disconnected: 0,
  devices: 0, online: 0, offline: 0,
};

export function getSiteSummary() {
  return get("/api/site/summary", EMPTY_SUMMARY);
}

export function getFleetStats() {
  return get("/api/fleet/stats", EMPTY_FLEET);
}

export function getAssets() {
  return get("/api/assets", []);
}

export function getMapAssets() {
  return get("/api/map/assets", []);
}

export function getAsset(id) {
  return get(`/api/assets/${encodeURIComponent(id)}`, null);
}
