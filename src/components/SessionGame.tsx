'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePlayer, useDemo } from './DemoProvider';
import type { EngineDef } from '@/lib/engines';
import { SPIN_TOWER_PROTOCOL, type SessionView } from '@/lib/solcore';
import { solToLamports, toSol } from '@/lib/lamports';
import { toUiError } from '@/lib/errors';
import { usePlayerAuth } from '@/lib/player-auth';
import type { RoundLog } from './SingleBetGame';
import { MaxBetPick } from './BetLimitHint';
import { useT } from '@/lib/i18n';

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

/** Aktueller Bezugswert eines Tipp-Schritts, gegen den „höher/tiefer" gilt:
 * dice-ladder liefert `currentSum` (+ die Einzelwürfel des letzten Wurfs),
 * hilo `currentCard`. Ohne diese Anzeige wäre ein Tipp blind — bei
 * dice-ladder hängt die Gewinnchance sogar direkt am aktuellen Wert (eine 4
 * ist etwas völlig anderes als eine 10). Rein defensiv aus dem
 * `Record<string, unknown>`-Fortschritt gelesen; liefert null, wenn die
 * Engine keinen solchen Wert führt. */
function currentGuessValue(progress: unknown): { value: number; dice?: number[] } | null {
  if (!progress || typeof progress !== 'object') return null;
  const p = progress as Record<string, unknown>;
  const raw = typeof p.currentSum === 'number' ? p.currentSum
    : typeof p.currentCard === 'number' ? p.currentCard
      : null;
  if (raw === null || !Number.isFinite(raw)) return null;
  const history = p.diceHistory;
  const last = Array.isArray(history) ? history[history.length - 1] : undefined;
  const dice = Array.isArray(last) ? last.filter((n): n is number => typeof n === 'number') : undefined;
  return dice && dice.length > 0 ? { value: raw, dice } : { value: raw };
}

/** steps: Stufen-Fortschritt + Leiter defensiv aus Fortschritt und
 * Engine-Config lesen. Bei dieser Engine zählt `SessionView.steps` die
 * VERSUCHE — die aktuelle Stufe steht in `progress.currentStep`; Leiter,
 * Safe-Points und Leben kommen als aufgelöstes Server-Echo in der
 * Engine-Config (`ladderBps`/`checkpoints`/`lives`), die Restleben live in
 * `progress.livesLeft`. Alles `unknown`-tolerant gelesen (Muster:
 * `towersFloorColumns`). */
function stepsInfo(
  progress: unknown,
  cfg: Record<string, unknown> | null,
): {
  rung: number;
  ladderBps: number[];
  checkpoints: number[];
  lives: number | null;
  livesLeft: number | null;
  climbsUsed: number;
  lastFall: { from: number; to: number } | null;
} | null {
  const p = progress && typeof progress === 'object' ? (progress as Record<string, unknown>) : {};
  const c = cfg ?? {};
  const nums = (v: unknown): number[] =>
    Array.isArray(v) ? v.filter((n): n is number => typeof n === 'number' && Number.isFinite(n)) : [];
  const ladderBps = nums((c as Record<string, unknown>).ladderBps);
  const rung = typeof p.currentStep === 'number' && Number.isFinite(p.currentStep) ? p.currentStep : 0;
  const climbsUsed = typeof p.climbsUsed === 'number' && Number.isFinite(p.climbsUsed) ? p.climbsUsed : 0;
  const rawLives = (c as Record<string, unknown>).lives;
  const lives = typeof rawLives === 'number' && Number.isFinite(rawLives) ? rawLives : null;
  const livesLeft = typeof p.livesLeft === 'number' && Number.isFinite(p.livesLeft) ? p.livesLeft : null;
  const fall = p.lastFall && typeof p.lastFall === 'object' ? (p.lastFall as Record<string, unknown>) : null;
  const lastFall =
    fall && typeof fall.from === 'number' && typeof fall.to === 'number'
      ? { from: fall.from, to: fall.to }
      : null;
  if (ladderBps.length === 0 && rung === 0 && climbsUsed === 0) return null;
  return { rung, ladderBps, checkpoints: nums((c as Record<string, unknown>).checkpoints), lives, livesLeft, climbsUsed, lastFall };
}

