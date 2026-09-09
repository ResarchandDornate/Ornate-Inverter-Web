"use client";

import { formatParam } from "@/lib/telemetryParams";

const TONE = {
  good: "text-emerald-600",
  bad: "text-red-600",
  neutral: "text-slate-900",
};

/**
 * One group of telemetry parameters as a labelled tile grid.
 * Values come straight off the latest MQTT row via the shared dictionary,
 * so adding a parameter is a one-line change in lib/telemetryParams.js.
 */
export default function ParameterGrid({ group, row }) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-900">{group.label}</h3>
        {group.caption && (
          <p className="text-xs text-slate-500 mt-0.5">{group.caption}</p>
        )}
      </div>

      {/* Cells flex to fill each row, so a group of 5 doesn't leave one value
          stranded on a row of its own the way a fixed column count does. */}
      <div className="flex flex-wrap">
        {group.params.map((param) => {
          const v = formatParam(param, row);
          return (
            <div
              key={param.key}
              className="min-w-40 flex-1 border-r border-slate-100 px-5 py-4 last:border-r-0"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {param.label}
              </p>
              <p
                className={`mt-1 text-lg font-bold tabular-nums ${
                  v.missing ? "text-slate-300" : TONE[v.tone]
                } ${v.mono ? "font-mono text-sm" : ""}`}
              >
                {v.text}
                {v.unit ? (
                  <span className="ml-1 text-xs font-medium text-slate-400">{v.unit}</span>
                ) : null}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
