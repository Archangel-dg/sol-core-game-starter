/**
 * ██ GESTALTUNGSZONE ██ — Adapter: Server-Sicht einer Session oder eines
 * Turnierlaufs → das PROTOKOLL, das die Reveal-Module abspielen.
 *
 * Der Server schickt je Schritt seinen STAND (`SessionView`: Picks, Karten,
 * Stufe, aktueller Multiplikator). Die Module wollen die GESCHICHTE: jeden
 * Schritt mit dem Multiplikator, den er gebracht hat, damit eine Wiedergabe
 * nach einem Reload dieselbe Runde zeigt wie das Live-Spiel. Diese Datei
 * übersetzt und schreibt dabei mit, was der Server nur einmal sagt:
 *
 *  - `history`: Multiplikator nach jedem Schritt. Quelle ist
 *    `progress.multiplierHistory`, wenn der Server sie führt; sonst wird
 *    sie hier aus den nacheinander eintreffenden Sichten aufgebaut.
 *  - `spins` (spin-tower-pro): Stufen, Pot und Gesichertes NACH jedem Spin —
 *    der Server nennt nur den aktuellen Stand und die Ergebnis-Indizes.
 *
 * Was NIE hier passiert: ein Ergebnis raten. Fehlt ein Schritt in der
 * Mitschrift (Reload mitten in der Runde), bekommt er den zuletzt bekannten
 * Multiplikator — die Zahl, die das Modul dann zeigt, kommt weiterhin vom
 * Server, nur nicht schrittgenau. Das Endergebnis (win, payout, status) wird
 * immer 1:1 aus der Sicht gelesen.
 */

import type { SessionView, TournamentRunView } from '@/lib/solcore';

export interface SpinRecord {
  outcome: { kind: 'tower' | 'joker' | 'nothing' | 'fail'; tower?: number };
  levels: number[] | null;
  securedBps: number | null;
  potBps: number | null;
}

export interface SessionTranscript {
  sessionId: string;
  /** Einsatz der Runde in Lamports (aus dem Start-Aufruf; nach Reload hergeleitet). */
  betLamports: string;
  /** Multiplikator (bps) nach Schritt i. */
  history: number[];
  /** Nur spin-tower-pro: ein Eintrag je bezahltem Spin. */
  spins: SpinRecord[];
}

export const EMPTY_TRANSCRIPT: SessionTranscript = { sessionId: '', betLamports: '0', history: [], spins: [] };

const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const nums = (v: unknown): number[] => arr(v).map(Number).filter((n) => Number.isFinite(n));
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
const str = (v: unknown, d: string): string => (typeof v === 'string' ? v : d);

/** Wie viele Protokoll-Schritte das Modul für diese Sicht zeichnet — der
 *  `from`-Wert des nächsten Abspielens. */
export function sessionStepCount(engineKey: string, view: SessionView | null | undefined): number {
  if (!view) return 0;
  const p = rec(view.progress);
  switch (engineKey) {
    case 'mines':
      return arr(p.picks).length;
    case 'towers':
      return arr(p.columns).length;
    case 'hilo':
      return arr(p.guesses).length || Math.max(0, arr(p.cardHistory).length - 1);
    case 'dice-ladder':
      return arr(p.guesses).length || Math.max(0, arr(p.sumHistory).length - 1);
    case 'steps':
      return Math.max(0, arr(p.stepHistory).length - 1);
    case 'spin-tower-pro':
      return view.spins ?? arr(view.outcomes).length;
    default:
      return view.steps ?? 0;
  }
}

/** Einsatz der Runde: gesetzt beim Start; nach einem Reload aus Cashout-Wert
 *  und Multiplikator hergeleitet (exakt genug für eine Anzeige). */
