// ⚠ Nicht ändern — Systemvertrag.
import { NextResponse } from 'next/server';
import { pvpVerify, SolcoreError } from '@/lib/solcore';

// Provably-Fair-Verifikation eines Matches — öffentlicher, token-freier Read.
export async function GET(_req: Request, { params }: { params: { matchId: string } }) {
  try {
    return NextResponse.json(await pvpVerify(params.matchId));
  } catch (err) {
    if (err instanceof SolcoreError) {
      return NextResponse.json({ error: { code: err.code, message: err.message, reason: err.reason } }, { status: err.status });
    }
    return NextResponse.json({ error: { code: 'API-500', message: (err as Error).message } }, { status: 500 });
  }
}
