"use client";

import { useEffect, useState } from "react";

const STATUS_MAP = {
  online:  { dot: "bg-green-500",  text: "text-green-700",  bg: "bg-green-50",  label: "Online"  },
  offline: { dot: "bg-red-500",    text: "text-red-700",    bg: "bg-red-50",    label: "Offline" },
  idle:    { dot: "bg-amber-500",  text: "text-amber-700",  bg: "bg-amber-50",  label: "Idle"    },
  fault:   { dot: "bg-orange-500", text: "text-orange-700", bg: "bg-orange-50", label: "Fault"   },
  unknown: { dot: "bg-slate-400",  text: "text-slate-600",  bg: "bg-slate-100", label: "Unknown" },
};

export default function StatusBadge({ status }) {
  // 3-second debounce — prevents rapid online↔offline flicker caused by
  // occasional missed ESP32 MQTT messages triggering the 30-second threshold.
  const [displayStatus, setDisplayStatus] = useState(status);

  useEffect(() => {
    const t = setTimeout(() => setDisplayStatus(status), 3000);
    return () => clearTimeout(t);
  }, [status]);

  const s = STATUS_MAP[displayStatus] || STATUS_MAP.unknown;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
