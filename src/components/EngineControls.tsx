'use client';

import type { Control } from '@/lib/engines';

/**
 * Datengesteuerte Param-Eingaben je Engine (Design-Zone: Styling frei).
 * Die Werte-Struktur/params sind Systemvertrag (siehe lib/engines.ts).
 */
export function EngineControls({
  controls,
  values,
  onChange,
}: {
  controls: Control[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
}) {
  if (controls.length === 0) {
    return <p className="text-xs text-white/40">Diese Engine braucht keine Zusatz-Eingaben.</p>;
  }
  return (
    <div className="grid gap-3">
      {controls.map((c) => (
        <label key={c.name} className="text-xs text-white/50">
          {c.label}
          {c.kind === 'select' ? (
            <select
              value={values[c.name] ?? c.default}
              onChange={(e) => onChange(c.name, e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-night px-3 py-2 text-white outline-none focus:border-accent/50"
            >
              {c.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : c.kind === 'number' ? (
            <input
              type="number"
              inputMode="decimal"
              min={c.min}
              max={c.max}
              step={c.step ?? 1}
              value={values[c.name] ?? String(c.default)}
              onChange={(e) => onChange(c.name, e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-night px-3 py-2 tabular-nums text-white outline-none focus:border-accent/50"
            />
          ) : (
            <>
              <input
                value={values[c.name] ?? ''}
                onChange={(e) => onChange(c.name, e.target.value)}
                placeholder={c.hint}
                className="mt-1 w-full rounded-lg border border-white/10 bg-night px-3 py-2 tabular-nums text-white outline-none focus:border-accent/50"
              />
              {c.hint && <span className="mt-0.5 block text-[11px] text-white/30">{c.hint}</span>}
            </>
          )}
        </label>
      ))}
    </div>
  );
}
