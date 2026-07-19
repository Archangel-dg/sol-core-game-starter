'use client';

import { useDemo } from './DemoProvider';
import { toSol } from '@/lib/lamports';

/**
 * Demo-Leiste: entweder der Einstieg („Demo spielen — 3 SOL") oder, wenn aktiv,
 * der simulierte Saldo mit „Beenden". Design frei anpassbar; die Demo-Logik
 * (startDemo/exitDemo, /api/demo/*) ist Vertrag.
 */
export function DemoBar() {
  const { demo, demoBalance, starting, error, startDemo, exitDemo } = useDemo();

  if (!demo) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-accent/30 bg-accent/[0.06] p-3">
        <div className="min-w-0 text-xs text-white/70">
          <span className="font-semibold text-white">Demo-Modus</span> — ohne Wallet mit simulierten 3 ◎ testen.
          Jeder Spin ist trotzdem echt provably-fair.
        </div>
        <button
          type="button"
          onClick={() => void startDemo()}
          disabled={starting}
          className="shrink-0 rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-night disabled:opacity-40"
        >
          {starting ? '…' : 'Demo spielen (3 ◎)'}
        </button>
        {error && <span className="w-full text-xs text-red-400">Demo-Start fehlgeschlagen: {error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-accent/40 bg-accent/[0.08] p-3">
      <div className="flex items-baseline gap-2">
        <span className="rounded bg-accent/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
          Demo
        </span>
        <span className="text-xs text-white/50">Guthaben</span>
        <span className="font-bold tabular-nums text-accent">
          {demoBalance === null ? '—' : `${toSol(demoBalance)} ◎`}
        </span>
      </div>
      <button
        type="button"
        onClick={exitDemo}
        className="shrink-0 rounded-full border border-white/15 px-4 py-1.5 text-sm"
      >
        Beenden
      </button>
    </div>
  );
}
