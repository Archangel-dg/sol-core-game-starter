// ⚠ Nicht ändern — Systemvertrag.
import { NextResponse } from 'next/server';
import { playerTokenFrom, pvpReady, SolcoreError } from '@/lib/solcore';

// Bereit setzen (sendet den Client-Seed mit) — wallet-gebundene Aktion. Sind
// danach ALLE bereit, stößt der Server den Lock (Debit + Match) an.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await req.json().catch(() => ({}))) as { playerWallet?: string; clientSeed?: string };
    if (!body.playerWallet) {
      return NextResponse.json({ error: { code: 'API-204' } }, { status: 400 });
    }
    const view = await pvpReady(
      params.id,
      { playerWallet: body.playerWallet, clientSeed: body.clientSeed },
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
