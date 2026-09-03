'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import type { EngineDef } from '@/lib/engines';
import type { CrashPlayerView, CrashStateView } from '@/lib/solcore';
import {
  cashoutDisplayBps,
  effectiveTargetBps,
  multiplierBpsAt,
  safetyTargetAccepted,
} from '@/lib/crash-math';
import { solToLamports, toSol } from '@/lib/lamports';
import { toUiError } from '@/lib/errors';
import { useT } from '@/lib/i18n';
import type { StringKey } from '@/lib/strings';
import { usePlayerAuth } from '@/lib/player-auth';
import { useBetLimits } from '@/lib/bet-limits';
import { MaxBetPick } from './BetLimitHint';
import { VerifyLink } from './VerifyLink';
import { CRASH_THEME, CrashCurveView, formatMultiplier } from './CrashCurveView';

/**
 * Live Crash — ein geteilter Flug, viele Spieler (Etappe 2: NUR Spielgeld).
 *
 * Aufbau wie `LiveGame.tsx`: Sekunden-Poll auf den geteilten Zustand, alle
 * Zeitrechnung über den Uhrenversatz zum Server. Zwei Unterschiede:
 *
 *  1. Die Kurve wird LOKAL gezeichnet — deshalb braucht diese Engine keinen
 *     Stream und keine Zwischenwerte vom Server. Der Server liefert den
 *     Abflugzeitpunkt, der Browser rechnet daraus dieselbe Formel wie der
 *     Server (`multiplierBpsAt`). Zwei Browser auf derselben Runde zeigen
 *     zwangsläufig dasselbe Bild.
 *  2. DAS SPIEL FOLGT DEM SCHALTER. Der Zustands-Poll liefert `realMoney`
 *     (aus `platform_engines`); danach — und nur danach — waehlt das Spiel
 *     seine Routen: Echtgeld ueber `moneyFetch` (Spieler-Token Pflicht),
 *     Spielgeld ueber normales `fetch` auf die `demo-*`-Zwillinge.
 *
 *     WARUM NICHT EINE FESTE ANNAHME: Am 28.08.2026 meldete das Dashboard
 *     zweimal „Echtgeld an", waehrend das ausgerollte Spiel weiter die
 *     Spielgeld-Routen rief. Eine Annahme im Bundle kann einem Schalter im
 *     Betrieb nicht folgen — ein Poll kann es.
 *
 * Der Server bleibt in jeder Frage die Autorität: Der Knopf zeigt den Stand,
 * den der Browser gerade zeichnet — WELCHER Multiplikator gutgeschrieben wird,
 * entscheidet allein die Datenbank-Uhr im Cashout-Handler.
 *
 * ★ Die Gestaltungszone ist `CrashCurveView.tsx` (Kurve, Farben, Thema).
 */

/** Verdopplungszeit — Rückfalllinie, falls der Server sie mal nicht mitschickt
 * (`LIVE_CRASH.doubleMs` im API-Repo). Der Wert aus `state.curve` gewinnt. */
const DOUBLE_MS_FALLBACK = 4_000;
/** Ergebnisanzeige nach dem Crash (`LIVE_CRASH.pauseMs`) — nur für den
 * Countdown „nächste Runde in …", nie für eine Spielentscheidung. */
const PAUSE_MS = 4_000;
/** Client-Sperre kurz VOR dem Server-Lock — wie in `LiveGame.tsx`. Der
 * Server-Gate (DB-Uhr) bleibt die Autorität. */
const CLIENT_LOCK_MS = 500;

/**
 * Spiegelt `shortenWallet` aus `services/live-crash-public.ts` (erste 4 und
 * letzte 4 Zeichen). Der Server schickt Mitspieler nur gekürzt — um die eigene
 * Zeile wiederzuerkennen, muss der Client dieselbe Kürzung bilden. Eine
 * Kollision wäre rein kosmetisch (falsch markierte Zeile); über Geld
 * entscheidet immer die volle Wallet auf dem Server.
 */
export function shortenWallet(wallet: string): string {
  return wallet.length <= 10 ? wallet : `${wallet.slice(0, 4)}…${wallet.slice(-4)}`;
}

