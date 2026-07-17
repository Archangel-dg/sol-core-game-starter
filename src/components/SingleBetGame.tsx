'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import type { Control, EngineDef } from '@/lib/engines';
import { solToLamports } from '@/lib/lamports';
import { toUiError } from '@/lib/errors';
import { EngineControls } from './EngineControls';
import { ResultView } from './ResultView';

export interface RoundLog {
  win: boolean;
  multiplierBps: number;
  payoutLamports: string;
  roundId: string;
}

/** keno-Pool/Pick-Limit: echte Werte aus der Server-Config, sonst der
 * statische Fallback aus der Control-Definition (Systemvertrag unverändert
 * — reine Anzeige). */
function kenoBounds(engine: EngineDef, engineConfig?: Record<string, number> | null) {
  const control = engine.singleControls?.find(
    (c): c is Extract<Control, { kind: 'intlist' }> => c.kind === 'intlist' && c.name === 'picks',
  );
  return {
    pool: engineConfig?.pool ?? control?.max ?? 40,
    maxPicks: engineConfig?.maxPicks ?? control?.maxCount ?? 10,
  };
}

/**
 * Generischer Einzel-Bet-Flow (funktioniert für JEDE single-Engine). Die
 * Ergebnis-Darstellung ist bewusst schlicht — hier ist die Design-Zone.
 */
export function SingleBetGame({
  engine,
  engineConfig,
  onRound,
  onLog,
}: {
  engine: EngineDef;
  /** Aufgelöste Engine-Dimensionen vom Server (null = nicht verfügbar). */
  engineConfig?: Record<string, number> | null;
  onRound: (serverSeedHash: string, roundId: string) => void;
  onLog: (r: RoundLog) => void;
}) {
  const { publicKey, connected } = useWallet();
  const [bet, setBet] = useState('0.01');
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    win: boolean;
    multiplierBps: number;
    payoutLamports: string;
    roll: number | null;
  } | null>(null);

  // Render-Grenzen aus der Server-Config — ändert NICHT die params-Struktur
  // (buildSingleParams bleibt unverändert), nur die angezeigten Controls.
  // roulette: straight `value` geht bis 37 ('00') auf dem amerikanischen Rad
  // (pocketCount 38); Control.number kennt kein boundsFrom, daher hier.
  const singleControls: Control[] =
    engine.key === 'roulette' && engineConfig?.pocketCount
      ? (engine.singleControls ?? []).map((c) =>
          c.kind === 'number' && c.name === 'value' ? { ...c, max: engineConfig.pocketCount - 1 } : c,
        )
      : (engine.singleControls ?? []);
  const { pool: kenoPool, maxPicks: kenoMaxPicks } = kenoBounds(engine, engineConfig);

  const play = async () => {
    if (!publicKey) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const params = engine.buildSingleParams ? engine.buildSingleParams(values) : {};
      const r = await fetch('/api/play', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          playerWallet: publicKey.toBase58(),
          betLamports: solToLamports(bet).toString(),
          params,
        }),
      }).then((x) => x.json());
      if (r.error) {
        const details = r.error.details as Record<string, unknown> | undefined;
        const reason = typeof details?.reason === 'string' ? details.reason : undefined;
        const ui = toUiError(r.error.code, r.error.message, reason, details);
        setError(`${ui.code}: ${ui.message}`);
        return;
      }
      setResult({
        win: r.result.win,
        multiplierBps: r.result.multiplierBps,
        payoutLamports: r.result.payoutLamports,
        roll: r.result.roll,
      });
      onRound(r.proof.serverSeedHash, r.roundId);
      onLog({
        win: r.result.win,
        multiplierBps: r.result.multiplierBps,
        payoutLamports: r.result.payoutLamports,
        roundId: r.roundId,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4">
        {result ? (
          <ResultView {...result} />
        ) : (
          <div className="grid min-h-28 place-items-center rounded-xl bg-night px-4 py-3 text-center">
            <div>
              <p className="text-white/40">{engine.blurb}</p>
              {/* Income/Outcome in einfachen Worten — was man tut, was passieren kann. */}
              <p className="mt-2 text-xs text-white/30">
                {engine.playerFacts.inputs} {engine.playerFacts.outcomes}
              </p>
            </div>
          </div>
        )}
      </div>

      <label className="block text-xs text-white/50">
        Einsatz (SOL)
        <input
          value={bet}
          onChange={(e) => setBet(e.target.value)}
          inputMode="decimal"
          className="mt-1 w-full rounded-lg border border-white/10 bg-night px-3 py-2 tabular-nums text-white outline-none focus:border-accent/50"
        />
      </label>

      <div className="mt-3">
        <EngineControls
          controls={singleControls}
          values={values}
          engineConfig={engineConfig}
          onChange={(name, value) => setValues((v) => ({ ...v, [name]: value }))}
        />
        {engine.key === 'keno' && (
          <p className="mt-1 text-[11px] text-white/30">
            Erlaubt: bis zu {kenoMaxPicks} Zahlen aus 1–{kenoPool}.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => void play()}
        disabled={busy || !connected}
        className="mt-4 w-full rounded-xl bg-gradient-to-r from-accent to-accent-soft py-3 font-semibold text-night disabled:opacity-40"
      >
        {!connected ? 'Wallet verbinden' : busy ? 'Läuft…' : 'Spielen'}
      </button>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}
