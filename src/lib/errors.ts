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
  'API-400': { message: 'Spiel vorübergehend nicht verfügbar.', action: 'lock' },
  'API-500': { message: 'Serverfehler — bitte erneut versuchen.', action: 'retry' },
};

export function toUiError(code: string | undefined, fallback = 'Unbekannter Fehler'): UiError {
  if (code && MAP[code]) return { code, ...MAP[code] };
  return { code: code ?? 'ERR', message: fallback, action: 'retry' };
}
