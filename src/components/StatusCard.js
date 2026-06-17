"use client";

export default function StatusCard({ title, value, unit, icon: Icon, color = "#F59E0B", bgClass = "bg-amber-100", valueColor }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 border border-white ${bgClass}`}>
        {Icon && <Icon size={20} style={{ color }} />}
      </div>
      <div className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">
        {title}
      </div>
      <div className="flex items-baseline">
        <span
          className="text-xl font-black leading-none"
          style={{ color: valueColor || "#111827" }}
        >
          {value}
        </span>
        {unit && <span className="text-[10px] font-bold text-slate-400 ml-1">{unit}</span>}
      </div>
    </div>
  );
}
