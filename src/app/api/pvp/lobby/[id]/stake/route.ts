// ⚠ Nicht ändern — Systemvertrag.
import { NextResponse } from 'next/server';
import { playerTokenFrom, pvpSetStake, SolcoreError } from '@/lib/solcore';

// Einsatz ändern (nur Host) — wallet-gebundene Aktion. Jede Änderung setzt
// serverseitig alle Ready-Haken zurück.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await req.json()) as { playerWallet?: string; stakeLamports?: string };
    if (!body.playerWallet || !body.stakeLamports) {
      return NextResponse.json({ error: { code: 'API-204' } }, { status: 400 });
    }
    const view = await pvpSetStake(
      params.id,
      { playerWallet: body.playerWallet, stakeLamports: body.stakeLamports },
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
