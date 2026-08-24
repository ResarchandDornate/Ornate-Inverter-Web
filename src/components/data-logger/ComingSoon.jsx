import { Card } from '@/components/data-logger/ui';
import Topbar from '@/components/Topbar';

// Shared empty-state for Data Logger nav tabs that mirror the Suntrack
// Services sidebar but don't have a backing feature/API in this app yet.
export function ComingSoon({ icon: Icon, title, note }) {
  return (
    <>
      <Topbar title={title} breadcrumbs={['Data Logger', title]} />
      <div className="mx-auto max-w-350 px-4 py-5 sm:px-6">
        <Card className="flex flex-col items-center justify-center gap-3 px-6 py-24 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-canvas">
            <Icon className="h-5 w-5 text-muted" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">{title}</p>
            <p className="mt-1 max-w-sm text-xs text-muted">{note}</p>
          </div>
        </Card>
      </div>
    </>
  );
}
