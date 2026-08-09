'use client';

/**
 * Reine, IO-freie Client-Helfer für das pvp-dice-pro-Template `points-system`
 * ("Dice Risk", Stage 2). Spiegelt FORM und Semantik des geldkritischen Backend-
 * Kerns `src/services/dice-pro-farkle-config.ts` (`makeDiceProKernel`) — dient
 * aber NUR der Live-Anzeige (Auswahl-Punkte, Bank-fähig, Hot-Dice-Hinweis) gegen
 * die vom Server geechote Creator-Paytable (`engineConfig.paytable`). Der Server
 * bleibt die einzige Autorität: jeder Zug wird server-seitig neu bewertet.
 *
 * Anders als `dice-duel.ts` (fest verdrahtete klassische 6d6-Farkle-Tabelle) ist
 * dieser Kern über (`faces`, `diceCount`, `DiceProPaytable`) parametrisiert — die
 * eingefrorene `push-your-luck`-Variante nutzt weiter `dice-duel.ts`.
 *
 * `keep` ist eine Liste von WÜRFEL-AUGEN (1..faces) — Werte, nicht Indizes (so
 * validiert der Server: Teil-Multimenge der Tischwürfel). Die Index-Auswahl im
 * Tray wird über `keepValuesOf` (dice-duel.ts) auf die Augen abgebildet.
 */

/** Vom Server geechote Creator-Paytable (publicEngineConfig-Echo, gefrorener
 * Snapshot). Spiegelt `DiceProPaytable` aus `src/services/dice-pro.ts`:
 *   · singles  — Face (String-Key '1'..'faces') → Einzelpunktwert;
 *   · ofAKind  — „N gleiche Augen"; optionales `perFace` überschreibt `points`;
 *   · straight — v1 NUR die volle Straße (gated auf diceCount === faces). */
export interface DiceProPaytable {
  version: 1;
  singles: Record<string, number>;
  ofAKind: { n: number; points: number; perFace?: Record<string, number> }[];
  straight?: { kind: 'full'; points: number };
}

/** Identische Form wie der eingefrorene Kern (`SelectionScore` in dice-duel.ts). */
export interface SelectionScore {
  /** true ⇒ JEDER gewählte Würfel gehört zu einem wertenden Muster. */
  valid: boolean;
  /** Punkte der Auswahl (0 bei ungültig/leer). */
  points: number;
  /** true ⇒ die Auswahl verbraucht alle `diceCount` Würfel (Hot-Dice-Trigger). */
  usesAllDice: boolean;
}

/**
 * Liest die vom Server geechote (bereits geparste/gefrorene) Creator-Paytable
 * defensiv aus dem `engineConfig.paytable`-Echo (kommt als unbekanntes JSON).
 * Gibt `null`, wenn kein brauchbares Objekt vorliegt — die Anzeige fällt dann auf
 * die klassische Tabelle zurück (sollte bei points-system nie passieren).
 */
export function parseDiceProPaytable(raw: unknown): DiceProPaytable | null {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const pt = raw as Record<string, unknown>;
  const asInt = (v: unknown): number => {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? Math.round(n) : 0;
  };

  const singles: Record<string, number> = {};
  const rawSingles = pt.singles;
  if (rawSingles !== null && typeof rawSingles === 'object' && !Array.isArray(rawSingles)) {
    for (const [k, v] of Object.entries(rawSingles as Record<string, unknown>)) {
      const val = asInt(v);
      if (val > 0) singles[k] = val;
    }
  }

  const ofAKind: { n: number; points: number; perFace?: Record<string, number> }[] = [];
  const rawOfAKind = pt.ofAKind;
  if (Array.isArray(rawOfAKind)) {
    for (const e of rawOfAKind) {
      if (e === null || typeof e !== 'object' || Array.isArray(e)) continue;
      const entry = e as Record<string, unknown>;
      const n = asInt(entry.n);
      const points = asInt(entry.points);
      if (n < 1) continue;
      let perFace: Record<string, number> | undefined;
      const rawPerFace = entry.perFace;
      if (rawPerFace !== null && typeof rawPerFace === 'object' && !Array.isArray(rawPerFace)) {
        const pf: Record<string, number> = {};
        for (const [k, v] of Object.entries(rawPerFace as Record<string, unknown>)) {
          const val = asInt(v);
          if (val > 0) pf[k] = val;
        }
        if (Object.keys(pf).length > 0) perFace = pf;
      }
      if (points > 0 || perFace) ofAKind.push({ n, points, ...(perFace ? { perFace } : {}) });
    }
    ofAKind.sort((a, b) => a.n - b.n);
  }

  let straight: { kind: 'full'; points: number } | undefined;
  const rawStraight = pt.straight;
  if (rawStraight !== null && typeof rawStraight === 'object' && !Array.isArray(rawStraight)) {
    const s = rawStraight as Record<string, unknown>;
    const p = asInt(s.points);
    if (p > 0) straight = { kind: 'full', points: p };
  }

  if (Object.keys(singles).length === 0 && ofAKind.length === 0 && !straight) return null;
  return { version: 1, singles, ofAKind, ...(straight ? { straight } : {}) };
}

/** Ein wertendes „Bauteil" einer Augenzahl: `size` Würfel wert `value` Punkte. */
interface FaceUnit {
  size: number;
  value: number;
}

/** Effektiver Punktwert eines ofAKind-Eintrags für Augenzahl `f`
 * (perFace-Override schlägt den Default `points`). */
