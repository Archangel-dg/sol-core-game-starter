'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePlayer, useDemo } from './DemoProvider';
import type { EngineDef, GuessOption } from '@/lib/engines';
import { SPIN_TOWER_PROTOCOL, type SessionView } from '@/lib/solcore';
import { solToLamports, toSol } from '@/lib/lamports';
import { toUiError } from '@/lib/errors';
import { usePlayerAuth } from '@/lib/player-auth';
import type { RoundLog } from './SingleBetGame';
import { MaxBetPick } from './BetLimitHint';
import { FiatHint } from './FiatHint';
import { useSound } from '@/lib/sounds';
import { useT, type TFn } from '@/lib/i18n';
import { RevealHost } from './RevealHost';
import { hasReveal, type RevealPickOptions } from '@/lib/reveal';
import { EMPTY_TRANSCRIPT, noteSessionStep, sessionOutcome, sessionStepCount, type SessionTranscript } from '@/lib/reveal-session';

/** Woher eine Server-Antwort kommt — entscheidet über den Ton nach dem Reveal. */
type Antwort = 'start' | 'step' | 'cashout' | 'reconnect';

/** towers-Reveal: `bombColumns` ist `number[][]` (eine Spalten-Menge je
 * Etage, `c.bombs` Bomben pro Etage). Rein defensiv — akzeptiert auch ältere
 * `number[]`-Formen ohne zu crashen und liefert '' wenn nichts zu zeigen ist. */
function formatTowersBombs(bombColumns: unknown, t: TFn): string {
  if (!Array.isArray(bombColumns)) return '';
  const rows = bombColumns
    .map((row: unknown, i: number) => {
      const cols = Array.isArray(row) ? row : typeof row === 'number' ? [row] : [];
      const nums = cols.filter((n): n is number => typeof n === 'number');
      return nums.length ? t('session.floorShort', { n: i + 1, cols: nums.map((n) => n + 1).join(',') }) : null;
    })
    .filter((s): s is string => s !== null);
  return rows.length ? t('session.bombsPerFloor', { rows: rows.join(' · ') }) : '';
}

/** Aktueller Bezugswert eines Tipp-Schritts, gegen den „höher/tiefer" gilt:
 * dice-ladder liefert `currentSum` (+ die Einzelwürfel des letzten Wurfs),
 * hilo `currentCard`. Ohne diese Anzeige wäre ein Tipp blind — bei
 * dice-ladder hängt die Gewinnchance sogar direkt am aktuellen Wert (eine 4
 * ist etwas völlig anderes als eine 10). Rein defensiv aus dem
 * `Record<string, unknown>`-Fortschritt gelesen; liefert null, wenn die
 * Engine keinen solchen Wert führt.
 *
 * `min`/`max` sind die Enden der Werteskala aus der Server-Config — nur dafür
 * da, einen Tipp zu sperren, den der Server ohnehin ablehnt (`higher` auf dem
 * höchsten Wert, `lower` auf dem niedrigsten). Bewusst am FORTSCHRITT
 * unterschieden (`currentCard` vs. `currentSum`) und nicht am Engine-Namen —
 * dieselbe Herleitung wie beim Wert selbst. Ohne Config bleiben die
 * Engine-Defaults (13 Karten bzw. 2W6), nie ein geratenes Maximum. */
function currentGuessValue(
  progress: unknown,
  cfg: Record<string, unknown> | null,
): { value: number; dice?: number[]; min: number; max: number } | null {
  if (!progress || typeof progress !== 'object') return null;
  const p = progress as Record<string, unknown>;
  const c = cfg ?? {};
  const zahl = (v: unknown, fallback: number): number =>
    typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : fallback;
  const summe = typeof p.currentSum === 'number' ? p.currentSum : null;
  const karte = typeof p.currentCard === 'number' ? p.currentCard : null;
  const raw = summe ?? karte;
  if (raw === null || !Number.isFinite(raw)) return null;
  // Augensumme: kleinster Wurf = `dice` (jeder Würfel 1), größter = dice·faces.
  // Karte: 1 … `cards`.
  const [min, max] =
    summe !== null
      ? [zahl(c.dice, 2), zahl(c.dice, 2) * zahl(c.faces, 6)]
      : [1, zahl(c.cards, 13)];
  const history = p.diceHistory;
  const last = Array.isArray(history) ? history[history.length - 1] : undefined;
  const dice = Array.isArray(last) ? last.filter((n): n is number => typeof n === 'number') : undefined;
  return dice && dice.length > 0 ? { value: raw, dice, min, max } : { value: raw, min, max };
}

