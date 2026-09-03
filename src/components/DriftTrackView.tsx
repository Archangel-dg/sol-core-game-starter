'use client';
import { useT, type TFn } from '@/lib/i18n';

import { useId } from 'react';
import type { CSSProperties } from 'react';

/**
 * ██ GESTALTUNGSZONE ██
 *
 * Das hier ist DEIN Spielfeld. Farben, Formen, Bewegung — alles frei.
 * Drei Regeln sind bindend, und alle drei schützen die Fairness:
 *
 *  1. REINE FUNKTION der übergebenen Spur (`path`). Kein eigener Zustand,
 *     keine Animation, die von etwas anderem abhängt als den gelieferten
 *     Werten.
 *  2. KEIN `Math.random()`. Nirgends.
 *  3. NICHTS ÜBER DIE ZUKUNFT DER SPUR. Der Server liefert bewusst nur das
 *     bereits verstrichene Präfix — zeichne nie darüber hinaus, extrapoliere
 *     nicht, und deute den Ausgang nicht an.
 *
 * Zu Regel 3, praktisch: Bei Crash war die Kurve eine öffentliche Formel und
 * nur ihr Ende geheim. HIER IST DIE GANZE SPUR DAS GEHEIMNIS — sie steckt im
 * Seed und wird tickweise enthüllt (`live-drift-public.ts` schneidet sie an
 * der Datenbank-Uhr). Deshalb bekommt diese Datei ausschließlich `path` und
 * malt genau das, nicht einen Wert mehr. Die Y-Achse skaliert am bisher
 * gesehenen Höchststand, nie am Creator-Deckel und nie am Endwert.
 *
 * Farben und Schrift kommen aus den CSS-Variablen weiter unten — für ein
 * eigenes Thema reicht es, die zu ändern.
 */

// ── Thema ───────────────────────────────────────────────────────────────────
// Umfärben = NUR diese Werte ändern. Alles darunter benutzt ausschließlich
// diese Variablen (Layout/Abstände über Tailwind, Farben über `var(--drift-*)`).
export const DRIFT_THEME = {
  '--drift-panel': 'rgba(255, 255, 255, 0.03)',
  '--drift-panel-strong': 'rgba(255, 255, 255, 0.06)',
  '--drift-line': 'rgba(255, 255, 255, 0.10)',
  '--drift-text': '#e8e8ee',
  '--drift-muted': 'rgba(232, 232, 238, 0.45)',
  /** Spur oberhalb der Startlinie, Gewinn. */
  '--drift-up': 'rgb(var(--accent-rgb))',
  /** Spur unterhalb der Startlinie — sichtbar, aber nicht alarmierend. */
  '--drift-low': '#ffb454',
  /** Bust, Totalverlust. */
  '--drift-down': '#ff5f6d',
  '--drift-down-soft': 'rgba(255, 95, 109, 0.10)',
  /** Startlinie 1.00× — der Bezugspunkt, gegen den alles gelesen wird. */
  '--drift-base': 'rgba(232, 232, 238, 0.28)',
  /** Eigener Ausstiegs-Marker. */
  '--drift-mark': '#ffd166',
  /** Hinterlegung der eigenen Zeile in der Mitspieler-Liste. */
  '--drift-mine': 'rgba(255, 255, 255, 0.06)',
  /** Schrift AUF einer vollflächigen Akzentfläche (Knöpfe). */
  '--drift-on-accent': '#0a0a0f',
  '--drift-radius': '0.75rem',
  /** Schrift des Spielbereichs. Voreinstellung: die des Starters (mono). */
  '--drift-font': 'inherit',
} as CSSProperties;

export interface DriftTrackViewProps {
  phase: 'betting' | 'flying' | 'ended' | 'settled';
  /** Das enthüllte Präfix der Spur in BPS (10000 = 1.00×). Leer vor dem Abflug. */
  path: number[];
  /** Gesetzt, sobald der Spieler ausgestiegen ist (BRUTTO-Stand in BPS). */
  cashoutValueBps: number | null;
  /** Erst ab `ended`: 'bust' (bei 0 gerissen) oder 'timeout' (Zeit abgelaufen). */
  endReason: 'bust' | 'timeout' | null;
  /** Anteil der verbrauchten Rundenzeit (0..1) — nur Anzeige. */
  timeFraction: number;
}

