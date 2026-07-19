'use client';

import type { RoundLog } from './SingleBetGame';
import { toSol } from '@/lib/lamports';

/** Letzte Runden (lokal im State). Design-Zone. */
export function History({ rounds, apiUrl, demo = false }: { rounds: RoundLog[]; apiUrl: string; demo?: boolean }) {
  if (rounds.length === 0) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-2 text-xs uppercase tracking-wide text-white/50">Letzte Runden</div>
      <ul className="space-y-1 text-xs">
        {rounds.slice(0, 8).map((r) => (
          <li key={r.roundId} className="flex items-center justify-between gap-2">
            <span className={r.win ? 'text-accent' : 'text-red-400'}>
              {(r.multiplierBps / 10000).toFixed(2)}× {r.win ? `+${toSol(r.payoutLamports)} ◎` : 'verloren'}
            </span>
            <a
              href={`${apiUrl}/api/game/${demo ? 'demo/verify' : 'verify'}/${r.roundId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/30 underline underline-offset-2 hover:text-white/60"
            >
              verify
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
