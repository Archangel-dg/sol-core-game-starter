'use client';

import { useEffect, useRef, useState } from 'react';
import { useT } from '@/lib/i18n';
import { toSol } from '@/lib/lamports';

/**
 * ██ GESTALTUNGSZONE ██ — die Ergebnis-Animation der Coin-Flip-Engine.
 *
 * Ersetzt `ResultView` für diese Engine und zeigt dieselben Zahlen: Multiplikator,
 * Gewinn/Verlust, Wurf. Der Unterschied ist nur, dass eine Münze sie ausspielt.
 *
 * Vier Regeln sind bindend (docs/CUSTOMIZE.md) — alle vier schützen die Fairness:
 *
 *  1. REINE FUNKTION des Ergebnisses. Kein `Math.random()`, nirgends. Die Münze
 *     dreht sich immer gleich schnell; nur die Dauer folgt der Halbdrehung, die
 *     nötig ist, um auf `details.landed` zu enden.
 *  2. NICHTS VORAB ERKENNBAR. Die Ergebnis-Knoten bleiben LEER, bis die Münze
 *     liegt — auch DevTools, `innerText` und ein Screenreader erfahren vorher
 *     nichts. Ohne diese Regel wäre die Animation nur Dekoration über einer
 *     bereits verratenen Antwort.
 *  3. KEIN NEAR-MISS. Eine monotone Verzögerung, die das Ergebnis nicht kennt:
 *     kein Bremsen, kein Zögern, kein Wackeln kurz vor der Gewinnseite. Ein
 *     Verlust wird als Verlust gezeigt.
 *  4. DAS ERGEBNIS KOMMT AUS DEN PROPS. `win`, `multiplierBps` und
 *     `payoutLamports` werden gelesen, nie aus `roll` neu berechnet — der
 *     Server entscheidet, diese Datei zeigt nur.
 *
 * Umfärben: Die Münze nimmt `accent` (Gewinn) und `red-400` (Verlust) aus dem
 * Theme, ein `NEXT_PUBLIC_ACCENT_COLOR` färbt sie also mit. Geometrie und
 * Bewegung stehen in `globals.css` unter „Coin-Flip-Reveal".
 */

/** Voller Umlauf in Millisekunden — konstante Winkelgeschwindigkeit. Die Dauer
 *  einer Runde ist deshalb TURNS·SPIN_MS bzw. ein halber Umlauf mehr, je nach
 *  Ruhelage. Das Tempo verrät nichts: es ist in jeder Runde dasselbe. */
const SPIN_MS = 380;
/** Volle Umdrehungen vor der Landung. Fest — nie zufällig, nie ergebnisabhängig. */
const TURNS = 5;
/** Einblenden des Ergebnisses, nachdem die Münze liegt. */
const SHOW_MS = 220;
/** Wurfhöhe in Prozent der Spielfeldkante. */
const HOP_U = 7;

type Side = 'heads' | 'tails';

export interface CoinFlipViewProps {
  /** Das Server-Ergebnis der Runde — `null` zeigt die ruhende Münze. */
  result: {
    win: boolean;
    multiplierBps: number;
    payoutLamports: string;
    roll?: number | null;
    details?: Record<string, unknown> | null;
  } | null;
  /** Zeile unter der ruhenden Münze (Engine-Kurzbeschreibung). */
  hint?: string;
}

/** Nur 'heads' und 'tails' gelten — alles andere ist unbekannt und wird nicht
 *  geraten (dann bleibt die Münze ohne Rand-Markierung). */
function readSide(v: unknown): Side | null {
  return v === 'heads' || v === 'tails' ? v : null;
}