const BPS = 10_000;
/** Wo der höchste Wert im Bild sitzt (0..1) — darunter bleibt Luft nach oben. */
const HEAD_ROOM = 0.82;
/** Mindesthöhe der Achse: 1.60×, damit kleine Spuren nicht zappelig wirken. */
const MIN_TOP_BPS = 16_000;

/** BPS → „2.34". */
export function formatValue(bps: number): string {
  return (Math.max(0, bps) / BPS).toFixed(2);
}

/**
 * Obergrenze der Achse. Hängt AUSSCHLIESSLICH vom bisher GESEHENEN
 * Höchststand ab — nie vom Deckel des Creators, nie vom Endwert der Runde.
 * Beides würde verraten, wohin die Spur noch läuft.
 */
export function axisTopBps(pathPeakBps: number): number {
  return Math.max(MIN_TOP_BPS, Math.round(Math.max(BPS, pathPeakBps) / HEAD_ROOM));
}

/** Wert → Höhe im Bild (0 = oben, 100 = unten). 0 BPS liegt exakt auf 100. */
export function yPercent(bps: number, topBps: number): number {
  const span = Math.max(1, topBps);
  const rel = Math.max(0, Math.min(1, bps / span));
  return 100 - rel * 100;
}

/** Höchststand des Präfixes — die einzige Größe, an der die Achse skaliert. */
export function pathPeakBps(path: number[]): number {
  let peak = BPS;
  for (const v of path) if (Number.isFinite(v) && v > peak) peak = v;
  return peak;
}

/**
 * Die Spur als Punktfolge in einem 100×100-Feld. Die X-Achse ist die
 * RUNDENZEIT: der Punkt eines Ticks sitzt dort, wo dieser Tick im
 * Gesamtfenster liegt — die Spur wächst also von links nach rechts in das
 * Bild hinein, statt sich bei jedem Tick neu zu stauchen.
 */
export function trackPoints(
  path: number[],
  topBps: number,
  maxTicks: number,
): { x: number; y: number }[] {
  const span = Math.max(1, maxTicks);
  return path.map((bps, i) => ({
    x: Math.min(100, (i / span) * 100),
    y: yPercent(bps, topBps),
  }));
}

/** Waagerechte Hilfslinien — „runde" Werte unterhalb der Achsenspitze. */
export function gridLinesBps(topBps: number): number[] {
  const topX = topBps / BPS;
  const ladder = [0.25, 0.5, 1, 2, 5, 10, 25, 50, 100];
  const step = ladder.find((s) => topX / s <= 5) ?? ladder[ladder.length - 1]!;
  const lines: number[] = [];
  for (let k = 1; k * step < topX; k += 1) {
    const bps = Math.round(k * step * BPS);
    // Die Startlinie 1.00× wird separat und kräftiger gezeichnet.
    if (bps !== BPS) lines.push(bps);
  }
  return lines;
}

/** Beschriftung je Phase — als FUNKTION, weil Texte am Sprach-Hook hängen. */
function phaseCaption(t: TFn, phase: DriftTrackViewProps['phase'], endReason: 'bust' | 'timeout' | null): string {
  switch (phase) {
    case 'betting':
      return t('drift.readyToStart');
    case 'flying':
      return t('drift.running');
    case 'ended':
      return endReason === 'bust' ? t('drift.busted') : t('drift.timeUp');
    default:
      return t('drift.roundSettled');
  }
}

