'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MapPin, AlertTriangle, ExternalLink, Cpu, X } from 'lucide-react';
import { fmt } from '@/components/data-logger/ui';
import { GoogleMap } from '@/components/data-logger/GoogleMap';

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// Deterministic marker positions (percent of map box) per asset index.
const POS = [
  { x: 34, y: 46 },
  { x: 38, y: 52 },
  { x: 58, y: 30 },
  { x: 63, y: 40 },
  { x: 70, y: 55 },
  { x: 48, y: 66 },
  { x: 25, y: 60 },
  { x: 80, y: 34 },
  { x: 55, y: 74 },
];

const MARKER_COLOR = {
  running: '#16a34a',
  stopped: '#f59e0b',
  disconnected: '#94a3b8',
};

export function MapView({ assets }) {
  const [selectedId, setSelectedId] = useState(assets[0]?.id);

  if (!assets.length) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center px-6 text-center text-sm text-muted">
        No assets to map yet. Locations appear once an RMS device publishes its
        heartbeat (with LAT/LONG) over MQTT.
      </div>
    );
  }

  const selected = assets.find((a) => a.id === selectedId) ?? assets[0];

  const running = assets.filter((a) => a.status === 'running').length;
  const stopped = assets.filter((a) => a.status === 'stopped').length;
  const disconnected = assets.filter((a) => a.status === 'disconnected').length;
  const faulty = assets.filter((a) => a.health !== 'ok').length;
  const trip = assets.filter((a) => a.health === 'trip').length;
  const warning = assets.filter((a) => a.health === 'warning').length;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Stat bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line bg-white px-6 py-3 text-sm">
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

      {/* Map + panel */}
      <div className="relative flex min-h-0 flex-1">
        {/* Map (real Google Maps when a key is set, schematic otherwise) */}
        <div className="relative flex-1 overflow-hidden bg-[#e8eef3]">
          {MAPS_KEY ? (
            <GoogleMap
              apiKey={MAPS_KEY}
              assets={assets}
              selectedId={selected.id}
              onSelect={setSelectedId}
            />
          ) : (
            <>
              <SchematicRoads />
              {assets.map((a, i) => {
                const p = POS[i % POS.length];
                const active = a.id === selected.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => setSelectedId(a.id)}
                    className="absolute -translate-x-1/2 -translate-y-full transition-transform hover:scale-110"
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                    title={a.name}
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full rounded-bl-none border-2 border-white shadow-md ${
                        active ? 'ring-2 ring-brand ring-offset-1' : ''
                      }`}
                      style={{ backgroundColor: MARKER_COLOR[a.status] }}
                    >
                      <Cpu className="h-4 w-4 text-white" />
                    </span>
                  </button>
                );
              })}
            </>
          )}

          {/* Legend */}
          <div className="absolute bottom-3 left-3 z-10 flex items-center gap-4 rounded-md bg-white/90 px-3 py-1.5 text-[11px] shadow">
            <LegendDot color="#16a34a" label="Running" />
            <LegendDot color="#f59e0b" label="Stopped" />
            <LegendDot color="#94a3b8" label="Disconnected" />
          </div>
        </div>

        {/* Detail panel */}
        <aside className="flex w-[360px] shrink-0 flex-col border-l border-line bg-white">
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
      </div>
    </div>
  );
}

function SchematicRoads() {
  return (
    <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
      <defs>
        <pattern id="blocks" width="90" height="90" patternUnits="userSpaceOnUse">
          <rect width="90" height="90" fill="#e8eef3" />
          <rect x="6" y="6" width="78" height="78" rx="4" fill="#dfe6ee" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#blocks)" />
      {/* main roads */}
      <path d="M -50 60% Q 40% 40% 120% 20%" stroke="#c3ccd8" strokeWidth="22" fill="none" />
      <path d="M 30% -20 L 45% 120%" stroke="#cfd8e2" strokeWidth="16" fill="none" />
      <path d="M -20 30% L 120% 55%" stroke="#cfd8e2" strokeWidth="12" fill="none" />
      <path d="M -50 60% Q 40% 40% 120% 20%" stroke="#eef2f6" strokeWidth="2" strokeDasharray="8 8" fill="none" />
    </svg>
  );
}

function Stat({ value, label, dot, strong, danger }) {
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
