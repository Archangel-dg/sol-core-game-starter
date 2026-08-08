// ⚠ Nicht ändern — Systemvertrag.
import { NextResponse } from 'next/server';
import { playerTokenFrom, pvpMove, SolcoreError } from '@/lib/solcore';

// Dice-Duel-Zug (pvp-dice-duel): keep + roll|bank — wallet-gebundene Aktion
// (Spieler-Token wird durchgereicht, X-API-Key kommt erst server-seitig dazu).
// Nur der aktive Sitz darf ziehen (Server: API-710). `keep` ist die Liste der
// beiseitegelegten Augen (1..6).
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
    const view = await pvpMove(
      params.id,
      { playerWallet: body.playerWallet, keep: body.keep, action: body.action },
      playerTokenFrom(req),
    );
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
