import { AutoRefresh } from "@/components/data-logger/AutoRefresh";

// Wraps every /data-logger/* route. Applies the data-logger's own light
// "canvas" background + ink text so its ported pages render with their own
// palette inside the portal shell, and re-fetches the server components every
// 5s so live MQTT data appears without a manual reload.
export default function DataLoggerLayout({ children }) {
  return (
    <div className="flex-1 min-w-0 bg-canvas text-ink">
      <AutoRefresh seconds={5} />
      {children}
    </div>
  );
}