function betOf(view: SessionView, known: string | undefined): string {
  if (known) return known;
  if (view.stakeLamports) return view.stakeLamports;
  const mult = view.multiplierBps ?? 0;
  try {
    if (mult > 0 && view.potentialPayoutLamports) return ((BigInt(view.potentialPayoutLamports) * 10000n) / BigInt(mult)).toString();
    if (mult > 0 && view.payoutLamports) return ((BigInt(view.payoutLamports) * 10000n) / BigInt(mult)).toString();
  } catch {
    /* unbrauchbare Zahl → 0 */
  }
  return '0';
}

function spinKind(idx: number | undefined, towers: number): SpinRecord['outcome'] {
  if (idx === undefined || !Number.isFinite(idx)) return { kind: 'nothing' };
  if (idx < towers) return { kind: 'tower', tower: idx };
  if (idx === towers) return { kind: 'joker' };
  if (idx === towers + 1) return { kind: 'nothing' };
  return { kind: 'fail' };
}

/**
 * Schreibt die neue Sicht in die Mitschrift — EINMAL je Server-Antwort. Eine
 * andere Session beginnt eine neue Mitschrift.
 */
export function noteSessionStep(
  tr: SessionTranscript,
  engineKey: string,
  view: SessionView,
  betLamports?: string,
): SessionTranscript {
  const same = tr.sessionId === view.sessionId;
  const n = sessionStepCount(engineKey, view);
  const server = nums(rec(view.progress).multiplierHistory);
  const history = server.length >= n ? server.slice(0, n) : same ? tr.history.slice(0, n) : [];
  while (history.length < n) {
    // Der Bust-Schritt selbst bringt keinen neuen Multiplikator — er zeigt den
    // Stand davor (der Server meldet auf einem Bust 0).
    const bustStep = view.status === 'busted' && history.length === n - 1;
    history.push(bustStep ? (history[history.length - 1] ?? 10000) : (view.multiplierBps ?? view.returnBps ?? 10000));
  }
  let spins = same ? tr.spins.slice(0, n) : [];
  if (engineKey === 'spin-tower-pro') {
    const towers = arr(rec(view.engine?.config).towers).length;
    const outcomes = nums(view.outcomes);
    while (spins.length < n) {
      const i = spins.length;
      const last = i === n - 1;
      spins.push({
        outcome: spinKind(outcomes[i], towers),
        levels: last ? nums(view.levels) : null,
        securedBps: last ? num(view.securedBps) : null,
        potBps: last ? num(view.potBps) : null,
      });
    }
  }
  return { sessionId: view.sessionId, betLamports: betOf(view, betLamports ?? (same ? tr.betLamports : undefined)), history, spins };
}

/**
 * Das Protokoll für `RevealHost`/das Modul der Engine. `null`, wenn die Engine
 * kein Session-Modul hat — dann zeigt der Flow die Sicht wie bisher sofort.
 */
