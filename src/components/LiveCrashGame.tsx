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
 *  2. Die Geld-Routen tragen hier bewusst KEIN Spieler-Token: `demo-bet` und
 *     `demo-cashout` sind serverseitig apiKeyAuth-only (Spielgeld, Etappe 2).
 *     Deshalb normales `fetch`, NICHT `moneyFetch` — siehe die Kommentare in
 *     `src/lib/solcore.ts` und in den Proxy-Routen. Etappe 3 (Echtgeld) dreht
 *     das um; dann kommt hier `usePlayerAuth().moneyFetch` hin.
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

type UiPhase = 'betting' | 'flying' | 'crashed' | 'settled';

const PHASE_BADGE: Record<UiPhase, string> = {
  betting: 'Wetten offen',
  flying: 'Im Flug',
  crashed: 'Crash',
  settled: 'Ausgewertet',
};

const PLAYER_STATUS: Record<CrashPlayerView['status'], string> = {
  placed: 'fliegt',
  cashed: 'raus',
  won: 'gewonnen',
  lost: 'verloren',
};

export function LiveCrashGame({ engine }: { engine: EngineDef }) {
  const { publicKey, connected } = useWallet();
  const wallet = publicKey?.toBase58() ?? null;
  const reduced = usePrefersReducedMotion();

  const [state, setState] = useState<CrashStateView | null>(null);
  const [offsetMs, setOffsetMs] = useState(0);
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
      setOffsetMs(new Date(s.serverTime).getTime() - Date.now());
    } catch {
      /* nächster Tick versucht es erneut */
    }
  }, []);
  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 1_000);
    return () => clearInterval(id);
  }, [refresh]);

  const round = state?.round ?? null;
  const flying = round?.status === 'flying';

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
  const liveBps = flying && takeoffMs !== null ? multiplierBpsAt(serverNow - takeoffMs, doubleMs) : 10_000;
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
    const ui = toUiError(e.code, e.message ?? 'Unbekannter Fehler', e.reason);
    setMsg(`${ui.code}: ${ui.message}`);
  };

  // ── Mitfliegen ──
  const placeBet = async () => {
    if (!wallet || !round || !bettingOpen) return;
    let betLamports: bigint;
    try {
      betLamports = solToLamports(amount);
    } catch {
      setMsg('Einsatz bitte als Zahl eingeben, z. B. 0.10.');
      return;
    }
    let safetyTargetBps: number | null = null;
    const raw = safety.trim().replace(',', '.');
    if (raw !== '') {
      const x = Number(raw);
      if (!Number.isFinite(x)) {
        setMsg('Auto-Ausstieg bitte als Zahl eingeben, z. B. 2.50 — oder leer lassen.');
        return;
      }
      const wanted = Math.round(x * 10_000);
      // Dieselbe Grenze, die der Server mit API-824 zieht — hier VOR dem
      // Absenden geprüft und mit der konkreten Zahl benannt, statt den
      // Spieler in einen nackten Fehlercode laufen zu lassen.
      if (!safetyTargetAccepted(wanted, ceilingBps)) {
        setMsg(
          ceilingBps !== null && wanted > ceilingBps
            ? `Auto-Ausstieg höchstens ${formatMultiplier(ceilingBps)}× — mehr zahlt dieses Spiel nicht aus.`
            : 'Auto-Ausstieg muss über 1.00× liegen — oder leer bleiben.',
        );
        return;
      }
      safetyTargetBps = wanted;
    }
    setBusy(true);
    setMsg(null);
    try {
      const r = (await fetch('/api/live-crash/bet', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          roundId: round.roundId,
          playerWallet: wallet,
          betLamports: betLamports.toString(),
          safetyTargetBps,
        }),
      }).then((res) => res.json())) as { betId?: string; error?: { code?: string; message?: string; reason?: string } };
      if (r.error) {
        showError(r.error);
        return;
      }
      setMyBet({ roundId: round.roundId, betLamports: betLamports.toString(), safetyTargetBps });
      await refresh();
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
      const r = (await fetch('/api/live-crash/cashout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ roundId: round.roundId, playerWallet: wallet }),
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
        Lade den geteilten Flug…
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
            Runde #{round?.roundNo ?? '—'} · Spielgeld
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
          style={{ color: badgeColor, background: 'var(--crash-panel-strong)' }}
        >
          {!round
            ? 'Startet gleich'
            : phase === 'betting'
              ? `${PHASE_BADGE.betting} · ${Math.max(0, Math.ceil(lockInMs / 1000))}s`
              : PHASE_BADGE[phase]}
        </span>
      </div>

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
            Der nächste Flug wird vorbereitet…
          </p>
        )}

        {round && phase === 'betting' && !iAmIn && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex-1 basis-28">
                <span className="mb-1 block text-[11px] uppercase tracking-wide" style={{ color: 'var(--crash-muted)' }}>
                  Einsatz (◎)
                </span>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  aria-label="Einsatz in SOL"
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
                  Auto-Ausstieg (×)
                  {ceilingBps !== null && (
                    <span className="normal-case tracking-normal"> · max {formatMultiplier(ceilingBps)}×</span>
                  )}
                </span>
                <input
                  value={safety}
                  onChange={(e) => setSafety(e.target.value)}
                  inputMode="decimal"
                  placeholder={ceilingBps !== null ? `bis ${formatMultiplier(ceilingBps)}` : 'optional'}
                  aria-label={
                    ceilingBps !== null
                      ? `Sicherheitsziel als Multiplikator, optional, höchstens ${formatMultiplier(ceilingBps)}`
                      : 'Sicherheitsziel als Multiplikator, optional'
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
              Mitfliegen
            </button>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--crash-muted)' }}>
              {!connected
                ? 'Wallet verbinden, um mitzufliegen.'
                : ceilingBps !== null
                  ? `Der Auto-Ausstieg steigt für dich aus, sobald die Kurve ihn erreicht — auch ohne Klick. Ohne Ziel klickst du selbst; mehr als ${formatMultiplier(ceilingBps)}× zahlt dieses Spiel dabei nie aus (Deckel des Creators). Der Flug selbst läuft für alle weiter.`
                  : 'Der Auto-Ausstieg steigt für dich aus, sobald die Kurve ihn erreicht — auch ohne Klick. Ohne Ziel klickst du selbst.'}
            </p>
          </div>
        )}

        {round && phase === 'betting' && iAmIn && (
          <div className="text-center">
            <p className="text-sm font-bold" style={{ color: 'var(--crash-up)' }}>
              Du bist an Bord.
            </p>
            <p className="mt-1 text-xs" style={{ color: 'var(--crash-muted)' }}>
              Abflug in {Math.max(0, Math.ceil(lockInMs / 1000))}s — dann steigt die Kurve.
            </p>
          </div>
        )}

        {phase === 'flying' && !iAmIn && (
          <p className="py-2 text-center text-sm" style={{ color: 'var(--crash-muted)' }}>
            Du fliegst diese Runde nicht mit — gleich öffnet das nächste Wettfenster.
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
                  ? `Aussteigen · ${formatMultiplier(clickBps)}×`
                  : 'Aussteigen'
                : myCashoutBps !== null
                  ? `Raus bei ${formatMultiplier(myCashoutBps)}×`
                  : 'Einen Moment…'}
            </button>
            {canCashout && clickBps === null && (
              <p className="text-center text-xs leading-relaxed" style={{ color: 'var(--crash-muted)' }}>
                {!targetKnown
                  ? 'Diese Wette wurde in einer anderen Sitzung gesetzt — ob sie ein Sicherheitsziel trägt, weiß dieser Tab nicht. Deshalb steht hier keine Zahl; den Multiplikator bestimmt beim Klick der Server.'
                  : 'Den Auszahlungs-Deckel dieses Spiels hat der Server nicht mitgeliefert. Deshalb steht hier keine Zahl; den Multiplikator bestimmt beim Klick der Server.'}
              </p>
            )}
            {canCashout && betThisRound && clickBps !== null && (
              <p className="text-center text-xs tabular-nums" style={{ color: 'var(--crash-muted)' }}>
                {/* Reine Anzeige aus demselben Minimum, das der Server zahlt —
                    gutgeschrieben wird ausschließlich, was er beim Klick
                    errechnet. */}
                Einsatz {toSol(betThisRound.betLamports)} ◎ · gerade{' '}
                {toSol((BigInt(betThisRound.betLamports) * BigInt(clickBps)) / 10_000n)} ◎ wert
              </p>
            )}
            {canCashout && myEffectiveTargetBps !== null && (
              <p className="text-center text-xs tabular-nums" style={{ color: 'var(--crash-mark)' }}>
                {myTargetBps !== null
                  ? `Auto-Ausstieg bei ${formatMultiplier(myEffectiveTargetBps)}× — den zahlt der Server auch ohne Klick, sobald die Kurve ihn erreicht.`
                  : `Ohne eigenes Ziel steigt der Deckel dieses Spiels für dich aus: ${formatMultiplier(myEffectiveTargetBps)}× — mehr zahlt eine Wette hier nicht, auch wenn die Kurve weiterfliegt.`}
              </p>
            )}
          </div>
        )}

        {(phase === 'crashed' || phase === 'settled') && (
          <div className="text-center">
            {mine?.status === 'won' || mine?.status === 'cashed' || cashoutThisRound ? (
              <p className="text-sm font-bold" style={{ color: 'var(--crash-up)' }}>
                Rechtzeitig raus
                {myCashoutBps !== null ? ` bei ${formatMultiplier(myCashoutBps)}×` : ''}
                {cashoutThisRound ? ` · ${toSol(cashoutThisRound.payoutLamports)} ◎` : ''}
              </p>
            ) : mine?.status === 'lost' ? (
              <p className="text-sm font-bold" style={{ color: 'var(--crash-down)' }}>
                Zu lange gewartet — Einsatz weg.
              </p>
            ) : iAmIn ? (
              <p className="text-sm" style={{ color: 'var(--crash-muted)' }}>
                Runde wird abgerechnet…
              </p>
            ) : (
              <p className="text-sm" style={{ color: 'var(--crash-muted)' }}>
                Diese Runde ist durch.
              </p>
            )}
            <p className="mt-1 text-xs tabular-nums" style={{ color: 'var(--crash-muted)' }}>
              {nextInMs !== null && nextInMs > 0
                ? `Nächste Runde in ${Math.ceil(nextInMs / 1000)}s`
                : 'Nächste Runde startet…'}
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
            Mit im Flug
          </p>
          <p className="text-[11px] tabular-nums" style={{ color: 'var(--crash-muted)' }}>
            {players.length}
          </p>
        </div>
        {players.length === 0 ? (
          <p className="py-2 text-center text-xs" style={{ color: 'var(--crash-muted)' }}>
            Noch niemand an Bord — sei der Erste.
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
                    {isMe ? 'Du' : p.wallet}
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
                      : PLAYER_STATUS[p.status]}
                  </span>
                </li>
              );
            })}
            {players.length > 12 && (
              <li className="pt-1 text-center text-[11px]" style={{ color: 'var(--crash-muted)' }}>
                … und {players.length - 12} weitere
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
        <p>{engine.live?.hint ?? 'Einsatz setzen, Kurve steigen lassen, rechtzeitig aussteigen.'}</p>
        {round && (
          <p className="mt-2 break-all">
            <span className="uppercase tracking-wide">Seed-Hash</span> {round.serverSeedHash}
            {/* Der Seed kommt erst mit dem Crash — vorher gibt es hier nichts
                zu zeigen, und genau das ist der Punkt. */}
            {round.serverSeed && (
              <>
                <br />
                <span className="uppercase tracking-wide">Seed</span> {round.serverSeed}
              </>
            )}
          </p>
        )}
        <p className="mt-2">
          Der Crash-Punkt steht vor dem Wettfenster fest und gilt für alle gleich. Ergebnisse kommen
          ausschließlich vom Sol-Core-Server.
        </p>
      </div>
    </div>
  );
}
