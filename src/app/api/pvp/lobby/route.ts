// ⚠ Nicht ändern — Systemvertrag.
import { NextResponse } from 'next/server';
import { playerTokenFrom, pvpCreateLobby, SolcoreError } from '@/lib/solcore';

// Lobby erstellen — wallet-gebundene Aktion (Spieler-Token durchreichen).
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      playerWallet?: string;
      stakeLamports?: string;
      pin?: string;
      clientSeed?: string;
    };
    if (!body.playerWallet || !body.stakeLamports) {
      return NextResponse.json({ error: { code: 'API-204' } }, { status: 400 });
    }
    const view = await pvpCreateLobby(
      {
        playerWallet: body.playerWallet,
        stakeLamports: body.stakeLamports,
        pin: body.pin,
        clientSeed: body.clientSeed,
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
