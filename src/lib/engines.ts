// ⚠ Nicht ändern — Systemvertrag (die params-Strukturen sind bindend).
// Zentrale Definition ALLER Sol-Core-Engines: Mechanik, Eingabe-Controls,
// params-Bauer (für /bet bzw. Session-Steps) und Ergebnis-Text. Datengesteuert,
// damit eine generische UI jede Engine bedienen kann.

export type Mechanic = 'single' | 'session';

/** Eingabe-Control für die generische Param-UI. */
export type Control =
  | { kind: 'select'; name: string; label: string; options: { value: string; label: string }[]; default: string }
  | { kind: 'number'; name: string; label: string; min?: number; max?: number; step?: number; default: number }
  | { kind: 'intlist'; name: string; label: string; min: number; max: number; maxCount: number; hint?: string };

export interface EngineDef {
  key: string;
  label: string;
  category: string;
  /** Welche Mechaniken diese Engine unterstützt. */
  mechanics: Mechanic[];
  /** Kurzbeschreibung fürs UI. */
  blurb: string;
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
      | { kind: 'guess' } // higher/lower (hilo)
      | { kind: 'index'; label: string; min: number; max: number } // tile/column
      | { kind: 'action'; label: string }; // pump
    /** Baut den Step-Body. */
    buildStep: (input: { value?: number; guess?: 'higher' | 'lower' }) => Record<string, unknown>;
    hint: string;
  };
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

