'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import type { EngineDef } from '@/lib/engines';
import type { DriftPlayerView, DriftStateView } from '@/lib/solcore';
import {
  currentValueBps,
  driftCashoutDisplayBps,
  driftPayoutLamports,
  effectiveTargetBps,
  peakOfPathBps,
  safetyTargetAccepted,
  timeFraction,
} from '@/lib/drift-math';
import { solToLamports, toSol } from '@/lib/lamports';
import { toUiError } from '@/lib/errors';
import { useT } from '@/lib/i18n';
import type { StringKey } from '@/lib/strings';
import { usePlayerAuth } from '@/lib/player-auth';
import { useBetLimits } from '@/lib/bet-limits';
import { MaxBetPick } from './BetLimitHint';
import { FiatHint } from './FiatHint';
import { VerifyLink } from './VerifyLink';
import { DRIFT_THEME, DriftTrackView, formatValue } from './DriftTrackView';

/**
 * Live Drift — eine geteilte Spur, die hoch UND runter läuft (Etappe 1: NUR
 * Spielgeld).
 *
 * Aufbau wie `LiveCrashGame.tsx`, mit EINEM entscheidenden Unterschied:
 *
 *   Bei Crash rechnet der Browser die Kurve selbst (m(t) = 2^(t/4s) ist eine
 *   öffentliche Formel). DIE DRIFT-SPUR KANN ER NICHT RECHNEN — sie steckt im
 *   Seed und ist bis zum Rundenende geheim. Der Server enthüllt sie tickweise
 *   und liefert das verstrichene Präfix im Zustand mit (`round.path`). Diese
 *   Datei zeichnet deshalb ausschließlich, was angekommen ist, und
 *   extrapoliert nie — kein „Weiterrechnen" zwischen zwei Abrufen.
 *
 *   Praktische Folge: Der Abruf-Takt IST die Bildrate der Spur. Er liegt im
 *   Lauf bei 250 ms, also unter der Tick-Länge von 500 ms — kein Tick wird
 *   übersprungen, und die Zahl steht nie länger als einen halben Tick still.
 *   Ein 60-Hz-Animationstakt wie bei Crash wäre hier sinnlos: zwischen zwei
 *   Ticks gibt es schlicht nichts zu zeigen.
 *
 * Wie bei Crash gilt: DAS SPIEL FOLGT DEM SCHALTER. Der Zustands-Poll liefert
 * `realMoney` (aus `platform_engines`); danach — und nur danach — wählt das
 * Spiel seine Routen. Solange der Schalter aus ist, laufen ausschließlich die
 * `demo-*`-Zwillinge. (Die Echtgeld-Routen dieser Engine folgen mit der
 * Echtgeld-Etappe; bis dahin bleibt der Zweig bewusst leer statt auf eine
 * Route zu zeigen, die es noch nicht gibt.)
 *
 * Der Server bleibt in jeder Frage die Autorität: Der Knopf zeigt den Stand,
 * den der Server zuletzt geliefert hat — WELCHER Stand gutgeschrieben wird,
 * entscheidet allein die Datenbank-Uhr im Cashout-Handler.
 *
 * ★ Die Gestaltungszone ist `DriftTrackView.tsx` (Spur, Farben, Thema).
 */

/** Takt der Engine — Rückfalllinien, falls der Server sie nicht mitschickt
 * (`LIVE_DRIFT` im API-Repo). Die Werte aus `state.curve` gewinnen immer. */
const TICK_MS_FALLBACK = 500;
const MAX_TICKS_FALLBACK = 120;
const KEEP_FRACTION_BPS_FALLBACK = 9_700;
/** Ergebnisanzeige nach Rundenende (`LIVE_DRIFT.pauseMs`) — nur für den
 * Countdown „nächste Runde in …", nie für eine Spielentscheidung. */
const PAUSE_MS = 4_000;
/** Client-Sperre kurz VOR dem Server-Lock — wie in `LiveCrashGame.tsx`. */
const CLIENT_LOCK_MS = 500;

/**
 * Abruf-Takt. Im Lauf BEWUSST kürzer als ein Tick (500 ms): der Abruf ist
 * hier die einzige Quelle neuer Spur-Werte, anders als bei Crash, wo der
 * Browser zwischen zwei Abrufen selbst weiterrechnen kann.
 */
