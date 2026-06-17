"use client";

export default function KpiCard({ label, value, unit, icon: Icon, accent = "orange", trend }) {
  const accents = {
    orange: { bg: "bg-orange-50", text: "text-orange-600", ring: "ring-orange-100" },
    green: { bg: "bg-green-50", text: "text-green-600", ring: "ring-green-100" },
    blue: { bg: "bg-blue-50", text: "text-blue-600", ring: "ring-blue-100" },
    red: { bg: "bg-red-50", text: "text-red-600", ring: "ring-red-100" },
    indigo: { bg: "bg-indigo-50", text: "text-indigo-600", ring: "ring-indigo-100" },
    slate: { bg: "bg-slate-100", text: "text-slate-700", ring: "ring-slate-100" },
  };
  const a = accents[accent] || accents.orange;

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-md transition">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{label}</p>
        {Icon && (
          <div className={`w-9 h-9 rounded-lg ${a.bg} ring-4 ${a.ring} flex items-center justify-center`}>
            <Icon size={18} className={a.text} />
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold text-slate-900">{value}</span>
        {unit && <span className="text-sm text-slate-500 font-medium">{unit}</span>}
      </div>
      {trend && (
        <p className={`text-xs mt-2 ${trend.startsWith("+") ? "text-green-600" : "text-red-600"}`}>
          {trend} vs last hour
        </p>
      )}
    </div>
  );
}
