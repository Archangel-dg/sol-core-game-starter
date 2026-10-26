/**
 * Guthaben-Check vor der Einzahlung (05.09.2026).
 *
 * WARUM ES DAS GIBT: Reichte das SOL im Wallet nicht, ging trotzdem der
 * Bestätigungs-Dialog auf — und dort scheiterte die Simulation. Phantom stuft
 * eine Transaktion, deren Ausgang es nicht vorhersagen kann, auf ROT hoch
 * („Diese dApp könnte bösartig sein"). Aus einem leeren Wallet wurde so eine
 * Betrugswarnung gegen das Spiel. Wir fragen den Stand deshalb VORHER und
 * sagen klar, was fehlt, statt das Wallet raten zu lassen.
 *
 * Der Check ist eine Höflichkeit, kein Tor: Bei jedem Fehler (RPC weg, alte
 * Durchreiche ohne `getBalance`) gibt er `null` zurück und die Einzahlung läuft
 * wie bisher weiter. Er darf niemals eine Einzahlung verhindern, die
 * funktioniert hätte.
 */
import { PublicKey, type Connection } from '@solana/web3.js';
import { PROGRAM_ID } from './player-program';

/** Netzwerkgebühr der Einzahlung: genau eine Signatur × 5000 Lamports.
 * Diese Vorlage setzt keine Priority Fee — mehr kostet die Transaktion nicht. */
export const TX_FEE_LAMPORTS = 5_000n;

/**
 * Einmalige Konto-Miete der ERSTEN Einzahlung: sie legt das Spielkonto
 * (`PlayerAccount`-PDA) on-chain an, und Solana verlangt dafür die
 * Mietfreiheit. Das Geld ist nicht weg — es liegt im eigenen Konto.
 *
 * 48 Byte (8 Byte Anchor-Diskriminator + 40 Byte Felder, aus der IDL des
 * Programms) nach Solanas Formel:
 *   (128 Byte Konto-Aufschlag + 48) × 3480 Lamports/Byte-Jahr × 2 Jahre
 *   = 176 × 6960 = 1.224.960 Lamports ≈ 0,00122 SOL.
 * Ändert das Netz die Mietparameter (seit Jahren unverändert), liegt der Wert
 * daneben — dann greift die Regel oben: der Check blockt nie, er warnt nur.
 */
export const PLAYER_ACCOUNT_RENT_LAMPORTS = 1_224_960n;

export interface DeckungFehlt {
  ok: false;
  /** SOL im Wallet (Lamports). */
  have: bigint;
  /** Gebraucht: Einzahlung + Gebühr + ggf. Miete (Lamports). */
  need: bigint;
  /** true, wenn die Miete der ersten Einzahlung mitgerechnet wurde. */
  rent: boolean;
}

export type Deckung = { ok: true } | DeckungFehlt;

/** Was eine Einzahlung insgesamt kostet — rein rechnerisch, ohne Netz. */
export function benoetigteLamports(amountLamports: bigint, rent: boolean): bigint {
  return amountLamports + TX_FEE_LAMPORTS + (rent ? PLAYER_ACCOUNT_RENT_LAMPORTS : 0n);
}

/**
 * Reicht das SOL im Wallet für diese Einzahlung? `null` = konnte nicht geprüft
 * werden (dann normal fortfahren, siehe Kopf).
 */
export async function pruefeDeckung(
  connection: Connection,
  player: PublicKey,
  amountLamports: bigint,
): Promise<Deckung | null> {
  try {
    const playerAccount = PublicKey.findProgramAddressSync(
      [Buffer.from('player'), player.toBuffer()],
      PROGRAM_ID,
    )[0];
    // Beides in einem Rutsch: Stand des Wallets und ob das Spielkonto schon steht.
    const [have, info] = await Promise.all([
      connection.getBalance(player),
      connection.getAccountInfo(playerAccount),
    ]);
    const rent = info === null;
    const need = benoetigteLamports(amountLamports, rent);
    const haveBig = BigInt(have);
    return haveBig >= need ? { ok: true } : { ok: false, have: haveBig, need, rent };
  } catch {
    return null;
  }
}
