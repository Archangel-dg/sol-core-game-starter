'use client';

import { LANGS, useLang } from '@/lib/i18n';

/**
 * Sprachwahl — vier Sprachen, Englisch als Vorgabe.
 *
 * WARUM ES DEN KNOPF GEBEN MUSS: Ein Katalog in vier Sprachen nützt nichts,
 * wenn ein Spieler nicht umschalten kann. Die Vorlage riet vorher nur über
 * `navigator.language` — wer ein englisches System hat und Deutsch lesen will,
 * kam nicht hin.
 *
 * Der Wechsel gilt SOFORT und ÜBERALL: Er schaltet auch die PvP-Oberfläche und
 * die Fehlertexte vom Server um, weil alle drei dieselbe Sprache lesen
 * (`lib/i18n.tsx`).
 *
 * Design-Zone: Aussehen und Platzierung darfst du ändern — ein Aufklappmenü,
 * Flaggen, ein Eintrag im Spielmenü. Was bleiben MUSS: Der Spieler kann die
 * Sprache erreichen und wechseln.
 */
export function LangSwitch({ className = '' }: { className?: string }) {
  const { lang, setLang, t } = useLang();
  return (
    <label className={`inline-flex items-center gap-1 ${className}`}>
      <span className="sr-only">{t('app.language')}</span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as (typeof LANGS)[number]['code'])}
        aria-label={t('app.language')}
        className="rounded-lg border border-white/10 bg-night px-2 py-1 text-xs text-white/70 outline-none focus:border-accent/50"
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
