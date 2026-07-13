// ⚠ Nicht ändern — Systemvertrag.
import { NextResponse } from 'next/server';
import { health } from '@/lib/solcore';
import { publicConfig, serverConfig } from '@/lib/config';

/** Boot-Info: Spielname, Engine/Mechanik, devMock-Flag, gameId. */
export async function GET() {
  try {
    const cfg = serverConfig();
    const pub = publicConfig(); // wirft bei ungültiger Engine/Mechanik-Kombi
    const h = await health();
    return NextResponse.json({
      gameName: pub.gameName,
      engine: pub.engine,
      mechanic: pub.mechanic,
      gameId: cfg.gameId,
      apiUrl: cfg.apiUrl, // öffentlich (nur Basis-URL, kein Key) — für Verify-Link
      devMock: h.devMock,
      network: h.network,
    });
  } catch (err) {
    return NextResponse.json({ error: { message: (err as Error).message } }, { status: 500 });
  }
}
