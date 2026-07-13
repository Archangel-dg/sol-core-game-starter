'use client';

import { toSol } from '@/lib/lamports';

/**
 * Ergebnis-Anzeige (Design-Zone: Animation/Layout frei). Zeigt das serverseitig
 * bestimmte Ergebnis — nie im Client neu berechnen.
 */
export function ResultView({
  win,
  multiplierBps,
  payoutLamports,
  roll,
  detail,
}: {
  win: boolean;
  multiplierBps: number;
  payoutLamports: string;
  roll?: number | null;
  detail?: string;
}) {
  return (
    <div className="grid h-28 place-items-center rounded-xl bg-night text-center">
      <div>
        <div className={`text-3xl font-bold tabular-nums ${win ? 'text-accent' : 'text-red-400'}`}>
          {(multiplierBps / 10000).toFixed(2)}×
        </div>
        <div className="mt-1 text-sm text-white/70">
          {win ? `Gewonnen! Auszahlung ${toSol(payoutLamports)} ◎` : 'Verloren'}
          {roll != null && <span className="text-white/40"> · Roll {roll}</span>}
        </div>
        {detail && <div className="mt-0.5 text-xs text-white/40">{detail}</div>}
      </div>
    </div>
  );
}
