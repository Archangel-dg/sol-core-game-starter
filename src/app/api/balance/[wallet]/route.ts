// ⚠ Nicht ändern — Systemvertrag.
import { NextResponse } from 'next/server';
import { getBalance, SolcoreError } from '@/lib/solcore';

export async function GET(_req: Request, { params }: { params: { wallet: string } }) {
  try {
    const data = await getBalance(params.wallet);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof SolcoreError) {
      return NextResponse.json({ error: { code: err.code, message: err.message, reason: err.reason } }, { status: err.status });
    }
    return NextResponse.json({ error: { code: 'API-500', message: (err as Error).message } }, { status: 500 });
  }
}
