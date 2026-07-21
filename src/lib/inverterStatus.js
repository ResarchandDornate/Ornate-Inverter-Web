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

export function computeStatus(inv) {
  if (hasActiveFault(inv)) return "fault";

  // Trust the explicit status string first.
  if (inv?.status === "offline") return "offline";
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
