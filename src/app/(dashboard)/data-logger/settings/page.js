import { Building2, Cpu, BellRing, Users, ChevronRight } from 'lucide-react';
import { Card } from '@/components/data-logger/ui';
import Topbar from '@/components/Topbar';

const CATEGORIES = [
  {
    icon: Building2,
    title: 'Site Configuration',
    note: 'Site name, address, timezone and sustainability targets.',
  },
  {
    icon: Cpu,
    title: 'Devices & Register Map',
    note: 'RMS device provisioning and Modbus register mapping.',
  },
  {
    icon: BellRing,
    title: 'Alerts & Thresholds',
    note: 'Fault and parameter threshold rules that trigger alerts.',
  },
  {
    icon: Users,
    title: 'Users & Access',
    note: 'Who can view or manage this site\'s data logger.',
  },
];

export default function SettingsPage() {
  return (
    <>
      <Topbar title="Settings" breadcrumbs={['Data Logger', 'Settings']} />
      <div className="mx-auto max-w-350 px-4 py-5 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CATEGORIES.map((c) => (
            <Card key={c.title} className="flex items-start gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-canvas">
                <c.icon className="h-5 w-5 text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-ink">{c.title}</h3>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
                </div>
                <p className="mt-1 text-xs text-muted">{c.note}</p>
                <span className="mt-3 inline-block rounded-full bg-canvas px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-muted">
                  Coming soon
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
