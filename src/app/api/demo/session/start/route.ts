// ⚠ Nicht ändern — Systemvertrag.
import { NextResponse } from 'next/server';
import { demoSessionStart, SolcoreError } from '@/lib/solcore';
import { serverConfig } from '@/lib/config';

export async function POST(req: Request) {
  try {
    const cfg = serverConfig();
    const body = (await req.json()) as { playerWallet?: string; betLamports?: string; clientSeed?: string };
    if (!body.playerWallet || !body.betLamports) {
      return NextResponse.json({ error: { code: 'API-204' } }, { status: 400 });
    }
    return NextResponse.json(await demoSessionStart({ gameId: cfg.gameId, playerWallet: body.playerWallet, betLamports: body.betLamports, clientSeed: body.clientSeed }));
  } catch (err) {
    if (err instanceof SolcoreError) {
      return NextResponse.json({ error: { code: err.code, message: err.message, reason: err.reason } }, { status: err.status });
    }
    return NextResponse.json({ error: { code: 'API-500', message: (err as Error).message } }, { status: 500 });
  }
}
