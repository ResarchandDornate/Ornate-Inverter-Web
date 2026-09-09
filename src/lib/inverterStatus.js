import { formatDistanceToNow } from "date-fns";

// Single source of truth for "what is this inverter's status right now?"
//
// Priority (highest → lowest):
//   1. fault       — any non-zero fault_bitmask (visual urgency wins)
//   2. status      — explicit string from /grid_status/ ("online" / "offline" / "idle")
//                    Trust this BEFORE is_online because the backend's
//                    "offline after 10+ min of zeros" check lives here.
//   3. is_online   — boolean fallback if `status` is missing
//   4. grid_connected — last-resort fallback for very old records
//
// Note: we do NOT use `last_seen` to determine online/offline — the backend's
// note says last_seen can be recent even when status is offline (zero-power
// MQTT messages still arrive but they don't count as "alive").
// `fault_bitmask` arrives as a canonical hex string ("0x0000001F") from current
// firmware, or as a plain integer for older records. Number() parses both
// ("0x1F" → 31, "0" → 0, 5 → 5); anything unparseable is treated as no-fault.
export function parseFaultBitmask(raw) {
  if (raw === null || raw === undefined || raw === "") return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

// `hw_fault` (1/0/bool) is a dedicated hardware-fault flag added 2026-07-21 —
// it can be set even when the fault bitmask is zero.
export function isHwFault(inv) {
  return inv?.hw_fault === true || inv?.hw_fault === 1;
}

// Any active fault: a non-zero bitmask OR the hardware-fault flag.
export function hasActiveFault(inv) {
  return parseFaultBitmask(inv?.fault_bitmask) > 0 || isHwFault(inv);
}

// Display form of the fault mask — keep the backend's hex string verbatim,
// else format an integer as 0x-prefixed uppercase hex.
export function formatFaultBitmask(raw) {
  if (typeof raw === "string" && raw.trim().toLowerCase().startsWith("0x")) {
    return "0x" + raw.trim().slice(2).toUpperCase();
  }
  return "0x" + parseFaultBitmask(raw).toString(16).toUpperCase();
}

// Statuses that mean "current live data is flowing" — the healthy state.
// The backend now emits "live"; "online" is kept for backward compatibility
// with older payloads / cached records.
export const LIVE_STATUSES = ["live", "online"];
export function isLive(inv) {
  return LIVE_STATUSES.includes(computeStatus(inv));
}
// The device is connected and actively reporting (either live OR replaying its
// offline backlog, OR pinging with an unsynced clock). Used where "is it
// talking to us right now?" matters — as opposed to "is valid data landing?"
export function isReportingStatus(status) {
  return status === "live" || status === "online" || status === "recovering" || status === "unsynced";
}

export function computeStatus(inv) {
  if (hasActiveFault(inv)) return "fault";

  // Trust the explicit status string first.
  if (inv?.status === "offline") return "offline";
  // "unsynced" — device is pinging right now but its clock isn't synced, so
  // nothing it sends is being stored. Distinct from "live" (data IS landing).
  if (inv?.status === "unsynced") return "unsynced";
  // "recovering" — device reconnected and is replaying its offline backlog;
  // it hasn't caught up to live data yet.
  if (inv?.status === "recovering") return "recovering";
  // "live" — current data flowing (the backend's new name for "online").
  if (inv?.status === "live") return "live";
  if (inv?.status === "idle") return "idle";
  if (inv?.status === "online") return "online";

  // No `status` set → fall back to is_online boolean.
  if (inv?.is_online === false) return "offline";
  if (inv?.is_online === true) return "online";

  // Final fallback for legacy records without status / is_online.
  if (inv?.grid_connected === false) return "offline";
  if (inv?.grid_connected === true) return "online";

  return "unknown";
}

// "5 minutes ago" / "2 hours ago" / "—"
export function formatLastSeen(iso) {
  if (!iso) return "—";
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "—";
  }
}

// Where the unit is installed, as one line. `address` is the full site line and
// `city` the town; both are shown, but the city is dropped when the address
// already names it — otherwise sites read "…, Pune 413216, Pune". Returns null
// when the backend has neither, so callers can choose their own placeholder.
export function formatLocation(inv) {
  const address = inv?.address?.trim();
  const city = inv?.city?.trim();
  if (address && city) {
    return address.toLowerCase().includes(city.toLowerCase())
      ? address
      : `${address}, ${city}`;
  }
  return address || city || null;
}

// ---------------------------------------------------------------------------
// Sites
//
// The backend has no site/plant field — hopeCloud groups devices under a Plant,
// this API does not — so a "site" is derived from where the unit is installed.
// `city` is the natural site name; the street address stands in for records
// that only carry one. Units with neither fall into a single bucket rather than
// disappearing from a site-scoped view.
// ---------------------------------------------------------------------------

export const UNASSIGNED_SITE = "Unassigned";

export function siteOf(inv) {
  return inv?.city?.trim() || inv?.address?.trim() || UNASSIGNED_SITE;
}

// Distinct sites in a fleet, alphabetical, with "Unassigned" pinned last.
export function listSites(inverters = []) {
  const seen = new Set();
  inverters.forEach((inv) => seen.add(siteOf(inv)));
  return [...seen].sort((a, b) => {
    if (a === UNASSIGNED_SITE) return 1;
    if (b === UNASSIGNED_SITE) return -1;
    return a.localeCompare(b);
  });
}
