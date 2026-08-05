// ⚠ Nicht ändern — Systemvertrag.
import { NextResponse } from 'next/server';
import { playerTokenFrom, sessionCashout, SolcoreError } from '@/lib/solcore';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    // Spieler-Token durchreichen: es bindet den Cashout an den Session-Eigner.
    return NextResponse.json(await sessionCashout(params.id, playerTokenFrom(req)));
  } catch (err) {
    if (err instanceof SolcoreError) {
      return NextResponse.json({ error: { code: err.code, message: err.message, reason: err.reason } }, { status: err.status });
    }
    return NextResponse.json({ error: { code: 'API-500', message: (err as Error).message } }, { status: 500 });
  }
}
