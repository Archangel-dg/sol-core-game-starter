/**
 * ██ GESTALTUNGSZONE ██ — Hold'em gegen den Dealer: die Server-Sicht lesen und
 * die Ante-Tabelle so zeigen, wie der Server abrechnet.
 *
 * Hier wird NICHTS gewertet. Welche Hand sieben Karten sind, ob der Dealer sich
 * qualifiziert, wer gewinnt und was die Runde zahlt, sagt der Server
 * (`HoldemDealerView.ende`, `payoutLamports`); die Tabelle kommt 1:1 aus dem
 * Engine-Echo (`anteBps`). Diese Datei liest Sicht und Echo defensiv — ein
 * alter API-Stand ohne ein Feld bricht die Oberfläche nicht, er lässt die
 * Anzeige weg.
 *
 * HAUSREGEL — NACH DEM AUSSTEIGEN NUR, WAS GESPIELT WURDE. Die fertige Antwort
 * enthält alle neun Karten: Turn, River und die Karten des Dealers gehören auf
 * die Prüfseite (Scanner), nicht an den Tisch. „Was wäre gekommen" ist ein
 * Beinahe-Gewinn (docs/RULES.md, Regel 16 — dieselbe Regel wie die nicht
 * gezogenen Karten bei Video Poker). Auch `ende.spielerKategorie` und
 * `ende.dealerKategorie` sind mit Turn und River gerechnet; nach dem Aussteigen
 * zählt die Hand mit dem Flop (`spieler.kategorieFlop`). `holdemTable` ist die
 * EINE Stelle, an der das passiert — Flow, Ersatz-Ansicht und das Protokoll
 * fürs Reveal-Modul lesen den Tisch von hier, nie direkt aus der Sicht.
 *
 * Kartenkodierung (Server, `src/services/holdem-dealer.ts`): 0..51, Rang
 * `k % 13 + 1` (1 = Ass … 13 = König), Farbe `⌊k / 13⌋` (0 ♠, 1 ♥, 2 ♦, 3 ♣).
 */

import {
  HOLDEM_DEALER_HANDS,
  type HoldemDealerAction,
  type HoldemDealerCategory,
  type HoldemDealerView,
} from './solcore';
import type { StringKey } from './strings';

/** Wie die Runde ausging — englische Namen für Oberfläche und Reveal-Modul. */
export type HoldemResult = 'fold' | 'noQualify' | 'win' | 'loss' | 'tie';

const ERGEBNIS: Readonly<Record<string, HoldemResult>> = {
  ausgestiegen: 'fold',
  dealer_nicht_qualifiziert: 'noQualify',
  gewonnen: 'win',
  verloren: 'loss',
  unentschieden: 'tie',
};

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
const SUITS = ['♠', '♥', '♦', '♣'] as const;

/** Karte 0..51 → „A♥" (Ersatz-Ansicht ohne Modul). `null` für alles, was keine Karte ist. */
export function cardText(k: number | null | undefined): string | null {
  if (typeof k !== 'number' || !Number.isInteger(k) || k < 0 || k > 51) return null;
  return `${RANKS[k % 13]}${SUITS[Math.floor(k / 13)]}`;
}

/** Rote Farbe (♥ ♦)? */
export function cardRed(k: number | null | undefined): boolean {
  return typeof k === 'number' && (Math.floor(k / 13) === 1 || Math.floor(k / 13) === 2);
}

export const isHoldemCategory = (v: unknown): v is HoldemDealerCategory =>
  typeof v === 'string' && (HOLDEM_DEALER_HANDS as readonly string[]).includes(v);

/** Katalog-Schlüssel des Namens einer Hand. */
export function handLabelKey(category: HoldemDealerCategory): StringKey {
  return `hd.hand.${category}` as StringKey;
}

/** Was auf dem Tisch liegt — nach der Hausregel. */
export interface HoldemTable {
  /** Die zwei Karten des Spielers (`null` = unlesbar). */
  player: (number | null)[];
  flop: (number | null)[];
  /** Turn, River und die Karten des Dealers: NUR nach einem Call, sonst `null`. */
  turn: number | null;
  river: number | null;
  dealer: (number | null)[];
  /** Was die zwei Handkarten mit dem Flop sind — in der Entscheidung und nach dem Aussteigen die Hand am Tisch. */
  flopHand: HoldemDealerCategory | null;
  settled: boolean;
  action: HoldemDealerAction | null;
  result: HoldemResult | null;
  /** Beste fünf aus sieben (Spieler, Dealer) und die Qualifikation: NUR nach einem Call. */
  playerHand: HoldemDealerCategory | null;
  dealerHand: HoldemDealerCategory | null;
  dealerQualified: boolean | null;
  /** Ante-Gewinn laut Tabelle (0 nach dem Aussteigen und bei Gleichstand/Verlust). */
  anteWinBps: number;
  /** Nach 15 Minuten ohne Entscheidung ausgestiegen. */
  timedOut: boolean;
}