const POLL_LAUF_MS = 250;
const POLL_RUHE_MS = 1_000;

/**
 * Spiegelt `shortenWallet` aus `services/live-drift-public.ts` (erste 4 und
 * letzte 4 Zeichen). Der Server schickt Mitspieler nur gekürzt — um die eigene
 * Zeile wiederzuerkennen, muss der Client dieselbe Kürzung bilden. Eine
 * Kollision wäre rein kosmetisch; über Geld entscheidet immer die volle
 * Wallet auf dem Server.
 */
export function shortenWallet(wallet: string): string {
  return wallet.length <= 10 ? wallet : `${wallet.slice(0, 4)}…${wallet.slice(-4)}`;
}

type UiPhase = 'betting' | 'flying' | 'ended' | 'settled';

const PHASE_BADGE_KEY: Record<UiPhase, StringKey> = {
  betting: 'drift.bettingOpen',
  flying: 'drift.inRun',
  ended: 'drift.phaseEnded',
  settled: 'drift.phaseSettled',
};

const PLAYER_STATUS_KEY: Record<DriftPlayerView['status'], StringKey> = {
  placed: 'drift.playerRunning',
  cashed: 'drift.playerOut',
  won: 'drift.playerWon',
  lost: 'drift.playerLost',
};

export function LiveDriftGame({
  engine,
  verifierUrl,
}: {
  engine: EngineDef;
  verifierUrl: string;
}) {
  const { publicKey, connected } = useWallet();
  const wallet = publicKey?.toBase58() ?? null;
  // Für die Echtgeld-Etappe vorgesehen; im Spielgeld-Modus ungenutzt.
  usePlayerAuth();
  const betLimits = useBetLimits();
  const t = useT();

  const [state, setState] = useState<DriftStateView | null>(null);
  const [offsetMs, setOffsetMs] = useState(0);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [amount, setAmount] = useState('0.10');
  const [safety, setSafety] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [myBet, setMyBet] = useState<
    { roundId: string; betLamports: string; safetyTargetBps: number | null } | null
  >(null);
  const [myCashout, setMyCashout] = useState<
    { roundId: string; valueBps: number; payoutLamports: string } | null
  >(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // ── Poll-Schleife: geteilter Zustand + Spur-Präfix + Mitspieler ──
  const refresh = useCallback(async () => {
    try {
      const s = (await fetch('/api/live-drift/state').then((r) => r.json())) as DriftStateView & {
        error?: { code?: string };
      };
      if (!alive.current || s.error) return;
      setState(s);
      // Der Server ist die Uhr — jeder Countdown rechnet gegen diesen Versatz.
      setOffsetMs(new Date(s.serverTime).getTime() - Date.now());
    } catch {
      /* nächster Tick versucht es erneut */
    }
  }, []);

  const round = state?.round ?? null;
  const running = round?.status === 'flying';
  // Fehlendes Feld (älterer API-Stand) zählt als Spielgeld — die sichere
  // Richtung: lieber Übungsmodus anbieten, wo Echtgeld ginge, als umgekehrt.
  const realMoney = state?.realMoney === true;

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), running ? POLL_LAUF_MS : POLL_RUHE_MS);
    return () => clearInterval(id);
  }, [refresh, running]);

  // Sekundentakt NUR für die Countdowns (Wettfenster, nächste Runde) — die
  // Spur selbst bewegt sich ausschließlich mit neuen Server-Daten.
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const serverNow = nowTick + offsetMs;
  const tickMs = state?.curve?.tickMs ?? TICK_MS_FALLBACK;
  const maxTicks = state?.curve?.maxTicks ?? MAX_TICKS_FALLBACK;
  const keepFractionBps = state?.curve?.keepFractionBps ?? KEEP_FRACTION_BPS_FALLBACK;

  let phase: UiPhase = 'betting';
  if (round?.status === 'flying') phase = 'flying';
  else if (round?.status === 'ended') phase = 'ended';
  else if (round?.status === 'settled' || round?.status === 'void') phase = 'settled';

  // Die Spur — genau das, was der Server enthüllt hat. Kein Weiterrechnen.
  const path = round?.path ?? [];
  const shownValueBps = currentValueBps(path);
  const seenPeakBps = peakOfPathBps(path);
  // Erst ab `ended` liefert der Server den Ausgang; vorher ist er null und
  // taucht nirgends auf.
  const revealedEndReason =
    phase === 'ended' || phase === 'settled' ? round?.endReason ?? null : null;

  // ── Eigene Wette dieser Runde ──
  const roundId = round?.roundId ?? null;
  const betThisRound = myBet && myBet.roundId === roundId ? myBet : null;
  const cashoutThisRound = myCashout && myCashout.roundId === roundId ? myCashout : null;
  const players = state?.players ?? [];
  const shortMe = wallet ? shortenWallet(wallet) : null;
  const mine = shortMe ? players.find((p) => p.wallet === shortMe) ?? null : null;
  const myCashoutBps = cashoutThisRound?.valueBps ?? mine?.cashoutValueBps ?? null;
  const iAmIn = mine !== null || betThisRound !== null;

  // Der Deckel des Creators — aus derselben Spiel-Config, mit der der Server
  // beim Cashout rechnet. `null` heißt „unbekannt".
  const ceilingBps = state?.config?.ceilingBps ?? null;

  // Was ein Klick JETZT brächte, zusammengesetzt aus GENAU den Regeln, die der
  // Server anwendet (`driftCashoutDisplayBps` spiegelt `driftCashoutValueBps`):
  // Ziel bereits berührt ⇒ das Ziel, sonst der aktuelle Stand, gedeckelt.
  // `null` heißt: dieser Browser kennt die Deckelung nicht sicher und nennt
  // deshalb lieber GAR KEINE Zahl.
  const targetKnown = betThisRound !== null;
  const myTargetBps = betThisRound?.safetyTargetBps ?? null;
  const clickBps = driftCashoutDisplayBps({
    path,
    ceilingBps,
    safetyTargetBps: myTargetBps,
    targetKnown,
  });
  // Das wirksame Ziel der eigenen Wette: den zahlt der Server auch OHNE Klick,
  // sobald die Spur ihn BERÜHRT (`resolveDriftBetValueBps`, Fall 2) — auch
  // wenn sie danach wieder fällt oder reißt.
  const myEffectiveTargetBps =
    targetKnown && ceilingBps !== null ? effectiveTargetBps(ceilingBps, myTargetBps) : null;
  const targetHit = myEffectiveTargetBps !== null && seenPeakBps >= myEffectiveTargetBps;

  const lockInMs = round ? new Date(round.locksAt).getTime() - serverNow : 0;
  const bettingOpen = round?.status === 'betting' && lockInMs > CLIENT_LOCK_MS;
  const canBet = bettingOpen && connected && !!wallet && !iAmIn && !busy;
  // Der Poll hinkt bis zu 250 ms hinterher; wer gerade gesetzt hat, darf
  // trotzdem sofort aussteigen — die Liste bestätigt es kurz darauf.
  const openBet = mine ? mine.status === 'placed' : betThisRound !== null;
  const canCashout = running && !!wallet && openBet && !cashoutThisRound && !busy;

  // Zwischen zwei Runden: der Countdown läuft ab dem Rundenende.
  const endedAtMs = round?.endedAt ? new Date(round.endedAt).getTime() : null;
  const nextInMs = endedAtMs !== null ? endedAtMs + PAUSE_MS - serverNow : null;
  const zeitAnteil = timeFraction(path.length, maxTicks);
  const restSekunden = Math.max(0, Math.ceil(((maxTicks - Math.max(0, path.length - 1)) * tickMs) / 1000));

  // Eine Meldung gehört zu ihrer Runde — beim Rundenwechsel ist sie erledigt.
  const shownRound = useRef<string | null>(null);
  useEffect(() => {
    if (shownRound.current !== roundId) {
      shownRound.current = roundId;
      setMsg(null);
    }
  }, [roundId]);

  const showError = (e: { code?: string; message?: string; reason?: string }) => {
    const ui = toUiError(e.code, e.message ?? t('common.unknownError'), e.reason);
    setMsg(`${ui.code}: ${ui.message}`);
  };

  // ── Mitlaufen ──
  const placeBet = async () => {
    if (!wallet || !round || !bettingOpen) return;
    let betLamports: bigint;
    try {
      betLamports = solToLamports(amount);
    } catch {
      setMsg(t('drift.stakeNaN'));
      return;
    }
    let safetyTargetBps: number | null = null;
    const raw = safety.trim().replace(',', '.');
    if (raw !== '') {
      const x = Number(raw);
      if (!Number.isFinite(x)) {
        setMsg(t('drift.autoNaN'));
        return;
      }
      const wanted = Math.round(x * 10_000);
      // Dieselbe Grenze, die der Server mit API-824 zieht — hier VOR dem
      // Absenden geprüft und mit der konkreten Zahl benannt.
      if (!safetyTargetAccepted(wanted, ceilingBps)) {
        setMsg(
          ceilingBps !== null && wanted > ceilingBps
            ? t('drift.autoTooHigh', { max: formatValue(ceilingBps) })
            : t('drift.autoTooLow'),
        );
        return;
      }
      safetyTargetBps = wanted;
    }
    setBusy(true);
    setMsg(null);
    try {
      const body = {
        roundId: round.roundId,
        playerWallet: wallet,
        betLamports: betLamports.toString(),
        safetyTargetBps,
      };
      // Etappe 1 kennt nur den Spielgeld-Pfad. Die Echtgeld-Zwillinge kommen
      // mit der Echtgeld-Etappe; bis dahin wäre ein `realMoney`-Zweig hier
      // ein Verweis auf eine Route, die es nicht gibt.
      const r = (await fetch('/api/live-drift/demo-bet', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }).then((res) => res.json())) as {
        betId?: string;
        error?: { code?: string; message?: string; reason?: string };
      };
      if (r.error) {
        showError(r.error);
        return;
      }
      setMyBet({ roundId: round.roundId, betLamports: betLamports.toString(), safetyTargetBps });
      await refresh();
      betLimits.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // ── Aussteigen ──
  const cashout = async () => {
    if (!wallet || !round) return;
    setBusy(true);
    setMsg(null);
    try {
      const body = { roundId: round.roundId, playerWallet: wallet };
      const r = (await fetch('/api/live-drift/demo-cashout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }).then((res) => res.json())) as {
        valueBps?: number;
        payoutLamports?: string;
        error?: { code?: string; message?: string; reason?: string };
      };
      if (r.error) {
        showError(r.error);
        return;
      }
      if (typeof r.valueBps === 'number' && typeof r.payoutLamports === 'string') {
        // Der Server sagt, zu welchem Stand er ausgestiegen ist — nicht der Knopf.
        setMyCashout({
          roundId: round.roundId,
          valueBps: r.valueBps,
          payoutLamports: r.payoutLamports,
        });
      }
      await refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!state) {
    return (
      <div
        className="border p-4 text-sm"
        style={{
          ...DRIFT_THEME,
          borderRadius: 'var(--drift-radius)',
          borderColor: 'var(--drift-line)',
          background: 'var(--drift-panel)',
          color: 'var(--drift-muted)',
        }}
      >
        {t('drift.loadingRun')}
      </div>
    );
  }

  const badgeColor =
    phase === 'betting'
      ? 'var(--drift-up)'
      : revealedEndReason === 'bust'
        ? 'var(--drift-down)'
        : 'var(--drift-text)';

  return (
    <div className="space-y-3" style={{ ...DRIFT_THEME, fontFamily: 'var(--drift-font)' }}>
      {/* ── Kopf: Stream, Runde, Phase ── */}
      <div
        className="flex items-center justify-between gap-3 border p-3"
        style={{
          borderRadius: 'var(--drift-radius)',
          borderColor: 'var(--drift-line)',
          background: 'var(--drift-panel)',
        }}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-bold" style={{ color: 'var(--drift-text)' }}>
            {state.stream.displayName}
          </p>
          <p className="truncate text-xs" style={{ color: 'var(--drift-muted)' }}>
            {t('verify.roundNo', { no: round?.roundNo ?? '—' })} ·{' '}
            {t(realMoney ? 'drift.realMoney' : 'drift.playMoney')}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
          style={{ color: badgeColor, background: 'var(--drift-panel-strong)' }}
        >
          {!round
            ? t('drift.starting')
            : phase === 'betting'
              ? `${t('drift.bettingOpen')} · ${Math.max(0, Math.ceil(lockInMs / 1000))}s`
              : phase === 'flying'
                ? `${t('drift.inRun')} · ${restSekunden}s`
                : t(PHASE_BADGE_KEY[phase])}
        </span>
      </div>

      {/* Übungsmodus ausdrücklich benennen (Systemvertrag — nie entfernen). */}
      {!realMoney && (
        <p
          className="border px-3 py-2 text-xs"
          style={{
            borderRadius: 'var(--drift-radius)',
            borderColor: 'var(--drift-line)',
            background: 'var(--drift-panel)',
            color: 'var(--drift-muted)',
          }}
        >
          <strong style={{ color: 'var(--drift-text)' }}>{t('drift.practiceTitle')}</strong>{' '}
          {t('drift.practiceBody')}
        </p>
      )}

      {/* ★ Gestaltungszone: die Spur */}
      <DriftTrackView
        phase={phase}
        path={path}
        cashoutValueBps={myCashoutBps}
        endReason={revealedEndReason}
        timeFraction={zeitAnteil}
      />

      {/* ── Aktionsfeld ── */}
      <div
        className="border p-3"
        style={{
          borderRadius: 'var(--drift-radius)',
          borderColor: 'var(--drift-line)',
          background: 'var(--drift-panel)',
        }}
      >
        {!round && (
          <p className="py-2 text-center text-sm" style={{ color: 'var(--drift-muted)' }}>
            {t('drift.preparing')}
          </p>
        )}

        {round && phase === 'betting' && !iAmIn && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex-1 basis-28">
                {/* Höchsteinsatz AM Feld (Systemvertrag — nie entfernen). */}
                <span
                  className="mb-1 flex items-baseline justify-between gap-2 text-[11px] uppercase tracking-wide"
                  style={{ color: 'var(--drift-muted)' }}
                >
                  <span className="min-w-0 truncate">
                    {t('drift.stake')}{' '}
                    <FiatHint sol={amount} className="normal-case tracking-normal" />
                  </span>
                  <MaxBetPick onPick={setAmount} className="normal-case tracking-normal" />
                </span>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  aria-label={t('drift.stakeAria')}
                  className="w-full rounded-lg border px-3 py-2 text-sm tabular-nums outline-none"
                  style={{
                    borderColor: 'var(--drift-line)',
                    background: 'var(--drift-panel-strong)',
                    color: 'var(--drift-text)',
                  }}
                />
              </label>
              <label className="flex-1 basis-28">
                <span
                  className="mb-1 block text-[11px] uppercase tracking-wide"
                  style={{ color: 'var(--drift-muted)' }}
                >
                  {t('drift.autoExit')}
                  {ceilingBps !== null && (
                    <span className="normal-case tracking-normal">
                      {' '}
                      · max {formatValue(ceilingBps)}×
                    </span>
                  )}
                </span>
                <input
                  value={safety}
                  onChange={(e) => setSafety(e.target.value)}
                  inputMode="decimal"
                  placeholder={ceilingBps !== null ? `bis ${formatValue(ceilingBps)}` : 'optional'}
                  aria-label={
                    ceilingBps !== null
                      ? t('drift.autoAria', { max: formatValue(ceilingBps) })
                      : t('drift.autoAriaNoCap')
                  }
                  className="w-full rounded-lg border px-3 py-2 text-sm tabular-nums outline-none"
                  style={{
                    borderColor: 'var(--drift-line)',
                    background: 'var(--drift-panel-strong)',
                    color: 'var(--drift-text)',
                  }}
                />
              </label>
            </div>
            <button
              type="button"
              disabled={!canBet}
              onClick={() => void placeBet()}
              className="w-full rounded-lg px-4 py-3 text-base font-black uppercase tracking-wide disabled:opacity-40"
              style={{ background: 'var(--drift-up)', color: 'var(--drift-on-accent)' }}
            >
              {t('drift.joinRun')}
            </button>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--drift-muted)' }}>
              {!connected ? t('drift.connectToPlay') : t('drift.rulesHint')}
            </p>
          </div>
        )}

        {round && phase === 'betting' && iAmIn && (
          <div className="text-center">
            <p className="text-sm font-bold" style={{ color: 'var(--drift-up)' }}>
              {t('drift.aboard')}
            </p>
            <p className="mt-1 text-xs" style={{ color: 'var(--drift-muted)' }}>
              {t('drift.startsIn', { s: Math.max(0, Math.ceil(lockInMs / 1000)) })}
            </p>
          </div>
        )}

        {phase === 'flying' && !iAmIn && (
          <p className="py-2 text-center text-sm" style={{ color: 'var(--drift-muted)' }}>
            {t('drift.notAboard')}
          </p>
        )}

        {phase === 'flying' && iAmIn && (
          <div className="space-y-2">
            <button
              type="button"
              disabled={!canCashout}
              onClick={() => void cashout()}
              className="w-full rounded-lg px-4 py-4 text-lg font-black uppercase tracking-wide disabled:opacity-60"
              style={{
                background: canCashout ? 'var(--drift-mark)' : 'var(--drift-panel-strong)',
                color: canCashout ? 'var(--drift-on-accent)' : 'var(--drift-mark)',
              }}
            >
              {canCashout
                ? clickBps !== null
                  ? `${t('drift.exitNow')} · ${formatValue(clickBps)}×`
                  : t('drift.exitNow')
                : myCashoutBps !== null
                  ? t('drift.outAt', { value: formatValue(myCashoutBps) })
                  : t('drift.oneMoment')}
            </button>
            {canCashout && clickBps === null && (
              <p className="text-center text-xs leading-relaxed" style={{ color: 'var(--drift-muted)' }}>
                {!targetKnown ? t('drift.noNumberOtherSession') : t('drift.noNumberNoCap')}
              </p>
            )}
            {canCashout && betThisRound && clickBps !== null && (
              <p className="text-center text-xs tabular-nums" style={{ color: 'var(--drift-muted)' }}>
                {/* Netto, mit Keep-Anteil — genau der Betrag, den der Server
                    gutschreibt (`driftPayoutLamports`). Bei Crash steht hier
                    brutto; Drift zieht 3 % ab, und das muss man sehen. */}
                {t('drift.stakeWorth', {
                  stake: toSol(betThisRound.betLamports),
                  worth: toSol(
                    driftPayoutLamports(
                      BigInt(betThisRound.betLamports),
                      clickBps,
                      keepFractionBps,
                    ),
                  ),
                })}
              </p>
            )}
            {canCashout && myEffectiveTargetBps !== null && (
              <p className="text-center text-xs tabular-nums" style={{ color: 'var(--drift-mark)' }}>
                {targetHit
                  ? t('drift.targetAlreadyHit', { value: formatValue(myEffectiveTargetBps) })
                  : myTargetBps !== null
                    ? t('drift.autoExitAt', { value: formatValue(myEffectiveTargetBps) })
                    : t('drift.capExitAt', { value: formatValue(myEffectiveTargetBps) })}
              </p>
            )}
          </div>
        )}

        {(phase === 'ended' || phase === 'settled') && (
          <div className="text-center">
            {mine?.status === 'won' || mine?.status === 'cashed' || cashoutThisRound ? (
              <p className="text-sm font-bold" style={{ color: 'var(--drift-up)' }}>
                {t('drift.gotOut')}
                {myCashoutBps !== null ? ` · ${formatValue(myCashoutBps)}×` : ''}
                {cashoutThisRound ? ` · ${toSol(cashoutThisRound.payoutLamports)} ◎` : ''}
              </p>
            ) : mine?.status === 'lost' ? (
              <p className="text-sm font-bold" style={{ color: 'var(--drift-down)' }}>
                {t('drift.lostAtZero')}
              </p>
            ) : iAmIn ? (
              <p className="text-sm" style={{ color: 'var(--drift-muted)' }}>
                {t('drift.settling')}
              </p>
            ) : (
              <p className="text-sm" style={{ color: 'var(--drift-muted)' }}>
                {t('drift.roundDone')}
              </p>
            )}
            <p className="mt-1 text-xs tabular-nums" style={{ color: 'var(--drift-muted)' }}>
              {nextInMs !== null && nextInMs > 0
                ? t('live.nextRoundIn', { s: Math.ceil(nextInMs / 1000) })
                : t('live.nextRoundStarts')}
            </p>
          </div>
        )}

        {msg && (
          <p className="mt-2 text-center text-xs" style={{ color: 'var(--drift-down)' }}>
            {msg}
          </p>
        )}
      </div>

      {/* ── Mitspieler: der soziale Kern dieser Engine ── */}
      <div
        className="border p-3"
        style={{
          borderRadius: 'var(--drift-radius)',
          borderColor: 'var(--drift-line)',
          background: 'var(--drift-panel)',
        }}
      >
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--drift-muted)' }}>
            {t('drift.inTheRun')}
          </p>
          <p className="text-[11px] tabular-nums" style={{ color: 'var(--drift-muted)' }}>
            {players.length}
          </p>
        </div>
        {players.length === 0 ? (
          <p className="py-2 text-center text-xs" style={{ color: 'var(--drift-muted)' }}>
            {t('drift.nobodyAboard')}
          </p>
        ) : (
          <ul className="space-y-1">
            {players.slice(0, 12).map((p, i) => {
              const isMe = shortMe !== null && p.wallet === shortMe;
              const won = p.status === 'cashed' || p.status === 'won';
              return (
                <li
                  key={`${p.wallet}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs"
                  style={{ background: isMe ? 'var(--drift-mine)' : 'transparent' }}
                >
                  <span className="min-w-0 flex-1 truncate" style={{ color: 'var(--drift-text)' }}>
                    {isMe ? t('drift.you') : p.wallet}
                  </span>
                  <span className="shrink-0 tabular-nums" style={{ color: 'var(--drift-muted)' }}>
                    {toSol(p.betLamports)} ◎
                  </span>
                  <span
                    className="w-20 shrink-0 text-right font-bold tabular-nums"
                    style={{
                      color: won
                        ? 'var(--drift-up)'
                        : p.status === 'lost'
                          ? 'var(--drift-down)'
                          : 'var(--drift-muted)',
                    }}
                  >
                    {/* Ein noch laufender Mitspieler verrät sein Ziel nie —
                        der Server liefert dafür `null`. */}
                    {p.cashoutValueBps !== null
                      ? `${formatValue(p.cashoutValueBps)}×`
                      : t(PLAYER_STATUS_KEY[p.status])}
                  </span>
                </li>
              );
            })}
            {players.length > 12 && (
              <li className="pt-1 text-center text-[11px]" style={{ color: 'var(--drift-muted)' }}>
                {t('drift.andMore', { n: players.length - 12 })}
              </li>
            )}
          </ul>
        )}
      </div>

      {/* ── Nachprüfbarkeit: Hash vor dem Start, Seed nach dem Ende ── */}
      <div
        className="border p-3 text-[11px] leading-relaxed"
        style={{
          borderRadius: 'var(--drift-radius)',
          borderColor: 'var(--drift-line)',
          background: 'var(--drift-panel)',
          color: 'var(--drift-muted)',
        }}
      >
        <p>{engine.live?.hint ?? t('drift.hint')}</p>
        {round && (
          <p className="mt-2 break-all">
            <span className="uppercase tracking-wide">{t('crash.seedHash')}</span> {round.serverSeedHash}
            {/* Der Seed kommt erst mit dem Rundenende — vorher gibt es hier
                nichts zu zeigen, und genau das ist der Punkt: mit ihm ließe
                sich die ganze Spur im Voraus ausrechnen. */}
            {round.serverSeed && (
              <>
                <br />
                <span className="uppercase tracking-wide">{t('crash.seed')}</span> {round.serverSeed}
              </>
            )}
          </p>
        )}
        <p className="mt-2">{t('drift.fairnessNote')}</p>
        {/* Nachprüfbarkeit (Systemvertrag — nie entfernen). */}
        {round && (phase === 'ended' || phase === 'settled') && (
          <VerifyLink verifierUrl={verifierUrl} id={round.roundId} className="mt-2" />
        )}
      </div>
    </div>
  );
}
