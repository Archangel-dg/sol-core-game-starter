// ⚠ Nicht ändern — Systemvertrag.
import { NextResponse } from 'next/server';
import { pvpLobbies, SolcoreError } from '@/lib/solcore';

// Offene Lobbys DIESES Spiels (Starter-Tabelle) — token-freier Read.
export async function GET() {
  try {
    return NextResponse.json(await pvpLobbies());
  } catch (err) {
    if (err instanceof SolcoreError) {
      return NextResponse.json({ error: { code: err.code, message: err.message, reason: err.reason } }, { status: err.status });
    }
    return NextResponse.json({ error: { code: 'API-500', message: (err as Error).message } }, { status: 500 });
  }
}
