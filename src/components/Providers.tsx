'use client';

import { useMemo, type ReactNode } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import type { Adapter } from '@solana/wallet-adapter-base';
import '@solana/wallet-adapter-react-ui/styles.css';
import { SOLANA_RPC_URL } from '../lib/solana';

/**
 * ⚠ Nicht ändern — Systemvertrag.
 * Wallet-Kontext (Spieler-Adresse + Deposits). Leere wallets-Liste: moderne
 * Wallets (Phantom, Solflare, …) melden sich per Wallet-Standard automatisch an.
 */
export function Providers({ children }: { children: ReactNode }) {
  // Der RPC kommt aus solana.ts — mit derselben Pruefung wie Netz und
  // Programm-ID. Ein Rueckfall auf Devnet an dieser Stelle waere still: Das
  // Spiel baut eine Verbindung zum falschen Netz auf, sieht normal aus, und
  // jede Einzahlung geht ins Leere.
  // Der Browser spricht die EIGENE Herkunft (/api/rpc) — dieser Server reicht
  // an den Solana-RPC weiter (Begruendung in app/api/rpc/route.ts: der
  // Standard-RPC sperrt jeden Browser aus, ein Schluessel waere domaingesperrt
  // oder abgreifbar). SOLANA_RPC_URL bleibt nur der Platzhalter fuers
  // Server-Rendern; von dort geht nie eine Anfrage aus.
  const endpoint =
    typeof window === 'undefined' ? SOLANA_RPC_URL : `${window.location.origin}/api/rpc`;
  const wallets = useMemo<Adapter[]>(() => [], []);
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
