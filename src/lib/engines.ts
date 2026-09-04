// ⚠ Nicht ändern — Systemvertrag (die params-Strukturen sind bindend).
// Zentrale Definition ALLER Sol-Core-Engines: Mechanik, Eingabe-Controls,
// params-Bauer (für /bet bzw. Session-Steps) und Ergebnis-Text. Datengesteuert,
// damit eine generische UI jede Engine bedienen kann.
//
// TEXTE (03.09.2026): Alles, was der Spieler liest — Beschreibung, Hinweise,
// Feld- und Optionsbeschriftungen — steht hier nur noch als Schlüssel in den
// Katalog `strings.ts` (`engine.<key>.…`, vier Sprachen, Englisch zuerst).
// Vorher waren die Sätze fest auf Deutsch eingebaut, und ein englisches Spiel
// zeigte „Kopf oder Zahl“ im Dropdown. Die Komponenten lösen die Schlüssel
// mit `t(…)` auf. Die params-Namen und -Werte (`name`, `value`, `default`)
// bleiben unverändert — sie sind der Vertrag mit dem Server.

import type { StringKey } from './strings';

export type Mechanic = 'single' | 'session' | 'tournament' | 'live' | 'pvp';

/**
 * Aufgelöste Engine-Dimensionen des konkreten Spiels (vom Server, via
 * /api/meta → engineConfig bzw. SessionView.engine.config). Z. B. towers:
 * { levels, columns } · mines: { gridSize, mineCount }.
 */
export type EngineConfig = Record<string, number>;

/**
 * Ein Tipp einer Kette (hilo, dice-ladder). 'equal' nimmt der Server NUR an,
 * wenn die Spiel-Config `allowEqual` gesetzt hat — er meldet das im
 * öffentlichen Engine-Config-Echo als `allowEqual: 1`. Die Oberfläche bietet
 * den dritten Knopf deshalb genau dann an, wenn die 1 ankommt; nie nach
 * Engine-Namen (dieselbe Herleitung wie bei `costPerStep`).
 */
export type GuessOption = 'higher' | 'lower' | 'equal';

/** Eingabe-Control für die generische Param-UI. */
export type Control =
  | { kind: 'select'; name: string; label: StringKey; options: { value: string; label: StringKey }[]; default: string }
  | {
      kind: 'number'; name: string; label: StringKey; min?: number; max?: number; step?: number; default: number;
      /** echte Grenzen aus der Server-Config; min/max sind nur Fallback (wie
       * intlist). Teilweise Ergebnisse (nur min ODER nur max) sind erlaubt —
       * das jeweils andere Ende bleibt beim statischen Fallback. */
      boundsFrom?: (cfg: EngineConfig) => { min?: number; max?: number };
    }
  | {
      kind: 'intlist'; name: string; label: StringKey; min: number; max: number; maxCount: number; hint?: StringKey;
      /** echte Grenzen aus der Server-Config; min/max sind nur Fallback. */
      boundsFrom?: (cfg: EngineConfig) => { min: number; max: number };
    };

