// ⚠ Nicht ändern — Systemvertrag. Demo-Konto (frische Demo-Wallet + 3 SOL).
import { NextResponse } from 'next/server';
import { demoStart, SolcoreError } from '@/lib/solcore';

export async function POST() {
  try {
    return NextResponse.json(await demoStart());
  } catch (err) {
    if (err instanceof SolcoreError) {
      return NextResponse.json({ error: { code: err.code, message: err.message, reason: err.reason } }, { status: err.status });
    }
    return NextResponse.json({ error: { code: 'API-500', message: (err as Error).message } }, { status: 500 });
  }
}
