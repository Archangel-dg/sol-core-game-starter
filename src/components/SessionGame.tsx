'use client';

import { useCallback, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import type { EngineDef } from '@/lib/engines';
import type { SessionView } from '@/lib/solcore';
import { solToLamports, toSol } from '@/lib/lamports';
import { toUiError } from '@/lib/errors';
import type { RoundLog } from './SingleBetGame';

/**
 * Generischer Session-Flow (mines/hilo/towers/pump): start → step* → cashout.
 * Reconnect nach Reload über localStorage. Ergebnisse kommen vom Server;
 * die UI hier ist bewusst schlicht — Design-Zone.
 */
export function SessionGame({
  engine,
  gameId,
  onRound,
  onLog,
}: {
  engine: EngineDef;
  gameId: string;
  onRound: (serverSeedHash: string, roundId: string) => void;
  onLog: (r: RoundLog) => void;
}) {
  const { publicKey, connected } = useWallet();
  const [bet, setBet] = useState('0.01');
  const [view, setView] = useState<SessionView | null>(null);
  const [indexVal, setIndexVal] = useState('0');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const storeKey = `sc_session_${gameId}`;
  const sess = engine.session!;

  const finishIfEnded = useCallback(
    (v: SessionView) => {
      if (v.status !== 'active') {
        localStorage.removeItem(storeKey);
        if (v.roundId) {
          onRound(v.proof.serverSeedHash, v.roundId);
          onLog({
            win: v.status === 'cashed_out' && v.payoutLamports !== '0',
            multiplierBps: v.multiplierBps,
            payoutLamports: v.payoutLamports ?? '0',
            roundId: v.roundId,
          });
        }
      }
    },
    [onLog, onRound, storeKey],
  );

  // Reconnect: aktive Session nach Reload fortsetzen.
  useEffect(() => {
    const id = typeof window !== 'undefined' ? localStorage.getItem(storeKey) : null;
    if (!id) return;
    fetch(`/api/session/${id}`)
      .then((r) => r.json())
      .then((v: SessionView & { error?: unknown }) => {
        if (!v.error) {
          setView(v);
          finishIfEnded(v);
        } else localStorage.removeItem(storeKey);
      })
      .catch(() => localStorage.removeItem(storeKey));
  }, [storeKey, finishIfEnded]);

  const call = async (path: string, body?: unknown): Promise<SessionView | null> => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      }).then((x) => x.json());
      if (r.error) {
        const ui = toUiError(r.error.code, r.error.message, r.error.reason);
        setError(`${ui.code}: ${ui.message}`);
        return null;
      }
      return r as SessionView;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    if (!publicKey) return;
    const v = await call('/api/session/start', {
      playerWallet: publicKey.toBase58(),
      betLamports: solToLamports(bet).toString(),
    });
    if (v) {
      localStorage.setItem(storeKey, v.sessionId);
      setView(v);
    }
  };

  const step = async (arg: { value?: number; guess?: 'higher' | 'lower' }) => {
    if (!view) return;
    const v = await call(`/api/session/${view.sessionId}/step`, sess.buildStep(arg));
    if (v) {
      setView(v);
      finishIfEnded(v);
    }
  };

  const cashout = async () => {
    if (!view) return;
    const v = await call(`/api/session/${view.sessionId}/cashout`);
    if (v) {
      setView(v);
      finishIfEnded(v);
    }
  };

  const active = view?.status === 'active';
  const ended = view && view.status !== 'active';

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      {/* HUD */}
      <div className="mb-4 grid h-28 place-items-center rounded-xl bg-night text-center">
        {view ? (
          <div>
            <div className={`text-3xl font-bold tabular-nums ${ended && view.status === 'busted' ? 'text-red-400' : 'text-accent'}`}>
              {(view.multiplierBps / 10000).toFixed(2)}×
            </div>
            <div className="mt-1 text-sm text-white/70">
              {active && `Schritt ${view.steps} · möglich ${toSol(view.potentialPayoutLamports)} ◎`}
              {view.status === 'busted' && 'Geplatzt — verloren'}
              {view.status === 'cashed_out' && `Cashout ${toSol(view.payoutLamports ?? '0')} ◎`}
            </div>
            {ended && view.capped && <div className="text-xs text-white/40">Payout-Limit erreicht</div>}
          </div>
        ) : (
          <span className="text-white/40">{engine.blurb}</span>
        )}
      </div>

      {!view || ended ? (
        // Start-Ansicht
        <>
          <label className="block text-xs text-white/50">
            Einsatz (SOL)
            <input
              value={bet}
              onChange={(e) => setBet(e.target.value)}
              inputMode="decimal"
              className="mt-1 w-full rounded-lg border border-white/10 bg-night px-3 py-2 tabular-nums text-white outline-none focus:border-accent/50"
            />
          </label>
          <button
            type="button"
            onClick={() => void start()}
            disabled={busy || !connected}
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-accent to-accent-soft py-3 font-semibold text-night disabled:opacity-40"
          >
            {!connected ? 'Wallet verbinden' : busy ? 'Läuft…' : ended ? 'Neue Runde' : 'Runde starten'}
          </button>
        </>
      ) : (
        // Aktive Session: Schritt-Controls + Cashout
        <div className="space-y-3">
          <p className="text-xs text-white/40">{sess.hint}</p>
          {sess.step.kind === 'guess' && (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={busy} onClick={() => void step({ guess: 'higher' })}
                className="rounded-lg border border-white/15 py-2 text-sm disabled:opacity-40">Höher</button>
              <button type="button" disabled={busy} onClick={() => void step({ guess: 'lower' })}
                className="rounded-lg border border-white/15 py-2 text-sm disabled:opacity-40">Tiefer</button>
            </div>
          )}
          {sess.step.kind === 'index' && (
            <div className="flex items-center gap-2">
              <input type="number" min={sess.step.min} max={sess.step.max} value={indexVal}
                onChange={(e) => setIndexVal(e.target.value)}
                className="w-24 rounded-lg border border-white/10 bg-night px-3 py-2 tabular-nums text-white outline-none focus:border-accent/50" />
              <span className="text-xs text-white/40">{sess.step.label}</span>
              <button type="button" disabled={busy} onClick={() => void step({ value: parseInt(indexVal, 10) || 0 })}
                className="ml-auto rounded-lg border border-white/15 px-4 py-2 text-sm disabled:opacity-40">Aufdecken</button>
            </div>
          )}
          {sess.step.kind === 'action' && (
            <button type="button" disabled={busy} onClick={() => void step({})}
              className="w-full rounded-lg border border-white/15 py-2 text-sm disabled:opacity-40">{sess.step.label}</button>
          )}
          <button
            type="button"
            onClick={() => void cashout()}
            disabled={busy || view.steps < 1}
            className="w-full rounded-xl bg-gradient-to-r from-accent to-accent-soft py-2.5 font-semibold text-night disabled:opacity-40"
          >
            Cashout {view.steps >= 1 ? `(${toSol(view.potentialPayoutLamports)} ◎)` : ''}
          </button>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}
