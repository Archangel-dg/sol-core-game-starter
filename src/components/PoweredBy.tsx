'use client';

import { useT } from '@/lib/i18n';

/**
 * ⚠ Nicht ändern — Systemvertrag.
 *
 * Die Herkunftszeile am Fuß JEDER Seite: „Powered by Sol-Core Engine",
 * wobei der Name direkt auf sol-core.com zeigt.
 *
 * WARUM IM LAYOUT UND NICHT IM SPIEL
 * Die Vorlage hat sieben Render-Pfade (Ladezustand, Engine-Konflikt, das
 * normale Spiel und vier Full-Bleed-PvP-Oberflächen). Jeder von ihnen endet in
 * einem eigenen `<main>`. Eine Fußzeile, die in den Spielkomponenten sitzt,
 * überlebt das erste Re-Skin nicht — genau so sind die sechs alten
 * „Powered by"-Zeilen entstanden, die auf die Plattform oder den Verifier
 * zeigten statt auf die Engine. Hier steht sie einmal, oberhalb aller Pfade,
 * und ein Creator müsste das Layout selbst anfassen, um sie zu verlieren.
 *
 * Der Name „Sol-Core Engine" wird NICHT übersetzt (Eigenname); nur das
 * „Powered by" davor läuft durch den Katalog — siehe lib/strings.ts.
 */

/** Die Zieladresse der Engine. Eine Stelle, damit sie nicht driftet. */
export const SOL_CORE_URL = 'https://sol-core.com';

export function PoweredBy() {
  const t = useT();
  return (
    <footer className="mx-auto w-full max-w-md px-4 pb-6 pt-2 text-center">
      <p className="text-[11px] leading-relaxed text-white/30">
        {t('app.poweredBy')}{' '}
        <a
          href={SOL_CORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/45 underline decoration-white/20 underline-offset-2 transition-colors hover:text-white/70 hover:decoration-white/40"
        >
          Sol-Core Engine
        </a>
      </p>
    </footer>
  );
}
