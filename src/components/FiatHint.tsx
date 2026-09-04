'use client';

import { useFiat } from '@/lib/fiat';

/**
 * Näherung in Landeswährung zu einem SOL-Wert AUS EINEM EINGABEFELD
 * (Design-Zone) — z. B. neben dem Einsatz-Label, während getippt wird.
 *
 * Sie steht bewusst NEBEN dem Label und nicht in einer eigenen Zeile unter dem
 * Feld: Unter dem Einsatzfeld stand schon einmal eine Erklärzeile, und der
 * Betreiber hat sie am 04.09.2026 entfernt, weil sie das Feld auseinanderzog.
 * Eine Näherung ist eine Randnotiz und soll sich auch so verhalten.
 *
 * Ohne Kurs, bei abgeschalteter Umrechnung oder bei halbfertiger Eingabe
 * rendert sie NICHTS — kein Platzhalter, kein Strich.
 */
export function FiatHint({ sol, className = '' }: { sol: string; className?: string }) {
  const { formatSol } = useFiat();
  const text = formatSol(sol);
  if (!text) return null;
  // Erbt die Farbe des Labels und nimmt sich zurueck. Bewusst KEIN fester
  // Weisston: Die Live-Oberflaechen (Crash, Drift) faerben ihre Beschriftung
  // ueber eigene CSS-Variablen, und ein hart gesetztes Weiss saehe dort wie
  // ein Fremdkoerper aus.
  return <span className={`font-normal opacity-70 ${className}`}>{text}</span>;
}
