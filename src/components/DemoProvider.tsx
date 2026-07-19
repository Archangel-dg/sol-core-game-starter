'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

/**
 * Demo-Modus-Kontext. Meldet den Spieler mit einer server-generierten
 * „Demo-Wallet" (simulierte 3 SOL) an; jeder Spin/Bet läuft dann über die
 * /api/demo/*-Endpunkte — echt provably-fair, aber ohne echten Geldfluss.
 *
 * `usePlayer()` liefert die effektive Spieler-Identität (Demo- ODER echtes
 * Wallet) samt `apiBase` ('/api' oder '/api/demo'), damit die Spiel-Komponenten
 * mit einer Zeile umschalten. Die Design-Zone stylt frei; die Endpunkt-Logik ist Vertrag.
 */

const STORE_KEY = 'sc_demo_wallet';

interface DemoCtx {
  demo: boolean;
  demoWallet: string | null;
  demoBalance: string | null;
  startLamports: string | null;
  starting: boolean;
  error: string | null;
  startDemo: () => Promise<void>;
  exitDemo: () => void;
  refreshDemoBalance: () => Promise<void>;
}

const Ctx = createContext<DemoCtx | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [demoWallet, setDemoWallet] = useState<string | null>(null);
  const [demoBalance, setDemoBalance] = useState<string | null>(null);
  const [startLamports, setStartLamports] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshDemoBalance = useCallback(async () => {
    const w = demoWallet;
    if (!w) return;
    try {
      const r = await fetch(`/api/demo/balance/${w}`).then((x) => x.json());
      if (typeof r.balanceLamports === 'string') setDemoBalance(r.balanceLamports);
    } catch {
      /* still */
    }
  }, [demoWallet]);

  // Bestehende Demo-Wallet nach Reload fortsetzen.
  useEffect(() => {
    const w = typeof window !== 'undefined' ? localStorage.getItem(STORE_KEY) : null;
    if (w) setDemoWallet(w);
  }, []);
  useEffect(() => {
    void refreshDemoBalance();
    if (!demoWallet) return;
    const id = setInterval(() => void refreshDemoBalance(), 4_000);
    return () => clearInterval(id);
  }, [refreshDemoBalance, demoWallet]);

  const startDemo = useCallback(async () => {
    setStarting(true);
    setError(null);
    try {
      const r = await fetch('/api/demo/start', { method: 'POST' }).then((x) => x.json());
      if (r.error || !r.demoWallet) {
        setError(r.error?.code ?? 'demo_start_failed');
        return;
      }
      localStorage.setItem(STORE_KEY, r.demoWallet);
      setDemoWallet(r.demoWallet);
      setDemoBalance(r.balanceLamports ?? null);
      setStartLamports(r.startLamports ?? r.balanceLamports ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStarting(false);
    }
  }, []);

  const exitDemo = useCallback(() => {
    localStorage.removeItem(STORE_KEY);
    setDemoWallet(null);
    setDemoBalance(null);
  }, []);

  const value = useMemo<DemoCtx>(
    () => ({
      demo: demoWallet !== null,
      demoWallet,
      demoBalance,
      startLamports,
      starting,
      error,
      startDemo,
      exitDemo,
      refreshDemoBalance,
    }),
    [demoWallet, demoBalance, startLamports, starting, error, startDemo, exitDemo, refreshDemoBalance],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemo(): DemoCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useDemo must be used within DemoProvider');
  return c;
}

export interface Player {
  wallet: string | null;
  connected: boolean;
  demo: boolean;
  /** '/api' (echt) oder '/api/demo' (Demo). */
  apiBase: string;
}

/** Effektive Spieler-Identität: Demo-Wallet, wenn Demo aktiv, sonst echtes Wallet. */
export function usePlayer(): Player {
  const { publicKey, connected } = useWallet();
  const { demo, demoWallet } = useDemo();
  if (demo) {
    return { wallet: demoWallet, connected: demoWallet !== null, demo: true, apiBase: '/api/demo' };
  }
  return { wallet: publicKey?.toBase58() ?? null, connected, demo: false, apiBase: '/api' };
}
