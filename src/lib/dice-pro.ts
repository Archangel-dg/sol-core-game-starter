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

/** Feste Muster-Reihenfolge — Spiegel der EINZIGEN Server-Normalisierungs-
 * Quelle `DICE_PRO_PATTERN_IDS`/`buildDiceProPatternDefs`
 * (dice-pro-farkle-config.ts, Pattern-Vocabulary-Cut). */
export const DICE_PRO_PATTERN_IDS = ['fullHouse', 'nPairs', 'twoTriples'] as const;
export type DiceProPatternId = (typeof DICE_PRO_PATTERN_IDS)[number];

/** Server-Punktwert-Cap (Spiegel `PVP_DICE_PRO_POINT_VALUE_CAP`,
 * src/utils/constants.ts) — der Starter ist dependency-frei, daher lokal. */
const DICE_PRO_POINT_VALUE_CAP = 100_000;

/** Vom Server geechote Creator-Paytable (publicEngineConfig-Echo, gefrorener
 * Snapshot). Spiegelt `DiceProPaytable` aus `src/services/dice-pro.ts`:
 *   · singles  — Face (String-Key '1'..'faces') → Einzelpunktwert;
 *   · ofAKind  — „N gleiche Augen"; optionales `perFace` überschreibt `points`;
 *   · straight — NUR die volle Straße (gated auf diceCount === faces);
 *   · patterns — v2 (Pattern-Vocabulary-Cut): Whole-Roll-Kombinationsmuster
 *                fullHouse / nPairs / twoTriples, flach bewertet ({points}
 *                only), exact-cover auf dem GANZEN Wurf. Geometrie-Guards
 *                leben im `buildDiceProPatternDefs`-Port (unten) — exakt wie
 *                serverseitig.
 * `version`: 1 = klassisches Vokabular; 2 ⇔ mindestens ein Muster (abgeleitet,
 * wie der nachsichtige Server-Parser). */
export interface DiceProPaytable {
  version: 1 | 2;
  singles: Record<string, number>;
  ofAKind: { n: number; points: number; perFace?: Record<string, number> }[];
  straight?: { kind: 'full'; points: number };
  patterns?: Partial<Record<DiceProPatternId, { points: number }>>;
}

/** Ergebnis des defensiven Paytable-Parse:
 *   · `paytable` — brauchbare Tabelle oder null (Anzeige fällt klassisch zurück,
 *     sollte bei points-system nie passieren);
 *   · `outdated` — true ⇔ das Echo trägt eine paytable-`version`, die dieses
 *     Template NICHT kennt (>2 / nicht-numerisch). Die UI MUSS dann einen
 *     sichtbaren „Frontend veraltet"-Banner zeigen (Plan Global Constraint 11:
 *     KEIN stiller Klassik-Fallback) — `paytable` bleibt null. */
export interface DiceProPaytableParse {
  paytable: DiceProPaytable | null;
  outdated: boolean;
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
 * defensiv aus dem `engineConfig.paytable`-Echo (kommt als unbekanntes JSON) —
 * nachsichtiger Spiegel des Server-Parsers (`parseDiceProPaytable` in
 * src/services/dice-pro.ts): bekannte Felder werden bereinigt übernommen,
 * `patterns` nur mit bekannten ids + Integer-`points` > 0 (auf den Server-Cap
 * geclampt); die Geometrie-Filterung (fullHouse/nPairs/twoTriples je
 * diceCount/faces) lebt — exakt wie serverseitig — in
 * `buildDiceProPatternDefs` (Kernel + Anzeige-Zeilen). `version` wird
 * ABGELEITET (2 ⇔ ≥1 Muster überlebt, sonst 1).
 *
 * Versions-Disziplin (Plan Global Constraint 11): eine im Echo vorhandene,
 * UNBEKANNTE `version` (nicht 1|2 — z. B. 3 von einem neueren Server) liefert
 * `{ paytable: null, outdated: true }` — die UI zeigt dann den sichtbaren
 * „Frontend veraltet"-Banner statt still klassisch zu rechnen. Fehlende/
 * unbrauchbare Paytable ohne fremde Version bleibt wie bisher
 * `{ paytable: null, outdated: false }` (klassischer Anzeige-Fallback).
 */
export function parseDiceProPaytable(raw: unknown): DiceProPaytableParse {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { paytable: null, outdated: false };
  }
  const pt = raw as Record<string, unknown>;
  const rawVersion = pt.version;
  if (rawVersion !== undefined && rawVersion !== null) {
    const v = typeof rawVersion === 'number' ? rawVersion : Number(rawVersion);
    if (v !== 1 && v !== 2) return { paytable: null, outdated: true };
  }
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

