'use client';
import { useT } from '@/lib/i18n';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePlayer, useDemo } from './DemoProvider';
import type { Control, EngineDef } from '@/lib/engines';
import { solToLamports } from '@/lib/lamports';
import { toUiError } from '@/lib/errors';
import { usePlayerAuth } from '@/lib/player-auth';
import { useBalanceFreeze } from '@/lib/balance-freeze';
import { EngineControls } from './EngineControls';
import { ResultView } from './ResultView';
import { RevealHost } from './RevealHost';
import { hasReveal } from '@/lib/reveal';
import { RouletteBoard, spotKey, type RouletteSpot } from './RouletteBoard';
import { MaxBetPick } from './BetLimitHint';
import { FiatHint } from './FiatHint';
import { useSound } from '@/lib/sounds';

export interface RoundLog {
  /** Einsatz in Lamports (Anzeige in der Runden-Historie). */
  betLamports: string;
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
 * Sicherheitsnetz: Sollte eine Animation nie melden (Tab im Hintergrund,
 * Fehler), taut der Saldo trotzdem auf. freezeUntil legt 5 s obendrauf. Das
 * längste Modul braucht 4,5 s (Session-Protokolle) — 5 s decken jedes ab.
 */
const REVEAL_BACKSTOP_MS = 5_000;

/** Das Ergebnis einer Runde, so wie es ins Reveal-Modul geht: das Server-
 *  Ergebnis plus Einsatz, Runden-ID und die Engine-Geometrie. */
interface RoundOutcome {
  roundId: string;
  win: boolean;
  multiplierBps: number;
  payoutLamports: string;
  roll: number | null;
  details: Record<string, unknown> | null;
  betLamports: string;
  engineConfig: Record<string, number> | null;
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
  const t = useT();
  const { refreshDemoBalance } = useDemo();
  // Echte Geld-Routen laufen ausschließlich über moneyFetch (hängt das
  // Spieler-Token an). Der Demo-Pfad (/api/demo/*) bewegt kein Geld und hat
  // kein Solana-Wallet, das signieren könnte — er bleibt bewusst tokenlos.
  const { moneyFetch } = usePlayerAuth();
  const { play: sfx } = useSound();
  // Reveal-Freeze: Der Server bucht sofort, die Animation braucht ihre Zeit.
  // Zwischen beidem bleibt JEDE Saldo-Anzeige stehen (echt wie Demo), sonst
  // steht das Ergebnis in der Kopfleiste, bevor die Animation es zeigt.
  const { freezeUntil, release } = useBalanceFreeze();
  const [bet, setBet] = useState('0.01');
  const [values, setValues] = useState<Record<string, string>>({});
  /** Roulette: gewählte Wettfelder (Easy = genau eins, Pro = mehrere Chips). */
  const [rouletteSpots, setRouletteSpots] = useState<RouletteSpot[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RoundOutcome | null>(null);
  /**
   * Was erst mit der Landung sichtbar werden darf: Ton, Verlaufseintrag,
   * Saldo. Bis dahin liegt es hier und NICHT in der Oberfläche — je Runde
   * (Runden-ID), damit eine Meldung immer IHRE Runde freigibt und nie „die
   * letzte" annimmt.
   */
  const pendingReveal = useRef(new Map<string, { win: boolean; log: RoundLog }>());
  /** Läuft gerade eine Animation? Solange ja, bleibt „Spielen" gesperrt: Die
   *  nächste Runde darf erst starten, wenn diese sichtbar entschieden ist. */
  const [revealing, setRevealing] = useState(false);

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
    // Das letzte Ergebnis bleibt bewusst stehen: Das Reveal-Modul startet aus
    // seinem aktuellen Bild (eine Walze dreht aus ihrer Stellung heraus) und
    // leert die Ergebnis-Knoten selbst; `pending` am Host lässt es vorlaufen.
    // Ein `setResult(null)` hier hieße Sprung in den Leerlauf vor jeder Runde.
    sfx('bet');
    try {
      const betLamports = solToLamports(bet);
      let params: Record<string, unknown>;
      if (isRoulette) {
        if (rouletteSpots.length === 0) {
          setError(t('bet.pickField'));
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
            setError(t('bet.stakeTooSmall'));
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
        sfx('error');
        return;
      }
      // Ab hier ist das Ergebnis da — sichtbar werden darf es erst, wenn die
      // Animation es zeigt. Der Saldo friert sofort ein (Backstop 10 s, siehe
      // freezeUntil), Ton und Verlaufseintrag warten in pendingReveal.
      freezeUntil(Date.now() + REVEAL_BACKSTOP_MS);
      pendingReveal.current.set(r.roundId, {
        win: r.result.win,
        log: {
          betLamports: betLamports.toString(),
          win: r.result.win,
          multiplierBps: r.result.multiplierBps,
          payoutLamports: r.result.payoutLamports,
          roundId: r.roundId,
        },
      });
      setRevealing(true);
      setResult({
        roundId: r.roundId,
        win: r.result.win,
        multiplierBps: r.result.multiplierBps,
        payoutLamports: r.result.payoutLamports,
        roll: r.result.roll,
        details: r.result.details ?? null,
        betLamports: betLamports.toString(),
        engineConfig: engineConfig ?? null,
      });
      // Der Seed-Hash gehört zur Runde, nicht zum Ausgang — er verrät nichts
      // und bleibt deshalb sofort erreichbar (Nachprüfbarkeit, Regel 6).
      onRound(r.proof.serverSeedHash, r.roundId);
    } catch (e) {
      setError((e as Error).message);
      sfx('error');
    } finally {
      setBusy(false);
    }
  };

  // Die Animation meldet die Landung; erst jetzt darf das Ergebnis nach außen.
  const onRevealed = useCallback(
    (outcome: unknown) => {
      const roundId = (outcome as RoundOutcome | null)?.roundId;
      const p = roundId ? pendingReveal.current.get(roundId) : undefined;
      if (roundId) pendingReveal.current.delete(roundId);
      setRevealing(false);
      release();
      if (!p) return;
      sfx(p.win ? 'win' : 'lose');
      onLog(p.log);
      if (demo) void refreshDemoBalance();
    },
    [release, sfx, onLog, demo, refreshDemoBalance],
  );

  // Engines ohne Reveal-Modul zeigen das Ergebnis mit dem Render — für sie ist
  // die Landung genau dieser Moment.
  useEffect(() => {
    if (result && !hasReveal(engine.key)) onRevealed(result);
  }, [result, engine.key, onRevealed]);

  return (
    <div className="space-y-4">
      {/* Spielfeld — nur Animation und Ergebnis. Die Bedienelemente stehen
          bewusst im eigenen Block darunter: So kann ein Creator das Spielfeld
          frei gestalten oder ersetzen, ohne die Eingaben mit umzubauen.
          Quadratisch (aspect-square): so hoch wie breit, auf jedem Gerät. */}
      <div className="grid aspect-square rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        {hasReveal(engine.key) ? (
          // Die Reveal-Animation der Engine (src/reveals/<engine>.js): zeigt
          // den Leerlauf aus der Server-Geometrie, spielt jede Runde ab und
          // meldet die Landung — erst dann tauen Saldo, Ton und Verlauf auf.
          <RevealHost
            engineKey={engine.key}
            engineConfig={engineConfig ?? null}
            outcome={result}
            pending={busy}
            onRevealed={onRevealed}
            hint={t(engine.blurb)}
          />
        ) : result ? (
          <ResultView {...result} />
        ) : (
          /* Leerlauf für Engines ohne Modul (eigene Engines eines Creators). */
          <div className="grid h-full place-items-center overflow-auto rounded-xl bg-night px-4 py-3 text-center">
            <div>
              <p className="text-white/40">{t(engine.blurb)}</p>
              {/* Income/Outcome in einfachen Worten — was man tut, was passieren kann. */}
              <p className="mt-2 text-xs text-white/30">
                {t(engine.playerFacts.inputs)} {t(engine.playerFacts.outcomes)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bedienfeld — Einsatz, Auswahl, Spielen. Getrennt vom Spielfeld. */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <label className="block text-xs text-white/50">
          {/* Hoechsteinsatz AM Feld (Systemvertrag — nie entfernen): Der erlaubte
              Einsatz ist das Minimum aus Spiel-, Level-, Solvenz- und Tagesdeckel
              und bewegt sich im Betrieb. Ohne diese Zahl tippt der Spieler blind. */}
          <span className="flex items-baseline justify-between gap-2">
            {/* Der Einsatz in Landeswährung steht NEBEN dem Label, nicht unter
                dem Feld: eine Randnotiz, die das Feld nicht auseinanderzieht. */}
            <span className="min-w-0 truncate">
              {t('bet.stake')} <FiatHint sol={bet} />
            </span>
            <MaxBetPick onPick={setBet} />
          </span>
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
              {t('engine.keno.allowed', { max: kenoMaxPicks, pool: kenoPool })}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => void play()}
          // Gesperrt, solange die Animation läuft: Die nächste Runde darf erst
          // starten, wenn diese sichtbar entschieden ist — sonst stünde ein
          // Ergebnis im Verlauf, das nie zu sehen war.
          disabled={busy || revealing || !connected}
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-accent to-accent-soft py-3 font-semibold text-night disabled:opacity-40"
        >
          {!connected ? t('common.connectWallet') : busy ? t('bet.running') : t('common.play')}
        </button>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}
