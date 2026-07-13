// ⚠ Nicht ändern — Systemvertrag.
import { NextResponse } from 'next/server';
import { withdraw, SolcoreError } from '@/lib/solcore';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { playerWallet?: string; amountLamports?: string };
    if (!body.playerWallet || !body.amountLamports) {
      return NextResponse.json({ error: { code: 'API-204' } }, { status: 400 });
    }
    const data = await withdraw(body.playerWallet, body.amountLamports);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof SolcoreError) {
      return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ error: { code: 'API-500', message: (err as Error).message } }, { status: 500 });
  }
}
