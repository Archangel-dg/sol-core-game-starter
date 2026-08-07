// ⚠ Nicht ändern — Systemvertrag.
import { NextResponse } from 'next/server';
import { playerTokenFrom, pvpLeave, SolcoreError } from '@/lib/solcore';

// Lobby verlassen — wallet-gebundene Aktion (Spieler-Token durchreichen).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await req.json()) as { playerWallet?: string };
    if (!body.playerWallet) {
      return NextResponse.json({ error: { code: 'API-204' } }, { status: 400 });
    }
    return NextResponse.json(await pvpLeave(params.id, { playerWallet: body.playerWallet }, playerTokenFrom(req)));
  } catch (err) {
    if (err instanceof SolcoreError) {
      return NextResponse.json({ error: { code: err.code, message: err.message, reason: err.reason } }, { status: err.status });
    }
    return NextResponse.json({ error: { code: 'API-500', message: (err as Error).message } }, { status: 500 });
  }
}
