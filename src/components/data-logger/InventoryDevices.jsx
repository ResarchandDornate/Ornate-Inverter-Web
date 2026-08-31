'use client';

import { useMemo, useState } from 'react';
import { ListFilter, Search, X } from 'lucide-react';
import Topbar from '@/components/Topbar';
import { Card } from '@/components/data-logger/ui';

const DEFAULT_FILTERS = {
  company: 'All companies',
  installation: 'All installations',
  shippedTo: 'All companies',
  country: 'All countries',
  product: 'All products',
  deviceState: 'All states',
  barcode: '',
  tag: '',
  deviceType: 'All device types',
  warrantyType: 'All warranty types',
};

// `*` at the start/end of a term does a partial match; otherwise it's exact.
// Multiple terms can be comma-separated (matches if any term matches).
function wildcardMatch(term, value) {
  const v = value.toLowerCase();
  const p = term.trim().toLowerCase();
  if (!p) return true;
  const startsWild = p.startsWith('*');
  const endsWild = p.endsWith('*');
  const core = p.replace(/^\*/, '').replace(/\*$/, '');
  if (startsWild && endsWild) return v.includes(core);
  if (startsWild) return v.endsWith(core);
  if (endsWild) return v.startsWith(core);
  return v === core;
}

function matchesTerms(filterText, values) {
  const terms = filterText.split(',').map((t) => t.trim()).filter(Boolean);
  if (terms.length === 0) return true;
  return terms.some((term) => values.some((value) => wildcardMatch(term, value)));
}

