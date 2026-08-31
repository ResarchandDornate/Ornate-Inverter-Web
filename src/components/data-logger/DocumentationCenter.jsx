'use client';

import { useMemo, useRef, useState } from 'react';
import { BookOpen, Download, FileSpreadsheet, FileText, Filter, FolderOpen, Search, ShieldCheck, Trash2, Upload, X } from 'lucide-react';
import Topbar from '@/components/Topbar';
import { Card, SectionTitle } from '@/components/data-logger/ui';

const INITIAL_DOCUMENTS = [
  { id: 'installation-guide', name: 'Data Logger Installation Guide', category: 'Guides', type: 'PDF', size: '2.4 MB', updated: '14 Jul 2026', by: 'System Admin' },
  { id: 'mqtt-register-map', name: 'MQTT Register Map', category: 'Technical', type: 'XLSX', size: '186 KB', updated: '12 Jul 2026', by: 'System Admin' },
  { id: 'troubleshooting', name: 'Communication Troubleshooting', category: 'Guides', type: 'PDF', size: '1.1 MB', updated: '08 Jul 2026', by: 'System Admin' },
];

const CATEGORIES = ['All documents', 'Guides', 'Technical', 'Reports'];

export function DocumentationCenter({ role }) {
  const fileInputRef = useRef(null);
  const [documents, setDocuments] = useState(INITIAL_DOCUMENTS);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentCategory, setDocumentCategory] = useState('Guides');
  const isAdmin = role?.toLowerCase() === 'admin';
  const filteredDocuments = useMemo(() => {
    const term = query.trim().toLowerCase();
    return documents.filter((document) => (category === 'All documents' || document.category === category) && (!term || document.name.toLowerCase().includes(term) || document.category.toLowerCase().includes(term)));
  }, [category, documents, query]);
  const selectFile = (event) => setSelectedFile(event.target.files?.[0] ?? null);
  const addDocument = () => {
    if (!selectedFile) return;
    const extension = selectedFile.name.split('.').pop()?.toUpperCase() || 'FILE';
    setDocuments((current) => [{ id: `${selectedFile.name}-${selectedFile.lastModified}`, name: selectedFile.name.replace(/\.[^/.]+$/, ''), category: documentCategory, type: extension, size: formatFileSize(selectedFile.size), updated: 'Just now', by: 'Administrator' }, ...current]);
    setSelectedFile(null);
    setUploadOpen(false);
  };

  return <>
    <Topbar title="Documentation" breadcrumbs={['Data Logger', 'Documentation']} />
    <main className="mx-auto max-w-350 px-4 py-5 sm:px-6">
      <section className="flex flex-wrap items-start gap-4">
        <div><SectionTitle icon={<BookOpen className="h-4 w-4" />}>Document Center</SectionTitle><p className="mt-1 text-sm text-muted">Installation guides, technical files, and site documents.</p></div>
        <div className="ml-auto flex items-center gap-3"><RoleBadge isAdmin={isAdmin} />{isAdmin && <button onClick={() => setUploadOpen(true)} className="flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-[#dc6d12]"><Upload className="h-4 w-4" /> Upload document</button>}</div>
      </section>
      <Card className="mt-5 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-55 flex-1 items-center gap-2 rounded-md border border-line bg-canvas px-3 py-2"><Search className="h-4 w-4 text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search documentation" className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted" /></div>
          <label className="flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm text-ink"><Filter className="h-4 w-4 text-muted" /><span className="sr-only">Filter by category</span><select value={category} onChange={(event) => setCategory(event.target.value)} className="bg-transparent outline-none">{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-165 text-left"><thead className="border-y border-line bg-canvas text-xs font-medium text-muted"><tr><th className="px-4 py-3">Document</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Updated</th><th className="px-4 py-3">Uploaded by</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y divide-line">{filteredDocuments.map((document) => <DocumentRow key={document.id} document={document} isAdmin={isAdmin} onDelete={() => setDocuments((current) => current.filter((item) => item.id !== document.id))} />)}</tbody></table>{filteredDocuments.length === 0 && <EmptyDocuments isAdmin={isAdmin} onUpload={() => setUploadOpen(true)} />}</div>
      </Card>
      {!isAdmin && <p className="mt-3 text-xs text-muted">Your role can view and download shared documents. Uploading and document management are available to administrators only.</p>}
    </main>
    {uploadOpen && <UploadDialog fileInputRef={fileInputRef} selectedFile={selectedFile} category={documentCategory} onCategoryChange={setDocumentCategory} onFileChange={selectFile} onClose={() => { setSelectedFile(null); setUploadOpen(false); }} onSubmit={addDocument} />}
  </>;
}

