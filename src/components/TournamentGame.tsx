'use client';

import { useCallback, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import type { EngineDef } from '@/lib/engines';
import type { TournamentCycleInfo, TournamentLeaderboardEntry, TournamentRunView } from '@/lib/solcore';
import { toSol } from '@/lib/lamports';
import { toUiError } from '@/lib/errors';

/**
 * Turnier-Flow (gauntlet): enter (fester Einsatz → Pot) → step* (Risikostufe)
 * → banken. Countdown, Live-Pot, Leaderboard und eigener Bestscore pollen den
 * Server (5 s). Ergebnisse kommen ausschließlich vom Server; die UI hier ist
 * bewusst schlicht — Design-Zone. Reconnect nach Reload über localStorage.
 */

const RISK_LABEL: Record<string, { label: string; sub: string; cls: string }> = {
  safe: { label: 'Safe', sub: '90% · +10', cls: 'border-accent/40 hover:bg-accent/10' },
  medium: { label: 'Medium', sub: '60% · +15', cls: 'border-amber-300/40 hover:bg-amber-300/10' },
  risky: { label: 'Risky', sub: '30% · +30', cls: 'border-red-400/40 hover:bg-red-400/10' },
};

function useCountdown(endsAt: string | undefined): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);
  if (!endsAt) return '—';
  const ms = new Date(endsAt).getTime() - now;
  if (ms <= 0) return 'Zyklus endet…';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86_400);
  const h = Math.floor((s % 86_400) / 3_600);
  const m = Math.floor((s % 3_600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s % 60}s`;
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function TournamentGame({ engine }: { engine: EngineDef }) {
  const { publicKey, connected } = useWallet();
  const wallet = publicKey?.toBase58() ?? null;
  const [cycle, setCycle] = useState<TournamentCycleInfo['cycle']>(null);
  const [board, setBoard] = useState<TournamentLeaderboardEntry[]>([]);
  const [me, setMe] = useState<{ attempts: number; bestScore: number; rank: number | null; activeRunId: string | null } | null>(null);
  const [view, setView] = useState<TournamentRunView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trn = engine.tournament!;
  const storeKey = 'sc_tournament_run';

  const countdown = useCountdown(view?.cycle.endsAt ?? cycle?.endsAt);

  // Zyklus + Leaderboard + eigener Stand pollen (5 s).
  const refresh = useCallback(async () => {
    try {
      const [c, lb] = await Promise.all([
        fetch('/api/tournament/cycle').then((r) => r.json()) as Promise<TournamentCycleInfo>,
        fetch('/api/tournament/leaderboard?limit=10').then((r) => r.json()),
      ]);
      if (c.cycle) setCycle(c.cycle);
      if (Array.isArray(lb.leaderboard)) setBoard(lb.leaderboard);
      if (wallet) {
        const m = await fetch(`/api/tournament/me/${wallet}`).then((r) => r.json());
        if (typeof m.attempts === 'number') setMe(m);
      }
    } catch {
      /* nächster Poll versucht es erneut */
    }
  }, [wallet]);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 5_000);
    return () => clearInterval(id);
  }, [refresh]);

  // Reconnect: aktiven Lauf nach Reload fortsetzen.
  useEffect(() => {
    const id = typeof window !== 'undefined' ? localStorage.getItem(storeKey) : null;
    if (!id) return;
    fetch(`/api/tournament/run/${id}`)
      .then((r) => r.json())
      .then((v: TournamentRunView & { error?: unknown }) => {
        if (!v.error && v.status === 'active') setView(v);
        else localStorage.removeItem(storeKey);
      })
      .catch(() => localStorage.removeItem(storeKey));
  }, []);

  const call = async (path: string, body?: unknown): Promise<TournamentRunView | null> => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      }).then((x) => x.json());
      if (r.error) {
        const details = r.error.details as Record<string, unknown> | undefined;
        const reason = typeof details?.reason === 'string' ? details.reason : (r.error.reason as string | undefined);
        const ui = toUiError(r.error.code, r.error.message, reason, details);
        setError(`${ui.code}: ${ui.message}`);
        return null;
      }
      return r as TournamentRunView;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const enter = async () => {
    if (!wallet) return;
    const v = await call('/api/tournament/enter', { playerWallet: wallet });
    if (v) {
      localStorage.setItem(storeKey, v.runId);
      setView(v);
    }
  };

  const finishIfEnded = (v: TournamentRunView) => {
    if (v.status !== 'active') {
      localStorage.removeItem(storeKey);
      void refresh();
    }
  };

  const step = async (risk: 'safe' | 'medium' | 'risky') => {
    if (!view) return;
    const v = await call(`/api/tournament/run/${view.runId}/step`, trn.buildStep({ risk }));
    if (v) {
      setView(v);
      finishIfEnded(v);
    }
  };

  const stop = async () => {
    if (!view) return;
    const v = await call(`/api/tournament/run/${view.runId}/stop`);
    if (v) {
      setView(v);
      finishIfEnded(v);
    }
  };

  const active = view?.status === 'active';
  const ended = view && view.status !== 'active';

  return (
    <div className="space-y-4">
      {/* Turnier-Leiste: Countdown + Pot + Einsätze */}
      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-white/40">Endet in</div>
          <div className="text-sm font-semibold tabular-nums text-white">{countdown}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-white/40">Pot</div>
          <div className="text-sm font-semibold tabular-nums text-accent">
            {toSol(view?.cycle.potLamports ?? cycle?.potLamports ?? '0')} ◎
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-white/40">Einsätze</div>
          <div className="text-sm font-semibold tabular-nums text-white">
            {view?.cycle.entriesCount ?? cycle?.entriesCount ?? 0}
          </div>
        </div>
      </div>

      {/* Spielfläche */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-4 grid h-28 place-items-center rounded-xl bg-night text-center">
          {view ? (
            <div>
              <div className={`text-3xl font-bold tabular-nums ${view.status === 'busted' ? 'text-red-400' : 'text-accent'}`}>
                {view.score} <span className="text-base font-semibold text-white/50">Punkte</span>
              </div>
              <div className="mt-1 text-sm text-white/70">
                {active && `Schritt ${view.steps}/${view.maxSteps}`}
                {view.status === 'busted' && 'Bust — Lauf genullt'}
                {(view.status === 'stopped' || view.status === 'expired') &&
                  `Gebankt${view.bestScore !== undefined ? ` · Bester Score: ${view.bestScore}` : ''}`}
              </div>
            </div>
          ) : (
            <div className="px-4">
              <p className="text-white/40">{engine.blurb}</p>
              <p className="mt-2 text-xs text-white/30">
                {engine.playerFacts.inputs} {engine.playerFacts.outcomes}
              </p>
            </div>
          )}
        </div>

        {!view || ended ? (
          <>
            {cycle && (
              <p className="mb-3 text-center text-xs text-white/40">
                Einsatz {toSol(cycle.entryFeeLamports)} ◎ · du zahlst{' '}
                {toSol(cycle.totalChargeLamports)} ◎ (inkl. Fees)
                {cycle.maxAttemptsPerCycle !== null &&
                  me &&
                  ` · Versuche ${me.attempts}/${cycle.maxAttemptsPerCycle}`}
              </p>
            )}
            <button
              type="button"
              onClick={() => void enter()}
              disabled={busy || !connected || !cycle}
              className="w-full rounded-xl bg-gradient-to-r from-accent to-accent-soft py-3 font-semibold text-night disabled:opacity-40"
            >
              {!connected ? 'Wallet verbinden' : busy ? 'Läuft…' : ended ? 'Neuer Versuch' : 'Mitspielen'}
            </button>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-white/40">{trn.hint}</p>
            <div className="grid grid-cols-3 gap-2">
              {trn.step.tiers.map((tier) => (
                <button
                  key={tier}
                  type="button"
                  disabled={busy}
                  onClick={() => void step(tier)}
                  className={`rounded-lg border py-2 text-sm transition disabled:opacity-40 ${RISK_LABEL[tier]!.cls}`}
                >
                  <div className="font-semibold">{RISK_LABEL[tier]!.label}</div>
                  <div className="text-[10px] text-white/50">{RISK_LABEL[tier]!.sub}</div>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void stop()}
              disabled={busy}
              className="w-full rounded-xl bg-gradient-to-r from-accent to-accent-soft py-2.5 font-semibold text-night disabled:opacity-40"
            >
              Banken ({view.score} Punkte)
            </button>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>

      {/* Mein Stand + Leaderboard */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        {me && wallet && (
          <p className="mb-2 text-xs text-white/50">
            Dein bester Score: <span className="font-semibold text-white">{me.bestScore}</span>
            {me.rank !== null && (
              <>
                {' '}· Platz <span className="font-semibold text-accent">#{me.rank}</span>
              </>
            )}
          </p>
        )}
        <div className="text-[10px] uppercase tracking-wider text-white/40">Leaderboard</div>
        {board.length === 0 ? (
          <p className="pt-1 text-xs text-white/30">Noch keine Scores in diesem Zyklus.</p>
        ) : (
          <ul className="pt-1 text-sm">
            {board.map((e) => (
              <li
                key={e.wallet}
                className={`flex items-center gap-2 py-0.5 tabular-nums ${
                  wallet === e.wallet ? 'text-accent' : 'text-white/70'
                }`}
              >
                <span className="w-7 text-white/40">#{e.rank}</span>
                <span className="min-w-0 flex-1 truncate">
                  {e.wallet.slice(0, 4)}…{e.wallet.slice(-4)}
                </span>
                <span className="font-semibold">{e.bestScore}</span>
              </li>
            ))}
          </ul>
        )}
        {cycle && (
          <p className="pt-2 text-[11px] text-white/30">
            Ausschüttung: {cycle.payoutSplitBps.map((b, i) => `#${i + 1} ${b / 100}%`).join(' · ')} — der
            Pot geht zu 100% an die Gewinner.
          </p>
        )}
      </div>
    </div>
  );
}