export function InventoryDevices({ devices }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [panelOpen, setPanelOpen] = useState(false);

  const options = useMemo(() => ({
    companies: Array.from(new Set(devices.map((d) => d.company))).sort(),
    installations: Array.from(new Set(devices.map((d) => d.installation))).sort(),
    countries: Array.from(new Set(devices.map((d) => d.country))).sort(),
    products: Array.from(new Set(devices.map((d) => d.product))).sort(),
    states: Array.from(new Set(devices.map((d) => d.status))).sort(),
    deviceTypes: Array.from(new Set(devices.map((d) => d.deviceType))).sort(),
  }), [devices]);

  const hasActiveFilters = Object.keys(DEFAULT_FILTERS).some((key) => filters[key] !== DEFAULT_FILTERS[key]);

  const filtered = useMemo(() => {
    if (!hasActiveFilters) return [];
    return devices.filter((device) => {
      if (filters.company !== 'All companies' && device.company !== filters.company) return false;
      if (filters.installation !== 'All installations' && device.installation !== filters.installation) return false;
      if (filters.shippedTo !== 'All companies' && device.company !== filters.shippedTo) return false;
      if (filters.country !== 'All countries' && device.country !== filters.country) return false;
      if (filters.product !== 'All products' && device.product !== filters.product) return false;
      if (filters.deviceState !== 'All states' && device.status !== filters.deviceState) return false;
      if (filters.deviceType !== 'All device types' && device.deviceType !== filters.deviceType) return false;
      if (filters.warrantyType !== 'All warranty types') {
        const key = filters.warrantyType === 'Battery' ? 'battery' : 'pcb';
        if (!device.warranty[key]) return false;
      }
      if (!matchesTerms(filters.barcode, [device.barcode])) return false;
      if (!matchesTerms(filters.tag, device.tags)) return false;
      return true;
    });
  }, [devices, filters, hasActiveFilters]);

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const clearFilters = () => setFilters(DEFAULT_FILTERS);

  return (
    <>
      <Topbar title="Inventory" breadcrumbs={['Data Logger', 'Inventory']} />
      <div className="mx-auto max-w-350 px-4 py-5 sm:px-6">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
            <div>
              <h1 className="text-base font-semibold text-ink">Inventoried Devices</h1>
              <p className="mt-0.5 text-xs text-muted">
                {hasActiveFilters ? `${filtered.length} element${filtered.length === 1 ? '' : 's'}` : '…'}
              </p>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border border-line bg-canvas px-3 py-2">
                <Search className="h-4 w-4 text-muted" />
                <input
                  value={filters.barcode}
                  onChange={(event) => setFilter('barcode', event.target.value)}
                  placeholder="Filter by barcode"
                  className="w-40 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
                />
              </div>
              <button
                onClick={() => setPanelOpen(true)}
                className="flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-2 text-sm text-ink hover:bg-canvas"
              >
                <ListFilter className="h-4 w-4 text-muted" /> Filter list
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-220 text-left">
              <thead className="bg-canvas text-xs font-medium text-muted">
                <tr>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Device status</th>
                  <th className="px-4 py-3">Installation</th>
                  <th className="px-4 py-3">Device type</th>
                  <th className="px-4 py-3">Item info</th>
                  <th className="px-4 py-3">Tags</th>
                  <th className="px-4 py-3">Warranty Status (Battery-PCB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((device) => (
                  <tr key={device.id} className="text-sm">
                    <td className="px-4 py-4 text-ink">{device.company}</td>
                    <td className="px-4 py-4 text-ink">{device.status}</td>
                    <td className="px-4 py-4 text-ink">{device.installation}</td>
                    <td className="px-4 py-4 text-ink">{device.deviceType}</td>
                    <td className="px-4 py-4 text-ink">{device.itemInfo}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {device.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-canvas px-2 py-0.5 text-xs text-muted">{tag}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-ink">{device.warranty.battery} / {device.warranty.pcb}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="py-16 text-center text-sm font-medium text-brand">
                {hasActiveFilters ? 'No devices match these filters.' : 'Use filters to find inventory items.'}
              </p>
            )}
          </div>
        </Card>
      </div>

      {panelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink/40" role="dialog" aria-modal="true">
          <div className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-xl">
            <div className="flex items-center gap-2 border-b border-line px-5 py-4">
              <ListFilter className="h-4 w-4 text-muted" />
              <h2 className="text-sm font-semibold text-ink">Filter list</h2>
              <button onClick={() => setPanelOpen(false)} aria-label="Close" className="ml-auto rounded p-1 text-muted hover:bg-canvas">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 px-5 py-4">
              <FilterSelect label="Filter by company" value={filters.company} onChange={(v) => setFilter('company', v)} options={['All companies', ...options.companies]} />
              <FilterSelect label="Filter by installation" value={filters.installation} onChange={(v) => setFilter('installation', v)} options={['All installations', ...options.installations]} />
              <FilterSelect label="Filter by shipped to company" value={filters.shippedTo} onChange={(v) => setFilter('shippedTo', v)} options={['All companies', ...options.companies]} />
              <FilterSelect label="Filter by country" value={filters.country} onChange={(v) => setFilter('country', v)} options={['All countries', ...options.countries]} />
              <FilterSelect label="Filter by product" value={filters.product} onChange={(v) => setFilter('product', v)} options={['All products', ...options.products]} />
              <FilterSelect label="Filter by device states" value={filters.deviceState} onChange={(v) => setFilter('deviceState', v)} options={['All states', ...options.states]} />

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Filter by barcode</label>
                <input
                  value={filters.barcode}
                  onChange={(event) => setFilter('barcode', event.target.value)}
                  placeholder="Filter by barcode"
                  className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                />
                <p className="mt-1 text-[11px] text-brand">
                  Use * at the start and/or end for a partial search of the barcode, or search multiple barcodes separated by commas.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Filter by tag</label>
                <input
                  value={filters.tag}
                  onChange={(event) => setFilter('tag', event.target.value)}
                  placeholder="Filter by tag"
                  className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                />
                <p className="mt-1 text-[11px] text-brand">
                  Use * at the start and/or end for a partial search of the tag, or search multiple tags separated by commas.
                </p>
              </div>

              <FilterSelect label="Device Type" value={filters.deviceType} onChange={(v) => setFilter('deviceType', v)} options={['All device types', ...options.deviceTypes]} />

              <div className="border-t border-line pt-4">
                <h3 className="text-sm font-semibold text-ink">Warranties</h3>
                <div className="mt-3">
                  <FilterSelect label="Warranty Type" value={filters.warrantyType} onChange={(v) => setFilter('warrantyType', v)} options={['All warranty types', 'Battery', 'PCB']} />
                </div>
              </div>
            </div>

            <div className="flex gap-2 border-t border-line px-5 py-3">
              <button onClick={clearFilters} className="flex-1 rounded-md border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-canvas">
                Clear filters
              </button>
              <button onClick={() => setPanelOpen(false)} className="flex-1 rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="block text-xs font-medium text-muted">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 block w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
      >
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}
