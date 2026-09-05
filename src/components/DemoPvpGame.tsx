'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { EngineDef } from '@/lib/engines';
import type { DemoPvpView } from '@/lib/solcore';
import { toSol, solToLamports } from '@/lib/lamports';
import { Amount } from './Amount';
import { usePvpLang, pvpErrorText, PVP_LANGS } from '@/lib/pvp-i18n';
import { useT } from '@/lib/i18n';
import { usePlayer, useDemo } from './DemoProvider';

/**
 * PvP-DEMO (Plan §6.4): ein Instant-Match gegen den Server-Bot auf dem
 * simulierten Saldo — echt provably-fair (Seed sofort enthüllt), aber ohne
 * echtes Geld und ohne die echten Lobby-/Match-Tabellen. Der „Bot" joint/readyt
 * sofort; das Ergebnis steht in derselben Antwort, die Reveal-Animation
 * choreografiert der Client lokal. Struktur analog DemoTournamentGame.
 */

const REVEAL_MS = 1_800;

function randomHexSeed(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

export function DemoPvpGame({
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

  const minSol = Number(bounds.minStake) / 1e9;
  const maxSol = Number(bounds.maxStake) / 1e9;
  const [stakeSol, setStakeSol] = useState(minSol);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DemoPvpView | null>(null);
  const [spinning, setSpinning] = useState(false);
  const reduced = useRef(
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );

  const play = useCallback(async () => {
    if (!wallet) return;
    setBusy(true);
    setError(null);
    setResult(null);
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
      }).then((x) => x.json())) as DemoPvpView & { error?: { code?: string } };
      if (r.error) {
        setError(pvpErrorText(lang, r.error.code));
        return;
      }
      // Reveal-Fenster: erst spinnen, dann Ergebnis zeigen (reduced motion: sofort).
      if (reduced.current) {
        setResult(r);
        void refreshDemoBalance();
      } else {
        setSpinning(true);
        setResult(r);
        setTimeout(() => {
          setSpinning(false);
          void refreshDemoBalance();
        }, REVEAL_MS);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [wallet, stakeSol, bounds, lang, refreshDemoBalance]);

  const win = result?.result.win ?? false;
  const showResult = result && !spinning;

  return (
    <main className="mx-auto sc-vh max-w-md px-4 pb-10">
      {/* Kopf: Demo-Badge + Saldo + Sprache + Beenden */}
      <header className="sc-header sticky top-0 z-20 -mx-4 mb-4 flex items-center justify-between gap-2 border-b border-white/10 bg-night/80 px-4 py-3 backdrop-blur">
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

      {/* Hero */}
      <section className="mb-4 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-6 text-center">
        <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full border border-accent/40 bg-accent/10 text-3xl">
          🪙
        </div>
        <h2 className="text-xl font-bold text-white">{gameName}</h2>
        <p className="mx-auto mt-2 max-w-xs text-xs text-white/40">{t('demo.intro')}</p>
      </section>

      {/* Reveal / Ergebnis */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
        <div className="mx-auto flex h-32 items-center justify-center">
          <div
            className={`grid h-24 w-24 place-items-center rounded-full border-2 text-4xl ${
              showResult
                ? win
                  ? 'border-accent bg-accent/15 text-accent'
                  : 'border-red-400/50 bg-red-400/10 text-red-300'
                : 'border-accent/40 bg-accent/10 text-accent'
            } ${spinning && !reduced.current ? 'animate-spin [animation-duration:0.6s]' : ''}`}
            aria-live="polite"
          >
            {showResult ? (win ? '🏆' : '💀') : '🪙'}
          </div>
        </div>

        {showResult ? (
          <>
            <p className={`mt-3 text-lg font-bold ${win ? 'text-accent' : 'text-red-400'}`}>
              {win ? t('demo.won') : t('demo.lost')}
            </p>
            <p className="mt-1 text-sm text-white/50">
              {t('reveal.pot')}: <Amount lamports={result!.potLamports} layout="inline" />
            </p>
            <button
              type="button"
              onClick={() => void play()}
              disabled={busy}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-accent to-accent-soft py-3 text-sm font-semibold text-night disabled:opacity-40"
            >
              {t('demo.again')}
            </button>
          </>
        ) : spinning ? (
          <p className="mt-3 text-lg font-bold text-white/80">{t('reveal.flipping')}</p>
        ) : (
          <>
            <div className="mb-3 mt-2">
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
              onClick={() => void play()}
              disabled={busy || !connected}
              className="w-full rounded-xl bg-gradient-to-r from-accent to-accent-soft py-3 text-sm font-semibold text-night disabled:opacity-40"
            >
              {busy ? t('demo.playing') : t('demo.play')}
            </button>
          </>
        )}
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </section>

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
