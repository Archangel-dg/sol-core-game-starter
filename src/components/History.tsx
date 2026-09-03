'use client';
import { useT } from '@/lib/i18n';

import type { RoundLog } from './SingleBetGame';
import { verifyHref } from './VerifyLink';
import { toSol } from '@/lib/lamports';

/**
 * Letzte Runden (lokal im State). Design-Zone. Lebt seit dem 03.09.2026 im
 * Spielmenü der Kopfleiste (GameMenu), nicht mehr unter dem Spiel.
 *
 * Je Runde: Einsatz · Ergebnis (Multiplikator) · Wert (Auszahlung) · Verify.
 * Echt-Runden verlinken auf den Sol-Core Verifier (Browser-Nachrechnung);
 * Demo-Runden auf den rohen Demo-Endpunkt (der Verifier kennt nur
 * creator_rounds, keine demo_rounds).
 */
export function History({
  rounds,
  apiUrl,
  verifierUrl,
  demo = false,
  max = 8,
}: {
  rounds: RoundLog[];
  apiUrl: string;
  verifierUrl: string;
  demo?: boolean;
  max?: number;
}) {
  const t = useT();
  if (rounds.length === 0) return null;
  return (
    <div className="text-xs">
      <div className="mb-1 grid grid-cols-[1fr_auto_1fr_auto] gap-x-2 text-[10px] uppercase tracking-wide text-white/40">
        <span>{t('history.stake')}</span>
        <span className="text-right">{t('history.result')}</span>
        <span className="text-right">{t('history.value')}</span>
        <span />
      </div>
      <ul className="space-y-1">
        {rounds.slice(0, max).map((r) => (
          <li key={r.roundId} className="grid grid-cols-[1fr_auto_1fr_auto] items-baseline gap-x-2 tabular-nums">
            <span className="text-white/60">{toSol(r.betLamports)} ◎</span>
            <span className={`text-right ${r.win ? 'text-accent' : 'text-red-400'}`}>
              {(r.multiplierBps / 10000).toFixed(2)}×
            </span>
            <span className={`text-right ${r.win ? 'text-accent' : 'text-white/40'}`}>
              {r.win ? `+${toSol(r.payoutLamports)} ◎` : t('verify.lost')}
            </span>
            <a
              href={demo ? `${apiUrl}/api/game/demo/verify/${r.roundId}` : verifyHref(verifierUrl, r.roundId)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/30 underline underline-offset-2 hover:text-white/60"
            >
              {t('verify.short')}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
