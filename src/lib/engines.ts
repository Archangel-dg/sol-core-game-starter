// ⚠ Nicht ändern — Systemvertrag (die params-Strukturen sind bindend).
// Zentrale Definition ALLER Sol-Core-Engines: Mechanik, Eingabe-Controls,
// params-Bauer (für /bet bzw. Session-Steps) und Ergebnis-Text. Datengesteuert,
// damit eine generische UI jede Engine bedienen kann.

export type Mechanic = 'single' | 'session';

/**
 * Aufgelöste Engine-Dimensionen des konkreten Spiels (vom Server, via
 * /api/meta → engineConfig bzw. SessionView.engine.config). Z. B. towers:
 * { levels, columns } · mines: { gridSize, mineCount }.
 */
export type EngineConfig = Record<string, number>;

/** Eingabe-Control für die generische Param-UI. */
export type Control =
  | { kind: 'select'; name: string; label: string; options: { value: string; label: string }[]; default: string }
  | { kind: 'number'; name: string; label: string; min?: number; max?: number; step?: number; default: number }
  | {
      kind: 'intlist'; name: string; label: string; min: number; max: number; maxCount: number; hint?: string;
      /** echte Grenzen aus der Server-Config; min/max sind nur Fallback. */
      boundsFrom?: (cfg: EngineConfig) => { min: number; max: number };
    };

