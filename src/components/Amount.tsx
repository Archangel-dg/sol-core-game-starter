'use client';

import { toSol } from '@/lib/lamports';
import { useFiat } from '@/lib/fiat';

/**
 * Ein Geldbetrag, überall gleich dargestellt (Design-Zone).
 *
 * SOL ist die Zahl, die Landeswährung steht als Näherung daneben oder
 * darunter. Nie umgekehrt: Der Server rechnet in Lamports ab und der Scanner
 * zeigt SOL — ersetzte die Näherung die echte Zahl, könnte ein Spieler seine
 * Runde nicht mehr nachprüfen, und über einen Gewinn stünde ein Betrag, den
 * niemand garantiert hat.
 *
 * Fehlt der Kurs, ist er zu alt, oder hat der Spieler die Umrechnung
 * abgeschaltet, entfällt die zweite Zeile ERSATZLOS — kein Platzhalter, kein
 * Strich. Deshalb existiert diese Komponente überhaupt: Die Regel steht an
 * EINER Stelle statt an 43.
 */
export function Amount({
  lamports,
  className = '',
  fiatClassName = '',
  /** 'below' = zweizeilig (Ergebnis, Saldo-Feld) · 'inline' = dahinter (Zeilen). */
  layout = 'below',
  /** Vorzeichen vor dem SOL-Betrag, z. B. „+" bei einem Gewinn. */
  prefix = '',
}: {
  lamports: string | bigint;
  className?: string;
  fiatClassName?: string;
  layout?: 'below' | 'inline';
  prefix?: string;
}) {
  const { format } = useFiat();
  const fiat = format(lamports);
  const sol = `${prefix}${toSol(lamports)} ◎`;

  if (!fiat) return <span className={className}>{sol}</span>;

  if (layout === 'inline') {
    return (
      <span className={className}>
        {sol} <span className={`opacity-60 ${fiatClassName}`}>{fiat}</span>
      </span>
    );
  }
  return (
    <span className={className}>
      {sol}
      <span className={`block opacity-60 ${fiatClassName}`}>{fiat}</span>
    </span>
  );
}
