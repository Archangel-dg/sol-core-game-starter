'use client';

import { useCallback, useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { buildDepositTx } from '@/lib/player-program';
import { toSol, solToLamports } from '@/lib/lamports';

/**
 * Guthaben-Leiste: interne Balance (Poll alle 10 s) + Einzahlen (on-chain) +
 * Auszahlen. Wird bei devMock automatisch ausgeblendet (Feature-Flag).
 * Design frei anpassbar; die Geld-Logik (Deposit-Tx, Endpunkte) ist Vertrag.
 */
export function BalanceBar({ devMock }: { devMock: boolean }) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();
  const [balance, setBalance] = useState<string | null>(null);
  const [amount, setAmount] = useState('0.1');
  const [busy, setBusy] = useState<'deposit' | 'withdraw' | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!publicKey) return;
    try {
      const r = await fetch(`/api/balance/${publicKey.toBase58()}`).then((x) => x.json());
      setBalance(r.balanceLamports ?? null);
    } catch {
      /* still */
    }
  }, [publicKey]);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 10_000);
    return () => clearInterval(id);
  }, [refresh]);

  const deposit = useCallback(async () => {
    if (!publicKey) return;
    setBusy('deposit');
    setMsg(null);
    try {
      const lamports = solToLamports(amount);
      const tx = await buildDepositTx(connection, publicKey, lamports);
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, 'confirmed');
      setMsg('Einzahlung gesendet — Guthaben erscheint in ~5–10 s.');
      setTimeout(() => void refresh(), 6000);
    } catch (e) {
      setMsg(`Einzahlung fehlgeschlagen: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }, [publicKey, amount, connection, sendTransaction, refresh]);

  const withdraw = useCallback(async () => {
    if (!publicKey) return;
    setBusy('withdraw');
    setMsg(null);
    try {
      const lamports = solToLamports(amount);
      const r = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ playerWallet: publicKey.toBase58(), amountLamports: lamports.toString() }),
      }).then((x) => x.json());
      if (r.error) setMsg(`Auszahlung: ${r.error.code}`);
      else {
        setMsg(r.signature ? 'Auszahlung gesendet.' : 'Auszahlung verbucht.');
        void refresh();
      }
    } catch (e) {
      setMsg(`Auszahlung fehlgeschlagen: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }, [publicKey, amount, refresh]);

  if (devMock) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/50">
        Test-Modus (devMock): kein echtes Guthaben nötig — einfach spielen.
      </div>
    );
  }
  if (!connected) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-wide text-white/50">Guthaben</span>
        <span className="font-bold tabular-nums text-accent">
          {balance === null ? '—' : `${toSol(balance)} ◎`}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          className="w-24 rounded-lg border border-white/10 bg-night px-3 py-2 text-sm tabular-nums outline-none focus:border-accent/50"
        />
        <span className="text-xs text-white/50">SOL</span>
        <button
          type="button"
          onClick={() => void deposit()}
          disabled={busy !== null}
          className="ml-auto rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-night disabled:opacity-40"
        >
          {busy === 'deposit' ? '…' : 'Einzahlen'}
        </button>
        <button
          type="button"
          onClick={() => void withdraw()}
          disabled={busy !== null}
          className="rounded-full border border-white/15 px-4 py-1.5 text-sm disabled:opacity-40"
        >
          {busy === 'withdraw' ? '…' : 'Auszahlen'}
        </button>
      </div>
      {msg && <p className="mt-2 text-xs text-white/60">{msg}</p>}
    </div>
  );
}
