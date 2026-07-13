'use client';

import { useMemo, type ReactNode } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import type { Adapter } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';
import '@solana/wallet-adapter-react-ui/styles.css';

/**
 * ⚠ Nicht ändern — Systemvertrag.
 * Wallet-Kontext (Spieler-Adresse + Deposits). Leere wallets-Liste: moderne
 * Wallets (Phantom, Solflare, …) melden sich per Wallet-Standard automatisch an.
 */
export function Providers({ children }: { children: ReactNode }) {
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC ?? clusterApiUrl('devnet');
  const wallets = useMemo<Adapter[]>(() => [], []);
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
