'use client';

import { useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, CloudSun, Cpu, Gauge, MapPin, Radio, Server, TriangleAlert, WifiOff } from 'lucide-react';
import Topbar from '@/components/Topbar';
import { Card } from '@/components/data-logger/ui';
import { FreeMap } from '@/components/data-logger/FreeMap';

export function MonitoringWorkspace({ assets }) {
  const [selectedId, setSelectedId] = useState(assets[0]?.id);
  const [view, setView] = useState('systems');
  const [country, setCountry] = useState('All countries');

  const countries = useMemo(
    () => Array.from(new Set(assets.map((asset) => asset.country || 'Unknown'))).sort(),
    [assets]
  );
  const filteredAssets = useMemo(
    () => (country === 'All countries' ? assets : assets.filter((asset) => (asset.country || 'Unknown') === country)),
    [assets, country]
  );
  const selected = useMemo(
    () => filteredAssets.find((asset) => asset.id === selectedId) ?? filteredAssets[0],
    [filteredAssets, selectedId]
  );
  const online = filteredAssets.filter((asset) => asset.status === 'running').length;
  const offline = filteredAssets.filter((asset) => asset.status !== 'running').length;
  const alerts = filteredAssets.filter((asset) => asset.health && asset.health !== 'ok').length;

  // Switching country drops any selected installation that falls outside it.
  const changeCountry = (value) => {
    setCountry(value);
    const stillVisible = value === 'All countries' || assets.find((asset) => asset.id === selectedId && (asset.country || 'Unknown') === value);
    if (!stillVisible) setSelectedId(undefined);
  };

  return <>
    <Topbar title="Monitoring" breadcrumbs={['Web Services', 'Monitoring']} />
    <main className="min-h-[calc(100vh-4.5rem)] bg-canvas px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-350">
        <header className="flex flex-wrap items-end gap-4"><div><p className="text-sm font-semibold text-ink">Fleet monitoring</p><p className="mt-1 text-xs text-muted">Live health, communication, and power visibility for every installation.</p></div><div className="ml-auto flex overflow-hidden rounded-lg border border-line bg-white p-1 text-xs font-semibold"><button onClick={() => setView('systems')} className={`rounded-md px-3 py-1.5 ${view === 'systems' ? 'bg-brand text-white' : 'text-muted hover:text-ink'}`}>Systems</button><button onClick={() => setView('alerts')} className={`rounded-md px-3 py-1.5 ${view === 'alerts' ? 'bg-brand text-white' : 'text-muted hover:text-ink'}`}>Alerts</button></div></header>

        <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><HealthCard icon={CheckCircle2} value={online} label="Systems online" tone="good" /><HealthCard icon={WifiOff} value={offline} label="Offline / disconnected" tone="muted" /><HealthCard icon={TriangleAlert} value={alerts} label="Active alerts" tone="warn" /><HealthCard icon={CloudSun} value="—" label="Weather connected" tone="brand" /></section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-line bg-white px-4 py-3">
              <div><h2 className="text-sm font-semibold text-ink">Installation map</h2><p className="mt-0.5 text-xs text-muted">Select a marker to inspect an installation.</p></div>
              <label className="ml-auto flex min-w-45 items-center gap-2 rounded-md border border-line bg-canvas px-3 py-2 text-xs text-muted">
                Country
                <select
                  value={country}
                  onChange={(event) => changeCountry(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-ink outline-none"
                >
                  <option>All countries</option>
                  {countries.map((name) => <option key={name}>{name}</option>)}
                </select>
              </label>
              <label className="flex min-w-55 items-center gap-2 rounded-md border border-line bg-canvas px-3 py-2 text-xs text-muted">
                Installation
                <select
                  value={selected ? selected.name : 'All installations'}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === 'All installations') { setSelectedId(undefined); return; }
                    const asset = filteredAssets.find((item) => item.name === value);
                    if (asset) setSelectedId(asset.id);
                  }}
                  className="min-w-0 flex-1 bg-transparent text-ink outline-none"
                >
                  <option>All installations</option>
                  {filteredAssets.map((asset) => <option key={asset.id}>{asset.name}</option>)}
                </select>
              </label>
            </div>
            <div className="relative h-[530px] bg-[#e8eef3]"><FreeMap assets={filteredAssets} selectedId={selected?.id} onSelect={(id) => setSelectedId(id)} defaultCenter={[22, 0]} defaultZoom={2} /><div className="absolute bottom-3 left-3 z-10 flex gap-3 rounded-md bg-white/95 px-3 py-2 text-[11px] shadow"><Legend color="bg-good" label="Online" /><Legend color="bg-warn" label="Warning" /><Legend color="bg-muted" label="Offline" /></div>{!filteredAssets.length && <EmptyMap />}</div>
          </Card>
          <aside className="space-y-4"><Card className="p-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand"><Cpu className="h-5 w-5" /></span><div><p className="text-sm font-semibold text-ink">{selected?.name ?? 'No installation selected'}</p><p className="mt-0.5 text-xs text-muted">{selected?.status === 'running' ? 'Reporting live' : 'Waiting for telemetry'}</p></div></div>{selected ? <><div className="mt-5 flex items-center gap-2 rounded-md bg-good/10 px-3 py-2 text-xs font-medium text-good"><CheckCircle2 className="h-4 w-4" />{selected.status === 'running' ? 'Communication healthy' : 'Communication needs attention'}</div><dl className="mt-4 space-y-3 text-sm"><DataRow icon={Gauge} label="Current output" value={`${selected.kw ?? 0} kW`} /><DataRow icon={Activity} label="Today’s energy" value={`${selected.energy?.today ?? 0} kWh`} /><DataRow icon={MapPin} label="Location" value={selected.location?.label ?? 'Not reported'} /></dl></> : <p className="mt-5 text-sm text-muted">Choose an installation from the map or list once telemetry is available.</p>}</Card><Card className="p-5"><h2 className="text-sm font-semibold text-ink">{view === 'systems' ? 'System status' : 'Alert summary'}</h2><div className="mt-4 space-y-3">{view === 'systems' ? <><StatusLine color="bg-good" label="Online systems" value={online} /><StatusLine color="bg-muted" label="Offline systems" value={offline} /></> : <><StatusLine color="bg-danger" label="Critical" value={filteredAssets.filter((asset) => asset.health === 'trip').length} /><StatusLine color="bg-warn" label="Warnings" value={alerts} /></>}</div></Card></aside>
        </section>
      </div>
    </main>
  </>;
}

