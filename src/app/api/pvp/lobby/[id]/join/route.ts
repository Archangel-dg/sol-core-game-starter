// ⚠ Nicht ändern — Systemvertrag.
import { NextResponse } from 'next/server';
import { playerTokenFrom, pvpJoin, SolcoreError } from '@/lib/solcore';

// Lobby beitreten — wallet-gebundene Aktion (Spieler-Token durchreichen).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await req.json()) as { playerWallet?: string; pin?: string; clientSeed?: string };
    if (!body.playerWallet) {
      return NextResponse.json({ error: { code: 'API-204' } }, { status: 400 });
    }
    const view = await pvpJoin(
      params.id,
      { playerWallet: body.playerWallet, pin: body.pin, clientSeed: body.clientSeed },
      playerTokenFrom(req),
    );
    return NextResponse.json(view);
  } catch (err) {
    if (err instanceof SolcoreError) {
      return NextResponse.json({ error: { code: err.code, message: err.message, reason: err.reason } }, { status: err.status });
    }
    return NextResponse.json({ error: { code: 'API-500', message: (err as Error).message } }, { status: 500 });
  }
}
