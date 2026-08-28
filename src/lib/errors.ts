// ⚠ Nicht ändern — Systemvertrag.
//
// Fehlercodes → Klartext + UI-Aktion.
//
// WARUM DAS NICHT MEHR EINE LISTE IM SPIEL IST (28.08.2026)
// Bis hierher trug jedes Spiel seine eigene Kopie dieser Zuordnung. Beim
// Nachmessen der neun gelisteten Spiele: keine zwei Kopien waren gleich, keine
// war vollständig — allen fehlte der komplette Crash-Block (API-820…827), den
// meisten API-310. Wo ein Code fehlte, las der Spieler den Rohtext des Servers.
//
// Das ist Bauart, nicht Schlamperei: Next.js backt eine Datei wie diese beim
// BAUEN ins Bundle. Ein ausgeliefertes Spiel kann seine Fehlertexte gar nicht
// nachziehen, ohne neu gebaut zu werden — und ein Neubau kostet ein
// Vercel-Kontingent und einen Menschen, der daran denkt.
//
// Ab jetzt gilt: Der Server hält den Katalog (`GET /api/public/error-catalog`),
// das Spiel holt ihn beim Start über die eigene Route `/api/error-catalog` und
// überlagert damit die mitgebaute Momentaufnahme. Ein neuer Code ist in jedem
// Spiel sofort da. Die Momentaufnahme bleibt als Notnagel für den ersten Klick
// und für Netzausfälle — nie als zweite Wahrheit.

import { CATALOG_SNAPSHOT } from './error-catalog.generated';

export type CatalogLang = 'en' | 'de' | 'fr' | 'ru';

/** Was die Oberfläche tun soll — nicht was schiefging. */
export type UiAction = 'deposit' | 'lock' | 'retry' | 'cooldown' | 'info';

export interface UiError {
  code: string;
  message: string;
  action: UiAction;
}

export interface CatalogEntry {
  action: UiAction;
  text: Record<string, string>;
  /** Feinere Texte, wenn `error.details.reason` den Fall unterscheidet. */
  reasons?: Record<string, { action?: UiAction; text: Record<string, string> }>;
}

export interface ErrorCatalog {
  version: string;
  langs: readonly string[];
  fallbackLang: string;
  codes: Record<string, CatalogEntry>;
}

// ── Aktiver Katalog + aktive Sprache ───────────────────────────────────────
// Modul-Zustand statt React-Kontext mit Absicht: `toUiError` wird aus
// Ereignis-Handlern heraus aufgerufen (nicht beim Rendern) und muss synchron
// bleiben. Ein Kontext würde jeden dieser Aufrufer zu einer Komponente machen.

let aktiv: ErrorCatalog = CATALOG_SNAPSHOT;
let sprache: CatalogLang = 'de';

/** Sprache für alle künftigen Fehlertexte. */
export function setErrorLang(lang: CatalogLang): void {
  sprache = lang;
}

export function errorCatalogVersion(): string {
  return aktiv.version;
}

/** true, sobald der Laufzeit-Abruf einen NEUEREN Stand gebracht hat. */
export function errorCatalogIsLive(): boolean {
  return aktiv !== CATALOG_SNAPSHOT;
}

/**
 * Holt den Katalog vom eigenen Server und überlagert die Momentaufnahme.
 * Wird einmal beim Start aufgerufen (Providers). Scheitert er, bleibt die
 * Momentaufnahme stehen — ein Spiel darf daran nicht hängen.
 *
 * Bewusst ohne Wiederholungsschleife: Der nächste Seitenaufruf versucht es
 * ohnehin erneut, und ein Spiel, das im Hintergrund minutenlang an einer
 * Textliste zieht, ist die Sorte Nebenwirkung, die niemand debuggen will.
 */
let laufend: Promise<void> | null = null;
export function loadErrorCatalog(): Promise<void> {
  if (laufend) return laufend;
  laufend = (async () => {
    try {
      const res = await fetch('/api/error-catalog', { cache: 'no-store' });
      if (!res.ok) return;
      const k = (await res.json()) as Partial<ErrorCatalog>;
      // Ein kaputter oder leerer Katalog darf die funktionierende
      // Momentaufnahme NICHT ersetzen — sonst tauscht ein Ausfall der API
      // gute Texte gegen keine.
      if (
        typeof k.version !== 'string' ||
        !k.codes ||
        Object.keys(k.codes).length < 20 ||
        !Array.isArray(k.langs)
      ) {
        return;
      }
      aktiv = k as ErrorCatalog;
    } catch {
      /* Momentaufnahme bleibt — still, das ist der Sinn des Notnagels. */
    }
  })();
  return laufend;
}

/** Text in der aktiven Sprache, sonst in der Rückfallsprache, sonst leer. */
function text(t: Record<string, string>): string {
  return t[sprache] ?? t[aktiv.fallbackLang] ?? t.en ?? '';
}

/**
 * Übersetzt eine API-Antwort in das, was der Spieler liest.
 *
 * @param code    `error.code` der API (z. B. 'API-305').
 * @param fallback Text, wenn der Code in keinem Katalog steht.
 * @param reason  `error.details.reason` — unterscheidet Fälle hinter EINEM Code.
 * @param details `error.details` — füllt Platzhalter (z. B. validRange).
 */
export function toUiError(
  code: string | undefined,
  fallback = 'Unbekannter Fehler',
  reason?: string,
  details?: Record<string, unknown>,
): UiError {
  const eintrag = code ? aktiv.codes[code] : undefined;
  if (!eintrag) {
    return { code: code ?? 'ERR', message: fallback, action: 'retry' };
  }

  const fall = reason ? eintrag.reasons?.[reason] : undefined;
  let message = fall ? text(fall.text) : text(eintrag.text);
  const action = fall?.action ?? eintrag.action;

  // Der Server nennt bei Feld-/Spalten-Fehlern den gültigen Bereich. Ihn
  // anzuhängen ist der Unterschied zwischen „ungültig" und einer Auskunft,
  // mit der ein Spieler etwas anfangen kann.
  if (typeof details?.validRange === 'string') {
    message = `${message} (gültig: ${details.validRange})`;
  }

  return { code: code ?? 'ERR', message, action };
}

/**
 * Nur für Oberflächen mit eigener Sprachwahl (PvP): Text zu einem Code in
 * EINER bestimmten Sprache, ohne die globale Sprache umzustellen.
 */
export function errorTextIn(
  lang: CatalogLang,
  code: string | undefined,
  fallback: string,
  reason?: string,
): string {
  const eintrag = code ? aktiv.codes[code] : undefined;
  if (!eintrag) return fallback;
  const fall = reason ? eintrag.reasons?.[reason] : undefined;
  const t = fall ? fall.text : eintrag.text;
  return t[lang] ?? t[aktiv.fallbackLang] ?? t.en ?? fallback;
}
