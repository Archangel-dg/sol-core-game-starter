// ⚠ Nicht ändern — Systemvertrag.
import { NextResponse } from 'next/server';
import { tournamentCycle, SolcoreError } from '@/lib/solcore';

export async function GET() {
  try {
    return NextResponse.json(await tournamentCycle());
  } catch (err) {
    if (err instanceof SolcoreError) {
      return NextResponse.json({ error: { code: err.code, message: err.message, reason: err.reason } }, { status: err.status });
    }
    return NextResponse.json({ error: { code: 'API-500', message: (err as Error).message } }, { status: 500 });
  }
}
