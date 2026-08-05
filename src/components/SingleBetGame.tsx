'use client';

import { useState } from 'react';
import { usePlayer, useDemo } from './DemoProvider';
import type { Control, EngineDef } from '@/lib/engines';
import { solToLamports } from '@/lib/lamports';
import { toUiError } from '@/lib/errors';
import { usePlayerAuth } from '@/lib/player-auth';
import { EngineControls } from './EngineControls';
import { ResultView } from './ResultView';
import { SlotGrid } from './SlotGrid';
import { RouletteBoard, spotKey, type RouletteSpot } from './RouletteBoard';

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

/** plinko-Bälle: die `balls`-Auswahl auf Optionen ≤ `maxBalls` einschränken
 * (der Server clampt ohnehin — das hier ist reine Anzeige). Default-Config
 * (keine Pro-Config, maxBalls 1) blendet die Auswahl KOMPLETT aus — sonst
 * bekäme jedes Spiel eine "1 Kugel"-Dropdown, die es heute nicht gibt. */
function plinkoControls(engine: EngineDef, engineConfig?: Record<string, number> | null): Control[] {
  const controls = engine.singleControls ?? [];
  const maxBalls = engineConfig?.maxBalls ?? 1;
  if (maxBalls <= 1) return controls.filter((c) => !(c.kind === 'select' && c.name === 'balls'));
  return controls.map((c) =>
    c.kind === 'select' && c.name === 'balls'
      ? { ...c, options: c.options.filter((o) => Number(o.value) <= maxBalls) }
      : c,
  );
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
  const { wallet, connected, apiBase, demo } = usePlayer();
  const { refreshDemoBalance } = useDemo();
  // Echte Geld-Routen laufen ausschließlich über moneyFetch (hängt das
  // Spieler-Token an). Der Demo-Pfad (/api/demo/*) bewegt kein Geld und hat
  // kein Solana-Wallet, das signieren könnte — er bleibt bewusst tokenlos.
  const { moneyFetch } = usePlayerAuth();
  const [bet, setBet] = useState('0.01');
  const [values, setValues] = useState<Record<string, string>>({});
  /** Roulette: gewählte Wettfelder (Easy = genau eins, Pro = mehrere Chips). */
  const [rouletteSpots, setRouletteSpots] = useState<RouletteSpot[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    win: boolean;
    multiplierBps: number;
    payoutLamports: string;
    roll: number | null;
    details: Record<string, unknown> | null;
  } | null>(null);

  // Render-Grenzen aus der Server-Config — ändert NICHT die params-Struktur
  // (buildSingleParams bleibt unverändert), nur die angezeigten Controls.
  // dice/limbo/hilo/roulette laufen über den generischen `number`-boundsFrom
  // (siehe EngineControls); nur plinko (Options-Filter einer `select`-Liste)
  // braucht hier noch einen Spezialfall.
  const singleControls: Control[] =
    engine.key === 'plinko' ? plinkoControls(engine, engineConfig) : (engine.singleControls ?? []);
  const { pool: kenoPool, maxPicks: kenoMaxPicks } = kenoBounds(engine, engineConfig);

  // Roulette: Easy (Einfachauswahl) vs Pro (Multi-Bet-Board). Der Server-Echo
  // `proBetsEnabled` (publicEngineConfig) entscheidet die Variante; pocketCount
  // steuert 0/'00'. Reine Anzeige/Auswahl — die params baut play() daraus.
  const isRoulette = engine.key === 'roulette';
  const roulettePro = (engineConfig?.proBetsEnabled ?? 0) === 1;
  const pocketCount = engineConfig?.pocketCount ?? 37;
  const rouletteSelected = new Set(rouletteSpots.map(spotKey));
  const toggleSpot = (spot: RouletteSpot) => {
    setRouletteSpots((prev) => {
      const key = spotKey(spot);
      if (roulettePro) {
        return prev.some((s) => spotKey(s) === key)
          ? prev.filter((s) => spotKey(s) !== key)
          : [...prev, spot];
      }
      // Easy: Einfachauswahl — dasselbe Feld erneut wählen = abwählen.
      return prev.length === 1 && spotKey(prev[0]!) === key ? [] : [spot];
    });
  };

  const play = async () => {
    if (!wallet) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const betLamports = solToLamports(bet);
      let params: Record<string, unknown>;
      if (isRoulette) {
        if (rouletteSpots.length === 0) {
          setError('Bitte mindestens ein Feld wählen.');
          setBusy(false);
          return;
        }
        if (roulettePro) {
          // Gesamteinsatz gleichmäßig auf die Chips verteilen — der Rest (in
          // Lamports) geht auf die ersten Chips, sodass Σ stakeLamports EXAKT
          // betLamports ist (Server-Invariante, sonst API-306).
          const n = BigInt(rouletteSpots.length);
          const base = betLamports / n;
          if (base <= 0n) {
            setError('Einsatz zu klein für die Anzahl gewählter Chips.');
            setBusy(false);
            return;
          }
          let rem = betLamports - base * n;
          params = {
            bets: rouletteSpots.map((s) => {
              let stake = base;
              if (rem > 0n) {
                stake += 1n;
                rem -= 1n;
              }
              return {
                betType: s.betType,
                ...(s.value !== undefined ? { value: s.value } : {}),
                stakeLamports: stake.toString(),
              };
            }),
          };
        } else {
          const s = rouletteSpots[0]!;
          params = s.value !== undefined ? { betType: s.betType, value: s.value } : { betType: s.betType };
        }
      } else {
        params = engine.buildSingleParams ? engine.buildSingleParams(values) : {};
      }
      const payload = {
        playerWallet: wallet,
        betLamports: betLamports.toString(),
        params,
      };
      const r = demo
        ? await fetch(`${apiBase}/play`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
          }).then((x) => x.json())
        : await moneyFetch(`${apiBase}/play`, payload);
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
        details: r.result.details ?? null,
      });
      onRound(r.proof.serverSeedHash, r.roundId);
      onLog({
        win: r.result.win,
        multiplierBps: r.result.multiplierBps,
        payoutLamports: r.result.payoutLamports,
        roundId: r.roundId,
      });
      if (demo) void refreshDemoBalance();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4">
        {(() => {
          const slotsDetails =
            engine.key === 'slots-modular' && result && Array.isArray((result.details as { grid?: unknown } | null)?.grid)
              ? (result.details as Record<string, unknown>)
              : null;
          if (engine.key === 'slots-modular' && !result) {
            // Idle: Paytable-Vorschau aus dem renderSpec.
            return <SlotGrid engineConfig={engineConfig ?? null} details={null} />;
          }
          if (slotsDetails) {
            return (
              <SlotGrid
                engineConfig={engineConfig ?? null}
                details={slotsDetails}
                win={result!.win}
                multiplierBps={result!.multiplierBps}
                payoutLamports={result!.payoutLamports}
              />
            );
          }
          return result ? (
            <ResultView {...result} />
          ) : (
            /* bisheriger Idle-Block unverändert (nicht-slots Engines) */
            <div className="grid min-h-28 place-items-center rounded-xl bg-night px-4 py-3 text-center">
              <div>
                <p className="text-white/40">{engine.blurb}</p>
                {/* Income/Outcome in einfachen Worten — was man tut, was passieren kann. */}
                <p className="mt-2 text-xs text-white/30">
                  {engine.playerFacts.inputs} {engine.playerFacts.outcomes}
                </p>
              </div>
            </div>
          );
        })()}
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
        {isRoulette ? (
          <RouletteBoard
            pro={roulettePro}
            pocketCount={pocketCount}
            selected={rouletteSelected}
            onToggle={toggleSpot}
          />
        ) : (
          <EngineControls
            controls={singleControls}
            values={values}
            engineConfig={engineConfig}
            onChange={(name, value) => setValues((v) => ({ ...v, [name]: value }))}
          />
        )}
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
