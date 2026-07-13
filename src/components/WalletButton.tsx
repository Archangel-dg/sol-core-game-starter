'use client';

import dynamic from 'next/dynamic';

// Client-only, damit der Wallet-Adapter beim Prerender kein window anfasst.
export const WalletButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((m) => m.WalletMultiButton),
  { ssr: false, loading: () => <div className="h-10 w-32 rounded-full bg-white/5" /> },
);
