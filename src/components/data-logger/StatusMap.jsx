'use client';

import { useState } from 'react';
import { GoogleMap } from '@/components/data-logger/GoogleMap';
import { FreeMap } from '@/components/data-logger/FreeMap';

// Optional — only needed for the paid Google Maps tiles. Unset by default,
// so the map falls back to FreeMap (Leaflet + OpenStreetMap, no key/billing).
const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// Compact, read-only installation map for the Site View dashboard — a
// slimmed-down sibling of MapView.jsx (no side panel / stat bar), so the
// dashboard can show fleet locations at a glance with a link to the full map.
export function StatusMap({ assets }) {
  const [selectedId, setSelectedId] = useState(assets[0]?.id);

  // The map always renders — pins simply appear once an installation reports
  // a GPS location.
  return (
    <div className="relative h-full w-full overflow-hidden rounded-b-xl bg-[#e8eef3]">
      {MAPS_KEY ? (
        <GoogleMap apiKey={MAPS_KEY} assets={assets} selectedId={selectedId} onSelect={setSelectedId} />
      ) : (
        <FreeMap assets={assets} selectedId={selectedId} onSelect={setSelectedId} />
      )}

      {!assets.length && (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-4">
          <span className="rounded-md bg-white/90 px-3 py-1.5 text-center text-[11px] text-muted shadow">
            No installations yet — pins appear here once a device reports its GPS location.
          </span>
        </div>
      )}
    </div>
  );
}
