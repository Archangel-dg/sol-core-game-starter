// ⚠ Nicht ändern — Systemvertrag.
// Geldwerte sind IMMER Lamport-Strings/BigInt (1 SOL = 1e9). Nie Number.

export const LAMPORTS_PER_SOL = 1_000_000_000n;

/** Lamports (string|bigint) → SOL-Anzeige. */
export function toSol(lamports: string | bigint, digits = 4): string {
  const n = typeof lamports === 'bigint' ? lamports : BigInt(lamports);
  const whole = n / LAMPORTS_PER_SOL;
  const frac = n % LAMPORTS_PER_SOL;
  const fracStr = frac.toString().padStart(9, '0').slice(0, digits).replace(/0+$/, '');
  return fracStr ? `${whole}.${fracStr}` : whole.toString();
}

/** SOL-Eingabe (string) → Lamports (bigint). Wirft bei ungültiger Eingabe. */
export function solToLamports(sol: string): bigint {
  const t = sol.trim();
  if (!/^\d+(\.\d+)?$/.test(t)) throw new Error('Ungültiger SOL-Betrag');
  const [whole, frac = ''] = t.split('.');
  const fracPadded = (frac + '000000000').slice(0, 9);
  return BigInt(whole) * LAMPORTS_PER_SOL + BigInt(fracPadded);
}
