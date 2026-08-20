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

  // ── Live-Crash-Schicht (API-820…827) ───────────────────────────────────
  // Ohne diese Zeilen fällt `toUiError` auf den Rohtext des Servers zurück
  // und der Spieler liest „API-823: …" mitten im Flug. Alle acht sind
  // deterministische Zustandsaussagen, kein transientes Problem: ein
  // Wiederholen desselben Klicks ändert nichts, deshalb 'info' statt
  // 'retry' — mit einer Ausnahme (API-820, s. u.).
  //
  // Ausdrücklich KEIN 'lock': anders als API-201/202 sperrt keiner dieser
  // Fälle das Spiel. Die nächste Runde öffnet in Sekunden, und der Spieler
  // soll den Einsatzknopf dafür behalten.
  'API-820': {
    // Einziger Fall mit 'retry': die Runden-ID ist veraltet (der Poll hinkt
    // bis zu einer Sekunde hinterher). Der nächste Zustand bringt eine
    // gültige — ein erneuter Versuch ist hier tatsächlich sinnvoll.
    message: 'Diese Runde gibt es nicht mehr — der nächste Flug wird gleich geladen.',
    action: 'retry',
  },
  'API-821': {
    message: 'Das Wettfenster ist zu — diese Runde fliegt bereits. Die nächste kommt gleich.',
    action: 'info',
  },
  'API-822': { message: 'Du hast in dieser Runde keine offene Wette.', action: 'info' },
  'API-823': { message: 'Zu spät — die Runde ist bereits gecrasht.', action: 'info' },
  'API-824': {
    message:
      'Auto-Ausstieg außerhalb des erlaubten Bereichs — über 1.00× und höchstens bis zum Deckel dieses Spiels.',
    action: 'info',
  },
  'API-825': { message: 'Diese Wette ist bereits abgerechnet.', action: 'info' },
  'API-826': {
    message: 'Du fliegst in dieser Runde schon mit — es gilt eine Wette pro Runde.',
    action: 'info',
  },
  'API-827': {
    message: 'Diese Runde fliegt gerade nicht — Aussteigen geht nur im Flug.',
    action: 'info',
  },
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
