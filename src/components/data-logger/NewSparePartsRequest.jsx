'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, Plus, Trash2 } from 'lucide-react';
import Topbar from '@/components/Topbar';
import { Card } from '@/components/data-logger/ui';
import { addSparePartsRequest } from '@/lib/sparePartsStore';
import { showError, showSuccess } from '@/lib/toast';

const OTHER = '__other__';

export function NewSparePartsRequest({ installations }) {
  const router = useRouter();
  const [installationId, setInstallationId] = useState('');
  const [otherName, setOtherName] = useState('');
  const [items, setItems] = useState([]);
  const [description, setDescription] = useState('');
  const [units, setUnits] = useState('');

  const addItem = () => {
    if (!description.trim()) return;
    setItems((current) => [...current, { description: description.trim(), units: units.trim() || '1' }]);
    setDescription('');
    setUnits('');
  };

  const removeItem = (index) => {
    setItems((current) => current.filter((_, i) => i !== index));
  };

  const submit = () => {
    const installationName =
      installationId === OTHER ? otherName.trim() : installations.find((i) => i.id === installationId)?.name;

    if (!installationName) {
      showError('Select an installation, or choose "Other" and name it.');
      return;
    }
    if (items.length === 0) {
      showError('Add at least one spare part before creating the request.');
      return;
    }

    addSparePartsRequest({ installation: installationName, items, status: 'Draft' });
    showSuccess('Spare parts request saved as draft');
    router.push('/data-logger/service');
  };

  return (
    <>
      <Topbar title="New Request" breadcrumbs={['Data Logger', 'Service', 'New Request']} />
      <div className="mx-auto max-w-350 px-4 py-5 sm:px-6">
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line px-5 py-4">
            <ClipboardList className="h-4 w-4 text-muted" />
            <h1 className="text-base font-semibold text-ink">New spare parts request</h1>
          </div>

          <div className="border-b border-line px-5 py-4">
            <label className="block text-sm font-semibold text-ink">
              Installation <span className="text-danger">*</span>
            </label>
            <select
              value={installationId}
              onChange={(event) => setInstallationId(event.target.value)}
              className="mt-2 w-full max-w-md rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            >
              <option value="">Select an installation</option>
              {installations.map((installation) => (
                <option key={installation.id} value={installation.id}>{installation.name}</option>
              ))}
              <option value={OTHER}>Other</option>
            </select>
            <p className="mt-1.5 text-xs text-muted">
              If the installation is not listed, select &quot;Other&quot; and fill its name.
            </p>
            {installationId === OTHER && (
              <input
                value={otherName}
                onChange={(event) => setOtherName(event.target.value)}
                placeholder="Installation name"
                className="mt-2 w-full max-w-md rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              />
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-canvas text-xs font-medium text-muted">
                <tr>
                  <th className="px-5 py-3">Description</th>
                  <th className="w-32 px-5 py-3">Units</th>
                  <th className="w-12 px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((item, index) => (
                  <tr key={`${item.description}-${index}`} className="text-sm">
                    <td className="px-5 py-3 text-ink">{item.description}</td>
                    <td className="px-5 py-3 text-ink">{item.units}</td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => removeItem(index)}
                        aria-label={`Remove ${item.description}`}
                        className="rounded p-1 text-muted hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-6 text-center text-sm text-muted">No spare parts added yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-line bg-canvas/60 px-5 py-3">
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addItem(); } }}
              placeholder="Description..."
              className="min-w-0 flex-1 rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
            <input
              value={units}
              onChange={(event) => setUnits(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addItem(); } }}
              placeholder="Units"
              inputMode="numeric"
              className="w-24 rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
            <button
              onClick={addItem}
              aria-label="Add spare part"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white text-good hover:bg-good/10"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="flex justify-end border-t border-line px-5 py-3">
            <button
              onClick={submit}
              className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Create as draft
            </button>
          </div>
        </Card>
      </div>
    </>
  );
}
