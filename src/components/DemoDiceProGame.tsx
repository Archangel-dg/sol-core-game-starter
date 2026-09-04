'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EngineDef } from '@/lib/engines';
import type { DemoDiceProView, DiceProView } from '@/lib/solcore';
import { toSol, solToLamports } from '@/lib/lamports';
import { usePvpLang, pvpErrorText, PVP_LANGS } from '@/lib/pvp-i18n';
import { useT } from '@/lib/i18n';
import { usePlayer, useDemo } from './DemoProvider';
// Das Board wird 1:1 aus DiceProGame wiederverwendet — die Demo unterscheidet
// sich nur in der Steuerung (Sim-Balance, Server-Bot statt echter Lobby).
import { DiceProBoard, DiceProBust, DiceProEnd } from './DiceProGame';
// Nur points-system: die geechote Creator-Paytable fürs Board (Wertung + Anzeige).
import { parseDiceProPaytable } from '@/lib/dice-pro';
import { useDiceRollReveal } from '@/lib/dice-reveal';
/** Für den Würfelwurf-Reveal: die Tischwürfel lesen / eine Kopie mit anderen Augen bauen. */
const diceOfPro = (v: DiceProView): number[] => v.tableDice;
const withDicePro = (v: DiceProView, tableDice: number[]): DiceProView => ({ ...v, tableDice });

/**
 * PvP-Dice-Pro-DEMO (Plan §6.4): rundenbasiertes Dice Pro gegen den Server-Bot
 * auf dem simulierten Saldo — echt provably-fair (Seed sofort enthüllt), ohne
 * echtes Geld und ohne die echten Lobby-/Match-Tabellen. Der Spieler (Sitz 1)
 * zieht Zug für Zug; der Bot (Sitz 2) antwortet in derselben Antwort. Struktur
 * analog DemoDiceDuelGame, aber mit dem Dice-Pro-Board (beide Templates).
 */

