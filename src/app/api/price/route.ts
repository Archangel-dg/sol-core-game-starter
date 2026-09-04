// ⚠ Nicht ändern — Systemvertrag.
import { NextResponse } from 'next/server';
import { getSolPrice } from '@/lib/solcore';

/**
 * GET → Sol-Core `/api/public/sol-price`.
 *
 * Der Kurs ist REINE ANZEIGE: Er steht als Näherung neben dem SOL-Betrag,
 * damit ein Spieler ohne Krypto-Erfahrung einschätzen kann, was er setzt und
 * was er gewonnen hat. Abgerechnet wird immer in Lamports — keine Zahl von
 * hier fließt je in einen Geldpfad ein.
 *
 * Serverseitig und nicht aus dem Browser: gleiche Herkunft (keine
 * CORS-Fragen), und der Schlüssel bleibt, wo er hingehört.
 *
 * Fehlerfall ist bewusst KEIN Fehler-Status: Ein fehlender Kurs ist kein
 * kaputtes Spiel, sondern nur eine Angabe weniger. Die Oberfläche bekommt
 * `null` und lässt die Währungszeile weg, statt eine Fehlermeldung über ein
 * laufendes Spiel zu legen.
 */
export async function GET() {
  try {
    return NextResponse.json(await getSolPrice());
  } catch {
    return NextResponse.json(
      { usd: null, eur: null, source: null, at: new Date().toISOString() },
      { status: 200 },
    );
  }
}
