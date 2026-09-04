'use client';
import { useT } from '@/lib/i18n';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { buildDepositTx, warteAufBestaetigung } from '@/lib/player-program';
import { toSol, solToLamports } from '@/lib/lamports';
import { useBalanceFreeze } from '@/lib/balance-freeze';
import { usePlayerAuth } from '@/lib/player-auth';
import { txFehlerText } from '@/lib/tx-fehler';
import { PLAYER_PROFILE_URL } from '@/lib/links';
import { Popover } from './Popover';
import { useFiat } from '@/lib/fiat';
import { FiatSwitch } from './FiatSwitch';
import { FiatHint } from './FiatHint';

/**
 * Guthaben in der Kopfleiste: der Saldo als Auslöser, darunter ein Feld mit
 * Betrag, Einzahlen, Auszahlen und dem Link zur Historie auf der Plattform.
 *
 * Geld-Logik (Deposit-Signatur, moneyFetch, Balance-Freeze) ist Systemvertrag
 * und seit dem Umbau am 03.09.2026 unverändert — geändert hat sich nur die
 * Darstellung: vorher eine Karte unter dem Kopf, jetzt ein Aufklappfeld am
 * Saldo. Ein- UND Auszahlen liegen im selben Feld, gleich weit weg.
 *
 * Der Höchsteinsatz (MaxBetPick) steht seit demselben Tag am Einsatzfeld
 * (SingleBetGame/SessionGame), nicht mehr hier: Er ist eine Spielgrenze, keine
 * Kontogrenze. Grenzen für Ein- und Auszahlung meldet der Server als Fehler.
 */
export function BalanceBar({ devMock }: { devMock: boolean }) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();
  const t = useT();
  // Live-Reveal: Während der Aufdeck-Animation bleibt die Anzeige eingefroren,
  // sonst verrät der Saldo den Gewinner vor der Animation (Systemvertrag).
  const { frozen } = useBalanceFreeze();
  const { moneyFetch } = usePlayerAuth();
  const { format } = useFiat();
  const frozenRef = useRef(frozen);
  frozenRef.current = frozen;
  const [balance, setBalance] = useState<string | null>(null);
  const [amount, setAmount] = useState('0.1');
  const [busy, setBusy] = useState<'deposit' | 'withdraw' | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!publicKey) return;
    try {
      const r = await fetch(`/api/balance/${publicKey.toBase58()}`).then((x) => x.json());
      if (frozenRef.current) return; // Anzeige eingefroren — Ergebnis verwerfen
      setBalance(r.balanceLamports ?? null);
    } catch {
      /* Netzfehler — alter Wert bleibt stehen */
    }
  }, [publicKey]);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 10_000);
    return () => clearInterval(id);
  }, [refresh]);

  // Nach dem Auftauen sofort den echten Stand holen.
  useEffect(() => {
    if (!frozen) void refresh();
  }, [frozen, refresh]);

  const deposit = useCallback(async () => {
    if (!publicKey) return;
    setBusy('deposit');
    setMsg(null);
    try {
      const lamports = solToLamports(amount);
      const tx = await buildDepositTx(connection, publicKey, lamports);
      const sig = await sendTransaction(tx, connection);
      await warteAufBestaetigung(connection, sig);
      setMsg(t('money.depositSent'));
      setTimeout(() => void refresh(), 6000);
    } catch (e) {
      setMsg(t('money.depositFailed', { msg: txFehlerText(e) }));
    } finally {
      setBusy(null);
    }
  }, [publicKey, amount, connection, sendTransaction, refresh, t]);

  const withdraw = useCallback(async () => {
    if (!publicKey) return;
    setBusy('withdraw');
    setMsg(null);
    try {
      const lamports = solToLamports(amount);
      const r = await moneyFetch('/api/withdraw', {
        playerWallet: publicKey.toBase58(),
        amountLamports: lamports.toString(),
      });
      if (r.error) setMsg(t('money.withdrawError', { code: String(r.error.code) }));
      else {
        setMsg(r.signature ? t('money.withdrawSent') : t('money.withdrawBooked'));
        void refresh();
      }
    } catch (e) {
      setMsg(t('money.withdrawFailed', { msg: txFehlerText(e) }));
    } finally {
      setBusy(null);
    }
  }, [publicKey, amount, refresh, moneyFetch, t]);

  if (devMock) {
    return (
      <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/50">
        {t('money.devMock')}
      </span>
    );
  }
  if (!connected) return null;

  return (
    <Popover
      // Rechtsbündig: Der Saldo sitzt seit dem 04.09.2026 rechts neben dem
      // Menü. Mittig ausgerichtet lief das Feld dort aus dem Bild.
      align="end"
      panelClassName="w-72"
      trigger={(open) => (
        <span
          title={t('money.open')}
          className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-sm font-bold tabular-nums text-accent"
        >
          ◎ {balance === null ? '—' : toSol(balance)}
          <svg
            viewBox="0 0 20 20"
            aria-hidden
            className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="currentColor"
          >
            <path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
        </span>
      )}
    >
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-wide text-white/50">{t('money.balance')}</span>
          <span className="text-right font-bold tabular-nums text-accent">
            {balance === null ? '—' : `${toSol(balance)} ◎`}
            {balance !== null && format(balance) && (
              <span className="block text-[11px] font-normal text-white/40">{format(balance)}</span>
            )}
          </span>
        </div>

        {/* Währungs-Näherung. Sie steht hier und nicht im Menü, weil man sie
            genau dann sucht, wenn man auf sein Guthaben schaut. */}
        <FiatSwitch />

        <label className="block text-xs text-white/50">
          {t('money.amount')} <FiatHint sol={amount} />
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            className="mt-1 w-full rounded-lg border border-white/10 bg-night px-3 py-2 text-sm tabular-nums text-white outline-none focus:border-accent/50"
          />
        </label>
        {/* Ein- und Auszahlen nebeneinander, gleich groß — Abheben darf nie
            schwerer sein als Einzahlen (Systemvertrag). */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => void deposit()}
            disabled={busy !== null}
            className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-night disabled:opacity-40"
          >
            {busy === 'deposit' ? '…' : t('money.deposit')}
          </button>
          <button
            type="button"
            onClick={() => void withdraw()}
            disabled={busy !== null}
            className="rounded-full border border-white/15 px-4 py-1.5 text-sm text-white disabled:opacity-40"
          >
            {busy === 'withdraw' ? '…' : t('money.withdraw')}
          </button>
        </div>
        {msg && <p className="text-xs text-white/60">{msg}</p>}
        <a
          href={PLAYER_PROFILE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70 hover:border-accent/40 hover:text-white"
        >
          <span>{t('menu.history')}</span>
          <span aria-hidden>↗</span>
        </a>
      </div>
    </Popover>
  );
}