function HealthCard({ icon: Icon, value, label, tone }) { const styles = { good: 'bg-good/10 text-good', muted: 'bg-canvas text-muted', warn: 'bg-warn/10 text-warn', brand: 'bg-brand/10 text-brand' }; return <Card className="flex items-center gap-3 p-4"><span className={`flex h-10 w-10 items-center justify-center rounded-full ${styles[tone]}`}><Icon className="h-5 w-5" /></span><div><p className="text-xl font-semibold text-ink">{value}</p><p className="text-xs text-muted">{label}</p></div></Card>; }
function DataRow({ icon: Icon, label, value }) { return <div className="flex gap-2.5"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted" /><div className="min-w-0"><dt className="text-xs text-muted">{label}</dt><dd className="mt-0.5 truncate font-medium text-ink" title={value}>{value}</dd></div></div>; }
function StatusLine({ color, label, value }) { return <div className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 text-muted"><span className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span><strong className="text-ink">{value}</strong></div>; }
function Legend({ color, label }) { return <span className="flex items-center gap-1.5 text-muted"><span className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>; }
function EmptyMap() { return <div className="absolute inset-0 z-10 flex items-center justify-center p-5"><div className="rounded-xl bg-white/95 p-5 text-center shadow"><Server className="mx-auto h-5 w-5 text-muted" /><p className="mt-2 text-sm font-semibold text-ink">No locations available</p><p className="mt-1 max-w-xs text-xs text-muted">Markers will appear as soon as your backend sends installation GPS coordinates.</p></div></div>; }
