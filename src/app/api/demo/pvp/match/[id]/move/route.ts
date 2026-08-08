// ⚠ Nicht ändern — Systemvertrag.
import { NextResponse } from 'next/server';
import { demoPvpMove, SolcoreError } from '@/lib/solcore';

// Dice-Duel-Demo-Zug (gegen den Server-Bot, Sim-Balance) — token-frei, kein
// echtes Geld. `keep` ist die Liste der beiseitegelegten Augen (1..6).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      playerWallet?: string;
      keep?: number[];
      action?: 'roll' | 'bank';
    };
    if (
      !body.playerWallet ||
      !Array.isArray(body.keep) ||
      (body.action !== 'roll' && body.action !== 'bank')
    ) {
      return NextResponse.json({ error: { code: 'API-204' } }, { status: 400 });
    }
    const view = await demoPvpMove(params.id, {
      playerWallet: body.playerWallet,
      keep: body.keep,
      action: body.action,
    });
    return NextResponse.json(view);
  } catch (err) {
    if (err instanceof SolcoreError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message, reason: err.reason } },
        { status: err.status },
      );
    }
    return NextResponse.json({ error: { code: 'API-500', message: (err as Error).message } }, { status: 500 });
  }
}
