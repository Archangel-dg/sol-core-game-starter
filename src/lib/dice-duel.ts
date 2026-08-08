'use client';

/**
 * Reine, IO-freie Client-Helfer für den PvP-Modus `pvp-dice-duel` ("Dice Risk",
 * Farkle). Spiegelt die operator-fixierte Paytable von `src/services/farkle.ts`
 * (Backend) EXAKT — dient aber NUR der Live-Anzeige (Auswahl-Punkte, Bank-fähig,
 * Farkle-Hinweis). Der Server bleibt die einzige Autorität: jeder Zug wird
 * server-seitig neu bewertet (scoreSelection + isSubMultiset + minBankPoints).
 *
 * `keep` ist eine Liste von WÜRFEL-AUGEN (1..6) — Werte, nicht Indizes (so
 * validiert der Server: pvpMoveSchema `keep: number[] (1..6)`, geprüft als
 * Teil-Multimenge der Tischwürfel). Klick-Auswahl im Tray läuft daher über
 * Indizes und wird beim Absenden auf die Augen abgebildet.
 */

export interface SelectionScore {
  /** true ⇒ JEDER gewählte Würfel gehört zu einer wertenden Kombi. */
  valid: boolean;
  /** Punkte der Auswahl (0 bei ungültig/leer). */
  points: number;
  /** true ⇒ die Auswahl verbraucht alle 6 Würfel (Hot Dice → alles neu werfen). */
  usesAllDice: boolean;
}

function allValidFaces(dice: number[]): boolean {
  return dice.every((d) => Number.isInteger(d) && d >= 1 && d <= 6);
}

function faceCounts(dice: number[]): number[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const d of dice) counts[d]! += 1;
  return counts;
}

function nOfAKindPoints(face: number, count: number): number {
  switch (count) {
    case 3:
      return face === 1 ? 1000 : face * 100;
    case 4:
      return face === 1 ? 2000 : 1000;
    case 5:
      return face === 1 ? 5000 : face * 1000;
    case 6:
    default:
      return 10000;
  }
}

function isStraight(counts: number[]): boolean {
  for (let f = 1; f <= 6; f++) if (counts[f] !== 1) return false;
  return true;
}

function isThreePairs(counts: number[]): boolean {
  let pairs = 0;
  for (let f = 1; f <= 6; f++) {
    const c = counts[f]!;
    if (c === 0) continue;
    if (c === 2) pairs += 1;
    else return false;
  }
  return pairs === 3;
}

/** Bewertet eine ausgewählte Würfel-Teilmenge (mirror farkle.ts scoreSelection). */
export function scoreSelection(dice: number[]): SelectionScore {
  if (dice.length === 0 || !allValidFaces(dice)) {
    return { valid: false, points: 0, usesAllDice: false };
  }
  const counts = faceCounts(dice);
  const usesAllDice = dice.length === 6;

  if (dice.length === 6) {
    if (isStraight(counts)) return { valid: true, points: 1000, usesAllDice: true };
    if (isThreePairs(counts)) return { valid: true, points: 500, usesAllDice: true };
  }

  let points = 0;
  for (let f = 1; f <= 6; f++) {
    const c = counts[f]!;
    if (c === 0) continue;
    if (c >= 3) points += nOfAKindPoints(f, c);
    else if (f === 1) points += 100 * c;
    else if (f === 5) points += 50 * c;
    else return { valid: false, points: 0, usesAllDice: false };
  }
  return { valid: true, points, usesAllDice };
}

/** Gibt es in diesem Wurf IRGENDEINE wertende Möglichkeit? Falsch ⇒ Farkle. */
export function hasAnyScore(dice: number[]): boolean {
  if (dice.length === 0 || !allValidFaces(dice)) return false;
  const counts = faceCounts(dice);
  if (counts[1]! > 0 || counts[5]! > 0) return true;
  for (let f = 1; f <= 6; f++) if (counts[f]! >= 3) return true;
  if (dice.length === 6 && (isStraight(counts) || isThreePairs(counts))) return true;
  return false;
}

/** Bildet eine Index-Auswahl im Tray auf die zu sendenden AUGEN ab. */
export function keepValuesOf(tableDice: number[], selectedIdx: number[]): number[] {
  return selectedIdx
    .filter((i) => i >= 0 && i < tableDice.length)
    .map((i) => tableDice[i]!);
}

/** Anzeige-Paytable: i18n-Key + fixer Zahlen-/Formel-Wert (Werte sind keine
 * Übersetzung, nur die Zeilen-Labels laufen durch `t`). */
export const DICE_DUEL_PAYTABLE: { key: string; value: string }[] = [
  { key: 'dd.pt.single1', value: '100' },
  { key: 'dd.pt.single5', value: '50' },
  { key: 'dd.pt.trips1', value: '1000' },
  { key: 'dd.pt.trips', value: 'X × 100' },
  { key: 'dd.pt.quad1', value: '2000' },
  { key: 'dd.pt.quad', value: '1000' },
  { key: 'dd.pt.quint1', value: '5000' },
  { key: 'dd.pt.quint', value: 'X × 1000' },
  { key: 'dd.pt.sext', value: '10000' },
  { key: 'dd.pt.straight', value: '1000' },
  { key: 'dd.pt.threePairs', value: '500' },
];

/** Unicode-Würfelfläche (1..6) — reine Optik (Design-Zone frei anpassbar). */
export const DIE_PIPS: Record<number, string> = {
  1: '⚀',
  2: '⚁',
  3: '⚂',
  4: '⚃',
  5: '⚄',
  6: '⚅',
};
