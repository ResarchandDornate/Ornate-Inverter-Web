'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MapPin, AlertTriangle, ExternalLink, Cpu, X } from 'lucide-react';
import { fmt } from '@/components/data-logger/ui';
import { GoogleMap } from '@/components/data-logger/GoogleMap';
import { FreeMap } from '@/components/data-logger/FreeMap';

// Optional — only needed for the paid Google Maps tiles. Unset by default,
// so the map falls back to FreeMap (Leaflet + OpenStreetMap, no key/billing).
const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export function MapView({ assets }) {
  const [selectedId, setSelectedId] = useState(assets[0]?.id);

  // The map itself always renders — it just has no pins to show yet. Markers
  // (and the detail panel below) appear automatically once an installation
  // reports a GPS heartbeat.
  const selected = assets.find((a) => a.id === selectedId) ?? assets[0] ?? null;

  const running = assets.filter((a) => a.status === 'running').length;
  const stopped = assets.filter((a) => a.status === 'stopped').length;
  const disconnected = assets.filter((a) => a.status === 'disconnected').length;
  const faulty = assets.filter((a) => a.health !== 'ok').length;
  const trip = assets.filter((a) => a.health === 'trip').length;
  const warning = assets.filter((a) => a.health === 'warning').length;

  return (
    <div className="flex min-h-[calc(100vh-4.5rem)] flex-col">
      {/* Stat bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line bg-white px-4 py-3 text-sm sm:px-6">
        <Stat value={assets.length} label="Total Assets" strong />
        <span className="h-6 w-px bg-line" />
        <Stat value={running} label="Running" dot="#16a34a" />
        <Stat value={stopped} label="Stopped" dot="#f59e0b" />
        <Stat value={disconnected} label="Disconnected" dot="#94a3b8" />
        <span className="h-6 w-px bg-line" />
        <Stat value={faulty} label="Faulty Assets" strong danger />
        <Stat value={trip} label="Trip" dot="#dc2626" />
        <Stat value={warning} label="Warning" dot="#f59e0b" />
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-muted">
          Cluster View
          <span className="relative inline-block h-4 w-8 rounded-full bg-line">
            <span className="absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white shadow" />
          </span>
        </label>
      </div>

      {/* Map + panel — side by side on desktop, stacked on mobile/tablet */}
      <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Map — real Google Maps tiles when a paid key is set, otherwise the
            free Leaflet + OpenStreetMap map (no key, no billing). */}
        <div className="relative min-h-[45vh] flex-1 overflow-hidden bg-[#e8eef3] lg:min-h-0">
          {MAPS_KEY ? (
            <GoogleMap
              apiKey={MAPS_KEY}
              assets={assets}
              selectedId={selected?.id}
              onSelect={setSelectedId}
            />
          ) : (
            <FreeMap assets={assets} selectedId={selected?.id} onSelect={setSelectedId} />
          )}

          {!assets.length && (
            <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-4">
              <span className="rounded-md bg-white/90 px-3 py-1.5 text-center text-[11px] text-muted shadow">
                No installations yet — pins appear here once a device reports its GPS location.
              </span>
            </div>
          )}

          {/* Legend — only meaningful once there are pins to explain */}
          {assets.length > 0 && (
            <div className="absolute bottom-3 left-3 z-10 flex items-center gap-4 rounded-md bg-white/90 px-3 py-1.5 text-[11px] shadow">
              <LegendDot color="#16a34a" label="Running" />
              <LegendDot color="#f59e0b" label="Stopped" />
              <LegendDot color="#94a3b8" label="Disconnected" />
            </div>
          )}
        </div>

        {/* Detail panel — only once an asset is selectable */}
        {selected && (
          <aside className="flex w-full shrink-0 flex-col border-t border-line bg-white lg:w-90 lg:border-l lg:border-t-0">
            <div className="flex items-start gap-3 border-b border-line p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-good/10">
                <Cpu className="h-4 w-4 text-good" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-ink">{selected.name}</div>
                <div className="text-[11px] text-muted">14 Jul 2026, 12:42</div>
              </div>
              <button className="ml-auto text-muted hover:text-ink" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-line p-4">
              <div className="mb-2 text-xs font-medium text-muted">Quick Links</div>
              <Link
                href={`/data-logger/assets/${selected.id}`}
                className="flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Detailed View
              </Link>
              <div className="mt-3 flex items-start gap-1.5 text-xs text-muted">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>Current Location: {selected.location.label}</span>
              </div>
              {selected.health !== 'ok' && (
                <div className="mt-2 flex items-center gap-1.5 rounded-md bg-danger/10 px-2 py-1 text-xs font-medium text-danger">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {selected.health === 'trip'
                    ? 'DC Over Voltage'
                    : selected.health === 'warning'
                      ? 'Grid Voltage High'
                      : 'Communication Fault'}
                  <span className="text-muted">· +5 more fault</span>
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {selected.parameters.map((p) => (
                <div
                  key={p.label}
                  className="flex items-center justify-between border-b border-line px-4 py-2.5 text-sm"
                >
                  <span className="text-muted">{p.label}</span>
                  <span className="font-medium text-ink">
                    {typeof p.value === 'number' ? fmt(p.value) : p.value} {p.unit}
                  </span>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function Stat({ value, label, dot, danger }) {
  return (
    <div className="flex items-center gap-2">
      {dot && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dot }} />}
      <span className={`text-lg font-semibold ${danger ? 'text-danger' : 'text-ink'}`}>{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