function effectiveOfAKindValue(
  entry: { n: number; points: number; perFace?: Record<string, number> },
  face: number,
): number {
  const override = entry.perFace?.[String(face)];
  return override !== undefined ? override : entry.points;
}

/**
 * Baut den Anzeige-Wertungs-Kern für eine (faces, diceCount, paytable)-Kombination.
 * Faithful port der `scoreSelection` aus `dice-pro-farkle-config.ts` — die „beste
 * Zerlegung" pro Augenzahl via kleiner DP (n-of-a-kind vs. lauter Einzel; die
 * punktmaximale gewinnt), plus die volle Straße (nur bei diceCount === faces).
 * NUR zur Anzeige; der Server wertet jeden Zug neu.
 */
export function makeDiceProKernel(
  faces: number,
  diceCount: number,
  paytable: DiceProPaytable,
): { scoreSelection: (dice: number[]) => SelectionScore } {
  // Vorab: pro Augenzahl 1..faces die wertenden Bauteile (Einzel + n-of-a-kind).
  const unitsByFace: FaceUnit[][] = [[]];
  for (let f = 1; f <= faces; f++) {
    const units: FaceUnit[] = [];
    const single = paytable.singles[String(f)] ?? 0;
    if (single > 0) units.push({ size: 1, value: single });
    for (const entry of paytable.ofAKind) {
      if (!Number.isInteger(entry.n) || entry.n < 1) continue;
      const value = effectiveOfAKindValue(entry, f);
      if (value > 0) units.push({ size: entry.n, value });
    }
    unitsByFace[f] = units;
  }

  const straightPoints =
    paytable.straight && paytable.straight.points > 0 ? paytable.straight.points : 0;
  const straightEligible = straightPoints > 0 && diceCount === faces;

  function faceCounts(dice: number[]): number[] {
    const counts = new Array<number>(faces + 1).fill(0);
    for (const d of dice) counts[d] = (counts[d] ?? 0) + 1;
    return counts;
  }

  function allValidFaces(dice: number[]): boolean {
    return dice.every((d) => Number.isInteger(d) && d >= 1 && d <= faces);
  }

  function facePointsDp(face: number, c: number): number[] {
    const dp = new Array<number>(c + 1).fill(Number.NEGATIVE_INFINITY);
    dp[0] = 0;
    const units = unitsByFace[face]!;
    for (let k = 1; k <= c; k++) {
      let best = Number.NEGATIVE_INFINITY;
      for (const u of units) {
        if (u.size > k) continue;
        const prev = dp[k - u.size]!;
        if (prev === Number.NEGATIVE_INFINITY) continue;
        const cand = prev + u.value;
        if (cand > best) best = cand;
      }
      dp[k] = best;
    }
    return dp;
  }

  function isFullStraightCounts(counts: number[]): boolean {
    for (let f = 1; f <= faces; f++) if (counts[f] !== 1) return false;
    return true;
  }

  function scoreSelection(dice: number[]): SelectionScore {
    if (dice.length === 0 || !allValidFaces(dice)) {
      return { valid: false, points: 0, usesAllDice: false };
    }
    const counts = faceCounts(dice);
    const usesAllDice = dice.length === diceCount;

    const straightValid =
      straightEligible && dice.length === faces && isFullStraightCounts(counts);

    let perFaceValid = true;
    let perFacePoints = 0;
    for (let f = 1; f <= faces && perFaceValid; f++) {
      const c = counts[f]!;
      if (c === 0) continue;
      const dp = facePointsDp(f, c);
      const pts = dp[c]!;
      if (pts === Number.NEGATIVE_INFINITY) {
        perFaceValid = false;
      } else {
        perFacePoints += pts;
      }
    }

    if (!perFaceValid && !straightValid) {
      return { valid: false, points: 0, usesAllDice: false };
    }
    let points = 0;
    if (perFaceValid) points = perFacePoints;
    if (straightValid && straightPoints > points) points = straightPoints;
    return { valid: true, points, usesAllDice };
  }

  return { scoreSelection };
}

/** Eine Anzeige-Zeile der Wertungstabelle (i18n-Label + Punktwert als String).
 * `key`/`params` laufen im Board durch `t()`; `value` ist der reine Zahlenwert. */
export interface PaytableRow {
  key: string;
  params?: Record<string, string | number>;
  value: string;
}

/**
 * Baut die anzeigbaren Zeilen der Creator-Paytable (singles nach Augenzahl,
 * n-of-a-kind nach `n` inkl. perFace-Overrides, volle Straße). Reine
 * Präsentation — der Wertungs-Kern oben bleibt die Rechenquelle.
 */
export function paytableDisplayRows(paytable: DiceProPaytable, faces: number): PaytableRow[] {
  const rows: PaytableRow[] = [];
  for (let f = 1; f <= faces; f++) {
    const v = paytable.singles[String(f)] ?? 0;
    if (v > 0) rows.push({ key: 'dp.pt.single', params: { face: f }, value: String(v) });
  }
  for (const entry of paytable.ofAKind) {
    if (entry.points > 0) {
      rows.push({ key: 'dp.pt.ofAKind', params: { n: entry.n }, value: String(entry.points) });
    }
    if (entry.perFace) {
      for (const [k, val] of Object.entries(entry.perFace)) {
        if (val > 0) {
          rows.push({ key: 'dp.pt.ofAKindFace', params: { n: entry.n, face: k }, value: String(val) });
        }
      }
    }
  }
  if (paytable.straight && paytable.straight.points > 0) {
    rows.push({ key: 'dp.pt.straight', value: String(paytable.straight.points) });
  }
  return rows;
}
