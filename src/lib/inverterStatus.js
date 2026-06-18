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
export function computeStatus(inv) {
  const bitmask = Number(inv?.fault_bitmask ?? 0);
  if (bitmask > 0) return "fault";

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
