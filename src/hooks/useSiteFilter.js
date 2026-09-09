"use client";

import { useCallback, useEffect, useState } from "react";

// Global site scope for the operator console, set from the topbar selector and
// read by every operator page. An empty string means the entire fleet.
//
// Persisted and synced exactly the way the chart-type preference is — one
// localStorage key plus a custom event — so a change in the topbar reaches
// every mounted page without threading state through the layout.
const KEY = "ornate.site";
const EVENT = "ornate-site-change";
export const ENTIRE_FLEET = "";

function readStored() {
  try {
    return localStorage.getItem(KEY) || ENTIRE_FLEET;
  } catch {
    return ENTIRE_FLEET;
  }
}

export function useSiteFilter() {
  // Start on "entire fleet" for the server render and the first client render
  // so the markup matches, then hydrate from storage in the effect.
  const [site, setSiteState] = useState(ENTIRE_FLEET);

  useEffect(() => {
    setSiteState(readStored());
    const sync = () => setSiteState(readStored());
    window.addEventListener("storage", sync);
    window.addEventListener(EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(EVENT, sync);
    };
  }, []);

  const setSite = useCallback((v) => {
    const val = v || ENTIRE_FLEET;
    setSiteState(val);
    try {
      localStorage.setItem(KEY, val);
      window.dispatchEvent(new Event(EVENT));
    } catch {
      /* ignore — non-persistent fallback */
    }
  }, []);

  return [site, setSite];
}
