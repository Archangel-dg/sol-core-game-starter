// ⚠ Nicht ändern — Systemvertrag.
import { NextResponse } from 'next/server';
import { playerTokenFrom, pvpKick, SolcoreError } from '@/lib/solcore';

// Mitglied kicken (nur Host, vor dem Lock) — wallet-gebundene Aktion.
// `playerWallet` = der Host (Prinzipal), `wallet` = das zu entfernende Mitglied.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await req.json()) as { playerWallet?: string; wallet?: string };
    if (!body.playerWallet || !body.wallet) {
      return NextResponse.json({ error: { code: 'API-204' } }, { status: 400 });
    }
    const view = await pvpKick(
      params.id,
      { playerWallet: body.playerWallet, wallet: body.wallet },
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