  // patterns (v2, Pattern-Vocabulary-Cut): NUR bekannte ids, Eintrag = {points}
  // (Integer > 0, auf den Server-Cap geclampt) — Spiegel der nachsichtigen
  // Server-Semantik. Geometrie-Tauglichkeit prüft `buildDiceProPatternDefs`
  // (die Kernel-/Anzeige-Quelle) — geometrie-fremde Einträge sind dort inert.
  let patterns: Partial<Record<DiceProPatternId, { points: number }>> | undefined;
  const rawPatterns = pt.patterns;
  if (rawPatterns !== null && typeof rawPatterns === 'object' && !Array.isArray(rawPatterns)) {
    const rp = rawPatterns as Record<string, unknown>;
    const kept: Partial<Record<DiceProPatternId, { points: number }>> = {};
    let any = false;
    for (const id of DICE_PRO_PATTERN_IDS) {
      const entryRaw = rp[id];
      if (entryRaw === null || typeof entryRaw !== 'object' || Array.isArray(entryRaw)) continue;
      const p = asInt((entryRaw as Record<string, unknown>).points);
      const capped = Math.min(DICE_PRO_POINT_VALUE_CAP, p);
      if (capped > 0) {
        kept[id] = { points: capped };
        any = true;
      }
    }
    if (any) patterns = kept;
  }

