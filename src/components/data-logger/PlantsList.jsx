'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Download, ListFilter, Search } from 'lucide-react';
import Topbar from '@/components/Topbar';
import { Card } from '@/components/data-logger/ui';

const DOT_COLOR = { good: 'bg-good', warn: 'bg-warn', danger: 'bg-danger', muted: 'bg-ink' };

const CSV_COLUMNS = ['Date', 'Plant name', 'Country', 'Company', 'Tracker', 'NCUs', 'RSUs', 'TCUs', 'TMUs', 'RMAs', 'Cases', 'Suntrack series'];

function toCsvRow(plant) {
  return [
    plant.date, plant.name, plant.country, plant.company, plant.tracker,
    plant.devices.ncu, plant.devices.rsu, plant.devices.tcu, plant.devices.tmu,
    plant.rma, plant.cases, plant.series,
  ];
}

function downloadCsv(plants) {
  const rows = [CSV_COLUMNS, ...plants.map(toCsvRow)];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'installations.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export function PlantsList({ plants }) {
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('All countries');
  const [filterOpen, setFilterOpen] = useState(false);

  const countries = useMemo(() => Array.from(new Set(plants.map((p) => p.country))).sort(), [plants]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return plants.filter((plant) => {
      if (country !== 'All countries' && plant.country !== country) return false;
      if (!term) return true;
      return plant.name.toLowerCase().includes(term);
    });
  }, [plants, query, country]);

  return (
    <>
      <Topbar title="Inventory" breadcrumbs={['Data Logger', 'Inventory', 'Installations']} />
      <div className="mx-auto max-w-350 px-4 py-5 sm:px-6">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
            <div>
              <h1 className="text-base font-semibold text-ink">Installations</h1>
              <p className="mt-0.5 text-xs text-muted">{filtered.length} element{filtered.length === 1 ? '' : 's'}</p>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border border-line bg-canvas px-3 py-2">
                <Search className="h-4 w-4 text-muted" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Filter by name"
                  className="w-40 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
                />
              </div>
              <button
                onClick={() => downloadCsv(filtered)}
                disabled={filtered.length === 0}
                className="flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-2 text-sm text-ink hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4 text-muted" /> Export to CSV
              </button>
              <div className="relative">
                <button
                  onClick={() => setFilterOpen((open) => !open)}
                  className="flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-2 text-sm text-ink hover:bg-canvas"
                >
                  <ListFilter className="h-4 w-4 text-muted" /> Filter list
                </button>
                {filterOpen && (
                  <div className="absolute right-0 z-10 mt-1 w-44 rounded-md border border-line bg-white py-1 shadow-lg">
                    {['All countries', ...countries].map((option) => (
                      <button
                        key={option}
                        onClick={() => { setCountry(option); setFilterOpen(false); }}
                        className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-canvas ${country === option ? 'text-brand font-medium' : 'text-ink'}`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-220 text-left">
              <thead className="bg-canvas text-xs font-medium text-muted">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Plant name</th>
                  <th className="px-4 py-3">Country</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Tracker</th>
                  <th className="px-4 py-3">NCUs</th>
                  <th className="px-4 py-3">RSUs</th>
                  <th className="px-4 py-3">TCUs</th>
                  <th className="px-4 py-3">TMUs</th>
                  <th className="px-4 py-3">RMAs/Cases</th>
                  <th className="px-4 py-3">Suntrack series</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((plant) => (
                  <tr key={plant.id} className="text-sm">
                    <td className="px-4 py-4 text-muted">{plant.date}</td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/data-logger/inventory/plants/${plant.id}`}
                        className="flex items-center gap-2 font-medium text-brand hover:underline"
                      >
                        <span className={`h-2 w-2 shrink-0 rounded-full ${DOT_COLOR[plant.statusDot] ?? 'bg-muted'}`} />
                        {plant.name}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-ink">{plant.country}</td>
                    <td className="px-4 py-4 text-ink">{plant.company}</td>
                    <td className="px-4 py-4 text-ink">{plant.tracker}</td>
                    <td className="px-4 py-4 text-ink">{plant.devices.ncu}</td>
                    <td className="px-4 py-4 text-ink">{plant.devices.rsu}</td>
                    <td className="px-4 py-4 text-ink">{plant.devices.tcu}</td>
                    <td className="px-4 py-4 text-ink">{plant.devices.tmu}</td>
                    <td className="px-4 py-4 text-ink">
                      <div>RMA: {plant.rma}</div>
                      <div>Cases: {plant.cases}</div>
                    </td>
                    <td className="px-4 py-4 text-ink">{plant.series}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="py-16 text-center text-sm text-muted">No installations match this filter.</p>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
