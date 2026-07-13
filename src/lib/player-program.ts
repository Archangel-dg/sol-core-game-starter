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

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID ?? '8R7PfDa6FYVZdYgg7mGD8kfXNRN66M9VenLjP1t2qaoG',
);

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
