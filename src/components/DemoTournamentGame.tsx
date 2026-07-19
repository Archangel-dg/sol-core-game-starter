'use client';

import { useCallback, useEffect, useState } from 'react';
import type { EngineDef } from '@/lib/engines';
import type { DemoRunView } from '@/lib/solcore';
import { toUiError } from '@/lib/errors';
import { usePlayer, useDemo } from './DemoProvider';

/**
 * Turnier-DEMO: ein Übungslauf gegen den simulierten Saldo — gleiche Gauntlet-
 * Mechanik (Risikostufen, Roll pro Schritt), aber KEIN echter Pot/Leaderboard
 * (das echte Turnier bleibt dem Echtgeld-Modus vorbehalten). Ergebnisse kommen
 * ausschließlich vom Server. UI bewusst schlicht — Design-Zone.
 */
const RISK_LABEL: Record<string, { label: string; sub: string; cls: string }> = {
  safe: { label: 'Safe', sub: '90% · +10', cls: 'border-accent/40 hover:bg-accent/10' },
  medium: { label: 'Medium', sub: '60% · +15', cls: 'border-amber-300/40 hover:bg-amber-300/10' },
  risky: { label: 'Risky', sub: '30% · +30', cls: 'border-red-400/40 hover:bg-red-400/10' },
};

export function DemoTournamentGame({ engine }: { engine: EngineDef }) {
  const { wallet, connected } = usePlayer();
  const { refreshDemoBalance } = useDemo();
  const [view, setView] = useState<DemoRunView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trn = engine.tournament!;
  const storeKey = 'sc_demo_tournament_run';

  const call = async (path: string, body?: unknown): Promise<DemoRunView | null> => {
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
      return r as DemoRunView;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const finishIfEnded = useCallback(
    (v: DemoRunView) => {
      if (v.status !== 'active') {
        localStorage.removeItem(storeKey);
        void refreshDemoBalance();
      }
    },
    [refreshDemoBalance],
  );

  // Reconnect: aktiven Demo-Lauf nach Reload fortsetzen.
  useEffect(() => {
    const id = typeof window !== 'undefined' ? localStorage.getItem(storeKey) : null;
    if (!id) return;
    fetch(`/api/demo/tournament/run/${id}`)
      .then((r) => r.json())
      .then((v: DemoRunView & { error?: unknown }) => {
        if (!v.error && v.status === 'active') setView(v);
        else localStorage.removeItem(storeKey);
      })
      .catch(() => localStorage.removeItem(storeKey));
  }, []);

  const enter = async () => {
    if (!wallet) return;
    const v = await call('/api/demo/tournament/enter', { playerWallet: wallet });
    if (v) {
      localStorage.setItem(storeKey, v.runId);
      setView(v);
      void refreshDemoBalance();
    }
  };
  const step = async (risk: 'safe' | 'medium' | 'risky') => {
    if (!view) return;
    const v = await call(`/api/demo/tournament/run/${view.runId}/step`, { risk });
    if (v) { setView(v); finishIfEnded(v); }
  };
  const stop = async () => {
    if (!view) return;
    const v = await call(`/api/demo/tournament/run/${view.runId}/stop`);
    if (v) { setView(v); finishIfEnded(v); }
  };

  const active = view?.status === 'active';
  const ended = view && view.status !== 'active';

  return (
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
              {view.status === 'stopped' && 'Gebankt'}
            </div>
          </div>
        ) : (
          <div className="px-4">
            <p className="text-white/40">{engine.blurb}</p>
            <p className="mt-2 text-xs text-white/30">{engine.playerFacts.inputs} {engine.playerFacts.outcomes}</p>
          </div>
        )}
      </div>

      {!view || ended ? (
        <>
          <p className="mb-3 text-center text-xs text-white/40">Übungslauf im Demo-Modus — kein echter Pot, es geht um den Score.</p>
          <button
            type="button"
            onClick={() => void enter()}
            disabled={busy || !connected}
            className="w-full rounded-xl bg-gradient-to-r from-accent to-accent-soft py-3 font-semibold text-night disabled:opacity-40"
          >
            {busy ? 'Läuft…' : ended ? 'Neuer Versuch' : 'Übungslauf starten'}
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
  );
}
