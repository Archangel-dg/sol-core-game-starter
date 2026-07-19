'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePlayer, useDemo } from './DemoProvider';
import type { EngineDef } from '@/lib/engines';
import type { SessionView } from '@/lib/solcore';
import { solToLamports, toSol } from '@/lib/lamports';
import { toUiError } from '@/lib/errors';
import type { RoundLog } from './SingleBetGame';

/** towers-Reveal: `bombColumns` ist `number[][]` (eine Spalten-Menge je
 * Etage, `c.bombs` Bomben pro Etage). Rein defensiv — akzeptiert auch ältere
 * `number[]`-Formen ohne zu crashen und liefert '' wenn nichts zu zeigen ist. */
function formatTowersBombs(bombColumns: unknown): string {
  if (!Array.isArray(bombColumns)) return '';
  const rows = bombColumns
    .map((row: unknown, i: number) => {
      const cols = Array.isArray(row) ? row : typeof row === 'number' ? [row] : [];
      const nums = cols.filter((n): n is number => typeof n === 'number');
      return nums.length ? `E${i + 1}: ${nums.map((n) => n + 1).join(',')}` : null;
    })
    .filter((s): s is string => s !== null);
  return rows.length ? `Bomben je Etage — ${rows.join(' · ')}` : '';
}

/**
 * Generischer Session-Flow (mines/hilo/towers/pump): start → step* → cashout.
 * Reconnect nach Reload über localStorage. Ergebnisse kommen vom Server;
 * die UI hier ist bewusst schlicht — Design-Zone.
 *
 * Index-Schritte (towers/mines) rendern ein Button-Feld, dessen Größe aus der
 * Server-Config kommt (engineConfig aus /api/meta, bzw. view.engine.config in
 * der laufenden Session) — ungültige Eingaben sind damit unmöglich.
 */
export function SessionGame({
  engine,
  gameId,
  engineConfig,
  onRound,
  onLog,
}: {
  engine: EngineDef;
  gameId: string;
  /** Aufgelöste Engine-Dimensionen vom Server (null = nicht verfügbar). */
  engineConfig?: Record<string, number> | null;
  onRound: (serverSeedHash: string, roundId: string) => void;
  onLog: (r: RoundLog) => void;
}) {
  const { wallet, connected, apiBase, demo } = usePlayer();
  const { refreshDemoBalance } = useDemo();
  const [bet, setBet] = useState('0.01');
  const [view, setView] = useState<SessionView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const storeKey = `sc_session_${gameId}${demo ? '_demo' : ''}`;
  const sess = engine.session!;

  // Grenzen des Index-Schritts: bevorzugt aus der laufenden Session, sonst
  // aus /api/meta; ohne beides greifen die Engine-DEFAULTS (nie das Maximum).
  const cfg = view?.engine?.config ?? engineConfig ?? null;
  const idxStep = sess.step.kind === 'index' ? sess.step : null;
  const bounds =
    idxStep &&
    (cfg && idxStep.boundsFrom ? idxStep.boundsFrom(cfg) : { min: idxStep.min, max: idxStep.max });
  const boundsAssumed = !!idxStep?.boundsFrom && !cfg;

  const finishIfEnded = useCallback(
    (v: SessionView) => {
      if (v.status !== 'active') {
        localStorage.removeItem(storeKey);
        if (demo) void refreshDemoBalance();
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
    fetch(`${apiBase}/session/${id}`)
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
        const details = r.error.details as Record<string, unknown> | undefined;
        const reason = typeof details?.reason === 'string' ? details.reason : undefined;
        const ui = toUiError(r.error.code, r.error.message, reason, details);
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
    if (!wallet) return;
    const v = await call(`${apiBase}/session/start`, {
      playerWallet: wallet,
      betLamports: solToLamports(bet).toString(),
    });
    if (v) {
      localStorage.setItem(storeKey, v.sessionId);
      setView(v);
    }
  };

  const step = async (arg: { value?: number; guess?: 'higher' | 'lower' }) => {
    if (!view) return;
    const v = await call(`${apiBase}/session/${view.sessionId}/step`, sess.buildStep(arg));
    if (v) {
      setView(v);
      finishIfEnded(v);
    }
  };

  const cashout = async () => {
    if (!view) return;
    const v = await call(`${apiBase}/session/${view.sessionId}/cashout`);
    if (v) {
      setView(v);
      finishIfEnded(v);
    }
  };

  const active = view?.status === 'active';
  const ended = view && view.status !== 'active';
  const towersBombText =
    view && view.status === 'busted' && engine.key === 'towers' ? formatTowersBombs(view.reveal?.bombColumns) : '';

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
            {towersBombText && <div className="mt-1 text-[11px] text-white/30">{towersBombText}</div>}
          </div>
        ) : (
          <div className="px-4">
            <p className="text-white/40">{engine.blurb}</p>
            {/* Income/Outcome in einfachen Worten — was man tut, was passieren kann. */}
            <p className="mt-2 text-xs text-white/30">
              {engine.playerFacts.inputs} {engine.playerFacts.outcomes}
            </p>
          </div>
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
          {idxStep && bounds && (
            <div>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-xs text-white/40">{idxStep.label} wählen</span>
                {boundsAssumed && (
                  <span className="text-[10px] text-amber-300/70">Config nicht geladen — Standardwerte angenommen</span>
                )}
              </div>
              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(bounds.max - bounds.min + 1, 5)}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: bounds.max - bounds.min + 1 }, (_, i) => bounds.min + i).map((idx) => {
                  const picked = Array.isArray(view.progress?.picks)
                    ? (view.progress.picks as number[]).includes(idx)
                    : false;
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={busy || picked}
                      onClick={() => void step({ value: idx })}
                      className={`rounded-lg border py-2 text-sm tabular-nums transition disabled:opacity-40 ${
                        picked
                          ? 'border-accent/40 bg-accent/10 text-accent'
                          : 'border-white/15 hover:border-accent/50'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
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
