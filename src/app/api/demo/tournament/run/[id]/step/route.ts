// ⚠ Nicht ändern — Systemvertrag.
import { NextResponse } from 'next/server';
import { demoTournamentStep, SolcoreError } from '@/lib/solcore';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await req.json().catch(() => ({}))) as { risk?: string };
    if (body.risk !== 'safe' && body.risk !== 'medium' && body.risk !== 'risky') {
      return NextResponse.json({ error: { code: 'API-204' } }, { status: 400 });
    }
    return NextResponse.json(await demoTournamentStep(params.id, body.risk));
  } catch (err) {
    if (err instanceof SolcoreError) {
      return NextResponse.json({ error: { code: err.code, message: err.message, reason: err.reason } }, { status: err.status });
    }
    return NextResponse.json({ error: { code: 'API-500', message: (err as Error).message } }, { status: 500 });
  }
}
