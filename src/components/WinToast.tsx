'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n';
import { toSol } from '@/lib/lamports';

/**
 * ██ GESTALTUNGSZONE ██ — die Gewinnmeldung unter der Saldo-Anzeige.
 *
 * Ein kurzer Hinweis, der beim Gewinn aufkommt und von selbst wieder geht. Er
 * ist als BEISPIEL gedacht: So sieht eine Rückmeldung aus, die den Gewinn
 * feiert, ohne den Spieler zu bedrängen. Farbe, Form, Dauer und Bewegung sind
 * frei — ersetze das hier durch deine eigene Idee.
 *
 * Zwei Dinge sind keine Geschmacksfrage:
 *
 *  1. ERST NACH DEM REVEAL. Die Meldung erscheint mit dem `win`-Ereignis, das
 *     das Spiel abgibt, wenn die Animation das Ergebnis ZEIGT — nicht, wenn
 *     die Antwort des Servers eintrifft. Sonst steht der Gewinn in der
 *     Kopfleiste, während die Münze noch fliegt.
 *  2. NUR BEIM GEWINN, UND NIE ALS FAST-GEWINN. Ein Verlust bekommt keine
 *     Meldung; eine Meldung wie „nur knapp daneben" ist ausgeschlossen
 *     (docs/RULES.md — keine Near-Miss-Effekte).
 */

/** Wie lange die Meldung steht, bevor sie ausblendet. */
const HOLD_MS = 2600;
/** Dauer des Ein- und Ausblendens (muss zur CSS-Transition passen). */
const FADE_MS = 220;

export interface WinToastProps {
  /**
   * Der zuletzt gemeldete Gewinn — `null`, solange keiner ansteht. Jede neue
   * Runde bekommt ein NEUES Objekt (auch bei gleichem Betrag), sonst bliebe
   * die Meldung bei zwei gleich hohen Gewinnen hintereinander stumm.
   */
  win: { payoutLamports: string; key: number } | null;
}

export function WinToast({ win }: WinToastProps) {
  const t = useT();
  const [shown, setShown] = useState<{ payoutLamports: string; key: number } | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!win) return;
    setShown(win);
    setVisible(true);
    const hide = setTimeout(() => setVisible(false), HOLD_MS);
    // Erst nach dem Ausblenden aus dem DOM nehmen, sonst springt die Meldung weg.
    const drop = setTimeout(() => setShown(null), HOLD_MS + FADE_MS);
    return () => {
      clearTimeout(hide);
      clearTimeout(drop);
    };
  }, [win]);

  if (!shown) return null;

  return (
    // Absolut unter der Saldo-Anzeige, ohne Platz in der Kopfleiste zu belegen:
    // Die Leiste darf nicht springen, wenn die Meldung kommt und geht.
    <div
      // aria-live="polite": Ein Screenreader liest den Gewinn vor, sobald er
      // steht — er unterbricht aber nichts, was der Spieler gerade tut.
      role="status"
      aria-live="polite"
      className={`pointer-events-none absolute left-1/2 top-full z-30 mt-2 -translate-x-1/2 whitespace-nowrap rounded-full border border-accent/40 bg-night/95 px-3 py-1.5 text-xs font-bold tabular-nums text-accent shadow-lg shadow-accent/10 backdrop-blur transition-all duration-200 ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'
      }`}
    >
      {t('win.toast', { amount: toSol(shown.payoutLamports) })}
    </div>
  );
}
