// ⚠ Nicht ändern — Systemvertrag.
import { NextResponse } from 'next/server';
import { liveBet, playerTokenFrom, SolcoreError } from '@/lib/solcore';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      playerWallet?: string;
      roundId?: string;
      outcomeIndex?: number;
      betLamports?: string;
    };
    if (
      !body.playerWallet ||
      !body.roundId ||
      typeof body.outcomeIndex !== 'number' ||
      !body.betLamports
    ) {
      return NextResponse.json({ error: { code: 'API-204' } }, { status: 400 });
    }
    // Spieler-Token aus dem Browser durchreichen (siehe lib/player-auth.ts).
    const view = await liveBet(
      {
        playerWallet: body.playerWallet,
        roundId: body.roundId,
        outcomeIndex: body.outcomeIndex,
        betLamports: body.betLamports,
      },
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
