/**
 * Netto entscheidet (16.11.2026).
 *
 * Ein Gewinn ist nur, was MEHR zurückbringt, als die Runde gekostet hat —
 * Einsatz plus Gebühren. Das Feld `win` der API reicht dafür nicht: Es heißt
 * je Spielart Verschiedenes (Slots, Keno, Rubbellos: schon bei Auszahlung > 0;
 * Plinko, Rad: ab ×1). Wer eine kleinere Auszahlung feiert, gaukelt einen
 * Gewinn vor („loss disguised as win") — ein bekanntes, schädliches Muster.
 *
 * Drei Ausgänge:
 *  - `win`      Auszahlung > Belastung → Gewinnton, „Gewonnen", Gewinnfarbe.
 *  - `partial`  0 < Auszahlung ≤ Belastung → ruhig: „Zurück: X ◎", ein leiser
 *               Klick, keine Gewinnfarbe. Treffer und Linien dürfen markiert
 *               bleiben — der Spieler soll sehen, was passiert ist.
 *  - `loss`     Auszahlung 0 → Verlust, im selben Tempo, ohne Strafe.
 *
 * Die Flows reichen das an die Reveal-Module weiter: `outcome.win` ist das
 * Netto-Urteil (Endbild-Text, Farbe, Fiat, Hochzählen), `outcome.hit` das
 * Spielgeschehen (Treffer, Auszahlung genommen) — docs/CUSTOMIZE.md, Regel 5.
 */
import type { SessionView } from '@/lib/solcore';

export type OutcomeTone = 'win' | 'partial' | 'loss';

function lamports(v: string | bigint | null | undefined): bigint {
  if (typeof v === 'bigint') return v;
  try {
    return BigInt(v ?? '0');
  } catch {
    return 0n;
  }
}

/** Ordnet eine Runde netto ein. `chargeLamports` = Einsatz + Gebühren. */
export function outcomeTone(
  payoutLamports: string | bigint | null | undefined,
  chargeLamports: string | bigint | null | undefined,
): OutcomeTone {
  const payout = lamports(payoutLamports);
  if (payout <= 0n) return 'loss';
  return payout > lamports(chargeLamports) ? 'win' : 'partial';
}

/**
 * Was eine Sitzung gekostet hat. Klassische Sitzungen (mines, towers, hilo …)
 * nennen es seit 16.11.2026 selbst (`totalChargeLamports`); `spin-tower-pro`
 * bucht je Spin ab. Ein älterer Server ohne das Feld: der Einsatz — ohne
 * Gebühren zwar, aber ehrlicher als „Auszahlung > 0".
 */
export function sessionCharge(view: SessionView, stakeLamports?: string | null): string | null {
  if (view.totalChargeLamports) return view.totalChargeLamports;
  if (view.totalChargePerSpinLamports && view.spins) {
    return (lamports(view.totalChargePerSpinLamports) * BigInt(view.spins)).toString();
  }
  return view.stakeLamports ?? view.betLamports ?? stakeLamports ?? null;
}

/** Netto-Einordnung einer beendeten Sitzung (eine laufende hat noch keine Auszahlung). */
export function sessionTone(view: SessionView, stakeLamports?: string | null): OutcomeTone {
  return outcomeTone(view.payoutLamports ?? '0', sessionCharge(view, stakeLamports));
}
