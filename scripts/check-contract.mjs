#!/usr/bin/env node
/**
 * Vertrags-Selbsttest: prüft im eigenen Quelltext, ob dieses Spiel die vier
 * Zusagen noch einhält, die für JEDES Sol-Core-Spiel gelten.
 *
 * WARUM ES DAS GIBT (28.08.2026)
 * Beim Nachmessen der neun gelisteten Spiele fiel auf: Jedes hatte irgendwo
 * beim Umgestalten etwas verloren. Keines zeigte den Höchsteinsatz, keines
 * verlinkte auf den Verifizierer (sieben zeigten auf rohes JSON), allen
 * fehlten Fehlercodes, einem die RPC-Durchreiche fürs Einzahlen. Nichts davon
 * war böse Absicht — es fällt beim Umbauen einer Oberfläche schlicht nicht
 * auf, weil das Spiel weiter läuft.
 *
 * Genau deshalb prüft das hier eine Maschine und kein Mensch:
 *
 *   1. EIN- UND AUSZAHLEN erreichbar — mit der RPC-Durchreiche, ohne die
 *      jede Einzahlung auf einer Creator-Domain an 403 scheitert.
 *   2. FEHLERTEXTE über den Server-Katalog — keine eigene, driftende Liste.
 *   3. HÖCHSTEINSATZ sichtbar — an der Geld-Leiste und an den Einsatzfeldern.
 *   4. SPRACHEN — Englisch als Hauptsprache, dazu Deutsch, Französisch,
 *      Russisch; jeder Schlüssel in allen vieren, und ein Umschalter dafür.
 *   5. VERIFY-LINK auf den Sol-Core Scanner — nicht auf rohes JSON.
 *
 * Lauf:  node scripts/check-contract.mjs   (auch Teil von `npm run check`)
 * Exit-Code 1, sobald eine Zusage gebrochen ist.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(WURZEL, 'src');

function alleQuellen(dir = SRC, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) alleQuellen(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

const DATEIEN = alleQuellen();
const INHALT = new Map(DATEIEN.map((p) => [p, readFileSync(p, 'utf8')]));
const kurz = (p) => p.slice(WURZEL.length + 1).replace(/\\/g, '/');
const gibt = (re) => [...INHALT].some(([, t]) => re.test(t));
const dateiDa = (rel) => existsSync(join(WURZEL, rel));
/** Dateien, in denen ein Muster vorkommt — für Fehlermeldungen mit Adresse. */
const wo = (re) => [...INHALT].filter(([, t]) => re.test(t)).map(([p]) => kurz(p));

let fehler = 0;
const pruef = (bedingung, titel, hinweis) => {
  console.log(`${bedingung ? '✓' : '✗'} ${titel}`);
  if (!bedingung) {
    fehler++;
    if (hinweis) console.log(`    → ${hinweis}`);
  }
};

console.log('Vertrags-Selbsttest (Quelltext)\n');

