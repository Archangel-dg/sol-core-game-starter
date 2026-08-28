#!/usr/bin/env node
/**
 * Holt den Spieler-Fehlerkatalog von Sol-Core und legt ihn als eingebauten
 * Notnagel unter `src/lib/error-catalog.generated.ts` ab.
 *
 * WOZU DER NOTNAGEL, WENN DAS SPIEL DEN KATALOG OHNEHIN ZUR LAUFZEIT HOLT?
 * Für die drei Momente, in denen der Abruf noch nicht durch ist oder nicht
 * durchkommt: der allererste Klick nach dem Laden, ein Netzausfall, eine
 * Wartung der API. Ohne Notnagel stünde dort der Rohtext des Servers — genau
 * der Zustand, den dieser ganze Umbau abschafft.
 *
 * Der Notnagel ist eine MOMENTAUFNAHME, keine zweite Wahrheit: Sobald der
 * Laufzeit-Abruf da ist, gilt der Server. Deshalb ist diese Datei erzeugt und
 * nicht von Hand gepflegt — von Hand gepflegte Kopien driften, das ist der
 * Grund, warum es den Katalog gibt.
 *
 * Lauf:
 *   node scripts/sync-error-catalog.mjs
 *   SOLCORE_API_URL=http://localhost:4000 node scripts/sync-error-catalog.mjs
 *   node scripts/sync-error-catalog.mjs --from ../pfad/catalog.json
 *
 * Exit-Code 1, wenn nichts geschrieben werden konnte — damit der Lauf auch in
 * einem Build-Schritt taugt und nicht stillschweigend einen alten Stand lässt.
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const HIER = dirname(fileURLToPath(import.meta.url));
const ZIEL = join(HIER, '..', 'src', 'lib', 'error-catalog.generated.ts');

const argFrom = (() => {
  const i = process.argv.indexOf('--from');
  return i > -1 ? process.argv[i + 1] : null;
})();

const API = (process.env.SOLCORE_API_URL ?? 'https://api.sol-core.com').replace(/\/+$/, '');
const QUELLE = argFrom ?? `${API}/api/public/error-catalog`;

async function laden(quelle) {
  if (/^https?:\/\//.test(quelle)) {
    const res = await fetch(quelle, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status} von ${quelle}`);
    return res.json();
  }
  return JSON.parse(readFileSync(resolve(quelle), 'utf8'));
}

function pruefen(k) {
  if (!k || typeof k !== 'object') throw new Error('Antwort ist kein Objekt.');
  if (typeof k.version !== 'string' || !k.version) throw new Error('Feld `version` fehlt.');
  if (!Array.isArray(k.langs) || k.langs.length === 0) throw new Error('Feld `langs` fehlt.');
  if (!k.codes || typeof k.codes !== 'object') throw new Error('Feld `codes` fehlt.');
  const anzahl = Object.keys(k.codes).length;
  // Ein leerer oder fast leerer Katalog wäre schlimmer als der alte Stand:
  // er würde eine funktionierende Momentaufnahme durch nichts ersetzen.
  if (anzahl < 20) throw new Error(`Nur ${anzahl} Codes — das sieht kaputt aus, nichts geschrieben.`);
  for (const [code, e] of Object.entries(k.codes)) {
    if (!e?.action || !e?.text) throw new Error(`${code}: action/text fehlt.`);
    for (const l of k.langs) {
      if (typeof e.text[l] !== 'string' || !e.text[l].trim()) {
        throw new Error(`${code}: Text für "${l}" fehlt.`);
      }
    }
  }
  return anzahl;
}

const KOPF = `// ⚠ ERZEUGT — nicht von Hand ändern.
// Momentaufnahme des Spieler-Fehlerkatalogs von Sol-Core.
// Neu holen:  node scripts/sync-error-catalog.mjs
//
// Das ist der NOTNAGEL für den ersten Klick und für Netzausfälle. Im Betrieb
// überlagert der Laufzeit-Abruf (/api/error-catalog) diese Werte — der Server
// ist die Wahrheit, diese Datei nur der letzte Stand, der mitgebaut wurde.
`;

try {
  const katalog = await laden(QUELLE);
  const anzahl = pruefen(katalog);
  const inhalt =
    KOPF +
    `\nimport type { ErrorCatalog } from './errors';\n\n` +
    `export const CATALOG_SNAPSHOT: ErrorCatalog = ${JSON.stringify(katalog, null, 2)} as const;\n`;
  writeFileSync(ZIEL, inhalt, 'utf8');
  console.log(`✓ Katalog ${katalog.version} mit ${anzahl} Codes geschrieben → src/lib/error-catalog.generated.ts`);
} catch (err) {
  console.error(`✗ Fehlerkatalog nicht aktualisiert: ${err.message}`);
  console.error(`  Quelle: ${QUELLE}`);
  console.error('  Der bisherige Notnagel bleibt unverändert.');
  process.exit(1);
}