export interface EngineDef {
  key: string;
  label: string;
  category: string;
  /** Welche Mechaniken diese Engine unterstützt. */
  mechanics: Mechanic[];
  /** Kurzbeschreibung fürs UI (Katalogschlüssel). */
  blurb: StringKey;
  /** Income/Outcome in einfachen Worten (Quelle: DevKit spec/engines.json):
   * was der Spieler wählt und was mit dem Einsatz passieren kann. */
  playerFacts: { inputs: StringKey; outcomes: StringKey };
  // ── Single-Bet ──
  /** Controls für einen Einzel-Bet (leer = keine Params). */
  singleControls?: Control[];
  /** Baut das params-Objekt aus den Control-Werten (Single-Bet). */
  buildSingleParams?: (v: Record<string, string>) => Record<string, unknown>;
  // ── Session ──
  /** Beschriftung/Art der Schritt-Aktion. */
  session?: {
    /** Wie ein Schritt ausgelöst wird. */
    step:
      | { kind: 'guess' } // higher/lower/equal (hilo, dice-ladder) — siehe GuessOption
      | {
          kind: 'index'; label: StringKey; min: number; max: number; // tile/column
          /** echte Grenzen aus der Server-Config; min/max sind nur Fallback
           * (Fallback = Engine-DEFAULTS des Servers, nie das Maximum!).
           * `currentStep` (0-basiert = bereits absolvierte Schritte) erlaubt
           * PRO-SCHRITT variierende Grenzen (towers-Etagen mit `floors`);
           * Engines ohne Bedarf (z. B. mines) ignorieren den zweiten
           * Parameter einfach. */
          boundsFrom?: (cfg: EngineConfig, currentStep?: number) => { min: number; max: number };
        }
      | { kind: 'action'; label: StringKey }; // pump
    /** Baut den Step-Body. */
    buildStep: (input: { value?: number; guess?: GuessOption }) => Record<string, unknown>;
    /**
     * Nur gesetzt, wenn JEDER Schritt erneut den Einsatz kostet (spin-tower-pro).
     * Alle anderen Session-Engines buchen den Einsatz EINMAL beim Start; jeder
     * Schritt danach ist gratis. Bewusst ein OPTIONALES Zusatzfeld und KEINE
     * neue `Mechanic`: die Union oben ist Systemvertrag (DevKit-Spec, Public
     * Mirror, jedes `switch (mechanic)`) — ein weiterer Wert hätte überall
     * gerippelt, ein fehlendes optionales Feld bricht dagegen nichts.
     *
     * Der Riegel gegen „alter Client hält Schritte für gratis und verklickt
     * Geld" liegt SERVERSEITIG (`SPIN_COST_GAME_MODES` lehnt den Einmal-Debit-
     * Pfad für diese Modi ab), nicht an diesem Typ. Die Aufgabe der UI ist
     * damit rein die Anzeigepflicht: Kosten je Schritt und Einsatz-Sperre
     * müssen unübersehbar sein (siehe SessionGame).
     */
    costPerStep?: true;
    hint: StringKey;
  };
  // ── Turnier (Pot-basierte Highscore-Läufe) ──
  /** Turnier-Lauf: enter (fester Einsatz → Pot) → step* (Risikostufe) →
   * stop (Score banken). Ausschüttung an die Top-Plätze am Zyklusende. */
  tournament?: {
    step: { kind: 'risk'; tiers: readonly ['safe', 'medium', 'risky'] };
    buildStep: (input: { risk: 'safe' | 'medium' | 'risky' }) => Record<string, unknown>;
    hint: StringKey;
  };
  // ── Live (geteilte Wettrunden auf Operator-Streams) ──
  /** Live-Runde: Outcome wählen + Einsatz während des Wettfensters; das
   * Ergebnis zieht der Server für ALLE Skins des Streams identisch. Die
   * Controls sind datengetrieben aus /api/live/state (Outcomes + Quoten),
   * nicht statisch — daher hier nur der Hinweistext. */
  live?: { hint: StringKey };
  // ── PvP (Spieler-gegen-Spieler mit Lobby-System) ──
  /** PvP-Runde: Lobby erstellen/beitreten → Ready-Check → Server-Draw um den
   * Pot. Grenzen (Einsatz, PIN) kommen als aufgelöste Engine-Config vom Server
   * (publicEngineConfig-Echo: minStakeLamports/maxStakeLamports/allowPin/…),
   * daher hier nur der Hinweistext. */
  pvp?: { hint: StringKey };
}

const num = (v: Record<string, string>, k: string, d = 0): number => {
  const n = Number(v[k]);
  return Number.isFinite(n) ? n : d;
};
const intList = (v: Record<string, string>, k: string): number[] =>
  (v[k] ?? '')
    .split(/[,\s]+/)
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isInteger(n));

