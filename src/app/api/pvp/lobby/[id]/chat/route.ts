// ⚠ Nicht ändern — Systemvertrag.
import { NextResponse } from 'next/server';
import { playerTokenFrom, pvpChatPost, SolcoreError } from '@/lib/solcore';

// Chat-Nachricht posten — wallet-gebundene Aktion (Rate-Limit serverseitig).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await req.json()) as { playerWallet?: string; message?: string };
    if (!body.playerWallet || !body.message) {
      return NextResponse.json({ error: { code: 'API-204' } }, { status: 400 });
    }
    const out = await pvpChatPost(
      params.id,
      { playerWallet: body.playerWallet, message: body.message },
      playerTokenFrom(req),
    );
    return NextResponse.json(out);
  } catch (err) {
    if (err instanceof SolcoreError) {
      return NextResponse.json({ error: { code: err.code, message: err.message, reason: err.reason } }, { status: err.status });
    }
    return NextResponse.json({ error: { code: 'API-500', message: (err as Error).message } }, { status: 500 });
  }
}
