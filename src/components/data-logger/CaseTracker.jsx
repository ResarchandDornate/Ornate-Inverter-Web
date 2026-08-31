'use client';

import { useMemo, useRef, useState } from 'react';
import {
  Archive, Bold, Calendar, FileText, Folder, FolderOpen,
  Image as ImageIcon, Italic, Link2, ListFilter, Plus, Search,
  Strikethrough, Trash2, X,
} from 'lucide-react';
import Topbar from '@/components/Topbar';
import { Card } from '@/components/data-logger/ui';
import { showError, showInfo, showSuccess } from '@/lib/toast';

const COMPANY = 'Ornate Solar Pvt Ltd';
const CONTACTS = [{ id: 'operator', name: 'Operator', email: 'operator@ornatesolar.com' }];
const SUBJECTS = ['Communication issue', 'Hardware fault', 'Firmware / software', 'Performance', 'Other'];

const DEFAULT_FILTERS = {
  caseId: '', title: '', createdFrom: '', closedFrom: '',
  status: 'All statuses', company: 'All companies', installation: 'All installations',
  subject: 'All subjects', contract: 'All contracts',
};

function wrapSelection(textareaRef, before, after = before) {
  const el = textareaRef.current;
  if (!el) return '';
  const { selectionStart, selectionEnd, value } = el;
  const selected = value.slice(selectionStart, selectionEnd);
  return `${value.slice(0, selectionStart)}${before}${selected}${after}${value.slice(selectionEnd)}`;
}