const code = (k: unknown): number | null => {
  const c = k && typeof k === 'object' ? (k as { code?: unknown }).code : undefined;
  return typeof c === 'number' && Number.isInteger(c) && c >= 0 && c <= 51 ? c : null;
};
const list = (v: unknown, n: number): (number | null)[] =>
  Array.from({ length: n }, (_, i) => (Array.isArray(v) ? code(v[i]) : null));

/**
 * Der Tisch einer Runde — die einzige Stelle, die entscheidet, welche Karten
 * und Wertungen eine Oberfläche zeigen darf. Ohne lesbares `ende` gilt eine
 * fertige Runde als NICHT mitgegangen: lieber eine Karte zu wenig gezeigt als
 * eine, die nicht gespielt wurde.
 */
export function holdemTable(view: HoldemDealerView | null | undefined): HoldemTable | null {
  if (!view) return null;
  const settled = view.status === 'settled';
  const e = settled && view.ende && typeof view.ende === 'object' ? view.ende : null;
  const action: HoldemDealerAction | null = e?.aktion === 'call' || e?.aktion === 'fold' ? e.aktion : null;
  const called = action === 'call';
  return {
    player: list(view.spieler?.karten, 2),
    flop: list(view.brett?.flop, 3),
    turn: called ? code(view.brett?.turn) : null,
    river: called ? code(view.brett?.river) : null,
    dealer: called ? list(view.dealer?.karten, 2) : [null, null],
    flopHand: isHoldemCategory(view.spieler?.kategorieFlop) ? view.spieler.kategorieFlop : null,
    settled,
    action,
    result: e ? (ERGEBNIS[e.ergebnis] ?? null) : null,
    playerHand: called && isHoldemCategory(e?.spielerKategorie) ? e!.spielerKategorie : null,
    dealerHand: called && isHoldemCategory(e?.dealerKategorie) ? e!.dealerKategorie : null,
    dealerQualified: called ? e!.dealerQualifiziert === true : null,
    anteWinBps: called && typeof e?.anteGewinnBps === 'number' && Number.isFinite(e.anteGewinnBps) ? e.anteGewinnBps : 0,
    timedOut: view.zeitAbgelaufen === true,
  };
}

const LAMPORTS = /^\d+$/;

/**
 * Faktor der Runde in bps: Auszahlung ÷ Gesamteinsatz (Ante + Call) — dieselbe
 * ganzzahlige Rechnung wie `creator_rounds.multiplier_bps` des Servers. Kein
 * Ergebnis, nur die Anzeige zweier Server-Zahlen.
 */
export function roundMultiplierBps(view: HoldemDealerView): number {
  const stake = view.einsatzSummeLamports;
  const payout = view.payoutLamports ?? '0';
  if (!LAMPORTS.test(stake ?? '') || !LAMPORTS.test(payout)) return 0;
  const s = BigInt(stake);
  return s > 0n ? Number((BigInt(payout) * 10000n) / s) : 0;
}

/** Preis des Calls laut Server (`kosten.call`): Einsatz (2 × Ante) und Gesamt mit Gebühren. */
export function callCost(view: HoldemDealerView | null | undefined): { stake: string; total: string } | null {
  const k = view?.kosten?.call;
  return k && LAMPORTS.test(k.einsatzLamports ?? '') && LAMPORTS.test(k.gesamtLamports ?? '')
    ? { stake: k.einsatzLamports, total: k.gesamtLamports }
    : null;
}

/** Eine Zeile der Ante-Tabelle — stärkste Hand zuerst; gleich zahlende schwache Hände in EINER Zeile. */
export interface AnteRow {
  /** Stärkste zuerst. Mehr als eine Hand ⇒ „X oder tiefer" bzw. „X – Y". */
  hands: HoldemDealerCategory[];
  /** Ante-Gewinn in bps des Antes (10000 = 1:1). */
  bps: number;
}

/**
 * Die Ante-Tabelle aus dem Engine-Echo (`anteBps`, zehn Hände). `null`, wenn
 * das Echo keine vollständige Tabelle trägt — eine geratene Tabelle wäre eine
 * Zahl, nach der niemand abrechnet.
 */
export function anteTable(cfg: unknown): AnteRow[] | null {
  const c = cfg && typeof cfg === 'object' ? (cfg as Record<string, unknown>) : {};
  const raw = c.anteBps && typeof c.anteBps === 'object' ? (c.anteBps as Record<string, unknown>) : null;
  if (!raw) return null;
  const strongFirst = [...HOLDEM_DEALER_HANDS].reverse();
  if (!strongFirst.every((h) => typeof raw[h] === 'number' && Number.isFinite(raw[h]) && (raw[h] as number) >= 0)) {
    return null;
  }
  const rows: AnteRow[] = [];
  for (const hand of strongFirst) {
    const bps = raw[hand] as number;
    const last = rows[rows.length - 1];
    if (last && last.bps === bps) last.hands.push(hand);
    else rows.push({ hands: [hand], bps });
  }
  return rows;
}

/** 1000000 bps → „100:1", 15000 → „1.5:1". */
export function anteRatio(bps: number): string {
  const x = bps / 10000;
  return `${Number.isInteger(x) ? x : x.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}:1`;
}
