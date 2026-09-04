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
  return <span className={`font-normal text-white/35 ${className}`}>{text}</span>;
}