/** Ein Tipp-Knopf: was er sagt, ob er geht, und warum nicht. */
interface GuessButton {
  guess: GuessOption;
  label: 'session.higher' | 'session.lower' | 'session.equal';
  /** null = spielbar; sonst der Katalogschlüssel des Grundes. */
  locked: 'session.guessImpossible' | 'session.guessCapped' | null;
}

/**
 * Welche Tipps stehen zur Wahl — und welche davon würde der Server ablehnen?
 *
 * Zwei Sperren, aus zwei Quellen, bewusst getrennt:
 *
 * 1. UNMÖGLICH (rechenbar): „höher" auf dem höchsten Wert bzw. „tiefer" auf dem
 *    niedrigsten hat Chance 0 — außer das Spiel wertet den Gleichstand als
 *    Gewinn (`tieRule: 'win'`), dann ist auch das spielbar. Beides steht im
 *    öffentlichen Config-Echo, hier wird nichts geschätzt.
 * 2. ÜBER DER KETTEN-OBERGRENZE (NICHT rechenbar): Ob ein Tipp `maxWinBps`
 *    reißt, hängt am House-Edge — und den veröffentlicht der Server bewusst
 *    nicht. Statt ihn zu raten (ein falscher Wert würde einen erlaubten Tipp
 *    sperren) übernimmt die Oberfläche die Liste, die der Server seiner
 *    Ablehnung beilegt: `details.allowedGuesses`. Damit ist die Sperre immer
 *    genau die des Servers — nie eine zweite Meinung darüber.
 *
 * 'equal' erscheint NUR, wenn das Spiel es erlaubt (`allowEqual: 1` im
 * Config-Echo). Ohne die 1 bleibt es bei zwei Knöpfen wie bisher.
 */