export function DriftTrackView({
  phase,
  path,
  cashoutValueBps,
  endReason,
  timeFraction,
}: DriftTrackViewProps) {
  const t = useT();
  // Eigene Verlaufs-ID je Instanz: bei einer festen ID greift `url(#…)` auf
  // die ERSTE Definition im Dokument zu — zwei Spuren auf einer Seite teilten
  // sich sonst die Farbe der ersten.
  const gradientId = `drift-area-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const idle = phase === 'betting' || path.length === 0;
  const busted = endReason === 'bust' && (phase === 'ended' || phase === 'settled');
  const current = path.length > 0 ? path[path.length - 1]! : BPS;
  const peak = pathPeakBps(path);
  const topBps = axisTopBps(peak);
  // maxTicks steckt implizit in `timeFraction`; daraus die Fensterbreite in
  // Ticks zurückrechnen, damit die X-Achse stabil bleibt (kein Stauchen).
  const ticks = Math.max(0, path.length - 1);
  const maxTicks = timeFraction > 0 ? Math.max(ticks, Math.round(ticks / timeFraction)) : 120;

  const points = trackPoints(path, topBps, maxTicks);
  const tip = points.length > 0 ? points[points.length - 1]! : { x: 0, y: yPercent(BPS, topBps) };
  const segments = points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`);
  const line = points.length > 1 ? `M${segments.join(' L')}` : '';
  const area =
    points.length > 1 ? `M0,100 L${segments.join(' L')} L${tip.x.toFixed(2)},100 Z` : '';

  // Farbe der Spur: unter 1.00× warnend, gebustet rot, sonst Akzent.
  const stroke = busted
    ? 'var(--drift-down)'
    : current < BPS
      ? 'var(--drift-low)'
      : 'var(--drift-up)';
  const shownText = formatValue(idle ? BPS : current);
  const numberColor = idle ? 'var(--drift-muted)' : stroke;
  const cashedOut = cashoutValueBps !== null;
  const markY = cashedOut ? yPercent(cashoutValueBps, topBps) : 0;
  const baseY = yPercent(BPS, topBps);

  return (
    <div
      className="overflow-hidden border p-3"
      style={{
        // Das Thema steht hier UND am Wurzelknoten von `LiveDriftGame` — so ist
        // die Spur auch allein einsetzbar. Beide lesen dieselbe Konstante.
        ...DRIFT_THEME,
        fontFamily: 'var(--drift-font)',
        borderRadius: 'var(--drift-radius)',
        borderColor: busted ? 'var(--drift-down)' : 'var(--drift-line)',
        background: busted ? 'var(--drift-down-soft)' : 'var(--drift-panel)',
      }}
    >
      {/* ── Laufende Zahl ── */}
      <div className="mb-2 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--drift-muted)' }}>
            {phaseCaption(t, phase, endReason)}
          </p>
          <p
            className="text-5xl font-black leading-none tabular-nums"
            style={{
              color: numberColor,
              textShadow: phase === 'flying' ? `0 0 24px ${stroke}` : undefined,
            }}
          >
            {shownText}
            <span className="text-2xl">×</span>
          </p>
        </div>
        {cashedOut && (
          <div className="shrink-0 text-right">
            <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--drift-muted)' }}>
              {t('drift.exited')}
            </p>
            <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--drift-mark)' }}>
              {formatValue(cashoutValueBps)}×
            </p>
          </div>
        )}
      </div>

      {/* ── Spur ──
          `preserveAspectRatio="none"` streckt das 100×100-Feld auf die volle
          Breite; Strichstärken bleiben über `vector-effect` konstant. Farben
          stehen im `style` und nicht im `stroke`-Attribut: `var(…)` wird in
          SVG-Präsentationsattributen nicht ersetzt. */}
      <div className="relative h-44 w-full sm:h-56">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: stroke, stopOpacity: 0.35 }} />
              <stop offset="100%" style={{ stopColor: stroke, stopOpacity: 0 }} />
            </linearGradient>
          </defs>

          {/* Hilfslinien */}
          {!idle &&
            gridLinesBps(topBps).map((bps) => (
              <line
                key={bps}
                x1="0"
                x2="100"
                y1={yPercent(bps, topBps)}
                y2={yPercent(bps, topBps)}
                style={{ stroke: 'var(--drift-line)' }}
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ))}

          {/* Startlinie 1.00× — der Bezugspunkt dieser Engine: alles darüber
              ist Gewinn, alles darunter Verlust. Bei Crash gab es so etwas
              nicht (die Kurve startete dort und stieg nur). */}
          <line
            x1="0"
            x2="100"
            y1={idle ? baseY : baseY}
            y2={idle ? baseY : baseY}
            style={{ stroke: idle ? 'var(--drift-up)' : 'var(--drift-base)' }}
            strokeWidth={idle ? '2' : '1.5'}
            strokeDasharray={idle ? '6 6' : '3 5'}
            vectorEffect="non-scaling-stroke"
          />

          {!idle && points.length > 1 && (
            <>
              <path d={area} fill={`url(#${gradientId})`} />
              <path
                d={line}
                fill="none"
                style={{ stroke }}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}

          {/* Eigener Ausstiegspunkt — nur die eigene, bereits geschehene Tat. */}
          {cashedOut && (
            <line
              x1="0"
              x2="100"
              y1={markY}
              y2={markY}
              style={{ stroke: 'var(--drift-mark)' }}
              strokeWidth="1.5"
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {/* Achsenbeschriftung (HTML — unverzerrt). */}
        {!idle &&
          gridLinesBps(topBps).map((bps) => (
            <span
              key={bps}
              className="pointer-events-none absolute left-0 -translate-y-1/2 text-[10px] tabular-nums"
              style={{ top: `${yPercent(bps, topBps)}%`, color: 'var(--drift-muted)' }}
            >
              {formatValue(bps)}×
            </span>
          ))}

        {/* Startlinie beschriften — sie ist der Bezugspunkt und darf nicht
            mit einer beliebigen Hilfslinie verwechselt werden. */}
        {!idle && (
          <span
            className="pointer-events-none absolute right-0 -translate-y-1/2 px-1 text-[10px] font-semibold tabular-nums"
            style={{ top: `${baseY}%`, color: 'var(--drift-base)' }}
          >
            1.00×
          </span>
        )}

        {/* Spitze der Spur: im Lauf ein pulsender Punkt, nach dem Bust ein
            Bruchzeichen, nach Zeitablauf ein Haltestrich. */}
        {!idle &&
          (busted ? (
            <span
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-2xl font-black leading-none"
              style={{
                left: `${tip.x}%`,
                top: `${tip.y}%`,
                color: 'var(--drift-down)',
                textShadow: '0 0 16px var(--drift-down)',
              }}
              aria-hidden="true"
            >
              ✕
            </span>
          ) : (
            <span
              className={`pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                phase === 'flying' ? 'motion-safe:animate-pulse' : ''
              }`}
              style={{
                left: `${tip.x}%`,
                top: `${tip.y}%`,
                background: stroke,
                boxShadow: `0 0 12px ${stroke}`,
              }}
            />
          ))}

        {/* Marker-Fähnchen des eigenen Ausstiegs. Bewusst LINKS. */}
        {cashedOut && (
          <span
            className="pointer-events-none absolute left-0 -translate-y-full px-1 text-[10px] font-bold tabular-nums"
            style={{ top: `${markY}%`, color: 'var(--drift-mark)' }}
          >
            {t('drift.yourExit')}
          </span>
        )}

        {/* Wettfenster: leeres Feld mit Startlinie statt Spur. */}
        {idle && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <span className="text-2xl leading-none" style={{ color: 'var(--drift-up)' }} aria-hidden="true">
              ↕
            </span>
            <span className="text-xs leading-relaxed" style={{ color: 'var(--drift-muted)' }}>
              {t('drift.aboutToStart')}
              <br />
              {t('drift.upAndDown')}
            </span>
          </div>
        )}

        {/* Ergebnis in Worten — erst nach dem Rundenende, nie früher. */}
        {(phase === 'ended' || phase === 'settled') && endReason !== null && (
          <span
            className="pointer-events-none absolute bottom-1 right-1 text-[11px] font-bold uppercase tracking-[0.14em]"
            style={{
              color: busted ? 'var(--drift-down)' : 'var(--drift-up)',
              opacity: phase === 'settled' ? 0.7 : 1,
            }}
          >
            {busted
              ? t('drift.bustedAtZero')
              : t('drift.endedAt', { value: formatValue(current) })}
          </span>
        )}
      </div>

      {/* ── Zeitbalken ──
          Die Runde endet auch ohne Bust: nach `maxTicks` zählt der Stand. Ohne
          diesen Balken wüsste ein Spieler nicht, wie viel Zeit ihm noch
          bleibt — bei Crash gab es das nicht (dort endet nur der Crash). */}
      <div className="mt-2">
        <div
          className="h-1.5 w-full overflow-hidden rounded-full"
          style={{ background: 'var(--drift-panel-strong)' }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(timeFraction * 100)}
          aria-label={t('drift.timeLeftAria')}
        >
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{
              width: `${Math.round(timeFraction * 100)}%`,
              background: timeFraction > 0.85 ? 'var(--drift-low)' : 'var(--drift-base)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