function randomHexSeed(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

interface JsonErr {
  error?: { code?: string; message?: string; reason?: string };
}

export function DemoDiceProGame({
  engine,
  gameName,
  engineConfig,
  verifierUrl,
}: {
  engine: EngineDef;
  gameName: string;
  engineConfig?: Record<string, unknown> | null;
  verifierUrl: string;
}) {
  const { lang, setLang, t } = usePvpLang();
  // Engine-Texte (blurb/hint) liegen im Hauptkatalog, nicht im PvP-Katalog.
  const ti = useT();
  const { wallet, connected } = usePlayer();
  const { demoBalance, refreshDemoBalance, exitDemo } = useDemo();

  const bounds = useMemo(() => {
    const src = (engineConfig ?? {}) as Record<string, unknown>;
    const big = (v: unknown, fb: bigint): bigint => {
      try {
        if (typeof v === 'string' && /^\d+$/.test(v)) return BigInt(v);
        if (typeof v === 'number' && Number.isFinite(v)) return BigInt(Math.floor(v));
      } catch {
        /* fallthrough */
      }
      return fb;
    };
    return { minStake: big(src.minStakeLamports, 10_000_000n), maxStake: big(src.maxStakeLamports, 500_000_000n) };
  }, [engineConfig]);

  // Nur points-system: geechote Creator-Paytable (sonst null → klassische
  // Tabelle). Unbekannte paytable-Version ⇒ sichtbarer „Frontend veraltet"-
  // Banner (Plan Global Constraint 11), nie still klassisch weiterrechnen.
  const paytableParse = useMemo(
    () => parseDiceProPaytable((engineConfig as Record<string, unknown> | null | undefined)?.paytable ?? null),
    [engineConfig],
  );
  const paytable = paytableParse.paytable;
  const paytableOutdated = paytableParse.outdated;

  const minSol = Number(bounds.minStake) / 1e9;
  const maxSol = Number(bounds.maxStake) / 1e9;
  const [stakeSol, setStakeSol] = useState(minSol);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<DemoDiceProView | null>(null);
  const [moveBusy, setMoveBusy] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const reduced = useRef(
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );

  const start = useCallback(async () => {
    if (!wallet) return;
    setBusy(true);
    setError(null);
    setMoveError(null);
    try {
      let lamports: bigint;
      try {
        lamports = solToLamports(String(stakeSol));
      } catch {
        lamports = bounds.minStake;
      }
      if (lamports < bounds.minStake) lamports = bounds.minStake;
      if (lamports > bounds.maxStake) lamports = bounds.maxStake;
      const r = (await fetch('/api/demo/pvp/lobby', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ playerWallet: wallet, stakeLamports: lamports.toString(), clientSeed: randomHexSeed() }),
      }).then((x) => x.json())) as DemoDiceProView & JsonErr;
      if (r.error) {
        setError(pvpErrorText(lang, r.error.code));
        return;
      }
      setMatch(r);
      void refreshDemoBalance();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [wallet, stakeSol, bounds, lang, refreshDemoBalance]);

  const doMove = useCallback(
    async (keep: number[], action: 'roll' | 'bank') => {
      if (!wallet || !match) return;
      setMoveBusy(true);
      setMoveError(null);
      try {
        const r = (await fetch(`/api/demo/pvp/match/${match.matchId}/move`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ playerWallet: wallet, keep, action }),
        }).then((x) => x.json())) as DemoDiceProView & JsonErr;
        if (r.error) {
          const code = r.error.code;
          const reason = r.error.reason;
          if (code === 'API-710') setMoveError(t('dd.err.notYourTurn'));
          else if (code === 'API-204') {
            setMoveError(
              reason === 'dice_not_on_table'
                ? t('dd.err.diceNotOnTable')
                : reason === 'cannot_bank'
                  ? t('dd.err.cannotBank')
                  : t('dd.err.invalidSelection'),
            );
          } else setMoveError(pvpErrorText(lang, code));
          return;
        }
        setMatch(r);
        if (r.status === 'settled') void refreshDemoBalance();
      } catch (e) {
        setMoveError((e as Error).message);
      } finally {
        setMoveBusy(false);
      }
    },
    [wallet, match, t, lang, refreshDemoBalance],
  );

  const reset = useCallback(() => {
    setMatch(null);
    setMoveError(null);
    setError(null);
  }, []);

  const dpLatest = match?.dicePro ?? null;
  // Würfelwurf-Reveal (lib/dice-reveal.ts): ein neuer Wurf taumelt erst einen Moment, das
  // Board zeigt solange den Stand davor — Punkte, Farkle/Bust und Bank stehen nie vor den Würfeln.
  const { shown: dp, rolling } = useDiceRollReveal(dpLatest, diceOfPro, withDicePro, dpLatest?.faces ?? 6);
  const settled = match?.status === 'settled' || (!!dp && dp.matchOver);

  // Bust-Enthüllung: die Demo pollt (kein Dauer-Poll wie das echte Match). Der
  // Server ruht ~3 s in phase==='busted' und schaltet dann selbst weiter — also
  // hier nach-holen, solange NICHT der interaktive Spielerzug ansteht (eigenes
  // oder Bot-Bust bzw. eine kurze Bot-Wartephase). Endet die Ruhephase, ändern
  // sich die Deps und das Intervall wird abgebaut.
  const matchId = match?.matchId ?? null;
  const humansTurn = dp?.phase === 'awaiting_move' && (dp?.activeSeat ?? 1) === 1;
  const needsPoll = match?.status === 'playing' && !!dp && !humansTurn;
  useEffect(() => {
    if (!matchId || !needsPoll) return;
    let stopped = false;
    const id = setInterval(async () => {
      try {
        const r = (await fetch(`/api/demo/pvp/match/${matchId}`).then((x) => x.json())) as
          DemoDiceProView & JsonErr;
        if (stopped || r.error) return;
        setMatch(r);
        if (r.status === 'settled') void refreshDemoBalance();
      } catch {
        /* nächster Tick versucht es erneut */
      }
    }, 1000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [matchId, needsPoll, refreshDemoBalance]);

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pb-10">
      {/* Kopf: Demo-Badge + Saldo + Beenden */}
      <header className="sticky top-0 z-20 -mx-4 mb-4 flex items-center justify-between gap-2 border-b border-white/10 bg-night/80 px-4 py-3 backdrop-blur">
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold text-white">{gameName}</h1>
          <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
            {t('demo.badge')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent">
            {demoBalance === null ? '—' : `${toSol(demoBalance)} ◎`}
          </span>
          <button
            type="button"
            onClick={exitDemo}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70"
          >
            {t('demo.exit')}
          </button>
        </div>
      </header>

      {paytableOutdated && (
        // Sichtbarer „Frontend veraltet"-Banner (Plan Global Constraint 11):
        // das Server-Echo trägt eine paytable-Version, die dieses Template
        // nicht kennt — Anzeige-Punkte wären falsch. KEIN stiller
        // Klassik-Fallback; der Server wertet weiterhin autoritativ.
        <div
          role="alert"
          className="mb-4 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-xs leading-relaxed text-amber-200"
        >
          {t('dp.outdatedFrontend')}
        </div>
      )}

      {match && dp ? (
        settled ? (
          <>
            <DiceProEnd
              t={t}
              dp={dp}
              mySeat={1}
              result={match.result}
              potLamports={match.potLamports}
              matchId={null}
              verifierUrl={verifierUrl}
              onBack={reset}
            />
            <button
              type="button"
              onClick={reset}
              className="mt-3 w-full rounded-xl border border-white/15 py-2.5 text-sm text-white/70"
            >
              {t('demo.again')}
            </button>
          </>
        ) : dp.phase === 'busted' ? (
          // Ruhephase (~3 s): gebusteter Wurf + Lose-Animation, keine Steuerung.
          // Das Poll-Intervall oben schaltet automatisch zum nächsten Zug weiter.
          <DiceProBust t={t} dp={dp} mySeat={1} reduced={reduced.current} />
        ) : (
          <DiceProBoard
            t={t}
            dp={dp}
            mySeat={1}
            serverNow={Date.now()}
            busy={moveBusy || rolling}
            reduced={reduced.current}
            error={moveError}
            paytable={paytable}
            onMove={(keep, action) => void doMove(keep, action)}
          />
        )
      ) : (
        <>
          {/* Hero */}
          <section className="mb-4 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-6 text-center">
            <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full border border-accent/40 bg-accent/10 text-3xl">
              🎲
            </div>
            <h2 className="text-xl font-bold text-white">{gameName}</h2>
            <p className="mx-auto mt-2 max-w-xs text-xs text-white/40">{t('demo.intro')}</p>
          </section>

          {/* Einsatz + Start */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="mb-3">
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-xs text-white/50">{t('create.stake')}</span>
                <span className="text-sm font-bold tabular-nums text-accent">{stakeSol.toFixed(3)} ◎</span>
              </div>
              <input
                type="range"
                min={minSol}
                max={maxSol}
                step={Math.max((maxSol - minSol) / 100, 0.001)}
                value={stakeSol}
                onChange={(e) => setStakeSol(Number(e.target.value))}
                className="w-full accent-[#14F195]"
              />
            </div>
            <button
              type="button"
              onClick={() => void start()}
              disabled={busy || !connected}
              className="w-full rounded-xl bg-gradient-to-r from-accent to-accent-soft py-3 text-sm font-semibold text-night disabled:opacity-40"
            >
              {busy ? t('demo.playing') : t('demo.play')}
            </button>
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          </section>
        </>
      )}

      {/* Sprache */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-1">
        {PVP_LANGS.map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => setLang(l.code)}
            className={`rounded px-2 py-1 text-xs ${
              lang === l.code ? 'bg-accent text-night' : 'border border-white/15 text-white/60'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      <footer className="mt-6 text-center text-[11px] text-white/30">
        <a href={verifierUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white/60">
          {engine.pvp?.hint ? ti(engine.pvp.hint) : t('menu.verify')}
        </a>
      </footer>
    </main>
  );
}