export const ENGINES: EngineDef[] = [
  {
    key: 'coin-flip',
    label: 'Coin Flip',
    category: 'Instant',
    mechanics: ['single'],
    blurb: 'Kopf oder Zahl — 50/50 mit House-Edge.',
    singleControls: [
      { kind: 'select', name: 'side', label: 'Seite', default: 'heads', options: [
        { value: 'heads', label: 'Kopf' }, { value: 'tails', label: 'Zahl' } ] },
    ],
    buildSingleParams: (v) => ({ side: v.side ?? 'heads' }),
  },
  {
    key: 'dice',
    label: 'Dice',
    category: 'Instant',
    mechanics: ['single'],
    blurb: 'Über/Unter einen Zielwert 0–99,99.',
    singleControls: [
      { kind: 'number', name: 'target', label: 'Zielwert (0.01–99.99)', min: 0.01, max: 99.99, step: 0.01, default: 50 },
      { kind: 'select', name: 'direction', label: 'Richtung', default: 'over', options: [
        { value: 'over', label: 'Über' }, { value: 'under', label: 'Unter' } ] },
    ],
    buildSingleParams: (v) => ({ target: num(v, 'target', 50), direction: v.direction ?? 'over' }),
  },
  {
    key: 'limbo',
    label: 'Limbo',
    category: 'Instant',
    mechanics: ['single'],
    blurb: 'Ziel-Multiplikator setzen — triffst du ihn, gewinnst du.',
    singleControls: [
      { kind: 'number', name: 'target', label: 'Ziel-Multiplikator (×)', min: 1.01, step: 0.01, default: 2 },
    ],
    buildSingleParams: (v) => ({ targetMultiplierBps: Math.round(num(v, 'target', 2) * 10000) }),
  },
  {
    key: 'crash',
    label: 'Crash',
    category: 'Interactive',
    mechanics: ['single'],
    blurb: 'Auto-Cashout wählen — bleibt die Kurve darüber, gewinnst du.',
    singleControls: [
      { kind: 'number', name: 'cashout', label: 'Auto-Cashout (×)', min: 1.01, step: 0.01, default: 2 },
    ],
    buildSingleParams: (v) => ({ cashoutBps: Math.round(num(v, 'cashout', 2) * 10000) }),
  },
  {
    key: 'mines',
    label: 'Mines',
    category: 'Interactive',
    mechanics: ['single', 'session'],
    blurb: 'Felder aufdecken ohne auf eine Mine zu treffen (5×5).',
    singleControls: [
      { kind: 'intlist', name: 'tiles', label: 'Felder (0–24, kommagetrennt)', min: 0, max: 24, maxCount: 25,
        hint: 'z. B. 0,1,2 — alle vorab gewählten Felder werden aufgedeckt.' },
    ],
    buildSingleParams: (v) => ({ tiles: intList(v, 'tiles') }),
    session: {
      step: { kind: 'index', label: 'Feld (0–24)', min: 0, max: 24 },
      buildStep: (i) => ({ tile: i.value ?? 0 }),
      hint: 'Pro Schritt EIN Feld aufdecken; jederzeit cashout.',
    },
  },
  {
    key: 'hilo',
    label: 'Hi-Lo',
    category: 'Interactive',
    mechanics: ['single', 'session'],
    blurb: 'Höher oder tiefer als die aktuelle Karte?',
    singleControls: [
      { kind: 'number', name: 'card', label: 'Aktuelle Karte (1–13)', min: 1, max: 13, step: 1, default: 7 },
      { kind: 'select', name: 'guess', label: 'Tipp', default: 'higher', options: [
        { value: 'higher', label: 'Höher' }, { value: 'lower', label: 'Tiefer' } ] },
    ],
    buildSingleParams: (v) => ({ card: num(v, 'card', 7), guess: v.guess ?? 'higher' }),
    session: {
      step: { kind: 'guess' },
      buildStep: (i) => ({ guess: i.guess ?? 'higher' }),
      hint: 'Höher/Tiefer tippen; Gleichstand verliert. Kette endet nach 20 Schritten.',
    },
  },
  {
    key: 'plinko',
    label: 'Plinko',
    category: 'Interactive',
    mechanics: ['single'],
    blurb: 'Kugel fällt durch Pins in einen Multiplikator-Slot.',
    singleControls: [],
    buildSingleParams: () => ({}),
  },
  {
    key: 'wheel',
    label: 'Wheel',
    category: 'Interactive',
    mechanics: ['single'],
    blurb: 'Glücksrad — ein Segment gewinnt.',
    singleControls: [],
    buildSingleParams: () => ({}),
  },
  {
    key: 'keno',
    label: 'Keno',
    category: 'Table',
    mechanics: ['single'],
    blurb: '1–10 Zahlen aus 1–40 tippen; Treffer zahlen aus.',
    singleControls: [
      { kind: 'intlist', name: 'picks', label: 'Zahlen (1–40, 1–10 Stück)', min: 1, max: 40, maxCount: 10,
        hint: 'z. B. 3,7,12,25' },
    ],
    buildSingleParams: (v) => ({ picks: intList(v, 'picks') }),
  },
  {
    key: 'scratch',
    label: 'Scratch',
    category: 'Instant',
    mechanics: ['single'],
    blurb: 'Rubbellos — ein Preis wird aufgedeckt.',
    singleControls: [],
    buildSingleParams: () => ({}),
  },
  {
    key: 'roulette',
    label: 'Roulette',
    category: 'Table',
    mechanics: ['single'],
    blurb: 'Klassische Roulette-Wetten.',
    singleControls: [
      { kind: 'select', name: 'betType', label: 'Wette', default: 'red', options: [
        { value: 'red', label: 'Rot' }, { value: 'black', label: 'Schwarz' },
        { value: 'odd', label: 'Ungerade' }, { value: 'even', label: 'Gerade' },
        { value: 'low', label: '1–18' }, { value: 'high', label: '19–36' },
        { value: 'dozen', label: 'Dutzend (value 0–2)' }, { value: 'column', label: 'Kolonne (value 0–2)' },
        { value: 'straight', label: 'Zahl (value 0–36)' } ] },
      { kind: 'number', name: 'value', label: 'value (nur straight/dozen/column)', min: 0, max: 36, step: 1, default: 0 },
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
    blurb: 'Drei-Walzen-Slot; Linien-Symbole zahlen aus.',
    singleControls: [],
    buildSingleParams: () => ({}),
  },
  {
    key: 'towers',
    label: 'Towers',
    category: 'Chain',
    mechanics: ['session'],
    blurb: 'Etage für Etage hoch — die sichere Spalte wählen.',
    session: {
      step: { kind: 'index', label: 'Spalte', min: 0, max: 3 },
      buildStep: (i) => ({ column: i.value ?? 0 }),
      hint: 'Pro Etage eine Spalte wählen; jederzeit cashout.',
    },
  },
  {
    key: 'pump',
    label: 'Pump',
    category: 'Curve',
    mechanics: ['session'],
    blurb: 'Immer weiter pumpen — bis es platzt.',
    session: {
      step: { kind: 'action', label: 'Pump' },
      buildStep: () => ({}),
      hint: 'Jeder Pump erhöht den Multiplikator; rechtzeitig cashen.',
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
