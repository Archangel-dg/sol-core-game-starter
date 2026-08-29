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
 *  1. REINE FUNKTION der verstrichenen Flugzeit. Kein eigener Zustand, keine
 *     Animation, die von etwas anderem abhängt als `elapsedMs`.
 *  2. KEIN `Math.random()`. Nirgends.
 *  3. Der CRASH-PUNKT darf nicht vor dem Crash sichtbar werden — auch nicht
 *     angedeutet. Er kommt erst mit `crashedAt` in die Daten; tu nicht so, als
 *     wüsstest du ihn früher.
 *
 * Farben und Schrift kommen aus den CSS-Variablen weiter unten — für ein
 * eigenes Thema reicht es, die zu ändern.
 *
 * Zu Regel 1: die Flugzeit steckt bereits in `multiplierBps` — der Server-Flug
 * ist m(t) = 2^(t/4s), also ist t aus m eindeutig ableitbar. Diese Datei
 * bekommt deshalb NUR den Multiplikator und rechnet alles daraus; zwei Browser
 * mit demselben Stand zeichnen zwangsläufig dasselbe Bild.
 *
 * Zu Regel 3, praktisch: die Achsen dieser Kurve skalieren mit dem AKTUELLEN
 * Stand mit (`axisTopBps` / `axisSpanDoublings`). Sie mit dem Crash-Punkt oder
 * dem Creator-Deckel zu skalieren wäre bequemer — und würde verraten, wo die
 * Kurve endet. Genau das ist der Fehler, den es hier nie geben darf.
 */

// ── Thema ───────────────────────────────────────────────────────────────────
// Umfärben = NUR diese Werte ändern. Alles darunter benutzt ausschließlich
// diese Variablen (Layout/Abstände über Tailwind, Farben über `var(--crash-*)`).
// Voreinstellung folgt dem Akzent des Starters (NEXT_PUBLIC_ACCENT_COLOR).
export const CRASH_THEME = {
  '--crash-panel': 'rgba(255, 255, 255, 0.03)',
  '--crash-panel-strong': 'rgba(255, 255, 255, 0.06)',
  '--crash-line': 'rgba(255, 255, 255, 0.10)',
  '--crash-text': '#e8e8ee',
  '--crash-muted': 'rgba(232, 232, 238, 0.45)',
  /** Steigende Kurve, laufende Zahl, Gewinn. */
  '--crash-up': 'rgb(var(--accent-rgb))',
  /** Hinterlegung der eigenen Zeile in der Mitspieler-Liste. */
  '--crash-mine': 'rgba(255, 255, 255, 0.06)',
  /** Crash, Verlust. */
  '--crash-down': '#ff5f6d',
  '--crash-down-soft': 'rgba(255, 95, 109, 0.10)',
  /** Eigener Cashout-Marker. */
  '--crash-mark': '#ffd166',
  /** Schrift AUF einer vollflächigen Akzentfläche (Knöpfe). */
  '--crash-on-accent': '#0a0a0f',
  '--crash-radius': '0.75rem',
  /** Schrift des Spielbereichs. Voreinstellung: die des Starters (mono). */
  '--crash-font': 'inherit',
} as CSSProperties;

export interface CrashCurveViewProps {
  phase: 'betting' | 'flying' | 'crashed' | 'settled';
  /** Aktueller Multiplikator in BPS (10000 = 1.00x). */
  multiplierBps: number;
  /** Gesetzt, sobald der Spieler ausgestiegen ist. */
  cashoutMultiplierBps: number | null;
  /** Erst ab `crashed` bekannt. */
  crashMultiplierBps: number | null;
}

const BPS = 10_000;
/** Wo die Spitze der Kurve im Bild sitzt (0..1). Daraus folgen beide Achsen. */
const TIP_FRACTION = 0.72;
/** Stützstellen der Kurve — mehr sieht glatter aus, kostet aber Pfadlänge. */
const SAMPLES = 44;