function guessButtons(
  cfg: Record<string, unknown> | null,
  wert: { value: number; min: number; max: number },
  cap: { at: number; allowed: string[] } | null,
): GuessButton[] {
  const c = cfg ?? {};
  // Der Server schickt `allowEqual` als 0/1 (PublicEngineConfig kennt keinen
  // boolean) — ein echtes `true` wird trotzdem akzeptiert.
  const equalAn = c.allowEqual === 1 || c.allowEqual === true;
  // Gleichstand gewinnt ⇒ kein Tipp ist mehr unmöglich (die Randtipps
  // gewinnen dann genau über den Gleichstand).
  const gleichstandGewinnt = c.tieRule === 'win';
  const kandidaten: { guess: GuessOption; label: GuessButton['label']; unmoeglich: boolean }[] = [
    { guess: 'higher', label: 'session.higher', unmoeglich: !gleichstandGewinnt && wert.value >= wert.max },
    { guess: 'lower', label: 'session.lower', unmoeglich: !gleichstandGewinnt && wert.value <= wert.min },
    ...(equalAn ? [{ guess: 'equal' as const, label: 'session.equal' as const, unmoeglich: false }] : []),
  ];
  // Die Cap-Liste gilt nur für den Wert, zu dem der Server sie geschickt hat —
  // nach dem nächsten Schritt steht eine andere Karte da und sie ist hinfällig.
  const capGilt = cap && cap.at === wert.value;
  return kandidaten.map(({ guess, label, unmoeglich }) => ({
    guess,
    label,
    locked: unmoeglich
      ? 'session.guessImpossible'
      : capGilt && !cap.allowed.includes(guess)
        ? 'session.guessCapped'
        : null,
  }));
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
  /** Die GANZE Sicht — nicht `progress`. Der Server legt Stufen, Pot und
   * Gesichertes bei dieser Engine auf die oberste Ebene und sendet gar kein
   * `progress`. Der alte Zugriff darauf lieferte still ein leeres Objekt:
   * jeder Turm stand auf Stufe 0, nichts war markiert, der Pot zeigte 0.00×.
   * `progress` bleibt als Rückfall drin, falls ein API-Stand es doch dort führt. */
  sicht: unknown,
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
  const v = sicht && typeof sicht === 'object' ? (sicht as Record<string, unknown>) : {};
  const innen = v.progress && typeof v.progress === 'object' ? (v.progress as Record<string, unknown>) : {};
  /** Oberste Ebene zuerst, `progress` als Rückfall. */
  const p = { ...innen, ...v } as Record<string, unknown>;
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
  // Der Server rechnet den Pot selbst (`potBps`) — die lokale Summe unten ist
  // nur der Rückfall, wenn er ihn nicht mitschickt.
  const potBpsServer = numOrNull(p.potBps);
  // Pot lokal aus Brett + Stufen — nur der Rückfall für den Fall, dass ein
  // API-Stand `potBps` nicht mitschickt.
  const potBps = towers.reduce((sum, t, i) => {
    const lvl = levels[i] ?? 0;
    return lvl > 0 ? sum + (t.multipliersBps[lvl - 1] ?? 0) : sum;
  }, 0);
  const rawFail = c.failMode;
  return {
    towers,
    levels,
    potBps: potBpsServer ?? potBps,
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
  /** Die Tipps, die der Server bei DIESEM Wert noch zulässt — gesetzt aus
   * seiner eigenen Ablehnung (`guess_exceeds_max_win`), nie selbst gerechnet.
   * Siehe `guessButtons`. */
  const [capLock, setCapLock] = useState<{ at: number; allowed: string[] } | null>(null);
  const { play } = useSound();
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
            betLamports: v.stakeLamports ?? '0',
            win: v.status === 'cashed_out' && v.payoutLamports !== '0',
            // Derselbe Rückfall wie im HUD — sonst stand im Verlauf NaN×.
            multiplierBps: v.multiplierBps ?? v.returnBps ?? 0,
            payoutLamports: v.payoutLamports ?? '0',
            roundId: v.roundId,
          });
        }
      }
    },
    [onLog, onRound, storeKey],
  );

  // ── Reveal-Gating (docs/RULES.md, Regel 16.4) ──────────────────────────────
  // Die Antwort des Servers wird NICHT sofort angezeigt: `pending` hält sie,
  // das Modul der Engine spielt den neuen Schritt ab, und erst `onRevealed`
  // schaltet HUD, Ton, Verlauf und Saldo frei. Engines ohne Modul zeigen die
  // Antwort wie bisher sofort. Die Mitschrift (`transcript`) macht aus den
  // Server-Ständen das Protokoll, das das Modul schrittweise abspielt.
  const animated = hasReveal(engine.key);
  const [revealing, setRevealing] = useState(false);
  const [reveal, setReveal] = useState<{ outcome: unknown; from: number } | null>(null);
  const pending = useRef<{ view: SessionView; outcome: unknown; kind: Antwort } | null>(null);
  const transcript = useRef<SessionTranscript>(EMPTY_TRANSCRIPT);
  const sfx = (v: SessionView, kind: Antwort) => {
    if (kind === 'cashout') play('cashout');
    else if (v.status === 'busted') play('lose');
    else if (v.status !== 'active') play(v.payoutLamports && v.payoutLamports !== '0' ? 'win' : 'lose');
  };
  const deliver = (v: SessionView, kind: Antwort, betLamports?: string) => {
    if (!animated) {
      if (kind !== 'reconnect') sfx(v, kind);
      setView(v);
      finishIfEnded(v);
      return;
    }
    transcript.current = noteSessionStep(transcript.current, engine.key, v, betLamports);
    const outcome = sessionOutcome(engine.key, v, transcript.current);
    if (!outcome) {
      setView(v);
      finishIfEnded(v);
      return;
    }
    if (kind === 'reconnect') {
      // Nach einem Reload steht der Stand sofort; das Modul spielt das Protokoll
      // nach — aber nur, wenn das Brett diese Session noch nicht zeigt. Läuft die
      // Abfrage mitten in einer bekannten Runde, wäre eine Wiederholung von vorn
      // ein Bruch im Spiel.
      pending.current = null;
      setView(v);
      finishIfEnded(v);
      if (view?.sessionId !== v.sessionId) setReveal({ outcome, from: 0 });
      return;
    }
    pending.current = { view: v, outcome, kind };
    setRevealing(true);
    // `from`: so viele Schritte stehen schon auf dem Brett — nur das Neue bewegt sich.
    setReveal({ outcome, from: sessionStepCount(engine.key, view) });
  };
  const deliverRef = useRef(deliver);
  deliverRef.current = deliver;
  // ── Das Brett IST die Auswahl ─────────────────────────────────────────────
  // Bei Index-Schritten (mines: welches Feld, towers: welche Spalte) doppelte
  // eine Zahlenliste unter dem Spielfeld genau das, was das Brett schon zeigt.
  // Kann das Modul der Engine bedient werden (`setPick`), fällt die Liste weg.
  //
  // `pickSupported` ist bewusst der EINZIGE Schalter dafür — und er kommt vom
  // Host, nicht aus einer Engine-Liste hier: Lädt das Modul nicht (Netzfehler,
  // kaputtes Modul), meldet der Host `false` und die Liste ist wieder da. Eine
  // Runde, die niemand bedienen kann, darf es nicht geben.
  const [pickSupported, setPickSupported] = useState(false);
  const onRevealed = (outcome: unknown) => {
    const p = pending.current;
    if (!p || p.outcome !== outcome) return; // abgelöst oder schon geliefert
    pending.current = null;
    setRevealing(false);
    setView(p.view);
    sfx(p.view, p.kind);
    finishIfEnded(p.view);
  };

  // Reconnect: aktive Session nach Reload fortsetzen — EINMAL je Spiel und
  // Modus. Früher hing der Effekt an `finishIfEnded` und lief bei jedem neuen
  // Callback des Elternteils erneut; mit einem Reveal-Modul hätte jede dieser
  // Abfragen die laufende Runde von vorn abgespielt.
  useEffect(() => {
    const id = typeof window !== 'undefined' ? localStorage.getItem(storeKey) : null;
    if (!id) return;
    fetch(`${apiBase}/session/${id}`)
      .then((r) => r.json())
      .then((v: SessionView & { error?: unknown }) => {
        if (!v.error && v.sessionId) deliverRef.current(v, 'reconnect');
        else localStorage.removeItem(storeKey);
      })
      .catch(() => localStorage.removeItem(storeKey));
    // `deliverRef` trägt den jeweils aktuellen Flow — der Effekt braucht keine weiteren Deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeKey]);

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
        // Der Server sagt in dieser einen Ablehnung, was JETZT noch geht.
        // Übernehmen statt nachrechnen: der House-Edge, aus dem sich die
        // Grenze ergibt, ist nicht öffentlich (siehe `guessButtons`).
        const bezug = typeof details?.card === 'number' ? details.card
          : typeof details?.sum === 'number' ? details.sum
            : null;
        const alsSperre =
          reason === 'guess_exceeds_max_win' &&
          Array.isArray(details?.allowedGuesses) &&
          bezug !== null;
        if (alsSperre) {
          setCapLock({
            at: bezug,
            allowed: (details!.allowedGuesses as unknown[]).filter(
              (g): g is string => typeof g === 'string',
            ),
          });
        }
        // Wird die Ablehnung zur Sperre, steht ihr Grund schon am Knopf. Die
        // rote Zeile zusätzlich wäre dieselbe Auskunft ein zweites Mal.
        const ui = toUiError(r.error.code, r.error.message, reason, details);
        setError(alsSperre ? null : `${ui.code}: ${ui.message}`);
        play('error');
        return null;
      }
      // Jede angenommene Antwort hebt eine alte Ablehnung auf: Nach einem
      // Schritt steht ein anderer Wert da, nach einem Start eine andere Runde.
      setCapLock(null);
      return r as SessionView;
    } catch (e) {
      setError((e as Error).message);
      play('error');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    if (!wallet) return;
    play('bet');
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
      deliver(v, 'start', solToLamports(bet).toString());
    }
  };

  const step = async (arg: { value?: number; guess?: GuessOption }) => {
    if (!view) return;
    play('click');
    const v = await call(`${apiBase}/session/${view.sessionId}/step`, sess.buildStep(arg));
    if (v) deliver(v, 'step');
  };

  const cashout = async () => {
    if (!view) return;
    const v = await call(`${apiBase}/session/${view.sessionId}/cashout`);
    if (v) deliver(v, 'cashout');
  };

  const active = view?.status === 'active';
  const ended = view && view.status !== 'active';
  const towersBombText =
    view && view.status === 'busted' && engine.key === 'towers' ? formatTowersBombs(view.reveal?.bombColumns, t) : '';
  const guessValue =
    sess.step.kind === 'guess'
      ? currentGuessValue(view?.progress, cfg as Record<string, unknown> | null)
      : null;
  const guessChoices = guessValue
    ? guessButtons(cfg as Record<string, unknown> | null, guessValue, capLock)
    : [];
  // Ein grauer Knopf ohne Grund ist ein kaputter Knopf: Steht mindestens einer
  // still, sagt eine Zeile darunter warum. Die Ketten-Obergrenze zuerst — sie
  // ist der Grund, den niemand von selbst errät.
  const guessLockNote =
    guessChoices.find((b) => b.locked === 'session.guessCapped')?.locked ??
    guessChoices.find((b) => b.locked === 'session.guessImpossible')?.locked ??
    null;
  // Felder, die dieser Schritt nicht mehr annimmt. Nur mines führt sie
  // (`progress.picks`); bei towers ist jede Etage frisch, dort bleibt es
  // `undefined` — dieselbe Lesart, die die Zahlenliste unten schon hatte.
  const takenPicks =
    view && Array.isArray(view.progress?.picks) ? (view.progress.picks as number[]) : undefined;
  // Was das Brett gerade annehmen darf. `null` heißt: nichts ist anklickbar.
  const pick: RevealPickOptions | null =
    animated && idxStep && bounds && view && view.status === 'active'
      ? {
          // Zu, solange eine Anfrage läuft oder das Modul spielt: sonst schickt
          // ein zweiter Tipp den nächsten Schritt los, während der vorige noch
          // fliegt — und der Server sähe zwei Züge zu einem Stand.
          enabled: !busy && !revealing,
          min: bounds.min,
          max: bounds.max,
          taken: takenPicks,
          onPick: (value) => void step({ value }),
        }
      : null;
  const steps = engine.key === 'steps' && view ? stepsInfo(view.progress, cfg) : null;
  // steps: Cashout erst ab Stufe 1 sinnvoll (der Server lehnt am Boden ohnehin
  // ab — nach einem Fall wäre `view.steps ≥ 1`, aber die Auszahlung 0).
  const cashoutBlocked = steps ? steps.rung < 1 : false;

  // ── Engines mit Kosten je Schritt (spin-tower-pro) ────────────────────────
  // Alles hier ist an `sess.costPerStep` gehängt, nicht an einem Engine-Key:
  // fehlt das Feld (alle anderen Engines), bleibt jede Zeile unten wirkungslos
  // und die Oberfläche rendert exakt wie bisher.
  const costPerStep = sess.costPerStep === true;
  const spinTower = costPerStep ? spinTowerInfo(view ?? null, cfg) : null;
  // `spins` ist die Wahrheit des Servers für bezahlte Spins; `steps` ist der
  // generische Zähler und dient nur als Rückfall für ältere API-Stände.
  const spinsUsed = view?.spins ?? view?.steps ?? 0;
  const maxSpins = view?.maxSpins ?? spinTower?.maxSpins ?? null;
  const stepsTaken = costPerStep ? spinsUsed : (view?.steps ?? 0);
  // Preis eines Spins: in der laufenden Runde sagt ihn der Server
  // (`totalChargePerSpinLamports` — Einsatz PLUS Fees, also exakt der Betrag,
  // der abgebucht wird) — nach einem Reload weiß das lokale Einsatz-Feld nichts
  // über die Runde, eine Anzeige daraus wäre schlicht falsch.
  const spinCostText = view?.totalChargePerSpinLamports
    ? toSol(view.totalChargePerSpinLamports)
    : null;
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
  // der Pot ist bei einem FAIL weg, das Gesicherte nicht. Der Server führt
  // beide in bps EINES Einsatzes; zusammen mit dem gesperrten Einsatz
  // (`stakeLamports`) wird daraus ein exakter Betrag — ohne Rundung, weil in
  // Lamports gerechnet wird. Fehlt der Einsatz (alter Stand), bleibt die
  // Multiplikator-Sicht.
  const inSol = (bps: number | null | undefined): string | null => {
    if (bps === null || bps === undefined || !view?.stakeLamports) return null;
    try {
      return toSol(((BigInt(view.stakeLamports) * BigInt(Math.round(bps))) / 10000n).toString());
    } catch {
      return null;
    }
  };
  const potSol = inSol(spinTower?.potBps);
  const potText = potSol
    ? `${potSol} ◎`
    : spinTower
      ? `${(spinTower.potBps / 10000).toFixed(2)}×`
      : '—';
  const securedSol = inSol(spinTower?.securedBps);
  const securedText = securedSol
    ? `${securedSol} ◎`
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
                <div className="text-center text-[10px] text-white/40">
                  {t('session.tower', { n: ti + 1 })}
                </div>
                {Array.from({ length: rows }, (_, i) => rows - i).map((lvl) => {
                  // Drei Zustände, jeder eigenständig erkennbar — nicht nur
                  // heller/dunkler: erstiegen (getönt, ausgefüllter Punkt),
                  // AKTUELL (Ring + Pfeil, der Multiplikator, der im Pot zählt)
                  // und offen (blass, leerer Punkt). Ohne das musste ein Spieler
                  // raten, wo sein Turm steht.
                  const erreicht = lvl < current;
                  const aktuell = lvl === current;
                  return (
                    <div
                      key={lvl}
                      aria-current={aktuell ? 'step' : undefined}
                      className={`flex items-center gap-1 rounded px-1.5 py-1 text-[11px] tabular-nums ${
                        aktuell
                          ? 'bg-accent/20 font-semibold text-accent ring-1 ring-accent/60'
                          : erreicht
                            ? 'bg-accent/[0.07] text-accent/60'
                            : 'text-white/25'
                      }`}
                    >
                      <span aria-hidden className="w-2 shrink-0 text-center">
                        {aktuell ? '▸' : ''}
                      </span>
                      <span className="w-3 shrink-0">{lvl === rows ? '★' : lvl}</span>
                      <span aria-hidden className="shrink-0 text-[9px] leading-none">
                        {aktuell || erreicht ? '●' : '○'}
                      </span>
                      <span className="ml-auto">
                        {((tower.multipliersBps[lvl - 1] ?? 0) / 10000).toFixed(2)}×
                      </span>
                    </div>
                  );
                })}
                <div
                  className={`text-center text-[10px] ${current > 0 ? 'text-accent/70' : 'text-white/40'}`}
                >
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

  // Statuszeile unter dem Spielfeld (Schritt, Leben, Cashout-Wert, Bust/Cashout,
  // Sturz, Cap, Bomben). Mit Reveal-Modul steht sie im Bedienfeld — das Feld
  // gehört dann ganz der Animation; ohne Modul wie bisher im Feld.
  const statusLine = view ? (
    <>
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
        t('session.spinInfo', {
          n: spinsUsed,
          max: maxSpins !== null ? `/${maxSpins}` : '',
          amount: toSol(view.potentialPayoutLamports),
        })}
      {active &&
        !steps &&
        !costPerStep &&
        t('session.step', {
          // `steps` ist bei spin-tower-pro nicht gesetzt; dieser Zweig
          // laeuft ohnehin nur ohne costPerStep, der Rueckfall haelt
          // den Typ ehrlich.
          n: view.steps ?? 0,
          amount: toSol(view.potentialPayoutLamports),
        })}
      {/* Bei Kosten je Schritt wäre „alles verloren" gelogen: ein FAIL
          nimmt nur den Pot, das Gesicherte wird trotzdem ausgezahlt. */}
      {view.status === 'busted' && costPerStep &&
        `${t('session.failPotLost')}${
          view.payoutLamports && view.payoutLamports !== '0'
            ? ` · ${t('session.failSecuredPaid', { amount: toSol(view.payoutLamports) })}`
            : ''
        }`}
      {view.status === 'busted' && !costPerStep && t('session.busted')}
      {view.status === 'cashed_out' &&
        t('session.cashedOut', { amount: toSol(view.payoutLamports ?? '0') })}
    </div>
    {active && steps?.lastFall && (
      <div className="mt-1 text-[11px] text-amber-300/80">
        {t('session.fell', { from: steps.lastFall.from, to: steps.lastFall.to })}
        {steps.lastFall.to > 0 ? ` ${t('session.safePoint')}` : ` ${t('session.ground')}`}
      </div>
    )}
    {ended && view.capped && <div className="text-xs text-white/40">{t('session.payoutLimit')}</div>}
    {towersBombText && <div className="mt-1 text-[11px] text-white/30">{towersBombText}</div>}
    </>
  ) : null;

  return (
    <div className="sc-shell flex flex-col gap-4">
      {/* Spielfeld — nur Animation und Ergebnis. Die Bedienelemente stehen
          bewusst im eigenen Block darunter: So kann ein Creator das Spielfeld
          frei gestalten oder ersetzen, ohne die Eingaben mit umzubauen.
          Min-Höhe statt fixer Höhe: die Engine-Erklärtexte (playerFacts, z. B.
          steps' Leben/Safe-Point-Regeln) sind unterschiedlich lang und liefen
          bei h-28 sichtbar über das Feld hinaus. Quadratisch (aspect-square):
          so hoch wie breit, auf jedem Gerät.

          `sc-board` (globals.css) deckelt die Kantenlänge zusätzlich auf einen
          Teil der Bildschirmhöhe. Ohne diesen Deckel ist das Feld auf einem
          Telefon so hoch wie breit — und schiebt Tipp-Knöpfe und Cashout unter
          die Falz, wo sie mitten in der Runde niemand mehr sieht. */}
      <div className="sc-board mx-auto grid aspect-square w-full rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className={animated ? 'h-full w-full overflow-hidden rounded-xl bg-night' : 'grid h-full place-items-center overflow-auto rounded-xl bg-night px-2 py-3 text-center'}>
          {animated ? (
            // Das Reveal-Modul der Engine (src/reveals/<engine>.js): Leerlauf aus der
            // Server-Config, jeder Schritt wird abgespielt, das Ergebnis steht erst am Ende.
            <RevealHost
              engineKey={engine.key}
              engineConfig={cfg as Record<string, unknown> | null}
              outcome={reveal?.outcome ?? null}
              from={reveal?.from}
              onRevealed={onRevealed}
              pick={pick}
              onPickSupport={setPickSupported}
              hint={t(engine.blurb)}
            />
          ) : view ? (
            <div>
              <div className={`text-3xl font-bold tabular-nums ${ended && view.status === 'busted' ? 'text-red-400' : 'text-accent'}`}>
                {/* `multiplierBps` gibt es nur bei den klassischen Engines;
                    spin-tower-pro nennt dieselbe Zahl `returnBps` (Pot +
                    Gesichertes). Ohne diesen Rückfall stand hier NaN×. */}
                {((view.multiplierBps ?? view.returnBps ?? 0) / 10000).toFixed(2)}×
              </div>
              {statusLine}
            </div>
          ) : (
            <div className="px-4">
              <p className="text-white/40">{t(engine.blurb)}</p>
              {/* Income/Outcome in einfachen Worten — was man tut, was passieren kann. */}
              <p className="mt-2 text-xs text-white/30">
                {t(engine.playerFacts.inputs)} {t(engine.playerFacts.outcomes)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bedienfeld — Einsatz, Auswahl, Spielen. Getrennt vom Spielfeld.
          `sc-controls` (globals.css) hält es auf schmalen Schirmen am unteren
          Rand: Der Deckel auf dem Spielfeld sorgt dafür, dass beides
          zusammen auf einen Bildschirm passt; klebt der Block zusätzlich
          unten, bleiben Tipp und Cashout auch dann sichtbar, wenn eine
          Fehlermeldung oder ein langer Hinweis die Seite länger macht.
          Deckende Fläche statt der durchscheinenden von früher — sonst läuft
          beim Kleben der Text des Spielfelds durch. */}
      <div className={`sc-controls relative rounded-2xl border border-white/10 bg-night p-5 ${guessValue ? 'pt-9' : ''}`}>
        {/* Der aktuelle Wert als rundes Feld auf der Oberkante — EINMAL. Er
            stand früher zusätzlich als Kasten mitten im Bedienfeld; dieselbe
            Zahl zweimal kostet genau die Höhe, die den Cashout-Knopf vom
            Schirm geschoben hat.

            Bewusst am BEDIENFELD und nicht am Spielfeld: Klebt der Block auf
            einem schmalen Schirm am unteren Rand, wandert das runde Feld mit
            ihm. Hinge es am Spielfeld, stünde es beim Kleben mitten im Text.

            `pointer-events-none`: Es ragt über den Rand hinaus und darf nichts
            abfangen, was darunter liegt. Es zeigt den Wert, der schon auf dem
            Brett steht (`view` wird erst nach `onRevealed` gesetzt) — verrät
            also nichts vor der Animation. */}
        {guessValue && (
          <div className="pointer-events-none absolute inset-x-0 top-0 flex -translate-y-1/2 justify-center">
            <div className="grid h-16 w-16 place-items-center rounded-full border border-white/15 bg-night text-center ring-4 ring-night">
              <div>
                <div className="text-2xl font-bold leading-none tabular-nums text-white">
                  {guessValue.value}
                </div>
                {guessValue.dice && (
                  <div className="mt-0.5 text-[9px] leading-none text-white/40">
                    {guessValue.dice.join(' + ')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {animated && statusLine && (
          <div className="mb-3 text-center text-sm text-white/70">{statusLine}</div>
        )}
        {!view || ended ? (
          // Start-Ansicht
          <>
            {towerBoard && <div className="mb-3">{towerBoard}</div>}
            <label className="block text-xs text-white/50">
              {/* Hoechsteinsatz AM Feld (Systemvertrag — nie entfernen). */}
              <span className="flex items-baseline justify-between gap-2">
                {/* Der Einsatz in Landeswaehrung NEBEN dem Label — eine
                    Randnotiz, die das Feld nicht auseinanderzieht. */}
                <span className="min-w-0 truncate">
                  {t(costPerStep ? 'session.stakePerSpin' : 'bet.stake')} <FiatHint sol={bet} />
                </span>
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
                {t('session.everySpinCostsBody')}
                {maxSpins !== null && (
                  <>
                    {' '}
                    {t('session.roundEndsAfter', {
                      max: maxSpins,
                      maxSpend: maxSpendText ? t('session.maxTotalStake', { amount: maxSpendText }) : '',
                    })}
                  </>
                )}{' '}
                {t('session.cashoutNote')}
              </div>
            )}
            <button
              type="button"
              onClick={() => void start()}
              disabled={busy || revealing || !connected}
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
            <p className="text-xs text-white/40">{t(sess.hint)}</p>
            {costPerStep && (
              // Kosten-Kopf der laufenden Runde: Preis je Spin, der GESPERRTE
              // Einsatz als read-only Feld und der Spin-Zähler gegen den Deckel.
              <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold text-amber-200">
                    {t('session.everySpinCostsShort')}
                  </span>
                  <span className="text-[11px] tabular-nums text-amber-100/70">
                    {t('session.spinCounter', { n: spinsUsed })}
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
                    {t('session.securedNote')}
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
              // Der Bezugswert steht als rundes Feld auf der Kante zum
              // Spielfeld (oben) — hier stehen nur noch die Tipps.
              // Zwei Knöpfe wie bisher; drei, sobald das Spiel den
              // Gleichstand-Tipp erlaubt (`allowEqual` aus der Server-Config).
              // Ein Tipp, den der Server ablehnen würde, ist gesperrt statt
              // klickbar — mit dem Grund am Knopf und darunter.
              <>
                <div className={`grid gap-2 ${guessChoices.length > 2 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  {guessChoices.map((b) => (
                    <button
                      key={b.guess}
                      type="button"
                      disabled={busy || revealing || b.locked !== null}
                      title={b.locked ? t(b.locked) : undefined}
                      onClick={() => void step({ guess: b.guess })}
                      className={`rounded-lg border py-2 text-sm transition disabled:opacity-40 ${
                        b.locked ? 'border-white/10' : 'border-white/15 hover:border-accent/50'
                      }`}
                    >
                      {t(b.label)}
                    </button>
                  ))}
                </div>
                {guessLockNote && (
                  <p className="text-[11px] leading-snug text-amber-300/80">{t(guessLockNote)}</p>
                )}
              </>
            )}
            {/* Die angenommenen Grenzen bleiben sichtbar, auch wenn die Liste
                unten entfällt: Wer auf ein Standard-Brett tippt statt auf das
                echte, soll das wissen. */}
            {idxStep && bounds && pickSupported && boundsAssumed && (
              <p className="text-[10px] text-amber-300/70">{t('session.configNotLoaded')}</p>
            )}
            {/* Zahlen-Auswahl — nur noch RÜCKFALL. Kann das Brett bedient
                werden (`pickSupported`), ist sie eine Verdopplung: dieselben
                25 Felder stünden zweimal auf der Seite. Ohne bedienbares Brett
                (Modul lädt nicht, fehlt, ist kaputt) ist sie die einzige Tür in
                den nächsten Schritt und MUSS bleiben. */}
            {idxStep && bounds && !pickSupported && (
              <div>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-xs text-white/40">{t('session.pick', { what: t(idxStep.label) })}</span>
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
                        disabled={busy || revealing || picked}
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
                      <span>{isCheckpoint ? '⚑ ' : ''}{t('session.rung', { n: rung })}</span>
                      <span>{(bps / 10000).toFixed(2)}×</span>
                    </div>
                  );
                })}
              </div>
            )}
            {sess.step.kind === 'action' && (
              // Bei `costPerStep` steht der Preis AUF dem Knopf — die eine Stelle,
              // an der niemand vorbeiklickt.
              <button type="button" disabled={busy || revealing} onClick={() => void step({})}
                className="w-full rounded-lg border border-white/15 py-2 text-sm disabled:opacity-40">{t(sess.step.label)}
                {costPerStep ? t('session.stepCosts', { amount: spinCostText ?? bet }) : ''}</button>
            )}
            <button
              type="button"
              onClick={() => void cashout()}
              disabled={busy || revealing || stepsTaken < 1 || cashoutBlocked}
              className="w-full rounded-xl bg-gradient-to-r from-accent to-accent-soft py-2.5 font-semibold text-night disabled:opacity-40"
            >
              {t('session.cashoutShort')} {stepsTaken >= 1 && !cashoutBlocked ? `(${toSol(view.potentialPayoutLamports)} ◎)` : ''}
            </button>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}
