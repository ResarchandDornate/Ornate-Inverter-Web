"use client";

import { useCallback, useEffect, useState } from "react";

// Global chart-view preference (bar | line), controlled from Settings and
// read by every chart. Persisted in localStorage and synced across tabs and
// components via a custom event + the native storage event.
const KEY = "ornate.chartType";
const DEFAULT = "line";
const EVENT = "ornate-charttype-change";

function readStored() {
  try {
    const v = localStorage.getItem(KEY);
    return v === "bar" ? "bar" : "line";
  } catch {
    return DEFAULT;
  }
}

export function useChartType() {
  // Always start from DEFAULT on the server + first client render to avoid a
  // hydration mismatch, then hydrate from localStorage in the effect below.
  const [chartType, setChartTypeState] = useState(DEFAULT);

  useEffect(() => {
    setChartTypeState(readStored());
    const sync = () => setChartTypeState(readStored());
    window.addEventListener("storage", sync);
    window.addEventListener(EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(EVENT, sync);
    };
  }, []);

  const setChartType = useCallback((v) => {
    const val = v === "line" ? "line" : "bar";
    setChartTypeState(val);
    try {
      localStorage.setItem(KEY, val);
      window.dispatchEvent(new Event(EVENT));
    } catch {
      /* ignore — non-persistent fallback */
    }
  }, []);

  return [chartType, setChartType];
}
