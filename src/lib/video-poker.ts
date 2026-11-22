/**
 * ██ GESTALTUNGSZONE ██ — Video Poker: Karten lesen und die Auszahltabelle des
 * Spiels so zeigen, wie der Server abrechnet.
 *
 * Hier wird NICHTS gewertet. Welche Hand fünf Karten sind und was sie zahlen,
 * sagt der Server (`progress.handCategory`, `multiplierBps`); die Tabelle kommt
 * 1:1 aus dem Engine-Echo (`paytableBps`, `minPairRank`). Diese Datei übersetzt
 * nur Zahlen in Bilder (Rang, Farbe) und liest Echo und Fortschritt defensiv —
 * ein alter API-Stand ohne ein Feld bricht die Oberfläche nicht, er lässt die
 * Anzeige weg.
 *
 * Kartenkodierung (Server, `src/services/video-poker.ts`): 0..51, Rang
 * `k % 13 + 1` (1 = Ass, 11 = Bube, 12 = Dame, 13 = König), Farbe `⌊k / 13⌋`
 * (0 ♠, 1 ♥, 2 ♦, 3 ♣).
 */

import { VIDEO_POKER_HANDS, type VideoPokerCategory, type VideoPokerHand } from './solcore';
import type { StringKey } from './strings';

/** Was auf einer Karte steht: Index (A, 2 … 10, J, Q, K) und Farbe. */
export interface CardFace {
  rank: string;
  suit: '♠' | '♥' | '♦' | '♣';
  red: boolean;
}

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
const SUITS = ['♠', '♥', '♦', '♣'] as const;

/** Karte 0..51 → Bild. `null` für alles, was keine Karte ist. */
export function cardFace(k: unknown): CardFace | null {
  if (typeof k !== 'number' || !Number.isInteger(k) || k < 0 || k > 51) return null;
  const suit = SUITS[Math.floor(k / 13)]!;
  return { rank: RANKS[k % 13]!, suit, red: suit === '♥' || suit === '♦' };
}

/** Index-Zeichen eines Rangs 2..14 (14 = Ass) — für „Paar ab …". */
function rankSymbol(rank: number): string {
  return rank === 14 ? 'A' : RANKS[rank - 1] ?? String(rank);
}

/**
 * Katalog-Schlüssel (und Platzhalter) für den Namen einer Hand. `highPair`
 * heißt je nach Spiel anders: ab Bube „Jacks or Better", ab Zehn „Tens or
 * Better" … — der Rang steht im Echo (`minPairRank`), nie im Code.
 */
export function handLabel(
  category: VideoPokerCategory,
  minPairRank: number,
): { key: StringKey; vars?: Record<string, string> } {
  if (category !== 'highPair') return { key: `vp.hand.${category}` as StringKey };
  if (minPairRank >= 10 && minPairRank <= 14) return { key: `vp.hand.highPair.${minPairRank}` as StringKey };
  return { key: 'vp.hand.highPair', vars: { rank: rankSymbol(minPairRank) } };
}

const isHand = (v: unknown): v is VideoPokerHand =>
  typeof v === 'string' && (VIDEO_POKER_HANDS as readonly string[]).includes(v);
const isCategory = (v: unknown): v is VideoPokerCategory => v === 'none' || isHand(v);

/** Eine Zeile der Auszahltabelle — stärkste Hand zuerst. */
export interface VideoPokerTableRow {
  hand: VideoPokerHand;
  bps: number;
}

/**
 * Auszahltabelle und Paar-Schwelle aus dem Engine-Echo. `table` ist `null`,
 * wenn das Echo keine vollständige Tabelle trägt — dann zeigt die Oberfläche
 * keine (eine geratene Tabelle wäre eine Zahl, nach der niemand abrechnet).
 */
export function videoPokerTable(cfg: unknown): { table: VideoPokerTableRow[] | null; minPairRank: number; maxBps: number | null } {
  const c = cfg && typeof cfg === 'object' ? (cfg as Record<string, unknown>) : {};
  const r = c.minPairRank;
  const minPairRank = typeof r === 'number' && Number.isInteger(r) && r >= 2 && r <= 14 ? r : 11;
  const raw = c.paytableBps && typeof c.paytableBps === 'object' ? (c.paytableBps as Record<string, unknown>) : null;
  let table: VideoPokerTableRow[] | null = null;
  if (raw) {
    const rows = VIDEO_POKER_HANDS.map((hand) => ({ hand, bps: raw[hand] }));
    if (rows.every((row) => typeof row.bps === 'number' && Number.isFinite(row.bps) && row.bps >= 0)) {
      table = rows as VideoPokerTableRow[];
    }
  }
  const m = c.maxMultiplierBps;
  return { table, minPairRank, maxBps: typeof m === 'number' && Number.isFinite(m) ? m : null };
}

/** Was eine video-poker-Runde gerade zeigt — defensiv aus `progress` gelesen. */
export interface VideoPokerRound {
  /** Die fünf Karten auf dem Tisch (Blatt, nach dem Ziehen die Endhand). */
  hand: number[] | null;
  /** Das ausgeteilte Blatt. */
  dealt: number[] | null;
  /** Was `hand` ist (vom Server). */
  category: VideoPokerCategory | null;
  /** Nach dem Ziehen: die gehaltenen Stellen; vorher `null`. */
  holds: number[] | null;
  /** Der Server hat nach Ablauf selbst gezogen (bestes Halten). */
  autoDraw: boolean;
}

const fuenfKarten = (v: unknown): number[] | null =>
  Array.isArray(v) && v.length === 5 && v.every((k) => cardFace(k) !== null) ? (v as number[]) : null;

export function videoPokerRound(progress: unknown): VideoPokerRound {
  const p = progress && typeof progress === 'object' ? (progress as Record<string, unknown>) : {};
  const hand = fuenfKarten(p.hand);
  const holds = Array.isArray(p.holds)
    ? p.holds.filter((n): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 4)
    : null;
  return {
    hand,
    dealt: fuenfKarten(p.dealtHand) ?? hand,
    category: isCategory(p.handCategory) ? p.handCategory : null,
    holds,
    autoDraw: p.autoDraw === true,
  };
}