/** `prefers-reduced-motion` — dann läuft statt 60 Hz ein Sekundentakt. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** Abruf-Takt: im Flug schnell, sonst sparsam. */
const POLL_FLUG_MS = 300;
const POLL_RUHE_MS = 1_000;
/**
 * Wie weit die Anzeige dem letzten bestaetigten Serverstand vorauslaufen darf.
 * Grosszuegig genug, dass sie im Normalfall fluessig laeuft, und eng genug,
 * dass ein Verbindungsabriss die Zahl anhaelt statt sie davonlaufen zu lassen.
 */
const VORLAUF_MS = 900;

type UiPhase = 'betting' | 'flying' | 'crashed' | 'settled';

/** Beschriftung je Phase. Als FUNKTION statt Modul-Konstante: Texte haengen
 *  an der Sprache, und die kommt aus einem Hook. */
const PHASE_BADGE_KEY: Record<UiPhase, StringKey> = {
  betting: 'crash.bettingOpen',
  flying: 'crash.inFlight',
  crashed: 'crash.phaseCrash',
  settled: 'crash.phaseSettled',
};

const PLAYER_STATUS_KEY: Record<CrashPlayerView['status'], StringKey> = {
  placed: 'crash.playerFlying',
  cashed: 'crash.playerOut',
  won: 'crash.playerWon',
  lost: 'crash.playerLost',
};