// Shared case-tracking UI reused across Technical Support's child tabs (Remote
// Technical Support, Sw Updates, ...) — same stat cards / table / create
// modal / filter panel, each tab just keeps its own independent case list.
export function CaseTracker({ title, breadcrumbs, identifierPrefix, showContactSubjectColumns = false, installations }) {
  const [cases, setCases] = useState([]);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const openCount = cases.filter((c) => c.status === 'Open').length;
  const closedCount = cases.filter((c) => c.status === 'Closed').length;

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      if (search.trim() && !`${c.title} ${c.identifier} ${c.company}`.toLowerCase().includes(search.trim().toLowerCase())) return false;
      if (filters.caseId.trim() && !c.identifier.toLowerCase().includes(filters.caseId.trim().toLowerCase())) return false;
      if (filters.title.trim() && !c.title.toLowerCase().includes(filters.title.trim().toLowerCase())) return false;
      if (filters.status !== 'All statuses' && c.status !== filters.status) return false;
      if (filters.company !== 'All companies' && c.company !== filters.company) return false;
      if (filters.installation !== 'All installations' && c.installation !== filters.installation) return false;
      if (filters.subject !== 'All subjects' && c.subject !== filters.subject) return false;
      if (filters.createdFrom && c.date < filters.createdFrom) return false;
      return true;
    });
  }, [cases, search, filters]);

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  return (
    <>
      <Topbar title={title} breadcrumbs={breadcrumbs} />
      <div className="mx-auto max-w-350 px-4 py-5 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard icon={Archive} value={cases.length} label="Total cases" tone="muted" />
          <StatCard icon={FolderOpen} value={openCount} label="Open cases" tone="brand" />
          <StatCard icon={Folder} value={closedCount} label="Closed cases" tone="good" />
        </div>

        <Card className="mt-4 overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
            <div>
              <h1 className="text-base font-semibold text-ink">{title}</h1>
              <p className="mt-0.5 text-xs text-muted">{filtered.length} element{filtered.length === 1 ? '' : 's'}</p>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-xs font-semibold text-muted">
                {filtered.length}
              </span>
              <div className="flex items-center gap-2 rounded-md border border-line bg-canvas px-3 py-2">
                <Search className="h-4 w-4 text-muted" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Global search"
                  className="w-36 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
                />
              </div>
              <button
                onClick={() => setFilterOpen(true)}
                className="flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-2 text-sm text-ink hover:bg-canvas"
              >
                <ListFilter className="h-4 w-4 text-muted" /> Filter list
              </button>
              <button
                onClick={() => setCreateOpen(true)}
                className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                <Plus className="h-4 w-4" /> New case
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-190 text-left">
              <thead className="bg-canvas text-xs font-medium text-muted">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Identifier</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Installations</th>
                  {showContactSubjectColumns && (
                    <>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Subject</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((c) => (
                  <tr key={c.id} className="text-sm">
                    <td className="px-4 py-4 text-muted">{c.date}</td>
                    <td className="px-4 py-4 font-medium text-ink">{c.title}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${c.status === 'Open' ? 'bg-brand/10 text-brand' : 'bg-good/10 text-good'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-muted">{c.identifier}</td>
                    <td className="px-4 py-4 text-ink">{c.company}</td>
                    <td className="px-4 py-4 text-ink">{c.installation || '—'}</td>
                    {showContactSubjectColumns && (
                      <>
                        <td className="px-4 py-4 text-ink">{c.contact || '—'}</td>
                        <td className="px-4 py-4 text-ink">{c.subject || '—'}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="py-16 text-center text-sm italic text-muted">No results found</p>
            )}
          </div>
        </Card>
      </div>

      {createOpen && (
        <CreateCaseModal
          installations={installations}
          existingCases={cases}
          identifierPrefix={identifierPrefix}
          onClose={() => setCreateOpen(false)}
          onCreate={(newCase) => {
            setCases((current) => [newCase, ...current]);
            setCreateOpen(false);
            showSuccess('Case created');
          }}
        />
      )}

      {filterOpen && (
        <FilterPanel
          filters={filters}
          setFilter={setFilter}
          onClear={() => setFilters(DEFAULT_FILTERS)}
          onClose={() => setFilterOpen(false)}
          installations={installations}
        />
      )}
    </>
  );
}

function StatCard({ icon: Icon, value, label, tone }) {
  const styles = { muted: 'bg-canvas text-muted', brand: 'bg-brand/10 text-brand', good: 'bg-good/10 text-good' };
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${styles[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xl font-semibold text-ink">{value}</p>
        <p className="text-xs text-muted">{label}</p>
      </div>
    </Card>
  );
}

function CreateCaseModal({ installations, existingCases, identifierPrefix, onClose, onCreate }) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [installationId, setInstallationId] = useState('');
  const [associatedCaseId, setAssociatedCaseId] = useState('');
  const [contactId, setContactId] = useState(CONTACTS[0].id);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const format = (before, after) => setDescription(wrapSelection(textareaRef, before, after));

  const submit = () => {
    if (!title.trim()) { showError('Title is required.'); return; }
    if (!subject) { showError('Select a subject.'); return; }
    const installation = installations.find((i) => i.id === installationId)?.name ?? '';
    const contact = CONTACTS.find((c) => c.id === contactId);
    onCreate({
      id: `case-${Date.now()}`,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      title: title.trim(),
      status: 'Open',
      identifier: `${identifierPrefix}-${1000 + existingCases.length}`,
      company: COMPANY,
      installation,
      associatedCaseId,
      contact: contact?.email,
      subject,
      description,
      fileName: file?.name ?? null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" role="dialog" aria-modal="true">
      <Card className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-line px-5 py-4">
          <h2 className="text-sm font-semibold text-ink">Create case</h2>
          <button onClick={onClose} aria-label="Close" className="ml-auto rounded p-1 text-muted hover:bg-canvas">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-ink">Company<span className="text-danger">*</span></label>
              <input value={COMPANY} disabled className="mt-1.5 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm text-muted" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink">Installations</label>
              <select
                value={installationId}
                onChange={(event) => setInstallationId(event.target.value)}
                className="mt-1.5 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              >
                <option value="">No installation selected</option>
                {installations.map((installation) => (
                  <option key={installation.id} value={installation.id}>{installation.name}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="-mt-2 text-[11px] text-brand">If no installation is selected, the case will be created against the company.</p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-ink">Associated case</label>
              <select
                value={associatedCaseId}
                onChange={(event) => setAssociatedCaseId(event.target.value)}
                className="mt-1.5 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              >
                <option value="">Select...</option>
                {existingCases.map((c) => (
                  <option key={c.id} value={c.id}>{c.identifier} — {c.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-ink">Contact<span className="text-danger">*</span></label>
              <select
                value={contactId}
                onChange={(event) => setContactId(event.target.value)}
                className="mt-1.5 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              >
                {CONTACTS.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-ink">Title<span className="text-danger">*</span></label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Title..."
              className="mt-1.5 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-ink">Description</label>
            <div className="mt-1.5 rounded-md border border-line bg-white">
              <div className="flex items-center gap-1 border-b border-line px-2 py-1.5">
                <ToolbarButton icon={Bold} onClick={() => format('**')} label="Bold" />
                <ToolbarButton icon={Italic} onClick={() => format('_')} label="Italic" />
                <ToolbarButton icon={Strikethrough} onClick={() => format('~~')} label="Strikethrough" />
                <ToolbarButton icon={Link2} onClick={() => format('[', '](url)')} label="Link" />
                <ToolbarButton icon={ImageIcon} onClick={() => format('![', '](image-url)')} label="Image" />
              </div>
              <textarea
                ref={textareaRef}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                placeholder="Insert text here ..."
                className="w-full resize-y bg-transparent px-3 py-2 text-sm text-ink outline-none placeholder:text-muted"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-ink">Subject<span className="text-danger">*</span></label>
            <select
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="mt-1.5 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            >
              <option value="">Select...</option>
              {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div
            onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              const dropped = event.dataTransfer.files?.[0];
              if (dropped) setFile(dropped);
            }}
            className={`flex flex-col items-center gap-2 rounded-md border-2 border-dashed px-5 py-8 text-center ${dragOver ? 'border-brand bg-brand/5' : 'border-line'}`}
          >
            <FileText className="h-5 w-5 text-muted" />
            <p className="text-sm text-ink">
              {file ? file.name : 'Drag and drop file here or'}
            </p>
            <input ref={fileInputRef} type="file" className="hidden" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium text-brand hover:bg-canvas"
            >
              <Search className="h-3.5 w-3.5" /> Browse for file
            </button>
          </div>
        </div>

        <div className="flex justify-end border-t border-line px-5 py-3">
          <button onClick={submit} className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            Create
          </button>
        </div>
      </Card>
    </div>
  );
}

function ToolbarButton({ icon: Icon, onClick, label }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="rounded p-1.5 text-muted hover:bg-canvas hover:text-ink">
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function FilterPanel({ filters, setFilter, onClear, onClose, installations }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40" role="dialog" aria-modal="true">
      <div className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-xl">
        <div className="flex items-center gap-2 border-b border-line px-5 py-4">
          <ListFilter className="h-4 w-4 text-muted" />
          <h2 className="text-sm font-semibold text-ink">Filter list</h2>
          <button onClick={onClose} aria-label="Close" className="ml-auto rounded p-1 text-muted hover:bg-canvas">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 px-5 py-4">
          <div className="flex items-center gap-2">
            <button onClick={() => showInfo('Custom filters aren\'t available in this preview yet.')} className="flex-1 rounded-md border border-line px-3 py-2 text-xs font-medium text-ink hover:bg-canvas">
              Save custom filter
            </button>
            <button onClick={() => showInfo('Custom filters aren\'t available in this preview yet.')} className="flex-1 rounded-md border border-line px-3 py-2 text-xs font-medium text-ink hover:bg-canvas">
              Apply custom filter
            </button>
            <button onClick={onClear} aria-label="Clear filters" className="rounded-md border border-danger/30 p-2 text-danger hover:bg-danger/10">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <TextField label="Case" value={filters.caseId} onChange={(v) => setFilter('caseId', v)} />
          <TextField label="Title" value={filters.title} onChange={(v) => setFilter('title', v)} />

          <DateField label="Filter by creation date" value={filters.createdFrom} onChange={(v) => setFilter('createdFrom', v)} />
          <DateField label="Filter by close date" value={filters.closedFrom} onChange={(v) => setFilter('closedFrom', v)} />

          <SelectField label="Case Status" value={filters.status} onChange={(v) => setFilter('status', v)} options={['All statuses', 'Open', 'Closed']} />
          <SelectField label="Filter by company" value={filters.company} onChange={(v) => setFilter('company', v)} options={['All companies', COMPANY]} />
          <SelectField
            label="Filter by installation"
            value={filters.installation}
            onChange={(v) => setFilter('installation', v)}
            options={['All installations', ...installations.map((i) => i.name)]}
          />
          <SelectField label="Subject" value={filters.subject} onChange={(v) => setFilter('subject', v)} options={['All subjects', ...SUBJECTS]} />
          <SelectField label="Contract" value={filters.contract} onChange={(v) => setFilter('contract', v)} options={['All contracts']} />
        </div>
      </div>
    </div>
  );
}

function TextField({ label, value, onChange }) {
  return (
    <label className="block text-xs font-medium text-muted">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 block w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
      />
    </label>
  );
}

function DateField({ label, value, onChange }) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm text-brand">
      <Calendar className="h-4 w-4 shrink-0" />
      <span className="flex-1">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-32 bg-transparent text-xs text-ink outline-none"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
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