/** spin-tower-pro (`session.costPerStep`): Turm-Brett, aktueller Pot und der
 * FAIL-immune gesicherte Anteil — defensiv aus Fortschritt und Engine-Config
 * gelesen. `towers` ist im Server-Echo ein ARRAY von `{ levels,
 * multipliersBps }`, `EngineConfig` aber `Record<string, number>` (der Vertrag
 * aller anderen Nutzer), deshalb geht der Zugriff über `unknown` mit
 * `Array.isArray`-Absicherung — dieselbe Vorsicht wie bei `towersFloorColumns`
 * und `bombColumns`. Liefert null, wenn weder Türme noch Stufen ankommen (alter
 * API-Stand ⇒ es bleibt bei der generischen Aktions-UI, nichts crasht). */
function spinTowerInfo(
  progress: unknown,
  cfg: Record<string, unknown> | null,
): {
  towers: { levels: number; multipliersBps: number[] }[];
  /** Aktuelle Stufe je Turm (0 = Boden). */
  levels: number[];
  /** Summe der Multiplikatoren der AKTUELL erreichten Stufen — der verlierbare Teil. */
  potBps: number;
  /** FAIL-immun gesichert (BPS des Einsatzes), null wenn der Server es nicht führt. */
  securedBps: number | null;
  maxSpins: number | null;
  failMode: 'reset' | 'stepdown' | null;
} | null {
  const p = progress && typeof progress === 'object' ? (progress as Record<string, unknown>) : {};
  const c = (cfg ?? {}) as Record<string, unknown>;
  const numOrNull = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? v : null;
  const nums = (v: unknown): number[] =>
    Array.isArray(v) ? v.filter((n): n is number => typeof n === 'number' && Number.isFinite(n)) : [];
  const rawTowers = c.towers;
  const towers = Array.isArray(rawTowers)
    ? rawTowers.map((t: unknown) => {
        const o = t && typeof t === 'object' ? (t as Record<string, unknown>) : {};
        const multipliersBps = nums(o.multipliersBps);
        return { levels: numOrNull(o.levels) ?? multipliersBps.length, multipliersBps };
      })
    : [];
  const levels = nums(p.levels);
  if (towers.length === 0 && levels.length === 0) return null;
  // Pot lokal aus Brett + Stufen — die Lamport-Zahl kommt zwar vom Server
  // (`potLamports`), aber die Multiplikator-Sicht funktioniert auch ohne sie.
  const potBps = towers.reduce((sum, t, i) => {
    const lvl = levels[i] ?? 0;
    return lvl > 0 ? sum + (t.multipliersBps[lvl - 1] ?? 0) : sum;
  }, 0);
  const rawFail = c.failMode;
  return {
    towers,
    levels,
    potBps,
    securedBps: numOrNull(p.securedBps),
    maxSpins: numOrNull(c.maxSpins),
    failMode: rawFail === 'reset' || rawFail === 'stepdown' ? rawFail : null,
  };
}

