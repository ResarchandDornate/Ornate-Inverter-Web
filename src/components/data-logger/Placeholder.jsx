export function Placeholder({ title, note }) {
  return (
    <div className="flex h-full items-center justify-center px-6 py-20">
      <div className="max-w-md text-center">
        <h1 className="text-lg font-semibold text-ink">{title}</h1>
        <p className="mt-2 text-sm text-muted">{note}</p>
      </div>
    </div>
  );
}
