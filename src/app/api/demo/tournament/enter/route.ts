// ⚠ Nicht ändern — Systemvertrag.
import { NextResponse } from 'next/server';
import { demoTournamentEnter, SolcoreError } from '@/lib/solcore';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { playerWallet?: string; clientSeed?: string };
    if (!body.playerWallet) {
      return NextResponse.json({ error: { code: 'API-204' } }, { status: 400 });
    }
    return NextResponse.json(await demoTournamentEnter({ playerWallet: body.playerWallet, clientSeed: body.clientSeed }));
  } catch (err) {
    if (err instanceof SolcoreError) {
      return NextResponse.json({ error: { code: err.code, message: err.message, reason: err.reason } }, { status: err.status });
    }
    return NextResponse.json({ error: { code: 'API-500', message: (err as Error).message } }, { status: 500 });
  }
}
