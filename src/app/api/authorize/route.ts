// ⚠ Nicht ändern — Systemvertrag.
// Spieler-Autorisierung in zwei Schritten. Der API-Key bleibt server-seitig,
// die Wallet-Signatur entsteht ausschließlich im Browser:
//
//   1. GET  /api/authorize?wallet=…  → { message }   (Server baut die
//      kanonische Nachricht, denn nur er kennt die gameId)
//   2. POST /api/authorize { wallet, message, signature }
//      → Sol-Core POST /api/game/authorize (mit X-API-Key) → { token, expiresAt }
//
// Das Token geht danach als `Authorization: Bearer …` an die Geld-Routen
// dieser App, die es an Sol-Core weiterreichen.
import { NextResponse } from 'next/server';
import { authorizePlayer, canonicalPlayerAuthMessage, SolcoreError } from '@/lib/solcore';
import { serverConfig } from '@/lib/config';

function fail(err: unknown) {
  if (err instanceof SolcoreError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message, reason: err.reason } },
      { status: err.status },
    );
  }
  return NextResponse.json(
    { error: { code: 'API-500', message: (err as Error).message } },
    { status: 500 },
  );
}

/** Schritt 1: die zu signierende Nachricht (gameId + Wallet + Zeitstempel). */
export async function GET(req: Request) {
  try {
    const cfg = serverConfig();
    const wallet = new URL(req.url).searchParams.get('wallet');
    if (!wallet) {
      return NextResponse.json({ error: { code: 'API-204' } }, { status: 400 });
    }
    // Zeitstempel in SEKUNDEN; der Server akzeptiert ±5 Minuten.
    const message = canonicalPlayerAuthMessage(cfg.gameId, wallet, Math.floor(Date.now() / 1000));
    return NextResponse.json({ message });
  } catch (err) {
    return fail(err);
  }
}

/** Schritt 2: Signatur gegen Token tauschen (nur hier liegt der API-Key). */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      wallet?: string;
      message?: string;
      signature?: string;
    };
    if (!body.wallet || !body.message || !body.signature) {
      return NextResponse.json({ error: { code: 'API-204' } }, { status: 400 });
    }
    // gameId absichtlich NICHT mitschicken — Sol-Core nimmt sie aus dem API-Key.
    const data = await authorizePlayer({
      wallet: body.wallet,
      message: body.message,
      signature: body.signature,
    });
    return NextResponse.json(data);
  } catch (err) {
    return fail(err);
  }
}
