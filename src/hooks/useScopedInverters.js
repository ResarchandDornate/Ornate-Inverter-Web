"use client";

import { useMemo } from "react";
import { useLiveInverters } from "./useLiveInverters";
import { useSiteFilter } from "./useSiteFilter";
import { siteOf } from "@/lib/inverterStatus";

/**
 * useLiveInverters narrowed to the site selected in the topbar.
 *
 * Deliberately a wrapper rather than a change inside useLiveInverters: the
 * customer portal reads that same hook and must never inherit an operator's
 * console scope, and the inverter detail page needs the whole fleet so a deep
 * link to a unit outside the current site still resolves.
 *
 * `allInverters` stays available for anything that has to reason about the
 * fleet as a whole (the site list itself, for one).
 */
export function useScopedInverters() {
  const query = useLiveInverters();
  const [site] = useSiteFilter();

  const all = query.data || [];

  // Sites are derived FROM the fleet, so a site with no inverters cannot exist
  // — a stored value that matches nothing is stale (its inverters were moved,
  // re-addressed, or removed). Fall back to the whole fleet rather than leaving
  // every page blank, which is also what the selector's label falls back to.
  const stale = site ? !all.some((inv) => siteOf(inv) === site) : false;
  const effectiveSite = stale ? "" : site;

  const data = useMemo(() => {
    if (!effectiveSite) return all;
    return all.filter((inv) => siteOf(inv) === effectiveSite);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, effectiveSite]);

  return { ...query, data, allInverters: all, site: effectiveSite };
}
