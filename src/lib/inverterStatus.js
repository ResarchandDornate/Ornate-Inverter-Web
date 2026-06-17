import { formatDistanceToNow } from "date-fns";

// Single source of truth for "what is this inverter's status right now?"
// Priority: fault > idle > online > offline > unknown.
export function computeStatus(inv) {
  const bitmask = Number(inv?.fault_bitmask ?? 0);
  if (bitmask > 0) return "fault";
  if (inv?.status === "idle") return "idle";
  if (inv?.is_online === true || inv?.status === "online") return "online";
  if (inv?.is_online === false || inv?.status === "offline" || inv?.grid_connected === false) return "offline";
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