function RoleBadge({ isAdmin }) { return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${isAdmin ? 'bg-good/10 text-good' : 'bg-canvas text-muted'}`}><ShieldCheck className="h-3.5 w-3.5" />{isAdmin ? 'Administrator' : 'Viewer'}</span>; }

function DocumentRow({ document, isAdmin, onDelete }) {
  const Icon = document.type === 'XLSX' ? FileSpreadsheet : FileText;
  return <tr className="text-sm text-ink"><td className="px-4 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand"><Icon className="h-4 w-4" /></span><div><p className="font-medium">{document.name}</p><p className="mt-0.5 text-xs text-muted">{document.size}</p></div></div></td><td className="px-4 py-4 text-muted">{document.category}</td><td className="px-4 py-4 text-muted">{document.type}</td><td className="px-4 py-4 text-muted">{document.updated}</td><td className="px-4 py-4 text-muted">{document.by}</td><td className="px-4 py-4"><div className="flex justify-end gap-1"><button aria-label={`Download ${document.name}`} title="Download document" className="rounded p-2 text-muted hover:bg-canvas hover:text-brand"><Download className="h-4 w-4" /></button>{isAdmin && <button onClick={onDelete} aria-label={`Delete ${document.name}`} title="Remove document" className="rounded p-2 text-muted hover:bg-danger/10 hover:text-danger"><Trash2 className="h-4 w-4" /></button>}</div></td></tr>;
}

function EmptyDocuments({ isAdmin, onUpload }) { return <div className="py-16 text-center"><FolderOpen className="mx-auto h-8 w-8 text-muted" /><p className="mt-3 text-sm font-medium text-ink">No documents found</p><p className="mt-1 text-xs text-muted">Try a different search or category.</p>{isAdmin && <button onClick={onUpload} className="mt-4 text-sm font-medium text-brand hover:underline">Upload a document</button>}</div>; }

function UploadDialog({ fileInputRef, selectedFile, category, onCategoryChange, onFileChange, onClose, onSubmit }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" role="dialog" aria-modal="true" aria-labelledby="upload-document-title"><Card className="w-full max-w-lg p-5 shadow-xl"><div className="flex items-center justify-between"><div><h2 id="upload-document-title" className="text-base font-semibold text-ink">Upload document</h2><p className="mt-1 text-xs text-muted">This preview keeps the selected document in the browser only.</p></div><button onClick={onClose} aria-label="Close upload dialog" className="rounded p-1 text-muted hover:bg-canvas"><X className="h-5 w-5" /></button></div><input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv" onChange={onFileChange} className="sr-only" /><button type="button" onClick={() => fileInputRef.current?.click()} className="mt-5 flex w-full flex-col items-center rounded-lg border border-dashed border-line bg-canvas px-4 py-8 text-center hover:border-brand"><Upload className="h-6 w-6 text-brand" /><span className="mt-2 text-sm font-medium text-ink">{selectedFile ? selectedFile.name : 'Choose a file to upload'}</span><span className="mt-1 text-xs text-muted">PDF, Word, Excel, or CSV</span></button><label className="mt-4 block text-xs font-medium text-muted">Category<select value={category} onChange={(event) => onCategoryChange(event.target.value)} className="mt-1.5 block w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none">{CATEGORIES.slice(1).map((item) => <option key={item}>{item}</option>)}</select></label><div className="mt-5 flex justify-end gap-2"><button onClick={onClose} className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-canvas">Cancel</button><button disabled={!selectedFile} onClick={onSubmit} className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Add document</button></div></Card></div>; }

function formatFileSize(bytes) { if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`; return `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }
