// ⚠ Nicht ändern — Systemvertrag.
import { NextResponse } from 'next/server';
import { getBetLimits, SolcoreError } from '@/lib/solcore';

/**
 * GET → Sol-Core `/api/public/games/:gameId/limits`.
 *
 * Die Spiel-ID kommt aus der Server-Config, nicht aus der Anfrage — der
 * Browser kann also nicht die Grenzen eines fremden Spiels abfragen.
 *
 * Bewusst ohne Spieler-Token: Die Grenzen hängen am SPIEL (Level des
 * Creators, Pool-Größe, Deckel), nicht an der Wallet. Jeder Besucher darf sie
 * sehen, auch ohne verbundene Wallet — sonst stünde vor dem Verbinden eine
 * leere Stelle, wo die wichtigste Zahl hingehört.
 */
export async function GET() {
  try {
    return NextResponse.json(await getBetLimits());
  } catch (err) {
    if (err instanceof SolcoreError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message, reason: err.reason } },
        { status: err.status },
      );
    }
    return NextResponse.json({ error: { code: 'API-500', message: (err as Error).message } }, { status: 500 });
  }
}