export function LiveCrashGame({
  engine,
  verifierUrl,
}: {
  engine: EngineDef;
  verifierUrl: string;
}) {
  const { publicKey, connected } = useWallet();
  const wallet = publicKey?.toBase58() ?? null;
  const reduced = usePrefersReducedMotion();
  // Geld-Routen laufen im Echtgeld-Modus ausschliesslich hierueber (haengt das
  // Spieler-Token an). Im Spielgeld-Modus wird es nicht benutzt.
  const { moneyFetch } = usePlayerAuth();
  // Hoechsteinsatz — dieselbe Quelle wie die Geld-Leiste, damit Feld und
  // Leiste nie zwei verschiedene Zahlen zeigen.
  const betLimits = useBetLimits();
  const t = useT();

  const [state, setState] = useState<CrashStateView | null>(null);
  const [offsetMs, setOffsetMs] = useState(0);
  /** Serverzeit der letzten erfolgreichen Antwort — Obergrenze der Anzeige. */
  const [syncedServerMs, setSyncedServerMs] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [amount, setAmount] = useState('0.10');
  const [safety, setSafety] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  // Eigene Wette/Ausstieg tragen ihre roundId — damit braucht es keinen
  // Reset-Effekt beim Rundenwechsel, ein Vergleich genügt.
  const [myBet, setMyBet] = useState<
    { roundId: string; betLamports: string; safetyTargetBps: number | null } | null
  >(null);
  const [myCashout, setMyCashout] = useState<
    { roundId: string; multiplierBps: number; payoutLamports: string } | null
  >(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // ── Poll-Schleife: geteilter Zustand + Mitspieler (1 s) ──
  const refresh = useCallback(async () => {
    try {
      const s = (await fetch('/api/live-crash/state').then((r) => r.json())) as CrashStateView & {
        error?: { code?: string };
      };
      if (!alive.current || s.error) return;
      setState(s);
      // Der Server ist die Uhr — jede Kurvenzeit rechnet gegen diesen Versatz.
      const serverMs = new Date(s.serverTime).getTime();
      setOffsetMs(serverMs - Date.now());
      setSyncedServerMs(serverMs);
    } catch {
      /* nächster Tick versucht es erneut */
    }
  }, []);
  // Im Flug SCHNELLER fragen als sonst. Der Client kennt den Crash-Punkt
  // nicht (das ist Absicht) und erfaehrt das Ende erst beim naechsten Abruf —
  // bis dahin zeichnet er die Kurve weiter. Bei 4 s Verdopplungszeit sind
  // 1 s Nachlauf rund 19 % zu viel: gemeldet als Rakete, die auf 22x steigt,
  // waehrend das Ergebnis 16x lautet.
  const round = state?.round ?? null;
  const flying = round?.status === 'flying';
  // Fehlendes Feld (aelterer API-Stand) zaehlt als Spielgeld — die sichere
  // Richtung: lieber Uebungsmodus anbieten, wo Echtgeld ginge, als umgekehrt.
  const realMoney = state?.realMoney === true;

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), flying ? POLL_FLUG_MS : POLL_RUHE_MS);
    return () => clearInterval(id);
  }, [refresh, flying]);

  // ── Anzeige-Takt: 60 Hz im Flug, sonst (und unter reduced-motion) 1 Hz ──
  useEffect(() => {
    if (reduced || !flying) {
      const id = setInterval(() => setNowTick(Date.now()), 1_000);
      return () => clearInterval(id);
    }
    let raf = 0;
    const loop = () => {
      setNowTick(Date.now());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced, flying]);

  const serverNow = nowTick + offsetMs;
  const doubleMs = state?.curve?.doubleMs ?? DOUBLE_MS_FALLBACK;

  let phase: UiPhase = 'betting';
  if (round?.status === 'flying') phase = 'flying';
  else if (round?.status === 'crashed') phase = 'crashed';
  else if (round?.status === 'settled' || round?.status === 'void') phase = 'settled';

  // Der laufende Stand — reine Funktion aus (Serverzeit − Abflugzeit).
  const takeoffMs = round?.takeoffAt ? new Date(round.takeoffAt).getTime() : null;
  // Die Anzeige darf dem letzten BESTAETIGTEN Serverstand nur begrenzt
  // vorauslaufen. Ohne diese Schranke rechnet der Browser bei einem
  // Verbindungsabriss munter weiter und zeigt Fantasiewerte — die Kurve ist
  // exponentiell, nach 20 s stiller Leitung waere sie bei ueber 30x.
  // Mit Schranke friert die Zahl stattdessen sichtbar ein, bis wieder eine
  // Antwort da ist. Eine stehende Zahl ist ehrlich; eine steigende luegt.
  const kurvenZeit =
    syncedServerMs === null ? serverNow : Math.min(serverNow, syncedServerMs + VORLAUF_MS);
  const liveBps =
    flying && takeoffMs !== null ? multiplierBpsAt(kurvenZeit - takeoffMs, doubleMs) : 10_000;
  // Ab `crashed` liefert der Server den Crash-Punkt; vorher ist er null und
  // taucht nirgends auf.
  const revealedBps = phase === 'crashed' || phase === 'settled' ? round?.crashMultiplierBps ?? null : null;
  const shownBps = phase === 'flying' ? liveBps : revealedBps ?? 10_000;

  // ── Eigene Wette dieser Runde ──
  const roundId = round?.roundId ?? null;
  const betThisRound = myBet && myBet.roundId === roundId ? myBet : null;
  const cashoutThisRound = myCashout && myCashout.roundId === roundId ? myCashout : null;
  const players = state?.players ?? [];
  const shortMe = wallet ? shortenWallet(wallet) : null;
  // Nach einem Neuladen mitten im Flug ist der lokale Zustand leer — die
  // Mitspieler-Liste trägt die eigene Zeile trotzdem.
  const mine = shortMe ? players.find((p) => p.wallet === shortMe) ?? null : null;
  const myCashoutBps = cashoutThisRound?.multiplierBps ?? mine?.cashoutMultiplierBps ?? null;
  const iAmIn = mine !== null || betThisRound !== null;

  // Der Deckel des Creators — aus `/live-crash/state`, also aus derselben
  // Spiel-Config, mit der der Server beim Cashout rechnet. `null` heißt
  // „unbekannt" (älterer API-Stand ohne `state.config`).
  const ceilingBps = state?.config?.ceilingBps ?? null;

  // Was ein Klick JETZT brächte — zusammengesetzt aus GENAU den beiden
  // Regeln, die der Server anwendet (`cashoutDisplayBps` in
  // `lib/crash-math.ts` spiegelt `cashoutMultiplierFor ∘ effectiveTargetBps`):
  // Kurvenstand, eigenes Sicherheitsziel UND Creator-Deckel. `null` heißt:
  // dieser Browser kennt die Deckelung nicht sicher und nennt deshalb lieber
  // GAR KEINE Zahl, als eine falsche zu versprechen (Begründung der beiden
  // Fälle steht bei `cashoutDisplayBps`).
  const targetKnown = betThisRound !== null;
  const myTargetBps = betThisRound?.safetyTargetBps ?? null;
  const clickBps = cashoutDisplayBps({
    liveBps,
    ceilingBps,
    safetyTargetBps: myTargetBps,
    targetKnown,
  });
  // Das wirksame Ziel der eigenen Wette: der Stand, den der Server auch OHNE
  // Klick auszahlt, sobald die Kurve ihn erreicht (`resolveBetPayoutBps`).
  // Ohne Sicherheitsziel ist das der Deckel — deshalb ist die Zeile darunter
  // auch dann wahr, wenn der Spieler selbst kein Ziel gesetzt hat.
  const myEffectiveTargetBps =
    targetKnown && ceilingBps !== null ? effectiveTargetBps(ceilingBps, myTargetBps) : null;

  const lockInMs = round ? new Date(round.locksAt).getTime() - serverNow : 0;
  const bettingOpen = round?.status === 'betting' && lockInMs > CLIENT_LOCK_MS;
  const canBet = bettingOpen && connected && !!wallet && !iAmIn && !busy;
  // Der Poll hinkt bis zu 1 s hinterher; wer gerade gesetzt hat, darf trotzdem
  // sofort aussteigen — die Liste bestätigt es eine Sekunde später.
  const openBet = mine ? mine.status === 'placed' : betThisRound !== null;
  const canCashout = flying && !!wallet && openBet && !cashoutThisRound && !busy;

  // Zwischen zwei Runden: der Countdown läuft ab dem Crash-Zeitpunkt.
  const crashedAtMs = round?.crashedAt ? new Date(round.crashedAt).getTime() : null;
  const nextInMs = crashedAtMs !== null ? crashedAtMs + PAUSE_MS - serverNow : null;

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

  // ── Mitfliegen ──
  const placeBet = async () => {
    if (!wallet || !round || !bettingOpen) return;
    let betLamports: bigint;
    try {
      betLamports = solToLamports(amount);
    } catch {
      setMsg(t('crash.stakeNaN'));
      return;
    }
    let safetyTargetBps: number | null = null;
    const raw = safety.trim().replace(',', '.');
    if (raw !== '') {
      const x = Number(raw);
      if (!Number.isFinite(x)) {
        setMsg(t('crash.autoNaN'));
        return;
      }
      const wanted = Math.round(x * 10_000);
      // Dieselbe Grenze, die der Server mit API-824 zieht — hier VOR dem
      // Absenden geprüft und mit der konkreten Zahl benannt, statt den
      // Spieler in einen nackten Fehlercode laufen zu lassen.
      if (!safetyTargetAccepted(wanted, ceilingBps)) {
        setMsg(
          ceilingBps !== null && wanted > ceilingBps
            ? t('crash.autoTooHigh', { max: formatMultiplier(ceilingBps) })
            : t('crash.autoTooLow'),
        );
        return;
      }
      safetyTargetBps = wanted;
    }
    setBusy(true);
    setMsg(null);
    try {
      // Die Route entscheidet der Schalter, nicht der Knopf.
      const body = {
        roundId: round.roundId,
        playerWallet: wallet,
        betLamports: betLamports.toString(),
        safetyTargetBps,
      };
      const r = (realMoney
        ? await moneyFetch('/api/live-crash/bet', body)
        : await fetch('/api/live-crash/demo-bet', {
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
      // Der eigene Einsatz veraendert die Solvenzlage sofort — Grenze sofort
      // nachziehen statt bis zum naechsten 20-s-Takt zu warten.
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
      const r = (realMoney
        ? await moneyFetch('/api/live-crash/cashout', body)
        : await fetch('/api/live-crash/demo-cashout', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
          }).then((res) => res.json())) as {
        multiplierBps?: number;
        payoutLamports?: string;
        error?: { code?: string; message?: string; reason?: string };
      };
      if (r.error) {
        showError(r.error);
        return;
      }
      if (typeof r.multiplierBps === 'number' && typeof r.payoutLamports === 'string') {
        // Der Server sagt, zu welchem Stand er ausgestiegen ist — nicht der Knopf.
        setMyCashout({
          roundId: round.roundId,
          multiplierBps: r.multiplierBps,
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
          ...CRASH_THEME,
          borderRadius: 'var(--crash-radius)',
          borderColor: 'var(--crash-line)',
          background: 'var(--crash-panel)',
          color: 'var(--crash-muted)',
        }}
      >
        {t('crash.loadingFlight')}
      </div>
    );
  }

  const badgeColor =
    phase === 'betting'
      ? 'var(--crash-up)'
      : phase === 'crashed'
        ? 'var(--crash-down)'
        : 'var(--crash-text)';

  return (
    <div className="space-y-3" style={{ ...CRASH_THEME, fontFamily: 'var(--crash-font)' }}>
      {/* ── Kopf: Stream, Runde, Phase ── */}
      <div
        className="flex items-center justify-between gap-3 border p-3"
        style={{
          borderRadius: 'var(--crash-radius)',
          borderColor: 'var(--crash-line)',
          background: 'var(--crash-panel)',
        }}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-bold" style={{ color: 'var(--crash-text)' }}>
            {state.stream.displayName}
          </p>
          <p className="truncate text-xs" style={{ color: 'var(--crash-muted)' }}>
            {t('verify.roundNo', { no: round?.roundNo ?? '—' })} ·{' '}
            {t(realMoney ? 'crash.realMoney' : 'crash.playMoney')}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
          style={{ color: badgeColor, background: 'var(--crash-panel-strong)' }}
        >
          {!round
            ? t('crash.starting')
            : phase === 'betting'
              ? `${t('crash.bettingOpen')} · ${Math.max(0, Math.ceil(lockInMs / 1000))}s`
              : t(PHASE_BADGE_KEY[phase])}
        </span>
      </div>

      {/* Übungsmodus ausdrücklich benennen (Systemvertrag — nie entfernen).
          Die Geld-Leiste steht auch hier, und ihr Guthaben ist echt und
          spielübergreifend. Solange der Echtgeld-Schalter dieser Engine aus
          ist, wird es in DIESEM Spiel aber nicht bewegt — das muss dastehen,
          sonst zahlt jemand für eine Runde ein, die sein Geld gar nicht
          anfasst. */}
      {!realMoney && (
        <p
          className="border px-3 py-2 text-xs"
          style={{
            borderRadius: 'var(--crash-radius)',
            borderColor: 'var(--crash-line)',
            background: 'var(--crash-panel)',
            color: 'var(--crash-muted)',
          }}
        >
          <strong style={{ color: 'var(--crash-text)' }}>{t('crash.practiceTitle')}</strong> {t('crash.practiceBody')}
        </p>
      )}

      {/* ★ Gestaltungszone: die Kurve */}
      <CrashCurveView
        phase={phase}
        multiplierBps={shownBps}
        cashoutMultiplierBps={myCashoutBps}
        crashMultiplierBps={revealedBps}
      />

      {/* ── Aktionsfeld ── */}
      <div
        className="border p-3"
        style={{
          borderRadius: 'var(--crash-radius)',
          borderColor: 'var(--crash-line)',
          background: 'var(--crash-panel)',
        }}
      >
        {!round && (
          <p className="py-2 text-center text-sm" style={{ color: 'var(--crash-muted)' }}>
            {t('crash.preparing')}
          </p>
        )}

        {round && phase === 'betting' && !iAmIn && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex-1 basis-28">
                {/* Hoechsteinsatz AM Feld (Systemvertrag — nie entfernen):
                    Der erlaubte Einsatz ist das Minimum aus Spiel-, Level-,
                    Solvenz- und Rundendeckel und bewegt sich im Betrieb. Im
                    Flug ist eine Ablehnung besonders teuer — die Runde ist
                    dann weg. Klick uebernimmt die Zahl. */}
                <span
                  className="mb-1 flex items-baseline justify-between gap-2 text-[11px] uppercase tracking-wide"
                  style={{ color: 'var(--crash-muted)' }}
                >
                  <span>{t('crash.stake')}</span>
                  <MaxBetPick onPick={setAmount} className="normal-case tracking-normal" />
                </span>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  aria-label={t('crash.stakeAria')}
                  className="w-full rounded-lg border px-3 py-2 text-sm tabular-nums outline-none"
                  style={{
                    borderColor: 'var(--crash-line)',
                    background: 'var(--crash-panel-strong)',
                    color: 'var(--crash-text)',
                  }}
                />
              </label>
              <label className="flex-1 basis-28">
                <span className="mb-1 block text-[11px] uppercase tracking-wide" style={{ color: 'var(--crash-muted)' }}>
                  {t('crash.autoCashout')}
                  {ceilingBps !== null && (
                    <span className="normal-case tracking-normal">{t('crash.autoMax', { max: formatMultiplier(ceilingBps) })}</span>
                  )}
                </span>
                <input
                  value={safety}
                  onChange={(e) => setSafety(e.target.value)}
                  inputMode="decimal"
                  placeholder={ceilingBps !== null ? t('crash.upTo', { max: formatMultiplier(ceilingBps) }) : t('crash.optional')}
                  aria-label={
                    ceilingBps !== null
                      ? t('crash.autoAria', { max: formatMultiplier(ceilingBps) })
                      : t('crash.autoAriaNoCap')
                  }
                  className="w-full rounded-lg border px-3 py-2 text-sm tabular-nums outline-none"
                  style={{
                    borderColor: 'var(--crash-line)',
                    background: 'var(--crash-panel-strong)',
                    color: 'var(--crash-text)',
                  }}
                />
              </label>
            </div>
            <button
              type="button"
              disabled={!canBet}
              onClick={() => void placeBet()}
              className="w-full rounded-lg px-4 py-3 text-base font-black uppercase tracking-wide disabled:opacity-40"
              style={{ background: 'var(--crash-up)', color: 'var(--crash-on-accent)' }}
            >
              {t('crash.joinFlight')}
            </button>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--crash-muted)' }}>
              {!connected
                ? t('crash.connectToFly')
                : ceilingBps !== null
                  ? t('crash.autoHintCapped', { max: formatMultiplier(ceilingBps) })
                  : t('crash.autoHint')}
            </p>
          </div>
        )}

        {round && phase === 'betting' && iAmIn && (
          <div className="text-center">
            <p className="text-sm font-bold" style={{ color: 'var(--crash-up)' }}>
              {t('crash.aboard')}
            </p>
            <p className="mt-1 text-xs" style={{ color: 'var(--crash-muted)' }}>
              {t('crash.takeoffIn', { s: Math.max(0, Math.ceil(lockInMs / 1000)) })}
            </p>
          </div>
        )}

        {phase === 'flying' && !iAmIn && (
          <p className="py-2 text-center text-sm" style={{ color: 'var(--crash-muted)' }}>
            {t('crash.notAboard')}
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
                background: canCashout ? 'var(--crash-mark)' : 'var(--crash-panel-strong)',
                color: canCashout ? 'var(--crash-on-accent)' : 'var(--crash-mark)',
              }}
            >
              {canCashout
                ? clickBps !== null
                  ? t('crash.cashOutAt', { x: formatMultiplier(clickBps) })
                  : t('crash.cashOut')
                : myCashoutBps !== null
                  ? t('crash.outAt', { x: formatMultiplier(myCashoutBps) })
                  : t('crash.oneMoment')}
            </button>
            {canCashout && clickBps === null && (
              <p className="text-center text-xs leading-relaxed" style={{ color: 'var(--crash-muted)' }}>
                {!targetKnown
                  ? t('crash.noTargetOtherSession')
                  : t('crash.noCapKnown')}
              </p>
            )}
            {canCashout && betThisRound && clickBps !== null && (
              <p className="text-center text-xs tabular-nums" style={{ color: 'var(--crash-muted)' }}>
                {/* Reine Anzeige aus demselben Minimum, das der Server zahlt —
                    gutgeschrieben wird ausschließlich, was er beim Klick
                    errechnet. */}
                {t('crash.stakeWorth', {
                  stake: toSol(betThisRound.betLamports),
                  value: toSol((BigInt(betThisRound.betLamports) * BigInt(clickBps)) / 10_000n),
                })}
              </p>
            )}
            {canCashout && myEffectiveTargetBps !== null && (
              <p className="text-center text-xs tabular-nums" style={{ color: 'var(--crash-mark)' }}>
                {myTargetBps !== null
                  ? t('crash.autoAt', { x: formatMultiplier(myEffectiveTargetBps) })
                  : t('crash.capExits', { x: formatMultiplier(myEffectiveTargetBps) })}
              </p>
            )}
          </div>
        )}

        {(phase === 'crashed' || phase === 'settled') && (
          <div className="text-center">
            {mine?.status === 'won' || mine?.status === 'cashed' || cashoutThisRound ? (
              <p className="text-sm font-bold" style={{ color: 'var(--crash-up)' }}>
                {t('crash.outInTime')}
                {myCashoutBps !== null ? t('crash.atMultiplier', { x: formatMultiplier(myCashoutBps) }) : ''}
                {cashoutThisRound ? ` · ${toSol(cashoutThisRound.payoutLamports)} ◎` : ''}
              </p>
            ) : mine?.status === 'lost' ? (
              <p className="text-sm font-bold" style={{ color: 'var(--crash-down)' }}>
                {t('crash.waitedTooLong')}
              </p>
            ) : iAmIn ? (
              <p className="text-sm" style={{ color: 'var(--crash-muted)' }}>
                {t('crash.settling')}
              </p>
            ) : (
              <p className="text-sm" style={{ color: 'var(--crash-muted)' }}>
                {t('crash.roundDone')}
              </p>
            )}
            <p className="mt-1 text-xs tabular-nums" style={{ color: 'var(--crash-muted)' }}>
              {nextInMs !== null && nextInMs > 0
                ? t('live.nextRoundIn', { s: Math.ceil(nextInMs / 1000) })
                : t('live.nextRoundStarts')}
            </p>
          </div>
        )}

        {msg && (
          <p className="mt-2 text-center text-xs" style={{ color: 'var(--crash-down)' }}>
            {msg}
          </p>
        )}
      </div>

      {/* ── Mitspieler: der soziale Kern dieser Engine ── */}
      <div
        className="border p-3"
        style={{
          borderRadius: 'var(--crash-radius)',
          borderColor: 'var(--crash-line)',
          background: 'var(--crash-panel)',
        }}
      >
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--crash-muted)' }}>
            {t('crash.withInFlight')}
          </p>
          <p className="text-[11px] tabular-nums" style={{ color: 'var(--crash-muted)' }}>
            {players.length}
          </p>
        </div>
        {players.length === 0 ? (
          <p className="py-2 text-center text-xs" style={{ color: 'var(--crash-muted)' }}>
            {t('crash.nobodyAboard')}
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
                  style={{ background: isMe ? 'var(--crash-mine)' : 'transparent' }}
                >
                  <span className="min-w-0 flex-1 truncate" style={{ color: 'var(--crash-text)' }}>
                    {isMe ? t('crash.you') : p.wallet}
                  </span>
                  <span className="shrink-0 tabular-nums" style={{ color: 'var(--crash-muted)' }}>
                    {toSol(p.betLamports)} ◎
                  </span>
                  <span
                    className="w-20 shrink-0 text-right font-bold tabular-nums"
                    style={{
                      color: won
                        ? 'var(--crash-up)'
                        : p.status === 'lost'
                          ? 'var(--crash-down)'
                          : 'var(--crash-muted)',
                    }}
                  >
                    {/* Ein noch fliegender Mitspieler verrät sein Ziel nie —
                        der Server liefert dafür `null`. */}
                    {p.cashoutMultiplierBps !== null
                      ? `${formatMultiplier(p.cashoutMultiplierBps)}×`
                      : t(PLAYER_STATUS_KEY[p.status])}
                  </span>
                </li>
              );
            })}
            {players.length > 12 && (
              <li className="pt-1 text-center text-[11px]" style={{ color: 'var(--crash-muted)' }}>
                {t('crash.andMore', { n: players.length - 12 })}
              </li>
            )}
          </ul>
        )}
      </div>

      {/* ── Nachprüfbarkeit: Hash vor dem Flug, Seed nach dem Crash ── */}
      <div
        className="border p-3 text-[11px] leading-relaxed"
        style={{
          borderRadius: 'var(--crash-radius)',
          borderColor: 'var(--crash-line)',
          background: 'var(--crash-panel)',
          color: 'var(--crash-muted)',
        }}
      >
        <p>{engine.live?.hint ? t(engine.live.hint) : t('crash.hint')}</p>
        {round && (
          <p className="mt-2 break-all">
            <span className="uppercase tracking-wide">{t('crash.seedHash')}</span> {round.serverSeedHash}
            {/* Der Seed kommt erst mit dem Crash — vorher gibt es hier nichts
                zu zeigen, und genau das ist der Punkt. */}
            {round.serverSeed && (
              <>
                <br />
                <span className="uppercase tracking-wide">{t('crash.seed')}</span> {round.serverSeed}
              </>
            )}
          </p>
        )}
        <p className="mt-2">
          {t('crash.fairNote')}
        </p>
        {/* Nachprüfbarkeit (Systemvertrag — nie entfernen): Erst mit dem Crash
            gibt der Server den Seed heraus; vorher wäre ein Link eine leere
            Behauptung. Ab dann rechnet der Scanner die Runde im Browser nach. */}
        {round && (phase === 'crashed' || phase === 'settled') && (
          <VerifyLink verifierUrl={verifierUrl} id={round.roundId} className="mt-2" />
        )}
      </div>
    </div>
  );
}
