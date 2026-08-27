/**
 * Netzwerk-Konfiguration des Spiels (Client- und Server-Komponenten nutzbar).
 * Gleiche Env-Namen und gleiches requireEnv-Muster wie die Plattform
 * (platform/src/lib/solana.ts). Macht NEXT_PUBLIC_SOLANA_NETWORK funktional:
 * `networkLabel` und `isMainnet` steuern Badge, Metadata und Test-SOL-Hinweise.
 */

/**
 * Erzwingt eine NEXT_PUBLIC_*-Env: In Production-Builds ist sie Pflicht
 * (fehlend ⇒ throw beim Modul-Load, Build bricht ab); im Dev-Modus (`next dev`)
 * greift der Devnet-Fallback mit Konsolen-Warnung. Kein stiller Devnet-Fallback
 * auf Mainnet — siehe docs/mainnet-migration.md.
 *
 * Der Wert muss als statischer `process.env.NEXT_PUBLIC_*`-Zugriff übergeben
 * werden, damit Next.js ihn zur Build-Zeit ins Client-Bundle inlinen kann.
 */
export function requireEnv(name: string, value: string | undefined, devFallback: string): string {
  if (value) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `${name} ist nicht gesetzt. Production-Builds brauchen ${name} zwingend ` +
        `(z. B. in Vercel als Env-Var setzen) — kein stiller Devnet-Fallback. ` +
        `Siehe docs/mainnet-migration.md.`,
    );
  }
  console.warn(
    `[solana] ${name} nicht gesetzt — Devnet-Fallback "${devFallback}" (nur im Dev-Modus). ` +
      `Siehe docs/mainnet-migration.md.`,
  );
  return devFallback;
}

export const SOLANA_RPC_URL = requireEnv(
  'NEXT_PUBLIC_SOLANA_RPC',
  process.env.NEXT_PUBLIC_SOLANA_RPC,
  'https://api.devnet.solana.com',
);

export const SOLANA_NETWORK = requireEnv(
  'NEXT_PUBLIC_SOLANA_NETWORK',
  process.env.NEXT_PUBLIC_SOLANA_NETWORK,
  'devnet',
);

/** true, wenn das konfigurierte Netzwerk Mainnet ist (mainnet/mainnet-beta).
 * Gleiche Ableitung wie Website/Platform und beide Backends. */
export const isMainnet = SOLANA_NETWORK.trim().toLowerCase().startsWith('mainnet');

/** Anzeigename fürs UI: 'Devnet', 'Mainnet' oder der rohe Netzwerk-Wert. */
export const networkLabel = isMainnet
  ? 'Mainnet'
  : SOLANA_NETWORK === 'devnet'
    ? 'Devnet'
    : SOLANA_NETWORK;

/**
 * Programm-ID als roher String — EINE Quelle für alle, die sie brauchen
 * (`player-program.ts` baut daraus den PublicKey, `/api/meta` meldet sie).
 *
 * Sie gehört hierher und nicht neben den Deposit-Code, weil sie zusammen mit
 * RPC und Netz EIN Bündel bildet: Wer eines davon umstellt und die anderen
 * vergisst, baut genau den Fehler, der am 28.08.2026 alle neun gelisteten
 * Spiele auf Devnet stehen liess.
 */
export const PROGRAM_ID_STRING = requireEnv(
  'NEXT_PUBLIC_PROGRAM_ID',
  process.env.NEXT_PUBLIC_PROGRAM_ID,
  '8R7PfDa6FYVZdYgg7mGD8kfXNRN66M9VenLjP1t2qaoG',
);

/**
 * Nur der HOST des RPC, nie die volle URL: Der Schlüssel steckt bei den
 * meisten Anbietern als Query-Parameter darin. Er ist im Browser-Bundle
 * ohnehin sichtbar — ihn zusätzlich über eine API auszuliefern, wäre es aber
 * bequem zu machen. Der Host genügt für die Frage, die hier zählt: läuft das
 * Spiel noch auf einem öffentlichen RPC?
 */
export const rpcHost = (() => {
  try {
    return new URL(SOLANA_RPC_URL).host;
  } catch {
    return null;
  }
})();