export function sessionOutcome(engineKey: string, view: SessionView, tr: SessionTranscript): Record<string, unknown> | null {
  const p = rec(view.progress);
  const cfg = rec(view.engine?.config);
  const reveal = rec(view.reveal);
  const busted = view.status === 'busted';
  const payout = view.payoutLamports ?? '0';
  const h = (i: number): number => tr.history[i] ?? tr.history[tr.history.length - 1] ?? view.multiplierBps ?? 10000;
  const common = {
    sessionId: view.sessionId,
    betLamports: tr.betLamports,
    status: view.status,
    multiplierBps: view.multiplierBps ?? view.returnBps ?? 0,
    payoutLamports: payout,
    win: view.status === 'cashed_out' && payout !== '0',
    capped: view.capped === true,
  };
  switch (engineKey) {
    case 'mines': {
      const picks = nums(p.picks);
      const last = picks.length - 1;
      return {
        ...common,
        engineConfig: { gridSize: cfg.gridSize, mineCount: cfg.mineCount },
        steps: picks.map((tile, i) => ({ tile, safe: !(busted && i === last), multiplierBps: h(i) })),
        minePositions: nums(reveal.minePositions),
      };
    }
    case 'towers': {
      const cols = nums(p.columns);
      const last = cols.length - 1;
      return {
        ...common,
        engineConfig: { levels: cfg.levels, columns: cfg.columns, bombs: cfg.bombs, floors: cfg.floors },
        steps: cols.map((column, i) => ({ column, safe: !(busted && i === last), multiplierBps: h(i) })),
        bombColumns: arr(reveal.bombColumns),
      };
    }
    case 'hilo': {
      const cards = nums(p.cardHistory);
      const guesses = arr(p.guesses).map((g) => str(g, 'higher'));
      const n = Math.min(guesses.length, Math.max(0, cards.length - 1));
      return {
        ...common,
        startCard: cards[0] ?? 0,
        steps: Array.from({ length: n }, (_, i) => ({
          guess: guesses[i],
          card: cards[i],
          nextCard: cards[i + 1],
          correct: !(busted && i === n - 1),
          multiplierBps: h(i),
        })),
      };
    }
    case 'dice-ladder': {
      const sums = nums(p.sumHistory);
      const throws = arr(p.diceHistory).map(nums);
      const guesses = arr(p.guesses).map((g) => str(g, 'higher'));
      const n = Math.min(guesses.length, Math.max(0, sums.length - 1));
      const start = throws[0] ?? [];
      return {
        ...common,
        dice: start.length || num(cfg.diceCount) || 2,
        startThrow: start,
        steps: Array.from({ length: n }, (_, i) => ({
          guess: guesses[i],
          fromSum: sums[i],
          throw: throws[i + 1] ?? [],
          toSum: sums[i + 1],
          correct: !(busted && i === n - 1),
          multiplierBps: h(i),
        })),
      };
    }
    case 'steps': {
      const sh = nums(p.stepHistory);
      const lives = cfg.failMode === 'checkpoint' ? (num(cfg.lives) ?? 0) : 0;
      let left = lives;
      const climbs = [];
      for (let i = 0; i + 1 < sh.length; i++) {
        const survived = sh[i + 1]! > sh[i]!;
        if (!survived) left = Math.max(0, left - 1);
        climbs.push({ fromRung: sh[i], toRung: sh[i + 1], survived, livesLeft: left });
      }
      return {
        ...common,
        engineConfig: { ladderBps: cfg.ladderBps, checkpoints: cfg.checkpoints, lives },
        climbs,
      };
    }
    case 'pump':
      return {
        ...common,
        pumps: tr.history.slice(0, view.steps ?? 0).map((multiplierBps) => ({ multiplierBps })),
        burstMultiplierBps: num(reveal.burstMultiplierBps),
      };
    case 'spin-tower-pro':
      return {
        sessionId: view.sessionId,
        betLamports: view.stakeLamports ?? tr.betLamports,
        engineConfig: cfg,
        spins: tr.spins,
        status: view.status,
        endReason: (view as unknown as Record<string, unknown>).endReason,
        potBps: view.potBps ?? 0,
        securedBps: view.securedBps ?? 0,
        multiplierBps: view.returnBps ?? 0,
        payoutLamports: payout,
        // Gesichertes zahlt auch nach einem FAIL — „gewonnen" heißt hier: es kam Geld zurück.
        win: view.status !== 'active' && payout !== '0',
      };
    default:
      return null;
  }
}

/** Das Protokoll eines Turnierlaufs (gauntlet): der Verlauf IST die Geschichte. */
export function tournamentOutcome(view: TournamentRunView, entryLamports: string | null | undefined): Record<string, unknown> {
  const entry = entryLamports ?? '0';
  return {
    runId: view.runId,
    betLamports: entry,
    entryLamports: entry,
    maxSteps: view.maxSteps,
    engineConfig: view.engine?.config ?? null,
    history: view.history,
    status: view.status,
    score: view.score,
    bestScore: view.bestScore,
  };
}
