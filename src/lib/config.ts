// ⚠ Nicht ändern — Systemvertrag.
// Server-Konfiguration. Der API-Key wird NUR hier (server-seitig) gelesen und
// verlässt niemals den Browser.

export interface ServerConfig {
  apiUrl: string;
  apiKey: string;
  gameId: string;
}

export function serverConfig(): ServerConfig {
  const apiUrl = process.env.SOLCORE_API_URL ?? 'https://api.sol-core.com';
  const apiKey = process.env.SOLCORE_API_KEY ?? '';
  const gameId = process.env.SOLCORE_GAME_ID ?? '';
  if (!apiKey || !gameId) {
    throw new Error(
      'SOLCORE_API_KEY und SOLCORE_GAME_ID müssen gesetzt sein (siehe .env.example).',
    );
  }
  return { apiUrl: apiUrl.replace(/\/$/, ''), apiKey, gameId };
}

// ── Öffentliche Client-Config (Engine/Mechanik) ────────────────────────────
import { engineSupports, getEngine, type Mechanic } from './engines';

export interface PublicConfig {
  gameName: string;
  engine: string;
  mechanic: Mechanic;
}

/** Liest+validiert die öffentliche Engine/Mechanik-Konfiguration (Client+Server).
 * Wirft mit klarer Meldung bei ungültiger Kombination. */
export function publicConfig(): PublicConfig {
  const gameName = process.env.NEXT_PUBLIC_GAME_NAME ?? 'Sol-Core Game';
  const engine = (process.env.NEXT_PUBLIC_ENGINE ?? 'crash').trim();
  const mechanic = (process.env.NEXT_PUBLIC_MECHANIC ?? 'single').trim() as Mechanic;

  const def = getEngine(engine);
  if (!def) {
    throw new Error(
      `NEXT_PUBLIC_ENGINE="${engine}" ist unbekannt. Erlaubt: siehe docs/ENGINES.md.`,
    );
  }
  if (mechanic !== 'single' && mechanic !== 'session') {
    throw new Error(`NEXT_PUBLIC_MECHANIC muss "single" oder "session" sein.`);
  }
  if (!engineSupports(engine, mechanic)) {
    throw new Error(
      `Engine "${engine}" unterstützt die Mechanik "${mechanic}" nicht ` +
        `(erlaubt: ${def.mechanics.join(', ')}). Siehe docs/ENGINES.md.`,
    );
  }
  return { gameName, engine, mechanic };
}