// ── 1. Ein- und Auszahlen ───────────────────────────────────────────────────
console.log('1) Ein- und Auszahlen — ein Guthaben, in jedem Spiel');
pruef(
  dateiDa('src/app/api/withdraw/route.ts'),
  'Auszahl-Route vorhanden (/api/withdraw)',
  'Ohne sie kann ein Spieler sein Geld nur auf der Plattform abheben.',
);
pruef(
  dateiDa('src/app/api/balance/[wallet]/route.ts'),
  'Guthaben-Route vorhanden (/api/balance/:wallet)',
);
pruef(
  dateiDa('src/app/api/authorize/route.ts'),
  'Spieler-Autorisierung vorhanden (/api/authorize)',
  'Geld-Routen brauchen ein Spieler-Token; ohne diese Route gibt es keins.',
);
pruef(
  dateiDa('src/app/api/rpc/route.ts'),
  'RPC-Durchreiche vorhanden (/api/rpc)',
  'Ohne sie scheitert JEDE Einzahlung auf einer Creator-Domain mit 403 — der ' +
    'öffentliche RPC weist Browser ab, ein Schlüssel wäre domaingesperrt.',
);
// Namen dürfen sich unterscheiden — die Spiele heißen ihre Bausteine
// buildDepositTx, buildPlayerDepositTx, moneyFetch oder moneyPost. Geprüft
// wird die SACHE, nicht die Schreibweise: Wer nur auf einen Namen prüft,
// meldet einen Fehler, wo keiner ist, und übersieht ihn, wo einer wäre.
const DEPOSIT_TX = /build(Player)?DepositTx|player_deposit/;
const MONEY_POST = /money(Fetch|Post)\(/;
pruef(
  gibt(DEPOSIT_TX),
  'Einzahlung wird im Browser signiert',
);
pruef(
  gibt(MONEY_POST) && gibt(/\/api\/withdraw/),
  'Auszahlung läuft über das Spieler-Token',
  'Ohne Token könnte jeder eine fremde Wallet in den Body schreiben.',
);
{
  // Nicht auf einen Komponentennamen prüfen: Die Geld-Oberfläche heißt in den
  // Spielen BalanceBar, GameMenu, HeaderBar, WalletSheet oder WalletModal —
  // je nach Gestaltung. Und Einzahlen/Auszahlen dürfen in ZWEI Ansichten
  // liegen (eigene Modale). Was zählt: beide sind aus der Oberfläche
  // erreichbar, nicht nur als Route vorhanden.
  const ui = [...INHALT].filter(([p]) => !/[\\/]app[\\/]api[\\/]/.test(p));
  const hatEinzahlen = ui.some(([, t]) => DEPOSIT_TX.test(t));
  const hatAuszahlen = ui.some(([, t]) => /\/api\/withdraw/.test(t));
  pruef(
    hatEinzahlen && hatAuszahlen,
    'Geld-Oberfläche ist verdrahtet (Einzahlen UND Auszahlen erreichbar)',
    !hatEinzahlen
      ? 'Kein Knopf löst eine Einzahlung aus.'
      : 'Kein Knopf löst eine Auszahlung aus.',
  );
}

// ── 2. Fehlercodes ──────────────────────────────────────────────────────────
console.log('\n2) Fehlertexte — überall gleich, immer aktuell');
pruef(
  dateiDa('src/app/api/error-catalog/route.ts'),
  'Katalog-Durchreiche vorhanden (/api/error-catalog)',
);
pruef(
  dateiDa('src/lib/error-catalog.generated.ts'),
  'Notnagel-Momentaufnahme vorhanden',
  'node scripts/sync-error-catalog.mjs',
);
pruef(
  gibt(/loadErrorCatalog\(\)/),
  'Katalog wird beim Start geholt (loadErrorCatalog)',
  'Ohne den Abruf bleibt das Spiel für immer auf dem Stand seines Baus.',
);
{
  // Eine eigene Code→Text-Tabelle NEBEN dem Katalog ist genau die Drift, die
  // der Katalog abschafft. Die erzeugte Momentaufnahme ist ausgenommen.
  const eigeneTabellen = [...INHALT]
    .filter(([p]) => !/error-catalog\.generated\.ts$/.test(p))
    .filter(([, t]) => (t.match(/'API-\d{3}':\s*['"]/g) ?? []).length >= 3)
    .map(([p]) => kurz(p));
  pruef(
    eigeneTabellen.length === 0,
    'Keine zweite, eigene Fehlertext-Tabelle im Spiel',
    eigeneTabellen.length ? `Eigene Tabelle in: ${eigeneTabellen.join(', ')}` : undefined,
  );
}

// ── 3. Höchsteinsatz ────────────────────────────────────────────────────────
console.log('\n3) Höchsteinsatz — dezent, aber immer sichtbar');
pruef(dateiDa('src/app/api/limits/route.ts'), 'Grenzen-Route vorhanden (/api/limits)');
pruef(gibt(/useBetLimits\(/), 'Grenzen werden geholt und aufgefrischt (useBetLimits)');
pruef(
  gibt(/<BetLimitHint\b/),
  'Grenze steht an der Geld-Leiste (BetLimitHint)',
);
{
  // Jede Datei mit einem Einsatzfeld muss die Zahl auch zeigen. Erkannt am
  // Paar aus Betragsfeld und Einsatz-Beschriftung — grob, aber es findet
  // genau den Fall, um den es geht: ein Feld ohne Grenze daneben.
  // Ein Betragsfeld erkennt man daran, dass es einen EINSATZ setzt — nicht
  // daran, dass irgendwo das Wort „bet" fällt. Sonst schlägt die Prüfung bei
  // `EngineControls` an, das generische Zahlenfelder rendert und mit dem
  // Einsatz nichts zu tun hat.
  const SETZT_EINSATZ = /set(Bet|Amount|StakeSol|Stake)\b|onBet\(/;
  const mitEinsatzfeld = [...INHALT]
    .filter(([p]) => /components[\\/]/.test(p))
    .filter(([, t]) => /inputMode="decimal"/.test(t) && SETZT_EINSATZ.test(t))
    .filter(([, t]) => !/MaxBetPick|BetLimitHint/.test(t))
    .map(([p]) => kurz(p));
  pruef(
    mitEinsatzfeld.length === 0,
    'Jedes Einsatzfeld zeigt den Höchsteinsatz (MaxBetPick)',
    mitEinsatzfeld.length
      ? `Ohne Anzeige: ${mitEinsatzfeld.join(', ')} — am 28.08.2026 gemessen: ` +
        'Spiel- und Level-Grenze je 50 SOL, tatsächlich erlaubt 0,0365 SOL.'
      : undefined,
  );
}

// ── 4. Sprachen ─────────────────────────────────────────────────────────────
console.log('\n4) Sprachen — Englisch als Hauptsprache, dazu de/fr/ru');
pruef(dateiDa('src/lib/i18n.tsx'), 'Sprachschicht vorhanden (lib/i18n.tsx)');
pruef(dateiDa('src/lib/strings.ts'), 'Textkatalog vorhanden (lib/strings.ts)');
pruef(
  gibt(/<LangProvider[\s>]/),
  'Sprache umschliesst die App (LangProvider in Providers)',
  'Ohne Provider bleibt jede Oberfläche auf der Hauptsprache stehen.',
);
pruef(
  gibt(/<LangSwitch[\s/>]/),
  'Der Spieler kann die Sprache wechseln (LangSwitch eingebunden)',
  'Ein Katalog in vier Sprachen nützt nichts, wenn niemand umschalten kann.',
);
{
  // Jeder Schlüssel MUSS alle vier Sprachen haben, und Englisch muss gefüllt
  // sein — darauf fällt alles zurück. Eine fehlende Sprache fiele sonst erst
  // dem Spieler auf, der sie gewählt hat.
  const kat = existsSync(join(WURZEL, 'src/lib/strings.ts'))
    ? readFileSync(join(WURZEL, 'src/lib/strings.ts'), 'utf8')
    : '';
  // Erfasst BEIDE Schreibweisen: mehrzeilige Blöcke und Einzeiler.
  const bloecke = [...kat.matchAll(/^ {2}'([a-z][\w.]*)':\s*\{([\s\S]*?)\},?\s*$/gm)];
  const luecken = [];
  // Bewusst vier feste Ausdrücke statt eines gebauten: Ein `new RegExp` mit
  // Anführungszeichen und Backslashes im Muster ist genau die Sorte Code, die
  // beim nächsten Anfassen still kaputtgeht.
  const SPRACHEN = [
    ['en', /\ben:\s*(['"`])([\s\S]*?)\1/],
    ['de', /\bde:\s*(['"`])([\s\S]*?)\1/],
    ['fr', /\bfr:\s*(['"`])([\s\S]*?)\1/],
    ['ru', /\bru:\s*(['"`])([\s\S]*?)\1/],
  ];
  for (const [, key, body] of bloecke) {
    for (const [lang, re] of SPRACHEN) {
      const m = body.match(re);
      if (!m || !m[2].trim()) luecken.push(`${key}/${lang}`);
    }
  }
  pruef(bloecke.length > 20, `Textkatalog gefüllt (${bloecke.length} Schlüssel)`);
  pruef(
    luecken.length === 0,
    'Jeder Schlüssel hat alle vier Sprachen',
    luecken.length ? `Fehlt: ${luecken.slice(0, 12).join(', ')}${luecken.length > 12 ? ' …' : ''}` : undefined,
  );
}
{
  // Der Rückfall in fest verdrahtete Sprache. Gesucht wird sichtbarer Text mit
  // deutschen Umlauten in Komponenten — der häufigste Weg zurück, weil man
  // beim Umgestalten schnell einen Satz direkt hinschreibt.
  const DE = /[äöüßÄÖÜ]/;
  const verdaechtig = [];
  for (const [p, t] of INHALT) {
    if (!/components[\/]|app[\/]/.test(p)) continue;
    if (/strings\.ts$|i18n\.tsx$|pvp-i18n\.ts$/.test(p)) continue;
    const ohneKommentare = t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const m of ohneKommentare.matchAll(/>\s*([^<>{}\n][^<>{}]{2,120})\s*</g)) {
      if (DE.test(m[1])) { verdaechtig.push(`${kurz(p)}: ${m[1].trim().slice(0, 40)}`); break; }
    }
  }
  pruef(
    verdaechtig.length === 0,
    'Kein fest verdrahteter Text in einer einzelnen Sprache',
    verdaechtig.length ? verdaechtig.slice(0, 6).join(' · ') : undefined,
  );
}

// ── 5. Nachprüfbarkeit ──────────────────────────────────────────────────────
console.log('\n5) Verify — Direktlink in den Sol-Core Scanner');
pruef(dateiDa('src/components/VerifyLink.tsx'), 'Verify-Link-Komponente vorhanden');
pruef(gibt(/verifyHref\(|<VerifyLink\b/), 'Verify-Link wird benutzt');
{
  // Der häufigste Fehler: der Link zeigt auf den JSON-Endpunkt statt auf den
  // menschenlesbaren Verifizierer. Sieben von neun Spielen taten genau das.
  const rohesJson = wo(/href=\{?[`"'][^`"']*\/api\/(game\/)?(pvp\/)?(demo\/)?verify\//);
  pruef(
    rohesJson.length === 0,
    'Kein Verify-Link zeigt auf rohes JSON',
    rohesJson.length
      ? `Zeigt auf den JSON-Endpunkt: ${rohesJson.join(', ')} — der Spieler ` +
        'bekommt dort eine Wand aus Klammern statt eines Beweises.'
      : undefined,
  );
}
{
  // Jede Spiel-Mechanik braucht ihren eigenen Link — eine fehlende Mechanik
  // ist die Sorte Lücke, die niemandem auffällt, bis jemand fragt.
  const mechaniken = [
    ['Einzel-/Session-Runden', 'src/components/FairnessPanel.tsx'],
    ['Runden-Verlauf', 'src/components/History.tsx'],
    ['Live (Quoten)', 'src/components/LiveGame.tsx'],
    ['Live (Crash)', 'src/components/LiveCrashGame.tsx'],
    ['Turnier', 'src/components/TournamentGame.tsx'],
    ['PvP', 'src/components/PvpGame.tsx'],
  ];
  for (const [name, rel] of mechaniken) {
    const p = join(WURZEL, rel);
    if (!existsSync(p)) continue; // Mechanik in dieser Kopie entfernt — in Ordnung.
    const t = readFileSync(p, 'utf8');
    pruef(
      /verifyHref\(|<VerifyLink\b/.test(t),
      `Verify-Link in: ${name}`,
      `${rel} zeigt keine Runde zum Nachrechnen.`,
    );
  }
}

console.log(
  `\n${fehler === 0 ? '✅ Vertrag eingehalten.' : `❌ ${fehler} Zusage(n) gebrochen.`}`,
);
process.exit(fehler === 0 ? 0 : 1);
