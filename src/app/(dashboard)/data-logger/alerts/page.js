import { Bell, ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react';
import { Card } from '@/components/data-logger/ui';
import Topbar from '@/components/Topbar';

export const dynamic = 'force-dynamic';

const SUMMARY = [
  { label: 'Critical', value: 0, icon: AlertOctagon, tone: 'text-danger', bg: 'bg-danger/10' },
  { label: 'Warning', value: 0, icon: AlertTriangle, tone: 'text-warn', bg: 'bg-warn/10' },
  { label: 'Resolved Today', value: 0, icon: ShieldCheck, tone: 'text-good', bg: 'bg-good/10' },
];

export default function AlertsPage() {
  return (
    <>
      <Topbar title="Alerts" breadcrumbs={['Data Logger', 'Alerts']} />
      <div className="mx-auto max-w-350 px-4 py-5 sm:px-6">
        {/* Summary strip */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {SUMMARY.map((s) => (
            <Card key={s.label} className="flex items-center gap-4 px-5 py-4">
              <div className={`flex h-11 w-11 items-center justify-center rounded-full ${s.bg}`}>
                <s.icon className={`h-5 w-5 ${s.tone}`} />
              </div>
              <div>
                <div className="text-2xl font-semibold tracking-tight text-ink">{s.value}</div>
                <div className="mt-0.5 text-xs text-muted">{s.label}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Alert feed */}
        <Card className="mt-5 flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-canvas">
            <Bell className="h-5 w-5 text-muted" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">No alerts right now</p>
            <p className="mt-1 max-w-sm text-xs text-muted">
              Fault and threshold alerts across your fleet will appear here as soon as an RMS
              device reports one over MQTT.
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}
