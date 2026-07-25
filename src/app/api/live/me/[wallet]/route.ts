// ⚠ Nicht ändern — Systemvertrag.
import { NextResponse } from 'next/server';
import { liveMe, SolcoreError } from '@/lib/solcore';

export async function GET(req: Request, { params }: { params: { wallet: string } }) {
  try {
    const roundId = new URL(req.url).searchParams.get('roundId') ?? undefined;
    return NextResponse.json(await liveMe(params.wallet, roundId));
  } catch (err) {
    if (err instanceof SolcoreError) {
      return NextResponse.json({ error: { code: err.code, message: err.message, reason: err.reason } }, { status: err.status });
    }
    return NextResponse.json({ error: { code: 'API-500', message: (err as Error).message } }, { status: 500 });
  }
}