export function CoinFlipView({ result, hint }: CoinFlipViewProps) {
  const t = useT();
  const rootRef = useRef<HTMLDivElement>(null);
  const coinRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  /** Ruhewinkel der Münze, rundenübergreifend (0° = Kopf oben, 180° = Zahl).
   *  Muss ein Ref bleiben: würde er bei jedem Render auf 0 zurückfallen, spränge
   *  eine auf Zahl liegende Münze zu Beginn der nächsten Runde sichtbar um. */
  const angleRef = useRef(0);
  const rafRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Erst `true`, wenn die Münze liegt — vorher steht kein Ergebnis im DOM. */
  const [landed, setLanded] = useState(false);

  const side = readSide(result?.details?.side);
  const landedSide = readSide(result?.details?.landed);
  const heads = t('engine.coin-flip.opt.side.heads');
  const tails = t('engine.coin-flip.opt.side.tails');

  // `--u` = 1 % der kürzeren Spielfeldkante. Alle Größen hängen daran, damit die
  // Münze auf dem Telefon wie auf dem Bildschirm dieselbe Figur ist.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const size = Math.min(r.width, r.height) || 360;
      el.style.setProperty('--u', `${(size / 100).toFixed(3)}px`);
    };
    measure();
    if (typeof ResizeObserver !== 'function') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Der Flug. Läuft je Runde einmal — `result` ist bei jeder Runde ein neues
  // Objekt, also ist die Objekt-Identität der richtige Auslöser.
  useEffect(() => {
    const coin = coinRef.current;
    if (!coin) return;

    const apply = (deg: number, hop: number) => {
      coin.style.transform = `translateY(calc(var(--u) * ${(-hop * HOP_U).toFixed(3)})) rotateY(${deg.toFixed(2)}deg)`;
      const shadow = shadowRef.current;
      if (shadow) {
        shadow.style.transform = `translateX(-50%) scale(${(1 - hop * 0.35).toFixed(3)})`;
        shadow.style.opacity = (1 - hop * 0.45).toFixed(3);
      }
    };

    if (!result) {
      angleRef.current = 0;
      setLanded(false);
      apply(0, 0);
      return;
    }

    const start = angleRef.current;
    const startMod = ((start % 360) + 360) % 360;
    // Feste Umdrehungen plus die Halbdrehung, die auf die Server-Seite führt.
    // Ist die Seite unbekannt, bleibt es bei den festen Umdrehungen.
    const landingTurn = landedSide ? (((landedSide === 'tails' ? 180 : 0) - startMod + 360) % 360) : 0;
    const delta = TURNS * 360 + landingTurn;
    const target = start + delta;
    // Konstante Winkelgeschwindigkeit ⇒ die Dauer folgt der Strecke. So ist das
    // Tempo in jeder Runde identisch und verrät die Seite auch nicht indirekt.
    const flightMs = (delta / 360) * SPIN_MS;

    const finish = () => {
      angleRef.current = target;
      apply(target, 0);
      setLanded(true);
    };

    const reduced =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      finish();
      return;
    }

    setLanded(false);
    const t0 = performance.now();
    const step = (now: number) => {
      const t1 = Math.min(1, Math.max(0, (now - t0) / flightMs));
      // Monotone Verzögerung — kennt das Ergebnis nicht, bremst nirgends extra.
      const p = 1 - Math.pow(1 - t1, 1.7);
      apply(start + delta * p, Math.sin(Math.PI * t1));
      if (t1 < 1) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }
      rafRef.current = 0;
      finish();
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [result, landedSide]);

  const showResult = !!result && landed;
  const faceBorder = (face: Side) => {
    if (!showResult || landedSide !== face) return 'border-white/45';
    return result!.win ? 'border-accent' : 'border-red-400';
  };

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full overflow-hidden rounded-xl bg-night text-center"
      style={{ ['--u' as string]: '3.6px' }}
    >
      {/* Der eigene Tipp — steht schon vor dem Wurf, er ist die Wette, nicht das Ergebnis. */}
      <div
        className="absolute left-1/2 top-[6%] -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.06] text-white/50"
        style={{
          padding: 'calc(var(--u) * 1.4) calc(var(--u) * 3.2)',
          fontSize: 'calc(var(--u) * 3.8)',
          lineHeight: 1.2,
        }}
      >
        {side ? (
          <>
            {t('coinflip.you')}{' '}
            <b className="font-semibold text-white">
              {side === 'heads' ? heads : tails}
            </b>
          </>
        ) : (
          t('coinflip.idle')
        )}
      </div>

      {/* Schatten — liegt unter der Münze und schrumpft mit der Flughöhe. */}
      <div
        ref={shadowRef}
        className="absolute left-1/2 top-[66.5%] h-[3.5%] w-[32%] -translate-x-1/2 rounded-[50%] bg-white/[0.06]"
      />

      <div className="coin-scene absolute left-[30%] top-[25%] h-[40%] w-[40%]">
        <div ref={coinRef} className="coin-body absolute inset-0">
          <div
            className={`coin-face absolute inset-0 flex flex-col items-center justify-center rounded-full bg-[#e8e8ee] text-night ${faceBorder('heads')}`}
            style={{ borderWidth: 'calc(var(--u) * 1.6)' }}
          >
            <span style={{ fontSize: 'calc(var(--u) * 16)', fontWeight: 700, lineHeight: 1 }}>
              {heads.charAt(0)}
            </span>
            <span
              className="opacity-75"
              style={{ fontSize: 'calc(var(--u) * 3.4)', letterSpacing: '0.18em', marginTop: 'calc(var(--u) * 1.2)', lineHeight: 1 }}
            >
              {heads.toUpperCase()}
            </span>
          </div>
          <div
            className={`coin-face coin-face-tails absolute inset-0 flex flex-col items-center justify-center rounded-full bg-night text-white ${faceBorder('tails')}`}
            style={{ borderWidth: 'calc(var(--u) * 1.6)' }}
          >
            <span style={{ fontSize: 'calc(var(--u) * 16)', fontWeight: 700, lineHeight: 1 }}>
              {tails.charAt(0)}
            </span>
            <span
              className="opacity-75"
              style={{ fontSize: 'calc(var(--u) * 3.4)', letterSpacing: '0.18em', marginTop: 'calc(var(--u) * 1.2)', lineHeight: 1 }}
            >
              {tails.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Ergebnis. Wird erst gerendert, wenn die Münze liegt (Regel 2) — vorher
          steht an dieser Stelle die Kurzbeschreibung der Engine. */}
      <div
        className={`coin-readout absolute inset-x-0 top-[73%] px-4 tabular-nums ${showResult ? 'coin-readout-shown' : ''}`}
        style={{ transitionDelay: showResult ? `${SHOW_MS - 200}ms` : '0ms' }}
      >
        {showResult && (
          <>
            <div
              className={`font-bold ${result!.win ? 'text-accent' : 'text-red-400'}`}
              style={{ fontSize: 'calc(var(--u) * 6)', lineHeight: 1.1 }}
            >
              {(result!.multiplierBps / 10000).toFixed(2)}×
            </div>
            <div
              className={`font-semibold ${result!.win ? 'text-accent' : 'text-red-400'}`}
              style={{ fontSize: 'calc(var(--u) * 4.4)', marginTop: 'calc(var(--u) * 1.2)', lineHeight: 1.2 }}
            >
              {result!.win ? t('result.won', { amount: toSol(result!.payoutLamports) }) : t('result.lost')}
            </div>
            {result!.roll != null && (
              <div
                className="text-white/40"
                style={{ fontSize: 'calc(var(--u) * 3.3)', marginTop: 'calc(var(--u) * 1.2)', lineHeight: 1.2 }}
              >
                {t('coinflip.roll', { roll: result!.roll })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Leerlauf: die Kurzbeschreibung steht dort, wo später das Ergebnis steht. */}
      {!result && hint && (
        <p
          className="absolute inset-x-0 top-[73%] px-5 text-white/40"
          style={{ fontSize: 'calc(var(--u) * 3.6)', lineHeight: 1.35 }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
