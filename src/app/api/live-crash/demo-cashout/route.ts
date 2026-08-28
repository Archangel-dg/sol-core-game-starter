// ⚠ Nicht ändern — Systemvertrag.
// SPIELGELD-Ausstieg (Übungsmodus) — apiKeyAuth-only, kein Spieler-Token.
// Echtgeld-Zwilling: `/api/live-crash/cashout`.
import { NextResponse } from 'next/server';
import { liveCrashDemoCashout, SolcoreError } from '@/lib/solcore';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { roundId?: string; playerWallet?: string };
    if (!body.roundId || !body.playerWallet) {
      return NextResponse.json({ error: { code: 'API-204' } }, { status: 400 });
    }
    const view = await liveCrashDemoCashout({
      roundId: body.roundId,
      playerWallet: body.playerWallet,
    });
    return NextResponse.json(view);
  } catch (err) {
    if (err instanceof SolcoreError) {
      return NextResponse.json({ error: { code: err.code, message: err.message, reason: err.reason } }, { status: err.status });
    }
    return NextResponse.json({ error: { code: 'API-500', message: (err as Error).message } }, { status: 500 });
  }
}
