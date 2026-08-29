// ⚠ Nicht ändern — Systemvertrag.
import { NextResponse } from 'next/server';
import { gameConfig, health } from '@/lib/solcore';
import { publicConfig, serverConfig } from '@/lib/config';
import { SOLANA_NETWORK, PROGRAM_ID_STRING, rpcHost } from '@/lib/solana';

/**
 * Boot-Info: Spielname, Engine/Mechanik, devMock-Flag, gameId — plus die
 * aufgelöste Engine-Config vom Server (z. B. towers levels/columns), damit
 * die UI exakt die Auswahl rendert, die der Server akzeptiert.
 */

// Game-Config ist nach Erstellung unveränderlich → einmal holen, dann cachen.
// Fehler werden NICHT gecacht (alter API-Stand / transient) — nächster Request
// versucht es erneut; die UI fällt solange auf die Engine-Defaults zurück.
let cachedEngine: { engineConfig: Record<string, number>; serverMode: string } | null = null;

export async function GET() {
  try {
    const cfg = serverConfig();
    const pub = publicConfig(); // wirft bei ungültiger Engine/Mechanik-Kombi
    const h = await health();
    if (!cachedEngine) {
      try {
        const c = await gameConfig();
        cachedEngine = { engineConfig: c.engineConfig ?? {}, serverMode: c.mode };
      } catch {
        cachedEngine = null; // tolerant: Meta-Route nie an der Config scheitern lassen
      }
    }
    const serverMode = cachedEngine?.serverMode ?? null;
    return NextResponse.json({
      gameName: pub.gameName,
      engine: pub.engine,
      mechanic: pub.mechanic,
      gameId: cfg.gameId,
      apiUrl: cfg.apiUrl, // öffentlich (nur Basis-URL, kein Key)
      verifierUrl: cfg.verifierUrl, // menschenlesbare Verifizierungsseite — für den Verify-Link
      // Backend sendet devMock künftig nur noch, wenn true — fehlend ⇒ false.
      devMock: h.devMock === true,
      // /health liefert kein network mehr (keine Betriebsdetails öffentlich) —
      // das Netzwerk kommt aus der eigenen Env, gleiche Quelle und gleicher
      // Devnet-Fallback wie der RPC-Endpoint in `Providers.tsx`.
      network: SOLANA_NETWORK,
      // Womit das Frontend WIRKLICH auf die Kette geht. Das Netz allein genuegt
      // nicht: NEXT_PUBLIC_SOLANA_NETWORK auf mainnet-beta zu stellen und die
      // Programm-ID zu vergessen ergibt ein Spiel, das sich als Mainnet
      // ausweist und trotzdem gegen ein totes Programm signiert. Beides ist
      // öffentlich (steht im Browser-Bundle); der RPC nur als Host, weil in
      // der vollen URL meist der Schlüssel steckt.
      // Fehlen diese Felder in einer Antwort, ist das Spiel ein Build von vor
      // der Mainnet-Migration — siehe scripts/spiele-netz-pruefen.mjs.
      programId: PROGRAM_ID_STRING,
      rpcHost,
      engineConfig: cachedEngine?.engineConfig ?? null,
      serverMode,
      // Das Spiel ist auf dem Server als andere Engine registriert als die
      // App konfiguriert ist (NEXT_PUBLIC_ENGINE) — jede Runde würde fehlschlagen.
      warning: serverMode && serverMode !== pub.engine ? 'engine_mismatch' : undefined,
    });
  } catch (err) {
    return NextResponse.json({ error: { message: (err as Error).message } }, { status: 500 });
  }
}
