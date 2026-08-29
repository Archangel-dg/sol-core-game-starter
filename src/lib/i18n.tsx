'use client';

/**
 * ⚠ Nicht ändern — Systemvertrag (die Maschinerie; die TEXTE stehen in
 * `strings.ts` und dürfen angepasst werden).
 *
 * Sprache der ganzen Vorlage — Englisch als Hauptsprache, dazu Deutsch,
 * Französisch und Russisch.
 *
 * WARUM ES DAS GIBT (29.08.2026)
 * Die Vorlage war bis hierher deutschsprachig fest verdrahtet: 81 sichtbare
 * deutsche Texte in 16 Dateien. Nur die PvP-Oberfläche hatte einen eigenen
 * Katalog in vier Sprachen — ein Spieler konnte in der Lobby auf Englisch
 * umstellen und bekam auf demselben Bildschirm weiter „Guthaben" und
 * „Einzahlen" zu sehen. Für ein Template, das weltweit geforkt wird, ist eine
 * fest eingebaute Sprache der falsche Startpunkt.
 *
 * DIE SPRACHE LIEGT AN EINER STELLE. `pvp-i18n.ts` behält seinen eigenen,
 * viel größeren Katalog, bezieht die aktive Sprache aber von hier — sonst
 * hätte man wieder zwei Wahrheiten, diesmal über die Sprache selbst. Auch die
 * Fehlertexte (Server-Katalog) folgen automatisch: `setErrorLang` wird bei
 * jedem Wechsel mitgezogen.
 *
 * Keine neue Abhängigkeit: Die Vorlage soll kopierbar bleiben, und für vier
 * Sprachen braucht es kein Framework.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { setErrorLang } from './errors';
import { STRINGS, type StringKey } from './strings';

export type Lang = 'en' | 'de' | 'fr' | 'ru';

/** Hauptsprache. Alles fällt hierauf zurück, wenn eine Übersetzung fehlt. */
export const DEFAULT_LANG: Lang = 'en';

export const LANGS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'ru', label: 'Русский' },
];

/** EIN Schlüssel für die ganze App — auch die PvP-Oberfläche liest ihn. */
const STORE_KEY = 'sc_lang';

export function isLang(v: unknown): v is Lang {
  return v === 'en' || v === 'de' || v === 'fr' || v === 'ru';
}

/**
 * Sprache aus dem Browser raten, wenn noch keine gewählt wurde. Trifft sie
 * nicht zu, bleibt es bei Englisch — nie bei einer zufälligen Sprache.
 */
function ausBrowser(): Lang {
  if (typeof navigator === 'undefined') return DEFAULT_LANG;
  for (const roh of navigator.languages ?? [navigator.language]) {
    const kurz = String(roh).slice(0, 2).toLowerCase();
    if (isLang(kurz)) return kurz;
  }
  return DEFAULT_LANG;
}

export type TFn = (key: StringKey, params?: Record<string, string | number>) => string;

/**
 * Übersetzt und setzt Platzhalter `{name}` ein.
 *
 * Rückfall-Kette: gewählte Sprache → Englisch → der Schlüssel selbst. Der
 * Schlüssel am Ende ist Absicht: Eine fehlende Übersetzung soll sichtbar sein,
 * nicht als leere Stelle durchrutschen.
 */
export function translate(
  lang: Lang,
  key: StringKey,
  params?: Record<string, string | number>,
): string {
  const eintrag = STRINGS[key] as Record<string, string> | undefined;
  let text = eintrag?.[lang] ?? eintrag?.[DEFAULT_LANG] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.split(`{${k}}`).join(String(v));
    }
  }
  return text;
}

interface LangKontext {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: TFn;
}

const Ctx = createContext<LangKontext | null>(null);

/**
 * Hält die Sprache. Gehört in `Providers.tsx`, damit JEDE Komponente sie
 * sieht — auch die PvP-Oberfläche mit ihrem eigenen Katalog.
 *
 * Der erste Render ist bewusst immer Englisch: `localStorage` und
 * `navigator` gibt es beim Server-Rendern nicht, und eine Abweichung zwischen
 * Server- und Browser-Ausgabe wäre ein Hydration-Fehler. Die gespeicherte
 * Sprache kommt einen Wimpernschlag später im Effekt.
 */
export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    const gespeichert = localStorage.getItem(STORE_KEY);
    const gewaehlt = isLang(gespeichert) ? gespeichert : ausBrowser();
    setLangState(gewaehlt);
    setErrorLang(gewaehlt);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    setErrorLang(l);
    try {
      localStorage.setItem(STORE_KEY, l);
    } catch {
      /* Privater Modus o. Ä. — die Wahl gilt dann nur für diese Sitzung. */
    }
  }, []);

  const wert = useMemo<LangKontext>(
    () => ({ lang, setLang, t: (key, params) => translate(lang, key, params) }),
    [lang, setLang],
  );
  return <Ctx.Provider value={wert}>{children}</Ctx.Provider>;
}

/**
 * Aktive Sprache + Umschalter.
 *
 * Ohne Provider (z. B. eine Komponente, die jemand isoliert rendert) fällt
 * alles auf Englisch zurück, statt zu werfen — eine Oberfläche soll an einer
 * fehlenden Sprachhülle nicht zerbrechen.
 */
export function useLang(): LangKontext {
  const ctx = useContext(Ctx);
  return (
    ctx ?? {
      lang: DEFAULT_LANG,
      setLang: () => {},
      t: (key, params) => translate(DEFAULT_LANG, key, params),
    }
  );
}

/** Kurzform für Komponenten, die nur Texte brauchen. */
export function useT(): TFn {
  return useLang().t;
}