/**
 * Generischer Session-Flow (mines/hilo/towers/pump/dice-ladder/steps/
 * spin-tower-pro): start → step* → cashout. Reconnect nach Reload über
 * localStorage. Ergebnisse kommen vom Server; die UI hier ist bewusst schlicht —
 * Design-Zone.
 *
 * Index-Schritte (towers/mines) rendern ein Button-Feld, dessen Größe aus der
 * Server-Config kommt (engineConfig aus /api/meta, bzw. view.engine.config in
 * der laufenden Session) — ungültige Eingaben sind damit unmöglich.
 * Tipp-Schritte (hilo/dice-ladder) zeigen zusätzlich den aktuellen
 * Bezugswert, gegen den getippt wird (siehe `currentGuessValue`).
 *
 * `session.costPerStep` (spin-tower-pro) kehrt die teuerste Annahme dieser
 * Oberfläche um: dort kostet JEDER Schritt erneut den Einsatz statt nur der
 * Start. Der Riegel dagegen sitzt im Server (`SPIN_COST_GAME_MODES` lehnt den
 * Einmal-Debit-Pfad ab) — die Pflicht HIER ist Sichtbarkeit: Kosten je Spin,
 * die Einsatz-Sperre ab dem ersten Spin (Feld wird read-only), der
 * Spin-Zähler gegen `maxSpins` und vor allem Pot (verlierbar) und Gesichertes
 * (FAIL-immun, zahlt erst am Rundenende) als ZWEI getrennte Zahlen.
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
  // Echte Geld-Routen laufen ausschließlich über moneyFetch (hängt das
  // Spieler-Token an). Der Demo-Pfad (/api/demo/*) bewegt kein Geld und hat
  // kein Solana-Wallet, das signieren könnte — er bleibt bewusst tokenlos.
  const { moneyFetch } = usePlayerAuth();
  const t = useT();
  const [bet, setBet] = useState('0.01');
  const [view, setView] = useState<SessionView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const storeKey = `sc_session_${gameId}${demo ? '_demo' : ''}`;
  const sess = engine.session!;

  // Grenzen des Index-Schritts: bevorzugt aus der laufenden Session, sonst
  // aus /api/meta; ohne beides greifen die Engine-DEFAULTS (nie das Maximum).
  // `view?.steps` (bereits absolvierte Schritte) geht als currentStep mit —
  // towers' boundsFrom nutzt das, um PRO ETAGE die richtige Spaltenzahl aus
  // `floors[currentStep]` zu lesen (Pro-Config mit variierenden Etagen);
  // Engines ohne Bedarf (mines) ignorieren den Parameter.
  const cfg = view?.engine?.config ?? engineConfig ?? null;
  const idxStep = sess.step.kind === 'index' ? sess.step : null;
  const bounds =
    idxStep &&
    (cfg && idxStep.boundsFrom ? idxStep.boundsFrom(cfg, view?.steps) : { min: idxStep.min, max: idxStep.max });
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
      const r = demo
        ? await fetch(path, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
          }).then((x) => x.json())
        : await moneyFetch(path, body);
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
      // Pay-per-Spin-Handschlag: Der Server oeffnet eine Runde dieser Engines
      // nur, wenn der Client bestaetigt, dass er das Kostenmodell kennt. Das
      // darf er hier, weil die Kostenwarnung direkt darueber steht (sie haengt
      // an genau demselben `costPerStep`) — nicht, weil es den Fehler wegmacht.
      ...(sess.costPerStep === true ? { protocol: SPIN_TOWER_PROTOCOL } : {}),
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
  const guessValue = sess.step.kind === 'guess' ? currentGuessValue(view?.progress) : null;
  const steps = engine.key === 'steps' && view ? stepsInfo(view.progress, cfg) : null;
  // steps: Cashout erst ab Stufe 1 sinnvoll (der Server lehnt am Boden ohnehin
  // ab — nach einem Fall wäre `view.steps ≥ 1`, aber die Auszahlung 0).
  const cashoutBlocked = steps ? steps.rung < 1 : false;

  // ── Engines mit Kosten je Schritt (spin-tower-pro) ────────────────────────
  // Alles hier ist an `sess.costPerStep` gehängt, nicht an einem Engine-Key:
  // fehlt das Feld (alle anderen Engines), bleibt jede Zeile unten wirkungslos
  // und die Oberfläche rendert exakt wie bisher.
  const costPerStep = sess.costPerStep === true;
  const spinTower = costPerStep ? spinTowerInfo(view?.progress ?? null, cfg) : null;
  // `spins` ist die Wahrheit des Servers für bezahlte Spins; `steps` ist der
  // generische Zähler und dient nur als Rückfall für ältere API-Stände.
  const spinsUsed = view?.spins ?? view?.steps ?? 0;
  const maxSpins = view?.maxSpins ?? spinTower?.maxSpins ?? null;
  const stepsTaken = costPerStep ? spinsUsed : (view?.steps ?? 0);
  // Preis eines Spins: in der laufenden Runde sagt ihn der Server
  // (`spinCostLamports`) — nach einem Reload weiß das lokale Einsatz-Feld
  // nichts über die Runde, eine Anzeige daraus wäre schlicht falsch.
  const spinCostText = view?.spinCostLamports ? toSol(view.spinCostLamports) : null;
  // Vor dem Start ist die Eingabe selbst der Preis je Spin — daraus lässt sich
  // ehrlich zeigen, was eine bis zum Deckel durchgespielte Runde MAXIMAL kostet.
  const plannedStake = (() => {
    try {
      return solToLamports(bet);
    } catch {
      return null;
    }
  })();
  const maxSpendText =
    plannedStake !== null && maxSpins !== null && maxSpins > 0
      ? toSol(plannedStake * BigInt(maxSpins))
      : null;
  // Einsatz-Sperre: spätestens ab dem ersten bezahlten Spin (`stepsTaken >= 1`)
  // ist der Einsatz der Runde unveränderlich — jeder weitere Spin rechnet gegen
  // genau diesen Betrag ab. Festgeschrieben hat ihn bereits der Start, deshalb
  // gilt die Sperre für die GANZE aktive Runde. In der laufenden Runde zeigt der
  // Kosten-Kopf unten ein hart read-only Feld; dieses Flag hängt zusätzlich am
  // Start-Feld, damit die Sperre auch dann greift, wenn dieser Zweig eines Tages
  // während einer aktiven Runde gerendert wird.
  const stakeLocked = costPerStep && view?.status === 'active';
  // Pot und Gesichertes sind ZWEI Zahlen und werden nie zu einer verrechnet:
  // der Pot ist bei einem FAIL weg, das Gesicherte nicht. Lamports bevorzugt
  // (Server), sonst die aus dem Brett abgeleitete Multiplikator-Sicht.
  const potText = view?.potLamports
    ? `${toSol(view.potLamports)} ◎`
    : spinTower
      ? `${(spinTower.potBps / 10000).toFixed(2)}×`
      : '—';
  const securedText = view?.securedLamports
    ? `${toSol(view.securedLamports)} ◎`
    : spinTower && spinTower.securedBps !== null
      ? `${(spinTower.securedBps / 10000).toFixed(2)}×`
      : '—';

  // Turm-Brett (Design-Zone): je Turm eine Spalte, oberste Stufe zuerst, der
  // Multiplikator jeder Stufe sichtbar, die aktuelle Stufe hervorgehoben. Die
  // Leiter kommt 1:1 aus dem Server-Echo — hier wird nichts gewürfelt.
  const towerBoard =
    spinTower && spinTower.towers.length > 0 ? (
      <div className="rounded-lg border border-white/10 bg-night p-2">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <span className="text-[11px] text-white/40">{t('session.towers')}</span>
          {spinTower.failMode && (
            <span className="text-[10px] text-red-300/70">
              {spinTower.failMode === 'reset'
                ? t('session.failReset')
                : t('session.failStepdown')}
            </span>
          )}
        </div>
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${spinTower.towers.length}, minmax(0, 1fr))` }}
        >
          {spinTower.towers.map((tower, ti) => {
            const current = spinTower.levels[ti] ?? 0;
            const rows = tower.multipliersBps.length;
            return (
              <div key={ti} className="space-y-1">
                <div className="text-center text-[10px] text-white/40">Turm {ti + 1}</div>
                {Array.from({ length: rows }, (_, i) => rows - i).map((lvl) => (
                  <div
                    key={lvl}
                    className={`flex items-center justify-between rounded px-1.5 py-1 text-[11px] tabular-nums ${
                      lvl === current
                        ? 'bg-accent/15 text-accent ring-1 ring-accent/50'
                        : lvl < current
                          ? 'text-white/50'
                          : 'text-white/25'
                    }`}
                  >
                    <span>{lvl === rows ? '★' : lvl}</span>
                    <span>{((tower.multipliersBps[lvl - 1] ?? 0) / 10000).toFixed(2)}×</span>
                  </div>
                ))}
                <div className="text-center text-[10px] text-white/40">
                  {current === 0 ? t('session.ground') : t('session.level', { n: current })}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-1 text-[10px] leading-relaxed text-white/30">
          {t('session.topLevelNote')}
        </p>
      </div>
    ) : null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      {/* HUD — min-Höhe statt fixer Höhe: die Engine-Erklärtexte (playerFacts,
          z. B. steps' Leben/Safe-Point-Regeln) sind unterschiedlich lang und
          liefen bei h-28 sichtbar über Einsatz-Feld und Button hinaus. */}
      <div className="mb-4 grid min-h-[7rem] place-items-center rounded-xl bg-night px-2 py-3 text-center">
        {view ? (
          <div>
            <div className={`text-3xl font-bold tabular-nums ${ended && view.status === 'busted' ? 'text-red-400' : 'text-accent'}`}>
              {(view.multiplierBps / 10000).toFixed(2)}×
            </div>
            <div className="mt-1 text-sm text-white/70">
              {active && steps &&
                t('session.stepInfo', {
                  n: steps.rung,
                  lives:
                    steps.livesLeft !== null
                      ? t('session.livesLeft', {
                          left: steps.livesLeft,
                          of: steps.lives !== null ? `/${steps.lives}` : '',
                        })
                      : '',
                  amount: toSol(view.potentialPayoutLamports),
                })}
              {active && !steps && costPerStep &&
                `Spin ${spinsUsed}${maxSpins !== null ? `/${maxSpins}` : ''} · Cashout ${toSol(view.potentialPayoutLamports)} ◎`}
              {active &&
                !steps &&
                !costPerStep &&
                t('session.step', {
                  n: view.steps,
                  amount: toSol(view.potentialPayoutLamports),
                })}
              {/* Bei Kosten je Schritt wäre „alles verloren" gelogen: ein FAIL
                  nimmt nur den Pot, das Gesicherte wird trotzdem ausgezahlt. */}
              {view.status === 'busted' && costPerStep &&
                `FAIL — Pot verloren${
                  view.payoutLamports && view.payoutLamports !== '0'
                    ? ` · gesichert ${toSol(view.payoutLamports)} ◎ ausgezahlt`
                    : ''
                }`}
              {view.status === 'busted' && !costPerStep && t('session.busted')}
              {view.status === 'cashed_out' &&
                t('session.cashedOut', { amount: toSol(view.payoutLamports ?? '0') })}
            </div>
            {active && steps?.lastFall && (
              <div className="mt-1 text-[11px] text-amber-300/80">
                Abgestürzt: Stufe {steps.lastFall.from} → {steps.lastFall.to}
                {steps.lastFall.to > 0 ? ` ${t('session.safePoint')}` : ` ${t('session.ground')}`}
              </div>
            )}
            {ended && view.capped && <div className="text-xs text-white/40">{t('session.payoutLimit')}</div>}
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
          {towerBoard && <div className="mb-3">{towerBoard}</div>}
          <label className="block text-xs text-white/50">
            {/* Hoechsteinsatz AM Feld (Systemvertrag — nie entfernen). */}
            <span className="flex items-baseline justify-between gap-2">
              <span>{t(costPerStep ? 'session.stakePerSpin' : 'bet.stake')}</span>
              {!stakeLocked && <MaxBetPick onPick={setBet} />}
            </span>
            <input
              value={bet}
              onChange={(e) => setBet(e.target.value)}
              readOnly={stakeLocked}
              aria-readonly={stakeLocked}
              inputMode="decimal"
              className={`mt-1 w-full rounded-lg border border-white/10 bg-night px-3 py-2 tabular-nums text-white outline-none focus:border-accent/50 ${
                stakeLocked ? 'cursor-not-allowed text-white/60' : ''
              }`}
            />
          </label>
          {costPerStep && (
            // Anzeigepflicht vor dem ersten Klick: hier kostet nicht die Runde,
            // sondern JEDER Spin. Ohne diesen Kasten hielte ein Spieler die
            // Schritte für gratis — die Annahme, die jede andere Engine erfüllt.
            <div className="mt-2 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-[11px] leading-relaxed text-amber-100/90">
              <span className="font-semibold text-amber-200">
                {t('session.everySpinCosts')}
              </span>{' '}
              — nicht nur der Rundenstart. Ab dem ersten Spin ist der Einsatz für die ganze Runde
              gesperrt und nicht mehr änderbar.
              {maxSpins !== null && (
                <>
                  {' '}
                  Die Runde endet spätestens nach {maxSpins} Spins
                  {maxSpendText ? ` — maximal ${maxSpendText} ◎ Gesamteinsatz` : ''}.
                </>
              )}{' '}
              {t('session.cashoutNote')}
            </div>
          )}
          <button
            type="button"
            onClick={() => void start()}
            disabled={busy || !connected}
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-accent to-accent-soft py-3 font-semibold text-night disabled:opacity-40"
          >
            {!connected
              ? t('common.connectWallet')
              : busy
                ? t('bet.running')
                : ended
                  ? t('session.newRound')
                  : t('session.start')}
          </button>
        </>
      ) : (
        // Aktive Session: Schritt-Controls + Cashout
        <div className="space-y-3">
          <p className="text-xs text-white/40">{sess.hint}</p>
          {costPerStep && (
            // Kosten-Kopf der laufenden Runde: Preis je Spin, der GESPERRTE
            // Einsatz als read-only Feld und der Spin-Zähler gegen den Deckel.
            <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold text-amber-200">
                  {t('session.everySpinCostsShort')}
                </span>
                <span className="text-[11px] tabular-nums text-amber-100/70">
                  Spin {spinsUsed}
                  {maxSpins !== null ? `/${maxSpins}` : ''}
                </span>
              </div>
              <label className="mt-2 block text-[11px] text-amber-100/70">
                {t('session.stakePerSpinLocked')}
                <input
                  value={spinCostText ?? bet}
                  readOnly
                  aria-readonly
                  aria-label={t('session.stakeLockedShort')}
                  className="mt-1 w-full cursor-not-allowed rounded-lg border border-amber-400/30 bg-night px-3 py-2 tabular-nums text-white/70 outline-none"
                />
              </label>
              {spinCostText === null && (
                <p className="mt-1 text-[10px] text-amber-100/60">
                  {t('session.stakeUnknown')}
                </p>
              )}
            </div>
          )}
          {costPerStep && (
            // Pot und Gesichertes bewusst als ZWEI Zahlen: der Pot ist bei
            // einem FAIL weg, das Gesicherte nicht. Eine Summe würde genau die
            // Entscheidung verwischen, um die es in dieser Engine geht.
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-white/10 bg-night px-2 py-2">
                <div className="text-[10px] uppercase tracking-wide text-white/40">{t('session.pot')}</div>
                <div className="text-sm font-semibold tabular-nums text-white">{potText}</div>
                <div className="mt-0.5 text-[10px] text-red-300/60">{t('session.failTakesIt')}</div>
              </div>
              <div className="rounded-lg border border-accent/30 bg-night px-2 py-2">
                <div className="text-[10px] uppercase tracking-wide text-white/40">{t('session.secured')}</div>
                <div className="text-sm font-semibold tabular-nums text-accent">{securedText}</div>
                <div className="mt-0.5 text-[10px] text-white/40">
                  FAIL-immun · zahlt am Rundenende
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-night px-2 py-2">
                <div className="text-[10px] uppercase tracking-wide text-white/40">{t('session.cashout')}</div>
                <div className="text-sm font-semibold tabular-nums text-white">
                  {toSol(view.potentialPayoutLamports)} ◎
                </div>
                <div className="mt-0.5 text-[10px] text-white/40">{t('session.potPlusSecured')}</div>
              </div>
            </div>
          )}
          {towerBoard}
          {sess.step.kind === 'guess' && (
            <>
              {guessValue && (
                <div className="rounded-lg border border-white/10 bg-night py-3 text-center">
                  <div className="text-2xl font-bold tabular-nums text-white">{guessValue.value}</div>
                  {guessValue.dice && (
                    <div className="mt-0.5 text-[11px] text-white/40">
                      {guessValue.dice.join(' + ')}
                    </div>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={busy} onClick={() => void step({ guess: 'higher' })}
                  className="rounded-lg border border-white/15 py-2 text-sm disabled:opacity-40">{t('session.higher')}</button>
                <button type="button" disabled={busy} onClick={() => void step({ guess: 'lower' })}
                  className="rounded-lg border border-white/15 py-2 text-sm disabled:opacity-40">{t('session.lower')}</button>
              </div>
            </>
          )}
          {idxStep && bounds && (
            <div>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-xs text-white/40">{idxStep.label} wählen</span>
                {boundsAssumed && (
                  <span className="text-[10px] text-amber-300/70">{t('session.configNotLoaded')}</span>
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
          {steps && steps.ladderBps.length > 0 && (
            // Stufenleiter (Design-Zone): oberste Stufe zuerst, Checkpoints
            // mit ⚑, aktuelle Stufe hervorgehoben — die Leiter kommt 1:1 aus
            // dem Server-Echo, hier wird nichts gerechnet.
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-white/10 bg-night p-2">
              {steps.ladderBps.map((bps, i) => steps.ladderBps.length - i).map((rung) => {
                const bps = steps.ladderBps[rung - 1]!;
                const isCurrent = rung === steps.rung;
                const isCheckpoint = steps.checkpoints.includes(rung);
                return (
                  <div
                    key={rung}
                    className={`flex items-center justify-between rounded px-2 py-1 text-xs tabular-nums ${
                      isCurrent
                        ? 'bg-accent/15 text-accent ring-1 ring-accent/50'
                        : rung < steps.rung
                          ? 'text-white/50'
                          : 'text-white/25'
                    }`}
                  >
                    <span>{isCheckpoint ? '⚑ ' : ''}Stufe {rung}</span>
                    <span>{(bps / 10000).toFixed(2)}×</span>
                  </div>
                );
              })}
            </div>
          )}
          {sess.step.kind === 'action' && (
            // Bei `costPerStep` steht der Preis AUF dem Knopf — die eine Stelle,
            // an der niemand vorbeiklickt.
            <button type="button" disabled={busy} onClick={() => void step({})}
              className="w-full rounded-lg border border-white/15 py-2 text-sm disabled:opacity-40">{sess.step.label}
              {costPerStep ? ` — kostet ${spinCostText ?? bet} ◎` : ''}</button>
          )}
          <button
            type="button"
            onClick={() => void cashout()}
            disabled={busy || stepsTaken < 1 || cashoutBlocked}
            className="w-full rounded-xl bg-gradient-to-r from-accent to-accent-soft py-2.5 font-semibold text-night disabled:opacity-40"
          >
            Cashout {stepsTaken >= 1 && !cashoutBlocked ? `(${toSol(view.potentialPayoutLamports)} ◎)` : ''}
          </button>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}
