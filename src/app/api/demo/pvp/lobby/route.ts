// ⚠ Nicht ändern — Systemvertrag.
import { NextResponse } from 'next/server';
import { demoPvpPlay, SolcoreError } from '@/lib/solcore';

// PvP-Demo: Instant-Match gegen den Server-Bot (Sim-Balance) — token-frei,
// kein echtes Geld, strikt getrennt von den echten Lobby-/Match-Tabellen.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { playerWallet?: string; stakeLamports?: string; clientSeed?: string };
    if (!body.playerWallet || !body.stakeLamports) {
      return NextResponse.json({ error: { code: 'API-204' } }, { status: 400 });
    }
    const view = await demoPvpPlay({
      playerWallet: body.playerWallet,
      stakeLamports: body.stakeLamports,
      clientSeed: body.clientSeed,
    });
    return NextResponse.json(view);
  } catch (err) {
    if (err instanceof SolcoreError) {
      return NextResponse.json({ error: { code: err.code, message: err.message, reason: err.reason } }, { status: err.status });
    }
    return NextResponse.json({ error: { code: 'API-500', message: (err as Error).message } }, { status: 500 });
  }
}