/** BPS → „2.34". */
export function formatMultiplier(bps: number): string {
  return (Math.max(0, bps) / BPS).toFixed(2);
}

/** Verstrichene Verdopplungen: log2(m). 0 beim Start, 1 bei 2.00×. */
function doublings(bps: number): number {
  return Math.log2(Math.max(BPS, bps) / BPS);
}

/**
 * Obergrenze der Multiplikator-Achse. Hängt AUSSCHLIESSLICH vom aktuellen
 * Stand ab — nie vom Crash-Punkt, nie vom Deckel des Creators.
 */
export function axisTopBps(currentBps: number): number {
  const above = Math.max(BPS, currentBps) - BPS;
  return Math.max(2 * BPS, BPS + above / TIP_FRACTION);
}

/** Breite des Zeitfensters in Verdopplungen — mitwachsend, wie die Höhe. */
export function axisSpanDoublings(currentBps: number): number {
  return Math.max(1, doublings(currentBps) / TIP_FRACTION);
}

/** Multiplikator → Höhe im Bild (0 = oben, 100 = unten). */
export function yPercent(bps: number, topBps: number): number {
  const span = Math.max(1, topBps - BPS);
  const rel = (Math.max(BPS, bps) - BPS) / span;
  return Math.max(0, Math.min(100, 100 - rel * 100));
}

/**
 * Die Kurve als Punktfolge in einem 100×100-Feld — reine Funktion des
 * aktuellen Multiplikators.
 *
 * Weil m(t) = 2^(t/4s) gilt, ist der Verlauf bis „jetzt" vollständig
 * bestimmt: m(u · t_jetzt) = m_jetzt^u. Es gibt also nichts zu raten und
 * nichts zu speichern.
 */
export function curvePoints(currentBps: number, samples = SAMPLES): { x: number; y: number }[] {
  const top = axisTopBps(currentBps);
  const span = axisSpanDoublings(currentBps);
  const total = doublings(currentBps);
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i <= samples; i += 1) {
    const u = i / samples;
    const at = total * u;
    const bps = BPS * Math.pow(2, at);
    points.push({ x: (at / span) * 100, y: yPercent(bps, top) });
  }
  return points;
}

