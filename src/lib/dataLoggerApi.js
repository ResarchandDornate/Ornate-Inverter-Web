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

// Solar-shaped 24h curve (0 overnight, peaking near noon) for the demo asset's chart.
const DEMO_HOURLY = Array.from({ length: 24 }, (_, h) => ({
  time: `${String(h).padStart(2, "0")}:00`,
  value: Math.round(7800 * Math.max(0, Math.sin(((h - 6) / 12) * Math.PI))),
}));

// Local dev-only sample asset so the UI (asset list, detail view, map) has
// something to render before the real Data Logger backend is wired up.
// Never used in production — see isDev guards below.
const DEMO_ASSET = {
  id: "demo-fronius-okhla",
  name: "Fronius Inverter — Okhla",
  make: "Fronius",
  model: "Fronius Symo 10.0-3-M",
  serial: "FR2026-118824",
  status: "running",
  health: "ok",
  location: {
    lat: 28.535,
    lng: 77.2807,
    label: "Ornate Solar, A-87, Okhla Phase-2, New Delhi, 110020",
  },
  energy: { today: 42.6, todayDelta: 3.8, month: 986.4, year: 8420.7 },
  kw: 7.8,
  ampere: 14.2,
  voltage: 415,
  parameters: [
    { label: "AC Power", value: 7800, unit: "W" },
    { label: "DC Voltage", value: 620, unit: "V" },
    { label: "AC Voltage", value: 415, unit: "V" },
    { label: "Frequency", value: 50.0, unit: "Hz" },
    { label: "Temperature", value: 38.5, unit: "°C" },
  ],
  hourly: DEMO_HOURLY,
};

const DEMO_FLEET = { totalAssets: 1, running: 1, stopped: 0, disconnected: 0, devices: 1, online: 1, offline: 0 };

const isDev = process.env.NODE_ENV !== "production";

export function getSiteSummary() {
  return get("/api/site/summary", EMPTY_SUMMARY);
}

export function getFleetStats() {
  return get("/api/fleet/stats", isDev ? DEMO_FLEET : EMPTY_FLEET);
}

export function getAssets() {
  return get("/api/assets", isDev ? [DEMO_ASSET] : []);
}

export function getMapAssets() {
  return get("/api/map/assets", isDev ? [DEMO_ASSET] : []);
}

export function getAsset(id) {
  return get(`/api/assets/${encodeURIComponent(id)}`, isDev && id === DEMO_ASSET.id ? DEMO_ASSET : null);
}