  if (Object.keys(singles).length === 0 && ofAKind.length === 0 && !straight && !patterns) {
    return { paytable: null, outdated: false };
  }
  return {
    paytable: {
      version: patterns ? 2 : 1,
      singles,
      ofAKind,
      ...(straight ? { straight } : {}),
      ...(patterns ? { patterns } : {}),
    },
    outdated: false,
  };
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

/** Ein konfiguriertes Whole-Roll-Muster: flacher Punktwert + reines Zählvektor-
 * Prädikat (Spiegel `PatternDef` aus dice-pro-farkle-config.ts). */
export interface DiceProPatternDef {
  id: DiceProPatternId;
  points: number;
  predicate: (counts: number[]) => boolean;
}

/** fullHouse: belegte Zähler-Multimenge === {3,2} — GENAU zwei belegte
 * Augenzahlen, eine dreifach, eine doppelt (5-of-a-kind ist KEIN Full House). */
function isFullHouseCounts(counts: number[]): boolean {
  let threes = 0;
  let twos = 0;
  for (let f = 1; f < counts.length; f++) {
    const c = counts[f]!;
    if (c === 0) continue;
    if (c === 3) threes += 1;
    else if (c === 2) twos += 1;
    else return false;
  }
  return threes === 1 && twos === 1;
}

/** nPairs: JEDE belegte Augenzahl EXAKT doppelt UND genau `k` Paare (4+2 auf
 * 6 Würfeln ist KEIN Drei-Paare — farkle.ts-exakte Strenge). */
function isNPairsCounts(counts: number[], k: number): boolean {
  let pairs = 0;
  for (let f = 1; f < counts.length; f++) {
    const c = counts[f]!;
    if (c === 0) continue;
    if (c !== 2) return false;
    pairs += 1;
  }
  return pairs === k;
}

/** twoTriples: belegte Zähler-Multimenge === {3,3} — genau zwei belegte
 * Augenzahlen, beide dreifach (6-of-a-kind ist KEIN Zwei-Drillinge). */
function isTwoTriplesCounts(counts: number[]): boolean {
  let triples = 0;
  for (let f = 1; f < counts.length; f++) {
    const c = counts[f]!;
    if (c === 0) continue;
    if (c !== 3) return false;
    triples += 1;
  }
  return triples === 2;
}

/**
 * Faithful port der EINZIGEN Server-Muster-Quelle `buildDiceProPatternDefs`
 * (dice-pro-farkle-config.ts): feste `DICE_PRO_PATTERN_IDS`-Ordnung,
 * points-Filter (nur Integer > 0) und die per-id-Geometrie-Guards —
 *   · fullHouse   — diceCount === 5 (beliebige faces);
 *   · nPairs      — diceCount ∈ {4,6,8} UND faces >= diceCount/2; k =
 *                   diceCount/2 ist reine Geometrie, nie konfiguriert;
 *   · twoTriples  — diceCount === 6 (beliebige faces).
 * Konsumiert vom Anzeige-Kern (`makeDiceProKernel`) UND den Anzeige-Zeilen
 * (`paytableDisplayRows`) — geometrie-fremde Muster-Einträge sind damit überall
 * inert, exakt wie serverseitig.
 */
export function buildDiceProPatternDefs(
  faces: number,
  diceCount: number,
  paytable: DiceProPaytable,
): DiceProPatternDef[] {
  const out: DiceProPatternDef[] = [];
  const patterns = paytable.patterns;
  if (!patterns) return out;
  for (const id of DICE_PRO_PATTERN_IDS) {
    const entry = patterns[id];
    if (!entry) continue;
    const points = entry.points;
    if (!Number.isInteger(points) || points <= 0) continue;
    if (id === 'fullHouse') {
      if (diceCount !== 5) continue;
      out.push({ id, points, predicate: isFullHouseCounts });
    } else if (id === 'nPairs') {
      if (diceCount % 2 !== 0 || diceCount < 4 || diceCount > 8 || faces < diceCount / 2) continue;
      const k = diceCount / 2;
      out.push({ id, points, predicate: (counts) => isNPairsCounts(counts, k) });
    } else {
      if (diceCount !== 6) continue;
      out.push({ id, points, predicate: isTwoTriplesCounts });
    }
  }
  return out;
}

/**
 * Baut den Anzeige-Wertungs-Kern für eine (faces, diceCount, paytable)-Kombination.
 * Faithful port der `scoreSelection` aus `dice-pro-farkle-config.ts` — die „beste
 * Zerlegung" pro Augenzahl via kleiner DP (n-of-a-kind vs. lauter Einzel; die
 * punktmaximale gewinnt), plus die volle Straße (nur bei diceCount === faces)
 * und die Whole-Roll-Muster (nur auf der VOLLEN Auswahl, Max-Vergleich).
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

  // Whole-Roll-Muster (Pattern-Vocabulary-Cut): EINMAL gebaut — Normalisierung/
  // points-Filter/Geometrie-Guards leben ausschließlich im Builder-Port (dieselbe
  // Semantik wie serverseitig). Leer für musterlose Paytables ⇒ alle
  // Muster-Zweige unten unerreichbar ⇒ Verhalten identisch zu vor dem Cut.
  const patternDefs = buildDiceProPatternDefs(faces, diceCount, paytable);

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

    // Muster-Kandidaten (Pattern-Vocabulary-Cut): NUR auf der VOLLEN Auswahl
    // (dice.length === diceCount) — whole-roll-only. Muster betreten die
    // facePointsDp-Zerlegung NIE; sie sind eine eigene Kandidaten-Klasse im
    // Max-Vergleich (KEIN Early-Return). Der Builder garantiert points > 0,
    // daher ist 0 der sichere "kein Muster passt"-Sentinel.
    let patternPoints = 0;
    if (usesAllDice) {
      for (const p of patternDefs) {
        if (p.points > patternPoints && p.predicate(counts)) patternPoints = p.points;
      }
    }

    if (!perFaceValid && !straightValid && patternPoints === 0) {
      return { valid: false, points: 0, usesAllDice: false };
    }
    // Beste gültige Zerlegung gewinnt (Straße vs. Per-Augenzahl vs. Muster) —
    // eine NUR per Muster gültige Auswahl (z. B. drei wertlose Paare) ist mit
    // dessen Punkten gültig; schlagen die Einzel das Muster, bleibt der
    // Einzel-Score (exakt der Server-Max-Vergleich).
    let points = 0;
    if (perFaceValid) points = perFacePoints;
    if (straightValid && straightPoints > points) points = straightPoints;
    if (patternPoints > points) points = patternPoints;
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
 * n-of-a-kind nach `n` inkl. perFace-Overrides, volle Straße, Whole-Roll-
 * Muster). Reine Präsentation — der Wertungs-Kern oben bleibt die Rechenquelle.
 * Muster-Zeilen kommen aus dem `buildDiceProPatternDefs`-Port (nur geometrie-
 * taugliche, exakt wie der Kern wertet); das nPairs-Label trägt k = diceCount/2
 * als `count`-Param. Sind Muster konfiguriert, folgt EINE Hinweis-Zeile
 * (`dp.pt.wholeRoll`, leerer Wert): Muster werten den GANZEN Wurf (Hot Dice).
 */
export function paytableDisplayRows(
  paytable: DiceProPaytable,
  faces: number,
  diceCount: number,
): PaytableRow[] {
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
  const patternDefs = buildDiceProPatternDefs(faces, diceCount, paytable);
  for (const def of patternDefs) {
    if (def.id === 'fullHouse') {
      rows.push({ key: 'dp.pt.fullHouse', value: String(def.points) });
    } else if (def.id === 'nPairs') {
      rows.push({ key: 'dp.pt.nPairs', params: { count: diceCount / 2 }, value: String(def.points) });
    } else {
      rows.push({ key: 'dp.pt.twoTriples', value: String(def.points) });
    }
  }
  if (patternDefs.length > 0) {
    rows.push({ key: 'dp.pt.wholeRoll', value: '' });
  }
  return rows;
}
