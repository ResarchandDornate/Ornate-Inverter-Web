'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Copy, History as HistoryIcon, MapPin, ShieldAlert, ShieldCheck, User } from 'lucide-react';
import Topbar from '@/components/Topbar';
import { Card } from '@/components/data-logger/ui';
import { FreeMap } from '@/components/data-logger/FreeMap';
import { showInfo, showSuccess } from '@/lib/toast';

const TABS = ['Installation Info', 'Severe Weather'];

export function PlantDetail({ plant }) {
  const [tab, setTab] = useState(TABS[0]);
  const [alertLevel, setAlertLevel] = useState(plant.windThresholds.alertLevel);
  const [criticalLevel, setCriticalLevel] = useState(plant.windThresholds.criticalLevel);

  const copyCoord = (label, value) => {
    navigator.clipboard?.writeText(String(value));
    showSuccess(`${label} copied`);
  };

  const saveThresholds = () => showSuccess('Wind alert thresholds saved');

  const mapAssets = [{ id: plant.id, name: plant.name, status: 'running', location: plant.location }];

  return (
    <>
      <Topbar title={plant.name} breadcrumbs={['Data Logger', 'Inventory', 'Installations', plant.name]} />
      <div className="mx-auto max-w-350 px-4 py-5 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-semibold text-ink">{plant.name}</h1>
          <div className="flex rounded-md border border-line bg-white p-0.5 text-xs font-medium">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded px-3 py-1 ${tab === t ? 'bg-brand text-white' : 'text-muted hover:text-ink'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {tab === 'Severe Weather' ? (
          <Card className="flex flex-col items-center justify-center gap-2 px-6 py-20 text-center">
            <ShieldAlert className="h-6 w-6 text-muted" />
            <p className="text-sm font-semibold text-ink">No severe weather data yet</p>
            <p className="max-w-sm text-xs text-muted">
              Storm and severe-weather advisories for this installation will appear here once available.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Card className="p-5">
                  <h2 className="mb-3 text-sm font-semibold text-ink">Basic info</h2>
                  <dl className="space-y-2.5 text-sm">
                    <Row label="Name" value={plant.name} />
                    <Row label="Location" value={plant.basicInfo.location} />
                    <Row label="Country" value={plant.basicInfo.country} />
                    <Row label="Status" value={plant.basicInfo.status} />
                    <Row label="Service Center" value={plant.basicInfo.serviceCenter} />
                    <Row label="Total plant power" value={plant.basicInfo.totalPlantPower} />
                    <Row label="Advanced Services" value={plant.basicInfo.advancedServices} />
                  </dl>
                </Card>
                <Card className="p-5">
                  <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <User className="h-4 w-4 text-muted" /> Contact info
                  </h2>
                  <dl className="space-y-2.5 text-sm">
                    <Row label="Company" value={plant.contactInfo.company} />
                    <Row label="Tracker" value={plant.contactInfo.tracker} />
                    <Row label="Contact person" value={plant.contactInfo.contactPerson} />
                    <Row label="SCADA company" value={plant.contactInfo.scadaCompany} />
                    <Row label="Promotor name" value={plant.contactInfo.promotorName} />
                    <Row label="Final customer name" value={plant.contactInfo.finalCustomerName} />
                  </dl>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Card className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-ink">Devices</h2>
                    <Link href="/data-logger/inventory/device-list" className="text-xs font-medium text-brand hover:underline">
                      Device list
                    </Link>
                  </div>
                  <dl className="space-y-2.5 text-sm">
                    <Row label="NCU count" value={plant.devices.ncu} />
                    <Row label="RSU count" value={plant.devices.rsu} />
                    <Row label="TCU count" value={plant.devices.tcu} />
                    {plant.devices.tcuBreakdown.map((entry) => (
                      <Row key={entry.model} label={entry.model} value={entry.count} indent />
                    ))}
                  </dl>
                </Card>
                <Card className="p-5">
                  <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <HistoryIcon className="h-4 w-4 text-muted" /> History
                  </h2>
                  <dl className="space-y-2.5 text-sm">
                    <Row label="Created at" value={plant.history.createdAt} />
                    <Row label="Updated At" value={plant.history.updatedAt} />
                    <Row label="Last transmission" value={plant.history.lastTransmission} />
                  </dl>
                </Card>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => showInfo('Guardians view is not available in this preview yet.')}
                  className="flex-1 rounded-md border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink hover:bg-canvas"
                >
                  Guardians
                </button>
                <button
                  onClick={() => showInfo('Anomalies view is not available in this preview yet.')}
                  className="flex-1 rounded-md border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink hover:bg-canvas"
                >
                  Anomalies
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <Card className="overflow-hidden p-0">
                <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <MapPin className="h-4 w-4 text-muted" /> Map
                  </span>
                  <div className="ml-auto flex items-center gap-2 text-xs">
                    <CoordField label="Lat" value={plant.location.lat} onCopy={copyCoord} />
                    <CoordField label="Lng" value={plant.location.lng} onCopy={copyCoord} />
                  </div>
                </div>
                <div className="h-[320px]">
                  <FreeMap assets={mapAssets} selectedId={plant.id} onSelect={() => {}} defaultCenter={[plant.location.lat, plant.location.lng]} defaultZoom={13} />
                </div>
              </Card>

              <Card className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <ShieldCheck className="h-4 w-4 text-muted" /> Wind alert thresholds
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => showInfo('No changes logged yet.')}
                      className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-canvas"
                    >
                      Changelog
                    </button>
                    <button
                      onClick={saveThresholds}
                      className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark"
                    >
                      Save
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <label className="block text-xs font-medium text-muted">
                    Alert level
                    <div className="mt-1.5 flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2">
                      <input
                        value={alertLevel}
                        onChange={(event) => setAlertLevel(event.target.value)}
                        inputMode="numeric"
                        className="w-full bg-transparent text-sm text-ink outline-none"
                      />
                      <span className="text-muted">km/h</span>
                    </div>
                  </label>
                  <label className="block text-xs font-medium text-muted">
                    Critical level
                    <div className="mt-1.5 flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2">
                      <input
                        value={criticalLevel}
                        onChange={(event) => setCriticalLevel(event.target.value)}
                        inputMode="numeric"
                        className="w-full bg-transparent text-sm text-ink outline-none"
                      />
                      <span className="text-muted">km/h</span>
                    </div>
                  </label>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Row({ label, value, indent }) {
  return (
    <div className={`flex items-center justify-between gap-3 border-b border-line pb-2.5 last:border-0 last:pb-0 ${indent ? 'pl-3' : ''}`}>
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}

function CoordField({ label, value, onCopy }) {
  return (
    <button
      onClick={() => onCopy(label, value)}
      className="flex items-center gap-1.5 rounded-md border border-line bg-canvas px-2 py-1 text-muted hover:text-ink"
      title={`Copy ${label}`}
    >
      {label} {value} <Copy className="h-3 w-3" />
    </button>
  );
}
