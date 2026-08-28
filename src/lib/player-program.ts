// ⚠ Nicht ändern — Systemvertrag.
// Non-custodiales Deposit: der Spieler signiert selbst eine player_deposit-
// Transaktion an das On-Chain-Programm. Der Indexer schreibt die interne
// Balance danach gut (~5–10 s). Nur @solana/web3.js (kein Anchor im Bundle);
// Instruktion mit dem Anchor-Discriminator manuell kodiert.
import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  type Connection,
} from '@solana/web3.js';
import { PROGRAM_ID_STRING } from './solana';

// Die Programm-ID kommt aus solana.ts — dort zusammen mit RPC und Netz, und
// dort mit der Pruefung, die einen Production-Build ohne gesetzte Env abbricht.
// Vorher stand hier ein stiller Fallback auf die DEVNET-ID. Wer dieses Template
// auf Mainnet betreibt und eine der drei NEXT_PUBLIC_SOLANA_*-Variablen
// vergisst, baut sonst ein Spiel, das gegen ein nicht existierendes Programm
// signiert — sichtbar erst, wenn ein Spieler einzahlen will.
export const PROGRAM_ID = new PublicKey(PROGRAM_ID_STRING);

// sha256("global:player_deposit")[0..8]
const DISC_PLAYER_DEPOSIT = Uint8Array.from([64, 80, 109, 194, 32, 200, 22, 6]);

function pda(seeds: (Uint8Array | Buffer)[]): PublicKey {
  return PublicKey.findProgramAddressSync(seeds, PROGRAM_ID)[0];
}

function u64le(value: bigint): Buffer {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(value);
  return b;
}

/** Baut eine player_deposit-Transaktion (Spieler signiert). */
export async function buildDepositTx(
  connection: Connection,
  player: PublicKey,
  amountLamports: bigint,
): Promise<Transaction> {
  const config = pda([Buffer.from('config')]);
  const playerVault = pda([Buffer.from('player_vault')]);
  const playerAccount = pda([Buffer.from('player'), player.toBuffer()]);

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: player, isSigner: true, isWritable: true },
      { pubkey: config, isSigner: false, isWritable: true },
      { pubkey: playerVault, isSigner: false, isWritable: true },
      { pubkey: playerAccount, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([Buffer.from(DISC_PLAYER_DEPOSIT), u64le(amountLamports)]),
  });

  const tx = new Transaction().add(ix);
  tx.feePayer = player;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  return tx;
}

/**
 * Wartet per HTTP-Polling auf die Bestaetigung einer Transaktion.
 *
 * Ersetzt `connection.confirmTransaction(...)`: Das lauscht per WebSocket, und
 * die /api/rpc-Durchreiche kann kein WebSocket — confirmTransaction wuerde 60 s
 * haengen und dann als Fehler enden, obwohl die Einzahlung laengst durch ist.
 */
export async function warteAufBestaetigung(
  connection: Connection,
  signature: string,
): Promise<void> {
  const bis = Date.now() + 60_000;
  while (Date.now() < bis) {
    const st = (await connection.getSignatureStatuses([signature])).value[0];
    if (st?.err) throw new Error(`Transaktion fehlgeschlagen: ${JSON.stringify(st.err)}`);
    if (st?.confirmationStatus === 'confirmed' || st?.confirmationStatus === 'finalized') return;
    await new Promise((r) => setTimeout(r, 1500));
  }
  // Kein Reject als "fehlgeschlagen": Nach 60 s ist unklar, nicht kaputt.
  throw new Error('Bestätigung dauert länger als üblich — prüfe dein Guthaben in ein paar Sekunden.');
}
