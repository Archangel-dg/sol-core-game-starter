'use client';
import { useT } from '@/lib/i18n';

import { useBetLimits } from '@/lib/bet-limits';

/**
 * „So viel darfst du gerade setzen" — die eine Zahl, die ein Spieler vor dem
 * Tippen braucht.
 *
 * Sie steht bewusst NEBEN dem Guthaben und nicht im Kleingedruckten: Der
 * Höchsteinsatz ist keine Eigenschaft des Spiels, sondern des MOMENTS. Die
 * engste Grenze ist meist die Pool-Größe, und die bewegt sich. Ein Spiel, das
 * 50 SOL als Maximum bewirbt, aber gerade nur 0,04 SOL zulässt, erzeugt sonst
 * genau eine Erfahrung: eine abgelehnte Wette ohne erkennbaren Grund.
 * (Am 28.08.2026 nachgemessen: Spiel- und Level-Grenze je 50 SOL, tatsächlich
 * erlaubt 0,0365 SOL.)
 *
 * EINE DARSTELLUNG: `MaxBetPick` — die Zahl AM Einsatzfeld. Klick übernimmt sie
 * ins Feld, die Begründung des Servers steht im `title`.
 *
 * Geschichte, damit niemand versehentlich zurückbaut (04.09.2026): Darunter
 * stand eine zweite Zeile (`BetLimitHint`) mit DERSELBEN Zahl und einem
 * aufklappbaren „warum?". Die doppelte Zahl war der Fehler — im gesperrten
 * Zustand stand sogar zweimal „not playable right now". Erst fiel die Zahl aus
 * der unteren Zeile, dann auf Entscheidung des Betreibers die ganze Zeile.
 *
 * Was das kostet, offen gesagt: Die Begründung („warum ist das Maximum gerade
 * 2,76 und nicht 50?") steckt jetzt nur noch im `title`. Ein `title` ist ein
 * Hover-Tooltip; auf dem Telefon gibt es kein Hover. Wer sie dort wieder
 * erreichbar machen will, haengt sie an eine eigene Flaeche — aber ohne die
 * Zahl ein zweites Mal zu drucken.
 */

/** Auf 4 Nachkommastellen ABGERUNDET.
 *
 * Aufgerundet läge die Zahl über dem echten Maximum — der Klick auf „Max"
 * führte dann geradewegs in die Ablehnung, die diese Anzeige gerade
 * verhindern soll. */
export function maxBetText(maxSol: number): string {
  return (Math.floor(maxSol * 1e4) / 1e4).toFixed(4);
}

/**
 * Der Höchsteinsatz AM Einsatzfeld — knapp, ohne eigene Zeile, immer sichtbar.
 *
 * Gehört an das Feld und nicht ins Menü: Es ist die Zahl, die man beim Tippen
 * braucht. Der Titel trägt die Begründung des Servers, damit die Auskunft
 * erreichbar bleibt, ohne Platz zu kosten.
 *
 * Design-Zone: Farben/Abstände dürfen angepasst werden. Was bleiben MUSS: die
 * Zahl ist sichtbar, sie ist abgerundet, und ein Klick setzt sie ins Feld.
 */
export function MaxBetPick({
  onPick,
  className = '',
  label,
}: {
  onPick: (sol: string) => void;
  className?: string;
  /** Ohne Angabe: „Max" in der aktiven Sprache. */
  label?: string;
}) {
  const { daten, maxSol } = useBetLimits();
  const t = useT();
  if (!daten || maxSol === null) return null;

  if (!daten.playable || maxSol <= 0) {
    return (
      <span className={`shrink-0 text-[11px] font-semibold text-rose-300 ${className}`}>
        {t('limit.locked')}
      </span>
    );
  }

  const maxAnzeige = maxBetText(maxSol);
  const obergrenze = daten.roundDependent === true;
  return (
    <button
      type="button"
      onClick={() => onPick(maxAnzeige)}
      title={daten.text}
      className={`shrink-0 text-[11px] font-semibold tabular-nums text-accent underline decoration-dotted underline-offset-2 hover:text-accent/80 ${className}`}
    >
      {label ?? t(obergrenze ? 'limit.maxUpTo' : 'limit.max')} ◎ {maxAnzeige}
    </button>
  );
}
