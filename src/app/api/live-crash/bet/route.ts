// ⚠ Nicht ändern — Systemvertrag.
import { NextResponse } from 'next/server';
import { liveCrashBet, SolcoreError } from '@/lib/solcore';

// Crash-Demo-Bets sind serverseitig apiKeyAuth-only, OHNE Spieler-Sitzung
// (Etappe 2, nur Spielgeld) — anders als `/live/bet` verlangt diese Route
// deshalb bewusst KEIN Spieler-Token und der Browser darf hier NICHT über
// `moneyFetch` gehen. Etappe 3 (Echtgeld) macht daraus eine Geld-Route; erst
// dann kommt hier die Session-Bindung wie bei `/live/bet` dazu.
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
    const view = await liveCrashBet({
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
