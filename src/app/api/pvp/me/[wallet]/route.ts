// ⚠ Nicht ändern — Systemvertrag.
import { NextResponse } from 'next/server';
import { pvpMe, SolcoreError } from '@/lib/solcore';

// W/L-Statistik + jüngste Matches eines Wallets in diesem Game — token-freier Read.
export async function GET(_req: Request, { params }: { params: { wallet: string } }) {
  try {
    return NextResponse.json(await pvpMe(params.wallet));
  } catch (err) {
    if (err instanceof SolcoreError) {
      return NextResponse.json({ error: { code: err.code, message: err.message, reason: err.reason } }, { status: err.status });
    }
    return NextResponse.json({ error: { code: 'API-500', message: (err as Error).message } }, { status: 500 });
  }
}
