'use client';
import { useT } from '@/lib/i18n';

import { toSol } from '@/lib/lamports';
import { useFiat } from '@/lib/fiat';

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
  const t = useT();
  const { format } = useFiat();
  return (
    <div className="grid h-full min-h-28 place-items-center rounded-xl bg-night text-center">
      <div>
        <div className={`text-3xl font-bold tabular-nums ${win ? 'text-accent' : 'text-red-400'}`}>
          {(multiplierBps / 10000).toFixed(2)}×
        </div>
        <div className="mt-1 text-sm text-white/70">
          {win ? t('result.won', { amount: toSol(payoutLamports) }) : t('result.lost')}
          {roll != null && <span className="text-white/40"> {t('result.roll', { roll })}</span>}
        </div>
        {win && format(payoutLamports) && (
          <div className="mt-0.5 text-xs text-white/40">{format(payoutLamports)}</div>
        )}
        {detail && <div className="mt-0.5 text-xs text-white/40">{detail}</div>}
      </div>
    </div>
  );
}
