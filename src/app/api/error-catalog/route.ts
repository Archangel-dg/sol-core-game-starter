// ⚠ Nicht ändern — Systemvertrag.
// Reicht den Spieler-Fehlerkatalog von Sol-Core durch.
//
// WARUM ÜBER DEN EIGENEN SERVER UND NICHT DIREKT AUS DEM BROWSER:
// Gleiche Herkunft heißt kein CORS-Fall, kein Preflight und keine Abhängigkeit
// davon, ob `api.sol-core.com` die Domain dieses Spiels in seiner Freigabeliste
// führt. Genau daran ist am 28.08.2026 schon das Einzahlen gescheitert (siehe
// api/rpc/route.ts) — dieselbe Falle ein zweites Mal aufzustellen, nur für
// Fehlertexte, wäre schwer zu erklären.
//
// Kein API-Key nötig: Der Katalog enthält ausschließlich Texte, die ohnehin
// jeder Spieler zu sehen bekommt.
import { NextResponse } from 'next/server';
import { serverConfig } from '@/lib/config';

// Der Katalog ändert sich selten. Fünf Minuten am Rand plus einen Tag
// „lieber alt als gar nicht" — dieselben Werte wie auf der Sol-Core-Seite.
const CACHE = 'public, max-age=300, stale-while-revalidate=86400';

export async function GET() {
  try {
    const { apiUrl } = serverConfig();
    const res = await fetch(`${apiUrl}/api/public/error-catalog`, {
      headers: { accept: 'application/json' },
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      // Kein eigener Fehlertext-Ersatz: Das Spiel behält in diesem Fall seine
      // mitgebaute Momentaufnahme (src/lib/errors.ts). Ein halber Katalog
      // wäre schlimmer als gar keiner.
      return NextResponse.json({ error: { code: 'API-500' } }, { status: 502 });
    }
    const body = await res.json();
    return NextResponse.json(body, { headers: { 'cache-control': CACHE } });
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'API-500', message: (err as Error).message } },
      { status: 502 },
    );
  }
}
