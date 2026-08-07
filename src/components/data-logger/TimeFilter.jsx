'use client';

import { useState } from 'react';

export function TimeFilter({ options, defaultValue }) {
  const [active, setActive] = useState(defaultValue ?? options[0]);
  return (
    <div className="flex items-center gap-1 rounded-lg border border-line bg-canvas p-0.5">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => setActive(opt)}
          className={[
            'rounded-md px-3 py-1 text-xs font-medium transition-colors',
            active === opt ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-ink',
          ].join(' ')}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
