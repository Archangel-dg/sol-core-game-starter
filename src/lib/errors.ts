// ⚠ Nicht ändern — Systemvertrag.
// Mapping der API-Fehlercodes auf spielerfreundliche Meldungen + UI-Aktion.

export interface UiError {
  code: string;
  message: string;
  /** Hinweis für die UI, wie zu reagieren ist. */
  action: 'deposit' | 'lock' | 'retry' | 'cooldown' | 'info';
}

const MAP: Record<string, Omit<UiError, 'code'>> = {
  'API-201': { message: 'Spiel vorübergehend nicht verfügbar.', action: 'lock' },
  'API-202': { message: 'Spiel ist nicht aktiv.', action: 'lock' },
  'API-204': { message: 'Ungültige Eingabe.', action: 'info' },
  'API-300': { message: 'Einsatz unter dem Minimum.', action: 'info' },
  'API-301': { message: 'Einsatz über dem Maximum.', action: 'info' },
  'API-302': { message: 'Auszahlungslimit erreicht — bitte später erneut.', action: 'cooldown' },
  'API-303': { message: 'Die Creator-Wallet darf nicht selbst spielen.', action: 'lock' },
  'API-304': { message: 'Zu schnell — kurz warten.', action: 'cooldown' },
  'API-305': { message: 'Guthaben reicht nicht — bitte einzahlen.', action: 'deposit' },
  // Auszahlungssperre der Plattform (HTTP 423): greift VOR jeder Abbuchung,
  // gilt für alle Spieler gleichzeitig und bleibt bis zur Operator-Freigabe
  // bestehen. Deshalb ausdrücklich NICHT 'retry' (der Fallback) — ein
  // Wiederholen ändert nichts, solange die Sperre steht. 'info': das Spiel
  // selbst läuft normal weiter, nur Auszahlungen ruhen.
  'API-310': { message: 'Auszahlungen sind gerade pausiert — es wurde nichts abgebucht.', action: 'info' },
  'API-400': { message: 'Spiel vorübergehend nicht verfügbar.', action: 'lock' },
  // Spieler-Token fehlt/ungültig/abgelaufen oder für ein anderes Spiel/eine
  // andere Wallet ausgestellt. Kein transienter Fehler: ein Retry mit
  // demselben (kaputten) Token bringt nichts — die App braucht ein frisches
  // Token über /api/game/authorize, bevor irgendeine Geld-Aktion weitergeht.
  // 'lock' statt 'retry', analog zu API-303/API-201/202.
  'API-402': { message: 'Sitzung ungültig oder abgelaufen — bitte Wallet neu verbinden.', action: 'lock' },
  'API-500': { message: 'Serverfehler — bitte erneut versuchen.', action: 'retry' },
};

export function toUiError(
  code: string | undefined,
  fallback = 'Unbekannter Fehler',
  reason?: string,
  details?: Record<string, unknown>,
): UiError {
  // API-302 hat zwei Ursachen: Solvenz-Cap beim Wetten (Einsatz zu groß für
  // den Pool) vs. Tages-Auszahlungslimit. Der `reason` aus den API-Details
  // unterscheidet sie — ohne reason bleibt die generische Meldung.
  if (code === 'API-302' && reason === 'bankroll_cap') {
    return {
      code,
      message: 'Einsatz übersteigt gerade das Gewinn-Limit des Pools — versuch einen kleineren Einsatz.',
      action: 'info',
    };
  }
  // Ungültiger Spalten-/Feld-Index: der Server nennt den gültigen Bereich.
  if (code === 'API-204' && (reason === 'invalid_column' || reason === 'invalid_tile')) {
    const range = typeof details?.validRange === 'string' ? details.validRange : undefined;
    return {
      code,
      message: range
        ? `Ungültige Auswahl — gültig ist ${range}. (UI und Spiel-Config passen nicht zusammen?)`
        : 'Ungültige Auswahl — außerhalb des Spielfelds.',
      action: 'info',
    };
  }
  if (code && MAP[code]) return { code, ...MAP[code] };
  return { code: code ?? 'ERR', message: fallback, action: 'retry' };
}