/** towers Pro-Config: `publicEngineConfig('towers', …)` echot zusätzlich
 * `floors` (ein Eintrag `{columns,bombs,multiplierBps?}` je Etage — siehe
 * Server `TowersFloorConfig`). `EngineConfig` selbst bleibt `Record<string,
 * number>` (der Vertrag für alle anderen boundsFrom-Nutzer); der Zugriff auf
 * dieses Array-Feld geht daher defensiv über `unknown`, mit `Array.isArray`
 * abgesichert — dieselbe Vorsicht wie beim `bombColumns`-Reveal in
 * SessionGame. Fehlt `floors` (alte, uniforme Configs), liefert dies
 * `undefined` und der Aufrufer fällt auf den Skalar `columns` zurück. */
function towersFloorColumns(cfg: EngineConfig, currentStep: number): number | undefined {
  const raw = (cfg as unknown as { floors?: unknown }).floors;
  if (!Array.isArray(raw)) return undefined;
  const floor = raw[currentStep] as { columns?: unknown } | undefined;
  const columns = floor?.columns;
  return typeof columns === 'number' && Number.isFinite(columns) ? columns : undefined;
}

export const ENGINES: EngineDef[] = [
  {
    key: 'coin-flip',
    label: 'Coin Flip',
    category: 'Instant',
    mechanics: ['single'],
    blurb: 'engine.coin-flip.blurb',
    playerFacts: {
      inputs: 'engine.coin-flip.inputs',
      outcomes: 'engine.coin-flip.outcomes',
    },
    singleControls: [
      { kind: 'select', name: 'side', label: 'engine.coin-flip.ctl.side', default: 'heads', options: [
        { value: 'heads', label: 'engine.coin-flip.opt.side.heads' }, { value: 'tails', label: 'engine.coin-flip.opt.side.tails' } ] },
    ],
    buildSingleParams: (v) => ({ side: v.side ?? 'heads' }),
  },
  {
    key: 'dice',
    label: 'Dice',
    category: 'Instant',
    mechanics: ['single'],
    blurb: 'engine.dice.blurb',
    playerFacts: {
      inputs: 'engine.dice.inputs',
      outcomes: 'engine.dice.outcomes',
    },
    singleControls: [
      {
        kind: 'number', name: 'target', label: 'engine.dice.ctl.target', min: 0.01, max: 99.99, step: 0.01, default: 50,
        // rangeMin/rangeMax werden IMMER echot (Default 0/100) — der Server
        // clampt das Ziel aber mit Sicherheitsabstand von einem Rasterschritt
        // zu beiden Rändern (siehe resolveDiceFromRollInt), NICHT auf
        // rangeMin/rangeMax selbst. Identische Formel hier, sonst würde die
        // Default-Config (0/100) fälschlich 0–100 statt 0.01–99.99 anzeigen.
        boundsFrom: (c) => {
          const decimals = c.decimals ?? 2;
          const step = 1 / 10 ** decimals;
          return { min: (c.rangeMin ?? 0) + step, max: (c.rangeMax ?? 100) - step };
        },
      },
      { kind: 'select', name: 'direction', label: 'engine.dice.ctl.direction', default: 'over', options: [
        { value: 'over', label: 'engine.dice.opt.direction.over' }, { value: 'under', label: 'engine.dice.opt.direction.under' } ] },
    ],
    buildSingleParams: (v) => ({ target: num(v, 'target', 50), direction: v.direction ?? 'over' }),
  },
  {
    key: 'limbo',
    label: 'Limbo',
    category: 'Instant',
    mechanics: ['single'],
    blurb: 'engine.limbo.blurb',
    playerFacts: {
      inputs: 'engine.limbo.inputs',
      outcomes: 'engine.limbo.outcomes',
    },
    singleControls: [
      {
        kind: 'number', name: 'target', label: 'engine.limbo.ctl.target', min: 1.01, step: 0.01, default: 2,
        // Nur die Ceiling (maxTargetBps, optional) wird gespiegelt — die
        // Floor (minTargetBps) wird IMMER echot (Default 10000 = 1.00×) und
        // würde den statischen min:1.01-Fallback fälschlich auf 1.00
        // absenken; die 1.01-Schwelle ist eine reine UI-Vorsicht (kein
        // trivialer 1.00×-„Gewinn"), keine Server-Grenze.
        boundsFrom: (c) => (c.maxTargetBps ? { max: c.maxTargetBps / 10000 } : {}),
      },
    ],
    buildSingleParams: (v) => ({ targetMultiplierBps: Math.round(num(v, 'target', 2) * 10000) }),
  },
  {
    key: 'mines',
    label: 'Mines',
    category: 'Interactive',
    // NUR Session: die frühere Einzelwetten-Variante ließ den Spieler alle
    // Felder VORHER wählen (alles-oder-nichts, kein Cashout) — dasselbe Spiel
    // ohne die eine Entscheidung, die Mines ausmacht. Der Server bedient
    // `/bet` für bereits live stehende Spiele weiter (Legacy), neu gebaut
    // wird Mines ausschließlich als Session.
    mechanics: ['session'],
    blurb: 'engine.mines.blurb',
    playerFacts: {
      inputs: 'engine.mines.inputs',
      outcomes: 'engine.mines.outcomes',
    },
    session: {
      step: { kind: 'index', label: 'engine.mines.step', min: 0, max: 24,
        boundsFrom: (c) => ({ min: 0, max: (c.gridSize ?? 25) - 1 }) },
      buildStep: (i) => ({ tile: i.value ?? 0 }),
      hint: 'engine.mines.hint',
    },
  },
  {
    key: 'hilo',
    label: 'Hi-Lo',
    category: 'Interactive',
    // NUR Session: bei der früheren Einzelwette tippte der Spieler seine
    // eigene Startkarte ein und wählte damit seine eigene Gewinnchance —
    // das ist `dice` mit Karten-Optik, nicht Hi-Lo. In der Session teilt das
    // Spiel die Karte aus, und der Multiplikator wächst über die Kette.
    mechanics: ['session'],
    blurb: 'engine.hilo.blurb',
    playerFacts: {
      inputs: 'engine.hilo.inputs',
      outcomes: 'engine.hilo.outcomes',
    },
    session: {
      step: { kind: 'guess' },
      buildStep: (i) => ({ guess: i.guess ?? 'higher' }),
      hint: 'engine.hilo.hint',
    },
  },
  {
    key: 'plinko',
    label: 'Plinko',
    category: 'Interactive',
    mechanics: ['single'],
    blurb: 'engine.plinko.blurb',
    playerFacts: {
      inputs: 'engine.plinko.inputs',
      outcomes: 'engine.plinko.outcomes',
    },
    singleControls: [
      // Optionen bis maxBalls werden vom Client gefiltert (siehe
      // SingleBetGame); Default-Config (maxBalls 1) blendet die Auswahl
      // ganz aus — identisch zu heute (kein Multi-Shot-Control).
      { kind: 'select', name: 'balls', label: 'engine.plinko.ctl.balls', default: '1', options: [
        { value: '1', label: 'engine.plinko.opt.balls.1' }, { value: '3', label: 'engine.plinko.opt.balls.3' },
        { value: '10', label: 'engine.plinko.opt.balls.10' }, { value: '100', label: 'engine.plinko.opt.balls.100' } ] },
    ],
    buildSingleParams: (v) => ({ balls: Number(v.balls ?? 1) }),
  },
  {
    key: 'wheel',
    label: 'Wheel',
    category: 'Interactive',
    mechanics: ['single'],
    blurb: 'engine.wheel.blurb',
    playerFacts: {
      inputs: 'engine.wheel.inputs',
      outcomes: 'engine.wheel.outcomes',
    },
    singleControls: [],
    buildSingleParams: () => ({}),
  },
  {
    key: 'keno',
    label: 'Keno',
    category: 'Table',
    mechanics: ['single'],
    blurb: 'engine.keno.blurb',
    playerFacts: {
      inputs: 'engine.keno.inputs',
      outcomes: 'engine.keno.outcomes',
    },
    singleControls: [
      { kind: 'intlist', name: 'picks', label: 'engine.keno.ctl.picks', min: 1, max: 40, maxCount: 10,
        hint: 'engine.keno.ctl.picks.hint',
        boundsFrom: (c) => ({ min: 1, max: c.pool ?? 40 }) },
    ],
    buildSingleParams: (v) => ({ picks: intList(v, 'picks') }),
  },
  {
    key: 'scratch',
    label: 'Scratch',
    category: 'Instant',
    mechanics: ['single'],
    blurb: 'engine.scratch.blurb',
    playerFacts: {
      inputs: 'engine.scratch.inputs',
      outcomes: 'engine.scratch.outcomes',
    },
    // `fields`/`reveals` aus der Engine-Config sind REINE Präsentation für
    // dein eigenes Frontend (wie viele Rubbelfelder gezeichnet und wie viele
    // davon freigelegt werden). Der Server liest sie im Resolver nicht —
    // Chancen, Auszahlung und RTP hängen ausschließlich an der Gewinntabelle.
    singleControls: [],
    buildSingleParams: () => ({}),
  },
  {
    key: 'roulette',
    label: 'Roulette',
    category: 'Table',
    mechanics: ['single'],
    blurb: 'engine.roulette.blurb',
    playerFacts: {
      inputs: 'engine.roulette.inputs',
      outcomes: 'engine.roulette.outcomes',
    },
    singleControls: [
      { kind: 'select', name: 'betType', label: 'engine.roulette.ctl.betType', default: 'red', options: [
        { value: 'red', label: 'engine.roulette.opt.betType.red' }, { value: 'black', label: 'engine.roulette.opt.betType.black' },
        { value: 'odd', label: 'engine.roulette.opt.betType.odd' }, { value: 'even', label: 'engine.roulette.opt.betType.even' },
        { value: 'low', label: 'engine.roulette.opt.betType.low' }, { value: 'high', label: 'engine.roulette.opt.betType.high' },
        { value: 'dozen', label: 'engine.roulette.opt.betType.dozen' }, { value: 'column', label: 'engine.roulette.opt.betType.column' },
        { value: 'straight', label: 'engine.roulette.opt.betType.straight' } ] },
      {
        kind: 'number', name: 'value', label: 'engine.roulette.ctl.value', min: 0, max: 36, step: 1, default: 0,
        // straight geht auf dem amerikanischen Rad (pocketCount 38) bis 37
        // ('00'); pocketCount wird IMMER echot (Default 37 → max 36,
        // identisch zum statischen Fallback).
        boundsFrom: (c) => ({ max: (c.pocketCount ?? 37) - 1 }),
      },
    ],
    buildSingleParams: (v) => {
      const betType = v.betType ?? 'red';
      const needsValue = ['straight', 'dozen', 'column'].includes(betType);
      return needsValue ? { betType, value: num(v, 'value', 0) } : { betType };
    },
  },
  {
    key: 'slots-3x3',
    label: 'Slots 3×3',
    category: 'Slot',
    mechanics: ['single'],
    blurb: 'engine.slots-3x3.blurb',
    playerFacts: {
      inputs: 'engine.slots-3x3.inputs',
      outcomes: 'engine.slots-3x3.outcomes',
    },
    singleControls: [],
    buildSingleParams: () => ({}),
  },
  {
    key: 'slots-modular',
    label: 'Slots Modular',
    category: 'Slot',
    mechanics: ['single'],
    blurb: 'engine.slots-modular.blurb',
    playerFacts: {
      inputs: 'engine.slots-modular.inputs',
      outcomes: 'engine.slots-modular.outcomes',
    },
    singleControls: [],
    buildSingleParams: () => ({}),
  },
  {
    key: 'towers',
    label: 'Towers',
    category: 'Chain',
    mechanics: ['session'],
    blurb: 'engine.towers.blurb',
    playerFacts: {
      inputs: 'engine.towers.inputs',
      outcomes: 'engine.towers.outcomes',
    },
    session: {
      // Fallback max: 2 = Server-Default (3 Spalten, Indizes 0–2). Bevorzugt
      // wird die PRO-ETAGEN-Config (`floors[currentStep].columns`, Pro-Config
      // mit variierenden Spaltenzahlen je Etage); fehlt `floors` (alte,
      // uniforme Configs), fällt dies auf den Skalar `columns` zurück —
      // identisch zum bisherigen Verhalten.
      step: { kind: 'index', label: 'engine.towers.step', min: 0, max: 2,
        boundsFrom: (c, currentStep) => {
          const columns = towersFloorColumns(c, currentStep ?? 0) ?? c.columns ?? 3;
          return { min: 0, max: columns - 1 };
        } },
      buildStep: (i) => ({ column: i.value ?? 0 }),
      hint: 'engine.towers.hint',
    },
  },
  {
    key: 'dice-ladder',
    label: 'Dice Ladder',
    category: 'Chain',
    mechanics: ['session'],
    blurb: 'engine.dice-ladder.blurb',
    playerFacts: {
      inputs: 'engine.dice-ladder.inputs',
      outcomes: 'engine.dice-ladder.outcomes',
    },
    session: {
      // Identischer Step-Body wie hilo (`{ guess }`) — inklusive 'equal',
      // sobald das Spiel `allowEqual` gesetzt hat (SessionGame liest die 1 aus
      // dem Engine-Config-Echo und blendet den dritten Knopf entsprechend ein).
      step: { kind: 'guess' },
      buildStep: (i) => ({ guess: i.guess ?? 'higher' }),
      hint: 'engine.dice-ladder.hint',
    },
  },
  {
    key: 'steps',
    label: 'Steps',
    category: 'Chain',
    mechanics: ['session'],
    blurb: 'engine.steps.blurb',
    playerFacts: {
      inputs: 'engine.steps.inputs',
      outcomes: 'engine.steps.outcomes',
    },
    session: {
      // Leerer Step-Body wie pump — „Klettern" ist die einzige Aktion. Die
      // Leiter (`ladderBps`), Safe-Points (`checkpoints`), Leben (`lives`)
      // und die Fall-Regel (`dropMode`) kommen als aufgelöste Engine-Config
      // vom Server (publicEngineConfig-Echo); die Restleben stehen live in
      // `progress.livesLeft`, die aktuelle STUFE in `progress.currentStep` —
      // `steps` im SessionView zählt bei dieser Engine die VERSUCHE.
      step: { kind: 'action', label: 'engine.steps.step' },
      buildStep: () => ({}),
      hint: 'engine.steps.hint',
    },
  },
  {
    key: 'spin-tower-pro',
    label: 'Spin Tower Pro',
    category: 'Chain',
    // Mechanik bleibt `session` — der Unterschied zu allen anderen Sessions ist
    // NUR der Preis pro Schritt (`session.costPerStep`), nicht der Ablauf:
    // start → step* → cashout, identische Routen, identischer Reconnect.
    mechanics: ['session'],
    blurb: 'engine.spin-tower-pro.blurb',
    playerFacts: {
      inputs: 'engine.spin-tower-pro.inputs',
      outcomes: 'engine.spin-tower-pro.outcomes',
    },
    session: {
      // Leerer Step-Body wie pump/steps — „Spin" ist die einzige Aktion. Die
      // Türme (`towers`), der FAIL-Modus (`failMode`), der Joker
      // (`jokerEnabled`), der Spin-Deckel (`maxSpins`) und die gespielten
      // Wahrscheinlichkeiten (`probsBps`) kommen als aufgelöstes Server-Echo in
      // der Engine-Config; Stufen und Gesichertes stehen live im Fortschritt.
      step: { kind: 'action', label: 'engine.spin-tower-pro.step' },
      buildStep: () => ({}),
      costPerStep: true,
      hint: 'engine.spin-tower-pro.hint',
    },
  },
  {
    key: 'gauntlet',
    label: 'Gauntlet',
    category: 'Tournament',
    mechanics: ['tournament'],
    blurb: 'engine.gauntlet.blurb',
    playerFacts: {
      inputs: 'engine.gauntlet.inputs',
      outcomes: 'engine.gauntlet.outcomes',
    },
    tournament: {
      step: { kind: 'risk', tiers: ['safe', 'medium', 'risky'] },
      buildStep: (i) => ({ risk: i.risk }),
      hint: 'engine.gauntlet.hint',
    },
  },
  {
    key: 'pump',
    label: 'Pump',
    category: 'Curve',
    mechanics: ['session'],
    blurb: 'engine.pump.blurb',
    playerFacts: {
      inputs: 'engine.pump.inputs',
      outcomes: 'engine.pump.outcomes',
    },
    session: {
      step: { kind: 'action', label: 'engine.pump.step' },
      buildStep: () => ({}),
      hint: 'engine.pump.hint',
    },
  },
  {
    key: 'live-odds',
    label: 'Live Betting',
    category: 'Live',
    mechanics: ['live'],
    blurb: 'engine.live-odds.blurb',
    playerFacts: {
      inputs: 'engine.live-odds.inputs',
      outcomes: 'engine.live-odds.outcomes',
    },
    live: {
      hint: 'engine.live-odds.hint',
    },
  },
  {
    key: 'live-crash',
    label: 'Live Crash',
    category: 'Live',
    mechanics: ['live'],
    blurb: 'engine.live-crash.blurb',
    playerFacts: {
      inputs: 'engine.live-crash.inputs',
      outcomes: 'engine.live-crash.outcomes',
    },
    live: {
      hint: 'engine.live-crash.hint',
    },
  },
  {
    key: 'live-drift',
    label: 'Live Drift',
    category: 'Live',
    mechanics: ['live'],
    blurb: 'engine.live-drift.blurb',
    playerFacts: {
      inputs: 'engine.live-drift.inputs',
      outcomes: 'engine.live-drift.outcomes',
    },
    live: {
      hint: 'engine.live-drift.hint',
    },
  },
  {
    key: 'pvp-coinflip',
    label: 'PvP Coin Flip',
    category: 'PvP',
    mechanics: ['pvp'],
    blurb: 'engine.pvp-coinflip.blurb',
    playerFacts: {
      inputs: 'engine.pvp-coinflip.inputs',
      outcomes: 'engine.pvp-coinflip.outcomes',
    },
    pvp: {
      hint: 'engine.pvp-coinflip.hint',
    },
  },
  {
    key: 'pvp-dice-duel',
    label: 'Dice Risk',
    category: 'PvP',
    mechanics: ['pvp'],
    blurb: 'engine.pvp-dice-duel.blurb',
    playerFacts: {
      inputs: 'engine.pvp-dice-duel.inputs',
      outcomes: 'engine.pvp-dice-duel.outcomes',
    },
    pvp: {
      hint: 'engine.pvp-dice-duel.hint',
    },
  },
  {
    key: 'pvp-dice-pro',
    label: 'Dice Pro',
    category: 'PvP',
    mechanics: ['pvp'],
    blurb: 'engine.pvp-dice-pro.blurb',
    // Die aufgelöste Config kommt beim PvP nicht über ein Control mit
    // `boundsFrom`, sondern als Server-Echo (publicEngineConfig → template,
    // scoreMode, winCondition, diceCount, faces, targetScore, turnsPerSeat,
    // lastLicks, minBankPoints, engineVersion — und bei `points-system`
    // zusätzlich die gefrorene Creator-`paytable`). Das Board (DiceProGame)
    // liest diese Werte direkt aus dem `dicePro`-Block der Match-Sicht (die
    // Paytable aus dem `engineConfig.paytable`-Echo) und rendert je Template die
    // passende Steuerung/Wertung — daher hier wie bei allen PvP-Engines nur der
    // Hinweistext.
    playerFacts: {
      inputs: 'engine.pvp-dice-pro.inputs',
      outcomes: 'engine.pvp-dice-pro.outcomes',
    },
    pvp: {
      hint: 'engine.pvp-dice-pro.hint',
    },
  },
];

export function getEngine(key: string): EngineDef | undefined {
  return ENGINES.find((e) => e.key === key);
}

export function engineSupports(key: string, mechanic: Mechanic): boolean {
  const e = getEngine(key);
  return !!e && e.mechanics.includes(mechanic);
}
