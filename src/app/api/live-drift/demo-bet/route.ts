// ⚠ Nicht ändern — Systemvertrag.
// SPIELGELD-Einsatz (Übungsmodus). Serverseitig apiKeyAuth-only, OHNE
// Spieler-Sitzung — der Browser darf hier bewusst NICHT über `moneyFetch`
// gehen. Der Echtgeld-Zwilling (/api/live-drift/bet) kommt mit der
// Echtgeld-Etappe; welche der beiden ein Spiel ruft, entscheidet dann der
// Schalter aus dem Zustands-Poll (`realMoney`), nie eine Annahme im Bundle.
import { NextResponse } from 'next/server';
import { liveDriftDemoBet, SolcoreError } from '@/lib/solcore';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      roundId?: string;
      playerWallet?: string;
      betLamports?: string;
      safetyTargetBps?: number | null;
    };
    if (!body.roundId || !body.playerWallet || !body.betLamports) {
      return NextResponse.json({ error: { code: 'API-204' } }, { status: 400 });
    }
    const view = await liveDriftDemoBet({
      roundId: body.roundId,
      playerWallet: body.playerWallet,
      betLamports: body.betLamports,
      safetyTargetBps: body.safetyTargetBps ?? null,
    });
    return NextResponse.json(view);
  } catch (err) {
    if (err instanceof SolcoreError) {
      return NextResponse.json({ error: { code: err.code, message: err.message, reason: err.reason } }, { status: err.status });
    }
    return NextResponse.json({ error: { code: 'API-500', message: (err as Error).message } }, { status: 500 });
  }
}
