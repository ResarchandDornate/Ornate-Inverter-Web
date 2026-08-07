export function Card({ children, className = '' }) {
  return <div className={`rounded-xl border border-line bg-panel ${className}`}>{children}</div>;
}

export function SectionTitle({ icon, children, right }) {
  return (
    <div className="flex items-center gap-2">
      {icon && <span className="text-muted">{icon}</span>}
      <h2 className="text-sm font-semibold text-ink">{children}</h2>
      {right && <div className="ml-auto">{right}</div>}
    </div>
  );
}

const STATUS_STYLE = {
  running: { dot: 'bg-good', text: 'text-good', label: 'Running' },
  stopped: { dot: 'bg-warn', text: 'text-warn', label: 'Stopped' },
  disconnected: { dot: 'bg-muted', text: 'text-muted', label: 'Disconnected' },
};

export function StatusDot({ status }) {
  const s = STATUS_STYLE[status];
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${s.dot}`} title={s.label} />;
}

export function StatusPill({ status }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${s.text}`}>
      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

/** kWh / kW value formatting helper. */
export function fmt(n, digits = 2) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
