'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

// Free, key-less interactive map — Leaflet + OpenStreetMap tiles. No API key,
// no billing account, no request quota. Used instead of GoogleMap.jsx unless
// NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is explicitly set.
const MARKER_COLOR = {
  running: '#16a34a',
  stopped: '#f59e0b',
  disconnected: '#94a3b8',
};

export function FreeMap({ assets, selectedId, onSelect, defaultCenter = [12.808, 77.69], defaultZoom = 12 }) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  const markersRef = useRef(new Map());
  const terminatorRef = useRef(null);

  // Init map + markers once.
  useEffect(() => {
    let cancelled = false;
    let terminatorTimer = null;

    Promise.all([import('leaflet'), import('@joergdietrich/leaflet.terminator')]).then(
      ([mod, terminatorMod]) => {
        const L = mod.default ?? mod;
        const terminator = terminatorMod.default ?? terminatorMod;
        if (cancelled || !ref.current || mapRef.current) return;
        leafletRef.current = L;

        // No on-screen +/- buttons — zoom is manual only (scroll wheel /
        // pinch / double-click), all enabled by default.
        const map = L.map(ref.current, { attributionControl: true, zoomControl: false }).setView(
          defaultCenter,
          defaultZoom
        );
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);
        mapRef.current = map;

        // Day/night terminator — shades the half of the world currently in
        // darkness, computed from real sun position (not local timezones, so
        // it's correct regardless of where the viewer is). Refreshes every
        // minute to track the Earth's rotation.
        const sunlight = terminator({ fillOpacity: 0.25 }).addTo(map);
        terminatorRef.current = sunlight;
        terminatorTimer = setInterval(() => sunlight.setTime(), 60 * 1000);

        const bounds = [];
        assets.forEach((a) => {
          const pos = [a.location.lat, a.location.lng];
          const marker = L.circleMarker(pos, {
            radius: a.id === selectedId ? 11 : 8,
            fillColor: MARKER_COLOR[a.status] ?? '#94a3b8',
            fillOpacity: 1,
            color: a.id === selectedId ? '#2f6fed' : '#ffffff',
            weight: a.id === selectedId ? 3 : 2,
          }).addTo(map);
          marker.bindTooltip(a.name, { direction: 'top' });
          marker.on('click', () => onSelect(a.id));
          markersRef.current.set(a.id, marker);
          bounds.push(pos);
        });
        if (bounds.length) map.fitBounds(bounds, { padding: [40, 40] });
      }
    );

    return () => {
      cancelled = true;
      if (terminatorTimer) clearInterval(terminatorTimer);
      markersRef.current.clear();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // Markers depend only on the (static) asset list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-style + recentre when the selection changes.
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const active = id === selectedId;
      const asset = assets.find((a) => a.id === id);
      marker.setStyle({
        radius: active ? 11 : 8,
        color: active ? '#2f6fed' : '#ffffff',
        weight: active ? 3 : 2,
        fillColor: MARKER_COLOR[asset?.status] ?? '#94a3b8',
      });
      if (active && mapRef.current) mapRef.current.panTo(marker.getLatLng());
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return <div ref={ref} className="h-full w-full" />;
}
