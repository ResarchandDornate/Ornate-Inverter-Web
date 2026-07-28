"use client";

// Small Bar | Line segmented toggle shared across every chart page so the
// control looks and behaves identically everywhere.
export default function ChartTypeToggle({ value, onChange, className = "" }) {
  const opts = [
    { id: "bar", label: "Bar" },
    { id: "line", label: "Line" },
  ];
  return (
    <div className={`flex gap-1 bg-slate-100 rounded-lg p-1 ${className}`}>
      {opts.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`text-xs px-3 py-1.5 rounded-md font-semibold whitespace-nowrap ${
            value === t.id
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
