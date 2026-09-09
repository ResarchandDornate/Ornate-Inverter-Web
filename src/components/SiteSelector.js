"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, Layers, MapPin } from "lucide-react";
import { useLiveInverters } from "@/hooks/useLiveInverters";
import { useSiteFilter, ENTIRE_FLEET } from "@/hooks/useSiteFilter";
import { listSites, siteOf } from "@/lib/inverterStatus";

/**
 * Fleet scope selector for the operator console.
 *
 * Sites come from the fleet list itself — the API has no site or plant record,
 * so the options are whatever locations the inverters actually report. That
 * means the menu is empty of real sites until `city`/`address` are populated on
 * the inverter records, and shows a single "Unassigned" group until then.
 */
export default function SiteSelector() {
  const { data: inverters = [] } = useLiveInverters();
  const [site, setSite] = useSiteFilter();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const sites = listSites(inverters);
  const countFor = (name) => inverters.filter((inv) => siteOf(inv) === name).length;

  // A stored site that no longer exists in the fleet would silently filter
  // everything away, so fall back to the whole fleet in the label.
  const known = site && sites.includes(site);
  const label = known ? site : "Sites";

  const choose = (value) => {
    setSite(value);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 pl-3 pr-2.5 py-2 rounded-lg border text-sm transition ${
          open
            ? "bg-slate-100 border-slate-300"
            : "bg-white border-slate-200 hover:bg-slate-50"
        }`}
        title="Scope every page to one site"
      >
        {known ? (
          <MapPin size={15} className="text-orange-500 shrink-0" />
        ) : (
          <Layers size={15} className="text-slate-400 shrink-0" />
        )}
        <span className="font-semibold text-slate-800 truncate max-w-44">{label}</span>
        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-30 max-h-80 overflow-y-auto">
          <SiteOption
            icon={<Layers size={15} className="text-slate-400" />}
            label="Sites"
            count={inverters.length}
            selected={!known}
            onClick={() => choose(ENTIRE_FLEET)}
          />

          {sites.length > 0 && <div className="my-1 border-t border-slate-100" />}

          {sites.map((name) => (
            <SiteOption
              key={name}
              icon={<MapPin size={15} className="text-slate-400" />}
              label={name}
              count={countFor(name)}
              selected={known && site === name}
              onClick={() => choose(name)}
            />
          ))}

          {inverters.length === 0 && (
            <p className="px-4 py-3 text-xs text-slate-400">No inverters loaded yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

function SiteOption({ icon, label, count, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 hover:bg-slate-50 ${
        selected ? "text-orange-600 font-semibold" : "text-slate-700"
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      <span className="text-[11px] text-slate-400 shrink-0">{count}</span>
      {selected && <Check size={14} className="text-orange-500 shrink-0" />}
    </button>
  );
}
