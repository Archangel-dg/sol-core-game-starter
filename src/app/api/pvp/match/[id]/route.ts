// ⚠ Nicht ändern — Systemvertrag.
import { NextResponse } from 'next/server';
import { pvpMatch, SolcoreError } from '@/lib/solcore';

// Volle Match-Sicht — token-freier Read (Sitz-Wallets für Nicht-Teilnehmer
// gekürzt; Ergebnis erscheint erst nach dem Draw).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json(await pvpMatch(params.id));
  } catch (err) {
    if (err instanceof SolcoreError) {
      return NextResponse.json({ error: { code: err.code, message: err.message, reason: err.reason } }, { status: err.status });
    }
    return NextResponse.json({ error: { code: 'API-500', message: (err as Error).message } }, { status: 500 });
  }
}
