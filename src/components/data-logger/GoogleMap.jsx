'use client';

import { useEffect, useRef, useState } from 'react';

const MARKER_COLOR = {
  running: '#16a34a',
  stopped: '#f59e0b',
  disconnected: '#94a3b8',
};

// Light map style, roughly matching the dashboard palette.
const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#eef2f6' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b7787' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#f3f5f8' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#e6e9ef' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#d3e3f2' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

// Module-level guard so the script is only injected once.
let scriptPromise = null;

function loadGoogleMaps(apiKey) {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.google && window.google.maps) return Promise.resolve(window.google.maps);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Failed to load Google Maps'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

function markerIcon(maps, status, active) {
  return {
    path: maps.SymbolPath.CIRCLE,
    scale: active ? 11 : 8,
    fillColor: MARKER_COLOR[status] ?? '#94a3b8',
    fillOpacity: 1,
    strokeColor: active ? '#2f6fed' : '#ffffff',
    strokeWeight: active ? 3 : 2,
  };
}

export function GoogleMap({ apiKey, assets, selectedId, onSelect }) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());
  const [status, setStatus] = useState('loading'); // loading | ready | error

  // Init map + markers once.
  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps(apiKey)
      .then((maps) => {
        if (cancelled || !ref.current) return;

        const map = new maps.Map(ref.current, {
          center: { lat: 12.808, lng: 77.69 },
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: MAP_STYLE,
        });
        mapRef.current = map;

        const bounds = new maps.LatLngBounds();
        assets.forEach((a) => {
          const position = { lat: a.location.lat, lng: a.location.lng };
          const marker = new maps.Marker({
            position,
            map,
            title: a.name,
            icon: markerIcon(maps, a.status, a.id === selectedId),
          });
          marker.addListener('click', () => onSelect(a.id));
          markersRef.current.set(a.id, { marker, status: a.status });
          bounds.extend(position);
        });
        if (assets.length > 0) map.fitBounds(bounds, 90);

        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
    // Markers depend only on the (static) asset list + key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  // Re-style markers + recentre when the selection changes.
  useEffect(() => {
    const maps = window.google && window.google.maps;
    if (!maps) return;
    markersRef.current.forEach(({ marker, status: st }, id) => {
      const active = id === selectedId;
      marker.setIcon(markerIcon(maps, st, active));
      marker.setZIndex(active ? 999 : 1);
      if (active && mapRef.current) mapRef.current.panTo(marker.getPosition());
    });
  }, [selectedId]);

  return (
    <div className="relative h-full w-full">
      <div ref={ref} className="h-full w-full" />
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#e8eef3] px-6 text-center">
          <p className="max-w-sm text-sm text-muted">
            Could not load Google Maps. Check that <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> is
            valid and the <strong>Maps JavaScript API</strong> is enabled for it.
          </p>
        </div>
      )}
    </div>
  );
}