export interface EngineDef {
  key: string;
  label: string;
  category: string;
  /** Welche Mechaniken diese Engine unterstützt. */
  mechanics: Mechanic[];
  /** Kurzbeschreibung fürs UI. */
  blurb: string;
  /** Income/Outcome in einfachen Worten (Quelle: DevKit spec/engines.json):
   * was der Spieler wählt und was mit dem Einsatz passieren kann. */
  playerFacts: { inputs: string; outcomes: string };
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
      | {
          kind: 'index'; label: string; min: number; max: number; // tile/column
          /** echte Grenzen aus der Server-Config; min/max sind nur Fallback
           * (Fallback = Engine-DEFAULTS des Servers, nie das Maximum!). */
          boundsFrom?: (cfg: EngineConfig) => { min: number; max: number };
        }
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
    playerFacts: {
      inputs: 'Kopf oder Zahl wählen, Einsatz setzen — ein Klick.',
      outcomes: 'Richtige Seite: Einsatz mal ~1,96x (vom Spiel festgelegt). Falsche Seite: Einsatz weg.',
    },
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
    playerFacts: {
      inputs: 'Zielzahl wählen (0–99,99) und auf darüber oder darunter wetten.',
      outcomes: 'Treffer: je riskanter die Wahl, desto höher der Multiplikator (kleine Chance = großer Gewinn). Daneben: Einsatz weg.',
    },
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
    playerFacts: {
      inputs: 'Ziel-Multiplikator setzen (z. B. 5x) — mehr nicht.',
      outcomes: 'Die Runde zieht eine Zahl: erreicht sie dein Ziel, gewinnst du genau dein Ziel — darunter ist der Einsatz weg.',
    },
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
    playerFacts: {
      inputs: 'Auto-Cashout (z. B. 2x) zusammen mit dem Einsatz festlegen.',
      outcomes: 'Die Kurve steigt und crasht an einem zufälligen Punkt: über deinem Cashout gewinnst du ihn — crasht sie vorher, ist der Einsatz weg.',
    },
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
    blurb: 'Felder aufdecken ohne auf eine Mine zu treffen.',
    playerFacts: {
      inputs: 'Felder auf dem Raster aufdecken (Größe legt das Spiel fest, Standard 5×5) — eins pro Schritt oder vorab als Einzel-Bet.',
      outcomes: 'Jedes sichere Feld erhöht den Multiplikator; jederzeit Cashout. Mine getroffen = Einsatz weg.',
    },
    singleControls: [
      { kind: 'intlist', name: 'tiles', label: 'Felder (kommagetrennt)', min: 0, max: 24, maxCount: 64,
        hint: 'z. B. 0,1,2 — alle vorab gewählten Felder werden aufgedeckt.',
        boundsFrom: (c) => ({ min: 0, max: (c.gridSize ?? 25) - 1 }) },
    ],
    buildSingleParams: (v) => ({ tiles: intList(v, 'tiles') }),
    session: {
      step: { kind: 'index', label: 'Feld', min: 0, max: 24,
        boundsFrom: (c) => ({ min: 0, max: (c.gridSize ?? 25) - 1 }) },
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
    playerFacts: {
      inputs: 'Tippen, ob die nächste Karte (1–13) höher oder tiefer ist als die aktuelle.',
      outcomes: 'Richtig: der Multiplikator wächst (unwahrscheinliche Tipps stärker); jederzeit Cashout. Falsch oder Gleichstand: Einsatz weg. Kette endet nach 20 Schritten.',
    },
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
    playerFacts: {
      inputs: 'Kugel fallen lassen — Reihen und Risikoprofil legt das Spiel fest.',
      outcomes: 'Die Kugel landet in einem Multiplikator-Fach: außen zahlt groß, die Mitte klein — teils weniger als der Einsatz.',
    },
    singleControls: [],
    buildSingleParams: () => ({}),
  },
  {
    key: 'wheel',
    label: 'Wheel',
    category: 'Interactive',
    mechanics: ['single'],
    blurb: 'Glücksrad — ein Segment gewinnt.',
    playerFacts: {
      inputs: 'Rad drehen — Segmente und Chancen legt das Spiel fest.',
      outcomes: 'Ein Segment gewinnt: jedes hat seinen eigenen Multiplikator, von 0x bis zum Top-Segment des Spiels.',
    },
    singleControls: [],
    buildSingleParams: () => ({}),
  },
  {
    key: 'keno',
    label: 'Keno',
    category: 'Table',
    mechanics: ['single'],
    blurb: '1–10 Zahlen aus 1–40 tippen; Treffer zahlen aus.',
    playerFacts: {
      inputs: '1–10 Zahlen aus 40 tippen.',
      outcomes: '10 Zahlen werden gezogen: je mehr Treffer, desto höher die Auszahlung — wenige Treffer zahlen nichts.',
    },
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
    playerFacts: {
      inputs: 'Los kaufen — keine weitere Auswahl nötig.',
      outcomes: 'Ein Preis aus der Preistabelle des Spiels wird aufgedeckt — von Niete (Einsatz weg) bis Jackpot.',
    },
    singleControls: [],
    buildSingleParams: () => ({}),
  },
  {
    key: 'roulette',
    label: 'Roulette',
    category: 'Table',
    mechanics: ['single'],
    blurb: 'Klassische Roulette-Wetten.',
    playerFacts: {
      inputs: 'Klassische Wette setzen: Rot/Schwarz, Gerade/Ungerade, 1–18/19–36, Dutzend, Kolonne oder eine Zahl (0–36).',
      outcomes: 'Feste klassische Quoten: einfache Chancen zahlen 2x, Dutzend/Kolonne 3x, einzelne Zahl 36x. Daneben: Einsatz weg.',
    },
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
    playerFacts: {
      inputs: 'Walzen drehen — ein Einsatz, keine weitere Auswahl.',
      outcomes: 'Die Mittellinie entscheidet: drei gleiche Symbole zahlen den Dreifach-Wert, zwei gleiche den Paar-Wert, sonst ist der Einsatz weg.',
    },
    singleControls: [],
    buildSingleParams: () => ({}),
  },
  {
    key: 'towers',
    label: 'Towers',
    category: 'Chain',
    mechanics: ['session'],
    blurb: 'Etage für Etage hoch — die sichere Spalte wählen.',
    playerFacts: {
      inputs: 'Pro Etage eine Spalte wählen (2–4 Spalten, legt das Spiel fest — meist 3). Eine Spalte pro Etage versteckt eine Bombe.',
      outcomes: 'Jede sichere Etage erhöht den Multiplikator; jederzeit Cashout. Bombe getroffen = Einsatz weg. Oberste Etage = Maximum.',
    },
    session: {
      // Fallback max: 2 = Server-Default (3 Spalten, Indizes 0–2). Die echte
      // Spaltenzahl (2–4) kommt aus der Server-Config via boundsFrom.
      step: { kind: 'index', label: 'Spalte', min: 0, max: 2,
        boundsFrom: (c) => ({ min: 0, max: (c.columns ?? 3) - 1 }) },
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
    playerFacts: {
      inputs: 'Ballon aufpumpen — ein Knopf, immer wieder.',
      outcomes: 'Jeder Pump erhöht den Multiplikator; jederzeit Cashout. Der Ballon platzt an einem verdeckten Punkt — dann ist der Einsatz weg.',
    },
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
