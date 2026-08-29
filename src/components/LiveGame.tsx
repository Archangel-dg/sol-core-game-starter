'use client';
import { useT } from '@/lib/i18n';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import type { EngineDef } from '@/lib/engines';
import type { LiveMyBets, LiveStateInfo } from '@/lib/solcore';
import { solToLamports, toSol } from '@/lib/lamports';
import { toUiError } from '@/lib/errors';
import { useBalanceFreeze } from '@/lib/balance-freeze';
import { usePlayerAuth } from '@/lib/player-auth';
import { LiveResultView } from './LiveResultView';
import { MaxBetPick } from './BetLimitHint';
import { VerifyLink } from './VerifyLink';

/**
 * Generischer Live-Driver (funktioniert für jede live-Engine): pollt den
 * geteilten Runden-State (1 s), rechnet Countdown/Reveal über den Server-
 * Clock-Offset, nimmt Bets in die ANGEZEIGTE Runde entgegen und friert die
 * Balance-Anzeige während des Reveals ein (der Server hat den Gewinn beim
 * Draw bereits gutgeschrieben — die Anzeige folgt der Animation).
 *
 * Die Ergebnis-Darstellung lebt in LiveResultView — dort ist die Design-Zone.
 */

type UiPhase = 'loading' | 'paused' | 'intermission' | 'betting' | 'drawing' | 'revealing' | 'settled';

/** Client-Sperre kurz VOR dem Server-Lock — der Server-Gate bleibt Autorität. */
const CLIENT_LOCK_MS = 500;

