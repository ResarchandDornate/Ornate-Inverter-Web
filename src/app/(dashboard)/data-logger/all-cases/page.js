'use client';

import { useMemo, useState } from 'react';
import { ClipboardList, MessageSquarePlus, Search, X } from 'lucide-react';
import Topbar from '@/components/Topbar';
import { Card, SectionTitle } from '@/components/data-logger/ui';
import { showSuccess } from '@/lib/toast';

const INITIAL_CASES = [
  { id: 'CMP-1042', subject: 'Inverter communication is intermittent', type: 'Technical support', priority: 'High', status: 'Open', updated: 'Today, 10:24', site: 'Solar Monitoring Site' },
  { id: 'CMP-1041', subject: 'Request for firmware update', type: 'Software update', priority: 'Normal', status: 'In progress', updated: 'Yesterday, 16:12', site: 'Okhla Installation' },
  { id: 'CMP-1039', subject: 'Need installation wiring diagram', type: 'Technical guide', priority: 'Low', status: 'Resolved', updated: '12 Jul 2026', site: 'Solar Monitoring Site' },
];

export default function AllCasesPage() {
  const [cases, setCases] = useState(INITIAL_CASES);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All statuses');
  const [raiseOpen, setRaiseOpen] = useState(false);
  const filteredCases = useMemo(() => cases.filter((item) => (status === 'All statuses' || item.status === status) && (!query || `${item.id} ${item.subject} ${item.site}`.toLowerCase().includes(query.toLowerCase()))), [cases, query, status]);
  const openCases = cases.filter((item) => item.status !== 'Resolved').length;

  return <>
    <Topbar title="All Cases" breadcrumbs={['Data Logger', 'All Cases']} />
    <main className="mx-auto max-w-350 px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-start gap-3"><div><SectionTitle icon={<ClipboardList className="h-4 w-4" />}>Complaint Tickets</SectionTitle><p className="mt-1 text-sm text-muted">Track all service requests and raise a new complaint.</p></div><button onClick={() => setRaiseOpen(true)} className="ml-auto flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-[#dc6d12]"><MessageSquarePlus className="h-4 w-4" /> Raise complaint</button></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-3"><Summary value={cases.length} label="Total tickets" /><Summary value={openCases} label="Open tickets" /><Summary value={cases.filter((item) => item.status === 'Resolved').length} label="Resolved tickets" /></div>
      <Card className="mt-5 p-4 sm:p-5"><div className="flex flex-wrap gap-3"><div className="flex min-w-55 flex-1 items-center gap-2 rounded-md border border-line bg-canvas px-3 py-2"><Search className="h-4 w-4 text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ticket ID, subject, or site" className="w-full bg-transparent text-sm outline-none placeholder:text-muted" /></div><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none"><option>All statuses</option><option>Open</option><option>In progress</option><option>Resolved</option></select></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-180 text-left"><thead className="border-y border-line bg-canvas text-xs font-medium text-muted"><tr><th className="px-4 py-3">Ticket</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Site</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Last updated</th></tr></thead><tbody className="divide-y divide-line">{filteredCases.map((item) => <tr key={item.id} className="text-sm"><td className="px-4 py-4"><p className="font-semibold text-brand">{item.id}</p><p className="mt-0.5 font-medium text-ink">{item.subject}</p></td><td className="px-4 py-4 text-muted">{item.type}</td><td className="px-4 py-4 text-muted">{item.site}</td><td className="px-4 py-4"><PriorityBadge value={item.priority} /></td><td className="px-4 py-4"><StatusBadge value={item.status} /></td><td className="px-4 py-4 text-muted">{item.updated}</td></tr>)}</tbody></table>{filteredCases.length === 0 && <p className="py-14 text-center text-sm text-muted">No complaint tickets match these filters.</p>}</div></Card>
    </main>
    {raiseOpen && <RaiseComplaint onClose={() => setRaiseOpen(false)} onSubmit={(ticket) => { setCases((current) => [ticket, ...current]); setRaiseOpen(false); showSuccess('Complaint ticket raised'); }} />}
  </>;
}

function Summary({ value, label }) { return <Card className="p-4"><p className="text-2xl font-semibold text-ink">{value}</p><p className="mt-1 text-xs text-muted">{label}</p></Card>; }
function PriorityBadge({ value }) { const color = value === 'High' ? 'bg-danger/10 text-danger' : value === 'Normal' ? 'bg-warn/10 text-warn' : 'bg-canvas text-muted'; return <span className={`rounded-full px-2 py-1 text-xs font-medium ${color}`}>{value}</span>; }
function StatusBadge({ value }) { const color = value === 'Resolved' ? 'bg-good/10 text-good' : value === 'In progress' ? 'bg-brand/10 text-brand' : 'bg-warn/10 text-warn'; return <span className={`rounded-full px-2 py-1 text-xs font-medium ${color}`}>{value}</span>; }

function RaiseComplaint({ onClose, onSubmit }) {
  const [form, setForm] = useState({ type: 'Technical support', priority: 'Normal', subject: '', site: '', description: '' });
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = (event) => { event.preventDefault(); if (!form.subject.trim() || !form.description.trim()) return; onSubmit({ id: `CMP-${1043 + Math.floor(Math.random() * 100)}`, ...form, status: 'Open', updated: 'Just now', site: form.site || 'Solar Monitoring Site' }); };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" role="dialog" aria-modal="true" aria-labelledby="raise-complaint-title"><Card className="w-full max-w-xl p-5 shadow-xl"><div className="flex items-start justify-between"><div><h2 id="raise-complaint-title" className="text-base font-semibold text-ink">Raise a complaint</h2><p className="mt-1 text-xs text-muted">Describe the issue and our support team can review it.</p></div><button onClick={onClose} aria-label="Close complaint form" className="rounded p-1 text-muted hover:bg-canvas"><X className="h-5 w-5" /></button></div><form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Complaint type"><select name="type" value={form.type} onChange={update}><option>Technical support</option><option>Software update</option><option>Installation issue</option><option>Other</option></select></Field><Field label="Priority"><select name="priority" value={form.priority} onChange={update}><option>Low</option><option>Normal</option><option>High</option></select></Field><Field label="Site / installation"><input name="site" value={form.site} onChange={update} placeholder="Select or enter site" /></Field><Field label="Subject"><input required name="subject" value={form.subject} onChange={update} placeholder="Brief issue summary" /></Field><label className="sm:col-span-2 text-xs font-medium text-muted">Description<textarea required name="description" value={form.description} onChange={update} rows="4" placeholder="Explain the complaint, device details, and when it started" className="mt-1.5 block w-full resize-y rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand" /></label><div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={onClose} className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-canvas">Cancel</button><button className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white">Raise ticket</button></div></form></Card></div>;
}
function Field({ label, children }) { return <label className="text-xs font-medium text-muted">{label}<span className="mt-1.5 block [&_input]:w-full [&_input]:rounded-md [&_input]:border [&_input]:border-line [&_input]:bg-white [&_input]:px-3 [&_input]:py-2 [&_input]:text-sm [&_input]:text-ink [&_input]:outline-none [&_select]:w-full [&_select]:rounded-md [&_select]:border [&_select]:border-line [&_select]:bg-white [&_select]:px-3 [&_select]:py-2 [&_select]:text-sm [&_select]:text-ink [&_select]:outline-none">{children}</span></label>; }
