/**
 * Selbsttest gegen die in .env konfigurierte Anbindung. Druckt ✓/✗ je Schritt.
 * Beweist: Env vollständig → Backend erreichbar → Spiel aktiv → Test-Aktion
 * kommt sauber durch. Ohne Zusatz-Abhängigkeiten.
 *
 *   npm run check
 */
import { readFileSync } from 'node:fs';

// .env / .env.local einfach parsen (ohne dotenv-Dependency).
for (const file of ['.env', '.env.local']) {
  try {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* egal */
  }
}

const API = (process.env.SOLCORE_API_URL ?? '').replace(/\/$/, '');
const KEY = process.env.SOLCORE_API_KEY ?? '';
const GAME = process.env.SOLCORE_GAME_ID ?? '';
const ENGINE = process.env.NEXT_PUBLIC_ENGINE ?? 'crash';
const MECHANIC = process.env.NEXT_PUBLIC_MECHANIC ?? 'single';
// Test-Spieler (NICHT die Creator-Wallet). In Programm-Modus ohne Guthaben →
// API-305 ist der erwartete „erreichbar"-Beweis.
const PLAYER = 'So11111111111111111111111111111111111111112';

let pass = 0, fail = 0;
const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); c ? pass++ : fail++; };
const j = async (r) => { try { return await r.json(); } catch { return {}; } };

// Minimale, gültige params je Single-Engine (nur für den Selbsttest).
const SINGLE_PARAMS = {
  'coin-flip': { side: 'heads' },
  dice: { target: 50, direction: 'over' },
  limbo: { targetMultiplierBps: 20000 },
  crash: { cashoutBps: 20000 },
  mines: { tiles: [0] },
  hilo: { card: 7, guess: 'higher' },
  plinko: {}, wheel: {}, scratch: {}, 'slots-3x3': {},
  keno: { picks: [1, 2, 3] },
  roulette: { betType: 'red' },
};

ok(!!API && !!KEY && !!GAME, `Env vollständig (URL/Key/Game-ID)`);
if (!API || !KEY || !GAME) { console.log('\n✗ Abbruch: .env unvollständig.'); process.exit(1); }

// 1) Health
let devMock = false;
{
  const h = await j(await fetch(`${API}/health`, { signal: AbortSignal.timeout(90000) }));
  ok(h.status === 'ok', `Health erreichbar (devMock=${h.devMock})`);
  devMock = h.devMock === true;
}

// 2) Spiel im Katalog + aktiv
{
  const c = await j(await fetch(`${API}/api/public/catalog?limit=200`, { signal: AbortSignal.timeout(60000) }));
  const games = c.games ?? c ?? [];
  const found = Array.isArray(games) && games.find((g) => (g.gameId ?? g.id) === GAME);
  ok(!!found, found ? `Spiel im Katalog gefunden (${found.mode ?? ''})` : `Spiel NICHT im Katalog (pausiert/inaktiv?)`);
}

// 3) Test-Aktion
let roundId = null;
if (MECHANIC === 'session') {
  const r = await fetch(`${API}/api/game/session/start`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': KEY },
    body: JSON.stringify({ gameId: GAME, playerWallet: PLAYER, betLamports: '10000000' }),
    signal: AbortSignal.timeout(90000),
  });
  const b = await j(r);
  const code = b?.error?.code;
  const reachable = r.ok || ['API-305', 'API-302', 'API-303', 'API-304'].includes(code);
  ok(reachable, r.ok ? `Session-Start ok (sessionId=${b.sessionId})` : `Session erreichbar (${code} — erwartet ohne Guthaben)`);
} else {
  const params = SINGLE_PARAMS[ENGINE] ?? {};
  const r = await fetch(`${API}/api/game/bet`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': KEY },
    body: JSON.stringify({ gameId: GAME, playerWallet: PLAYER, betLamports: '10000000', params }),
    signal: AbortSignal.timeout(90000),
  });
  const b = await j(r);
  const code = b?.error?.code;
  const reachable = r.ok || ['API-305', 'API-302', 'API-303', 'API-304'].includes(code);
  ok(reachable, r.ok ? `Test-Bet ok (roundId=${b.roundId})` : `Bet-Pfad erreichbar (${code} — erwartet ohne Guthaben)`);
  if (r.ok) roundId = b.roundId;
}

// 4) Verify (nur wenn ein echter Bet durchlief, z. B. devMock)
if (roundId) {
  const v = await j(await fetch(`${API}/api/game/verify/${roundId}`, { signal: AbortSignal.timeout(60000) }));
  ok(!!v.serverSeedHash, `Verify liefert serverSeedHash`);
} else {
  console.log('• Verify übersprungen (kein Test-Bet — im Programm-Modus normal).');
}

console.log(`\n${fail === 0 ? '✅ Alles grün — Kopie ist systemkonform.' : '❌ Bitte Fehler oben prüfen.'} (${pass} ok, ${fail} fehlgeschlagen)`);
if (devMock) console.log('Hinweis: devMock=true → Geld-UI ist im Spiel ausgeblendet.');
process.exit(fail === 0 ? 0 : 1);
