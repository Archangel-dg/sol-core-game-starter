/**
 * Ein Fehler aus einer Wallet-Transaktion als LESBARER Satz.
 *
 * Warum es diese Funktion gibt: Wallet-Adapter werfen Fehler, deren `message`
 * LEER ist — `WalletNotConnectedError` etwa traegt nur einen Namen. Aus
 * `\`Einzahlung fehlgeschlagen: ${e.message}\`` wurde dann woertlich
 * "Einzahlung fehlgeschlagen:" und dahinter nichts. Genau das stand am
 * 30.08.2026 in Rune's Cube auf dem Schirm; der Spieler erfuhr nicht einmal,
 * DASS seine Wallet nicht verbunden war.
 *
 * Reihenfolge: echte Meldung > bekannter Fehlername in Klartext > Name roh >
 * letzter Rueckfall. Nie leer.
 */
export function txFehlerText(e: unknown): string {
  const err = e as { message?: unknown; name?: unknown } | null;
  const msg = typeof err?.message === 'string' ? err.message.trim() : '';
  const name = typeof err?.name === 'string' ? err.name : '';

  // Abbruch durch den Nutzer — der haeufigste Fall, und keiner, der nach
  // einem Defekt klingen sollte.
  if (/user rejected|user denied|rejected the request/i.test(msg) || /UserRejected/i.test(name)) {
    return 'In der Wallet abgebrochen.';
  }
  if (/not connected/i.test(msg) || /NotConnected/i.test(name)) {
    return 'Wallet ist nicht verbunden — bitte verbinden und erneut versuchen.';
  }
  if (msg) return msg;
  if (name) return name;
  return 'Unbekannter Fehler — bitte erneut versuchen.';
}