/** Waagerechte Hilfslinien — „runde" Multiplikatoren unterhalb der Achsenspitze. */
export function gridLinesBps(topBps: number): number[] {
  const topX = topBps / BPS;
  const ladder = [0.25, 0.5, 1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
  const step = ladder.find((s) => (topX - 1) / s <= 4) ?? ladder[ladder.length - 1];
  const lines: number[] = [];
  // Vielfache des Schritts (2×, 5×, 10× …) statt „1 + n·Schritt" — runde
  // Zahlen an der Achse lesen sich im Flug schneller.
  for (let k = 1; k * step < topX - step * 0.35; k += 1) {
    if (k * step > 1) lines.push(Math.round(k * step * BPS));
  }
  return lines;
}

/**
 * Schriftgröße der laufenden Zahl nach Stellenzahl. Vierstellige
 * Crash-Punkte sind erreichbar (Level-Deckel gehen bis 10.000×) — bei fester
 * `text-5xl` läuft „1234.56×" neben dem Cashout-Block auf einem 390-px-Schirm
 * aus dem Kasten und wird von `overflow-hidden` still abgeschnitten. Genau auf
 * solchen Runden macht ein Spieler seinen Screenshot.
 */
export function numberSizeClasses(text: string): { value: string; suffix: string } {
  if (text.length >= 8) return { value: 'text-3xl', suffix: 'text-base' };
  if (text.length >= 6) return { value: 'text-4xl', suffix: 'text-xl' };
  return { value: 'text-5xl', suffix: 'text-2xl' };
}

/** Beschriftung je Phase. Als FUNKTION und nicht als Modul-Konstante: Texte
 *  haengen an der Sprache, und die kommt aus einem Hook — der auf Modulebene
 *  nicht laufen darf. */
function phaseCaption(t: TFn, phase: CrashCurveViewProps['phase']): string {
  switch (phase) {
    case 'betting':
      return t('crash.readyForTakeoff');
    case 'flying':
      return t('crash.flying');
    case 'crashed':
      return t('crash.crashed');
    default:
      return t('crash.roundSettled');
  }
}

export function CrashCurveView({
  phase,
  multiplierBps,
  cashoutMultiplierBps,
  crashMultiplierBps,
}: CrashCurveViewProps) {
  const t = useT();
  // Eigene Verlaufs-ID je Instanz: bei einer festen ID greift `url(#…)` auf
  // die ERSTE Definition im Dokument zu — zwei Kurven auf einer Seite teilten
  // sich sonst die Farbe der ersten (bei der Sichtprüfung real passiert: eine
  // grüne Kurve mit rotem Verlauf darunter).
  const gradientId = `crash-area-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const down = phase === 'crashed' || phase === 'settled';
  // Schutzgurt zu Regel 3: der Crash-Punkt wird hier NUR angefasst, wenn die
  // Runde ihn wirklich schon enthüllt hat. Selbst ein versehentlich zu früh
  // durchgereichter Wert kann so nichts verraten.
  const revealedCrashBps = down ? crashMultiplierBps : null;
  const flying = phase === 'flying';
  const idle = phase === 'betting';

  const shownBps = idle ? BPS : Math.max(BPS, multiplierBps);
  const topBps = axisTopBps(shownBps);
  const points = curvePoints(shownBps);
  const tip = points[points.length - 1];
  const segments = points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`);
  const line = `M${segments.join(' L')}`;
  const area = `M0,100 L${segments.join(' L')} L${tip.x.toFixed(2)},100 Z`;

  const shownText = formatMultiplier(idle ? BPS : shownBps);
  const numberSize = numberSizeClasses(shownText);
  const stroke = down ? 'var(--crash-down)' : 'var(--crash-up)';
  const numberColor = idle ? 'var(--crash-muted)' : down ? 'var(--crash-down)' : 'var(--crash-up)';
  const cashedOut = cashoutMultiplierBps !== null;
  const markY = cashedOut ? yPercent(cashoutMultiplierBps, topBps) : 0;

  return (
    <div
      className="overflow-hidden border p-3"
      style={{
        // Das Thema steht hier UND am Wurzelknoten von `LiveCrashGame` — so ist
        // die Kurve auch allein einsetzbar. Beide lesen dieselbe Konstante;
        // geändert wird sie genau einmal, oben in dieser Datei.
        ...CRASH_THEME,
        fontFamily: 'var(--crash-font)',
        borderRadius: 'var(--crash-radius)',
        borderColor: down ? 'var(--crash-down)' : 'var(--crash-line)',
        background: down ? 'var(--crash-down-soft)' : 'var(--crash-panel)',
      }}
    >
      {/* ── Laufende Zahl ── */}
      <div className="mb-2 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--crash-muted)' }}>
            {phaseCaption(t, phase)}
          </p>
          <p
            className={`${numberSize.value} font-black leading-none tabular-nums`}
            style={{ color: numberColor, textShadow: flying ? '0 0 24px var(--crash-up)' : undefined }}
          >
            {shownText}
            <span className={numberSize.suffix}>×</span>
          </p>
        </div>
        {cashedOut && (
          <div className="shrink-0 text-right">
            <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--crash-muted)' }}>
              {t('crash.cashedOut')}
            </p>
            <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--crash-mark)' }}>
              {formatMultiplier(cashoutMultiplierBps)}×
            </p>
          </div>
        )}
      </div>

      {/* ── Kurve ──
          `preserveAspectRatio="none"` streckt das 100×100-Feld auf die volle
          Breite; Strichstärken bleiben über `vector-effect` konstant. Alles
          Beschriftete liegt als HTML darüber — dort verzerrt nichts.
          Farben stehen bewusst im `style` und nicht im `stroke`-Attribut:
          `var(…)` wird in SVG-Präsentationsattributen nicht ersetzt. */}
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

          {/* Hilfslinien — Höhe folgt dem mitwachsenden Fenster. Im
              Wettfenster gibt es nichts zu skalieren: dort bleibt nur die
              Startlinie stehen. */}
          {!idle &&
            gridLinesBps(topBps).map((bps) => (
            <line
              key={bps}
              x1="0"
              x2="100"
              y1={yPercent(bps, topBps)}
              y2={yPercent(bps, topBps)}
              style={{ stroke: 'var(--crash-line)' }}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {/* Startlinie 1.00× — im Wettfenster die gestrichelte „Startbahn". */}
          <line
            x1="0"
            x2="100"
            y1={idle ? 99 : 100}
            y2={idle ? 99 : 100}
            style={{ stroke: idle ? 'var(--crash-up)' : 'var(--crash-line)' }}
            strokeWidth={idle ? '2' : '1'}
            strokeDasharray={idle ? '6 6' : undefined}
            vectorEffect="non-scaling-stroke"
          />

          {!idle && (
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
              style={{ stroke: 'var(--crash-mark)' }}
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
            style={{ top: `${yPercent(bps, topBps)}%`, color: 'var(--crash-muted)' }}
          >
            {formatMultiplier(bps)}×
          </span>
        ))}

        {/* Spitze der Kurve: im Flug ein pulsender Punkt, nach dem Crash ein
            Bruchzeichen. Die Zahl dazu steht groß über der Kurve — sie hier
            zu wiederholen würde nur den Verlauf überdecken. */}
        {!idle &&
          (down ? (
            <span
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-2xl font-black leading-none"
              style={{
                left: `${tip.x}%`,
                top: `${tip.y}%`,
                color: 'var(--crash-down)',
                textShadow: '0 0 16px var(--crash-down)',
              }}
              aria-hidden="true"
            >
              ✕
            </span>
          ) : (
            <span
              className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full motion-safe:animate-pulse"
              style={{
                left: `${tip.x}%`,
                top: `${tip.y}%`,
                background: stroke,
                boxShadow: '0 0 12px var(--crash-up)',
              }}
            />
          ))}

        {/* Marker-Fähnchen des eigenen Ausstiegs. Bewusst LINKS: bei einem
            hohen Crash-Punkt liegt der eigene Ausstieg dicht über der
            Grundlinie — rechts stünde es genau auf „geplatzt bei …". */}
        {cashedOut && (
          <span
            className="pointer-events-none absolute left-0 -translate-y-full px-1 text-[10px] font-bold tabular-nums"
            style={{ top: `${markY}%`, color: 'var(--crash-mark)' }}
          >
            {t('crash.yourExit')}
          </span>
        )}

        {/* Wettfenster: Startbahn statt Kurve. */}
        {idle && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <span className="text-2xl leading-none" style={{ color: 'var(--crash-up)' }} aria-hidden="true">
              ↗
            </span>
            <span className="text-xs leading-relaxed" style={{ color: 'var(--crash-muted)' }}>
              {t('crash.aboutToTakeOff')}{' '}
              <br />
              {t('crash.andItBursts')}
            </span>
          </div>
        )}

        {/* Der Crash-Punkt in Worten — erst hier, nie früher. */}
        {down && revealedCrashBps !== null && (
          <span
            className="pointer-events-none absolute bottom-1 right-1 text-[11px] font-bold uppercase tracking-[0.14em]"
            style={{ color: 'var(--crash-down)', opacity: phase === 'settled' ? 0.7 : 1 }}
          >
            geplatzt bei {formatMultiplier(revealedCrashBps)}×
          </span>
        )}
      </div>
    </div>
  );
}
