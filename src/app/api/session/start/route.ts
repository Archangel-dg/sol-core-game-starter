// ⚠ Nicht ändern — Systemvertrag.
import { NextResponse } from 'next/server';
import { playerTokenFrom, sessionStart, SolcoreError } from '@/lib/solcore';
import { serverConfig } from '@/lib/config';

export async function POST(req: Request) {
  try {
    const cfg = serverConfig();
    const body = (await req.json()) as {
      playerWallet?: string;
      betLamports?: string;
      clientSeed?: string;
      // Pay-per-Spin-Handschlag (spin-tower-pro) — der Client schickt ihn,
      // wenn seine Engine je Spin kostet. Ohne ihn lehnt der Server ab.
      protocol?: string;
    };
    if (!body.playerWallet || !body.betLamports) {
      return NextResponse.json({ error: { code: 'API-204' } }, { status: 400 });
    }
    // Spieler-Token aus dem Browser durchreichen (siehe lib/player-auth.ts).
    const view = await sessionStart(
      {
        gameId: cfg.gameId,
        playerWallet: body.playerWallet,
        betLamports: body.betLamports,
        clientSeed: body.clientSeed,
        protocol: body.protocol,
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
