// ⚠ Nicht ändern — Systemvertrag (die params-Strukturen sind bindend).
// Zentrale Definition ALLER Sol-Core-Engines: Mechanik, Eingabe-Controls,
// params-Bauer (für /bet bzw. Session-Steps) und Ergebnis-Text. Datengesteuert,
// damit eine generische UI jede Engine bedienen kann.

export type Mechanic = 'single' | 'session' | 'tournament';

/**
 * Aufgelöste Engine-Dimensionen des konkreten Spiels (vom Server, via
 * /api/meta → engineConfig bzw. SessionView.engine.config). Z. B. towers:
 * { levels, columns } · mines: { gridSize, mineCount }.
 */
export type EngineConfig = Record<string, number>;

/** Eingabe-Control für die generische Param-UI. */
export type Control =
  | { kind: 'select'; name: string; label: string; options: { value: string; label: string }[]; default: string }
  | {
      kind: 'number'; name: string; label: string; min?: number; max?: number; step?: number; default: number;
      /** echte Grenzen aus der Server-Config; min/max sind nur Fallback (wie
       * intlist). Teilweise Ergebnisse (nur min ODER nur max) sind erlaubt —
       * das jeweils andere Ende bleibt beim statischen Fallback. */
      boundsFrom?: (cfg: EngineConfig) => { min?: number; max?: number };
    }
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
           * (Fallback = Engine-DEFAULTS des Servers, nie das Maximum!).
           * `currentStep` (0-basiert = bereits absolvierte Schritte) erlaubt
           * PRO-SCHRITT variierende Grenzen (towers-Etagen mit `floors`);
           * Engines ohne Bedarf (z. B. mines) ignorieren den zweiten
           * Parameter einfach. */
          boundsFrom?: (cfg: EngineConfig, currentStep?: number) => { min: number; max: number };
        }
      | { kind: 'action'; label: string }; // pump
    /** Baut den Step-Body. */
    buildStep: (input: { value?: number; guess?: 'higher' | 'lower' }) => Record<string, unknown>;
    hint: string;
  };
  // ── Turnier (Pot-basierte Highscore-Läufe) ──
  /** Turnier-Lauf: enter (fester Einsatz → Pot) → step* (Risikostufe) →
   * stop (Score banken). Ausschüttung an die Top-Plätze am Zyklusende. */
  tournament?: {
    step: { kind: 'risk'; tiers: readonly ['safe', 'medium', 'risky'] };
    buildStep: (input: { risk: 'safe' | 'medium' | 'risky' }) => Record<string, unknown>;
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
      {
        kind: 'number', name: 'target', label: 'Zielwert (0.01–99.99)', min: 0.01, max: 99.99, step: 0.01, default: 50,
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
      {
        kind: 'number', name: 'target', label: 'Ziel-Multiplikator (×)', min: 1.01, step: 0.01, default: 2,
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
      {
        kind: 'number', name: 'card', label: 'Aktuelle Karte (1–13)', min: 1, max: 13, step: 1, default: 7,
        boundsFrom: (c) => ({ min: 1, max: c.cards ?? 13 }),
      },
      { kind: 'select', name: 'guess', label: 'Tipp', default: 'higher', options: [
        { value: 'higher', label: 'Höher' }, { value: 'lower', label: 'Tiefer' } ] },
    ],
    buildSingleParams: (v) => ({ card: num(v, 'card', 7), guess: v.guess ?? 'higher' }),
    session: {
      step: { kind: 'guess' },
      buildStep: (i) => ({ guess: i.guess ?? 'higher' }),
      hint: 'Höher/Tiefer tippen; Gleichstand verliert. Die Kette endet nach der im Spiel gesetzten Schrittzahl.',
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
    singleControls: [
      // Optionen bis maxBalls werden vom Client gefiltert (siehe
      // SingleBetGame); Default-Config (maxBalls 1) blendet die Auswahl
      // ganz aus — identisch zu heute (kein Multi-Shot-Control).
      { kind: 'select', name: 'balls', label: 'Bälle', default: '1', options: [
        { value: '1', label: '1 Kugel' }, { value: '3', label: '3 Kugeln' },
        { value: '10', label: '10 Kugeln' }, { value: '100', label: '100 Kugeln' } ] },
    ],
    buildSingleParams: (v) => ({ balls: Number(v.balls ?? 1) }),
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
      { kind: 'intlist', name: 'picks', label: 'Zahlen tippen', min: 1, max: 40, maxCount: 10,
        hint: 'z. B. 3,7,12,25',
        boundsFrom: (c) => ({ min: 1, max: c.pool ?? 40 }) },
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
      {
        kind: 'number', name: 'value', label: 'value (nur straight/dozen/column)', min: 0, max: 36, step: 1, default: 0,
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
      // Fallback max: 2 = Server-Default (3 Spalten, Indizes 0–2). Bevorzugt
      // wird die PRO-ETAGEN-Config (`floors[currentStep].columns`, Pro-Config
      // mit variierenden Spaltenzahlen je Etage); fehlt `floors` (alte,
      // uniforme Configs), fällt dies auf den Skalar `columns` zurück —
      // identisch zum bisherigen Verhalten.
      step: { kind: 'index', label: 'Spalte', min: 0, max: 2,
        boundsFrom: (c, currentStep) => {
          const columns = towersFloorColumns(c, currentStep ?? 0) ?? c.columns ?? 3;
          return { min: 0, max: columns - 1 };
        } },
      buildStep: (i) => ({ column: i.value ?? 0 }),
      hint: 'Pro Etage eine Spalte wählen; jederzeit cashout.',
    },
  },
  {
    key: 'gauntlet',
    label: 'Gauntlet',
    category: 'Tournament',
    mechanics: ['tournament'],
    blurb: 'Highscore-Turnier: Risikostufe wählen, Punkte banken — Pot an die Top-Plätze.',
    playerFacts: {
      inputs:
        'Fester Einsatz pro Lauf. Pro Schritt eine Risikostufe wählen: Safe (90%, +10), Medium (60%, +15) oder Risky (30%, +30) — gleicher Erwartungswert, deine Strategie entscheidet.',
      outcomes:
        'Der Einsatz geht in den Zyklus-Pot. Punkte sammeln und rechtzeitig banken — ein Bust nullt den Lauf (neuer Versuch möglich, bester Score zählt). Am Zyklusende geht der Pot zu 100% an die Top-Plätze.',
    },
    tournament: {
      step: { kind: 'risk', tiers: ['safe', 'medium', 'risky'] },
      buildStep: (i) => ({ risk: i.risk }),
      hint: 'Pro Schritt eine Risikostufe; „Banken" sichert den Score — Bust nullt ihn.',
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