export function LiveGame({ engine, verifierUrl }: { engine: EngineDef; verifierUrl: string }) {
  const { publicKey, connected } = useWallet();
  const t = useT();
  const wallet = publicKey?.toBase58() ?? null;
  const { freezeUntil, release } = useBalanceFreeze();
  // Geld-Routen laufen ausschließlich über moneyFetch (hängt das Spieler-Token an).
  const { moneyFetch } = usePlayerAuth();

  const [state, setState] = useState<LiveStateInfo | null>(null);
  const [offsetMs, setOffsetMs] = useState(0);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [me, setMe] = useState<LiveMyBets | null>(null);
  const [amount, setAmount] = useState('0.05');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [recent, setRecent] = useState<{ roundNo: string; outcomeIndex: number }[]>([]);
  const frozenRound = useRef<string | null>(null);
  const settledShown = useRef<string | null>(null);

  // ── Poll-Schleife: Runden-State (1 s) + weiche Uhr (100 ms) ──
  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      try {
        const s = (await fetch('/api/live/state').then((r) => r.json())) as LiveStateInfo & {
          error?: { code?: string };
        };
        if (stopped || s.error) return;
        setState(s);
        setOffsetMs(new Date(s.serverTime).getTime() - Date.now());
      } catch {
        /* nächster Tick versucht es erneut */
      }
    };
    void tick();
    const id = setInterval(() => void tick(), 1_000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, []);
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 100);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const load = () =>
      fetch('/api/live/recent?limit=12')
        .then((r) => r.json())
        .then((d) => Array.isArray(d.results) && setRecent(d.results))
        .catch(() => {});
    void load();
    const id = setInterval(() => void load(), 10_000);
    return () => clearInterval(id);
  }, []);

  const serverNow = nowTick + offsetMs;
  const round = state?.round ?? null;
  const displayRound = round ?? state?.lastRound ?? null;

  // ── Phase ableiten ──
  let phase: UiPhase = 'loading';
  if (state) {
    if (!round) {
      phase = state.stream.status === 'active' ? 'intermission' : 'paused';
      if (state.lastRound?.status === 'settled') phase = state.stream.status === 'active' ? 'intermission' : 'paused';
    } else if (round.status === 'betting') {
      phase = new Date(round.locksAt).getTime() - serverNow <= CLIENT_LOCK_MS ? 'drawing' : 'betting';
    } else if (round.status === 'drawing') {
      phase = 'drawing';
    } else if (round.status === 'revealing') {
      phase = 'revealing';
    } else {
      phase = 'settled';
    }
  }

  // Reveal-Fortschritt 0..1 aus dem Server-Fenster.
  let revealProgress = 0;
  if (round?.status === 'revealing' && round.revealsUntil) {
    const end = new Date(round.revealsUntil).getTime();
    const start = end - round.revealSeconds * 1000;
    revealProgress = Math.max(0, Math.min(1, (serverNow - start) / (end - start)));
  } else if (phase === 'settled') {
    revealProgress = 1;
  }

  // ── Balance-Freeze: einfrieren beim Reveal-Start, freigeben danach ──
  useEffect(() => {
    const revealing = round?.status === 'revealing';
    if (revealing && round.roundId !== frozenRound.current && round.revealsUntil) {
      frozenRound.current = round.roundId;
      freezeUntil(new Date(round.revealsUntil).getTime() - offsetMs);
    } else if (!revealing && frozenRound.current) {
      frozenRound.current = null;
      release();
    }
  }, [round, offsetMs, freezeUntil, release]);

  // ── Eigene Bets: nach Aktionen und am Runden-Ende aktualisieren ──
  const refreshMe = useCallback(
    async (roundId: string) => {
      if (!wallet) return;
      try {
        const d = (await fetch(`/api/live/me/${wallet}?roundId=${roundId}`).then((r) =>
          r.json(),
        )) as LiveMyBets & { error?: unknown };
        if (!d.error) setMe(d);
      } catch {
        /* still */
      }
    },
    [wallet],
  );
  useEffect(() => {
    // Am Ende des Reveals einmal nachladen — dann zeigen die Bets won/lost
    // + Payout. Während des Reveals bleibt die Liste beim Vor-Draw-Stand,
    // damit sie das Ergebnis nicht vor der Animation verrät.
    const settledId = state?.lastRound?.status === 'settled' ? state.lastRound.roundId : null;
    const current = round?.status === 'settled' ? round.roundId : settledId;
    if (current && settledShown.current !== current) {
      settledShown.current = current;
      void refreshMe(current);
    }
  }, [state, round, refreshMe]);
  useEffect(() => {
    if (round?.status === 'betting' && wallet && me?.roundId !== round.roundId) {
      void refreshMe(round.roundId);
    }
  }, [round, wallet, me?.roundId, refreshMe]);

  // ── Bet platzieren ──
  const placeBet = async (outcomeIndex: number) => {
    if (!wallet || !round || phase !== 'betting') return;
    setBusy(true);
    setMsg(null);
    try {
      const lamports = solToLamports(amount);
      const r = await moneyFetch('/api/live/bet', {
        playerWallet: wallet,
        roundId: round.roundId,
        outcomeIndex,
        betLamports: lamports.toString(),
      });
      if (r.error) {
        const reason = typeof r.error.reason === 'string' ? r.error.reason : undefined;
        if (reason === 'betting_locked') setMsg(t('live.bettingClosed'));
        else if (reason === 'live_exposure_cap')
          setMsg(t('live.outcomeFull'));
        else {
          const ui = toUiError(r.error.code, r.error.message, reason);
          setMsg(`${ui.code}: ${ui.message}`);
        }
        return;
      }
      await refreshMe(round.roundId);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // ── Anzeige-Helfer ──
  const countdownMs = round?.status === 'betting' ? new Date(round.locksAt).getTime() - serverNow : 0;
  const countdown =
    countdownMs > 0
      ? `${Math.floor(countdownMs / 60000)}:${String(Math.floor((countdownMs % 60000) / 1000)).padStart(2, '0')}`
      : '0:00';
  const nextInMs = state?.nextOpensAt ? new Date(state.nextOpensAt).getTime() - serverNow : null;

  const phaseLabel: Record<UiPhase, string> = {
    loading: t('app.loading'),
    paused: t('live.streamPaused'),
    intermission:
      nextInMs !== null && nextInMs > 0
        ? t('live.nextRoundIn', { s: Math.ceil(nextInMs / 1000) })
        : t('live.nextRoundStarts'),
    betting: `${t('crash.bettingOpen')} · ${countdown}`,
    drawing: t('live.bettingClosedBadge'),
    revealing: t('live.racing'),
    settled: t('live.result'),
  };

  const outcomes = displayRound?.outcomes ?? state?.stream.outcomes ?? [];
  const myBets = (me?.roundId === displayRound?.roundId ? me?.bets : []) ?? [];
  const resultVisible = displayRound?.result ?? null;

  if (!state) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/40">
        {t('live.loadingStream')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Kopf: Stream + Phase */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-sm font-bold text-white">{state.stream.displayName}</p>
            <p className="text-xs text-white/40">
              Runde #{displayRound?.roundNo ?? '—'} · {engine.live?.hint ?? ''}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold tabular-nums ${
              phase === 'betting'
                ? 'bg-accent/20 text-accent'
                : phase === 'revealing'
                  ? 'bg-white/10 text-white'
                  : 'bg-white/[0.06] text-white/50'
            }`}
          >
            {phaseLabel[phase]}
          </span>
        </div>
      </div>

      {/* ★ Design-Zone: die Reveal-Animation */}
      <LiveResultView
        outcomes={outcomes.map((o) => ({ index: o.index, label: o.label, oddsBps: o.oddsBps }))}
        resultIndex={resultVisible ? resultVisible.outcomeIndex : null}
        phase={phase === 'loading' || phase === 'paused' || phase === 'intermission' ? 'betting' : phase}
        revealProgress={revealProgress}
        myBets={myBets.map((b) => ({
          outcomeIndex: b.outcomeIndex,
          betLamports: b.betLamports,
          status: b.status,
        }))}
      />

      {/* Wett-Panel (nur in der Wettphase) */}
      {phase === 'betting' && round && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center gap-2">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              className="w-24 rounded-lg border border-white/10 bg-night px-3 py-2 text-sm tabular-nums outline-none focus:border-accent/50"
            />
            <span className="text-xs text-white/50">{t('live.stakeSol')}</span>
            {/* Hoechsteinsatz AM Feld (Systemvertrag — nie entfernen): Bei Live
                laeuft die Uhr; eine Ablehnung kostet die ganze Runde. */}
            <MaxBetPick onPick={setAmount} className="ml-auto" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {round.outcomes.map((o) => (
              <button
                key={o.index}
                type="button"
                disabled={busy || !connected}
                onClick={() => void placeBet(o.index)}
                className="rounded-lg border border-white/15 px-3 py-2 text-left text-sm hover:border-accent/50 disabled:opacity-40"
              >
                <span className="block font-semibold text-white">
                  #{o.index + 1} {o.label}
                </span>
                <span className="text-xs tabular-nums text-white/50">
                  {(o.oddsBps / 10000).toFixed(2)}×
                </span>
              </button>
            ))}
          </div>
          {!connected && (
            <p className="mt-2 text-xs text-white/40">{t('live.connectToBet')}</p>
          )}
          {msg && <p className="mt-2 text-xs text-amber-300/90">{msg}</p>}
        </div>
      )}

      {/* Meine Bets dieser Runde */}
      {myBets.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-white/50">{t('live.myBets')}</p>
          <ul className="space-y-1 text-sm">
            {myBets.map((b) => (
              <li key={b.betId} className="flex items-baseline justify-between tabular-nums">
                <span className="text-white/70">
                  #{b.outcomeIndex + 1} · {toSol(b.betLamports)} ◎ @{' '}
                  {(b.oddsBps / 10000).toFixed(2)}×
                </span>
                {/* Während des Reveals bewusst neutral — kein Ergebnis-Leak. */}
                <span
                  className={
                    phase === 'settled' && b.status === 'won'
                      ? 'font-semibold text-accent'
                      : 'text-white/40'
                  }
                >
                  {phase === 'settled'
                    ? b.status === 'won'
                      ? `+${toSol(b.payoutLamports)} ◎`
                      : b.status === 'lost'
                        ? '—'
                        : b.status
                    : t('live.potential', { amount: toSol(b.potentialPayoutLamports) })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Nachpruefbarkeit (Systemvertrag — nie entfernen): JEDE
          abgeschlossene Runde bekommt ihren Direktlink in den Sol-Core
          Scanner. Live-Runden hatten bis zum 28.08.2026 gar keinen. */}
      {displayRound && (phase === 'settled' || phase === 'revealing') && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs">
          <div className="mb-1 uppercase tracking-wide text-white/50">{t('verify.title')}</div>
          <div className="break-all text-white/60">Runde #{displayRound.roundNo}</div>
          <VerifyLink verifierUrl={verifierUrl} id={displayRound.roundId} className="mt-1" />
        </div>
      )}
      
      {/* Ergebnis-Ticker */}
      {recent.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="mb-2 text-[11px] uppercase tracking-wide text-white/40">{t('live.recentResults')}</p>
          <div className="flex flex-wrap gap-1.5">
            {recent.map((r) => (
              <span
                key={r.roundNo}
                className="rounded-md bg-white/[0.06] px-2 py-1 text-xs tabular-nums text-white/60"
                title={t('verify.roundNo', { no: r.roundNo })}
              >
                #{r.outcomeIndex + 1}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
