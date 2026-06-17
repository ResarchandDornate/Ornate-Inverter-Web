"use client";

export default function StatusBadge({ status }) {
  const map = {
    online: { dot: "bg-green-500", text: "text-green-700", bg: "bg-green-50", label: "Online" },
    offline: { dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50", label: "Offline" },
    fault: { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", label: "Fault" },
    unknown: { dot: "bg-slate-400", text: "text-slate-600", bg: "bg-slate-100", label: "Unknown" },
  };
  const s = map[status] || map.unknown;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
