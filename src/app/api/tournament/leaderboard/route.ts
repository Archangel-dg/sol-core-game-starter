// ⚠ Nicht ändern — Systemvertrag.
import { NextResponse } from 'next/server';
import { tournamentLeaderboard, SolcoreError } from '@/lib/solcore';

export async function GET(req: Request) {
  try {
    const limit = Number(new URL(req.url).searchParams.get('limit') ?? 50);
    return NextResponse.json(await tournamentLeaderboard(limit));
  } catch (err) {
    if (err instanceof SolcoreError) {
      return NextResponse.json({ error: { code: err.code, message: err.message, reason: err.reason } }, { status: err.status });
    }
    return NextResponse.json({ error: { code: 'API-500', message: (err as Error).message } }, { status: 500 });
  }
}
