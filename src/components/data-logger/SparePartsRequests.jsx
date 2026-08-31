'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ListFilter, Plus, Search } from 'lucide-react';
import Topbar from '@/components/Topbar';
import { Card } from '@/components/data-logger/ui';
import { getSparePartsRequests } from '@/lib/sparePartsStore';

const STATUS_FILTERS = ['All statuses', 'Draft', 'Requested', 'Approved'];

const STATUS_STYLE = {
  Draft: 'bg-canvas text-muted',
  Requested: 'bg-warn/10 text-warn',
  Approved: 'bg-good/10 text-good',
};

export function SparePartsRequests() {
  const [requests, setRequests] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All statuses');
  const [filterOpen, setFilterOpen] = useState(false);

  // Re-read on every mount so a request created on the "New Request" page
  // (a separate route) shows up here once the user navigates back.
  useEffect(() => {
    setRequests(getSparePartsRequests());
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return requests.filter((request) => {
      if (status !== 'All statuses' && request.status !== status) return false;
      if (!term) return true;
      return `${request.installation} ${request.id}`.toLowerCase().includes(term);
    });
  }, [requests, query, status]);

  return (
    <>
      <Topbar title="Service" breadcrumbs={['Data Logger', 'Service', 'Requests']} />
      <div className="mx-auto max-w-350 px-4 py-5 sm:px-6">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
            <div>
              <h1 className="text-base font-semibold text-ink">Spare parts requested</h1>
              <p className="mt-0.5 text-xs text-muted">{filtered.length} element{filtered.length === 1 ? '' : 's'}</p>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border border-line bg-canvas px-3 py-2">
                <Search className="h-4 w-4 text-muted" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Filter by installation"
                  className="w-44 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
                />
              </div>
              <div className="relative">
                <button
                  onClick={() => setFilterOpen((open) => !open)}
                  className="flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-2 text-sm text-ink hover:bg-canvas"
                >
                  <ListFilter className="h-4 w-4 text-muted" /> Filter list
                </button>
                {filterOpen && (
                  <div className="absolute right-0 z-10 mt-1 w-44 rounded-md border border-line bg-white py-1 shadow-lg">
                    {STATUS_FILTERS.map((option) => (
                      <button
                        key={option}
                        onClick={() => { setStatus(option); setFilterOpen(false); }}
                        className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-canvas ${status === option ? 'text-brand font-medium' : 'text-ink'}`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Link
                href="/data-logger/service/new"
                className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                <Plus className="h-4 w-4" /> New
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-170 text-left">
              <thead className="bg-canvas text-xs font-medium text-muted">
                <tr>
                  <th className="px-5 py-3">Ref.</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Company</th>
                  <th className="px-5 py-3">Installation</th>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((request) => (
                  <tr key={request.id} className="text-sm">
                    <td className="px-5 py-4 font-medium text-brand">{request.id}</td>
                    <td className="px-5 py-4 text-muted">{request.date}</td>
                    <td className="px-5 py-4 text-ink">{request.company}</td>
                    <td className="px-5 py-4 text-ink">{request.installation}</td>
                    <td className="px-5 py-4 text-muted">{request.user}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_STYLE[request.status] ?? 'bg-canvas text-muted'}`}>
                        {request.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="py-16 text-center text-sm text-muted">
                {requests.length === 0
                  ? 'No spare parts requests yet — create one with "New".'
                  : 'No requests match this filter.'}
              </p>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
